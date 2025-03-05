import Link from 'next/link';

export const metadata = {
  title: 'Offline | Integrated Accounting',
  description: 'You are currently offline. Please check your internet connection.',
};

export default function OfflinePage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">You're Offline</h1>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          It seems you've lost your internet connection. Please check your connection and try again.
        </p>
        <Link
          href="/"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </Link>
      </div>
    </div>
  )
}