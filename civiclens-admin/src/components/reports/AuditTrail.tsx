"use client";

import React, { useEffect, useState } from 'react';
import { Clock, User, FileText, CheckCircle, AlertCircle, TrendingUp, Shield, AlertTriangle, Flag, Scale, History } from 'lucide-react';
import apiClient from '@/lib/api/client';

interface ActivityLog {
  id: number;
  action: string;
  description: string;
  timestamp: string;
  user_id?: number;
  user_role?: string;
  status: string;
  extra_data?: any;
  ip_address?: string;
}

interface ActivityHistoryProps {
  resourceType: string;
  resourceId: number;
  className?: string;
}

export function ActivityHistory({ resourceType, resourceId, className = '' }: ActivityHistoryProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadActivityLogs();
  }, [resourceType, resourceId]);
  
  const loadActivityLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(
        `/audit/resource/${resourceType}/${resourceId}`
      );
      setLogs(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load activity history');
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const getActionIcon = (action: string) => {
    if (action.includes('created')) return <FileText className="w-4 h-4 text-blue-600" />;
    if (action.includes('updated') || action.includes('changed')) return <Clock className="w-4 h-4 text-yellow-600" />;
    if (action.includes('resolved')) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (action.includes('escalat')) return <TrendingUp className="w-4 h-4 text-red-600" />;
    if (action.includes('appeal')) return <Scale className="w-4 h-4 text-purple-600" />;
    if (action.includes('assigned')) return <User className="w-4 h-4 text-indigo-600" />;
    if (action.includes('classified')) return <Flag className="w-4 h-4 text-orange-600" />;
    return <Shield className="w-4 h-4 text-gray-600" />;
  };
  
  const getActionColor = (action: string) => {
    if (action.includes('created')) return 'border-blue-500';
    if (action.includes('updated') || action.includes('changed')) return 'border-yellow-500';
    if (action.includes('resolved')) return 'border-green-500';
    if (action.includes('escalat')) return 'border-red-500';
    if (action.includes('appeal')) return 'border-purple-500';
    if (action.includes('assigned')) return 'border-indigo-500';
    if (action.includes('classified')) return 'border-orange-500';
    return 'border-gray-500';
  };
  
  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };
  
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (error) {
      console.error('Date formatting error:', error, 'for timestamp:', timestamp);
      return 'Invalid Date';
    }
  };
  
  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Failed to load activity history</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          Activity History
        </h3>
        <span className="text-sm text-gray-500">{logs.length} {logs.length === 1 ? 'activity' : 'activities'}</span>
      </div>
      
      {logs.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No activity history found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log, index) => (
            <div 
              key={log.id} 
              className={`border-l-4 ${getActionColor(log.action)} pl-4 py-3 bg-white rounded-r-lg shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatAction(log.action)}
                      </p>
                      {log.status === 'success' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Success
                        </span>
                      )}
                      {log.status === 'failure' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Failed
                        </span>
                      )}
                    </div>
                    
                    {log.description && (
                      <p className="text-sm text-gray-700 mt-1">{log.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {log.user_role && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.user_role.replace('_', ' ').toUpperCase()}
                        </span>
                      )}
                      {log.ip_address && (
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          {log.ip_address}
                        </span>
                      )}
                    </div>
                    
                    {log.extra_data && Object.keys(log.extra_data).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                          View details
                        </summary>
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono">
                          <pre className="whitespace-pre-wrap break-words">
                            {JSON.stringify(log.extra_data, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
                
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-500 whitespace-nowrap">
                    {formatTimestamp(log.timestamp)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
