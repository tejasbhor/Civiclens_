import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { officerService } from "@/services/officerService";
import { OfficerHeader } from "@/components/layout/OfficerHeader";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { logger } from "@/lib/logger";
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Navigation,
  Image as ImageIcon,
  FileText,
  Star,
  XCircle,
  Pause,
  Play,
  RefreshCw,
  Zap,
  AlertTriangle,
  Users,
  Building2,
  Tag,
  MessageSquare,
  ExternalLink,
  Copy,
  Award,
  TrendingUp
} from "lucide-react";
import { RejectAssignmentModal } from "@/components/officer/RejectAssignmentModal";
import { PutOnHoldModal } from "@/components/officer/PutOnHoldModal";
import { ResumeWorkModal } from "@/components/officer/ResumeWorkModal";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MediaViewer, MediaItem } from "@/components/media/MediaViewer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isBackendReachable } = useConnectionStatus();
  const { toast } = useToast();

  const [task, setTask] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  // Helper functions
  const getStatusColor = useCallback((status: string): string => {
    const s = status?.toLowerCase();
    if (s === 'resolved' || s === 'closed') return 'bg-green-500';
    if (s === 'rejected' || s === 'assignment_rejected') return 'bg-red-500';
    if (s === 'in_progress') return 'bg-blue-500';
    if (s === 'acknowledged') return 'bg-purple-500';
    if (s === 'assigned_to_officer') return 'bg-amber-500';
    if (s === 'pending_verification') return 'bg-indigo-500';
    if (s === 'on_hold') return 'bg-gray-500';
    if (s === 'reopened') return 'bg-orange-500';
    return 'bg-slate-500';
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    const s = status?.toLowerCase();
    if (s === 'resolved' || s === 'closed') return CheckCircle2;
    if (s === 'rejected' || s === 'assignment_rejected') return XCircle;
    if (s === 'on_hold') return Pause;
    if (s === 'pending_verification') return Clock;
    return Clock;
  }, []);

  const getSeverityColor = useCallback((severity: string): string => {
    const s = severity?.toLowerCase();
    if (s === 'critical') return 'text-red-600 bg-red-50 border-red-200';
    if (s === 'high') return 'text-orange-600 bg-orange-50 border-orange-200';
    if (s === 'medium') return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  }, []);

  const toLabel = useCallback((str: string): string => {
    return str?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
  }, []);

  const formatDate = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  }, []);

  const formatDateShort = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  }, []);

  const getTimeAgo = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      return formatDateShort(dateString);
    } catch {
      return 'Invalid date';
    }
  }, [formatDateShort]);

  // Extract error message helper
  const extractErrorMessage = useCallback((error: any): string => {
    if (typeof error === 'string') return error;
    if (error?.response?.data?.detail) {
      const detail = error.response.data.detail;
      if (Array.isArray(detail)) {
        return detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ');
      }
      if (typeof detail === 'object') {
        return detail.msg || detail.message || JSON.stringify(detail);
      }
      return detail;
    }
    if (error?.message) return error.message;
    if (error?.isNetworkError || error?.code === 'ERR_NETWORK') {
      return 'Network error. Please check your connection.';
    }
    return 'An unexpected error occurred. Please try again.';
  }, []);

  // Load task details
  const loadTaskDetails = useCallback(async () => {
    if (!id || !user) return;

    try {
      setError(null);
      setLoading(true);

      logger.debug(`Loading task details for report ID: ${id}`);

      // Fetch task details and history in parallel
      const [taskData, historyData] = await Promise.allSettled([
        officerService.getTaskDetails(parseInt(id)),
        officerService.getTaskHistory(parseInt(id))
      ]);

      // Handle task data
      if (taskData.status === 'fulfilled') {
        logger.debug('Task data loaded:', taskData.value);
        setTask(taskData.value);
      } else {
        logger.error('Failed to load task:', taskData.reason);
        const errorMsg = extractErrorMessage(taskData.reason);
        setError(errorMsg);
      toast({
          title: "Failed to Load Task",
          description: errorMsg,
          variant: "destructive"
        });
      }

      // Handle history data
      if (historyData.status === 'fulfilled') {
        logger.debug('History data loaded:', historyData.value);
        setHistory(historyData.value?.history || []);
      } else {
        logger.error('Failed to load history:', historyData.reason);
        // Don't show error toast for history, just log it
      }
    } catch (err: any) {
      logger.error('Task detail load error:', err);
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      toast({
        title: "Failed to Load Task Details",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [id, user, extractErrorMessage, toast]);

  // Initial load
  useEffect(() => {
    if (id && user && !authLoading) {
      loadTaskDetails();
    }
  }, [id, user, authLoading, loadTaskDetails]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/officer/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTaskDetails();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Task details updated successfully."
    });
  }, [loadTaskDetails, toast]);

  const handleAcknowledge = async () => {
    try {
      setActionLoading(true);
      await officerService.acknowledgeTask(parseInt(id!));
      toast({
        title: "Success",
        description: "Task acknowledged successfully"
      });
      await loadTaskDetails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: extractErrorMessage(error),
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartWork = async () => {
    try {
      setActionLoading(true);
      await officerService.startWork(parseInt(id!));
      toast({
        title: "Success",
        description: "Work started successfully"
      });
      await loadTaskDetails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: extractErrorMessage(error),
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitForVerification = () => {
    navigate(`/officer/task/${id}/complete`);
  };

  const handleAddUpdate = () => {
    setShowUpdateModal(true);
  };

  const handleSubmitUpdate = async () => {
    if (!updateText.trim()) {
    toast({
        title: "Error",
        description: "Please enter an update message",
        variant: "destructive"
      });
      return;
    }

    try {
      setActionLoading(true);
      await officerService.addUpdate(parseInt(id!), updateText.trim());
      toast({
        title: "Success",
        description: "Progress update added successfully"
      });
      setShowUpdateModal(false);
      setUpdateText("");
      await loadTaskDetails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: extractErrorMessage(error),
        variant: "destructive"
    });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectAssignment = () => {
    setShowRejectModal(true);
  };

  const handlePutOnHold = () => {
    setShowHoldModal(true);
  };

  const handleResumeWork = () => {
    setShowResumeModal(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard"
    });
  };

  // Calculate time metrics
  const timeMetrics = useMemo(() => {
    if (!task?.task) return null;

    const now = new Date();
    const assignedAt = task.task.assigned_at ? new Date(task.task.assigned_at) : null;
    const acknowledgedAt = task.task.acknowledged_at ? new Date(task.task.acknowledged_at) : null;
    const startedAt = task.task.started_at ? new Date(task.task.started_at) : null;
    const resolvedAt = task.task.resolved_at ? new Date(task.task.resolved_at) : null;

    let timeInCurrentStatus = 0;
    if (task.status === 'assigned_to_officer' && assignedAt) {
      timeInCurrentStatus = Math.floor((now.getTime() - assignedAt.getTime()) / 86400000);
    } else if (task.status === 'acknowledged' && acknowledgedAt) {
      timeInCurrentStatus = Math.floor((now.getTime() - acknowledgedAt.getTime()) / 86400000);
    } else if (task.status === 'in_progress' && startedAt) {
      timeInCurrentStatus = Math.floor((now.getTime() - startedAt.getTime()) / 86400000);
    }

    return {
      assignedAt,
      acknowledgedAt,
      startedAt,
      resolvedAt,
      timeInCurrentStatus
    };
  }, [task]);

  // Action permissions
  const canAcknowledge = task?.status === 'assigned_to_officer' && task?.task?.assigned_to === user?.id;
  const canStartWork = task?.status === 'acknowledged' && task?.task?.assigned_to === user?.id;
  const canComplete = task?.status === 'in_progress' && task?.task?.assigned_to === user?.id;
  const canReject = task?.status === 'assigned_to_officer' && task?.task?.assigned_to === user?.id;
  const isOnHold = task?.status === 'on_hold' && task?.task?.assigned_to === user?.id;
  const canAddUpdate = ['acknowledged', 'in_progress'].includes(task?.status?.toLowerCase() || '') && task?.task?.assigned_to === user?.id;

  // Loading state
  if (authLoading || (loading && !task && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading task details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <OfficerHeader />
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h3 className="text-xl font-semibold mb-2">Task Not Found</h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={loadTaskDetails}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate('/officer/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <OfficerHeader />
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h3 className="text-xl font-semibold mb-2">Task Not Found</h3>
            <p className="text-muted-foreground mb-6">
            The task you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/officer/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Card>
        </div>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(task.status || '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <OfficerHeader onRefresh={handleRefresh} refreshing={refreshing} />

      {/* Connection Status Banner */}
      {!isBackendReachable && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="container mx-auto flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4" />
            <span>You're currently offline. Some features may be limited.</span>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/officer/tasks')}
              aria-label="Back to Tasks"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-3xl font-bold text-foreground">Task Details</h1>
                {task.report_number && (
                  <Badge variant="outline" className="font-mono text-sm">
                    {task.report_number}
                  </Badge>
                )}
                {task.id && !task.report_number && (
                  <Badge variant="outline" className="font-mono text-sm">
                    ID: {task.id}
                  </Badge>
                )}
            </div>
              <p className="text-muted-foreground">
                View and manage task details, status, and progress
              </p>
          </div>
        </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hold Information Banner */}
            {isOnHold && task.task?.hold_reason && (
              <Card className="p-5 bg-amber-50 border-amber-200 border-l-4">
                <div className="flex items-start gap-3">
                  <Pause className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900 mb-1">Task On Hold</h3>
                    <p className="text-sm text-amber-800 mb-2">{task.task.hold_reason}</p>
                    {task.task.estimated_resume_date && (
                      <p className="text-xs text-amber-700">
                        Estimated Resume: {formatDate(task.task.estimated_resume_date)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Task Overview Card */}
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge className={getStatusColor(task.status || '')}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {toLabel(task.status || '')}
                    </Badge>
                    {task.severity && (
                      <Badge variant="outline" className={getSeverityColor(task.severity)}>
                        {toLabel(task.severity)} Priority
                      </Badge>
                    )}
                    {task.task?.priority && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Priority: {task.task.priority}/10
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">{task.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{task.description}</p>
                </div>
              </div>

              {/* Category and Department */}
              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                {task.category && (
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Category:</span>
                    <span className="font-medium">{toLabel(task.category)}</span>
                    {task.sub_category && (
                      <span className="text-muted-foreground">• {toLabel(task.sub_category)}</span>
                    )}
                  </div>
                )}
                {task.department && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Department:</span>
                    <span className="font-medium">{task.department.name}</span>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Reported:</span>
                  <span className="font-medium">{formatDate(task.created_at)}</span>
                </div>
                {timeMetrics?.assignedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Assigned:</span>
                    <span className="font-medium">{getTimeAgo(timeMetrics.assignedAt.toISOString())}</span>
                  </div>
                )}
                {timeMetrics?.acknowledgedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Acknowledged:</span>
                    <span className="font-medium">{getTimeAgo(timeMetrics.acknowledgedAt.toISOString())}</span>
                  </div>
                )}
                {timeMetrics?.startedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Started:</span>
                    <span className="font-medium">{getTimeAgo(timeMetrics.startedAt.toISOString())}</span>
                  </div>
                )}
                {timeMetrics?.resolvedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-muted-foreground">Resolved:</span>
                    <span className="font-medium">{getTimeAgo(timeMetrics.resolvedAt.toISOString())}</span>
                  </div>
                )}
                {timeMetrics && timeMetrics.timeInCurrentStatus > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Time in Status:</span>
                    <span className="font-medium">{timeMetrics.timeInCurrentStatus} day{timeMetrics.timeInCurrentStatus !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Location Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                  Location Details
              </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(`${task.latitude}, ${task.longitude}`)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-4">
                {task.address && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Address</p>
                    <p className="font-medium">{task.address}</p>
                </div>
                )}
                {task.landmark && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Landmark</p>
                    <p className="font-medium">{task.landmark}</p>
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">GPS Coordinates</p>
                  <p className="font-mono text-sm">{task.latitude?.toFixed(6)}, {task.longitude?.toFixed(6)}</p>
                </div>
                  {(task.ward_number || task.district) && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Area</p>
                      <p className="font-medium">
                        {task.ward_number && `Ward ${task.ward_number}`}
                        {task.ward_number && task.district && ' • '}
                        {task.district}
                      </p>
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => {
                  window.open(`https://www.google.com/maps?q=${task.latitude},${task.longitude}`, '_blank');
                  }}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Open in Google Maps
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>

            {/* Task Notes */}
            {task.task?.notes && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Task Notes
                </h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap">{task.task.notes}</p>
                </div>
              </Card>
            )}

            {/* Media Gallery */}
            {task.media && task.media.length > 0 && (() => {
              // Separate media by source
              const citizenPhotos = task.media.filter((m: any) => 
                !m.upload_source || m.upload_source === 'citizen_submission'
              );
              const officerBeforePhotos = task.media.filter((m: any) => 
                m.upload_source === 'officer_before_photo'
              );
              const officerAfterPhotos = task.media.filter((m: any) => 
                m.upload_source === 'officer_after_photo'
              );

              const getMediaUrl = (url: string) => {
                if (!url) return '';
                if (url.startsWith('http')) return url;
                const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
                const baseUrl = API_BASE.replace('/api/v1', '');
                return `${baseUrl}${url}`;
              };

              const allMedia: MediaItem[] = task.media.map((m: any) => ({
                id: m.id,
                file_url: m.file_url || m.url,
                file_type: m.file_type,
                upload_source: m.upload_source,
                caption: m.caption,
                is_proof_of_work: m.is_proof_of_work,
                uploaded_at: m.uploaded_at || m.created_at
              }));

              const handleMediaClick = (index: number) => {
                setSelectedMediaIndex(index);
                setMediaViewerOpen(true);
              };

              return (
                <>
                  {/* Citizen Photos */}
                  {citizenPhotos.length > 0 && (
                    <Card className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                          Citizen Photos ({citizenPhotos.length})
                </h3>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Submitted by Citizen
                        </Badge>
                      </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {citizenPhotos.map((media: any, index: number) => {
                          const mediaIndex = task.media.findIndex((m: any) => m.id === media.id);
                          const mediaUrl = getMediaUrl(media.file_url || media.url);
                          
                          return (
                    <div
                      key={media.id}
                              className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity group border-2 border-blue-200"
                              onClick={() => handleMediaClick(mediaIndex)}
                              role="button"
                              tabIndex={0}
                              aria-label={`View citizen photo ${index + 1}`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  handleMediaClick(mediaIndex);
                                }
                              }}
                    >
                      <img
                                src={mediaUrl}
                                alt={`Citizen photo ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                              <div className="absolute top-2 left-2">
                                <Badge className="bg-blue-500 text-xs">Citizen</Badge>
                              </div>
                            </div>
                          );
                        })}
                </div>
              </Card>
            )}

                  {/* Officer Before Photos */}
                  {officerBeforePhotos.length > 0 && (
                    <Card className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <ImageIcon className="w-5 h-5" />
                          Officer - Before Photos ({officerBeforePhotos.length})
                        </h3>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          Before Work Started
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {officerBeforePhotos.map((media: any, index: number) => {
                          const mediaIndex = task.media.findIndex((m: any) => m.id === media.id);
                          const mediaUrl = getMediaUrl(media.file_url || media.url);
                          
                          return (
                            <div
                              key={media.id}
                              className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity group border-2 border-amber-200"
                              onClick={() => handleMediaClick(mediaIndex)}
                              role="button"
                              tabIndex={0}
                              aria-label={`View before photo ${index + 1}`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  handleMediaClick(mediaIndex);
                                }
                              }}
                            >
                              <img
                                src={mediaUrl}
                                alt={`Before photo ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <div className="absolute top-2 left-2">
                                <Badge className="bg-amber-500 text-xs">Before</Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}

                  {/* Officer After Photos */}
                  {officerAfterPhotos.length > 0 && (
                    <Card className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <ImageIcon className="w-5 h-5" />
                          Officer - After Photos ({officerAfterPhotos.length})
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            After Work Completed
                          </Badge>
                          {officerAfterPhotos.some((m: any) => m.is_proof_of_work) && (
                            <Badge className="bg-green-500 text-xs">
                              Proof of Work
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {officerAfterPhotos.map((media: any, index: number) => {
                          const mediaIndex = task.media.findIndex((m: any) => m.id === media.id);
                          const mediaUrl = getMediaUrl(media.file_url || media.url);
                          
                          return (
                            <div
                              key={media.id}
                              className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity group border-2 border-green-200"
                              onClick={() => handleMediaClick(mediaIndex)}
                              role="button"
                              tabIndex={0}
                              aria-label={`View after photo ${index + 1}`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  handleMediaClick(mediaIndex);
                                }
                              }}
                            >
                              <img
                                src={mediaUrl}
                                alt={`After photo ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <div className="absolute top-2 left-2 flex flex-col gap-1">
                                <Badge className="bg-green-500 text-xs">After</Badge>
                                {media.is_proof_of_work && (
                                  <Badge className="bg-green-600 text-xs">Proof</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}

                  {/* Media Viewer */}
                  <MediaViewer
                    media={allMedia}
                    initialIndex={selectedMediaIndex}
                    isOpen={mediaViewerOpen}
                    onClose={() => setMediaViewerOpen(false)}
                  />
                </>
              );
            })()}

            {/* Status History */}
            {history.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Status History
                </h3>
                <div className="space-y-4">
                  {history.map((item, index) => {
                    const ItemStatusIcon = getStatusIcon(item.new_status || '');
                    return (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-primary' : 'bg-muted'
                        }`}>
                            <ItemStatusIcon className={`w-4 h-4 ${
                            index === 0 ? 'text-primary-foreground' : 'text-muted-foreground'
                          }`} />
                        </div>
                        {index < history.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className={getStatusColor(item.new_status || '')}>
                              {toLabel(item.new_status || '')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(item.changed_at)}
                          </span>
                        </div>
                        {item.changed_by_user && (
                            <p className="text-sm text-muted-foreground mb-1">
                            by {item.changed_by_user.full_name}
                          </p>
                        )}
                        {item.notes && (
                            <p className="text-sm mt-1 bg-muted/50 rounded p-2">{item.notes}</p>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions Card */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Actions</h3>
              <div className="space-y-3">
                {canAcknowledge && (
                  <>
                    <Button 
                      className="w-full" 
                      onClick={handleAcknowledge}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      Acknowledge Task
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50" 
                      onClick={handleRejectAssignment}
                      disabled={actionLoading}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Assignment
                    </Button>
                  </>
                )}
                {canStartWork && (
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    onClick={handleStartWork}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    Start Work
                  </Button>
                )}
                {canComplete && (
                  <>
                    {canAddUpdate && (
                    <Button 
                      variant="outline"
                      className="w-full" 
                      onClick={handleAddUpdate}
                        disabled={actionLoading}
                    >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Add Progress Update
                    </Button>
                    )}
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      onClick={handleSubmitForVerification}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Submit for Verification
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full text-amber-600 hover:text-amber-700 hover:bg-amber-50" 
                      onClick={handlePutOnHold}
                      disabled={actionLoading}
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Put On Hold
                    </Button>
                  </>
                )}
                {isOnHold && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700" 
                    onClick={handleResumeWork}
                    disabled={actionLoading}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume Work
                  </Button>
                )}
                {!canAcknowledge && !canStartWork && !canComplete && !isOnHold && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">
                    No actions available for this task
                  </p>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/officer/tasks')}
                    >
                      View All Tasks
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Citizen Information */}
            {task.user && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Citizen Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Name</p>
                    <p className="font-medium">{task.user.full_name || 'Not provided'}</p>
                  </div>
                  {task.user.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Contact</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => window.open(`tel:${task.user.phone}`)}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        {task.user.phone}
                      </Button>
                    </div>
                  )}
                  {task.user.reputation_score !== undefined && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Reputation</p>
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span className="font-medium">{task.user.reputation_score || 0} points</span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Department Info */}
            {task.department && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Department
                </h3>
                <p className="font-medium">{task.department.name}</p>
              </Card>
            )}

            {/* Task Assignment Info */}
            {task.task && (
              <Card className="p-6 bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground mb-3">Assignment Details</h3>
                <div className="space-y-2 text-sm">
                  {task.task.assigned_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assigned:</span>
                      <span className="font-medium">{getTimeAgo(task.task.assigned_at)}</span>
          </div>
                  )}
                  {task.task.priority && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Priority:</span>
                      <span className="font-medium">{task.task.priority}/10</span>
                    </div>
                  )}
                  {task.task.officer && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assigned To:</span>
                      <span className="font-medium">{task.task.officer.full_name}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <RejectAssignmentModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        reportId={parseInt(id!)}
        reportNumber={task?.report_number}
        onSuccess={() => {
          setShowRejectModal(false);
          loadTaskDetails();
        }}
      />

      <PutOnHoldModal
        isOpen={showHoldModal}
        onClose={() => setShowHoldModal(false)}
        reportId={parseInt(id!)}
        reportNumber={task?.report_number}
        onSuccess={() => {
          setShowHoldModal(false);
          loadTaskDetails();
        }}
      />

      <ResumeWorkModal
        isOpen={showResumeModal}
        onClose={() => setShowResumeModal(false)}
        reportId={parseInt(id!)}
        reportNumber={task?.report_number}
        holdReason={task?.task?.hold_reason}
        onSuccess={() => {
          setShowResumeModal(false);
          loadTaskDetails();
        }}
      />

      {/* Add Update Dialog */}
      <Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Progress Update</DialogTitle>
            <DialogDescription>
              Add a progress update to this task. This will be visible in the status history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="update-text">Update Message</Label>
              <Textarea
                id="update-text"
                placeholder="Enter your progress update..."
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowUpdateModal(false);
              setUpdateText("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleSubmitUpdate} disabled={actionLoading || !updateText.trim()}>
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Submit Update
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskDetail;
