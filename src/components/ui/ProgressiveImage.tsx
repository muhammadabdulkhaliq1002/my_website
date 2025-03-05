'use client';

import Image from 'next/image';
import { useState, useEffect, useRef, memo } from 'react';

interface ProgressiveImageProps {
  src: string;
  blurDataURL?: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  loadingStrategy?: 'lazy' | 'eager' | 'progressive';
}

function generateLQIP(width: number, height: number): string {
  // Generate SVG-based LQIP placeholder
  const shimmer = `
    <svg width="${width}" height="${height}" version="1.1" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#F3F4F6"/>
      <rect id="r" width="${width}" height="${height}" fill="url(#g)"/>
      <defs>
        <linearGradient id="g">
          <stop stop-color="#F3F4F6" offset="0%"/>
          <stop stop-color="#E5E7EB" offset="50%"/>
          <stop stop-color="#F3F4F6" offset="100%"/>
        </linearGradient>
      </defs>
    </svg>
  `;
  return `data:image/svg+xml;base64,${Buffer.from(shimmer).toString('base64')}`;
}

function ProgressiveImageComponent({
  src,
  blurDataURL,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 75,
  loadingStrategy = 'progressive'
}: ProgressiveImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(
    blurDataURL || generateLQIP(width, height)
  );
  const imageRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver>();

  useEffect(() => {
    // Reset loading state when src changes
    setIsLoading(true);
    setCurrentSrc(blurDataURL || generateLQIP(width, height));
  }, [src, blurDataURL, width, height]);

  useEffect(() => {
    if (priority || loadingStrategy === 'eager') {
      setIsVisible(true);
      return;
    }

    if (!imageRef.current || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '50px 0px', // Start loading slightly before the image enters viewport
        threshold: 0.01
      }
    );

    observerRef.current.observe(imageRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority, loadingStrategy]);

  // Preload high-quality image
  useEffect(() => {
    if (!isVisible) return;

    const highQualityImage = new window.Image();
    highQualityImage.src = src;
    
    const handleLoad = () => {
      setCurrentSrc(src);
      setIsLoading(false);
    };

    highQualityImage.addEventListener('load', handleLoad);
    return () => highQualityImage.removeEventListener('load', handleLoad);
  }, [src, isVisible]);

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      ref={imageRef}
      style={{
        aspectRatio: `${width}/${height}`,
        background: '#F3F4F6'
      }}
    ></div>
      {isVisible && (
        <>
          <Image
            src={currentSrc}
            alt={alt}
            width={width}
            height={height}
            quality={quality}
            className={`
              w-full h-full object-cover
              transition-all duration-700 ease-in-out
              ${isLoading 
                ? 'scale-110 blur-lg' 
                : 'scale-100 blur-0 animate-fadeIn'
              }
            `}
            style={{
              transform: isLoading ? 'scale(1.1)' : 'scale(1)',
              opacity: isLoading ? 0.8 : 1,
              willChange: 'transform, opacity, filter',
            }}
            priority={priority}
            loading={loadingStrategy === 'lazy' ? 'lazy' : 'eager'}
            sizes={`
              (max-width: 640px) 100vw,
              (max-width: 1024px) 50vw,
              33vw
            `}
            onLoadingComplete={() => {
              setIsLoading(false);
              setCurrentSrc(src);
            }}
          />
          {loadingStrategy === 'progressive' && isLoading && (
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              style={{
                animation: 'shimmer 1.5s infinite',
                transform: 'translateX(-100%)',
                willChange: 'transform',
              }}
            />
          )}
        </>
      )}
      <noscript></noscript>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          className={className}
        />
      </noscript>
    </div>
  );
}

// Add fadeIn animation to Tailwind
const style = document.createElement('style');
style.textContent = `
  @keyframes shimmer {
    100% {
      transform: translateX(100%);
    }
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-in-out;
  }
`;
document.head.appendChild(style);

// Memoize the component to prevent unnecessary re-renders
export default memo(ProgressiveImageComponent);