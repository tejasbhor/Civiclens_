import React, { useState, useEffect, useRef } from 'react';
import { 
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Minimize,
  Download
} from 'lucide-react';

interface ImageViewerProps {
  images: Array<{
    url: string;
    caption?: string;
    alt?: string;
  }>;
  initialIndex?: number;
  onClose: () => void;
}

export function ImageViewer({ images, initialIndex = 0, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  const currentImage = images[currentIndex];

  const closeModal = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    onClose();
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (images.length === 0) return;
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    } else {
      newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    }
    
    setCurrentIndex(newIndex);
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

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentImage.url;
    link.download = `image_${currentIndex + 1}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Ctrl+Scroll zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        
        if (e.deltaY < 0) {
          setZoom(prev => Math.min(prev + 0.1, 5));
        } else {
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

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'ArrowLeft') {
        navigateImage('prev');
      } else if (e.key === 'ArrowRight') {
        navigateImage('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length]);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="relative w-full h-full flex items-center justify-center p-4">
        {/* Close Button */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="Close (Esc)"
        >
          <X className="w-8 h-8" />
        </button>

        {/* Navigation */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => navigateImage('prev')}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Previous (←)"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={() => navigateImage('next')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Next (→)"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}

        {/* Zoom Controls */}
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

        {/* Image Content */}
        <div 
          className="w-full h-full flex items-center justify-center overflow-hidden px-20 py-20"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          <img
            ref={imageRef}
            src={currentImage.url}
            alt={currentImage.alt || currentImage.caption || 'Image'}
            className="w-full h-full object-contain transition-transform"
            style={{
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              transformOrigin: 'center center',
            }}
            onError={(e) => {
              console.error('Failed to load image:', currentImage.url);
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%239ca3af"%3EImage not found%3C/text%3E%3C/svg%3E';
            }}
            draggable={false}
          />
        </div>

        {/* Info Panel */}
        <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {currentImage.caption && (
                <h4 className="font-semibold truncate">{currentImage.caption}</h4>
              )}
              {images.length > 1 && (
                <p className="text-sm text-gray-300 mt-1">
                  Image {currentIndex + 1} of {images.length}
                </p>
              )}
            </div>
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0 ml-4"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
