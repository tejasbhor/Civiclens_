"use client";

import React from 'react';

interface BulkProgressModalProps {
  isOpen: boolean;
  title: string;
  total: number;
  completed: number;
  failed: number;
  currentItem?: string;
  errors?: string[];
  onClose?: () => void;
}

export const BulkProgressModal: React.FC<BulkProgressModalProps> = ({
  isOpen,
  title,
  total,
  completed,
  failed,
  currentItem,
  errors = [],
  onClose,
}) => {
  if (!isOpen) return null;

  const progress = total > 0 ? ((completed + failed) / total) * 100 : 0;
  const isComplete = completed + failed >= total;
  const successCount = completed - failed;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {isComplete && onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>
              {completed + failed} of {total} processed
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${
                isComplete
                  ? failed > 0
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                  : 'bg-primary-600'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current Item */}
        {!isComplete && currentItem && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Processing:</p>
            <p className="text-sm font-medium text-gray-900">{currentItem}</p>
          </div>
        )}

        {/* Status Summary */}
        {isComplete && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-green-900">Successful</span>
              </div>
              <span className="text-lg font-bold text-green-600">{successCount}</span>
            </div>
            {failed > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-red-900">Failed</span>
                </div>
                <span className="text-lg font-bold text-red-600">{failed}</span>
              </div>
            )}
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-700 mb-2">Errors:</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {errors.map((error, idx) => (
                <p key={idx} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {!isComplete && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )}

        {/* Close Button */}
        {isComplete && onClose && (
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};
