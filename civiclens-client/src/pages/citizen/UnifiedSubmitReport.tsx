/**
 * Unified Submit Report Page - Production Ready
 * Single atomic submission with comprehensive error handling
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Upload, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  Camera,
  Mic,
  FileText,
  Wifi,
  WifiOff
} from 'lucide-react';

import { LocationPicker } from '@/components/LocationPicker';
import { PhotoCapture } from '@/components/PhotoCapture';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuth } from '@/contexts/AuthContext';
import { unifiedReportsService, UnifiedReportSubmission, SubmissionProgress } from '@/services/unifiedReportsService';
import { logger } from '@/utils/logger';

interface FormData {
  title: string;
  description: string;
  category: string;
  severity: string;
  landmark: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

const CATEGORIES = [
  { value: 'roads', label: 'Roads & Transportation' },
  { value: 'water', label: 'Water Supply' },
  { value: 'sanitation', label: 'Sanitation & Waste' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'public_safety', label: 'Public Safety' },
  { value: 'environment', label: 'Environment' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'other', label: 'Other' },
];

const SEVERITIES = [
  { value: 'low', label: 'Low', description: 'Minor issue, not urgent' },
  { value: 'medium', label: 'Medium', description: 'Moderate issue, needs attention' },
  { value: 'high', label: 'High', description: 'Serious issue, urgent attention needed' },
  { value: 'critical', label: 'Critical', description: 'Emergency, immediate action required' },
];

export const UnifiedSubmitReport: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOnline, isBackendReachable } = useNetworkStatus();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    category: '',
    severity: '',
    landmark: '',
  });

  const [location, setLocation] = useState<LocationData | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);

  // Submission state
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<SubmissionProgress | null>(null);
  const [submissionLimits, setSubmissionLimits] = useState<any>(null);

  // Load submission limits on mount
  useEffect(() => {
    const loadLimits = async () => {
      try {
        const limits = await unifiedReportsService.getSubmissionLimits();
        setSubmissionLimits(limits);
      } catch (error) {
        logger.warn('Failed to load submission limits:', error);
      }
    };
    loadLimits();
  }, []);

  // Handle form field changes
  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle location selection
  const handleLocationSelect = useCallback((locationData: LocationData) => {
    setLocation(locationData);
  }, []);

  // Handle file selection
  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    // Validate file count
    if (selectedFiles.length > 6) {
      toast({
        title: "Too Many Files",
        description: "Maximum 6 files allowed (5 images + 1 audio)",
        variant: "destructive"
      });
      return;
    }

    // Update files
    setFiles(selectedFiles);

    // Create preview URLs for images
    const newPreviewUrls = selectedFiles.map(file => {
      if (file.type.startsWith('image/')) {
        return URL.createObjectURL(file);
      }
      return '';
    });
    
    // Clean up old URLs
    filePreviewUrls.forEach(url => {
      if (url) URL.revokeObjectURL(url);
    });
    
    setFilePreviewUrls(newPreviewUrls);
  }, [filePreviewUrls]);

  // Remove file
  const removeFile = useCallback((index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviewUrls = filePreviewUrls.filter((_, i) => i !== index);
    
    // Clean up removed URL
    if (filePreviewUrls[index]) {
      URL.revokeObjectURL(filePreviewUrls[index]);
    }
    
    setFiles(newFiles);
    setFilePreviewUrls(newPreviewUrls);
  }, [files, filePreviewUrls]);

  // Form validation
  const validateForm = useCallback((): boolean => {
    if (!formData.title.trim() || formData.title.trim().length < 5) {
      toast({
        title: "Invalid Title",
        description: "Title must be at least 5 characters long",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.description.trim() || formData.description.trim().length < 10) {
      toast({
        title: "Invalid Description",
        description: "Description must be at least 10 characters long",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.category) {
      toast({
        title: "Category Required",
        description: "Please select a category for your report",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.severity) {
      toast({
        title: "Severity Required",
        description: "Please select the severity level",
        variant: "destructive"
      });
      return false;
    }

    if (!location) {
      toast({
        title: "Location Required",
        description: "Please select the location of the issue",
        variant: "destructive"
      });
      return false;
    }

    if (files.length === 0) {
      toast({
        title: "Photos Required",
        description: "At least one photo is required",
        variant: "destructive"
      });
      return false;
    }

    return true;
  }, [formData, location, files]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    if (!isOnline || !isBackendReachable) {
      toast({
        title: "Connection Error",
        description: "Unable to submit report. Please check your internet connection and try again.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      setProgress({ stage: 'preparing', message: 'Preparing submission...' });

      // Prepare submission data
      const submissionData: UnifiedReportSubmission = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        severity: formData.severity,
        latitude: location!.latitude,
        longitude: location!.longitude,
        address: location!.address,
        landmark: formData.landmark.trim() || undefined,
        files: files,
        is_public: true,
        is_sensitive: false,
      };

      logger.info('Submitting unified report:', submissionData);

      // Submit using unified service
      const result = await unifiedReportsService.submitCompleteReport(
        submissionData,
        setProgress
      );

      // Clean up preview URLs
      filePreviewUrls.forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });

      // Show success message
      toast({
        title: "Report Submitted Successfully",
        description: `Report ${result.report_number} has been created successfully.`,
      });

      // Navigate to track page
      navigate(`/citizen/track/${result.id}`);

    } catch (error: any) {
      logger.error('Unified submission failed:', error);
      
      toast({
        title: "Submission Failed",
        description: error.message || 'Failed to submit report. Please try again.',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [formData, location, files, filePreviewUrls, validateForm, navigate, isOnline, isBackendReachable]);

  // Get file type icon
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Camera className="h-4 w-4" />;
    if (file.type.startsWith('audio/')) return <Mic className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Submit Report</h1>
            <p className="text-gray-600 mt-1">Report civic issues in your area</p>
          </div>
          
          {/* Network Status */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge variant="destructive">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      {progress && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{progress.message}</span>
                {progress.percentage && (
                  <span className="text-sm text-gray-500">{progress.percentage}%</span>
                )}
              </div>
              <Progress 
                value={progress.percentage || 0} 
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offline Warning */}
      {!isOnline && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You are currently offline. Reports cannot be submitted without an internet connection.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Report Details</CardTitle>
              <CardDescription>
                Provide clear details about the issue you want to report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Brief description of the issue"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  maxLength={200}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  {formData.title.length}/200 characters
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Detailed description of the issue, including when you noticed it and how it affects you"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  maxLength={2000}
                  rows={4}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  {formData.description.length}/2000 characters
                </p>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => handleInputChange('category', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select issue category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Severity */}
              <div className="space-y-2">
                <Label htmlFor="severity">Severity Level *</Label>
                <Select 
                  value={formData.severity} 
                  onValueChange={(value) => handleInputChange('severity', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity level" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((severity) => (
                      <SelectItem key={severity.value} value={severity.value}>
                        <div>
                          <div className="font-medium">{severity.label}</div>
                          <div className="text-xs text-gray-500">{severity.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Landmark */}
              <div className="space-y-2">
                <Label htmlFor="landmark">Landmark (Optional)</Label>
                <Input
                  id="landmark"
                  placeholder="Nearby landmark or reference point"
                  value={formData.landmark}
                  onChange={(e) => handleInputChange('landmark', e.target.value)}
                  maxLength={200}
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
              <CardDescription>
                Select the exact location where the issue is occurring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LocationPicker
                onLocationSelect={handleLocationSelect}
                disabled={loading}
              />
              {location && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">Selected Location:</p>
                  <p className="text-sm text-gray-600">{location.address}</p>
                  <p className="text-xs text-gray-500">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Media Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Photos & Media
              </CardTitle>
              <CardDescription>
                Upload photos and audio files to document the issue (Required)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PhotoCapture
                onFilesSelected={handleFilesSelected}
                maxFiles={6}
                disabled={loading}
              />

              {/* File List */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label>Selected Files ({files.length}/6)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        {filePreviewUrls[index] ? (
                          <img
                            src={filePreviewUrls[index]}
                            alt={`Preview ${index + 1}`}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                            {getFileIcon(file)}
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={loading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Submission Limits */}
          {submissionLimits && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Submission Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Max Files:</span>
                    <span className="font-medium">{submissionLimits.limits.max_files}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Images:</span>
                    <span className="font-medium">{submissionLimits.limits.max_images}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Audio:</span>
                    <span className="font-medium">{submissionLimits.limits.max_audio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Image Size:</span>
                    <span className="font-medium">{submissionLimits.limits.max_image_size_mb}MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Audio Size:</span>
                    <span className="font-medium">{submissionLimits.limits.max_audio_size_mb}MB</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-600">
                    Supported formats: {submissionLimits.supported_formats.images.join(', ')} for images;{' '}
                    {submissionLimits.supported_formats.audio.join(', ')} for audio
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleSubmit}
                disabled={loading || !isOnline || !isBackendReachable}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {progress?.message || 'Submitting...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Submit Report
                  </>
                )}
              </Button>
              
              {(!isOnline || !isBackendReachable) && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Internet connection required to submit reports
                </p>
              )}
            </CardContent>
          </Card>

          {/* Help */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <p>• Be specific and clear in your description</p>
                <p>• Include multiple photos from different angles</p>
                <p>• Select the correct category and severity</p>
                <p>• Provide accurate location information</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
