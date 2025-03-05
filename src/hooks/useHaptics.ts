import { useCallback, useRef, useEffect, useMemo } from 'react';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

interface HapticsOptions {
  fallbackToVibrate?: boolean;
  disableInBackground?: boolean;
}

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

export function useHaptics(options: HapticsOptions = {}) {
  const { fallbackToVibrate = true, disableInBackground = true } = options;

  const isSupported = typeof window !== 'undefined' && 
    (('vibrate' in navigator) || ('haptics' in navigator));

  const patterns: Record<HapticPattern, number[]> = {
    light: [10],
    medium: [20],
    heavy: [30],
    success: [10, 30, 10],
    error: [50, 100, 50],
    warning: [30, 50, 30]
  };

  const trigger = async (pattern: HapticPattern = 'light') => {
    if (!isSupported) return;

    try {
      // Check if app is in background
      if (disableInBackground && document.hidden) return;

      // Try native haptics first
      if ('haptics' in navigator) {
        switch (pattern) {
          case 'light':
            await (navigator as any).haptics?.selectionStart();
            break;
          case 'medium':
          case 'heavy':
            await (navigator as any).haptics?.impactOccurred(pattern);
            break;
          case 'success':
            await (navigator as any).haptics?.notificationOccurred('success');
            break;
          case 'error':
            await (navigator as any).haptics?.notificationOccurred('error');
            break;
          case 'warning':
            await (navigator as any).haptics?.notificationOccurred('warning');
            break;
        }
      } else if (fallbackToVibrate && 'vibrate' in navigator) {
        // Fallback to vibration API
        navigator.vibrate(patterns[pattern]);
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  };

  const selectionFeedback = () => trigger('light');
  const impactFeedback = () => trigger('medium');
  const notificationFeedback = () => trigger('success');
  const errorFeedback = () => trigger('error');

  return {
    isSupported,
    trigger,
    selectionFeedback,
    impactFeedback,
    notificationFeedback,
    errorFeedback
  };
}