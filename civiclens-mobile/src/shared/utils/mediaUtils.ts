/**
 * Media URL Utilities
 * Centralized helper functions for constructing media URLs
 */

import { ENV } from '@shared/config/env';

/**
 * Get the full media URL from a file_url
 * Handles both absolute URLs and relative paths
 * Also fixes localhost URLs from backend
 * 
 * @param url - The file_url from the backend
 * @returns Complete URL to access the media file
 */
export const getMediaUrl = (url: string): string => {
  if (!url) return '';
  
  // If already a full URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Replace localhost with detected MinIO host
    if (url.includes('localhost:9000') || url.includes('127.0.0.1:9000')) {
      const fixedUrl = url
        .replace('localhost:9000', ENV.MINIO_BASE_URL.replace('http://', '').replace('https://', ''))
        .replace('127.0.0.1:9000', ENV.MINIO_BASE_URL.replace('http://', '').replace('https://', ''));
      
      console.log('🔧 Fixed localhost URL:', url, '→', fixedUrl);
      return fixedUrl;
    }
    return url;
  }
  
  // For relative URLs, construct full URL with MinIO endpoint
  const fullUrl = url.startsWith('/') 
    ? `${ENV.MINIO_BASE_URL}${url}` 
    : `${ENV.MINIO_BASE_URL}/${url}`;
  
  return fullUrl;
};

/**
 * Get thumbnail URL for an image
 * Falls back to original URL if no thumbnail exists
 */
export const getThumbnailUrl = (url: string): string => {
  // For now, return the original URL
  // In the future, we can implement thumbnail generation
  return getMediaUrl(url);
};

/**
 * Check if a URL is a valid media URL
 */
export const isValidMediaUrl = (url: string): boolean => {
  if (!url) return false;
  
  try {
    const fullUrl = getMediaUrl(url);
    new URL(fullUrl);
    return true;
  } catch {
    return false;
  }
};
