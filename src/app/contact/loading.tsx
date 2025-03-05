import { Spinner } from '@/components/ui/Spinner';

export default function ContactLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      <div className="animate-pulse space-y-8">
        <div className="h-10 w-48 bg-gray-200 rounded mx-auto mb-8"></div>
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-12 w-32 bg-gray-200 rounded mx-auto"></div>
        </div>
      </div>
    </div>
  );
}