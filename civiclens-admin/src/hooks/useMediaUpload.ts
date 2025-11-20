// Production-Ready Media Upload Hook for CivicLens
import { useState, useCallback, useRef, useEffect } from 'react';
import { MediaFile, BulkUploadResponse, UploadProgress } from '@/types/media';
import { mediaUploadService } from '@/lib/services/media-upload';

interface UseMediaUploadOptions {
    maxImages?: number;
    maxAudio?: number;
    autoUpload?: boolean;
    reportId?: number;
    onUploadComplete?: (results: BulkUploadResponse) => void;
    onUploadError?: (error: string) => void;
    onProgress?: (progress: UploadProgress[]) => void;
}

interface UseMediaUploadReturn {
    // State
    files: MediaFile[];
    uploadProgress: Record<string, number>;
    uploadingFiles: Set<string>;
    processingFiles: Set<string>;
    errors: Record<string, string>;
    warnings: Record<string, string[]>;
    isUploading: boolean;
    isProcessing: boolean;

    // Configuration
    reportId?: number;
    setReportId: (id: number) => void;

    // Actions
    addFiles: (fileList: FileList | File[]) => Promise<void>;
    removeFile: (fileId: string) => void;
    updateCaption: (fileId: string, caption: string) => void;
    uploadFiles: (filesToUpload?: MediaFile[]) => Promise<void>;
    retryUpload: (fileId: string) => Promise<void>;
    clearErrors: () => void;
    clearWarnings: () => void;
    reset: () => void;

    // Computed values
    currentImages: number;
    currentAudio: number;
    totalSize: number;
    hasErrors: boolean;
    hasWarnings: boolean;
    canAddImages: boolean;
    canAddAudio: boolean;
    uploadedFiles: MediaFile[];
    failedFiles: MediaFile[];
}

export function useMediaUpload(options: UseMediaUploadOptions = {}): UseMediaUploadReturn {
    const {
        maxImages = 5,
        maxAudio = 1,
        autoUpload = false,
        reportId: initialReportId,
        onUploadComplete,
        onUploadError,
        onProgress
    } = options;

    // State
    const [files, setFiles] = useState<MediaFile[]>([]);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
    const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [warnings, setWarnings] = useState<Record<string, string[]>>({});
    const [reportId, setReportId] = useState<number | undefined>(initialReportId);

    // Refs for cleanup
    const previewUrlsRef = useRef<Set<string>>(new Set());

    // Cleanup preview URLs on unmount
    useEffect(() => {
        return () => {
            previewUrlsRef.current.forEach(url => {
                mediaUploadService.cleanupPreview(url);
            });
        };
    }, []);

    // Add files with validation and processing
    const addFiles = useCallback(async (fileList: FileList | File[]) => {
        const fileArray = Array.from(fileList);
        const newFiles: MediaFile[] = [];
        const newErrors: Record<string, string> = {};
        const newWarnings: Record<string, string[]> = {};

        for (const file of fileArray) {
            const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Validate file
            const validation = mediaUploadService.validateFile(file, files);

            if (!validation.valid) {
                newErrors[file.name] = validation.error || 'Invalid file';
                continue;
            }

            if (!validation.type) {
                newErrors[file.name] = 'Unable to determine file type';
                continue;
            }

            // Check file name
            const nameValidation = mediaUploadService.validateFileName(file.name);
            if (!nameValidation.valid) {
                newErrors[file.name] = nameValidation.error || 'Invalid file name';
                continue;
            }

            setProcessingFiles(prev => new Set([...prev, fileId]));

            try {
                let processedFile = file;
                let preview = '';

                // Process image files
                if (validation.type === 'image') {
                    try {
                        const { processedFile: compressed } = await mediaUploadService.processImage(file);
                        processedFile = compressed;
                    } catch (error) {
                        console.warn('Image compression failed, using original:', error);
                    }
                }

                // Create preview
                preview = await mediaUploadService.createPreview(processedFile, validation.type);
                if (preview) {
                    previewUrlsRef.current.add(preview);
                }

                const mediaFile: MediaFile = {
                    id: fileId,
                    file: processedFile,
                    type: validation.type,
                    preview,
                    caption: '',
                    size: processedFile.size,
                    name: processedFile.name,
                    lastModified: processedFile.lastModified
                };

                // Store warnings
                if (validation.warnings && validation.warnings.length > 0) {
                    newWarnings[fileId] = validation.warnings;
                }

                newFiles.push(mediaFile);

            } catch (error) {
                console.error('File processing failed:', error);
                newErrors[file.name] = `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            } finally {
                setProcessingFiles(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(fileId);
                    return newSet;
                });
            }
        }

        // Update state
        if (Object.keys(newErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...newErrors }));
        }

        if (Object.keys(newWarnings).length > 0) {
            setWarnings(prev => ({ ...prev, ...newWarnings }));
        }

        if (newFiles.length > 0) {
            setFiles(prev => [...prev, ...newFiles]);

            // Auto-upload if enabled
            if (autoUpload && reportId) {
                await uploadFiles(newFiles);
            }
        }
    }, [files, autoUpload, reportId]);

    // Remove file
    const removeFile = useCallback((fileId: string) => {
        const fileToRemove = files.find(f => f.id === fileId);
        if (fileToRemove?.preview) {
            mediaUploadService.cleanupPreview(fileToRemove.preview);
            previewUrlsRef.current.delete(fileToRemove.preview);
        }

        setFiles(prev => prev.filter(f => f.id !== fileId));

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

        setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
        });
    }, [files]);

    // Update caption
    const updateCaption = useCallback((fileId: string, caption: string) => {
        setFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, caption } : f
        ));
    }, []);

    // Upload files
    const uploadFiles = useCallback(async (filesToUpload: MediaFile[] = files) => {
        if (!reportId || filesToUpload.length === 0) return;

        const uploadingIds = new Set(filesToUpload.map(f => f.id));
        setUploadingFiles(uploadingIds);

        try {
            const results = [];
            const progressArray: UploadProgress[] = [];

            for (const file of filesToUpload) {
                try {
                    // Initialize progress
                    const progressItem: UploadProgress = {
                        fileId: file.id,
                        progress: 0,
                        status: 'uploading'
                    };
                    progressArray.push(progressItem);

                    if (onProgress) {
                        onProgress(progressArray);
                    }

                    const result = await mediaUploadService.uploadSingleFile(
                        reportId,
                        file,
                        (progress) => {
                            setUploadProgress(prev => ({
                                ...prev,
                                [file.id]: progress
                            }));

                            // Update progress array
                            const index = progressArray.findIndex(p => p.fileId === file.id);
                            if (index !== -1) {
                                progressArray[index].progress = progress;
                                if (onProgress) {
                                    onProgress([...progressArray]);
                                }
                            }
                        }
                    );

                    results.push(result);

                    // Mark as uploaded
                    setFiles(prev => prev.map(f =>
                        f.id === file.id ? { ...f, uploaded: true } : f
                    ));

                    // Update progress status
                    const index = progressArray.findIndex(p => p.fileId === file.id);
                    if (index !== -1) {
                        progressArray[index].status = 'completed';
                        progressArray[index].progress = 100;
                        if (onProgress) {
                            onProgress([...progressArray]);
                        }
                    }

                } catch (error) {
                    console.error(`Upload failed for ${file.name}:`, error);
                    const errorMessage = error instanceof Error ? error.message : 'Upload failed';

                    setErrors(prev => ({
                        ...prev,
                        [file.id]: errorMessage
                    }));

                    setFiles(prev => prev.map(f =>
                        f.id === file.id ? { ...f, error: errorMessage } : f
                    ));

                    // Update progress status
                    const index = progressArray.findIndex(p => p.fileId === file.id);
                    if (index !== -1) {
                        progressArray[index].status = 'error';
                        progressArray[index].error = errorMessage;
                        if (onProgress) {
                            onProgress([...progressArray]);
                        }
                    }
                }
            }

            const response: BulkUploadResponse = {
                success: results.length > 0,
                uploaded_count: results.length,
                total_files: filesToUpload.length,
                media: results,
                errors: Object.values(errors)
            };

            if (onUploadComplete) {
                onUploadComplete(response);
            }

        } catch (error) {
            console.error('Bulk upload failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Upload failed';

            if (onUploadError) {
                onUploadError(errorMessage);
            }
        } finally {
            setUploadingFiles(new Set());
            setUploadProgress({});
        }
    }, [files, reportId, onUploadComplete, onUploadError, onProgress, errors]);

    // Retry upload for specific file
    const retryUpload = useCallback(async (fileId: string) => {
        const file = files.find(f => f.id === fileId);
        if (file) {
            // Clear previous error
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fileId];
                return newErrors;
            });

            await uploadFiles([file]);
        }
    }, [files, uploadFiles]);

    // Clear errors
    const clearErrors = useCallback(() => {
        setErrors({});
    }, []);

    // Clear warnings
    const clearWarnings = useCallback(() => {
        setWarnings({});
    }, []);

    // Reset all state
    const reset = useCallback(() => {
        // Cleanup preview URLs
        files.forEach(file => {
            if (file.preview) {
                mediaUploadService.cleanupPreview(file.preview);
            }
        });
        previewUrlsRef.current.clear();

        setFiles([]);
        setUploadProgress({});
        setUploadingFiles(new Set());
        setProcessingFiles(new Set());
        setErrors({});
        setWarnings({});
    }, [files]);

    // Computed values
    const currentImages = files.filter(f => f.type === 'image').length;
    const currentAudio = files.filter(f => f.type === 'audio').length;
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const hasErrors = Object.keys(errors).length > 0;
    const hasWarnings = Object.keys(warnings).length > 0;
    const canAddImages = currentImages < maxImages;
    const canAddAudio = currentAudio < maxAudio;
    const isUploading = uploadingFiles.size > 0;
    const isProcessing = processingFiles.size > 0;
    const uploadedFiles = files.filter(f => f.uploaded);
    const failedFiles = files.filter(f => f.error);

    return {
        // State
        files,
        uploadProgress,
        uploadingFiles,
        processingFiles,
        errors,
        warnings,
        isUploading,
        isProcessing,

        // Configuration
        reportId,
        setReportId,

        // Actions
        addFiles,
        removeFile,
        updateCaption,
        uploadFiles,
        retryUpload,
        clearErrors,
        clearWarnings,
        reset,

        // Computed values
        currentImages,
        currentAudio,
        totalSize,
        hasErrors,
        hasWarnings,
        canAddImages,
        canAddAudio,
        uploadedFiles,
        failedFiles
    };
}