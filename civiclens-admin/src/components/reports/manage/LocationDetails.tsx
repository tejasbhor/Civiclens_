import React, { useState } from 'react';
import { Report } from '@/types';
import { 
  MapPin, 
  Navigation, 
  ExternalLink, 
  Copy, 
  Map,
  Building,
  Globe,
  Compass,
  Target,
  Search,
  Eye
} from 'lucide-react';

interface LocationDetailsProps {
  report: Report;
  onViewMap?: () => void;
}

export function LocationDetails({ report, onViewMap }: LocationDetailsProps) {
  const [copied, setCopied] = useState(false);

  const formatCoordinate = (coord: number, type: 'lat' | 'lng') => {
    const direction = type === 'lat' ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');
    return `${Math.abs(coord).toFixed(6)}°${direction}`;
  };

  const copyCoordinates = async () => {
    try {
      const coords = `${report.latitude}, ${report.longitude}`;
      await navigator.clipboard.writeText(coords);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy coordinates:', error);
    }
  };

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps?q=${report.latitude},${report.longitude}`;
    window.open(url, '_blank');
  };

  const openInStreetView = () => {
    const url = `https://www.google.com/maps/@${report.latitude},${report.longitude},3a,75y,90t/data=!3m6!1e1`;
    window.open(url, '_blank');
  };

  const getLocationAccuracy = () => {
    // Estimate accuracy based on coordinate precision
    const latStr = report.latitude.toString();
    const lngStr = report.longitude.toString();
    const latDecimals = latStr.includes('.') ? latStr.split('.')[1].length : 0;
    const lngDecimals = lngStr.includes('.') ? lngStr.split('.')[1].length : 0;
    const avgDecimals = (latDecimals + lngDecimals) / 2;
    
    if (avgDecimals >= 6) return { level: 'High', color: 'text-green-600', desc: '~1m accuracy' };
    if (avgDecimals >= 4) return { level: 'Medium', color: 'text-yellow-600', desc: '~10m accuracy' };
    return { level: 'Low', color: 'text-red-600', desc: '~100m accuracy' };
  };

  const accuracy = getLocationAccuracy();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Location Details</h3>
          </div>
          <div className="flex items-center gap-2">
            {onViewMap && (
              <button
                onClick={onViewMap}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
              >
                <Map className="w-4 h-4" />
                View on Map
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Address Information */}
        <div className="space-y-3">
          {report.address && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">ADDRESS</label>
              <p className="text-sm text-gray-900 leading-relaxed">{report.address}</p>
            </div>
          )}

          {report.landmark && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">LANDMARK</label>
              <p className="text-sm text-gray-900">{report.landmark}</p>
            </div>
          )}

          {/* Administrative Details */}
          <div className="grid grid-cols-2 gap-3">
            {report.ward_number && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">WARD</label>
                <p className="text-sm text-gray-900">{report.ward_number}</p>
              </div>
            )}
            
            {report.area_type && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">AREA TYPE</label>
                <p className="text-sm text-gray-900 capitalize">{report.area_type}</p>
              </div>
            )}
            
            {report.district && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">DISTRICT</label>
                <p className="text-sm text-gray-900">{report.district}</p>
              </div>
            )}
            
            {report.state && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">STATE</label>
                <p className="text-sm text-gray-900">{report.state}</p>
              </div>
            )}
            
            {report.pincode && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">PINCODE</label>
                <p className="text-sm text-gray-900">{report.pincode}</p>
              </div>
            )}
          </div>
        </div>

        {/* Coordinates */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-500">GPS COORDINATES</label>
            <div className={`text-xs font-medium ${accuracy.color}`}>
              {accuracy.level} Precision
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Latitude:</span>
              <span className="text-sm font-mono text-gray-900">
                {formatCoordinate(report.latitude, 'lat')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Longitude:</span>
              <span className="text-sm font-mono text-gray-900">
                {formatCoordinate(report.longitude, 'lng')}
              </span>
            </div>
            <div className="text-xs text-gray-500 text-center pt-1">
              {accuracy.desc}
            </div>
          </div>
        </div>



        {/* Action Buttons */}
        <div className="pt-3 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={copyCoordinates}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy Coords'}
            </button>
            
            <button
              onClick={openInGoogleMaps}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Google Maps
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={openInStreetView}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Street View
            </button>
            
            <button
              onClick={() => {
                const query = encodeURIComponent(`${report.latitude},${report.longitude} ${report.address || ''}`);
                window.open(`https://www.google.com/search?q=${query}`, '_blank');
              }}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Search className="w-4 h-4" />
              Search Area
            </button>
          </div>
        </div>

        {/* Location Insights */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Location Insights</span>
          </div>
          <div className="text-sm text-blue-800 space-y-1">
            <div>• Coordinates precision: {accuracy.level.toLowerCase()}</div>
            <div>• Administrative area: {report.district || 'Unknown'}, {report.state || 'Unknown'}</div>
            {report.ward_number && <div>• Municipal ward: {report.ward_number}</div>}
            {report.area_type && <div>• Area classification: {report.area_type}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}