# Production-Ready Media Upload System for CivicLens

## Overview

This is a comprehensive, enterprise-grade media upload system designed for the CivicLens civic reporting platform. It provides robust file handling, validation, processing, and upload capabilities with advanced error handling and retry mechanisms.

## Architecture

### Core Components

1. **MediaUploader** - Main upload interface component
2. **MediaUploadProgress** - Real-time upload progress tracking
3. **useMediaUpload** - React hook for state management
4. **mediaUploadService** - Core upload service with retry logic
5. **mediaValidator** - Comprehensive file validation
6. **uploadRetryManager** - Advanced retry and error handling

### Key Features

#### 🔒 Security & Validation
- **Multi-layer file validation** (MIME type, file signature, content analysis)
- **Security scanning** for malicious file patterns
- **File size and dimension limits** with configurable thresholds
- **Content-based validation** (image dimensions, audio duration)
- **Filename sanitization** and reserved name checking

#### 🚀 Performance & Reliability
- **Automatic image compression** with quality optimization
- **Progressive upload** with chunking for large files
- **Exponential backoff retry** with jitter
- **Network-aware uploads** (connection quality detection)
- **Concurrent upload management** with rate limiting
- **Memory-efficient processing** with cleanup

#### 📱 User Experience
- **Drag & drop interface** with visual feedback
- **Real-time progress tracking** with detailed status
- **Voice recording** with high-quality audio capture
- **Image preview** with zoom and caption editing
- **Offline support** with automatic resume
- **Error recovery** with user-friendly messages

#### 🔧 Developer Experience
- **TypeScript support** with comprehensive type definitions
- **Modular architecture** with clear separation of concerns
- **Extensive error handling** with detailed logging
- **Configurable limits** and validation rules
- **Hook-based state management** for easy integration
- **Comprehensive testing** utilities

## Usage

### Basic Implementation

```tsx
import { MediaUploader } from '@/components/reports/MediaUploader';
import { useMediaUpload } from '@/hooks/useMediaUpload';

function ReportForm() {
  const mediaUpload = useMediaUpload({
    maxImages: 5,
    maxAudio: 1,
    autoUpload: false,
    onUploadComplete: (results) => {
      console.log('Upload completed:', results);
    },
    onUploadError: (error) => {
      console.error('Upload failed:', error);
    }
  });

  return (
    <div>
      <MediaUploader
        onFilesChange={mediaUpload.addFiles}
        maxImages={5}
        maxAudio={1}
        disabled={mediaUpload.isUploading}
      />
      
      <MediaUploadProgress
        files={mediaUpload.files}
        progress={mediaUpload.uploadProgress}
        uploadingFiles={mediaUpload.uploadingFiles}
        errors={mediaUpload.errors}
        onRetry={mediaUpload.retryUpload}
        onCancel={mediaUpload.removeFile}
      />
    </div>
  );
}
```

### Advanced Configuration

```tsx
import { mediaValidator } from '@/lib/utils/media-validation';
import { uploadRetryManager } from '@/lib/utils/upload-retry';

// Configure validation rules
mediaValidator.updateConfig({
  maxImageSize: 15 * 1024 * 1024, // 15MB
  maxAudioSize: 50 * 1024 * 1024, // 50MB
  maxImageDimension: 4096,
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
});

// Configure retry behavior
uploadRetryManager.updateConfig({
  maxRetries: 5,
  baseDelay: 2000,
  backoffFactor: 1.5
});
```

## File Type Support

### Images
- **Formats**: JPEG, PNG, WebP
- **Max Size**: 10MB (configurable)
- **Max Dimension**: 2048px (auto-resize)
- **Processing**: Automatic compression and optimization
- **Validation**: Content analysis, dimension checking

### Audio
- **Formats**: MP3, WAV, M4A
- **Max Size**: 25MB (configurable)
- **Max Duration**: 10 minutes (configurable)
- **Processing**: Metadata extraction
- **Recording**: Built-in voice recorder with noise suppression

## Upload Limits

### Per Report
- **Images**: 5 files maximum
- **Audio**: 1 file maximum
- **Total Size**: Unlimited (individual file limits apply)

### File Constraints
- **Filename Length**: 255 characters maximum
- **Invalid Characters**: Automatically sanitized
- **Reserved Names**: System-protected names blocked

## Error Handling

### Error Classification
- **Network Errors**: Connection issues, timeouts
- **Server Errors**: 5xx responses, rate limiting
- **Client Errors**: Invalid files, permission issues
- **Validation Errors**: File format, size, content issues

### Recovery Mechanisms
- **Automatic Retry**: Exponential backoff for transient errors
- **Manual Retry**: User-initiated retry for failed uploads
- **Partial Recovery**: Continue with successful uploads
- **Offline Support**: Queue uploads for when connection returns

## Performance Optimizations

### Image Processing
- **Smart Compression**: Quality-based compression with size targets
- **Format Conversion**: Automatic format optimization (PNG → JPEG)
- **Dimension Scaling**: Maintain aspect ratio while reducing size
- **Progressive Loading**: Chunked upload for large files

### Network Optimization
- **Connection Detection**: Adapt strategy based on network quality
- **Concurrent Limits**: Prevent network congestion
- **Bandwidth Management**: Respect data saver mode
- **Caching**: Avoid re-uploading identical files

## Security Features

### File Validation
- **MIME Type Verification**: Cross-check file headers
- **Content Scanning**: Detect embedded malicious content
- **Extension Validation**: Prevent executable file uploads
- **Size Limits**: Prevent DoS attacks via large files

### Privacy Protection
- **Metadata Stripping**: Remove EXIF data from images
- **Secure URLs**: Time-limited access tokens
- **Audit Logging**: Track all upload activities
- **Permission Checks**: Verify user authorization

## Monitoring & Analytics

### Upload Metrics
- **Success Rate**: Track upload completion rates
- **Error Patterns**: Identify common failure modes
- **Performance**: Monitor upload speeds and processing times
- **User Behavior**: Analyze file type preferences and sizes

### Health Checks
- **Service Status**: Monitor backend availability
- **Storage Capacity**: Track available storage space
- **Processing Queue**: Monitor background job status
- **Error Rates**: Alert on unusual error patterns

## Configuration

### Environment Variables
```env
# Upload Limits
MAX_IMAGE_SIZE=10485760          # 10MB
MAX_AUDIO_SIZE=26214400          # 25MB
MAX_IMAGES_PER_REPORT=5
MAX_AUDIO_PER_REPORT=1

# Processing
IMAGE_COMPRESSION_QUALITY=85
MAX_IMAGE_DIMENSION=2048
ENABLE_AUTO_COMPRESSION=true

# Storage
STORAGE_PROVIDER=local           # local | minio | s3
MEDIA_ROOT=./media
MINIO_ENDPOINT=localhost:9000
MINIO_BUCKET=civiclens-media

# Security
ENABLE_VIRUS_SCANNING=false
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/mp4

# Performance
UPLOAD_TIMEOUT=300000            # 5 minutes
MAX_CONCURRENT_UPLOADS=3
ENABLE_CHUNKED_UPLOAD=true
CHUNK_SIZE=1048576               # 1MB
```

### Runtime Configuration
```typescript
// Update validation rules
mediaValidator.updateConfig({
  maxImageSize: 15 * 1024 * 1024,
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp']
});

// Update retry behavior
uploadRetryManager.updateConfig({
  maxRetries: 3,
  baseDelay: 1000,
  backoffFactor: 2
});
```

## Testing

### Unit Tests
- **File Validation**: Test all validation rules and edge cases
- **Upload Logic**: Mock network requests and test retry behavior
- **Error Handling**: Verify proper error classification and recovery
- **State Management**: Test hook behavior and state transitions

### Integration Tests
- **End-to-End Upload**: Test complete upload workflow
- **Error Scenarios**: Simulate network failures and server errors
- **Performance**: Test with large files and concurrent uploads
- **Cross-Browser**: Verify compatibility across browsers

### Load Testing
- **Concurrent Users**: Test system under high load
- **Large Files**: Verify handling of maximum file sizes
- **Network Conditions**: Test with various connection speeds
- **Storage Limits**: Test behavior when storage is full

## Troubleshooting

### Common Issues

#### Upload Failures
1. **Check network connection** - Verify internet connectivity
2. **File size limits** - Ensure files are within size constraints
3. **File format** - Verify supported file types
4. **Browser compatibility** - Test in different browsers

#### Performance Issues
1. **Large files** - Enable compression or reduce file size
2. **Slow network** - Check connection quality indicators
3. **Concurrent uploads** - Reduce number of simultaneous uploads
4. **Browser memory** - Close other tabs or restart browser

#### Validation Errors
1. **File corruption** - Try re-saving or re-exporting the file
2. **Unsupported format** - Convert to supported format
3. **Metadata issues** - Strip metadata and try again
4. **Filename problems** - Rename file with simple characters

### Debug Mode
Enable debug logging to troubleshoot issues:

```typescript
// Enable debug logging
localStorage.setItem('media-upload-debug', 'true');

// View detailed logs in browser console
console.log('Media upload debug enabled');
```

## Future Enhancements

### Planned Features
- **Video Upload Support** - Add video file handling
- **Cloud Storage Integration** - Direct upload to cloud providers
- **Advanced Image Editing** - Built-in crop, rotate, filter tools
- **Batch Processing** - Background processing for multiple files
- **AI-Powered Validation** - Content analysis and auto-tagging

### Performance Improvements
- **WebAssembly Processing** - Faster image compression
- **Service Worker Caching** - Offline upload queue
- **Progressive Web App** - Native app-like experience
- **WebRTC Data Channels** - Peer-to-peer file sharing

## Support

For technical support or feature requests:
- **Documentation**: Check this README and inline code comments
- **Issues**: Create GitHub issues for bugs or feature requests
- **Discussions**: Use GitHub discussions for questions
- **Email**: Contact the development team for urgent issues

## License

This media upload system is part of the CivicLens project and follows the same licensing terms.