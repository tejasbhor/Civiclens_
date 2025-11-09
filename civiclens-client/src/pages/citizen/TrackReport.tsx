import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, MapPin, Clock, CheckCircle2, AlertCircle, User, FileText, 
  Loader2, XCircle, Phone, Mail, Building, Image as ImageIcon, 
  Calendar, Tag, Activity, TrendingUp, Info, ExternalLink, ChevronRight
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { reportsService } from "@/services/reportsService";
import { useToast } from "@/hooks/use-toast";
import { MediaViewer, MediaItem } from "@/components/media/MediaViewer";
import { CitizenHeader } from "@/components/layout/CitizenHeader";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface ReportDetails {
  id: number;
  report_number: string;
  title: string;
  description: string;
  status: string;
  severity?: string;
  category?: string;
  latitude: number;
  longitude: number;
  address?: string;
  created_at: string;
  updated_at: string;
  user?: any;
  department?: any;
  task?: any;
  media?: any[];
}

interface StatusHistoryItem {
  old_status?: string;
  new_status: string;
  changed_by_user_id?: number;
  changed_by_user?: any;
  notes?: string;
  changed_at: string;
}

const TrackReport = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { isBackendReachable } = useConnectionStatus();

  const [report, setReport] = useState<ReportDetails | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/citizen/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Load report data
  useEffect(() => {
    if (user && reportId) {
      loadReportData();
    }
  }, [user, reportId]);

  const loadReportData = async () => {
    if (!reportId) return;

    try {
      setLoading(true);
      setError(null);
      logger.debug(`Loading report details for ID: ${reportId}`);

      // Fetch report details and status history in parallel
      const [reportData, historyData] = await Promise.allSettled([
        reportsService.getReportById(parseInt(reportId)),
        reportsService.getReportStatusHistory(parseInt(reportId)).catch(() => ({ history: [] }))
      ]);

      if (reportData.status === 'fulfilled') {
        setReport(reportData.value);
        logger.debug('Report data loaded:', reportData.value);
      } else {
        const errorMsg = reportData.reason?.response?.data?.detail || 'Failed to load report details';
        setError(errorMsg);
        logger.error('Failed to load report:', reportData.reason);
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive"
        });
      }

      if (historyData.status === 'fulfilled') {
        setStatusHistory(historyData.value.history || []);
      } else {
        logger.warn('Status history not available');
      }
    } catch (error: any) {
      logger.error('Failed to load report:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to load report details';
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'resolved' || s === 'closed') return 'bg-green-500';
    if (s === 'rejected') return 'bg-red-500';
    if (['in_progress', 'acknowledged'].includes(s)) return 'bg-blue-500';
    if (s === 'pending_verification') return 'bg-purple-500';
    return 'bg-amber-500';
  };

  const getStatusIcon = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'resolved' || s === 'closed') return CheckCircle2;
    if (s === 'rejected') return XCircle;
    if (['in_progress', 'acknowledged'].includes(s)) return Clock;
    return AlertCircle;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return formatDate(dateString);
  };

  const toLabel = (str: string) => {
    return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Organize media by source
  const mediaGroups = useMemo(() => {
    if (!report?.media || report.media.length === 0) {
      return {
        citizen: [],
        officerBefore: [],
        officerAfter: [],
        all: []
      };
    }

    const citizen = report.media.filter((m: any) => 
      !m.upload_source || m.upload_source === 'citizen_submission'
    );
    const officerBefore = report.media.filter((m: any) => 
      m.upload_source === 'officer_before_photo'
    );
    const officerAfter = report.media.filter((m: any) => 
      m.upload_source === 'officer_after_photo'
    );

    const allMedia: MediaItem[] = report.media.map((m: any) => ({
      id: m.id,
      file_url: m.file_url || m.url,
      file_type: m.file_type,
      upload_source: m.upload_source,
      caption: m.caption,
      is_proof_of_work: m.is_proof_of_work,
      uploaded_at: m.uploaded_at || m.created_at
    }));

    return { citizen, officerBefore, officerAfter, all: allMedia };
  }, [report?.media]);

  const getMediaUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const baseUrl = API_BASE.replace('/api/v1', '');
    return `${baseUrl}${url}`;
  };

  const handleMediaClick = (index: number) => {
    setSelectedMediaIndex(index);
    setMediaViewerOpen(true);
  };

  const getMediaIndex = (mediaId: number) => {
    return report?.media?.findIndex((m: any) => m.id === mediaId) ?? 0;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading report details...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <CitizenHeader />
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h3 className="text-xl font-semibold mb-2">Report Not Found</h3>
            <p className="text-muted-foreground mb-6">
            {error || 'The report you are looking for does not exist or you do not have permission to view it.'}
          </p>
            <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate('/citizen/reports')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reports
          </Button>
              <Button variant="outline" onClick={loadReportData}>
                Try Again
              </Button>
            </div>
        </Card>
        </div>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(report.status);
  const statusColor = getStatusColor(report.status);
  const totalMediaCount = mediaGroups.all.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <CitizenHeader />

      {/* Connection Status Banner */}
      {!isBackendReachable && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="container mx-auto flex items-center gap-2 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4" />
            <span>You're currently offline. Some features may be limited.</span>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/citizen/reports')}
              aria-label="Back to Reports"
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            {report.report_number && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">Report ID:</span>
                <span className="font-mono font-semibold text-foreground text-lg">#{report.report_number}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${statusColor} flex items-center justify-center`}>
                <StatusIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-semibold text-foreground">{toLabel(report.status)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="font-semibold text-foreground">{formatRelativeTime(report.created_at)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            <div>
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="font-semibold text-foreground">{formatRelativeTime(report.updated_at)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Media</p>
                <p className="font-semibold text-foreground">{totalMediaCount} file{totalMediaCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
          </Card>
        </div>

        {/* Main Content with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="media">Media ({totalMediaCount})</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Report Title & Description */}
                <Card className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-bold text-foreground mb-2">{report.title}</h2>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold text-foreground">Description</h3>
                      </div>
                      <p className="text-foreground whitespace-pre-wrap leading-relaxed">{report.description}</p>
                    </div>
                  </div>
                </Card>

                {/* Location */}
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Location</h3>
                  </div>
                  <div className="space-y-3">
                    <p className="text-foreground font-medium">{report.address || 'Location not specified'}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Coordinates: {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`https://www.google.com/maps?q=${report.latitude},${report.longitude}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on Google Maps
                    </Button>
                  </div>
                </Card>

                {/* Media Preview */}
                {totalMediaCount > 0 && (
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold text-foreground">Media Preview</h3>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setActiveTab('media')}
                      >
                        View All ({totalMediaCount})
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {mediaGroups.all.slice(0, 4).map((media: any, index: number) => {
                        const mediaIndex = getMediaIndex(media.id);
                        const fullUrl = getMediaUrl(media.file_url || media.url);
                        return (
                          <div
                            key={media.id || index}
                            className="aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition border-2 border-border"
                            onClick={() => handleMediaClick(mediaIndex)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                handleMediaClick(mediaIndex);
                              }
                            }}
                          >
                            <img
                              src={fullUrl}
                              alt={`Media ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3C/svg%3E';
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    {totalMediaCount > 4 && (
                      <Button 
                        variant="outline" 
                        className="w-full mt-3"
                        onClick={() => setActiveTab('media')}
                      >
                        View All {totalMediaCount} Media Files
                      </Button>
                    )}
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
        {/* Status Card */}
                <Card className="p-6 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border-primary/20">
                  <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-full ${statusColor} flex items-center justify-center`}>
              <StatusIcon className="w-6 h-6 text-white" />
            </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Status</p>
                      <p className="text-lg font-semibold text-foreground">{toLabel(report.status)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Updated {formatRelativeTime(report.updated_at)}
              </p>
                </Card>

                {/* Report Info */}
                <Card className="p-6">
                  <h4 className="font-semibold text-foreground mb-4">Report Information</h4>
                  <div className="space-y-0 text-sm">
                    {report.category && (
                      <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                          <Tag className="w-4 h-4 shrink-0" />
                          Category
                        </span>
                        <span className="font-medium text-foreground text-sm text-right">{toLabel(report.category)}</span>
                      </div>
                    )}
                    {report.severity && (
                      <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          Severity
                        </span>
                        <Badge className={getStatusColor(report.severity)}>{toLabel(report.severity)}</Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                        <Calendar className="w-4 h-4 shrink-0" />
                        Created
                      </span>
                      <span className="font-medium text-foreground text-sm text-right">{formatDate(report.created_at)}</span>
            </div>
          </div>
        </Card>

                {/* Assigned Officer/Department */}
                {(report.department || report.task) && (
                  <Card className="p-6">
                    <h4 className="font-semibold text-foreground mb-4">
                      {report.task ? 'Assigned Officer' : 'Assigned Department'}
                    </h4>
                    {report.task?.officer ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {report.task.officer.full_name || report.task.officer.email || 'Assigned Officer'}
                            </p>
                            {report.department && (
                              <p className="text-xs text-muted-foreground truncate">{report.department.name}</p>
                            )}
                          </div>
                        </div>
                        {report.task.officer.phone && (
                          <div className="flex items-center gap-2 text-sm py-1">
                            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-foreground">{report.task.officer.phone}</span>
                          </div>
                        )}
                        {report.task.officer.email && (
                          <div className="flex items-center gap-2 text-sm py-1">
                            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-foreground truncate">{report.task.officer.email}</span>
                          </div>
                        )}
                      </div>
                    ) : report.department ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                          <Building className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground">{report.department.name}</p>
                          <p className="text-xs text-muted-foreground">Awaiting officer assignment</p>
                        </div>
                      </div>
                    ) : null}
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Status History</h3>
              </div>
          
          {statusHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="w-16 h-16 mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground text-base mb-2">No status history available yet</p>
                  <p className="text-sm text-muted-foreground max-w-md">Status updates will appear here as your report progresses through the resolution process.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {statusHistory.map((item, idx) => {
                const ItemIcon = getStatusIcon(item.new_status);
                const itemColor = getStatusColor(item.new_status);
                const isCurrent = idx === statusHistory.length - 1;
                
                return (
                  <div key={idx} className="flex gap-4 relative">
                    {/* Connecting Line */}
                    {idx < statusHistory.length - 1 && (
                          <div className="absolute left-5 top-12 w-0.5 h-full bg-border" />
                    )}
                    
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10
                      ${itemColor} text-white
                          ${isCurrent ? 'ring-4 ring-primary/20 shadow-lg' : ''}`}
                    >
                      <ItemIcon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                        <div className="flex-1 pb-6">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className={`font-semibold ${isCurrent ? 'text-primary text-lg' : 'text-foreground'}`}>
                          {toLabel(item.new_status)}
                        </h4>
                        {isCurrent && (
                          <Badge variant="outline" className="border-primary text-primary">Current</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {formatDate(item.changed_at)}
                      </p>
                      {item.changed_by_user && (
                            <p className="text-sm text-muted-foreground mb-2">
                              Updated by: <span className="font-medium text-foreground">{item.changed_by_user.full_name || item.changed_by_user.email || 'System'}</span>
                        </p>
                      )}
                      {item.notes && (
                            <div className="mt-3 p-3 bg-muted rounded-lg border-l-4 border-primary">
                              <p className="text-sm text-foreground">{item.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-8">
            {totalMediaCount === 0 ? (
              <Card className="p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <ImageIcon className="w-16 h-16 mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground text-base">No media files attached to this report</p>
                </div>
              </Card>
            ) : (
              <>
                {/* Citizen Photos */}
                {mediaGroups.citizen.length > 0 && (
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
            <div>
                        <h3 className="text-lg font-semibold text-foreground">From Your Report</h3>
                        <p className="text-sm text-muted-foreground">{mediaGroups.citizen.length} photo{mediaGroups.citizen.length !== 1 ? 's' : ''} submitted with this report</p>
                      </div>
            </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {mediaGroups.citizen.map((media: any, i: number) => {
                        const mediaIndex = getMediaIndex(media.id);
                        const fullUrl = getMediaUrl(media.file_url || media.url);
                        const isFeatured = i === 0 && mediaGroups.citizen.length > 1;
                        
                        return (
                          <div
                            key={media.id || i}
                            className={cn(
                              "bg-muted rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-all hover:scale-[1.02] border-2 border-blue-200 relative group shadow-sm hover:shadow-md",
                              isFeatured ? "md:col-span-2 md:row-span-2" : "aspect-square"
                            )}
                            onClick={() => handleMediaClick(mediaIndex)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                handleMediaClick(mediaIndex);
                              }
                            }}
                          >
                            <div className={cn(
                              "w-full h-full bg-muted relative",
                              isFeatured ? "aspect-[4/3]" : "aspect-square"
                            )}>
                              <img
                                src={fullUrl}
                                alt={`Your photo ${i + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3C/svg%3E';
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="absolute top-2 left-2">
                                <Badge className="bg-blue-500/90 backdrop-blur-sm text-xs">From Your Report</Badge>
            </div>
                              {isFeatured && (
                                <div className="absolute bottom-2 left-2 right-2">
                                  <Badge variant="outline" className="bg-white/90 backdrop-blur-sm text-blue-700 border-blue-300">
                                    Featured
                                  </Badge>
              </div>
            )}
                            </div>
                          </div>
                        );
                      })}
              </div>
                  </Card>
            )}
            
                {/* Officer Before Photos */}
                {mediaGroups.officerBefore.length > 0 && (
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
            <div>
                        <h3 className="text-lg font-semibold text-foreground">Before Work Started</h3>
                        <p className="text-sm text-muted-foreground">{mediaGroups.officerBefore.length} photo{mediaGroups.officerBefore.length !== 1 ? 's' : ''} taken by officer before starting work</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {mediaGroups.officerBefore.map((media: any, i: number) => {
                        const mediaIndex = getMediaIndex(media.id);
                        const fullUrl = getMediaUrl(media.file_url || media.url);
                        const isFeatured = i === 0 && mediaGroups.officerBefore.length > 1;
                        
                        return (
                          <div
                            key={media.id || i}
                            className={cn(
                              "bg-muted rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-all hover:scale-[1.02] border-2 border-amber-200 relative group shadow-sm hover:shadow-md",
                              isFeatured ? "md:col-span-2 md:row-span-2" : "aspect-square"
                            )}
                            onClick={() => handleMediaClick(mediaIndex)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                handleMediaClick(mediaIndex);
                              }
                            }}
                          >
                            <div className={cn(
                              "w-full h-full bg-muted relative",
                              isFeatured ? "aspect-[4/3]" : "aspect-square"
                            )}>
                              <img
                                src={fullUrl}
                                alt={`Before photo ${i + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3C/svg%3E';
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="absolute top-2 left-2">
                                <Badge className="bg-amber-500/90 backdrop-blur-sm text-xs">Before Work</Badge>
                              </div>
                              {isFeatured && (
                                <div className="absolute bottom-2 left-2 right-2">
                                  <Badge variant="outline" className="bg-white/90 backdrop-blur-sm text-amber-700 border-amber-300">
                                    Featured
                                  </Badge>
                                </div>
                              )}
                </div>
              </div>
                        );
                      })}
            </div>
                  </Card>
                )}

                {/* Officer After Photos */}
                {mediaGroups.officerAfter.length > 0 && (
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
            <div>
                        <h3 className="text-lg font-semibold text-foreground">After Work Completed</h3>
                        <p className="text-sm text-muted-foreground">{mediaGroups.officerAfter.length} photo{mediaGroups.officerAfter.length !== 1 ? 's' : ''} showing completed work</p>
                      </div>
            </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {mediaGroups.officerAfter.map((media: any, i: number) => {
                        const mediaIndex = getMediaIndex(media.id);
                        const fullUrl = getMediaUrl(media.file_url || media.url);
                        const isFeatured = i === 0 && mediaGroups.officerAfter.length > 1;
                    
                    return (
                      <div 
                            key={media.id || i}
                            className={cn(
                              "bg-muted rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-all hover:scale-[1.02] border-2 border-green-200 relative group shadow-sm hover:shadow-md",
                              isFeatured ? "md:col-span-2 md:row-span-2" : "aspect-square"
                            )}
                            onClick={() => handleMediaClick(mediaIndex)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                handleMediaClick(mediaIndex);
                              }
                            }}
                          >
                            <div className={cn(
                              "w-full h-full bg-muted relative",
                              isFeatured ? "aspect-[4/3]" : "aspect-square"
                            )}>
                        <img 
                          src={fullUrl}
                                alt={`After photo ${i + 1}`}
                                className="w-full h-full object-cover"
                          onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3C/svg%3E';
                          }}
                        />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="absolute top-2 left-2 flex flex-col gap-1">
                                <Badge className="bg-green-500/90 backdrop-blur-sm text-xs">After Work</Badge>
                                {media.is_proof_of_work && (
                                  <Badge className="bg-green-600/90 backdrop-blur-sm text-xs">Proof</Badge>
                                )}
                              </div>
                              {isFeatured && (
                                <div className="absolute bottom-2 left-2 right-2">
                                  <Badge variant="outline" className="bg-white/90 backdrop-blur-sm text-green-700 border-green-300">
                                    Featured
                                  </Badge>
                                </div>
                              )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Report Information</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Report Number</p>
                    <p className="text-foreground font-mono">{report.report_number || `#${report.id}`}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Title</p>
                    <p className="text-foreground">{report.title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                    <p className="text-foreground whitespace-pre-wrap">{report.description}</p>
                  </div>
                  {report.category && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Category</p>
                      <Badge variant="outline">{toLabel(report.category)}</Badge>
                    </div>
                  )}
                  {report.severity && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Severity</p>
                      <Badge className={getStatusColor(report.severity)}>{toLabel(report.severity)}</Badge>
                    </div>
            )}
          </div>
        </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Location Details</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Address</p>
                    <p className="text-foreground">{report.address || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Coordinates</p>
                    <p className="text-foreground font-mono text-sm">
                      {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(`https://www.google.com/maps?q=${report.latitude},${report.longitude}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on Google Maps
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Timeline</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Created</p>
                    <p className="text-foreground">{formatDate(report.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Last Updated</p>
                    <p className="text-foreground">{formatDate(report.updated_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                    <Badge className={statusColor}>{toLabel(report.status)}</Badge>
              </div>
                </div>
              </Card>

              {(report.department || report.task) && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Assignment</h3>
                  <div className="space-y-4">
                    {report.department && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Department</p>
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-muted-foreground" />
                          <p className="text-foreground">{report.department.name}</p>
                        </div>
                      </div>
                    )}
                    {report.task?.officer && (
                <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Assigned Officer</p>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <p className="text-foreground">
                            {report.task.officer.full_name || report.task.officer.email || 'Officer'}
                          </p>
                </div>
              </div>
                    )}
                  </div>
          </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Media Viewer */}
        {mediaGroups.all.length > 0 && (
          <MediaViewer
            media={mediaGroups.all}
            initialIndex={selectedMediaIndex}
            isOpen={mediaViewerOpen}
            onClose={() => setMediaViewerOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default TrackReport;
