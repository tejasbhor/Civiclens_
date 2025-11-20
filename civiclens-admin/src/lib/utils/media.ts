/**
 * Media URL Utilities
 * Handles proper URL construction for media files
 */

/**
 * Get the base URL for the backend server (without /api/v1)
 */
export const getBackendBaseUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
  // Remove /api/v1 from the end if present
  return apiUrl.replace(/\/api\/v1\/?$/, '');
};

/**
 * Construct a proper media URL from a file_url
 * Handles both absolute URLs and relative paths
 * 
 * @param fileUrl - The file_url from the backend (e.g., "/media/reports/29/file.jpg")
 * @returns Complete URL to access the media file
 */
export const getMediaUrl = (fileUrl: string): string => {
  if (!fileUrl) {
    return '';
  }

  // If it's already a complete URL (starts with http:// or https://), return as-is
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }

  // If it's a relative path, construct the full URL
  // Media files are served at http://localhost:8000/media/... (NOT /api/v1/media/...)
  const backendBaseUrl = getBackendBaseUrl();
  
  // Ensure the path starts with /
  const path = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  
  return `${backendBaseUrl}${path}`;
};

/**
 * Get a thumbnail URL for an image (if available)
 * Falls back to the original URL if no thumbnail exists
 */
export const getThumbnailUrl = (fileUrl: string): string => {
  // For now, just return the original URL
  // In the future, we can implement thumbnail generation
  return getMediaUrl(fileUrl);
};

/**
 * Check if a file URL is an image
 */
export const isImageUrl = (fileUrl: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const lowerUrl = fileUrl.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.endsWith(ext));
};

/**
 * Check if a file URL is an audio file
 */
export const isAudioUrl = (fileUrl: string): boolean => {
  const audioExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.aac'];
  const lowerUrl = fileUrl.toLowerCase();
  return audioExtensions.some(ext => lowerUrl.endsWith(ext));
};

/**
 * Check if a file URL is a video file
 */
export const isVideoUrl = (fileUrl: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
  const lowerUrl = fileUrl.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.endsWith(ext));
};

/**
 * Format file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
