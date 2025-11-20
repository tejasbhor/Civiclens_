"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  Activity,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Brain,
  XCircle,
  Target,
  Gauge,
  FileText
} from 'lucide-react';
import { aiInsightsApi, AIMetrics, PipelineStatus, CategoryInsights } from '@/lib/api/ai-insights';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'sonner';

export default function PredictionsPage() {
  // Authentication and role-based access control
  const { user } = useAuth();
  const role = user?.role || '';
  const canViewPredictions = ['super_admin', 'admin', 'moderator'].includes(role);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [categoryInsights, setCategoryInsights] = useState<CategoryInsights[]>([]);
  const [timeRange, setTimeRange] = useState(30); // days
  const [activeTab, setActiveTab] = useState<'monitoring' | 'actions'>('monitoring');
  
  // Actions tab state
  const [pendingReports, setPendingReports] = useState<Array<any>>([]);
  const [selectedReports, setSelectedReports] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [queuedReports, setQueuedReports] = useState<Set<number>>(new Set()); // Reports in AI queue
  const [processingReports, setProcessingReports] = useState<Set<number>>(new Set()); // Currently being processed
  
  // Progress modal state
  const [progressModal, setProgressModal] = useState<{
    isOpen: boolean;
    total: number;
    queued: number;
    skipped: number;
    processing: boolean;
    skipReasons: Record<number, string>;
    errors: any[];
  }>({
    isOpen: false,
    total: 0,
    queued: 0,
    skipped: 0,
    processing: false,
    skipReasons: {},
    errors: []
  });

  // Auto-clear error after 10 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [metricsData, statusData, categoryData] = await Promise.all([
        aiInsightsApi.getMetrics(timeRange),
        aiInsightsApi.getPipelineStatus(),
        aiInsightsApi.getCategoryInsights(timeRange)
      ]);
      
      setMetrics(metricsData);
      setPipelineStatus(statusData);
      setCategoryInsights(categoryData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch AI insights:', err);
      const errorMsg = 'Failed to load AI insights data';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  const fetchPendingReports = useCallback(async () => {
    try {
      const data = await aiInsightsApi.getPendingReports(100);
      setPendingReports(data);
      
      // Update queued reports from pipeline status
      // Note: Reading pipelineStatus from closure without dependency to avoid infinite loop
      if (pipelineStatus?.reports_in_queue) {
        const queuedIds = new Set(pipelineStatus.reports_in_queue.map(r => r.id));
        setQueuedReports(queuedIds);
      }
    } catch (error) {
      console.error('Failed to fetch pending reports:', error);
      toast.error('Failed to load pending reports');
    }
  }, []); // Fixed: Removed pipelineStatus dependency to prevent infinite loop

  useEffect(() => {
    fetchData();
    if (activeTab === 'actions') {
      fetchPendingReports();
    }
    // Auto-refresh every 5 seconds for real-time monitoring
    const interval = setInterval(() => {
      fetchData();
      if (activeTab === 'actions') {
        fetchPendingReports();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [timeRange, activeTab, fetchData, fetchPendingReports]);

  const handleProcessSelected = useCallback(async () => {
    if (selectedReports.size === 0) {
      alert('Please select reports to process');
      return;
    }

    const selectedArray = Array.from(selectedReports);
    
    // Open progress modal immediately
    setProgressModal({
      isOpen: true,
      total: selectedArray.length,
      queued: 0,
      skipped: 0,
      processing: true,
      skipReasons: {},
      errors: []
    });

    try {
      setProcessing(true);
      
      // Mark selected reports as being queued
      setProcessingReports(new Set(selectedArray));
      
      // Process reports
      const result = await aiInsightsApi.processReports(selectedArray, false);
      
      // Update queued reports state
      if (result.queued_count > 0) {
        const newQueuedReports = new Set(queuedReports);
        selectedArray.forEach(id => {
          if (!result.skip_reasons || !result.skip_reasons[id]) {
            newQueuedReports.add(id);
          }
        });
        setQueuedReports(newQueuedReports);
      }
      
      // Update progress modal with results
      setProgressModal({
        isOpen: true,
        total: selectedArray.length,
        queued: result.queued_count,
        skipped: result.skipped_count,
        processing: false,
        skipReasons: result.skip_reasons || {},
        errors: result.errors || []
      });
      
      // Clear processing state
      setProcessingReports(new Set());
      
      // Refresh data to get updated queue status
      await Promise.all([fetchData(), fetchPendingReports()]);
      
      // Clear selection
      setSelectedReports(new Set());
    } catch (error) {
      console.error('Failed to process reports:', error);
      setProgressModal(prev => ({
        ...prev,
        processing: false,
        errors: [{ error: 'Failed to process reports. Please try again.' }]
      }));
      setProcessingReports(new Set());
    } finally {
      setProcessing(false);
    }
  }, [selectedReports, queuedReports, fetchData, fetchPendingReports]);

  const toggleReportSelection = useCallback((reportId: number) => {
    const newSelection = new Set(selectedReports);
    if (newSelection.has(reportId)) {
      newSelection.delete(reportId);
    } else {
      newSelection.add(reportId);
    }
    setSelectedReports(newSelection);
  }, [selectedReports]);

  const selectAll = useCallback(() => {
    setSelectedReports(new Set(pendingReports.map(r => r.id)));
  }, [pendingReports]);

  const deselectAll = useCallback(() => {
    setSelectedReports(new Set());
  }, []);

  // Memoized helper functions (must be before early return)
  const getWorkerStatusBadge = useMemo(() => (status: string) => {
    switch (status) {
      case 'running':
        return <Badge color="green" className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          Running
        </Badge>;
      case 'stopped':
        return <Badge color="red" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Stopped
        </Badge>;
      default:
        return <Badge color="gray" className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Unknown
        </Badge>;
    }
  }, []);

  const getConfidenceColor = useMemo(() => (confidence: number) => {
    if (confidence >= 0.70) return 'text-green-600';  // High confidence (calibrated)
    if (confidence >= 0.50) return 'text-yellow-600'; // Medium confidence (calibrated)
    return 'text-red-600';  // Low confidence
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-600 rounded-lg shadow-sm">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Predictions & Monitoring</h1>
            <p className="text-sm text-gray-600">Real-time AI pipeline performance and insights</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'monitoring'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Activity className="w-4 h-4" />
              Pipeline Monitoring
            </div>
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'actions'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />
              AI Actions
              {pendingReports.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                  {pendingReports.length}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Monitoring Tab Content */}
      {activeTab === 'monitoring' && (
        <>
      {/* Pipeline Status Card */}
      {pipelineStatus && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary-600" />
              AI Worker Status
            </h2>
            {getWorkerStatusBadge(pipelineStatus.worker_status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Queue Length</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{pipelineStatus.queue_length}</div>
              <p className="text-xs text-blue-700 mt-1">Reports waiting</p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-900">Failed Queue</span>
              </div>
              <div className="text-2xl font-bold text-red-600">{pipelineStatus.failed_queue_length}</div>
              <p className="text-xs text-red-700 mt-1">Processing errors</p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Last Heartbeat</span>
              </div>
              <div className="text-sm font-semibold text-green-600">
                {pipelineStatus.last_heartbeat 
                  ? new Date(pipelineStatus.last_heartbeat).toLocaleTimeString()
                  : 'N/A'}
              </div>
              <p className="text-xs text-green-700 mt-1">Worker health check</p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">In Queue</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">{pipelineStatus.reports_in_queue.length}</div>
              <p className="text-xs text-purple-700 mt-1">Currently processing</p>
            </div>
          </div>

          {/* Reports in Queue */}
          {pipelineStatus.reports_in_queue.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Reports in Processing Queue</h3>
              <div className="space-y-2">
                {pipelineStatus.reports_in_queue.slice(0, 5).map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">{report.report_number}</span>
                      <span className="text-sm text-gray-700">{report.title}</span>
                    </div>
                    <Badge color="blue" size="sm">{report.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metrics Overview */}
      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Brain className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Processed</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.total_processed.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                <span>Today: <strong className="text-blue-600">{metrics.processed_today}</strong></span>
                <span>Week: <strong className="text-blue-600">{metrics.processed_this_week}</strong></span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Confidence</p>
                  <p className={`text-2xl font-bold ${getConfidenceColor(metrics.avg_confidence)}`}>
                    {(metrics.avg_confidence * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${metrics.avg_confidence * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Needs Review</p>
                  <p className="text-2xl font-bold text-yellow-600">{metrics.needs_review_count}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Low confidence classifications requiring manual review
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Gauge className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duplicates Found</p>
                  <p className="text-2xl font-bold text-purple-600">{metrics.duplicate_detection_count}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Duplicate reports detected by AI
              </p>
            </div>
          </div>

          {/* Confidence Distribution */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              Confidence Distribution
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-900">High Confidence</span>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {metrics.high_confidence_count}
                </div>
                <p className="text-xs text-green-700">≥ 70% confidence</p>
                <div className="mt-2 w-full bg-green-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${(metrics.high_confidence_count / (metrics.high_confidence_count + metrics.medium_confidence_count + metrics.low_confidence_count)) * 100}%`
                    }}
                  />
                </div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-yellow-900">Medium Confidence</span>
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                </div>
                <div className="text-3xl font-bold text-yellow-600 mb-1">
                  {metrics.medium_confidence_count}
                </div>
                <p className="text-xs text-yellow-700">50-70% confidence</p>
                <div className="mt-2 w-full bg-yellow-200 rounded-full h-2">
                  <div
                    className="bg-yellow-600 h-2 rounded-full"
                    style={{
                      width: `${(metrics.medium_confidence_count / (metrics.high_confidence_count + metrics.medium_confidence_count + metrics.low_confidence_count)) * 100}%`
                    }}
                  />
                </div>
              </div>

              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-red-900">Low Confidence</span>
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div className="text-3xl font-bold text-red-600 mb-1">
                  {metrics.low_confidence_count}
                </div>
                <p className="text-xs text-red-700">{'<'} 50% confidence</p>
                <div className="mt-2 w-full bg-red-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{
                      width: `${(metrics.low_confidence_count / (metrics.high_confidence_count + metrics.medium_confidence_count + metrics.low_confidence_count)) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Category Insights */}
      {categoryInsights.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-600" />
            Category-wise Performance
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Category</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Total Reports</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">AI Classified</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Manual</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Avg Confidence</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {categoryInsights.map((insight) => (
                  <tr key={insight.category} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900 capitalize">
                        {insight.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4 text-gray-700">{insight.total_reports}</td>
                    <td className="text-center py-3 px-4">
                      <Badge color="blue" size="sm">{insight.ai_classified}</Badge>
                    </td>
                    <td className="text-center py-3 px-4">
                      <Badge color="green" size="sm">{insight.manual_classified}</Badge>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className={`font-semibold ${getConfidenceColor(insight.avg_confidence)}`}>
                        {(insight.avg_confidence * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full"
                          style={{ width: `${(insight.ai_classified / insight.total_reports) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}

      {/* Actions Tab Content */}
      {activeTab === 'actions' && (
        <div className="space-y-6">
          {/* Action Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary-600" />
                  Process Reports with AI
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manually trigger AI processing for reports in <strong>RECEIVED</strong> status only
                </p>
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>Smart Processing:</strong> Only fresh reports in RECEIVED status are processed. 
                    Already classified, assigned, or completed reports are automatically skipped.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedReports.size > 0 && (
                  <>
                    <button
                      onClick={deselectAll}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Deselect All
                    </button>
                    <button
                      onClick={handleProcessSelected}
                      disabled={processing}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Process {selectedReports.size} Selected
                        </>
                      )}
                    </button>
                  </>
                )}
                {selectedReports.size === 0 && pendingReports.length > 0 && (
                  <button
                    onClick={selectAll}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Select All ({pendingReports.length})
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-700 mb-1">Pending Reports</div>
                <div className="text-2xl font-bold text-blue-600">{pendingReports.length}</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-sm text-green-700 mb-1">Selected</div>
                <div className="text-2xl font-bold text-green-600">{selectedReports.size}</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-sm text-purple-700 mb-1">Queue Status</div>
                <div className="text-sm font-semibold text-purple-600">
                  {pipelineStatus?.worker_status === 'running' ? 'Worker Running' : 'Worker Stopped'}
                </div>
              </div>
            </div>
          </div>

          {/* Reports List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">
                  Reports Awaiting AI Processing
                </h3>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-gray-600">In Queue</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span className="text-gray-600">Queuing</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-primary-500 rounded"></div>
                    <span className="text-gray-600">Selected</span>
                  </div>
                </div>
              </div>
            </div>
            
            {pendingReports.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
                <p className="text-gray-600">No reports pending AI processing</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {pendingReports.map((report) => {
                  const isQueued = queuedReports.has(report.id);
                  const isProcessing = processingReports.has(report.id);
                  const isDisabled = isQueued || isProcessing;
                  
                  return (
                  <div
                    key={report.id}
                    className={`p-4 transition-colors ${
                      isQueued ? 'bg-blue-50 border-l-4 border-blue-500' :
                      isProcessing ? 'bg-yellow-50 border-l-4 border-yellow-500' :
                      selectedReports.has(report.id) ? 'bg-primary-50' : 
                      'hover:bg-gray-50'
                    } ${isDisabled ? 'opacity-75' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedReports.has(report.id)}
                        onChange={() => toggleReportSelection(report.id)}
                        disabled={isDisabled}
                        className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            {report.report_number}
                          </span>
                          <Badge color="blue" size="sm">{report.status}</Badge>
                          <Badge color={
                            report.severity === 'critical' ? 'red' :
                            report.severity === 'high' ? 'orange' :
                            report.severity === 'medium' ? 'yellow' : 'green'
                          } size="sm">
                            {report.severity}
                          </Badge>
                          {report.category && (
                            <Badge color="gray" size="sm" className="capitalize">
                              {report.category.replace('_', ' ')}
                            </Badge>
                          )}
                          {report.needs_review && (
                            <Badge color="yellow" size="sm">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Needs Review
                            </Badge>
                          )}
                          {isQueued && (
                            <Badge color="blue" size="sm" className="animate-pulse">
                              <Clock className="w-3 h-3 mr-1" />
                              In Queue
                            </Badge>
                          )}
                          {isProcessing && (
                            <Badge color="yellow" size="sm" className="animate-pulse">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Queuing...
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-900 mb-1">{report.title}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Created {new Date(report.created_at).toLocaleDateString()}</span>
                          {report.classified_by_user_id && (
                            <span className="text-green-600">Manually Classified</span>
                          )}
                          {report.department_id && (
                            <span className="text-blue-600">Department Assigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {progressModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                {progressModal.processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing Reports...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Processing Complete
                  </>
                )}
              </h3>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Progress Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{progressModal.total}</div>
                  <div className="text-sm text-gray-600">Total Selected</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{progressModal.queued}</div>
                  <div className="text-sm text-gray-600">Queued for AI</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{progressModal.skipped}</div>
                  <div className="text-sm text-gray-600">Skipped</div>
                </div>
              </div>

              {/* Progress Bar */}
              {progressModal.processing ? (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Queueing reports...</span>
                    <span className="text-sm text-gray-500">Please wait</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-primary-600 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Processing complete</span>
                    <span className="text-sm text-gray-500">
                      {progressModal.queued}/{progressModal.total} queued
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-green-600 rounded-full transition-all duration-500" 
                      style={{ width: `${(progressModal.queued / progressModal.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {!progressModal.processing && progressModal.queued > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        Successfully queued {progressModal.queued} report{progressModal.queued !== 1 ? 's' : ''} for AI processing
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Reports are now being processed by the AI worker. Check the Pipeline Monitoring tab for real-time progress.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Skip Reasons */}
              {!progressModal.processing && Object.keys(progressModal.skipReasons).length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3 mb-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">
                        {Object.keys(progressModal.skipReasons).length} report{Object.keys(progressModal.skipReasons).length !== 1 ? 's' : ''} skipped
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        These reports cannot be processed due to the following reasons:
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {Object.entries(progressModal.skipReasons).map(([id, reason]) => (
                      <div key={id} className="flex items-start gap-2 text-xs">
                        <span className="font-mono bg-yellow-100 px-2 py-0.5 rounded">#{id}</span>
                        <span className="text-yellow-800">{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {!progressModal.processing && progressModal.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900">
                        {progressModal.errors.length} error{progressModal.errors.length !== 1 ? 's' : ''} occurred
                      </p>
                      <div className="mt-2 space-y-1">
                        {progressModal.errors.map((err, idx) => (
                          <p key={idx} className="text-xs text-red-700">
                            {err.error || JSON.stringify(err)}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Next Steps */}
              {!progressModal.processing && progressModal.queued > 0 && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">Next Steps:</p>
                  <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
                    <li>Reports are being processed by the AI worker in the background</li>
                    <li>Switch to "Pipeline Monitoring" tab to see real-time progress</li>
                    <li>Low-confidence classifications will appear in Reports page with "Needs Review" filter</li>
                    <li>High-confidence reports will be automatically classified and routed</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              {progressModal.processing ? (
                <button
                  disabled
                  className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                >
                  Processing...
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setProgressModal({ ...progressModal, isOpen: false });
                      setActiveTab('monitoring');
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    View Pipeline Status
                  </button>
                  <button
                    onClick={() => setProgressModal({ ...progressModal, isOpen: false })}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
