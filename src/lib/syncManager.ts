import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface PendingSync {
  id?: number;
  timestamp: number;
  formData: any;
  calcResult: any;
  endpoint: string;
  method: string;
  retryCount: number;
  lastError?: string;
  version?: number;
}

interface SyncDB extends DBSchema {
  'pending-syncs': {
    key: number;
    value: PendingSync;
    indexes: { 'by-timestamp': number };
  };
  'sync-metadata': {
    key: string;
    value: {
      lastSync: number;
      version: number;
    };
  };
}

const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 5000, 15000, 30000, 60000]; // Progressive delays
const BATCH_SIZE = 10;

class SyncManager {
  private db: Promise<IDBPDatabase<SyncDB>>;
  private syncInProgress = false;
  private networkTimeout = 30000; // 30 seconds timeout
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.db = this.initializeDB();
    this.setupEventListeners();
    this.startPeriodicSync();
  }

  private async initializeDB() {
    return openDB<SyncDB>('tax-sync-store', 2, {
      upgrade(db, oldVersion, newVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('pending-syncs', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          store.createIndex('by-timestamp', 'timestamp');
        }
        if (oldVersion < 2) {
          db.createObjectStore('sync-metadata', { keyPath: 'key' });
        }
      },
    });
  }

  private setupEventListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  private handleOnline = async () => {
    console.log('Network connection restored');
    await this.syncPendingData();
  };

  private handleOffline = () => {
    console.log('Network connection lost');
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  };

  private handleBeforeUnload = async () => {
    // Attempt to sync critical data before unload
    const criticalSyncs = await this.getPendingSyncs(true);
    if (criticalSyncs.length > 0) {
      const promises = criticalSyncs.map(sync => 
        this.performSync(sync, true)
      );
      await Promise.all(promises);
    }
  };

  private startPeriodicSync() {
    if (typeof window !== 'undefined' && 'navigator' in window) {
      // Register background sync if available
      if ('serviceWorker' in navigator && 'sync' in registration) {
        navigator.serviceWorker.ready.then(registration => {
          registration.sync.register('tax-data-sync');
        });
      } else {
        // Fallback to interval-based sync
        this.syncInterval = setInterval(() => {
          if (navigator.onLine) {
            this.syncPendingData();
          }
        }, 5 * 60 * 1000); // Every 5 minutes
      }
    }
  }

  async queueSync(
    formData: any,
    calcResult: any,
    endpoint: string,
    method = 'POST'
  ): Promise<void> {
    const sync: PendingSync = {
      timestamp: Date.now(),
      formData,
      calcResult,
      endpoint,
      method,
      retryCount: 0,
      version: await this.getCurrentVersion()
    };

    const db = await this.db;
    await db.add('pending-syncs', sync);

    // Attempt immediate sync if online
    if (navigator.onLine) {
      this.syncPendingData();
    }
  }

  private async getCurrentVersion(): Promise<number> {
    const db = await this.db;
    const metadata = await db.get('sync-metadata', 'version');
    return (metadata?.version || 0) + 1;
  }

  private async getPendingSyncs(criticalOnly = false): Promise<PendingSync[]> {
    const db = await this.db;
    const syncs = await db.getAllFromIndex('pending-syncs', 'by-timestamp');
    return criticalOnly 
      ? syncs.filter(sync => sync.retryCount < MAX_RETRIES)
      : syncs;
  }

  async syncPendingData(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) return;

    this.syncInProgress = true;
    const startTime = Date.now();

    try {
      const pendingSyncs = await this.getPendingSyncs();
      const batches = this.createBatches(pendingSyncs, BATCH_SIZE);

      for (const batch of batches) {
        const promises = batch.map(sync => this.performSync(sync));
        await Promise.all(promises);

        // Check if we're approaching the timeout
        if (Date.now() - startTime > this.networkTimeout) {
          break;
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private createBatches<T>(items: T[], size: number): T[][] {
    return items.reduce((batches: T[][], item: T, index: number) => {
      const batchIndex = Math.floor(index / size);
      if (!batches[batchIndex]) {
        batches[batchIndex] = [];
      }
      batches[batchIndex].push(item);
      return batches;
    }, []);
  }

  private async performSync(sync: PendingSync, isCritical = false): Promise<void> {
    const db = await this.db;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 
      isCritical ? 5000 : this.networkTimeout
    );

    try {
      const response = await fetch(sync.endpoint, {
        method: sync.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Version': sync.version?.toString() || '0',
        },
        body: JSON.stringify({
          formData: sync.formData,
          calculations: sync.calcResult,
        }),
        signal: controller.signal
      });

      if (response.ok) {
        await db.delete('pending-syncs', sync.id!);
        await this.updateSyncMetadata(sync);
      } else if (response.status === 409) {
        // Handle conflict
        await this.handleConflict(sync, await response.json());
      } else {
        await this.handleSyncError(sync, new Error(`HTTP ${response.status}`));
      }
    } catch (error) {
      await this.handleSyncError(sync, error as Error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async handleConflict(sync: PendingSync, serverData: any): Promise<void> {
    const db = await this.db;
    const resolved = await this.resolveConflict(sync, serverData);
    
    if (resolved) {
      // Update with resolved data
      await db.put('pending-syncs', {
        ...sync,
        formData: resolved.formData,
        calcResult: resolved.calcResult,
        version: resolved.version
      });
    } else {
      // Keep server version
      await db.delete('pending-syncs', sync.id!);
    }
  }

  private async resolveConflict(sync: PendingSync, serverData: any): Promise<PendingSync | null> {
    // Implement merge strategy based on your business logic
    const localTimestamp = sync.timestamp;
    const serverTimestamp = serverData.timestamp;

    if (serverTimestamp > localTimestamp) {
      return null; // Keep server version
    }

    // Merge the data (implement your merge strategy here)
    return {
      ...sync,
      formData: { ...serverData.formData, ...sync.formData },
      calcResult: { ...serverData.calcResult, ...sync.calcResult },
      version: Math.max(sync.version || 0, serverData.version || 0) + 1
    };
  }

  private async handleSyncError(sync: PendingSync, error: Error): Promise<void> {
    const db = await this.db;
    const updatedSync = {
      ...sync,
      retryCount: (sync.retryCount || 0) + 1,
      lastError: error.message
    };

    if (updatedSync.retryCount < MAX_RETRIES) {
      // Schedule retry with exponential backoff
      const delay = RETRY_DELAYS[updatedSync.retryCount - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      await db.put('pending-syncs', updatedSync);
      setTimeout(() => this.performSync(updatedSync), delay);
    } else {
      // Move to failed syncs or handle permanently failed sync
      console.error('Sync permanently failed:', sync.id, error);
      await db.delete('pending-syncs', sync.id!);
    }
  }

  private async updateSyncMetadata(sync: PendingSync): Promise<void> {
    const db = await this.db;
    await db.put('sync-metadata', {
      key: 'lastSync',
      lastSync: Date.now(),
      version: sync.version || 0
    });
  }

  async getPendingSyncsCount(): Promise<number> {
    const db = await this.db;
    return await db.count('pending-syncs');
  }

  async getPendingSyncsStatus(): Promise<{
    total: number;
    pending: number;
    failed: number;
  }> {
    const db = await this.db;
    const syncs = await this.getPendingSyncs();
    return {
      total: syncs.length,
      pending: syncs.filter(s => s.retryCount === 0).length,
      failed: syncs.filter(s => s.retryCount >= MAX_RETRIES).length
    };
  }

  dispose() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
  }
}

export const syncManager = new SyncManager();