import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Camera, Upload, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { reportsService } from "@/services/reportsService";

const SubmitReport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    severity: "medium",
    landmark: ""
  });
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    accuracy: number;
  } | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/citizen/login');
    }
  }, [authLoading, user, navigate]);

  // Reverse geocode using OpenStreetMap Nominatim API
  const reverseGeocode = async (lat: number, lng: number): Promise<{ address: string; landmark: string }> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'CivicLens/1.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      
      const data = await response.json();
      
      // Extract address components
      const addr = data.address || {};
      const road = addr.road || addr.street || '';
      const suburb = addr.suburb || addr.neighbourhood || '';
      const city = addr.city || addr.town || addr.village || '';
      const state = addr.state || '';
      const postcode = addr.postcode || '';
      
      // Build full address
      const addressParts = [road, suburb, city, state, postcode].filter(Boolean);
      const fullAddress = addressParts.join(', ') || data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      
      // Build landmark (more specific location)
      const landmark = [road, suburb].filter(Boolean).join(', ') || 
                      [city, state].filter(Boolean).join(', ') ||
                      'Location captured';
      
      return { address: fullAddress, landmark };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Fallback to coordinates
      return {
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        landmark: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`
      };
    }
  };

  // Get current GPS location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive"
      });
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Validate coordinates are within reasonable bounds (India: 6-37°N, 68-97°E)
        // But allow worldwide for testing
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          toast({
            title: "Invalid Coordinates",
            description: "The captured coordinates are invalid. Please try again.",
            variant: "destructive"
          });
          setLocationLoading(false);
          return;
        }
        
        toast({
          title: "Fetching Address...",
          description: "Please wait while we get your location details",
        });
        
        // Reverse geocode to get address and landmark
        const { address, landmark } = await reverseGeocode(latitude, longitude);
        
        setLocation({ latitude, longitude, address, accuracy });
        
        // Auto-fill landmark
        setFormData(prev => ({ ...prev, landmark }));
        
        setLocationLoading(false);
        
        toast({
          title: "Location Captured",
          description: `Accuracy: ±${Math.round(accuracy)}m`,
        });
      },
      (error) => {
        setLocationLoading(false);
        let errorMessage = "Unable to get your location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable. Please try again.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
        }
        
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive"
        });
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 0 
      }
    );
  };

  // Handle photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate count
    if (photos.length + files.length > 5) {
      toast({
        title: "Too Many Photos",
        description: "Maximum 5 photos allowed",
        variant: "destructive"
      });
      return;
    }

    // Validate file sizes (5MB each)
    const invalidFiles = files.filter(f => f.size > 5 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast({
        title: "File Too Large",
        description: "Each photo must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    // Create preview URLs
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPhotoPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    setPhotos(prev => [...prev, ...files]);
  };

  // Remove photo
  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Validate form
  const validateForm = () => {
    if (!formData.title || formData.title.trim().length < 5) {
      toast({
        title: "Invalid Title",
        description: "Title must be at least 5 characters",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.description || formData.description.trim().length < 10) {
      toast({
        title: "Invalid Description",
        description: "Description must be at least 10 characters",
        variant: "destructive"
      });
      return false;
    }

    if (!location) {
      toast({
        title: "Location Required",
        description: "Please capture your current location",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  // Submit report
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Create report
      const reportData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        latitude: location!.latitude,
        longitude: location!.longitude,
        address: location!.address,
        severity: formData.severity as 'low' | 'medium' | 'high' | 'critical',
        category: formData.category || undefined,
      };

      console.log('Creating report:', reportData);
      const report = await reportsService.createReport(reportData);
      console.log('Report created:', report);

      // Upload photos if any
      if (photos.length > 0) {
        console.log('Uploading photos...');
        await reportsService.uploadMedia(report.id, photos);
        console.log('Photos uploaded');
      }

      toast({
        title: "Report Submitted!",
        description: `Report ${report.report_number} has been created successfully.`,
      });

      // Cleanup preview URLs
      photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));

      navigate(`/citizen/track/${report.id}`);
    } catch (error: any) {
      console.error('Failed to submit report:', error);
      toast({
        title: "Submission Failed",
        description: error.response?.data?.detail || "Failed to submit report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/citizen/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-foreground">Submit New Report</h1>
            <p className="text-xs text-muted-foreground">Help improve your community</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="p-6 md:p-8">
          <div className="space-y-6">
            {/* Report Details */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Report Details</h3>
              
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
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.title.length}/255 characters
                    {formData.title.length < 5 && formData.title.length > 0 && (
                      <span className="text-orange-500"> (minimum 5)</span>
                    )}
                  </p>
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Detailed explanation of the problem..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="mt-2 min-h-[120px]"
                    maxLength={2000}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.description.length}/2000 characters
                    {formData.description.length < 10 && formData.description.length > 0 && (
                      <span className="text-orange-500"> (minimum 10)</span>
                    )}
                  </p>
                </div>

                <div>
                  <Label htmlFor="category">Category (Optional, AI will suggest)</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({...formData, category: value})}
                    disabled={loading}
                  >
                    <SelectTrigger className="mt-2">
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
                </div>

                <div>
                  <Label>Severity *</Label>
                  <RadioGroup 
                    value={formData.severity} 
                    onValueChange={(value) => setFormData({...formData, severity: value})} 
                    className="mt-3"
                    disabled={loading}
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
                              hover:bg-accent/5`}
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
              <h3 className="text-lg font-semibold text-foreground mb-4">Location *</h3>
              
              <div className="space-y-4">
                {location ? (
                  <div>
                    <Label>Captured Location</Label>
                    <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{location.address}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                          </p>
                          <p className="text-sm text-green-600 mt-1">
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
                    <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-1" />
                        <div className="flex-1">
                          <p className="font-medium text-foreground">Location not captured</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Click the button below to capture your current location
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
                  <Label htmlFor="landmark">Landmark (Auto-filled, editable)</Label>
                  <Input
                    id="landmark"
                    placeholder="Will be auto-filled when location is captured"
                    value={formData.landmark}
                    onChange={(e) => setFormData({...formData, landmark: e.target.value})}
                    className="mt-2"
                    disabled={loading}
                  />
                  {formData.landmark && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Auto-filled from location (you can edit if needed)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Photos */}
            <div className="pt-6 border-t">
              <h3 className="text-lg font-semibold text-foreground mb-4">Photos (Optional)</h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Upload Photos (Max 5, 5MB each)</Label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                    id="photo-upload"
                    disabled={loading || photos.length >= 5}
                  />
                  <label htmlFor="photo-upload">
                    <Button 
                      variant="outline" 
                      className="w-full h-32 flex flex-col gap-2 mt-2 cursor-pointer"
                      asChild
                      disabled={loading || photos.length >= 5}
                    >
                      <div>
                        <Upload className="w-8 h-8" />
                        <span className="text-sm">
                          {photos.length >= 5 ? 'Maximum 5 photos' : 'Upload Photos'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {photos.length}/5 photos
                        </span>
                      </div>
                    </Button>
                  </label>
                  
                  {photos.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {photoPreviewUrls.map((url, idx) => (
                        <div key={idx} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
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
                disabled={loading || !location || formData.title.length < 5 || formData.description.length < 10}
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
                {location 
                  ? "Your report will be submitted with GPS location" 
                  : "Please capture location to submit"}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SubmitReport;
