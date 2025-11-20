"use client";

import React, { useEffect, useState } from 'react';
import { Activity, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { aiInsightsApi, PipelineStatus } from '@/lib/api/ai-insights';

interface AIEngineStatusProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export function AIEngineStatus({ 
  className = '', 
  showDetails = false,
  compact = false 
}: AIEngineStatusProps) {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await aiInsightsApi.getPipelineStatus();
        setStatus(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch AI engine status:', error);
        setLoading(false);
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 10 seconds
    const interval = setInterval(fetchStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        {!compact && <span className="text-sm text-gray-500">Loading...</span>}
      </div>
    );
  }

  const getStatusConfig = () => {
    switch (status?.worker_status) {
      case 'running':
        return {
          icon: Activity,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: 'AI Engine Running',
          dotColor: 'bg-green-500'
        };
      case 'stopped':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: 'AI Engine Stopped',
          dotColor: 'bg-red-500'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          label: 'AI Engine Unknown',
          dotColor: 'bg-gray-500'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  // Compact version (just a dot indicator)
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`} title={config.label}>
        <div className="relative">
          <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
          {status?.worker_status === 'running' && (
            <div className={`absolute inset-0 w-2 h-2 rounded-full ${config.dotColor} animate-ping opacity-75`} />
          )}
        </div>
        <span className="text-xs text-gray-600">AI</span>
      </div>
    );
  }

  // Standard version
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`p-2 rounded-lg ${config.bgColor}`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${config.color}`}>
            {config.label}
          </span>
          {status?.worker_status === 'running' && (
            <div className="relative">
              <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
              <div className={`absolute inset-0 w-2 h-2 rounded-full ${config.dotColor} animate-ping opacity-75`} />
            </div>
          )}
        </div>
        {showDetails && status && (
          <div className="text-xs text-gray-500 mt-0.5">
            Queue: {status.queue_length} | Failed: {status.failed_queue_length}
            {status.last_heartbeat && (
              <> | Last: {new Date(status.last_heartbeat).toLocaleTimeString()}</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Dropdown version for detailed status
export function AIEngineStatusDropdown({ className = '' }: { className?: string }) {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await aiInsightsApi.getPipelineStatus();
        setStatus(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch AI engine status:', error);
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusConfig = () => {
    switch (status?.worker_status) {
      case 'running':
        return {
          icon: Activity,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          label: 'Running',
          dotColor: 'bg-green-500'
        };
      case 'stopped':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          label: 'Stopped',
          dotColor: 'bg-red-500'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          label: 'Unknown',
          dotColor: 'bg-gray-500'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (loading) {
    return (
      <div className={`p-2 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="AI Engine Status"
      >
        <div className="relative">
          <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
          {status?.worker_status === 'running' && (
            <div className={`absolute inset-0 w-2 h-2 rounded-full ${config.dotColor} animate-ping opacity-75`} />
          )}
        </div>
        <span className="text-sm font-medium text-gray-700">AI Engine</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className={`absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border ${config.borderColor} z-20`}>
            <div className={`p-4 ${config.bgColor} rounded-t-lg`}>
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${config.color}`} />
                <div>
                  <h3 className={`font-semibold ${config.color}`}>
                    AI Engine Status: {config.label}
                  </h3>
                  {status?.last_heartbeat && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      Last heartbeat: {new Date(status.last_heartbeat).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Queue Length</span>
                <span className="text-sm font-semibold text-gray-900">
                  {status?.queue_length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Failed Queue</span>
                <span className={`text-sm font-semibold ${
                  (status?.failed_queue_length || 0) > 0 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {status?.failed_queue_length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Reports in Queue</span>
                <span className="text-sm font-semibold text-gray-900">
                  {status?.reports_in_queue?.length || 0}
                </span>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-b-lg border-t border-gray-200">
              <a
                href="/dashboard/predictions"
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                onClick={() => setIsOpen(false)}
              >
                View AI Dashboard →
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
