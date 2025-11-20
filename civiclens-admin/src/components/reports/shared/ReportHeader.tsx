"use client";

import React, { useState } from 'react';
import { Report } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Download } from 'lucide-react';

interface ReportHeaderProps {
  report: Report;
  showExportButton?: boolean;
  onExport?: (level: 'summary' | 'standard' | 'comprehensive') => void;
  className?: string;
}

export function ReportHeader({ 
  report, 
  showExportButton = true,
  onExport,
  className = '' 
}: ReportHeaderProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExport = (level: 'summary' | 'standard' | 'comprehensive') => {
    if (onExport) {
      onExport(level);
    }
    setShowExportMenu(false);
  };

  return (
    <div className={`flex items-start justify-between ${className}`}>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold text-gray-900">
            {report.report_number || `CL-${report.id}`}
          </h2>
          <Badge status={report.status} size="md" />
          <Badge status={report.severity} size="md" />
        </div>
        <p className="text-sm text-gray-500">
          Reported on {formatDate(report.created_at)}
        </p>
      </div>
      
      {showExportButton && onExport && (
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export PDF
            <svg 
              className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
              <button 
                onClick={() => handleExport('summary')} 
                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <div className="font-medium">Summary</div>
                  <div className="text-xs text-gray-500">Citizen-facing, quick glance</div>
                </div>
              </button>
              <button 
                onClick={() => handleExport('standard')} 
                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <div className="font-medium">Standard</div>
                  <div className="text-xs text-gray-500">Internal use, moderate detail</div>
                </div>
              </button>
              <button 
                onClick={() => handleExport('comprehensive')} 
                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <div className="font-medium">Comprehensive</div>
                  <div className="text-xs text-gray-500">Audit/compliance, full detail</div>
                </div>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
