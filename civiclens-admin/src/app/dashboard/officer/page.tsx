"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Report, ReportStatus } from '@/types';
import { reportsApi } from '@/lib/api/reports';
import { Badge } from '@/components/ui/Badge';
import { 
  ClipboardList, 
  CheckCircle, 
  TrendingUp, 
  Clock,
  AlertCircle,
  FileText
} from 'lucide-react';

export default function OfficerDashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assigned' | 'acknowledged' | 'in_progress' | 'completed'>('assigned');

  useEffect(() => {
    loadMyReports();
  }, []);

  const loadMyReports = async () => {
    try {
      setLoading(true);
      // Get all reports assigned to current officer
      const data = await reportsApi.getMyReports();
      setReports(data);
    } catch (e) {
      console.error('Failed to load reports', e);
    } finally {
      setLoading(false);
    }
  };

  // Filter reports by status
  const assignedReports = reports.filter(r => r.status === ReportStatus.ASSIGNED_TO_OFFICER);
  const acknowledgedReports = reports.filter(r => r.status === ReportStatus.ACKNOWLEDGED);
  const inProgressReports = reports.filter(r => r.status === ReportStatus.IN_PROGRESS);
  const completedReports = reports.filter(r => 
    r.status === ReportStatus.PENDING_VERIFICATION || 
    r.status === ReportStatus.RESOLVED
  );

  const getActiveReports = () => {
    switch (activeTab) {
      case 'assigned':
        return assignedReports;
      case 'acknowledged':
        return acknowledgedReports;
      case 'in_progress':
        return inProgressReports;
      case 'completed':
        return completedReports;
      default:
        return [];
    }
  };

  const activeReports = getActiveReports();

  const toLabel = (s?: string | null) => (s ? s.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <ClipboardList className="w-8 h-8 text-blue-600" />
                My Tasks
              </h1>
              <p className="text-gray-600 mt-2">Manage your assigned reports and track progress</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => setActiveTab('assigned')}
              className={`text-left rounded-lg p-4 border-2 transition-all ${
                activeTab === 'assigned'
                  ? 'border-red-600 bg-red-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">New Assignments</p>
                  <p className="text-3xl font-bold text-red-900 mt-1">{assignedReports.length}</p>
                  <p className="text-xs text-red-600 mt-1">Need to acknowledge</p>
                </div>
                <AlertCircle className="w-10 h-10 text-red-600 opacity-50" />
              </div>
            </button>

            <button
              onClick={() => setActiveTab('acknowledged')}
              className={`text-left rounded-lg p-4 border-2 transition-all ${
                activeTab === 'acknowledged'
                  ? 'border-yellow-600 bg-yellow-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700">Acknowledged</p>
                  <p className="text-3xl font-bold text-yellow-900 mt-1">{acknowledgedReports.length}</p>
                  <p className="text-xs text-yellow-600 mt-1">Ready to start</p>
                </div>
                <Clock className="w-10 h-10 text-yellow-600 opacity-50" />
              </div>
            </button>

            <button
              onClick={() => setActiveTab('in_progress')}
              className={`text-left rounded-lg p-4 border-2 transition-all ${
                activeTab === 'in_progress'
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">In Progress</p>
                  <p className="text-3xl font-bold text-blue-900 mt-1">{inProgressReports.length}</p>
                  <p className="text-xs text-blue-600 mt-1">Currently working</p>
                </div>
                <TrendingUp className="w-10 h-10 text-blue-600 opacity-50" />
              </div>
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`text-left rounded-lg p-4 border-2 transition-all ${
                activeTab === 'completed'
                  ? 'border-green-600 bg-green-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Completed</p>
                  <p className="text-3xl font-bold text-green-900 mt-1">{completedReports.length}</p>
                  <p className="text-xs text-green-600 mt-1">Awaiting verification</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-600 opacity-50" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {activeTab === 'assigned' && 'New Assignments'}
              {activeTab === 'acknowledged' && 'Acknowledged Reports'}
              {activeTab === 'in_progress' && 'In Progress'}
              {activeTab === 'completed' && 'Completed Reports'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {activeReports.length} {activeReports.length === 1 ? 'report' : 'reports'}
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading reports...</p>
            </div>
          ) : activeReports.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No reports in this category</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {activeReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => router.push(`/dashboard/reports/manage/${report.id}`)}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {report.title}
                        </h3>
                        <Badge status={report.severity} className={getSeverityColor(report.severity)} />
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {report.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="font-medium">
                          {report.report_number || `CL-${report.id}`}
                        </span>
                        <span>•</span>
                        <span>{toLabel(report.category)}</span>
                        <span>•</span>
                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="ml-4">
                      <Badge status={report.status} className="bg-blue-100 text-blue-800" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
