import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, X, Download, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MediaItem {
  id: number;
  file_url: string;
  file_type?: string;
  upload_source?: string;
  caption?: string;
  is_proof_of_work?: boolean;
  uploaded_at?: string;
}

interface MediaViewerProps {
  media: MediaItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const MediaViewer = ({ media, initialIndex = 0, isOpen, onClose }: MediaViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset zoom and rotation when media changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen, initialIndex]);

  const currentMedia = media[currentIndex];
  const isImage = currentMedia?.file_type?.toLowerCase() === 'image' || 
                  currentMedia?.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  const getMediaUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const baseUrl = API_BASE.replace('/api/v1', '');
    return `${baseUrl}${url}`;
  };

  const getUploadSourceLabel = (source?: string) => {
    switch (source) {
      case 'citizen_submission':
        return 'From Your Report';
      case 'officer_before_photo':
        return 'Before Work Started';
      case 'officer_after_photo':
        return 'After Work Completed';
      default:
        return 'Report Photo';
    }
  };

  const getUploadSourceColor = (source?: string) => {
    switch (source) {
      case 'citizen_submission':
        return 'bg-blue-500';
      case 'officer_before_photo':
        return 'bg-amber-500';
      case 'officer_after_photo':
        return 'bg-green-500';
      default:
        return 'bg-slate-500';
    }
  };

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
    setZoom(1);
    setRotation(0);
  }, [media.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
    setZoom(1);
    setRotation(0);
  }, [media.length]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = () => {
    const url = getMediaUrl(currentMedia.file_url);
    const link = document.createElement('a');
    link.href = url;
    link.download = `photo-${currentMedia.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === 'r' || e.key === 'R') handleRotate();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrevious, handleNext, onClose]);

  if (!currentMedia) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full h-[95vh] p-0 bg-black/70 backdrop-blur-md border-none rounded-2xl overflow-hidden">
        <div className="relative w-full h-full flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-3">
              <Badge className={getUploadSourceColor(currentMedia.upload_source)}>
                {getUploadSourceLabel(currentMedia.upload_source)}
              </Badge>
              {currentMedia.is_proof_of_work && (
                <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/50">
                  Proof of Work
                </Badge>
              )}
              {currentMedia.caption && (
                <span className="text-white/80 text-sm max-w-md truncate">{currentMedia.caption}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-sm">
                {currentIndex + 1} / {media.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Main Image Area */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            {isImage ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={getMediaUrl(currentMedia.file_url)}
                  alt={currentMedia.caption || `Photo ${currentIndex + 1}`}
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  }}
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23333" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not available%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
            ) : (
              <div className="text-white text-center">
                <p className="text-lg mb-4">Media preview not available</p>
                <Button onClick={handleDownload} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download File
                </Button>
              </div>
            )}

            {/* Navigation Arrows */}
            {media.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border border-white/20"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border border-white/20"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </>
            )}
          </div>

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="text-white hover:bg-white/20"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-5 h-5" />
            </Button>
            <span className="text-white/60 text-sm min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="text-white hover:bg-white/20"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-5 h-5" />
            </Button>
            <div className="w-px h-6 bg-white/20 mx-2" />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRotate}
              className="text-white hover:bg-white/20"
              aria-label="Rotate"
            >
              <RotateCw className="w-5 h-5" />
            </Button>
            <div className="w-px h-6 bg-white/20 mx-2" />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-white hover:bg-white/20"
              aria-label="Download"
            >
              <Download className="w-5 h-5" />
            </Button>
          </div>

          {/* Thumbnail Strip */}
          {media.length > 1 && (
            <div className="absolute bottom-20 left-0 right-0 z-40 overflow-x-auto pb-2">
              <div className="flex gap-2 justify-center px-4">
                {media.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentIndex(index);
                      setZoom(1);
                      setRotation(0);
                    }}
                    className={cn(
                      "relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                      index === currentIndex
                        ? "border-white scale-110"
                        : "border-white/30 hover:border-white/60 opacity-70 hover:opacity-100"
                    )}
                  >
                    <img
                      src={getMediaUrl(item.file_url)}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23333" width="80" height="80"/%3E%3C/svg%3E';
                      }}
                    />
                    {index === currentIndex && (
                      <div className="absolute inset-0 bg-white/20" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

