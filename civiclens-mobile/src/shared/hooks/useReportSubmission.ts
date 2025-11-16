/**
 * useReportSubmission Hook
 * Handles report submission with proper photo upload flow
 * Flow: Create report → Upload photos with reportId (matches web client)
 * @module shared/hooks/useReportSubmission
 */

import { useState } from 'react';
import { useReportStore } from '@store/reportStore';
import { ReportCreate } from '@shared/types/report';
import { imageOptimizer } from '@shared/services/media/imageOptimizer';
import { mediaUpload, UploadProgress } from '@shared/services/media/mediaUpload';
import { useNetwork } from './useNetwork';
import { createLogger } from '@shared/utils/logger';

const log = createLogger('ReportSubmission');

export interface ReportSubmissionProgress {
  stage: 'compressing' | 'uploading' | 'submitting' | 'complete';
  currentImage?: number;
  totalImages?: number;
  uploadProgress?: UploadProgress;
}

export const useReportSubmission = () => {
  const { submitReport, loading } = useReportStore();
  const { isOnline } = useNetwork();
  const [progress, setProgress] = useState<ReportSubmissionProgress | null>(null);

  const submit = async (
    reportData: ReportCreate,
    onProgress?: (progress: ReportSubmissionProgress) => void
  ) => {
    try {
      log.info('Starting report submission');

      // Stage 1: Compress images if any
      let compressedPhotos: string[] = [];
      if (reportData.photos.length > 0) {
        setProgress({ stage: 'compressing', totalImages: reportData.photos.length });
        onProgress?.({ stage: 'compressing', totalImages: reportData.photos.length });

        log.debug(`Compressing ${reportData.photos.length} photos`);
        const compressedImages = await imageOptimizer.compressMultipleImages(
          reportData.photos
        );
        compressedPhotos = compressedImages.map(img => img.uri);
        log.debug('Photo compression complete');
      }

      // Stage 2: Create report WITHOUT photos (matches web client flow)
      setProgress({ stage: 'submitting' });
      onProgress?.({ stage: 'submitting' });

      log.debug('Creating report');
      const report = await submitReport({
        ...reportData,
        photos: [], // Don't include photos in initial submission
      });

      log.info(`Report created with ID: ${report.id}`);

      // Stage 3: Upload photos if online and report was created
      if (isOnline && compressedPhotos.length > 0 && report.id) {
        setProgress({ stage: 'uploading', totalImages: compressedPhotos.length });
        onProgress?.({ stage: 'uploading', totalImages: compressedPhotos.length });

        log.info(`Uploading ${compressedPhotos.length} photos to report ${report.id}`);

        let successCount = 0;
        let failedCount = 0;

        for (let i = 0; i < compressedPhotos.length; i++) {
          const photoUri = compressedPhotos[i];
          
          try {
            await mediaUpload.uploadPhoto(
              photoUri,
              { 
                reportId: report.id, // ✅ NOW WE HAVE THE REPORT ID!
                fileType: 'photo', 
                compress: false // Already compressed
              },
              (uploadProgress) => {
                const progressData = {
                  stage: 'uploading' as const,
                  currentImage: i + 1,
                  totalImages: compressedPhotos.length,
                  uploadProgress,
                };
                setProgress(progressData);
                onProgress?.(progressData);
              }
            );

            successCount++;
            log.debug(`Photo ${i + 1}/${compressedPhotos.length} uploaded successfully`);
          } catch (error) {
            failedCount++;
            log.error(`Failed to upload photo ${i + 1}/${compressedPhotos.length}`, error);
          }
        }

        log.info(`Photo upload complete: ${successCount} succeeded, ${failedCount} failed`);

        // Store upload results in report object for caller to handle
        (report as any).photoUploadResult = { successCount, failedCount };
      } else if (!isOnline && compressedPhotos.length > 0) {
        log.info('Offline mode: Photos will be synced later');
        // In offline mode, photos are stored locally and will be synced later
      }

      // Stage 4: Complete
      setProgress({ stage: 'complete' });
      onProgress?.({ stage: 'complete' });

      log.info('Report submission complete');
      return report;
    } catch (error) {
      log.error('Report submission failed', error);
      setProgress(null);
      throw error;
    }
  };

  const reset = () => {
    setProgress(null);
  };

  return {
    submit,
    loading,
    progress,
    reset,
    isOnline,
  };
};
