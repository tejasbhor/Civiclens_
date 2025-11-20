"use client";

import React from 'react';
import { useCreateReport } from '@/lib/hooks/useCreateReport';
import {
  FileText,
  MapPin,
  AlertCircle,
  CheckCircle,
  Loader2,
  Camera,
  X,
  ChevronRight,
  ChevronLeft,
  Target,
  MapPinned,
  Info,
  AlertTriangle,
  Mic,
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

const steps = [
  { number: 1, label: 'Mode', icon: FileText },
  { number: 2, label: 'Details', icon: AlertCircle },
  { number: 3, label: 'Location', icon: MapPin },
  { number: 4, label: 'Media', icon: Camera },
];

export default function CreateReportPage() {
  const {
    formData,
    updateField,
    currentStep,
    goToNextStep,
    goToPreviousStep,
    mode,
    setMode,
    validationErrors,
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
  } = useCreateReport();

  const progressPercentage = (currentStep / 4) * 100;

  // Success screen
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

  // Handle photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024) {
        addPhoto(file);
      }
    });
  };

  // Handle audio upload
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/') && file.size <= 25 * 1024 * 1024) {
      setAudioFile(file);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div>
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
            
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary-600 to-primary-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div>
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

        <form onSubmit={(e) => { e.preventDefault(); if (currentStep === 4) handleSubmit(); }}>
          
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
                  placeholder="Brief title of the issue (5-255 characters)"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  maxLength={255}
                />
                {validationErrors.title && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">{formData.title.length}/255</p>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Detailed description of the issue (10-2000 characters)"
                  rows={5}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                    validationErrors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  maxLength={2000}
                />
                {validationErrors.description && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">{formData.description.length}/2000</p>
              </div>
            </div>
          )}

          {/* STEP 3: Location & Classification */}
          {currentStep === 3 && (
            <>
              {/* Admin Mode: Category & Severity */}
              {mode === 'admin' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Manual Classification</h2>
                  
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
                          <div className="text-sm font-semibold text-gray-900">{cat.label}</div>
                          <div className="text-xs text-gray-500 mt-1">{cat.description}</div>
                        </button>
                      ))}
                    </div>
                    {validationErrors.category && (
                      <p className="mt-2 text-sm text-red-600">{validationErrors.category}</p>
                    )}
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
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-sm font-bold text-gray-900">{sev.label}</div>
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
                        <span className="font-medium">Use Current Location</span>
                      </>
                    )}
                  </button>
                  {locationAccuracy && (
                    <div className="mt-2 text-sm text-gray-600 text-center">
                      Accuracy: {Math.round(locationAccuracy)}m
                    </div>
                  )}
                </div>

                {/* Coordinates Display */}
                {formData.latitude && formData.longitude ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Location Set:</strong> {formData.latitude.toFixed(6)}°N, {formData.longitude.toFixed(6)}°E
                    </p>
                    {formData.address && (
                      <p className="text-sm text-green-700 mt-1">{formData.address}</p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Please set your location to continue
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* STEP 4: Media Upload */}
          {currentStep === 4 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Media Attachments (Optional)</h2>
              
              {/* Photo Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photos (Max 5, up to 10MB each)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                
                {/* Photo Previews */}
                {photos.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                    {photoPreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audio Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voice Note (Up to 25MB)
                </label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                
                {audioFile && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-purple-800">{audioFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAudioFile(null)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={goToPreviousStep}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="font-medium">Previous</span>
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={goToNextStep}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <span className="font-medium">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="font-medium">Creating Report...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Create Report</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
