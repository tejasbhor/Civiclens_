import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { MapPin, Upload, X, Loader2, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { reportsService } from "@/services/reportsService";
import { CitizenHeader } from "@/components/layout/CitizenHeader";
import { logger } from "@/lib/logger";
import apiClient from "@/services/apiClient";

interface FormData {
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  landmark: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  accuracy: number;
}

const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_TITLE_LENGTH = 5;
const MIN_DESCRIPTION_LENGTH = 10;

const SubmitReport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, isOffline } = useAuth();
  const { isBackendReachable } = useConnectionStatus();

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    category: "",
    severity: "medium",
    landmark: ""
  });
  const [location, setLocation] = useState<LocationData | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: number]: number }>({});

  // Helper to extract error message from various error formats
  const extractErrorMessage = useCallback((err: any): string => {
    // Handle Pydantic validation errors (array of errors)
    if (Array.isArray(err.response?.data?.detail)) {
      const firstError = err.response.data.detail[0];
      if (typeof firstError === 'object' && firstError.msg) {
        return firstError.msg || 'Validation error occurred';
      }
      return err.response.data.detail[0]?.msg || 'Validation error occurred';
    }
    
    // Handle single validation error object
    if (err.response?.data?.detail && typeof err.response.data.detail === 'object') {
      if (err.response.data.detail.msg) {
        return err.response.data.detail.msg;
      }
      if (err.response.data.detail.message) {
        return err.response.data.detail.message;
      }
      return 'An error occurred. Please check your input and try again.';
    }
    
    // Handle string error messages
    if (typeof err.response?.data?.detail === 'string') {
      return err.response.data.detail;
    }
    
    // Handle network errors
    if (!err.response && (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK' || err.message === 'Network Error')) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    
    // Handle error message
    if (typeof err.message === 'string') {
      return err.message;
    }
    
    // Fallback
    return 'An error occurred. Please try again.';
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/citizen/login');
    }
  }, [authLoading, user, navigate]);

  // Reverse geocode using OpenStreetMap Nominatim API with high accuracy
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<{ address: string; landmark: string }> => {
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for better accuracy
      
      // Use higher zoom level (18-19) for more detailed address
      // Also try with addressdetails=1 for full address components
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=19&addressdetails=1&extratags=1&namedetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'CivicLens/1.0'
          },
          signal: controller.signal
        }
      );
      
      if (timeoutId) clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      
      const data = await response.json();
      
      // Extract address components with priority order for accuracy
      const addr = data.address || {};
      
      // Build comprehensive address with all available components
      const addressComponents = [
        addr.house_number,
        addr.house_name,
        addr.road || addr.street || addr.pedestrian,
        addr.neighbourhood || addr.suburb || addr.village,
        addr.city || addr.town || addr.municipality,
        addr.state || addr.region,
        addr.postcode,
        addr.country
      ].filter(Boolean);
      
      // Use display_name as primary source (most accurate from OSM)
      const fullAddress = data.display_name || addressComponents.join(', ') || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      
      // For landmark, use the full address (as requested by user)
      // This provides maximum accuracy and detail
      const landmark = fullAddress;
      
      return { address: fullAddress, landmark };
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      logger.error('Reverse geocoding error:', error);
      // Fallback to coordinates with high precision
      const coordinateAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      return {
        address: coordinateAddress,
        landmark: coordinateAddress
      };
    }
  }, []);

  // Get current GPS location with high accuracy
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser does not support geolocation. Please use a modern browser.",
        variant: "destructive"
      });
      return;
    }

    setLocationLoading(true);
    
    // Use getCurrentPosition with high accuracy settings
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
        const { latitude, longitude, accuracy } = position.coords;
        
          // Validate coordinates
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          toast({
            title: "Invalid Coordinates",
            description: "The captured coordinates are invalid. Please try again.",
            variant: "destructive"
          });
          setLocationLoading(false);
          return;
        }
        
          // Show loading message for geocoding
        toast({
          title: "Fetching Address...",
            description: "Getting detailed address information for your location",
        });
        
        // Reverse geocode to get address and landmark
        const { address, landmark } = await reverseGeocode(latitude, longitude);
        
        setLocation({ latitude, longitude, address, accuracy });
        
          // Auto-fill landmark with full address (as requested by user)
          setFormData(prev => ({ ...prev, landmark: address }));
        
        toast({
            title: "Location Captured Successfully",
            description: `Location captured with accuracy of ±${Math.round(accuracy)}m. Full address has been auto-filled in the landmark field.`,
        });
        } catch (error) {
          logger.error('Location processing error:', error);
          toast({
            title: "Location Error",
            description: "Failed to process location. Please try again.",
            variant: "destructive"
          });
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        setLocationLoading(false);
        let errorMessage = "Unable to get your location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location access in your browser settings and try again.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable. Please ensure GPS is enabled and try again.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please ensure you are in an area with good GPS signal and try again.";
            break;
        }
        
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive"
        });
      },
      { 
        enableHighAccuracy: true, // Request highest accuracy possible
        timeout: 20000, // 20 second timeout to allow GPS to get better accuracy
        maximumAge: 0 // Always get fresh position, don't use cached
      }
    );
  }, [reverseGeocode, toast]);

  // Handle photo selection
  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    // Validate count
    if (photos.length + files.length > MAX_PHOTOS) {
      toast({
        title: "Too Many Photos",
        description: `Maximum ${MAX_PHOTOS} photos allowed. You can upload ${MAX_PHOTOS - photos.length} more.`,
        variant: "destructive"
      });
      e.target.value = ''; // Reset input
      return;
    }

    // Validate file types
    const invalidTypes = files.filter(f => !f.type.startsWith('image/'));
    if (invalidTypes.length > 0) {
      toast({
        title: "Invalid File Type",
        description: "Please upload only image files (JPG, PNG, etc.)",
        variant: "destructive"
      });
      e.target.value = '';
      return;
    }

    // Validate file sizes
    const invalidFiles = files.filter(f => f.size > MAX_PHOTO_SIZE);
    if (invalidFiles.length > 0) {
      const fileNames = invalidFiles.map(f => f.name).join(', ');
      toast({
        title: "File Too Large",
        description: `The following files exceed ${MAX_PHOTO_SIZE / (1024 * 1024)}MB: ${fileNames}`,
        variant: "destructive"
      });
      e.target.value = '';
      return;
    }

    // Create preview URLs
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPhotoPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    setPhotos(prev => [...prev, ...files]);
    
    e.target.value = ''; // Reset input for next selection
  }, [photos.length, toast]);

  // Remove photo
  const removePhoto = useCallback((index: number) => {
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[index];
      return newProgress;
    });
  }, [photoPreviewUrls]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    if (!formData.title || formData.title.trim().length < MIN_TITLE_LENGTH) {
      toast({
        title: "Invalid Title",
        description: `Title must be at least ${MIN_TITLE_LENGTH} characters long`,
        variant: "destructive"
      });
      return false;
    }

    if (!formData.description || formData.description.trim().length < MIN_DESCRIPTION_LENGTH) {
      toast({
        title: "Invalid Description",
        description: `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters long`,
        variant: "destructive"
      });
      return false;
    }

    if (!location) {
      toast({
        title: "Location Required",
        description: "Please capture your current location before submitting the report",
        variant: "destructive"
      });
      return false;
    }

    return true;
  }, [formData, location, toast]);

  // Upload photos
  const uploadPhotos = useCallback(async (reportId: number): Promise<{ success: number; failed: number }> => {
    if (photos.length === 0) {
      return { success: 0, failed: 0 };
    }

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        const formData = new FormData();
        formData.append('file', photo);
        formData.append('upload_source', 'citizen_submission');
        formData.append('is_proof_of_work', 'false');
        
        const response = await apiClient.post(
          `/media/upload/${reportId}`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 30000, // 30 second timeout per photo
          }
        );
        
        if (response.status === 200 || response.status === 201) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (uploadError: any) {
        logger.error(`Photo upload error for photo ${i + 1}:`, uploadError);
        failedCount++;
      }
    }

    return { success: successCount, failed: failedCount };
  }, [photos]);

  // Submit report
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    if (isOffline || !isBackendReachable) {
      toast({
        title: "Connection Error",
        description: "Unable to submit report. Please check your internet connection and try again.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // Create report
      const reportData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        latitude: location!.latitude,
        longitude: location!.longitude,
        address: location!.address,
        severity: formData.severity,
        category: formData.category || undefined,
        landmark: formData.landmark.trim() || undefined,
      };

      const report = await reportsService.createReport(reportData);

      // Upload photos if any
      let photoUploadResult = { success: 0, failed: 0 };
      if (photos.length > 0) {
        photoUploadResult = await uploadPhotos(report.id);
      }

      // Cleanup preview URLs
      photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));

      // Show success message
      if (photoUploadResult.failed > 0) {
        toast({
          title: "Report Submitted with Warnings",
          description: `Report ${report.report_number} created successfully. ${photoUploadResult.success} photo(s) uploaded, ${photoUploadResult.failed} failed.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Report Submitted Successfully",
          description: `Report ${report.report_number} has been created successfully.`,
        });
      }

      // Navigate to track page
      navigate(`/citizen/track/${report.id}`);
    } catch (error: any) {
      logger.error('Failed to submit report:', error);
      
      const errorMessage = extractErrorMessage(error);
      toast({
        title: "Submission Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [formData, location, photos, photoPreviewUrls, validateForm, uploadPhotos, extractErrorMessage, toast, navigate, isOffline, isBackendReachable]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [photoPreviewUrls]);

  // Memoized form validation state
  const isFormValid = useMemo(() => {
    return (
      formData.title.trim().length >= MIN_TITLE_LENGTH &&
      formData.description.trim().length >= MIN_DESCRIPTION_LENGTH &&
      location !== null
    );
  }, [formData, location]);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <CitizenHeader />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/citizen/dashboard')}
          className="mb-4"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="p-6 md:p-8">
          <div className="space-y-6">
            {/* Offline Indicator */}
            {isOffline && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-800">
                <AlertCircle className="w-4 h-4" />
                <span>You are currently offline. Report submission may not be available.</span>
              </div>
            )}

            {/* Report Details */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Report Details</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Brief description of the issue"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="mt-2"
                    maxLength={255}
                    disabled={loading}
                    aria-required="true"
                    aria-invalid={formData.title.length > 0 && formData.title.length < MIN_TITLE_LENGTH}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.title.length}/255 characters
                    {formData.title.length < MIN_TITLE_LENGTH && formData.title.length > 0 && (
                      <span className="text-orange-500 ml-1">(minimum {MIN_TITLE_LENGTH})</span>
                    )}
                  </p>
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide a detailed explanation of the problem..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="mt-2 min-h-[120px]"
                    maxLength={2000}
                    disabled={loading}
                    aria-required="true"
                    aria-invalid={formData.description.length > 0 && formData.description.length < MIN_DESCRIPTION_LENGTH}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.description.length}/2000 characters
                    {formData.description.length < MIN_DESCRIPTION_LENGTH && formData.description.length > 0 && (
                      <span className="text-orange-500 ml-1">(minimum {MIN_DESCRIPTION_LENGTH})</span>
                    )}
                  </p>
                </div>

                <div>
                  <Label htmlFor="category">Category (Optional)</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({...formData, category: value})}
                    disabled={loading}
                  >
                    <SelectTrigger className="mt-2" id="category" aria-label="Select category">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="roads">Roads</SelectItem>
                      <SelectItem value="water">Water</SelectItem>
                      <SelectItem value="sanitation">Sanitation</SelectItem>
                      <SelectItem value="electricity">Electricity</SelectItem>
                      <SelectItem value="streetlights">Street Lights</SelectItem>
                      <SelectItem value="drainage">Drainage</SelectItem>
                      <SelectItem value="garbage">Garbage</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Category will be automatically suggested if not selected
                  </p>
                </div>

                <div>
                  <Label>Severity *</Label>
                  <RadioGroup 
                    value={formData.severity} 
                    onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => setFormData({...formData, severity: value})} 
                    className="mt-3"
                    disabled={loading}
                    aria-required="true"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { value: "low", label: "Low", color: "border-green-500" },
                        { value: "medium", label: "Medium", color: "border-amber-500" },
                        { value: "high", label: "High", color: "border-orange-500" },
                        { value: "critical", label: "Critical", color: "border-red-500" }
                      ].map((item) => (
                        <div key={item.value} className="flex items-center">
                          <RadioGroupItem value={item.value} id={item.value} className="peer sr-only" />
                          <Label
                            htmlFor={item.value}
                            className={`flex-1 p-3 border-2 rounded-lg text-center cursor-pointer transition-all
                              peer-checked:${item.color} peer-checked:bg-accent/10
                              hover:bg-accent/5 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed`}
                          >
                            {item.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="pt-6 border-t">
              <h2 className="text-lg font-semibold text-foreground mb-4">Location *</h2>
              
              <div className="space-y-4">
                {location ? (
                  <div>
                    <Label>Captured Location</Label>
                    <div className="mt-2 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" aria-hidden="true" />
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{location.address}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                          </p>
                          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                            Accuracy: ±{Math.round(location.accuracy)}m
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 w-full"
                      onClick={getCurrentLocation}
                      disabled={locationLoading || loading}
                      aria-label="Update location"
                    >
                      {locationLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Getting Location...
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4 mr-2" />
                          Update Location
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Label>GPS Location Required</Label>
                    <div className="mt-2 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-1 flex-shrink-0" aria-hidden="true" />
                        <div className="flex-1">
                          <p className="font-medium text-foreground">Location not captured</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Please click the button below to capture your current location using GPS
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="default" 
                      size="lg" 
                      className="mt-3 w-full"
                      onClick={getCurrentLocation}
                      disabled={locationLoading || loading}
                      aria-label="Get current location"
                    >
                      {locationLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Getting Location...
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4 mr-2" />
                          Get Current Location
                        </>
                      )}
                    </Button>
                  </div>
                )}

                <div>
                  <Label htmlFor="landmark">Address / Landmark (Auto-filled)</Label>
                  <Input
                    id="landmark"
                    placeholder="Full address will be auto-filled when location is captured"
                    value={formData.landmark}
                    onChange={(e) => setFormData({...formData, landmark: e.target.value})}
                    className="mt-2"
                    disabled={loading}
                    maxLength={500}
                    aria-label="Address or landmark, auto-filled from GPS location"
                  />
                  {formData.landmark && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Full address auto-filled from GPS location (you can edit if needed)
                    </p>
                  )}
                  {!formData.landmark && location && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Address will be auto-filled after location is captured
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Photos */}
            <div className="pt-6 border-t">
              <h2 className="text-lg font-semibold text-foreground mb-4">Photos (Optional)</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="photo-upload">Upload Photos (Maximum {MAX_PHOTOS}, {MAX_PHOTO_SIZE / (1024 * 1024)}MB each)</Label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                    id="photo-upload"
                    disabled={loading || photos.length >= MAX_PHOTOS}
                    aria-label="Upload photos"
                  />
                  <label htmlFor="photo-upload">
                    <Button 
                      variant="outline" 
                      className="w-full h-32 flex flex-col gap-2 mt-2 cursor-pointer"
                      asChild
                      disabled={loading || photos.length >= MAX_PHOTOS}
                      aria-label={photos.length >= MAX_PHOTOS ? 'Maximum photos reached' : 'Upload photos'}
                    >
                      <div>
                        <Upload className="w-8 h-8" />
                        <span className="text-sm">
                          {photos.length >= MAX_PHOTOS ? `Maximum ${MAX_PHOTOS} photos` : 'Upload Photos'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {photos.length}/{MAX_PHOTOS} photos
                        </span>
                      </div>
                    </Button>
                  </label>
                  
                  {photos.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2" role="list" aria-label="Photo previews">
                      {photoPreviewUrls.map((url, idx) => (
                        <div key={idx} className="relative aspect-square bg-muted rounded-lg overflow-hidden" role="listitem">
                          <img 
                            src={url} 
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 w-7 h-7 shadow-lg"
                            onClick={() => removePhoto(idx)}
                            disabled={loading}
                            aria-label={`Remove photo ${idx + 1}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-6 border-t">
              <Button 
                onClick={handleSubmit} 
                size="lg" 
                className="w-full"
                disabled={loading || !isFormValid || isOffline || !isBackendReachable}
                aria-label="Submit report"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting Report...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center mt-4">
                {!location 
                  ? "Please capture location to submit" 
                  : !isFormValid
                  ? "Please complete all required fields"
                  : isOffline || !isBackendReachable
                  ? "Unable to submit - check your connection"
                  : "Your report will be submitted with GPS location"}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SubmitReport;
