"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Mic, 
  Play, 
  Pause, 
  Square,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileImage,
  Volume2,
  Trash2,
  Eye,
  Camera,
  RotateCcw,
  Maximize2,
  Download,
  Info,
  Zap,
  Shield,
  Clock
} from 'lucide-react';
import { MediaFile, MediaValidationResult, UploadProgress } from '@/types/media';
import { mediaUploadService } from '@/lib/services/media-upload';

interface MediaUploaderProps {
  onFilesChange: (files: MediaFile[]) => void;
  maxImages?: number;
  maxAudio?: number;
  disabled?: boolean;
  reportId?: number;
  autoUpload?: boolean;
  onUploadComplete?: (results: any) => void;
  onUploadError?: (error: string) => void;
}

export function MediaUploader({ 
  onFilesChange, 
  maxImages = 5, 
  maxAudio = 1, 
  disabled = false,
  reportId,
  autoUpload = false,
  onUploadComplete,
  onUploadError
}: MediaUploaderProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string[]>>({});
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [compressionEnabled, setCompressionEnabled] = useState(true);
  const [uploadLimits, setUploadLimits] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load upload limits on component mount
  useEffect(() => {
    const loadLimits = async () => {
      try {
        const limits = await mediaUploadService.getUploadLimits();
        setUploadLimits(limits);
      } catch (error) {
        console.warn('Failed to load upload limits, using defaults:', error);
        // Set default limits if API fails
        setUploadLimits({
          limits: {
            max_images_per_report: maxImages,
            max_audio_per_report: maxAudio,
            max_image_size_mb: 10,
            max_audio_size_mb: 25,
          },
          supported_types: {
            images: {
              formats: ['JPEG', 'PNG', 'WebP'],
              extensions: ['.jpg', '.jpeg', '.png', '.webp'],
              mime_types: ['image/jpeg', 'image/png', 'image/webp']
            },
            audio: {
              formats: ['MP3', 'WAV', 'M4A'],
              extensions: ['.mp3', '.wav', '.m4a'],
              mime_types: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a']
            }
          }
        });
      }
    };
    loadLimits();
  }, [maxImages, maxAudio]);

  // File validation with enhanced error handling
  const validateFile = useCallback((file: File): MediaValidationResult => {
    // Basic file validation
    const validation = mediaUploadService.validateFile(file, files);
    
    // Additional client-side validations
    if (validation.valid) {
      const fileNameValidation = mediaUploadService.validateFileName(file.name);
      if (!fileNameValidation.valid) {
        return {
          valid: false,
          error: fileNameValidation.error
        };
      }
    }
    
    return validation;
  }, [files]);

  // Enhanced file processing with compression and metadata extraction
  const processFile = useCallback(async (file: File, validation: MediaValidationResult): Promise<MediaFile> => {
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setProcessingFiles(prev => new Set([...prev, fileId]));
    
    try {
      let processedFile = file;
      let preview = '';
      
      if (validation.type === 'image' && compressionEnabled) {
        try {
          const { processedFile: compressed } = await mediaUploadService.processImage(file);
          processedFile = compressed;
        } catch (error) {
          console.warn('Image compression failed, using original:', error);
        }
      }
      
      // Create preview
      if (validation.type) {
        preview = await mediaUploadService.createPreview(processedFile, validation.type);
      }
      
      const mediaFile: MediaFile = {
        id: fileId,
        file: processedFile,
        type: validation.type!,
        preview,
        caption: '',
        size: processedFile.size,
        name: processedFile.name,
        lastModified: processedFile.lastModified
      };
      
      // Store warnings if any
      if (validation.warnings && validation.warnings.length > 0) {
        setWarnings(prev => ({
          ...prev,
          [fileId]: validation.warnings!
        }));
      }
      
      return mediaFile;
    } finally {
      setProcessingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  }, [compressionEnabled]);

  // Handle file selection with enhanced processing
  const handleFiles = useCallback(async (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    const newFiles: MediaFile[] = [];
    const newErrors: Record<string, string> = {};
    
    for (const file of fileArray) {
      const validation = validateFile(file);
      
      if (validation.valid && validation.type) {
        try {
          const mediaFile = await processFile(file, validation);
          newFiles.push(mediaFile);
        } catch (error) {
          console.error('File processing failed:', error);
          newErrors[file.name] = `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      } else {
        newErrors[file.name] = validation.error || 'Invalid file';
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
    }
    
    if (newFiles.length > 0) {
      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      onFilesChange(updatedFiles);
      
      // Auto-upload if enabled and reportId is provided
      if (autoUpload && reportId) {
        uploadFiles(newFiles);
      }
    }
  }, [files, validateFile, processFile, autoUpload, reportId]);

  // Upload files with progress tracking
  const uploadFiles = useCallback(async (filesToUpload: MediaFile[] = files) => {
    if (!reportId || filesToUpload.length === 0) return;
    
    const uploadingIds = new Set(filesToUpload.map(f => f.id));
    setUploadingFiles(uploadingIds);
    
    try {
      // Upload files individually for better progress tracking
      const results = [];
      
      for (const file of filesToUpload) {
        try {
          const result = await mediaUploadService.uploadSingleFile(
            reportId,
            file,
            (progress) => {
              setUploadProgress(prev => ({
                ...prev,
                [file.id]: progress
              }));
            }
          );
          
          results.push(result);
          
          // Mark as uploaded
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, uploaded: true } : f
          ));
          
        } catch (error) {
          console.error(`Upload failed for ${file.name}:`, error);
          setErrors(prev => ({
            ...prev,
            [file.id]: error instanceof Error ? error.message : 'Upload failed'
          }));
          
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, error: error instanceof Error ? error.message : 'Upload failed' } : f
          ));
        }
      }
      
      if (onUploadComplete) {
        onUploadComplete(results);
      }
      
    } catch (error) {
      console.error('Bulk upload failed:', error);
      if (onUploadError) {
        onUploadError(error instanceof Error ? error.message : 'Upload failed');
      }
    } finally {
      setUploadingFiles(new Set());
      setUploadProgress({});
    }
  }, [files, reportId, onUploadComplete, onUploadError]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [disabled, handleFiles]);

  // File input change
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  // Remove file with cleanup
  const removeFile = useCallback((fileId: string) => {
    const fileToRemove = files.find(f => f.id === fileId);
    if (fileToRemove?.preview) {
      mediaUploadService.cleanupPreview(fileToRemove.preview);
    }
    
    const updatedFiles = files.filter(f => f.id !== fileId);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
    
    // Clean up associated state
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fileId];
      return newErrors;
    });
    
    setWarnings(prev => {
      const newWarnings = { ...prev };
      delete newWarnings[fileId];
      return newWarnings;
    });
  }, [files, onFilesChange]);

  // Update caption
  const updateCaption = useCallback((fileId: string, caption: string) => {
    const updatedFiles = files.map(f => 
      f.id === fileId ? { ...f, caption } : f
    );
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  }, [files, onFilesChange]);

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.wav`, { type: 'audio/wav' });
        
        handleFiles([audioFile]);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 600) { // 10 minutes max
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setErrors(prev => ({
        ...prev,
        recording: 'Unable to access microphone. Please check permissions.'
      }));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Retry upload for failed files
  const retryUpload = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      uploadFiles([file]);
    }
  };

  const currentImages = files.filter(f => f.type === 'image').length;
  const currentAudio = files.filter(f => f.type === 'audio').length;
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const hasErrors = Object.keys(errors).length > 0;
  const hasWarnings = Object.keys(warnings).length > 0;
  const isProcessing = processingFiles.size > 0;
  const isUploading = uploadingFiles.size > 0;

  return (
    <div className="space-y-6">
      {/* Upload Configuration Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-blue-900">Upload Settings</h4>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2 text-blue-700">
              <input
                type="checkbox"
                checked={compressionEnabled}
                onChange={(e) => setCompressionEnabled(e.target.checked)}
                className="rounded border-blue-300"
              />
              <Zap className="w-4 h-4" />
              Auto-compress images
            </label>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center p-2 bg-white rounded border">
            <div className="font-medium text-gray-900">{currentImages}/{maxImages}</div>
            <div className="text-gray-500">Images</div>
          </div>
          <div className="text-center p-2 bg-white rounded border">
            <div className="font-medium text-gray-900">{currentAudio}/{maxAudio}</div>
            <div className="text-gray-500">Audio</div>
          </div>
          <div className="text-center p-2 bg-white rounded border">
            <div className="font-medium text-gray-900">{mediaUploadService.formatFileSize(totalSize)}</div>
            <div className="text-gray-500">Total Size</div>
          </div>
          <div className="text-center p-2 bg-white rounded border">
            <div className="font-medium text-gray-900">{files.length}</div>
            <div className="text-gray-500">Files</div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {hasErrors && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h4 className="font-medium text-red-900">Upload Errors</h4>
          </div>
          <div className="space-y-1">
            {Object.entries(errors).map(([key, error]) => (
              <div key={key} className="text-sm text-red-700 flex items-center justify-between">
                <span>{error}</span>
                {files.find(f => f.id === key) && (
                  <button
                    onClick={() => retryUpload(key)}
                    className="text-red-600 hover:text-red-800 text-xs underline"
                  >
                    Retry
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning Display */}
      {hasWarnings && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-5 h-5 text-yellow-600" />
            <h4 className="font-medium text-yellow-900">Warnings</h4>
          </div>
          <div className="space-y-1">
            {Object.entries(warnings).map(([fileId, fileWarnings]) => (
              <div key={fileId} className="text-sm text-yellow-700">
                {fileWarnings.map((warning, index) => (
                  <div key={index}>• {warning}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Upload Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            📸 Add Photos ({currentImages}/{maxImages})
          </label>
          {currentImages > 0 && (
            <span className="text-xs text-gray-500">
              Drag to reorder • Click to edit caption
            </span>
          )}
        </div>
        
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 ${
            dragActive 
              ? 'border-blue-500 bg-blue-50 scale-105' 
              : disabled 
                ? 'border-gray-200 bg-gray-50' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled || currentImages >= maxImages}
          />
          
          <div className="text-center">
            {isProcessing ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="mt-2 text-sm text-blue-600">Processing images...</p>
              </div>
            ) : (
              <>
                <ImageIcon className={`mx-auto h-12 w-12 ${disabled ? 'text-gray-300' : 'text-gray-400'}`} />
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || currentImages >= maxImages}
                    className="text-blue-600 hover:text-blue-500 font-medium disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {currentImages >= maxImages ? 'Maximum images reached' : 'Click to browse images'}
                  </button>
                  <p className="text-gray-500 text-sm mt-1">
                    or drag and drop images here
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  JPEG, PNG, WebP up to 10MB each
                  {compressionEnabled && ' • Auto-compression enabled'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Image Previews */}
        {files.filter(f => f.type === 'image').length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {files.filter(f => f.type === 'image').map((file) => (
              <div key={file.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200 relative">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt="Preview"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setShowPreview(file.preview!)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileImage className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Upload Progress */}
                  {uploadingFiles.has(file.id) && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        <div className="text-sm">
                          {uploadProgress[file.id] ? `${Math.round(uploadProgress[file.id])}%` : 'Uploading...'}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Upload Status */}
                  {file.uploaded && (
                    <div className="absolute top-2 left-2 p-1 bg-green-500 text-white rounded-full">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  )}
                  
                  {file.error && (
                    <div className="absolute top-2 left-2 p-1 bg-red-500 text-white rounded-full">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setShowPreview(file.preview!)}
                      className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* File Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-white text-xs">
                      <div className="font-medium truncate">{file.name}</div>
                      <div>{mediaUploadService.formatFileSize(file.size)}</div>
                    </div>
                  </div>
                </div>
                
                {/* Caption input */}
                <input
                  type="text"
                  placeholder="Add caption (optional)"
                  value={file.caption || ''}
                  onChange={(e) => updateCaption(file.id, e.target.value)}
                  className="mt-2 w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                
                {/* File warnings */}
                {warnings[file.id] && (
                  <div className="mt-1 text-xs text-yellow-600">
                    {warnings[file.id].map((warning, index) => (
                      <div key={index}>⚠️ {warning}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audio Recording Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          🎤 Add Voice Note ({currentAudio}/{maxAudio}) {currentAudio >= maxAudio && '- Maximum reached'}
        </label>
        
        <div className="border border-gray-300 rounded-lg p-4">
          {!isRecording && currentAudio < maxAudio && (
            <div className="text-center">
              <button
                type="button"
                onClick={startRecording}
                disabled={disabled}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Mic className="w-4 h-4" />
                Start Recording
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Maximum 10 minutes • High-quality audio recording
              </p>
            </div>
          )}
          
          {isRecording && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-600 font-medium">Recording...</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-mono text-lg">{formatTime(recordingTime)}</span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop Recording
              </button>
            </div>
          )}
          
          {/* Audio file preview */}
          {files.filter(f => f.type === 'audio').map((file) => (
            <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mt-4">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {mediaUploadService.formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {uploadingFiles.has(file.id) && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">
                      {uploadProgress[file.id] ? `${Math.round(uploadProgress[file.id])}%` : 'Uploading...'}
                    </span>
                  </div>
                )}
                
                {file.uploaded && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                
                {file.error && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1 text-red-500 hover:text-red-700 transition-colors"
                  title="Remove audio file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Summary */}
      {files.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-800">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Ready to Upload</span>
            </div>
            
            {reportId && !autoUpload && (
              <button
                onClick={() => uploadFiles()}
                disabled={isUploading || files.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Files
                  </>
                )}
              </button>
            )}
          </div>
          
          <p className="text-blue-700 text-sm mt-1">
            {files.length} file{files.length !== 1 ? 's' : ''} selected 
            ({files.filter(f => f.type === 'image').length} image{files.filter(f => f.type === 'image').length !== 1 ? 's' : ''}, {files.filter(f => f.type === 'audio').length} audio)
            • Total size: {mediaUploadService.formatFileSize(totalSize)}
          </p>
        </div>
      )}

      {/* Image Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <img
              src={showPreview}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setShowPreview(null)}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}