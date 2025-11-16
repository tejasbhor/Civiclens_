/**
 * Image Optimizer Service
 * Handles image compression, thumbnail generation, and local storage
 * Uses expo-image-manipulator and expo-file-system (SDK 54+)
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  targetSizeKB?: number;
}

export interface OptimizedImage {
  uri: string;
  width: number;
  height: number;
  sizeKB: number;
}

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
}

class ImageOptimizerService {
  private readonly DEFAULT_MAX_WIDTH = 1920;
  private readonly DEFAULT_MAX_HEIGHT = 1080;
  private readonly DEFAULT_QUALITY = 0.8;
  private readonly TARGET_SIZE_KB = 500;
  private readonly THUMBNAIL_SIZE = 300;
  private readonly THUMBNAIL_QUALITY = 0.7;

  /**
   * Compress image to target size
   */
  async compressImage(
    uri: string,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImage> {
    try {
      const {
        maxWidth = this.DEFAULT_MAX_WIDTH,
        maxHeight = this.DEFAULT_MAX_HEIGHT,
        quality = this.DEFAULT_QUALITY,
        targetSizeKB = this.TARGET_SIZE_KB,
      } = options;

      // Get original image info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('Image file not found');
      }

      const originalSizeKB = fileInfo.size / 1024;

      // If already under target size, return as is
      if (originalSizeKB <= targetSizeKB) {
        const imageInfo = await this.getImageDimensions(uri);
        return {
          uri,
          width: imageInfo.width,
          height: imageInfo.height,
          sizeKB: originalSizeKB,
        };
      }

      // Compress image
      let currentQuality = quality;
      let compressedUri = uri;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        const result = await ImageManipulator.manipulateAsync(
          compressedUri,
          [
            {
              resize: {
                width: maxWidth,
                height: maxHeight,
              },
            },
          ],
          {
            compress: currentQuality,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        const resultInfo = await FileSystem.getInfoAsync(result.uri);
        const resultSizeKB = resultInfo.size / 1024;

        if (resultSizeKB <= targetSizeKB || currentQuality <= 0.3) {
          // Success or reached minimum quality
          return {
            uri: result.uri,
            width: result.width,
            height: result.height,
            sizeKB: resultSizeKB,
          };
        }

        // Reduce quality for next attempt
        compressedUri = result.uri;
        currentQuality -= 0.1;
        attempts++;
      }

      // Return best attempt
      const finalInfo = await FileSystem.getInfoAsync(compressedUri);
      const imageInfo = await this.getImageDimensions(compressedUri);

      return {
        uri: compressedUri,
        width: imageInfo.width,
        height: imageInfo.height,
        sizeKB: finalInfo.size / 1024,
      };
    } catch (error) {
      console.error('Image compression error:', error);
      throw new Error('Failed to compress image');
    }
  }

  /**
   * Generate thumbnail from image
   */
  async generateThumbnail(
    uri: string,
    options: ThumbnailOptions = {}
  ): Promise<OptimizedImage> {
    try {
      const {
        width = this.THUMBNAIL_SIZE,
        height = this.THUMBNAIL_SIZE,
        quality = this.THUMBNAIL_QUALITY,
      } = options;

      const result = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width,
              height,
            },
          },
        ],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      const fileInfo = await FileSystem.getInfoAsync(result.uri);

      return {
        uri: result.uri,
        width: result.width,
        height: result.height,
        sizeKB: fileInfo.size / 1024,
      };
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      throw new Error('Failed to generate thumbnail');
    }
  }

  /**
   * Save image to local storage
   */
  async saveToLocalStorage(uri: string, filename: string): Promise<string> {
    try {
      const directory = `${FileSystem.documentDirectory}images/`;

      // Create directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(directory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      }

      const localUri = `${directory}${filename}`;

      // Copy file to local storage
      await FileSystem.copyAsync({
        from: uri,
        to: localUri,
      });

      return localUri;
    } catch (error) {
      console.error('Save to local storage error:', error);
      throw new Error('Failed to save image locally');
    }
  }

  /**
   * Delete image from local storage
   */
  async deleteFromLocalStorage(uri: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(uri);
      }
    } catch (error) {
      console.error('Delete from local storage error:', error);
      // Don't throw - deletion failure shouldn't break the app
    }
  }

  /**
   * Get image dimensions
   */
  private async getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
    try {
      // Use manipulateAsync with empty actions to get dimensions
      const result = await ImageManipulator.manipulateAsync(uri, [], {
        format: ImageManipulator.SaveFormat.JPEG,
      });

      return {
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      console.error('Get image dimensions error:', error);
      return { width: 0, height: 0 };
    }
  }

  /**
   * Batch compress multiple images
   */
  async compressMultipleImages(
    uris: string[],
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImage[]> {
    const results: OptimizedImage[] = [];

    for (const uri of uris) {
      try {
        const compressed = await this.compressImage(uri, options);
        results.push(compressed);
      } catch (error) {
        console.error(`Failed to compress image ${uri}:`, error);
        // Continue with other images
      }
    }

    return results;
  }

  /**
   * Get total size of images
   */
  async getTotalSize(uris: string[]): Promise<number> {
    let totalSizeKB = 0;

    for (const uri of uris) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
          totalSizeKB += fileInfo.size / 1024;
        }
      } catch (error) {
        console.error(`Failed to get size for ${uri}:`, error);
      }
    }

    return totalSizeKB;
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(): Promise<void> {
    try {
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) return;

      const files = await FileSystem.readDirectoryAsync(cacheDir);

      for (const file of files) {
        if (file.startsWith('ImageManipulator')) {
          try {
            await FileSystem.deleteAsync(`${cacheDir}${file}`);
          } catch (error) {
            // Ignore individual file deletion errors
          }
        }
      }
    } catch (error) {
      console.error('Cleanup temp files error:', error);
    }
  }

  /**
   * Convert base64 to file URI
   */
  async base64ToFileUri(base64: string, filename: string): Promise<string> {
    try {
      const directory = `${FileSystem.documentDirectory}images/`;
      const dirInfo = await FileSystem.getInfoAsync(directory);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      }

      const fileUri = `${directory}${filename}`;
      
      // Remove data:image/jpeg;base64, prefix if present
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
      
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return fileUri;
    } catch (error) {
      console.error('Base64 to file URI error:', error);
      throw new Error('Failed to convert base64 to file');
    }
  }

  /**
   * Convert file URI to base64
   */
  async fileUriToBase64(uri: string): Promise<string> {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('File URI to base64 error:', error);
      throw new Error('Failed to convert file to base64');
    }
  }
}

export const imageOptimizer = new ImageOptimizerService();
