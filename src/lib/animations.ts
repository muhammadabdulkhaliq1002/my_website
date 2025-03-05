// Animation performance optimizations
const COMPOSITOR_ONLY_PROPERTIES = ['transform', 'opacity'];
const HARDWARE_ACCELERATED_STYLES = {
  transform: 'translateZ(0)',
  backfaceVisibility: 'hidden',
  perspective: '1000px',
  willChange: 'transform, opacity'
};

// Optimized animation configurations
const mobileAnimations = {
  slideUp: {
    keyframes: [
      { transform: 'translate3d(0, 100%, 0)', opacity: 0 },
      { transform: 'translate3d(0, 0, 0)', opacity: 1 }
    ],
    options: {
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards' as FillMode
    }
  },
  slideDown: {
    keyframes: [
      { transform: 'translate3d(0, -100%, 0)', opacity: 0 },
      { transform: 'translate3d(0, 0, 0)', opacity: 1 }
    ],
    options: {
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards' as FillMode
    }
  },
  fadeIn: {
    keyframes: [
      { opacity: 0, transform: 'translate3d(0, 0, 0)' },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' }
    ],
    options: {
      duration: 200,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards' as FillMode
    }
  },
  scaleIn: {
    keyframes: [
      { transform: 'translate3d(0, 0, 0) scale(0.95)', opacity: 0 },
      { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 }
    ],
    options: {
      duration: 250,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards' as FillMode
    }
  }
};

// Optimized timing configurations
const timings = {
  instant: 1,
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500
};

// Optimized easing functions
const easings = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)'
};

interface AnimationOptions extends KeyframeEffectOptions {
  onStart?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
}

interface GroupAnimationOptions extends AnimationOptions {
  stagger?: number;
  from?: 'start' | 'end' | 'center';
}

class AnimationController {
  private static instance: AnimationController;
  private activeAnimations: Map<Element, Animation> = new Map();
  private scheduledAnimations: Set<() => void> = new Set();
  private frameId: number | null = null;
  private isReducedMotion: boolean = false;

  private constructor() {
    this.setup();
  }

  private setup() {
    if (typeof window !== 'undefined') {
      // Check for reduced motion preference
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.isReducedMotion = mediaQuery.matches;
      mediaQuery.addEventListener('change', (e) => {
        this.isReducedMotion = e.matches;
      });

      // Setup performance monitoring
      let slowFrames = 0;
      const frameCallback = (timestamp: DOMHighResTimeStamp) => {
        if (this.frameId) {
          const frameTime = performance.now() - timestamp;
          if (frameTime > 16.67) { // More than 60fps
            slowFrames++;
            if (slowFrames > 5) {
              this.optimizeForPerformance();
              slowFrames = 0;
            }
          } else {
            slowFrames = Math.max(0, slowFrames - 1);
          }
        }
        this.frameId = requestAnimationFrame(frameCallback);
      };
      this.frameId = requestAnimationFrame(frameCallback);
    }
  }

  private optimizeForPerformance() {
    this.activeAnimations.forEach(animation => {
      const timing = animation.effect?.getTiming();
      if (timing) {
        timing.duration = Math.max(timing.duration as number * 0.8, timings.fast);
      }
    });
  }

  static getInstance(): AnimationController {
    if (!AnimationController.instance) {
      AnimationController.instance = new AnimationController();
    }
    return AnimationController.instance;
  }

  animate(
    element: Element,
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options: AnimationOptions = {}
  ): Promise<void> {
    // Handle reduced motion preference
    if (this.isReducedMotion) {
      const lastKeyframe = Array.isArray(keyframes) 
        ? keyframes[keyframes.length - 1] 
        : Object.fromEntries(
            Object.entries(keyframes).map(([prop, values]) => [
              prop, 
              Array.isArray(values) ? values[values.length - 1] : values
            ])
          );
      Object.assign(element, lastKeyframe);
      return Promise.resolve();
    }

    // Cancel any existing animation
    this.cancel(element);

    // Apply hardware acceleration
    Object.assign(
      (element as HTMLElement).style,
      HARDWARE_ACCELERATED_STYLES
    );

    // Create and configure animation
    const animation = element.animate(keyframes, {
      duration: timings.normal,
      easing: easings.easeOut,
      fill: 'both',
      ...options
    });

    // Store animation
    this.activeAnimations.set(element, animation);

    // Handle callbacks
    options.onStart?.();
    animation.onfinish = () => {
      this.activeAnimations.delete(element);
      options.onComplete?.();
    };
    animation.oncancel = () => {
      this.activeAnimations.delete(element);
      options.onCancel?.();
    };

    return new Promise((resolve) => {
      animation.onfinish = () => {
        this.activeAnimations.delete(element);
        options.onComplete?.();
        resolve();
      };
    });
  }

  animateGroup(
    elements: Element[],
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options: GroupAnimationOptions = {}
  ): Promise<void> {
    if (this.isReducedMotion) {
      return Promise.resolve();
    }

    const { stagger = 50, from = 'start', ...animationOptions } = options;
    
    const animations = elements.map((element, index) => {
      const delay = (() => {
        switch (from) {
          case 'center':
            const center = Math.floor(elements.length / 2);
            return Math.abs(index - center) * stagger;
          case 'end':
            return (elements.length - 1 - index) * stagger;
          default: // 'start'
            return index * stagger;
        }
      })();

      return this.animate(element, keyframes, {
        ...animationOptions,
        delay: (animationOptions.delay || 0) + delay
      });
    });

    return Promise.all(animations).then(() => {});
  }

  transition(
    element: Element,
    properties: Partial<CSSStyleDeclaration>,
    options: AnimationOptions = {}
  ): Promise<void> {
    const keyframes = [
      { ...properties },
      Object.fromEntries(
        Object.entries(properties).map(([key, value]) => [key, value])
      )
    ];
    return this.animate(element, keyframes, options);
  }

  spring(
    element: Element,
    properties: Partial<CSSStyleDeclaration>,
    options: AnimationOptions = {}
  ): Promise<void> {
    return this.animate(element, [properties], {
      ...options,
      easing: easings.spring,
      duration: timings.normal
    });
  }

  cancel(element: Element): void {
    const animation = this.activeAnimations.get(element);
    if (animation) {
      animation.cancel();
      this.activeAnimations.delete(element);
    }
  }

  pause(element: Element): void {
    const animation = this.activeAnimations.get(element);
    if (animation) {
      animation.pause();
    }
  }

  resume(element: Element): void {
    const animation = this.activeAnimations.get(element);
    if (animation) {
      animation.play();
    }
  }

  scheduleAnimation(callback: () => void): void {
    this.scheduledAnimations.add(callback);
    if (!this.frameId) {
      this.frameId = requestAnimationFrame(() => this.runScheduledAnimations());
    }
  }

  private runScheduledAnimations(): void {
    this.scheduledAnimations.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Animation callback error:', error);
      }
    });
    this.scheduledAnimations.clear();
    this.frameId = null;
  }

  dispose(): void {
    this.activeAnimations.forEach(animation => animation.cancel());
    this.activeAnimations.clear();
    this.scheduledAnimations.clear();
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}

// Export singleton instance
export const animator = AnimationController.getInstance();

// Export utility functions and configurations
export {
  mobileAnimations,
  timings,
  easings,
  HARDWARE_ACCELERATED_STYLES,
  COMPOSITOR_ONLY_PROPERTIES
};