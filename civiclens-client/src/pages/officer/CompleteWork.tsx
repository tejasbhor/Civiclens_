import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, Camera, Upload, CheckCircle2, ArrowLeftRight, Loader2, 
  X, AlertCircle, FileText, Clock, AlertTriangle, Image as ImageIcon,
  Trash2, Info, CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { officerService } from "@/services/officerService";
import { OfficerHeader } from "@/components/layout/OfficerHeader";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { logger } from "@/lib/logger";
import apiClient from "@/services/apiClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PhotoPreview {
  file: File;
  preview: string;
  id: string;
}

const CompleteWork = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { isBackendReachable } = useConnectionStatus();
  
  const [task, setTask] = useState<any>(null);
  const [beforePhotos, setBeforePhotos] = useState<any[]>([]);
  const [citizenPhotos, setCitizenPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [completionNotes, setCompletionNotes] = useState("");
  const [workDuration, setWorkDuration] = useState("");
  const [materialsUsed, setMaterialsUsed] = useState("");
  const [afterPhotos, setAfterPhotos] = useState<PhotoPreview[]>([]);
  const [checklist, setChecklist] = useState({
    resolved: false,
    cleaned: false,
    photos: false,
    materials: false
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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

  const loadTaskAndPhotos = useCallback(async () => {
    if (!id || !user) return;

    try {
      setLoading(true);
      setError(null);
      logger.debug(`Loading task details for report ID: ${id}`);

      // Load task details and media in parallel
      const [taskData, mediaData] = await Promise.allSettled([
        officerService.getTaskDetails(parseInt(id)),
        apiClient.get(`/media/report/${id}`)
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

      // Handle media data
      if (mediaData.status === 'fulfilled') {
        const mediaList = Array.isArray(mediaData.value.data) 
          ? mediaData.value.data 
          : Array.isArray(mediaData.value) 
          ? mediaData.value 
          : [];
        
        const before = mediaList.filter((m: any) => m.upload_source === 'officer_before_photo');
        const citizen = mediaList.filter((m: any) => 
          !m.upload_source || m.upload_source === 'citizen_submission'
      );
        
      setBeforePhotos(before);
        setCitizenPhotos(citizen);
        logger.debug(`Loaded ${before.length} before photos, ${citizen.length} citizen photos`);
      } else {
        logger.warn('Failed to load media:', mediaData.reason);
        // Continue without media
      }
    } catch (err: any) {
      logger.error('Failed to load task:', err);
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [id, user, extractErrorMessage, toast]);

  useEffect(() => {
    if (id && user && !authLoading) {
      loadTaskAndPhotos();
    }
  }, [id, user, authLoading, loadTaskAndPhotos]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/officer/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const getMediaUrl = useCallback((url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const baseUrl = API_BASE.replace('/api/v1', '');
    return `${baseUrl}${url}`;
  }, []);

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(f => !validTypes.includes(f.type));
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid File Type",
        description: "Please upload only JPEG, PNG, or WebP images.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file sizes (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter(f => f.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      toast({
        title: "File Too Large",
        description: "Each photo must be less than 10MB. Please compress or resize your images.",
        variant: "destructive"
      });
      return;
    }

    const totalOfficerPhotos = beforePhotos.length + afterPhotos.length + files.length;
    
    // Backend limit is 5 officer photos (before + after combined)
    if (totalOfficerPhotos > 5) {
      const remaining = 5 - beforePhotos.length - afterPhotos.length;
      toast({
        title: "Photo Limit Reached",
        description: `Maximum 5 officer photos allowed (before + after combined). You can add ${remaining} more after photo${remaining !== 1 ? 's' : ''}.`,
        variant: "destructive"
      });
      return;
    }
    
    // Create preview objects
    const newPhotos: PhotoPreview[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${Date.now()}-${Math.random()}`
    }));
    
    setAfterPhotos(prev => [...prev, ...newPhotos]);
    setChecklist(prev => ({ ...prev, photos: true }));
    setValidationErrors(prev => ({ ...prev, photos: '' }));
  }, [beforePhotos.length, afterPhotos.length, toast]);

  const removePhoto = useCallback((photoId: string) => {
    setAfterPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter(p => p.id !== photoId);
    });
    
    if (afterPhotos.length === 1) {
      setChecklist(prev => ({ ...prev, photos: false }));
    }
  }, [afterPhotos.length]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      afterPhotos.forEach(photo => {
        URL.revokeObjectURL(photo.preview);
      });
    };
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (afterPhotos.length === 0) {
      errors.photos = 'At least one after photo is required';
    }

    if (!completionNotes.trim()) {
      errors.completionNotes = 'Work completion notes are required';
    } else if (completionNotes.trim().length < 10) {
      errors.completionNotes = 'Completion notes must be at least 10 characters';
    }

    if (!workDuration.trim()) {
      errors.workDuration = 'Work duration is required';
    } else {
      const duration = parseFloat(workDuration);
      if (isNaN(duration) || duration <= 0) {
        errors.workDuration = 'Please enter a valid work duration (hours)';
      } else if (duration > 1000) {
        errors.workDuration = 'Work duration seems unrealistic. Please verify.';
      }
    }

    if (!checklist.resolved) {
      errors.checklist = 'Please confirm that the issue is completely resolved';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [afterPhotos.length, completionNotes, workDuration, checklist.resolved]);

  const handleCompleteClick = useCallback(() => {
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(validationErrors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setShowConfirmDialog(true);
  }, [validateForm, validationErrors]);

  const handleComplete = async () => {
    setShowConfirmDialog(false);
    setSubmitting(true);
    setError(null);

    try {
      logger.debug(`Submitting work for verification, report ID: ${id}`);

      // 1. Upload after photos
      const uploadPromises = afterPhotos.map(async (photoPreview) => {
        const formData = new FormData();
        formData.append('file', photoPreview.file);
        formData.append('upload_source', 'officer_after_photo');
        formData.append('is_proof_of_work', 'true');
        formData.append('caption', 'After completing work');

        return apiClient.post(`/media/upload/${id}`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
          },
        });
      });

      // Use allSettled to allow partial success
      const results = await Promise.allSettled(uploadPromises);
      
      // Count successful uploads
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failedCount = results.filter(r => r.status === 'rejected').length;
      
      // If all failed, throw error
      if (successCount === 0 && failedCount > 0) {
        const firstError = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
        throw firstError.reason;
      }
      
      // Log partial failures but continue
      if (failedCount > 0) {
        logger.warn(`${failedCount} photo(s) failed to upload, but ${successCount} succeeded`);
        toast({
          title: "Partial Upload Success",
          description: `${successCount} photo(s) uploaded successfully. ${failedCount} photo(s) failed to upload.`,
          variant: "default"
        });
      }

      // 2. Submit for verification
      const submitFormData = new FormData();
      const notes = `${completionNotes.trim()}\n\nWork Duration: ${workDuration} hours\nMaterials Used: ${materialsUsed.trim() || 'N/A'}`;
      submitFormData.append('resolution_notes', notes);

      await apiClient.post(`/reports/${id}/submit-for-verification`, submitFormData, {
          headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      logger.debug('Work submitted successfully');

      toast({
        title: "Work Completed Successfully",
        description: successCount > 0 
          ? `Successfully uploaded ${successCount} after photo(s) and submitted for verification.`
          : "Submitted for verification.",
      });

      // Navigate back to task detail page
      navigate(`/officer/task/${id}`);
    } catch (error: any) {
      logger.error('Failed to complete work:', error);
      const errorMsg = extractErrorMessage(error);
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate remaining photo slots
  const remainingPhotoSlots = useMemo(() => {
    return Math.max(0, 5 - beforePhotos.length - afterPhotos.length);
  }, [beforePhotos.length, afterPhotos.length]);

  if (loading && !task) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading task details...</p>
        </div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <OfficerHeader />
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h3 className="text-xl font-semibold mb-2">Failed to Load Task</h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={loadTaskAndPhotos}>
                <Loader2 className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate('/officer/tasks')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tasks
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <OfficerHeader />

      {/* Connection Status Banner */}
      {!isBackendReachable && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="container mx-auto flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4" />
            <span>You're currently offline. Some features may be limited.</span>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(`/officer/task/${id}`)}
              aria-label="Back to Task Details"
            >
            <ArrowLeft className="w-5 h-5" />
          </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">Submit Work for Verification</h1>
                {task.report_number && (
                  <Badge variant="outline" className="font-mono text-sm">
                    {task.report_number}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                Complete the form below to submit your work for admin verification
              </p>
            </div>
          </div>
        </div>

        {/* Task Summary Card */}
        <Card className="p-6 mb-6 bg-gradient-to-br from-secondary/20 via-secondary/10 to-accent/10 border-secondary/30">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-foreground mb-2">{task.title}</h2>
              <p className="text-muted-foreground text-sm line-clamp-2">{task.description}</p>
              {task.address && (
                <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4" />
                  <span className="truncate">{task.address}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Error Banner */}
        {error && (
          <Card className="p-4 mb-6 bg-destructive/10 border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-destructive mb-1">Error</h3>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </div>
          </Card>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleCompleteClick(); }}>
          <div className="space-y-6">
            {/* Citizen Photos Reference */}
            {citizenPhotos.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-foreground">Citizen Submitted Photos</h3>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Reference
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Review the original photos submitted by the citizen to ensure your work addresses the issue.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {citizenPhotos.slice(0, 3).map((photo: any, index: number) => {
                    const mediaUrl = getMediaUrl(photo.file_url || photo.url);
                    return (
                      <div
                        key={photo.id || index}
                        className="aspect-square rounded-lg overflow-hidden bg-muted border-2 border-blue-200"
                      >
                        <img
                          src={mediaUrl}
                          alt={`Citizen photo ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                {citizenPhotos.length > 3 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    + {citizenPhotos.length - 3} more photo{citizenPhotos.length - 3 !== 1 ? 's' : ''}
                  </p>
                )}
              </Card>
            )}

            {/* Before Photos Reference */}
            {beforePhotos.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-semibold text-foreground">Your Before Photos</h3>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {beforePhotos.length} photo{beforePhotos.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Photos taken before starting work. Compare with your after photos below.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {beforePhotos.map((photo: any, index: number) => {
                    const mediaUrl = getMediaUrl(photo.file_url || photo.url);
                    return (
                      <div
                        key={photo.id || index}
                        className="aspect-square rounded-lg overflow-hidden bg-muted border-2 border-amber-200"
                      >
                        <img
                          src={mediaUrl}
                          alt={`Before photo ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* After Photos Section */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-semibold">After Photos *</Label>
                  {validationErrors.photos && (
                    <Badge variant="destructive" className="text-xs">
                      {validationErrors.photos}
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {afterPhotos.length + beforePhotos.length}/5 officer photos
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Upload photos showing the completed work. {remainingPhotoSlots > 0 
                  ? `You can add ${remainingPhotoSlots} more photo${remainingPhotoSlots !== 1 ? 's' : ''}.`
                  : 'Photo limit reached.'}
              </p>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="flex-1" 
                    asChild
                    disabled={remainingPhotoSlots === 0}
                  >
                    <label className="cursor-pointer">
                      <Camera className="w-4 h-4 mr-2" />
                      Take Photo
                      <input 
                        type="file" 
                        accept="image/jpeg,image/jpg,image/png,image/webp" 
                        capture="environment" 
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={remainingPhotoSlots === 0}
                      />
                    </label>
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    className="flex-1" 
                    asChild
                    disabled={remainingPhotoSlots === 0}
                  >
                    <label className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload from Device
                      <input 
                        type="file" 
                        accept="image/jpeg,image/jpg,image/png,image/webp" 
                        multiple 
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={remainingPhotoSlots === 0}
                      />
                    </label>
                  </Button>
                </div>

                {afterPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {afterPhotos.map((photoPreview) => (
                      <div 
                        key={photoPreview.id} 
                        className="relative aspect-square rounded-lg overflow-hidden bg-muted border-2 border-green-200 group"
                      >
                        <img 
                          src={photoPreview.preview} 
                          alt="After work" 
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(photoPreview.id)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-destructive/90"
                          aria-label="Remove photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2 left-2">
                          <Badge className="bg-green-500 text-xs">After</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {afterPhotos.length === 0 && (
                  <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
                    <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      No after photos uploaded yet. Please add at least one photo.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Before/After Comparison */}
            {afterPhotos.length > 0 && beforePhotos.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5" />
                  Before/After Comparison
                </h3>
                <div className="space-y-4">
                  {beforePhotos.slice(0, Math.min(beforePhotos.length, afterPhotos.length)).map((beforePhoto, idx) => (
                    <div key={idx} className="grid grid-cols-2 gap-4">
                        <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-amber-500 text-xs">Before</Badge>
                          <span className="text-xs text-muted-foreground">Photo {idx + 1}</span>
                        </div>
                        <div className="aspect-video rounded-lg overflow-hidden bg-muted border-2 border-amber-200">
                            <img 
                            src={getMediaUrl(beforePhoto.file_url || beforePhoto.url)} 
                              alt={`Before ${idx + 1}`} 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        </div>
                        <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-green-500 text-xs">After</Badge>
                          <span className="text-xs text-muted-foreground">Photo {idx + 1}</span>
                        </div>
                        <div className="aspect-video rounded-lg overflow-hidden bg-muted border-2 border-green-200">
                            <img 
                            src={afterPhotos[idx]?.preview || ''} 
                              alt={`After ${idx + 1}`} 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        </div>
                      </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Completion Notes */}
            <Card className="p-6">
              <div className="mb-2">
                <Label htmlFor="completionNotes" className="text-base font-semibold">
                  Work Completion Notes *
                </Label>
                {validationErrors.completionNotes && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {validationErrors.completionNotes}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Provide a detailed description of the work completed, steps taken, and current status.
              </p>
              <Textarea
                id="completionNotes"
                placeholder="Example: Water logging cleared completely. Installed new drainage grill. Area cleaned and restored to normal condition. All debris removed..."
                value={completionNotes}
                onChange={(e) => {
                  setCompletionNotes(e.target.value);
                  setValidationErrors(prev => ({ ...prev, completionNotes: '' }));
                }}
                className={`min-h-[120px] ${validationErrors.completionNotes ? 'border-destructive' : ''}`}
                aria-invalid={!!validationErrors.completionNotes}
                aria-describedby={validationErrors.completionNotes ? 'completionNotes-error' : undefined}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {completionNotes.length}/500 characters (minimum 10 characters required)
              </p>
            </Card>

            {/* Work Duration */}
            <Card className="p-6">
              <div className="mb-2">
                <Label htmlFor="workDuration" className="text-base font-semibold">
                  Actual Work Duration *
                </Label>
                {validationErrors.workDuration && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {validationErrors.workDuration}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Enter the total time spent on this task in hours (e.g., 2.5 for 2 hours 30 minutes).
              </p>
              <div className="flex items-center gap-3">
              <Input
                id="workDuration"
                type="number"
                step="0.5"
                  min="0.5"
                  max="1000"
                placeholder="2.5"
                value={workDuration}
                  onChange={(e) => {
                    setWorkDuration(e.target.value);
                    setValidationErrors(prev => ({ ...prev, workDuration: '' }));
                  }}
                  className={`max-w-[200px] ${validationErrors.workDuration ? 'border-destructive' : ''}`}
                  aria-invalid={!!validationErrors.workDuration}
                  aria-describedby={validationErrors.workDuration ? 'workDuration-error' : undefined}
                />
                <span className="text-sm text-muted-foreground">hours</span>
            </div>
            </Card>

            {/* Materials Used */}
            <Card className="p-6">
              <Label htmlFor="materialsUsed" className="text-base font-semibold mb-2 block">
                Materials Used (Optional)
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                List any materials, tools, or resources used to complete this work.
              </p>
              <Input
                id="materialsUsed"
                placeholder="e.g., Gravel, cement, drainage grill, cleaning supplies..."
                value={materialsUsed}
                onChange={(e) => setMaterialsUsed(e.target.value)}
                className="max-w-full"
              />
            </Card>

            {/* Checklist */}
            <Card className="p-6">
              <div className="mb-2">
                <Label className="text-base font-semibold">Completion Checklist *</Label>
                {validationErrors.checklist && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {validationErrors.checklist}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Please confirm all items before submitting for verification.
              </p>
              <div className="space-y-4">
                <div className={`flex items-start space-x-3 p-3 rounded-lg border ${checklist.resolved ? 'bg-green-50 border-green-200' : 'bg-muted/50 border-border'}`}>
                  <Checkbox 
                    id="resolved"
                    checked={checklist.resolved}
                    onCheckedChange={(checked) => {
                      setChecklist(prev => ({ ...prev, resolved: checked as boolean }));
                      setValidationErrors(prev => ({ ...prev, checklist: '' }));
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                  <label
                    htmlFor="resolved"
                      className="text-sm font-medium leading-tight cursor-pointer"
                  >
                    Issue completely resolved
                  </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      The reported issue has been fully addressed and resolved.
                    </p>
                  </div>
                  {checklist.resolved && (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  )}
                </div>

                <div className={`flex items-start space-x-3 p-3 rounded-lg border ${checklist.cleaned ? 'bg-green-50 border-green-200' : 'bg-muted/50 border-border'}`}>
                  <Checkbox 
                    id="cleaned"
                    checked={checklist.cleaned}
                    onCheckedChange={(checked) => 
                      setChecklist(prev => ({ ...prev, cleaned: checked as boolean }))
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                  <label
                    htmlFor="cleaned"
                      className="text-sm font-medium leading-tight cursor-pointer"
                  >
                      Area cleaned and restored
                  </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      The work area has been cleaned and restored to its original or better condition.
                    </p>
                  </div>
                  {checklist.cleaned && (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  )}
                </div>

                <div className={`flex items-start space-x-3 p-3 rounded-lg border ${checklist.photos ? 'bg-green-50 border-green-200' : 'bg-muted/50 border-border'}`}>
                  <Checkbox 
                    id="photos"
                    checked={checklist.photos}
                    onCheckedChange={(checked) => 
                      setChecklist(prev => ({ ...prev, photos: checked as boolean }))
                    }
                    className="mt-0.5"
                    disabled={afterPhotos.length > 0}
                  />
                  <div className="flex-1">
                  <label
                    htmlFor="photos"
                      className={`text-sm font-medium leading-tight ${afterPhotos.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                  >
                    Before/After photos uploaded
                  </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {afterPhotos.length > 0 
                        ? `${afterPhotos.length} after photo${afterPhotos.length !== 1 ? 's' : ''} uploaded.`
                        : 'Upload at least one after photo to complete this task.'}
                    </p>
                  </div>
                  {checklist.photos && (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  )}
                </div>

                <div className={`flex items-start space-x-3 p-3 rounded-lg border ${checklist.materials ? 'bg-green-50 border-green-200' : 'bg-muted/50 border-border'}`}>
                  <Checkbox 
                    id="materials"
                    checked={checklist.materials}
                    onCheckedChange={(checked) => 
                      setChecklist(prev => ({ ...prev, materials: checked as boolean }))
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                  <label
                    htmlFor="materials"
                      className="text-sm font-medium leading-tight cursor-pointer"
                  >
                    All materials properly disposed
                  </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Any waste materials or debris have been properly disposed of.
                    </p>
                  </div>
                  {checklist.materials && (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  )}
                </div>
              </div>
            </Card>

            {/* Info Card */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-1">What happens next?</h4>
                  <p className="text-sm text-blue-800">
                    After submission, your work will be reviewed by an administrator. The citizen will be notified, 
                    and you'll receive updates on the verification status. You can track the progress from the task details page.
                  </p>
            </div>
          </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
            <Button 
                type="button"
              variant="outline" 
              className="flex-1"
              onClick={() => navigate(`/officer/task/${id}`)}
              disabled={submitting}
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={submitting || !isBackendReachable}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Submit for Verification
                </>
              )}
            </Button>
          </div>
          </div>
        </form>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit Work for Verification?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                You are about to mark this task as completed and submit it for verification.
                </p>
                <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                  <p className="font-medium">Summary:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>{afterPhotos.length} after photo{afterPhotos.length !== 1 ? 's' : ''} will be uploaded</li>
                    <li>Work duration: {workDuration} hours</li>
                    <li>Status will change to "Pending Verification"</li>
                  </ul>
                </div>
                <p className="pt-2">
                  The citizen and admin will be notified. Please ensure all work is complete and photos are accurate.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Review Again</AlertDialogCancel>
              <AlertDialogAction onClick={handleComplete} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit for Verification'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default CompleteWork;
