/**
 * Media types matching backend enums
 * Ensures consistency with backend app/models/media.py
 */

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
}

export enum UploadSource {
  CITIZEN_SUBMISSION = 'citizen_submission',
  OFFICER_BEFORE_PHOTO = 'officer_before_photo',
  OFFICER_AFTER_PHOTO = 'officer_after_photo',
}

export interface Media {
  id: number;
  report_id: number;
  file_url: string;
  file_type: MediaType;
  file_size?: number;
  mime_type?: string;
  is_primary: boolean;
  is_proof_of_work?: boolean;
  sequence_order?: number;
  caption?: string;
  upload_source?: UploadSource;
  created_at?: string;
}

export interface MediaUploadRequest {
  report_id: number;
  file_type: MediaType;
  upload_source: UploadSource;
  is_primary?: boolean;
  caption?: string;
}

export interface MediaUploadResponse {
  id: number;
  file_url: string;
  file_type: MediaType;
  file_size: number;
  mime_type: string;
  thumbnail_url?: string;
  upload_source: UploadSource;
}
