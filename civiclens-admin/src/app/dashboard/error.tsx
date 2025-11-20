'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-red-900 mb-2">
                Failed to Load Dashboard
              </h2>
              <p className="text-red-700 mb-4">
                {error.message || 'An unexpected error occurred while loading the dashboard.'}
              </p>
              <div className="space-y-2 text-sm text-red-600 mb-4">
                <p>Possible causes:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Backend API is not running</li>
                  <li>Network connection issue</li>
                  <li>Server error</li>
                </ul>
              </div>
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        </div>

        {/* Helpful Tips */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Troubleshooting Tips</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Check if the backend API is running at <code className="bg-blue-100 px-1 rounded">http://localhost:8000</code></li>
            <li>• Verify your network connection</li>
            <li>• Check browser console for detailed error messages</li>
            <li>• Try refreshing the page</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
