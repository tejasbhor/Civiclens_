import React, { useState, useRef } from 'react';
import { Camera, X, Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PhotoUploadProps {
  maxPhotos?: number;
  onPhotosChange: (photos: File[]) => void;
  title: string;
  description: string;
  existingPhotos?: File[];
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  maxPhotos = 5,
  onPhotosChange,
  title,
  description,
  existingPhotos = []
}) => {
  const [photos, setPhotos] = useState<File[]>(existingPhotos);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addPhotos(files);
  };

  const addPhotos = (newFiles: File[]) => {
    setError('');

    // Validate total count
    if (photos.length + newFiles.length > maxPhotos) {
      setError(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    for (const file of newFiles) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} is not an image file`);
        continue;
      }

      // Check file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} is too large. Max 10MB per photo`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Create previews
    const newPreviews: string[] = [];
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === validFiles.length) {
          setPreviews([...previews, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    const updatedPhotos = [...photos, ...validFiles];
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos);
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
    setPreviews(updatedPreviews);
    onPhotosChange(updatedPhotos);
    setError('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    addPhotos(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-700 font-medium mb-2">
          Click to upload or drag and drop
        </p>
        <p className="text-sm text-gray-500">
          JPEG, PNG or WebP (max 10MB per photo)
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {photos.length} / {maxPhotos} photos uploaded
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Photo Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {previews.map((preview, index) => (
            <Card key={index} className="relative group overflow-hidden">
              <img
                src={preview}
                alt={`Photo ${index + 1}`}
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(index);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                Photo {index + 1}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Upload className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Photo Guidelines:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Take clear, well-lit photos</li>
              <li>Capture the entire work area</li>
              <li>Include reference points (landmarks, signs)</li>
              <li>Upload {maxPhotos} photos maximum</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
