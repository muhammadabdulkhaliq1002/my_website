'use client';

import { useEffect, useRef, memo } from 'react';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  secondaryColor?: string;
  speed?: 'slow' | 'normal' | 'fast';
  thickness?: number;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12'
};

const speedMap = {
  slow: '1.5s',
  normal: '1s',
  fast: '0.6s'
};

function SpinnerComponent({
  className = '',
  size = 'md',
  color = 'rgb(37, 99, 235)', // blue-600
  secondaryColor = 'rgb(229, 231, 235)', // gray-200
  speed = 'normal',
  thickness = 4,
  style,
  ...props
}: SpinnerProps) {
  const spinnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!spinnerRef.current) return;

    const spinner = spinnerRef.current;
    let frame: number;

    // Smooth rotation using requestAnimationFrame
    const rotate = () => {
      const progress = (performance.now() % parseInt(speedMap[speed])) / parseInt(speedMap[speed]);
      const rotation = progress * 360;
      spinner.style.setProperty('--spinner-rotation', `${rotation}deg`);
      frame = requestAnimationFrame(rotate);
    };

    frame = requestAnimationFrame(rotate);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [speed]);

  const combinedClassName = `
    ${sizeMap[size]}
    relative
    inline-block
    ${className}
  `.trim();

  return (
    <div
      ref={spinnerRef}
      className={combinedClassName}
      role="status"
      aria-label="Loading"
      style={{
        ...style,
        '--spinner-color': color,
        '--spinner-secondary-color': secondaryColor,
        '--spinner-thickness': `${thickness}px`,
        '--spinner-duration': speedMap[speed],
        transform: 'translateZ(0)', // Force GPU acceleration
        willChange: 'transform', // Optimize animations
        backfaceVisibility: 'hidden', // Reduce repaints
      } as React.CSSProperties}
      {...props}
    >
      <div
        className="absolute inset-0"
        style={{
          borderRadius: '50%',
          border: 'var(--spinner-thickness) solid var(--spinner-secondary-color)',
          borderTopColor: 'var(--spinner-color)',
          transform: 'rotate(var(--spinner-rotation, 0deg))',
          transition: 'border-color 0.2s ease',
        }}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const Spinner = memo(SpinnerComponent);