"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Report, ReportStatus, ReportSeverity, User, Task, Media } from '@/types';
import { reportsApi, StatusHistoryResponse } from '@/lib/api/reports';
import { Badge } from '@/components/ui/Badge';
import { 
  ArrowLeft, 
  Settings, 
  Download, 
  MapPin, 
  Calendar,
  User as UserIcon,
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  Camera,
  Phone,
  Mail,
  ExternalLink,
  Edit,
  MessageSquare,
  Flag,
  Share2,
  Eye,
  Activity,
  Zap,
  Shield,
  Users,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Save,
  X,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import { MapPreview } from '@/components/ui/MapPreview';

// Import components from index
import {
  ReportHeader,
  ReportOverview,
  LocationDetails,
  CitizenInfo,
  QuickStats,
  MediaGallery,
  WorkflowTimeline,
  LifecycleManager,
  TabsSection
} from '@/components/reports/manage';

export default function ManageReportPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params?.id ? parseInt(params.id as string) : null;

  // Core state
  const [report, setReport] = useState<Report | null>(null);
  const [history, setHistory] = useState<StatusHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Map preview state
  const [mapPreview, setMapPreview] = useState<{ lat: number; lng: number; address?: string | null } | null>(null);

  // Load data
  const loadReport = useCallback(async () => {
    if (!reportId) return;
    try {
      setRefreshing(true);
      const data = await reportsApi.getReportById(reportId);
      setReport(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load report');
    } finally {
      setRefreshing(false);
    }
  }, [reportId]);

  const loadHistory = useCallback(async () => {
    if (!reportId) return;
    try {
      const data = await reportsApi.getStatusHistory(reportId);
      setHistory(data);
    } catch (e: any) {
      console.error('Failed to load history:', e);
    }
  }, [reportId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([loadReport(), loadHistory()]);
    setLoading(false);
  }, [loadReport, loadHistory]);

  useEffect(() => {
    if (reportId) {
      loadData();
    }
  }, [reportId, loadData]);

  const handleRefresh = () => {
    loadData();
  };

  const handleUpdate = () => {
    loadReport();
    loadHistory();
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading report details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-status-rejected mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Report Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'The requested report could not be found.'}</p>
            <button
              onClick={() => router.push('/dashboard/reports')}
              className="btn btn-primary"
            >
              ← Back to Reports
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <ReportHeader 
        report={report} 
        onBack={() => router.push('/dashboard/reports')}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {/* Main Content */}
      <div className="space-y-6">
        {/* Row 1 - Report Overview & Lifecycle Manager */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left - Report Overview (1 column) - Natural height */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <ReportOverview report={report} onUpdate={handleUpdate} />
          </div>
          
          {/* Right - Lifecycle Manager (2 columns) - Min height matches overview, can grow */}
          <div className="lg:col-span-2 min-h-full">
            <LifecycleManager report={report} onUpdate={handleUpdate} />
          </div>
        </div>

        {/* Row 2 - Tabs Section (Full Width) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <TabsSection report={report} history={history} onUpdate={handleUpdate} />
        </div>

        {/* Rows 3-4 - Multi-row Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 - Citizen Info + Media Gallery */}
          <div className="space-y-6">
            <CitizenInfo report={report} />
            <MediaGallery report={report} />
          </div>
          
          {/* Column 2 - Location Details + Quick Stats */}
          <div className="space-y-6">
            <LocationDetails 
              report={report} 
              onViewMap={() => setMapPreview({ lat: report.latitude, lng: report.longitude, address: report.address })}
            />
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <QuickStats report={report} history={history} />
            </div>
          </div>
          
          {/* Column 3 - Timeline */}
          <div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <WorkflowTimeline report={report} history={history?.history} />
            </div>
          </div>
        </div>
      </div>

      {/* Map Preview Modal */}
      {mapPreview && (
        <MapPreview
          latitude={mapPreview.lat}
          longitude={mapPreview.lng}
          address={mapPreview.address}
          onClose={() => setMapPreview(null)}
        />
      )}
    </div>
  );
}