import React, { useState } from 'react';
import { Report } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { 
  ArrowLeft, 
  RefreshCw, 
  Download, 
  Share2, 
  MoreHorizontal,
  ExternalLink,
  Copy,
  FileText,
  Shield,
  Eye
} from 'lucide-react';

interface ReportHeaderProps {
  report: Report;
  onBack: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function ReportHeader({ report, onBack, onRefresh, refreshing }: ReportHeaderProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const getReportAge = () => {
    const now = new Date();
    const created = new Date(report.created_at);
    const diffHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `${diffHours} hours old`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} days old`;
    }
  };

  const handleExportPDF = async (level: 'summary' | 'standard' | 'comprehensive') => {
    try {
      const { exportReportPDF, PDFExportLevel } = await import('@/lib/utils/pdf-export-service');
      
      if (level === 'summary') {
        exportReportPDF({ level: PDFExportLevel.SUMMARY, report });
      } else if (level === 'standard') {
        exportReportPDF({ level: PDFExportLevel.STANDARD, report });
      } else {
        exportReportPDF({ level: PDFExportLevel.COMPREHENSIVE, report });
      }
    } catch (error) {
      console.error('PDF export failed:', error);
    }
    setShowExportMenu(false);
  };

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/dashboard/reports/manage/${report.id}`;
      await navigator.clipboard.writeText(url);
      
      // Show toast notification
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'Report link copied to clipboard';
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
    setShowMoreMenu(false);
  };



  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Single Line Header */}
      <div className="flex items-center justify-between">
          {/* Left: Navigation + Report Info */}
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="btn btn-ghost"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Reports</span>
            </button>
            
            <div className="h-4 w-px bg-gray-300"></div>
            
            {/* Report ID and Key Info */}
            <div className="flex items-center gap-3">
              <h1 className="text-base font-bold text-gray-900">
                {report.report_number || `CL-2025-RNC-${String(report.id).padStart(4, '0')}`}
              </h1>
              
              <span className="text-xs text-gray-500">{getReportAge()}</span>
              <span className="text-gray-300">•</span>
              <span className="text-xs text-gray-600 truncate max-w-[150px]">{report.user?.email || 'anonymous'}</span>
              
              <Badge status={report.status} size="sm" />
              <Badge status={report.severity} size="sm" />
              
              {report.is_sensitive && (
                <div title="Sensitive Report">
                  <Shield className="w-4 h-4 text-red-500" />
                </div>
              )}
              {report.is_featured && (
                <div title="Featured Report">
                  <Eye className="w-4 h-4 text-blue-500" />
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="btn btn-ghost"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Export Menu */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="btn btn-secondary"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                  <button 
                    onClick={() => handleExportPDF('summary')} 
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-medium text-sm">Summary PDF</div>
                      <div className="text-xs text-gray-500">Citizen-facing overview</div>
                    </div>
                  </button>
                  <button 
                    onClick={() => handleExportPDF('standard')} 
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <FileText className="w-4 h-4 text-green-600" />
                    <div>
                      <div className="font-medium text-sm">Standard PDF</div>
                      <div className="text-xs text-gray-500">Internal documentation</div>
                    </div>
                  </button>
                  <button 
                    onClick={() => handleExportPDF('comprehensive')} 
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <FileText className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="font-medium text-sm">Comprehensive PDF</div>
                      <div className="text-xs text-gray-500">Full audit trail</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="btn btn-primary"
              >
                Actions
                <MoreHorizontal className="w-4 h-4" />
              </button>
              
              {showMoreMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                  <button 
                    onClick={handleCopyLink}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Report Link
                  </button>
                  <button 
                    onClick={() => window.open(`/dashboard/reports/${report.id}`, '_blank')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in New Tab
                  </button>
                  <button 
                    onClick={() => setShowMoreMenu(false)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    Share Report
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}