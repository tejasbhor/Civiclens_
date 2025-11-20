"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { reportsApi, CreateReportRequest } from '@/lib/api/reports';
import { mediaApi } from '@/lib/api/media';
import {
  FileText,
  MapPin,
  AlertCircle,
  CheckCircle,
  Loader2,
  Navigation,
  Info,
  AlertTriangle,
  Camera,
  Mic,
  X,
  ChevronRight,
  ChevronLeft,
  Target,
  MapPinned
} from 'lucide-react';

// Report categories based on backend ReportCategory enum
const CATEGORIES = [
  { value: 'roads', label: 'Roads', description: 'Potholes, cracks, road damage' },
  { value: 'water', label: 'Water Supply', description: 'Water leaks, supply issues' },
  { value: 'sanitation', label: 'Sanitation', description: 'Waste management, cleanliness' },
  { value: 'electricity', label: 'Electricity', description: 'Power outages, electrical issues' },
  { value: 'streetlight', label: 'Street Lights', description: 'Street lighting problems' },
  { value: 'drainage', label: 'Drainage', description: 'Drainage blockage, flooding' },
  { value: 'public_property', label: 'Public Property', description: 'Damage to public property' },
  { value: 'other', label: 'Other', description: 'Other civic issues' },
];

const SEVERITIES = [
  { value: 'low', label: 'Low', color: 'green', description: 'Minor issue, not urgent' },
  { value: 'medium', label: 'Medium', color: 'yellow', description: 'Moderate issue, needs attention' },
  { value: 'high', label: 'High', color: 'orange', description: 'Serious issue, requires prompt action' },
  { value: 'critical', label: 'Critical', color: 'red', description: 'Emergency, immediate action required' },
];

// Step definitions
type Step = 1 | 2 | 3 | 4;

interface Department {
  id: number;
  name: string;
  description?: string;
  keywords?: string;
}

export default function CreateReportPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mode, setMode] = useState<'citizen' | 'admin'>('citizen');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<CreateReportRequest>({
    title: '',
    description: '',
    latitude: 0,
    longitude: 0,
    address: '',
    category: '',
    sub_category: '',
    severity: 'medium',
  });

  // Validation constants
  const TITLE_MIN_LENGTH = 5;
  const TITLE_MAX_LENGTH = 255;
  const DESCRIPTION_MIN_LENGTH = 10;
  const DESCRIPTION_MAX_LENGTH = 2000;

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorderRef, setMediaRecorderRef] = useState<MediaRecorder | null>(null);
  const [recordingIntervalRef, setRecordingIntervalRef] = useState<NodeJS.Timeout | null>(null);
  const [audioChunksRef, setAudioChunksRef] = useState<Blob[]>([]);

  // Clean up audio blob URLs
  useEffect(() => {
    const currentAudioUrl = audioFile ? URL.createObjectURL(audioFile) : null;
    
    return () => {
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
      }
    };
  }, [audioFile]);

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/departments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  // Get user's current location with better accuracy
  const getCurrentLocation = () => {
    setGettingLocation(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setLocationAccuracy(position.coords.accuracy);
        setGettingLocation(false);
        
        // Optionally reverse geocode to get address
        reverseGeocode(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setError(`Location error: ${error.message}`);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Reverse geocode coordinates to address with better accuracy
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      // Try multiple geocoding services for better accuracy
      
      // Option 1: Try OpenStreetMap Nominatim with more parameters
      const nominatimResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        `format=json&lat=${lat}&lon=${lng}&` +
        `zoom=18&` + // Higher zoom for more precise results
        `addressdetails=1&` + // Get detailed address components
        `accept-language=en`, // English language
        {
          headers: {
            'User-Agent': 'CivicLens/1.0' // Required by Nominatim
          }
        }
      );
      
      if (nominatimResponse.ok) {
        const data = await nominatimResponse.json();
        
        if (data.display_name) {
          // Build a more accurate address from components
          const addr = data.address || {};
          const addressParts = [];
          
          // Add road/street
          if (addr.road) addressParts.push(addr.road);
          
          // Add neighborhood/suburb
          if (addr.neighbourhood) addressParts.push(addr.neighbourhood);
          else if (addr.suburb) addressParts.push(addr.suburb);
          
          // Add city/town
          if (addr.city) addressParts.push(addr.city);
          else if (addr.town) addressParts.push(addr.town);
          else if (addr.village) addressParts.push(addr.village);
          
          // Add state
          if (addr.state) addressParts.push(addr.state);
          
          // Add postcode
          if (addr.postcode) addressParts.push(addr.postcode);
          
          // Add country
          if (addr.country) addressParts.push(addr.country);
          
          // Use constructed address if we have enough components, otherwise use display_name
          const finalAddress = addressParts.length >= 3 
            ? addressParts.join(', ')
            : data.display_name;
          
          setFormData(prev => ({ ...prev, address: finalAddress }));
          return;
        }
      }
      
      // Fallback: Just show coordinates if geocoding fails
      setFormData(prev => ({ 
        ...prev, 
        address: `Location: ${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E` 
      }));
      
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
      // Set coordinates as address on error
      setFormData(prev => ({ 
        ...prev, 
        address: `Location: ${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E` 
      }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title || formData.title.trim().length < TITLE_MIN_LENGTH) {
      errors.title = `Title must be at least ${TITLE_MIN_LENGTH} characters long`;
    } else if (formData.title.length > TITLE_MAX_LENGTH) {
      errors.title = `Title must not exceed ${TITLE_MAX_LENGTH} characters`;
    }

    if (!formData.description || formData.description.trim().length < DESCRIPTION_MIN_LENGTH) {
      errors.description = `Description must be at least ${DESCRIPTION_MIN_LENGTH} characters long`;
    } else if (formData.description.length > DESCRIPTION_MAX_LENGTH) {
      errors.description = `Description must not exceed ${DESCRIPTION_MAX_LENGTH} characters`;
    }

    if (!formData.latitude || !formData.longitude) {
      errors.location = 'Please provide a valid location';
    }

    // Validate coordinates are within India bounds
    if (formData.latitude && formData.longitude) {
      if (formData.latitude < 6.0 || formData.latitude > 37.0 || 
          formData.longitude < 68.0 || formData.longitude > 97.0) {
        errors.location = 'Coordinates must be within India';
      }
    }

    // Category is required only in admin mode
    if (mode === 'admin' && !formData.category) {
      errors.category = 'Please select a category';
    }

    if (currentStep === 4) {
      // Media is optional in citizen mode, but recommended
      // In admin mode, at least one media file is recommended but not required
      // This allows flexibility for both modes
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('handleSubmit called, currentStep:', currentStep);
    
    // CRITICAL: Only allow submission on the final step (step 4)
    // This prevents accidental submission before media upload
    if (currentStep !== 4) {
      console.warn('⛔ Form submission BLOCKED - not on final step. Current step:', currentStep);
      return;
    }
    
    console.log('✅ Form submission allowed - on Step 4');
    
    if (!validateForm()) {
      setError('Please fix the validation errors');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Prepare data based on mode
      const reportData: CreateReportRequest = {
        title: formData.title,
        description: formData.description,
        latitude: formData.latitude,
        longitude: formData.longitude,
        address: formData.address || undefined,
      };

      // Add category fields only in admin mode
      if (mode === 'admin') {
        reportData.category = formData.category || undefined;
        reportData.sub_category = formData.sub_category || undefined;
        reportData.severity = formData.severity;
      }

      const report = await reportsApi.createReport(reportData);
      
      // Upload media files if any
      if (photos.length > 0 || audioFile) {
        try {
          const mediaFiles: File[] = [];
          
          // Add photos
          photos.forEach(photo => {
            mediaFiles.push(photo);
          });
          
          // Add audio
          if (audioFile) {
            mediaFiles.push(audioFile);
          }
          
          // Upload using media API
          const uploadResult = await mediaApi.uploadMedia(report.id, mediaFiles);
          console.log('Media uploaded successfully:', uploadResult);
          
        } catch (mediaError: any) {
          console.error('Failed to upload media:', mediaError);
          
          // Don't show success if media upload fails
          setError(
            `Report created successfully, but failed to upload media files: ${
              mediaError?.response?.data?.detail || mediaError?.message || 'Unknown error'
            }. Please try uploading media files later by editing the report.`
          );
          return; // Don't proceed to success
        }
      }
      
      setSuccess(true);
      
      // Redirect to reports page after 2 seconds
      setTimeout(() => {
        router.push(`/dashboard/reports`);
      }, 2000);
      
    } catch (err: any) {
      console.error('Failed to create report:', err);
      setError(
        err?.response?.data?.detail || 
        err?.message || 
        'Failed to create report. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Update form field
  const updateField = (field: keyof CreateReportRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isImage && isValidSize;
    });

    if (photos.length + validFiles.length > 5) {
      setError('Maximum 5 photos allowed');
      return;
    }

    setPhotos(prev => [...prev, ...validFiles]);

    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove photo
  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Handle audio upload
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isAudio = file.type.startsWith('audio/');
    const isValidSize = file.size <= 25 * 1024 * 1024; // 25MB

    if (!isAudio) {
      setError('Please upload a valid audio file');
      return;
    }

    if (!isValidSize) {
      setError('Audio file must be less than 25MB');
      return;
    }

    setAudioFile(file);
  };

  // Remove audio
  const removeAudio = () => {
    setAudioFile(null);
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });
      
      // Try different MIME types for better compatibility
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav',
        'audio/ogg;codecs=opus',
        'audio/ogg'
      ];
      
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      
      if (!selectedMimeType) {
        setError('Audio recording is not supported in your browser.');
        return;
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType
      });
      
      setMediaRecorderRef(mediaRecorder);
      setAudioChunksRef([]);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          setAudioChunksRef(prev => [...prev, event.data]);
        }
      };
      
      mediaRecorder.onstop = () => {
        // Check if we have any audio data
        if (!audioChunksRef || audioChunksRef.length === 0) {
          setError('No audio was recorded. Please try again.');
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef, { type: selectedMimeType || 'audio/wav' });
        
        if (audioBlob.size === 0) {
          setError('Recording failed - no audio data captured. Please check your microphone and try again.');
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        // Create file with appropriate extension
        let extension = 'wav';
        if (selectedMimeType.includes('webm')) extension = 'webm';
        else if (selectedMimeType.includes('mp4')) extension = 'm4a';
        else if (selectedMimeType.includes('ogg')) extension = 'ogg';
        
        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.${extension}`, { type: selectedMimeType || 'audio/wav' });
        
        setAudioFile(audioFile);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording failed. Please try again.');
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Request data every 100ms for better chunking
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      const interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 600) { // 10 minutes max
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
      setRecordingIntervalRef(interval);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Unable to access microphone. Please check permissions and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef && isRecording) {
      mediaRecorderRef.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef) {
        clearInterval(recordingIntervalRef);
        setRecordingIntervalRef(null);
      }
    }
  };

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  const goToNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as Step);
      setError(null);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
      setError(null);
    }
  };

  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {};

    if (currentStep === 1) {
      // Mode selection - always valid
      return true;
    }

    if (currentStep === 2) {
      // Basic info validation
      if (!formData.title || formData.title.trim().length < TITLE_MIN_LENGTH) {
        errors.title = `Title must be at least ${TITLE_MIN_LENGTH} characters`;
      } else if (formData.title.length > TITLE_MAX_LENGTH) {
        errors.title = `Title must not exceed ${TITLE_MAX_LENGTH} characters`;
      }
      if (!formData.description || formData.description.trim().length < DESCRIPTION_MIN_LENGTH) {
        errors.description = `Description must be at least ${DESCRIPTION_MIN_LENGTH} characters`;
      } else if (formData.description.length > DESCRIPTION_MAX_LENGTH) {
        errors.description = `Description must not exceed ${DESCRIPTION_MAX_LENGTH} characters`;
      }
    }

    if (currentStep === 3) {
      // Location validation
      if (!formData.latitude || !formData.longitude) {
        errors.location = 'Please provide a valid location';
      }
      if (formData.latitude && formData.longitude) {
        if (formData.latitude < 6.0 || formData.latitude > 37.0 || 
            formData.longitude < 68.0 || formData.longitude > 97.0) {
          errors.location = 'Coordinates must be within India';
        }
      }
      // Admin mode category validation
      if (mode === 'admin' && !formData.category) {
        errors.category = 'Please select a category';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = (e?: React.MouseEvent) => {
    // Prevent any form submission
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (validateCurrentStep()) {
      goToNextStep();
    } else {
      setError('Please fix the errors before continuing');
    }
  };

  // Progress calculation
  const progressPercentage = (currentStep / 4) * 100;

  // Step labels
  const steps = [
    { number: 1, label: 'Mode', icon: FileText },
    { number: 2, label: 'Details', icon: AlertCircle },
    { number: 3, label: 'Location', icon: MapPin },
    { number: 4, label: 'Media', icon: Camera },
  ];

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Created Successfully!</h2>
          <p className="text-gray-600 mb-4">
            Your report has been submitted and will be reviewed by our team.
          </p>
          <div className="animate-pulse text-sm text-gray-500">
            Redirecting to reports page...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Clean white theme */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-600 rounded-lg shadow-sm">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create New Report</h1>
                <p className="text-sm text-gray-600">Step {currentStep} of 4 - {steps[currentStep - 1].label}</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/reports')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;
                
                return (
                  <div key={step.number} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isActive
                            ? 'bg-primary-600 text-white ring-4 ring-primary-600/20'
                            : isCompleted
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <StepIcon className="w-5 h-5" />
                        )}
                      </div>
                      <span
                        className={`text-xs mt-2 font-medium ${
                          isActive ? 'text-primary-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 mx-2 transition-all ${
                          isCompleted ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Progress percentage bar */}
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary-600 to-primary-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800">Error</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Step Content */}
        <form 
          onSubmit={handleSubmit} 
          onKeyDown={(e) => {
            // Prevent Enter key from submitting form on steps 1-3
            if (e.key === 'Enter' && currentStep < 4) {
              e.preventDefault();
            }
          }}
          className="space-y-6"
        >
          
          {/* STEP 1: Mode Selection */}
          {currentStep === 1 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Report Creation Mode</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMode('citizen')}
                  className={`p-6 border-2 rounded-lg text-left transition-all ${
                    mode === 'citizen'
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="font-bold text-gray-900">Citizen Report</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Simple report creation. AI will automatically classify category, severity, and assign department.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                    <CheckCircle className="w-4 h-4" />
                    <span>AI-Powered Classification</span>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setMode('admin')}
                  className={`p-6 border-2 rounded-lg text-left transition-all ${
                    mode === 'admin'
                      ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <AlertTriangle className="w-6 h-6 text-purple-600" />
                    </div>
                    <h4 className="font-bold text-gray-900">Admin Manual Entry</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Complete manual report creation with all classification fields. No AI processing.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-purple-600 font-medium">
                    <Target className="w-4 h-4" />
                    <span>Manual Classification</span>
                  </div>
                </button>
              </div>

              {/* Mode Info */}
              {mode === 'citizen' ? (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-blue-900 mb-1">AI-Powered Processing</h4>
                      <p className="text-sm text-blue-800">
                        This report will be automatically analyzed by our AI system to determine the category, 
                        severity level, and appropriate department assignment.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-purple-900 mb-1">Manual Classification Required</h4>
                      <p className="text-sm text-purple-800">
                        You must manually enter all classification details. This report will bypass AI processing 
                        and be directly assigned based on your selections.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Basic Information */}
          {currentStep === 2 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            {/* Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                onKeyDown={(e) => {
                  // Prevent Enter from submitting form
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
                placeholder={`Brief title of the issue (${TITLE_MIN_LENGTH}-${TITLE_MAX_LENGTH} characters)`}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                maxLength={TITLE_MAX_LENGTH}
              />
              {validationErrors.title && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
              )}
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {formData.title.length < TITLE_MIN_LENGTH ? (
                    <span className="text-orange-600">Minimum {TITLE_MIN_LENGTH} characters required</span>
                  ) : (
                    <span className="text-green-600">✓ Valid length</span>
                  )}
                </p>
                <p className={`text-xs ${
                  formData.title.length > TITLE_MAX_LENGTH * 0.9 ? 'text-orange-600 font-medium' : 'text-gray-500'
                }`}>
                  {formData.title.length}/{TITLE_MAX_LENGTH}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder={`Detailed description of the issue (${DESCRIPTION_MIN_LENGTH}-${DESCRIPTION_MAX_LENGTH} characters)`}
                rows={5}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  validationErrors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                maxLength={DESCRIPTION_MAX_LENGTH}
              />
              {validationErrors.description && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
              )}
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {formData.description.length < DESCRIPTION_MIN_LENGTH ? (
                    <span className="text-orange-600">Minimum {DESCRIPTION_MIN_LENGTH} characters required</span>
                  ) : (
                    <span className="text-green-600">✓ Valid length</span>
                  )}
                </p>
                <p className={`text-xs ${
                  formData.description.length > DESCRIPTION_MAX_LENGTH * 0.9 ? 'text-orange-600 font-medium' : 'text-gray-500'
                }`}>
                  {formData.description.length}/{DESCRIPTION_MAX_LENGTH}
                </p>
              </div>
            </div>
          </div>
          )}

          {/* STEP 3: Location & Classification */}
          {currentStep === 3 && (
          <>
          {/* Category & Severity - Show based on mode */}
          {mode === 'admin' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Manual Classification</h2>
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Admin Mode:</strong> You must manually classify this report. AI will not process this report.
              </p>
            </div>
            
            {/* Category */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => updateField('category', cat.value)}
                    className={`p-3 border-2 rounded-lg text-left transition-all ${
                      formData.category === cat.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-semibold text-gray-900 mb-1">{cat.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{cat.description}</div>
                  </button>
                ))}
              </div>
              {validationErrors.category && (
                <p className="mt-2 text-sm text-red-600">{validationErrors.category}</p>
              )}
            </div>

            {/* Sub-category (optional) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sub-category (Optional)
              </label>
              <input
                type="text"
                value={formData.sub_category || ''}
                onChange={(e) => updateField('sub_category', e.target.value)}
                placeholder="Specific type of issue"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Severity */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SEVERITIES.map((sev) => (
                  <button
                    key={sev.value}
                    type="button"
                    onClick={() => updateField('severity', sev.value)}
                    className={`p-3 border-2 rounded-lg text-left transition-all ${
                      formData.severity === sev.value
                        ? `border-${sev.color}-500 bg-${sev.color}-50`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`text-sm font-bold text-${sev.color}-600 mb-1`}>
                      {sev.label}
                    </div>
                    <div className="text-xs text-gray-600">{sev.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Location */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Location Information</h2>
            
            {/* Get Current Location Button */}
            <div className="mb-6">
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {gettingLocation ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="font-medium">Detecting your location...</span>
                  </>
                ) : (
                  <>
                    <MapPinned className="w-5 h-5" />
                    <span className="font-medium">Use Current Location (High Accuracy)</span>
                  </>
                )}
              </button>
              {locationAccuracy && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${locationAccuracy < 50 ? 'bg-green-500' : locationAccuracy < 100 ? 'bg-yellow-500' : 'bg-orange-500'}`} />
                  <span className="text-gray-600">
                    Accuracy: {locationAccuracy.toFixed(0)}m {locationAccuracy < 50 ? '(Excellent)' : locationAccuracy < 100 ? '(Good)' : '(Fair)'}
                  </span>
                </div>
              )}
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude || ''}
                  onChange={(e) => updateField('latitude', parseFloat(e.target.value))}
                  placeholder="e.g., 23.3441"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude || ''}
                  onChange={(e) => updateField('longitude', parseFloat(e.target.value))}
                  placeholder="e.g., 85.3096"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            {validationErrors.location && (
              <p className="mb-4 text-sm text-red-600">{validationErrors.location}</p>
            )}

            {/* Address */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <div className="relative">
                <textarea
                  value={formData.address || ''}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Address will be auto-filled from GPS, or you can edit it manually"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <Info className="w-3 h-3" />
                  <span>You can edit the address if it's not accurate</span>
                </div>
              </div>
            </div>

            {/* Location Preview with Warning */}
            {formData.latitude && formData.longitude && (
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900 mb-1">Detected Location</p>
                      <p className="text-sm text-blue-800 font-mono">
                        {formData.latitude.toFixed(6)}°N, {formData.longitude.toFixed(6)}°E
                      </p>
                      {formData.address && (
                        <p className="text-sm text-blue-700 mt-2">{formData.address}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Warning about address accuracy */}
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-yellow-800">
                        <strong>Note:</strong> The address shown is approximate based on GPS coordinates. 
                        If it's not accurate, please edit it manually above. The exact coordinates are what matter most.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          </>
          )}

          {/* STEP 4: Media Upload */}
          {currentStep === 4 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Photos & Audio</h2>
              <p className="text-sm text-gray-600">Add photos or audio notes to help us understand the issue better (Optional but recommended)</p>
            </div>
            
            {/* Photos */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos (Max 5, 10MB each)
              </label>
              <div className="space-y-4">
                {/* Upload Button */}
                {photos.length < 5 && (
                  <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors">
                    <Camera className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">Click to upload photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}

                {/* Photo Previews */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {photoPreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        {index === 0 && (
                          <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                            Primary
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  Supported formats: JPEG, PNG, WebP • {photos.length}/5 photos uploaded
                </p>
              </div>
            </div>

            {/* Audio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audio Note (Max 1, 25MB)
              </label>
              <div className="space-y-4">
                {/* Voice Recording Option */}
                {!audioFile && !isRecording && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={startRecording}
                      className="flex items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Mic className="w-5 h-5" />
                      Record Voice Note
                    </button>
                    <div className="text-gray-400 self-center">or</div>
                    <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors">
                      <Mic className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-600">Upload Audio File</span>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* Recording in Progress */}
                {isRecording && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <div>
                          <p className="text-sm font-medium text-red-900">Recording...</p>
                          <p className="text-xs text-red-700">{formatTime(recordingTime)} / 10:00</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        Stop Recording
                      </button>
                    </div>
                  </div>
                )}

                {/* Audio Preview */}
                {audioFile && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Mic className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{audioFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeAudio}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove recording"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Audio Player */}
                    <div className="space-y-2">
                      <audio
                        controls
                        className="w-full"
                        preload="metadata"
                        style={{
                          backgroundColor: '#f3f4f6',
                          borderRadius: '0.375rem',
                          padding: '0.5rem'
                        }}
                      >
                        <source src={URL.createObjectURL(audioFile)} type={audioFile.type} />
                        Your browser does not support the audio element.
                      </audio>
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <span>🔊</span>
                        <span>Click play to verify your recording</span>
                      </p>
                    </div>

                    {/* Recording Actions */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-green-600 font-medium">
                        ✓ Recording saved successfully
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setAudioFile(null);
                          startRecording();
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                      >
                        Record again
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  Record voice notes on-the-go or upload pre-recorded audio files. Supported formats: MP3, WAV, M4A, WebM
                </p>
              </div>
            </div>
          </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={goToPreviousStep}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard/reports')}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNext(e);
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Report...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Create Report
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
