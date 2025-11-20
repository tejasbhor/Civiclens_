import React, { useState, useEffect, useRef } from 'react';
import { Report, Media, MediaType, UploadSource } from '@/types';
import { getMediaUrl } from '@/lib/utils/media';
import { 
  Camera, 
  Video, 
  FileText, 
  Download, 
  Eye, 
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Clock,
  User,
  Tag,
  Info,
  ZoomIn,
  ZoomOut,
  Minimize
} from 'lucide-react';

interface MediaGalleryProps {
  report: Report;
}

export function MediaGallery({ report }: MediaGalleryProps) {
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  // Mock media data since the report might not have media populated
  const mockMedia: Media[] = report.media || [];

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case MediaType.IMAGE:
        return <Camera className="w-4 h-4" />;
      case MediaType.VIDEO:
        return <Video className="w-4 h-4" />;
      case MediaType.AUDIO:
        return <Volume2 className="w-4 h-4" />;
      case MediaType.DOCUMENT:
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (source?: UploadSource) => {
    switch (source) {
      case UploadSource.CITIZEN_SUBMISSION:
        return { label: 'Citizen Report', color: 'text-blue-600 bg-blue-50' };
      case UploadSource.OFFICER_BEFORE_PHOTO:
        return { label: 'Before Work', color: 'text-orange-600 bg-orange-50' };
      case UploadSource.OFFICER_AFTER_PHOTO:
        return { label: 'After Work', color: 'text-green-600 bg-green-50' };
      default:
        return { label: 'Unknown', color: 'text-gray-600 bg-gray-50' };
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openModal = (media: Media, index: number) => {
    setSelectedMedia(media);
    setCurrentIndex(index);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedMedia(null);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const navigateMedia = (direction: 'prev' | 'next') => {
    if (mockMedia.length === 0) return;
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : mockMedia.length - 1;
    } else {
      newIndex = currentIndex < mockMedia.length - 1 ? currentIndex + 1 : 0;
    }
    
    setCurrentIndex(newIndex);
    setSelectedMedia(mockMedia[newIndex]);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => {
      const newZoom = Math.max(prev - 0.25, 1);
      if (newZoom === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Ctrl+Scroll zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (showModal && selectedMedia?.file_type === MediaType.IMAGE && e.ctrlKey) {
        e.preventDefault();
        
        if (e.deltaY < 0) {
          // Scroll up - zoom in
          setZoom(prev => Math.min(prev + 0.1, 5));
        } else {
          // Scroll down - zoom out
          setZoom(prev => {
            const newZoom = Math.max(prev - 0.1, 1);
            if (newZoom === 1) {
              setPosition({ x: 0, y: 0 });
            }
            return newZoom;
          });
        }
      }
    };

    if (showModal) {
      window.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [showModal, selectedMedia]);

  const downloadMedia = (media: Media) => {
    // Create a temporary link to download the media
    const link = document.createElement('a');
    link.href = getMediaUrl(media.file_url);
    link.download = `report_${report.id}_media_${media.id}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!mockMedia || mockMedia.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Media Gallery</h3>
          </div>
        </div>
        <div className="p-6 text-center">
          <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No media attached</p>
          <p className="text-sm text-gray-400 mt-1">Photos and documents will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Media Gallery</h3>
              <span className="text-sm text-gray-500">({mockMedia.length})</span>
            </div>
          </div>
        </div>

        {/* Media Grid */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {mockMedia.map((media, index) => {
              const source = getSourceLabel(media.upload_source);
              
              return (
                <div
                  key={media.id}
                  className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors"
                  onClick={() => openModal(media, index)}
                >
                  {/* Media Preview */}
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    {media.file_type === MediaType.IMAGE ? (
                      <img
                        src={getMediaUrl(media.file_url)}
                        alt={media.caption || 'Report media'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        {getMediaIcon(media.file_type)}
                        <span className="text-xs mt-1 uppercase font-medium">
                          {media.file_type}
                        </span>
                      </div>
                    )}
                    
                    {/* Fallback for broken images */}
                    <div className="hidden flex-col items-center justify-center text-gray-400">
                      {getMediaIcon(media.file_type)}
                      <span className="text-xs mt-1 uppercase font-medium">
                        {media.file_type}
                      </span>
                    </div>
                  </div>

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Source Badge */}
                  <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${source.color}`}>
                    {source.label}
                  </div>

                  {/* Primary Badge */}
                  {media.is_primary && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}

                  {/* Media Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <div className="text-white text-xs">
                      {media.caption && (
                        <div className="font-medium truncate">{media.caption}</div>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span>{formatDate(media.uploaded_at)}</span>
                        {media.file_size && (
                          <span>{formatFileSize(media.file_size)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Full Screen Modal */}
      {showModal && selectedMedia && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Navigation */}
            {mockMedia.length > 1 && (
              <>
                <button
                  onClick={() => navigateMedia('prev')}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={() => navigateMedia('next')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}

            {/* Zoom Controls */}
            {selectedMedia.file_type === MediaType.IMAGE && (
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                <button
                  onClick={handleZoomIn}
                  className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors"
                  title="Zoom In (Ctrl + Scroll Up)"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors"
                  title="Zoom Out (Ctrl + Scroll Down)"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                {zoom > 1 && (
                  <button
                    onClick={handleResetZoom}
                    className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors"
                    title="Reset Zoom"
                  >
                    <Minimize className="w-5 h-5" />
                  </button>
                )}
                <div className="px-2 py-1 bg-black/60 text-white text-xs rounded-lg text-center">
                  {Math.round(zoom * 100)}%
                </div>
              </div>
            )}

            {/* Media Content */}
            <div 
              className="w-full h-full flex items-center justify-center overflow-hidden px-20 py-20"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >
              {selectedMedia.file_type === MediaType.IMAGE ? (
                <img
                  ref={imageRef}
                  src={getMediaUrl(selectedMedia.file_url)}
                  alt={selectedMedia.caption || 'Report media'}
                  className="w-full h-full object-contain transition-transform"
                  style={{
                    transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                    transformOrigin: 'center center',
                  }}
                  onError={(e) => {
                    console.error('Failed to load image:', selectedMedia.file_url);
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%239ca3af"%3EImage not found%3C/text%3E%3C/svg%3E';
                  }}
                  draggable={false}
                />
              ) : selectedMedia.file_type === MediaType.VIDEO ? (
                <video
                  src={getMediaUrl(selectedMedia.file_url)}
                  controls
                  className="max-w-full max-h-full"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="bg-white rounded-lg p-8 text-center">
                  {getMediaIcon(selectedMedia.file_type)}
                  <h3 className="text-lg font-semibold mt-4">
                    {selectedMedia.file_type.toUpperCase()} File
                  </h3>
                  <p className="text-gray-600 mt-2">{selectedMedia.caption}</p>
                  <button
                    onClick={() => downloadMedia(selectedMedia)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              )}
            </div>

            {/* Media Info Panel */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">
                    {selectedMedia.caption || `${selectedMedia.file_type} File`}
                  </h4>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-300">
                    <span>{formatDate(selectedMedia.uploaded_at)}</span>
                    {selectedMedia.file_size && (
                      <span>{formatFileSize(selectedMedia.file_size)}</span>
                    )}
                    <span className="capitalize">{selectedMedia.file_type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadMedia(selectedMedia)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  {mockMedia.length > 1 && (
                    <span className="text-sm text-gray-300">
                      {currentIndex + 1} of {mockMedia.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}