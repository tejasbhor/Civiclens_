import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, CheckCircle2, AlertCircle, User, FileText, MoreVertical, Loader2, XCircle, Phone, Mail, Building } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { reportsService } from "@/services/reportsService";
import { useToast } from "@/hooks/use-toast";

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

  const [report, setReport] = useState<ReportDetails | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/citizen/login');
    }
  }, [authLoading, user, navigate]);

  // Load report data
  useEffect(() => {
    if (user && reportId) {
      loadReportData();
    }
  }, [user, reportId]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch report details
      const reportData = await reportsService.getReportById(parseInt(reportId!));
      setReport(reportData);

      // Fetch status history
      try {
        const historyData = await reportsService.getReportStatusHistory(parseInt(reportId!));
        setStatusHistory(historyData.history || []);
      } catch (err) {
        console.warn('Status history not available:', err);
        // Continue without history
      }
    } catch (error: any) {
      console.error('Failed to load report:', error);
      setError(error.response?.data?.detail || 'Failed to load report details');
      toast({
        title: "Error",
        description: "Failed to load report details. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'resolved') return 'bg-green-500';
    if (s === 'closed') return 'bg-gray-500';
    if (s === 'rejected') return 'bg-red-500';
    if (['in_progress', 'acknowledged'].includes(s)) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  const getStatusIcon = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'resolved') return CheckCircle2;
    if (s === 'closed' || s === 'rejected') return XCircle;
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading report details...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold mb-2">Report Not Found</h3>
          <p className="text-muted-foreground mb-4">
            {error || 'The report you are looking for does not exist or you do not have permission to view it.'}
          </p>
          <Button onClick={() => navigate('/citizen/reports')}>
            Back to Reports
          </Button>
        </Card>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(report.status);
  const statusColor = getStatusColor(report.status);
  const currentStatus = statusHistory.length > 0 ? statusHistory[statusHistory.length - 1] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/citizen/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-foreground">{report.report_number}</h1>
              <Badge className={`${statusColor} mt-1`}>{toLabel(report.status)}</Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Status Card */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Current Status</h3>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full ${statusColor} flex items-center justify-center`}>
              <StatusIcon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xl font-semibold text-foreground">{toLabel(report.status)}</p>
              <p className="text-sm text-muted-foreground">
                Last Updated: {formatRelativeTime(report.updated_at)}
              </p>
            </div>
          </div>
        </Card>

        {/* Progress Timeline */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Progress Timeline</h3>
          
          {statusHistory.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No status history available yet</p>
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
                      <div className="absolute left-5 top-12 w-0.5 h-full -translate-x-1/2 bg-primary" />
                    )}
                    
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10
                      ${itemColor} text-white
                      ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                    >
                      <ItemIcon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-8">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className={`font-semibold ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
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
                        <p className="text-sm text-foreground">
                          Changed by: {item.changed_by_user.full_name || item.changed_by_user.email}
                        </p>
                      )}
                      {item.notes && (
                        <div className="mt-2 p-3 bg-muted rounded-lg">
                          <p className="text-sm text-foreground italic">{item.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Report Details */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Report Details</h3>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Title</Label>
              <p className="text-foreground font-medium">{report.title}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Description</Label>
              <p className="text-foreground whitespace-pre-wrap">{report.description}</p>
            </div>

            {report.category && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                <p className="text-foreground">{toLabel(report.category)}</p>
              </div>
            )}

            {report.severity && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Severity</Label>
                <Badge className={getStatusColor(report.severity)}>{toLabel(report.severity)}</Badge>
              </div>
            )}
            
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Location</Label>
              <div className="flex items-start gap-2 mt-1">
                <MapPin className="w-4 h-4 text-primary mt-1" />
                <div className="flex-1">
                  <p className="text-foreground">{report.address || `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}`}</p>
                  <Button 
                    variant="link" 
                    className="h-auto p-0 text-sm"
                    onClick={() => window.open(`https://www.google.com/maps?q=${report.latitude},${report.longitude}`, '_blank')}
                  >
                    View on Map
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Submitted</Label>
              <p className="text-foreground">{formatDate(report.created_at)}</p>
            </div>

            {report.media && report.media.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Submitted Photos ({report.media.length})</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {report.media.map((media: any, i: number) => {
                    // Construct full URL for media
                    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
                    const baseUrl = API_BASE.replace('/api/v1', '');
                    const mediaUrl = media.file_url || media.url;
                    const fullUrl = mediaUrl.startsWith('http') ? mediaUrl : `${baseUrl}${mediaUrl}`;
                    
                    return (
                      <div 
                        key={i} 
                        className="aspect-square bg-muted rounded-lg overflow-hidden relative group cursor-pointer"
                        onClick={() => window.open(fullUrl, '_blank')}
                      >
                        <img 
                          src={fullUrl}
                          alt={`Photo ${i + 1}`}
                          className="w-full h-full object-cover transition"
                          onError={(e) => {
                            // Fallback if image fails to load
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center pointer-events-none">
                          <span className="text-white opacity-0 group-hover:opacity-100 transition text-sm font-medium drop-shadow-lg">
                            Click to view
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Department/Officer Details */}
        {(report.department || report.task) && (
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {report.task ? 'Assigned Officer' : 'Assigned Department'}
            </h3>
            
            {report.task && report.task.officer ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {report.task.officer.full_name || report.task.officer.email}
                    </p>
                    {report.department && (
                      <p className="text-sm text-muted-foreground">{report.department.name}</p>
                    )}
                  </div>
                </div>
                {report.task.officer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{report.task.officer.phone}</span>
                  </div>
                )}
                {report.task.officer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{report.task.officer.email}</span>
                  </div>
                )}
              </div>
            ) : report.department ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Building className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{report.department.name}</p>
                  <p className="text-sm text-muted-foreground">Awaiting officer assignment</p>
                </div>
              </div>
            ) : null}
          </Card>
        )}
      </div>
    </div>
  );
};

const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <label className={`block ${className}`}>{children}</label>
);

export default TrackReport;
