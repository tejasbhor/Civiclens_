"use client";

import React, { useState } from 'react';

interface MapPreviewProps {
  latitude: number;
  longitude: number;
  address?: string | null;
  onClose: () => void;
}

export const MapPreview: React.FC<MapPreviewProps> = ({ latitude, longitude, address, onClose }) => {
  const [mapProvider, setMapProvider] = useState<'osm' | 'google' | 'mapmyindia'>('osm');
  
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}`;
  const googleUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;
  const mapMyIndiaUrl = `https://maps.mapmyindia.com/embed?lat=${latitude}&lng=${longitude}&zoom=15&marker=${latitude},${longitude}`;
  
  const mapUrl = mapProvider === 'osm' ? osmUrl : mapProvider === 'google' ? googleUrl : mapMyIndiaUrl;
  
  // Copy coordinates to clipboard
  const copyCoordinates = () => {
    navigator.clipboard.writeText(`${latitude}, ${longitude}`);
    alert('Coordinates copied to clipboard!');
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-blue-50 to-white">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Location Preview
            </h3>
            {address && (
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {address}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <p className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                {latitude.toFixed(6)}°N, {longitude.toFixed(6)}°E
              </p>
              <button
                onClick={copyCoordinates}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Map Provider Tabs */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMapProvider('osm')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mapProvider === 'osm'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              OpenStreetMap
            </button>
            <button
              onClick={() => setMapProvider('google')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mapProvider === 'google'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Google Maps
            </button>
            <button
              onClick={() => setMapProvider('mapmyindia')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mapProvider === 'mapmyindia'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              MapMyIndia
            </button>
          </div>

          {/* External Links */}
          <div className="flex items-center gap-2">
            <a
              href={`https://maps.mapmyindia.com/@${latitude},${longitude},15z`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-1.5 font-medium"
              title="Open in MapMyIndia"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              MapMyIndia
            </a>
            <a
              href={`https://www.google.com/maps?q=${latitude},${longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 font-medium"
              title="Open in Google Maps"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Google Maps
            </a>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative bg-gray-100" style={{ height: '550px' }}>
          <iframe
            src={mapUrl}
            className="w-full h-full border-0"
            title="Location Map"
            loading="lazy"
          />
        </div>

        {/* Footer with Quick Actions */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Click external links to open in full map applications</span>
          </div>
          <button
            onClick={() => {
              const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
              window.open(url, '_blank');
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Get Directions
          </button>
        </div>
      </div>
    </div>
  );
};
