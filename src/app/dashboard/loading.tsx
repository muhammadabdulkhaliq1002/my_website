import { Spinner } from '@/components/ui/Spinner';

export default function DashboardLoading() {
  return (
    <div className="h-screen bg-gray-100">
      <div className="flex flex-col md:flex-row h-full">
        {/* Sidebar Skeleton */}
        <div className="hidden md:block w-64 bg-white shadow-lg">
          <div className="animate-pulse">
            <div className="p-4 border-b">
              <div className="h-6 bg-gray-200 rounded w-24"></div>
            </div>
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="flex-1">
          <header className="bg-white shadow-sm">
            <div className="px-4 sm:px-6 py-4">
              <div className="flex justify-between items-center">
                <div className="h-6 bg-gray-200 rounded w-48"></div>
                <div className="flex space-x-4">
                  <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                  <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-6">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-64"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="space-y-2">
                      {[1, 2].map((j) => (
                        <div key={j} className="h-4 bg-gray-200 rounded w-full"></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}