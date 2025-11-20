'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { reportsApi, CreateReportRequest } from '@/lib/api/reports';
import { mediaApi } from '@/lib/api/media';
import { toast } from 'sonner';

interface Department {
  id: number;
  name: string;
  description?: string;
  keywords?: string;
}

interface ValidationErrors {
  [key: string]: string;
}

interface UseCreateReportReturn {
  // Form state
  formData: CreateReportRequest;
  updateField: (field: keyof CreateReportRequest, value: any) => void;
  
  // Steps
  currentStep: number;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  setCurrentStep: (step: number) => void;
  
  // Mode
  mode: 'citizen' | 'admin';
  setMode: (mode: 'citizen' | 'admin') => void;
  
  // Validation
  validationErrors: ValidationErrors;
  validateCurrentStep: () => boolean;
  
  // Location
  gettingLocation: boolean;
  locationAccuracy: number | null;
  getCurrentLocation: () => void;
  
  // Media
  photos: File[];
  photoPreviews: string[];
  addPhoto: (file: File) => void;
  removePhoto: (index: number) => void;
  audioFile: File | null;
  setAudioFile: (file: File | null) => void;
  
  // Submission
  loading: boolean;
  success: boolean;
  error: string | null;
  handleSubmit: () => Promise<void>;
  
  // Departments
  departments: Department[];
  departmentsLoading: boolean;
}

const TITLE_MIN_LENGTH = 5;
const TITLE_MAX_LENGTH = 255;
const DESCRIPTION_MIN_LENGTH = 10;
const DESCRIPTION_MAX_LENGTH = 2000;
const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function useCreateReport(): UseCreateReportReturn {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [mode, setMode] = useState<'citizen' | 'admin'>('citizen');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  
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
  
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  
  // Cleanup photo previews
  useEffect(() => {
    return () => {
      photoPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [photoPreviews]);
  
  // Fetch departments (cached)
  useEffect(() => {
    const fetchDepartments = async () => {
      // Check cache first
      const cached = sessionStorage.getItem('departments_cache');
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          // Cache for 5 minutes
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            setDepartments(data);
            return;
          }
        } catch (e) {
          // Invalid cache, fetch fresh
        }
      }
      
      setDepartmentsLoading(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/departments`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setDepartments(data);
          // Cache for 5 minutes
          sessionStorage.setItem('departments_cache', JSON.stringify({
            data,
            timestamp: Date.now(),
          }));
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        toast.error('Failed to load departments');
      } finally {
        setDepartmentsLoading(false);
      }
    };
    
    fetchDepartments();
  }, []);
  
  // Update form field
  const updateField = useCallback((field: keyof CreateReportRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [validationErrors]);
  
  // Get user's current location
  const getCurrentLocation = useCallback(() => {
    setGettingLocation(true);
    setError(null);
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setGettingLocation(false);
      toast.error('Geolocation not supported');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setFormData(prev => ({ ...prev, latitude, longitude }));
        setLocationAccuracy(accuracy);
        setGettingLocation(false);
        toast.success('Location acquired');
        
        // Reverse geocode
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?` +
            `format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { 'User-Agent': 'CivicLens/1.0' } }
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.display_name) {
              setFormData(prev => ({ ...prev, address: data.display_name }));
            }
          }
        } catch (err) {
          console.error('Reverse geocoding failed:', err);
        }
      },
      (error) => {
        setError(`Location error: ${error.message}`);
        setGettingLocation(false);
        toast.error(`Failed to get location: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);
  
  // Validate current step
  const validateCurrentStep = useCallback((): boolean => {
    const errors: ValidationErrors = {};
    
    if (currentStep === 1) return true; // Mode selection
    
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
  }, [currentStep, formData, mode]);
  
  // Navigation
  const goToNextStep = useCallback(() => {
    if (validateCurrentStep() && currentStep < 4) {
      setCurrentStep(prev => prev + 1);
      setError(null);
    }
  }, [currentStep, validateCurrentStep]);
  
  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setError(null);
    }
  }, [currentStep]);
  
  // Media handling
  const addPhoto = useCallback((file: File) => {
    if (photos.length >= MAX_PHOTOS) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 10MB');
      return;
    }
    
    setPhotos(prev => [...prev, file]);
    setPhotoPreviews(prev => [...prev, URL.createObjectURL(file)]);
  }, [photos.length]);
  
  const removePhoto = useCallback((index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  }, [photoPreviews]);
  
  // Submit
  const handleSubmit = useCallback(async () => {
    if (currentStep !== 4) {
      toast.error('Please complete all steps');
      return;
    }
    
    if (!validateCurrentStep()) {
      toast.error('Please fix validation errors');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const reportData: CreateReportRequest = {
        title: formData.title,
        description: formData.description,
        latitude: formData.latitude,
        longitude: formData.longitude,
        address: formData.address || undefined,
      };
      
      if (mode === 'admin') {
        reportData.category = formData.category || undefined;
        reportData.sub_category = formData.sub_category || undefined;
        reportData.severity = formData.severity;
      }
      
      const report = await reportsApi.createReport(reportData);
      toast.success('Report created successfully!');
      
      // Upload media if any
      if (photos.length > 0 || audioFile) {
        const mediaFiles: File[] = [...photos];
        if (audioFile) mediaFiles.push(audioFile);
        
        try {
          await mediaApi.uploadMedia(report.id, mediaFiles);
          toast.success('Media uploaded successfully!');
        } catch (mediaError: any) {
          console.error('Failed to upload media:', mediaError);
          toast.warning('Report created but media upload failed. You can add media later.');
        }
      }
      
      setSuccess(true);
      setTimeout(() => router.push('/dashboard/reports'), 2000);
      
    } catch (err: any) {
      console.error('Failed to create report:', err);
      const errorMsg = err?.response?.data?.detail || err?.message || 'Failed to create report';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [currentStep, formData, mode, photos, audioFile, validateCurrentStep, router]);
  
  return {
    formData,
    updateField,
    currentStep,
    goToNextStep,
    goToPreviousStep,
    setCurrentStep,
    mode,
    setMode,
    validationErrors,
    validateCurrentStep,
    gettingLocation,
    locationAccuracy,
    getCurrentLocation,
    photos,
    photoPreviews,
    addPhoto,
    removePhoto,
    audioFile,
    setAudioFile,
    loading,
    success,
    error,
    handleSubmit,
    departments,
    departmentsLoading,
  };
}
