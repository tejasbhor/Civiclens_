"use client";

import React from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  X, 
  RotateCcw,
  Pause,
  Play,
  Clock,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react';
import { MediaFile, UploadProgress } from '@/types/media';
import { mediaUploadService } from '@/lib/services/media-upload';
import { NetworkErrorDetector } from '@/lib/utils/upload-retry';

interface MediaUploadProgressProps {
  files: MediaFile[];
  progress: Record<string, number>;
  uploadingFiles: Set<string>;
  errors: Record<string, string>;
  onRetry: (fileId: string) => void;
  onCancel: (fileId: string) => void;
  onPause?: (fileId: string) => void;
  onResume?: (fileId: string) => void;
  showDetails?: boolean;
}

export function MediaUploadProgress({
  files,
  progress,
  uploadingFiles,
  errors,
  onRetry,
  onCancel,
  onPause,
  onResume,
  showDetails = true
}: MediaUploadProgressProps) {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [connectionInfo, setConnectionInfo] = React.useState(NetworkErrorDetector.getConnectionInfo());

  // Monitor network status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update connection info periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      setConnectionInfo(NetworkErrorDetector.getConnectionInfo());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getFileStatus = (file: MediaFile): {
    status: 'pending' | 'uploading' | 'completed' | 'error' | 'paused';
    progress: number;
    message: string;
  } => {
    if (errors[file.id]) {
      const errorClassification = NetworkErrorDetector.classifyError(new Error(errors[file.id]));
      return {
        status: 'error',
        progress: 0,
        message: errorClassification.userMessage
      };
    }

    if (file.uploaded) {
      return {
        status: 'completed',
        progress: 100,
        message: 'Upload completed'
      };
    }

    if (uploadingFiles.has(file.id)) {
      const fileProgress = progress[file.id] || 0;
      return {
        status: 'uploading',
        progress: fileProgress,
        message: `Uploading... ${Math.round(fileProgress)}%`
      };
    }

    return {
      status: 'pending',
      progress: 0,
      message: 'Waiting to upload'
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'uploading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'paused':
        return <Pause className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getProgressBarColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'uploading':
        return 'bg-blue-500';
      case 'paused':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-300';
    }
  };

  const totalFiles = files.length;
  const completedFiles = files.filter(f => f.uploaded).length;
  const errorFiles = Object.keys(errors).length;
  const uploadingCount = uploadingFiles.size;
  const overallProgress = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">Upload Progress</h4>
            {!isOnline && (
              <div className="flex items-center gap-1 text-red-600 text-sm">
                <WifiOff className="w-4 h-4" />
                <span>Offline</span>
              </div>
            )}
            {isOnline && connectionInfo.effectiveType && (
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <Wifi className="w-4 h-4" />
                <span>{connectionInfo.effectiveType.toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {completedFiles}/{totalFiles} files completed
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              errorFiles > 0 ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {/* Status Summary */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            {uploadingCount > 0 && (
              <div className="flex items-center gap-1 text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{uploadingCount} uploading</span>
              </div>
            )}
            {completedFiles > 0 && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>{completedFiles} completed</span>
              </div>
            )}
            {errorFiles > 0 && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>{errorFiles} failed</span>
              </div>
            )}
          </div>
          
          {connectionInfo.saveData && (
            <div className="flex items-center gap-1 text-orange-600">
              <Zap className="w-4 h-4" />
              <span>Data Saver</span>
            </div>
          )}
        </div>
      </div>

      {/* Individual File Progress */}
      {showDetails && (
        <div className="space-y-2">
          {files.map((file) => {
            const fileStatus = getFileStatus(file);
            
            return (
              <div key={file.id} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getStatusIcon(fileStatus.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {mediaUploadService.getFileTypeIcon(file.file.type)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {mediaUploadService.formatFileSize(file.size)} • {fileStatus.message}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 ml-2">
                    {fileStatus.status === 'error' && (
                      <button
                        onClick={() => onRetry(file.id)}
                        className="p-1 text-blue-600 hover:text-blue-800 rounded"
                        title="Retry upload"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    
                    {fileStatus.status === 'uploading' && onPause && (
                      <button
                        onClick={() => onPause(file.id)}
                        className="p-1 text-yellow-600 hover:text-yellow-800 rounded"
                        title="Pause upload"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                    
                    {fileStatus.status === 'paused' && onResume && (
                      <button
                        onClick={() => onResume(file.id)}
                        className="p-1 text-green-600 hover:text-green-800 rounded"
                        title="Resume upload"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    
                    {(fileStatus.status === 'pending' || fileStatus.status === 'uploading') && (
                      <button
                        onClick={() => onCancel(file.id)}
                        className="p-1 text-red-600 hover:text-red-800 rounded"
                        title="Cancel upload"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Progress Bar */}
                {(fileStatus.status === 'uploading' || fileStatus.status === 'completed') && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-300 ${getProgressBarColor(fileStatus.status)}`}
                      style={{ width: `${fileStatus.progress}%` }}
                    />
                  </div>
                )}
                
                {/* Error Details */}
                {fileStatus.status === 'error' && errors[file.id] && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    <div className="font-medium">Error Details:</div>
                    <div>{errors[file.id]}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Network Status Warning */}
      {!isOnline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-yellow-600" />
            <div>
              <div className="font-medium text-yellow-800">No Internet Connection</div>
              <div className="text-sm text-yellow-700">
                Uploads will resume automatically when connection is restored.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connection Quality Warning */}
      {isOnline && connectionInfo.effectiveType && 
       ['slow-2g', '2g'].includes(connectionInfo.effectiveType) && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-orange-600" />
            <div>
              <div className="font-medium text-orange-800">Slow Connection Detected</div>
              <div className="text-sm text-orange-700">
                Uploads may take longer than usual. Consider using a faster connection for large files.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}