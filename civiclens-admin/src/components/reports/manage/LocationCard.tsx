/**
 * Location Card Component
 * Production-grade location display with map integration
 */

'use client';

import React, { useState } from 'react';
import { Report } from '@/types';
import { MapPin, ExternalLink, Copy, Check } from 'lucide-react';

interface LocationCardProps {
  report: Report;
  onViewMap?: () => void;
}

export function LocationCard({ report, onViewMap }: LocationCardProps) {
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const coordinates = `${report.latitude.toFixed(6)}°N, ${report.longitude.toFixed(6)}°E`;
  const googleMapsUrl = `https://www.google.com/maps?q=${report.latitude},${report.longitude}`;

  const copyToClipboard = async (text: string, type: 'coords' | 'address') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'coords') {
        setCopiedCoords(true);
        setTimeout(() => setCopiedCoords(false), 2000);
      } else {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          Location
        </h3>
        {onViewMap && (
          <button
            onClick={onViewMap}
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
            aria-label="View on map"
          >
            View on Map
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Address */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Address
            </label>
            {report.address && (
              <button
                onClick={() => copyToClipboard(report.address!, 'address')}
                className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded p-1"
                aria-label="Copy address"
                title="Copy address"
              >
                {copiedAddress ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
          <p className="text-sm text-gray-900 leading-relaxed">
            {report.address || 'No address provided'}
          </p>
        </div>

        {/* Coordinates */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Coordinates
            </label>
            <button
              onClick={() => copyToClipboard(coordinates, 'coords')}
              className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded p-1"
              aria-label="Copy coordinates"
              title="Copy coordinates"
            >
              {copiedCoords ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-sm text-gray-900 font-mono">{coordinates}</p>
        </div>

        {/* Map Preview Placeholder */}
        <div className="relative bg-gray-100 rounded-lg overflow-hidden h-48 group">
          <div className="absolute inset-0 flex items-center justify-center">
            <MapPin className="w-12 h-12 text-gray-400" />
          </div>
          
          {/* Overlay with action buttons */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            {onViewMap && (
              <button
                onClick={onViewMap}
                className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                View in App
              </button>
            )}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Google Maps
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Additional Location Info (if available) */}
        {((report as any).ward || (report as any).district) && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
            {(report as any).ward && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  Ward
                </label>
                <p className="text-sm text-gray-900">{(report as any).ward}</p>
              </div>
            )}
            {(report as any).district && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  District
                </label>
                <p className="text-sm text-gray-900">{(report as any).district}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
