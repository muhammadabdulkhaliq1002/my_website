import { openDB, IDBPDatabase } from 'idb';
import { TaxSlabs } from '@/types';

// Types and interfaces
interface TaxSlab {
  min: number;
  max: number | null;
  rate: number;
}

interface TaxBreakdown {
  slab: string;
  taxableAmount: number;
  taxAmount: number;
}

interface DeductionsData {
  section80C: number;
  section80CCC: number;
  section80CCDEmployee: number;
  section80CCD1B: number;
  section80CCDEmployer: number;
  section80D: number;
  section80DD: number;
  section80DDB: number;
  section80E: number;
  section80EE: number;
  section80EEA: number;
  section80EEB: number;
  section80G: number;
  section80GG: number;
  section80GGA: number;
  section80GGC: number;
  section80TTA: number;
  section80TTB: number;
  section80U: number;
  totalDeductions: number;
}

interface TaxCalculation {
  id?: number;
  timestamp: number;
  formData: any;
  results: any;
  hash?: string;
}

interface TaxCalculationResult {
  breakdown: TaxBreakdown[];
  totalTax: number;
  cess: number;
  finalTax: number;
}

// Constants
const DB_NAME = 'tax-calculations';
const STORE_NAME = 'calculations';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const WORKER_THRESHOLD = 100000; // Use worker for calculations above 1L

// Memoization cache for tax calculations
const memoizedResults = new Map<string, { result: any; timestamp: number }>();

// Tax slabs with binary search optimization
const OLD_TAX_SLABS: TaxSlab[] = [
  { min: 0, max: 250000, rate: 0 },
  { min: 250000, max: 500000, rate: 0.05 },
  { min: 500000, max: 1000000, rate: 0.20 },
  { min: 1000000, max: null, rate: 0.30 }
].sort((a, b) => a.min - b.min);

const NEW_TAX_SLABS: TaxSlab[] = [
  { min: 0, max: 300000, rate: 0 },
  { min: 300000, max: 600000, rate: 0.05 },
  { min: 600000, max: 900000, rate: 0.10 },
  { min: 900000, max: 1200000, rate: 0.15 },
  { min: 1200000, max: 1500000, rate: 0.20 },
  { min: 1500000, max: null, rate: 0.30 }
].sort((a, b) => a.min - b.min);

// Worker setup for complex calculations
let worker: Worker | null = null;

if (typeof window !== 'undefined') {
  const workerCode = `
    self.onmessage = function(e) {
      const { type, data } = e.data;
      let result;
      
      switch (type) {
        case 'calculateTax':
          result = calculateTaxInWorker(data.income, data.optOutNewTaxRegime);
          break;
        case 'calculateDeductions':
          result = calculateDeductionsInWorker(data.deductions);
          break;
      }
      
      self.postMessage(result);
    };

    // Worker implementations of tax calculations
    ${calculateTax.toString()}
    ${calculateDeductions.toString()}
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  worker = new Worker(URL.createObjectURL(blob));
}

// Optimized cache management
class TaxCalculationCache {
  private db: Promise<IDBPDatabase>;
  private memoryCache: Map<string, TaxCalculation> = new Map();

  constructor() {
    this.db = this.initDB();
    this.startCacheCleanup();
  }

  private async initDB() {
    const db = await openDB(DB_NAME, 2, {
      upgrade(db, oldVersion, newVersion) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('hash', 'hash');
        }
        if (oldVersion < 2) {
          const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
          store.createIndex('hash', 'hash');
        }
      },
    });

    // Warm up memory cache
    const recentCalculations = await db.getAll(STORE_NAME);
    recentCalculations.forEach(calc => {
      if (calc.hash) {
        this.memoryCache.set(calc.hash, calc);
      }
    });

    return db;
  }

  private startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      // Clean memory cache
      for (const [hash, calc] of this.memoryCache.entries()) {
        if (now - calc.timestamp > CACHE_DURATION) {
          this.memoryCache.delete(hash);
        }
      }
      // Clean IndexedDB in background
      this.cleanOldCalculations();
    }, 60 * 60 * 1000); // Run every hour
  }

  private async cleanOldCalculations() {
    const db = await this.db;
    const now = Date.now();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const calculations = await store.index('timestamp').getAll();
    
    for (const calc of calculations) {
      if (now - calc.timestamp > CACHE_DURATION) {
        await store.delete(calc.id!);
      }
    }
  }

  async saveCalculation(formData: any, results: any): Promise<void> {
    const hash = await this.generateHash(formData);
    const calculation: TaxCalculation = {
      timestamp: Date.now(),
      formData,
      results,
      hash
    };

    // Update memory cache
    this.memoryCache.set(hash, calculation);

    // Update IndexedDB
    const db = await this.db;
    await db.add(STORE_NAME, calculation);

    // Keep only last 50 calculations
    const all = await db.getAllKeys(STORE_NAME);
    if (all.length > 50) {
      const keysToDelete = all.slice(0, all.length - 50);
      const tx = db.transaction(STORE_NAME, 'readwrite');
      await Promise.all(keysToDelete.map(key => tx.store.delete(key)));
    }
  }

  private async generateHash(data: any): Promise<string> {
    const str = JSON.stringify(data);
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async findCachedCalculation(formData: any): Promise<TaxCalculation | null> {
    const hash = await this.generateHash(formData);
    
    // Check memory cache first
    const memoryResult = this.memoryCache.get(hash);
    if (memoryResult) return memoryResult;

    // Fall back to IndexedDB
    const db = await this.db;
    const result = await db.getFromIndex(STORE_NAME, 'hash', hash);
    if (result) {
      // Update memory cache
      this.memoryCache.set(hash, result);
      return result;
    }

    return null;
  }
}

// Singleton instance
const taxCalculationCache = new TaxCalculationCache();

// Optimized calculation functions
export async function calculateTaxableIncome(data: any): Promise<number> {
  const [salaryIncome, housePropertyIncome, otherIncome] = await Promise.all([
    calculateSalaryIncome(data),
    calculateHousePropertyIncome(data),
    data.otherIncome.totalOtherIncome || 0
  ]);

  return salaryIncome + housePropertyIncome + otherIncome;
}

export async function calculateDeductions(deductions: DeductionsData): Promise<number> {
  // Check cache first
  const cacheKey = JSON.stringify(deductions);
  if (memoizedResults.has(cacheKey)) {
    const cached = memoizedResults.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.result;
    }
    memoizedResults.delete(cacheKey);
  }

  let result: number;
  if (worker && Object.values(deductions).some(v => v > WORKER_THRESHOLD)) {
    // Use worker for complex calculations
    result = await new Promise(resolve => {
      worker!.onmessage = (e) => resolve(e.data);
      worker!.postMessage({ type: 'calculateDeductions', data: { deductions } });
    });
  } else {
    // Calculate in main thread for simple cases
    const section80CLimit = 150000;
    const combinedDeductions = Math.min(
      deductions.section80C + deductions.section80CCC + deductions.section80CCDEmployee,
      section80CLimit
    );

    const npsDeduction = Math.min(deductions.section80CCD1B, 50000);
    const otherDeductions = calculateOtherDeductions(deductions);
    result = combinedDeductions + npsDeduction + otherDeductions;
  }

  // Cache the result
  memoizedResults.set(cacheKey, { result, timestamp: Date.now() });
  return result;
}

function calculateOtherDeductions(deductions: DeductionsData): number {
  return Math.min(deductions.section80D, 100000) +
    Math.min(deductions.section80DD, 125000) +
    Math.min(deductions.section80DDB, 100000) +
    deductions.section80E +
    Math.min(deductions.section80EE, 50000) +
    Math.min(deductions.section80EEA, 150000) +
    Math.min(deductions.section80EEB, 150000) +
    deductions.section80G +
    Math.min(deductions.section80GG, 60000) +
    deductions.section80GGA +
    deductions.section80GGC +
    Math.min(deductions.section80TTA, 10000) +
    Math.min(deductions.section80TTB, 50000) +
    Math.min(deductions.section80U, 125000);
}

export async function calculateTax(
  totalIncome: number,
  optOutNewTaxRegime: boolean = false
): Promise<TaxCalculationResult> {
  let remainingIncome = totalIncome;
  let totalTax = 0;
  const breakdown: TaxBreakdown[] = [];

  const taxSlabs = optOutNewTaxRegime ? OLD_TAX_SLABS : NEW_TAX_SLABS;
  const slabIndex = binarySearchSlab(taxSlabs, totalIncome);
  const relevantSlabs = taxSlabs.slice(0, slabIndex + 1);

  for (const slab of relevantSlabs) {
    if (remainingIncome <= 0) break;

    const slabRange = slab.max ? slab.max - slab.min : remainingIncome;
    const taxableAmount = Math.min(remainingIncome, slabRange);
    const taxAmount = taxableAmount * slab.rate;

    if (taxableAmount > 0) {
      breakdown.push({
        slab: `₹${slab.min.toLocaleString()} to ${slab.max ? `₹${slab.max.toLocaleString()}` : 'above'}`,
        taxableAmount,
        taxAmount
      });
    }

    totalTax += taxAmount;
    remainingIncome -= slabRange;
  }

  // Apply rebate u/s 87A if applicable
  if (totalIncome <= 700000) {
    const rebate = Math.min(totalTax, 25000);
    totalTax -= rebate;
  }

  const cess = totalTax * 0.04;
  const finalTax = Math.round(totalTax + cess);

  return { breakdown, totalTax, cess, finalTax };
}

export function validateSection80CLimit(deductions: number): boolean {
  const LIMIT = 150000;
  return deductions <= LIMIT;
}

export function calculateHousePropertyIncome(
  annualValue: number,
  municipalTaxes: number,
  interestOnLoan: number
): number {
  const netAnnualValue = annualValue - municipalTaxes;
  const standardDeduction = netAnnualValue * 0.3;
  return netAnnualValue - standardDeduction - interestOnLoan;
}

export function calculateSalaryIncome(
  basic: number,
  hra: number,
  lta: number,
  otherAllowances: number
): number {
  return basic + hra + lta + otherAllowances;
}

// Helper function for binary search
function binarySearchSlab(slabs: TaxSlab[], income: number): number {
  let left = 0;
  let right = slabs.length - 1;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (slabs[mid].max === null || income < slabs[mid].max) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }

  return left;
}

export type { TaxSlab, TaxBreakdown, TaxCalculationResult };