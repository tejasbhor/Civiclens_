import apiClient from './client';

export interface MediaFile {
  id: number;
  report_id: number;
  file_url: string;
  file_type: 'image' | 'audio';
  file_size: number;
  mime_type: string;
  is_primary: boolean;
  is_proof_of_work: boolean;
  caption: string | null;
  upload_source: string | null;
  created_at: string;
}

export const mediaApi = {
  /**
   * Get all media files for a report
   */
  getReportMedia: async (reportId: number): Promise<MediaFile[]> => {
    const response = await apiClient.get(`/media/report/${reportId}`);
    return response.data;
  },

  /**
   * Upload media files (handled by media upload service)
   */
  uploadMedia: async (reportId: number, files: File[]): Promise<any> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await apiClient.post(`/media/upload/${reportId}/bulk`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Delete a media file
   */
  deleteMedia: async (mediaId: number): Promise<void> => {
    await apiClient.delete(`/media/${mediaId}`);
  },

  /**
   * Get upload limits
   */
  getUploadLimits: async (): Promise<any> => {
    const response = await apiClient.get('/media/limits');
    return response.data;
  },
};


