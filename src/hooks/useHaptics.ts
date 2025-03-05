import { useCallback, useRef, useEffect, useMemo } from 'react';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'sequence';
type HapticStrength = 'low' | 'normal' | 'high';

interface HapticConfig {
  pattern: number[];
  strength: number;
  priority: number;
}

// Optimized haptic patterns using Web Haptic API where available
const patterns: Record<HapticPattern, HapticConfig> = {
  light: { pattern: [5], strength: 0.3, priority: 1 },
  medium: { pattern: [15], strength: 0.5, priority: 2 },
  heavy: { pattern: [25], strength: 0.7, priority: 3 },
  success: { pattern: [8, 20, 8], strength: 0.5, priority: 4 },
  error: { pattern: [40, 20, 40], strength: 0.8, priority: 5 },
  warning: { pattern: [25, 40], strength: 0.6, priority: 4 },
  sequence: { pattern: [10, 15, 20, 25], strength: 0.5, priority: 3 }
};

const DEBOUNCE_TIME = 100; // ms
const BATTERY_THRESHOLD = 0.2; // 20%
const PERFORMANCE_THRESHOLD = 0.8; // 80% device performance
const MAX_QUEUED_HAPTICS = 5;
const HAPTIC_COOLDOWN = 2000; // 2s cooldown for intensive haptics

class HapticsManager {
  private static instance: HapticsManager;
  private hapticQueue: Array<{ pattern: HapticPattern; time: number }> = [];
  private isProcessing = false;
  private lastIntensiveHaptic = 0;
  private performanceScore = 1;
  private deviceCapabilities: {
    hasVibrator: boolean;
    hasHapticsAPI: boolean;
    hasPressureAPI: boolean;
  };

  private constructor() {
    this.deviceCapabilities = this.detectCapabilities();
    this.monitorPerformance();
  }

  static getInstance(): HapticsManager {
    if (!HapticsManager.instance) {
      HapticsManager.instance = new HapticsManager();
    }
    return HapticsManager.instance;
  }

  private detectCapabilities() {
    return {
      hasVibrator: typeof navigator !== 'undefined' && 'vibrate' in navigator,
      hasHapticsAPI: typeof window !== 'undefined' && 'haptics' in navigator,
      hasPressureAPI: typeof window !== 'undefined' && 'touchforcechange' in window
    };
  }

  private monitorPerformance() {
    if (typeof window === 'undefined') return;

    const updatePerformance = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        this.performanceScore = Math.max(0, 1 - usageRatio);
      }
    };

    setInterval(updatePerformance, 5000);
  }

  async triggerHaptic(
    pattern: HapticPattern,
    strength: HapticStrength = 'normal'
  ): Promise<boolean> {
    const config = patterns[pattern];
    if (!config || !this.deviceCapabilities.hasVibrator) return false;

    // Adjust strength based on device capabilities and settings
    const adjustedStrength = this.calculateStrength(config.strength, strength);

    // Check cooldown for intensive haptics
    const now = Date.now();
    if (config.priority >= 4 && now - this.lastIntensiveHaptic < HAPTIC_COOLDOWN) {
      return false;
    }

    // Queue management
    if (this.hapticQueue.length >= MAX_QUEUED_HAPTICS) {
      this.hapticQueue = this.hapticQueue
        .sort((a, b) => patterns[b.pattern].priority - patterns[a.pattern].priority)
        .slice(0, Math.floor(MAX_QUEUED_HAPTICS / 2));
    }

    this.hapticQueue.push({ pattern, time: now });

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processHapticQueue();
    }

    if (config.priority >= 4) {
      this.lastIntensiveHaptic = now;
    }

    return true;
  }

  private async processHapticQueue() {
    if (this.isProcessing || this.hapticQueue.length === 0) return;

    this.isProcessing = true;

    try {
      while (this.hapticQueue.length > 0) {
        const { pattern } = this.hapticQueue.shift()!;
        const config = patterns[pattern];

        if (this.deviceCapabilities.hasHapticsAPI) {
          // Use Web Haptics API if available
          await this.triggerWithHapticsAPI(config);
        } else {
          // Fall back to vibration API
          await this.triggerWithVibrationAPI(config);
        }

        // Add small delay between patterns
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private calculateStrength(baseStrength: number, userStrength: HapticStrength): number {
    const strengthMultiplier = {
      low: 0.5,
      normal: 1,
      high: 1.5
    }[userStrength];

    return Math.min(
      1,
      baseStrength * 
      strengthMultiplier * 
      this.performanceScore
    );
  }

  private async triggerWithHapticsAPI(config: HapticConfig): Promise<void> {
    if (!this.deviceCapabilities.hasHapticsAPI) return;

    try {
      // @ts-ignore: Web Haptics API
      const haptics = (navigator as any).haptics;
      await haptics.vibrate({
        duration: config.pattern.reduce((a, b) => a + b, 0),
        intensity: config.strength
      });
    } catch (error) {
      console.warn('Haptics API failed:', error);
      // Fall back to vibration API
      await this.triggerWithVibrationAPI(config);
    }
  }

  private async triggerWithVibrationAPI(config: HapticConfig): Promise<void> {
    if (!this.deviceCapabilities.hasVibrator) return;

    try {
      navigator.vibrate(config.pattern);
    } catch (error) {
      console.warn('Vibration API failed:', error);
    }
  }
}

export function useHaptics(options: {
  defaultStrength?: HapticStrength;
  disabled?: boolean;
} = {}) {
  const { 
    defaultStrength = 'normal',
    disabled = false
  } = options;

  const manager = useMemo(() => HapticsManager.getInstance(), []);
  const lastTriggerTime = useRef<number>(0);
  const batteryRef = useRef<{ level: number } | null>(null);
  
  // Initialize battery monitoring
  useEffect(() => {
    if (disabled || !('getBattery' in navigator)) return;

    const updateBatteryStatus = (battery: any) => {
      batteryRef.current = battery;
    };

    // @ts-ignore: Newer browsers support this
    navigator.getBattery?.()
      .then((battery: any) => {
        updateBatteryStatus(battery);
        battery.addEventListener('levelchange', () => updateBatteryStatus(battery));
      })
      .catch(() => {
        batteryRef.current = null;
      });

    return () => {
      // Clean up battery listener
      navigator.getBattery?.()
        .then((battery: any) => {
          battery.removeEventListener('levelchange', updateBatteryStatus);
        })
        .catch(() => {});
    };
  }, [disabled]);

  const shouldTriggerHaptics = useCallback(() => {
    if (disabled) return false;

    const now = Date.now();
    if (now - lastTriggerTime.current < DEBOUNCE_TIME) {
      return false;
    }

    // Reduce haptics on low battery
    if (batteryRef.current?.level != null && batteryRef.current.level < BATTERY_THRESHOLD) {
      return Math.random() > 0.7; // 30% chance to skip
    }

    return true;
  }, [disabled]);

  const trigger = useCallback((
    pattern: HapticPattern,
    strength: HapticStrength = defaultStrength
  ) => {
    if (!shouldTriggerHaptics()) return;

    manager.triggerHaptic(pattern, strength).then(success => {
      if (success) {
        lastTriggerTime.current = Date.now();
      }
    });
  }, [manager, shouldTriggerHaptics, defaultStrength]);

  const triggerSequence = useCallback((
    patterns: HapticPattern[],
    strength: HapticStrength = defaultStrength
  ) => {
    if (!shouldTriggerHaptics()) return;

    patterns.forEach((pattern, index) => {
      setTimeout(() => {
        manager.triggerHaptic(pattern, strength);
      }, index * 100);
    });
    
    lastTriggerTime.current = Date.now();
  }, [manager, shouldTriggerHaptics, defaultStrength]);

  return {
    trigger,
    triggerSequence,
    isAvailable: manager.deviceCapabilities?.hasVibrator || manager.deviceCapabilities?.hasHapticsAPI,
    isLowBattery: batteryRef.current?.level != null && batteryRef.current.level < BATTERY_THRESHOLD
  };
}