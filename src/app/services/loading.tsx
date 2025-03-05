import { Spinner } from '@/components/ui/Spinner';

export default function ServicesLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16">
      <div className="animate-pulse space-y-8">
        <div className="h-10 w-48 bg-gray-200 rounded mx-auto"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4">
              <div className="h-8 w-3/4 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded w-5/6"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}