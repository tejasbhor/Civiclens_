/**
 * Media Upload Service
 * Handles uploading photos and videos to backend (MinIO storage)
 * @module shared/services/media/mediaUpload
 */

import { apiClient } from '../api/apiClient';
import { imageOptimizer } from './imageOptimizer';
import { createLogger } from '@shared/utils/logger';

const log = createLogger('MediaUpload');

export interface MediaUploadOptions {
  reportId?: number;
  taskId?: number;
  fileType: 'photo' | 'video';
  compress?: boolean;
}

export interface MediaUploadResponse {
  id: number;
  file_url: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  thumbnail_url?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class MediaUploadService {
  /**
   * Upload a single photo
   */
  async uploadPhoto(
    uri: string,
    options: MediaUploadOptions,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<MediaUploadResponse> {
    try {
      let fileUri = uri;

      // Compress image if requested
      if (options.compress !== false) {
        log.debug('Compressing image');
        const compressed = await imageOptimizer.compressImage(uri);
        fileUri = compressed.uri;
        log.debug('Image compressed successfully');
      }

      // Create form data
      const formData = new FormData();

      // Get filename from URI
      const uriParts = fileUri.split('/');
      const filename = uriParts[uriParts.length - 1] || `photo_${Date.now()}.jpg`;

      // Ensure filename has .jpg extension
      const finalFilename = filename.includes('.') ? filename : `${filename}.jpg`;

      // Append file (React Native format)
      formData.append('file', {
        uri: fileUri,
        type: 'image/jpeg',
        name: finalFilename,
      } as any);

      // Append metadata (matching web client format)
      formData.append('upload_source', 'citizen_submission');
      formData.append('is_proof_of_work', 'false');

      // Validate reportId is provided
      if (!options.reportId) {
        throw new Error('Report ID is required for photo upload');
      }

      log.debug(`Uploading photo to report ${options.reportId}`);

      // Upload with progress tracking (use correct endpoint pattern)
      return await apiClient.post<MediaUploadResponse>(
        `/media/upload/${options.reportId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentage = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress({
                loaded: progressEvent.loaded,
                total: progressEvent.total,
                percentage,
              });
            }
          },
          timeout: 60000, // 60 second timeout for uploads
        }
      );
    } catch (error: any) {
      log.error('Photo upload failed', error);
      
      // Extract error message
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to upload photo';
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Upload multiple photos sequentially
   * Matches web client behavior - uploads one at a time with progress tracking
   */
  async uploadMultiplePhotos(
    uris: string[],
    options: MediaUploadOptions,
    onProgress?: (index: number, progress: UploadProgress) => void
  ): Promise<{ success: MediaUploadResponse[]; failed: number }> {
    const results: MediaUploadResponse[] = [];
    let failedCount = 0;

    log.info(`Starting upload of ${uris.length} photos to report ${options.reportId}`);

    for (let i = 0; i < uris.length; i++) {
      try {
        const result = await this.uploadPhoto(
          uris[i],
          options,
          onProgress ? (progress) => onProgress(i, progress) : undefined
        );
        results.push(result);
        log.debug(`Photo ${i + 1}/${uris.length} uploaded successfully`);
      } catch (error) {
        log.error(`Failed to upload photo ${i + 1}/${uris.length}`, error);
        failedCount++;
      }
    }

    log.info(`Upload complete: ${results.length} succeeded, ${failedCount} failed`);

    return { success: results, failed: failedCount };
  }

  /**
   * Upload video
   */
  async uploadVideo(
    uri: string,
    options: MediaUploadOptions,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<MediaUploadResponse> {
    try {
      const formData = new FormData();

      const filename = uri.split('/').pop() || `video_${Date.now()}.mp4`;

      // Append file (React Native format)
      formData.append('file', {
        uri,
        type: 'video/mp4',
        name: filename,
      } as any);

      // Append metadata (matching web client format)
      formData.append('upload_source', 'citizen_submission');
      formData.append('is_proof_of_work', 'false');

      // Validate reportId is provided
      if (!options.reportId) {
        throw new Error('Report ID is required for video upload');
      }

      log.debug(`Uploading video to report ${options.reportId}`);

      // Upload with progress tracking (use correct endpoint pattern)
      return await apiClient.post<MediaUploadResponse>(
        `/media/upload/${options.reportId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentage = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress({
                loaded: progressEvent.loaded,
                total: progressEvent.total,
                percentage,
              });
            }
          },
        }
      );
    } catch (error: any) {
      log.error('Video upload failed', error);

      // Extract error message
      const errorMessage = error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Failed to upload video';

      throw new Error(errorMessage);
    }
  }

  /**
   * Delete media file
   */
  async deleteMedia(mediaId: number): Promise<void> {
    try {
      await apiClient.delete(`/media/${mediaId}`, {});
    } catch (error: any) {
      log.error('Delete media error:', error);
      throw new Error(error.response?.data?.detail || 'Failed to delete media');
    }
  }

  /**
   * Get media URL
   */
  getMediaUrl(path: string): string {
    // If already a full URL, return as is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    // Otherwise, construct full URL from apiClient
    const client = apiClient.getClient();
    const baseUrl = client.defaults.baseURL?.replace('/api/v1', '') || '';
    return `${baseUrl}${path}`;
  }

  /**
   * Check if file is a local file (needs upload)
   */
  isLocalFile(uri: string): boolean {
    return uri.startsWith('file://') || uri.startsWith('content://');
  }

  /**
   * Upload pending local files
   */
  async uploadPendingFiles(
    files: string[],
    options: MediaUploadOptions,
    onProgress?: (index: number, progress: UploadProgress) => void
  ): Promise<string[]> {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (this.isLocalFile(file)) {
        try {
          const result = await this.uploadPhoto(
            file,
            options,
            (progress) => onProgress?.(i, progress)
          );
          uploadedUrls.push(result.file_url);
        } catch (error) {
          console.error(`Failed to upload file ${i}:`, error);
          // Keep local URI if upload fails
          uploadedUrls.push(file);
        }
      } else {
        // Already uploaded
        uploadedUrls.push(file);
      }
    }

    return uploadedUrls;
  }
}

export const mediaUpload = new MediaUploadService();
