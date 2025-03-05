'use client';

import { useCallback, useEffect, useRef, useState, memo } from 'react';

interface ServiceCard {
  title: string;
  description: string;
  features: string[];
  color: string;
  icon: string[];
}

// Memoized service card component
const ServiceCardComponent = memo(({ service }: { service: ServiceCard }) => (
  <div
    className={`flex-shrink-0 w-[300px] sm:w-[400px] bg-white rounded-lg shadow-md p-6 sm:p-8 transform transition-transform hover:scale-105 snap-center`}
  >
    <h3 className={`text-2xl font-semibold mb-4 text-${service.color}-600`}>{service.title}</h3>
    <p className="text-gray-600 mb-6">{service.description}</p>
    <ul className="space-y-3">
      {service.features.map((feature, idx) => (
        <li key={idx} className="flex items-start">
          <span className={`text-${service.color}-600 mr-2`}>✓</span>
          {feature}
        </li>
      ))}
    </ul>
    <div className={`mt-6 pt-6 border-t border-${service.color}-100`}>
      <div className="flex justify-between">
        {service.icon.map((icon, idx) => (
          <div key={idx} className={`h-10 w-10 flex items-center justify-center rounded-full bg-${service.color}-50`}>
            {icon}
          </div>
        ))}
      </div>
    </div>
  </div>
));

ServiceCardComponent.displayName = 'ServiceCardComponent';

// Constants moved outside component
const services: ServiceCard[] = [
  {
    title: "Income Tax Services",
    description: "Comprehensive income tax services for individuals and businesses, ensuring compliance with the latest tax regulations while maximizing your savings.",
    features: ["Individual Income Tax Return Filing", "Business Tax Return Preparation", "Tax Planning and Strategy", "Digital Document Submission"],
    color: "blue",
    icon: ["📝", "⏰", "💰"]
  },
  {
    title: "Tax Consultation",
    description: "Get expert advice on tax matters through our professional consultation services. We help you understand your tax obligations and plan for the future.",
    features: ["Personal Tax Planning", "Business Tax Strategy", "Investment Tax Implications", "Compliance Guidance"],
    color: "green",
    icon: ["🎯", "📊", "🤝"]
  },
  {
    title: "Online Self-Service Portal",
    description: "Take control of your tax preparation with our user-friendly online portal. Submit documents, track progress, and manage your tax affairs securely.",
    features: ["24/7 Access to Documents", "Secure Document Upload", "Real-time Status Updates", "Direct Communication Channel"],
    color: "purple",
    icon: ["🔒", "📱", "💬"]
  }
];

export default function ServicesSlider() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = window.innerWidth >= 640 ? 400 : 300;
      const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
      
      container.scrollTo({
        left: container.scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  }, []);

  const updateScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      setScrollPosition(scrollContainerRef.current.scrollLeft);
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              (entry.target as HTMLElement).style.visibility = 'visible';
            } else {
              (entry.target as HTMLElement).style.visibility = 'hidden';
            }
          });
        },
        { root: container, threshold: 0.1 }
      );

      const cards = container.children;
      Array.from(cards).forEach(card => observer.observe(card));

      container.addEventListener('scroll', updateScrollPosition, { passive: true });
      return () => {
        container.removeEventListener('scroll', updateScrollPosition);
        Array.from(cards).forEach(card => observer.unobserve(card));
      };
    }
  }, [updateScrollPosition]);

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPaused) {
      setMousePosition({ x: e.clientX, y: e.clientY });
    }
  }, [isPaused]);

  return (
    <div className="w-full bg-gray-50 py-12 sm:py-16 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8 sm:mb-12">Our Services</h2>
        <div className="relative" onMouseMove={handleMouseMove}>
          {/* Navigation buttons */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-gray-600 hover:text-blue-600 p-2 rounded-full shadow-md transform transition-transform hover:scale-105"
            aria-label="Scroll left"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-gray-600 hover:text-blue-600 p-2 rounded-full shadow-md transform transition-transform hover:scale-105"
            aria-label="Scroll right"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div 
            className="relative overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div 
              ref={scrollContainerRef}
              className={`flex gap-6 sm:gap-8 overflow-x-auto snap-x snap-mandatory hide-scrollbar will-change-transform`}
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {[...services, ...services].map((service, index) => (
                <ServiceCardComponent key={index} service={service} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}