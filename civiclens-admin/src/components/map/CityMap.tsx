'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Report } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { reportsApi } from '@/lib/api/reports';
import { HeatmapLayer } from './HeatmapLayer';
import { ReportDotsLayer } from './ReportDotsLayer';
import { AutoFitBounds } from './AutoFitBounds';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons based on status
const getMarkerIcon = (status: string) => {
  const color = {
    received: '#6366f1',
    classified: '#8b5cf6',
    assigned: '#3b82f6',
    in_progress: '#f59e0b',
    resolved: '#10b981',
    rejected: '#ef4444',
  }[status] || '#6b7280';

  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 12.5 12.5 28.5 12.5 28.5S25 25 25 12.5C25 5.596 19.404 0 12.5 0z" fill="${color}"/>
        <circle cx="12.5" cy="12.5" r="8" fill="white"/>
      </svg>
    `)}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

// Mock reports data for when backend is not available
const mockReports: Report[] = [
  {
    id: 1,
    user_id: 1,
    title: 'Pothole on MG Road',
    description: 'Large pothole causing traffic issues near the intersection',
    category: 'Infrastructure',
    severity: 'high',
    status: 'in_progress',
    latitude: 23.3441,
    longitude: 85.3096,
    address: 'MG Road, Navi Mumbai',
    created_at: '2025-01-15T10:30:00Z',
  } as Report,
  {
    id: 2,
    user_id: 2,
    title: 'Streetlight not working',
    description: 'Streetlight has been out for 3 days, area is dark at night',
    category: 'Utilities',
    severity: 'medium',
    status: 'assigned_to_officer',
    latitude: 23.3467,
    longitude: 85.3112,
    address: 'Circular Road, Navi Mumbai',
    created_at: '2025-01-14T18:45:00Z',
  } as Report,
  {
    id: 3,
    user_id: 3,
    title: 'Garbage pileup',
    description: 'Garbage has been accumulating for a week, needs urgent collection',
    category: 'Sanitation',
    severity: 'high',
    status: 'resolved',
    latitude: 23.3401,
    longitude: 85.3078,
    address: 'Doranda, Navi Mumbai',
    created_at: '2025-01-13T09:15:00Z',
  } as Report,
  {
    id: 4,
    user_id: 4,
    title: 'Water pipe leak',
    description: 'Water continuously leaking from pipe, wasting resources',
    category: 'Utilities',
    severity: 'critical',
    status: 'received',
    latitude: 23.3489,
    longitude: 85.3056,
    address: 'Harmu Road, Navi Mumbai',
    created_at: '2025-01-15T14:20:00Z',
  } as Report,
];

interface CityMapProps {
  reports?: Report[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  showHeatMap?: boolean;
  onViewChange?: (showHeatMap: boolean) => void;
}

export const CityMap: React.FC<CityMapProps> = ({
  reports: propReports,
  center: propCenter,
  zoom: propZoom,
  height = '600px',
  showHeatMap = true, // Default to heat map
  onViewChange,
}) => {
  const [reports, setReports] = useState<Report[]>(propReports || []);
  const [loading, setLoading] = useState(!propReports);
  const [isHeatMap, setIsHeatMap] = useState(showHeatMap);

  // Calculate dynamic center and zoom based on actual report locations
  const { center, zoom } = useMemo(() => {
    // Filter reports with valid coordinates
    const validReports = reports.filter(
      (report) => 
        report.latitude != null && 
        report.longitude != null &&
        !isNaN(report.latitude) &&
        !isNaN(report.longitude) &&
        report.latitude >= -90 &&
        report.latitude <= 90 &&
        report.longitude >= -180 &&
        report.longitude <= 180
    );

    if (validReports.length === 0) {
      // Default to India center if no reports
      return {
        center: propCenter || [20.5937, 78.9629] as [number, number], // India center
        zoom: propZoom || 5,
      };
    }

    // Calculate center from all reports
    const avgLat = validReports.reduce((sum, r) => sum + r.latitude, 0) / validReports.length;
    const avgLng = validReports.reduce((sum, r) => sum + r.longitude, 0) / validReports.length;

    // Calculate bounds to determine appropriate zoom
    const bounds = L.latLngBounds(
      validReports.map((r) => [r.latitude, r.longitude])
    );
    const latDiff = bounds.getNorth() - bounds.getSouth();
    const lngDiff = bounds.getEast() - bounds.getWest();
    const maxDiff = Math.max(latDiff, lngDiff);

    // Determine zoom level based on spread of reports
    let calculatedZoom = 12;
    if (maxDiff > 10) calculatedZoom = 5; // Country level
    else if (maxDiff > 5) calculatedZoom = 6; // State level
    else if (maxDiff > 1) calculatedZoom = 8; // City level
    else if (maxDiff > 0.5) calculatedZoom = 10; // District level
    else if (maxDiff > 0.1) calculatedZoom = 12; // Neighborhood level
    else calculatedZoom = 14; // Street level

    return {
      center: propCenter || [avgLat, avgLng] as [number, number],
      zoom: propZoom || calculatedZoom,
    };
  }, [reports, propCenter, propZoom]);

  useEffect(() => {
    // Only fetch if reports not provided via props
    if (!propReports) {
      loadReports();
    }
  }, [propReports]);

  const loadReports = async () => {
    try {
      setLoading(true);
      // Use optimized map data endpoint (only location data, cached)
      const mapData = await reportsApi.getMapData({
        limit: 1000, // Get up to 1000 reports for heat map
      });
      
      // Convert map data format to Report format for compatibility
      const reportsWithLocation: Report[] = mapData.reports.map((report) => ({
        id: report.id,
        latitude: report.lat,
        longitude: report.lng,
        severity: report.severity as any,
        status: report.status as any,
        category: report.category || null,
        report_number: report.report_number || undefined,
        created_at: report.created_at || new Date().toISOString(),
        title: `Report #${report.id}`,
        description: '',
        user_id: 0,
      } as Report));
      
      setReports(reportsWithLocation);
    } catch (error) {
      console.error('Error loading map reports:', error);
      // Fallback to mock data on error
      setReports(mockReports);
    } finally {
      setLoading(false);
    }
  };

  // Prepare heat map points with intensity based on severity
  const getHeatMapPoints = () => {
    return reports.map((report) => {
      // Calculate intensity based on severity
      const intensityMap: Record<string, number> = {
        critical: 1.0,
        high: 0.8,
        medium: 0.6,
        low: 0.4,
      };
      const intensity = intensityMap[report.severity] || 0.5;

      return {
        lat: report.latitude,
        lng: report.longitude,
        intensity,
      };
    });
  };

  const handleViewChange = (showHeatMap: boolean) => {
    setIsHeatMap(showHeatMap);
    if (onViewChange) {
      onViewChange(showHeatMap);
    }
  };

  if (loading) {
    return (
      <div style={{ height }} className="flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height }} className="relative">
      {/* View Toggle Button */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex gap-1">
        <button
          onClick={() => handleViewChange(true)}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            isHeatMap
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title="Heat Map View"
        >
          Heat Map
        </button>
        <button
          onClick={() => handleViewChange(false)}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            !isHeatMap
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title="Markers View"
        >
          Markers
        </button>
      </div>

      {/* Report Count Display */}
      {reports.length > 0 && (
        <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 px-3 py-2">
          <div className="text-sm font-semibold text-gray-900">
            {reports.length} {reports.length === 1 ? 'Report' : 'Reports'} Displayed
          </div>
          {reports.length >= 1000 && (
            <div className="text-xs text-gray-500 mt-1">
              Showing first 1000 reports
            </div>
          )}
        </div>
      )}

      {/* Heat Map Legend */}
      {isHeatMap && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs">
          <div className="text-xs font-semibold text-gray-900 mb-2">Report Distribution</div>
          
          {/* Heat Map Gradient */}
          <div className="mb-3">
            <div className="text-xs text-gray-600 mb-1">Heat Map Density</div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <div className="text-xs text-gray-500">Low</div>
                <div 
                  className="h-3 w-20 rounded"
                  style={{
                    background: 'linear-gradient(to right, #3b82f6, #06b6d4, #84cc16, #eab308, #f97316, #ef4444)'
                  }}
                ></div>
                <div className="text-xs text-gray-500">High</div>
              </div>
            </div>
          </div>

          {/* Colored Dots Legend */}
          <div className="border-t border-gray-200 pt-2">
            <div className="text-xs text-gray-600 mb-1">Report Severity (Dots)</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-700"></div>
                <span className="text-gray-600">Critical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-orange-700"></div>
                <span className="text-gray-600">High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-yellow-700"></div>
                <span className="text-gray-600">Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-blue-700"></div>
                <span className="text-gray-600">Low</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        key={`${center[0]}-${center[1]}-${reports.length}`} // Force re-render when reports change
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Auto-fit bounds to show all reports */}
        {reports.length > 0 && (
          <AutoFitBounds reports={reports} padding={[50, 50, 50, 50]} />
        )}
        
        {isHeatMap ? (
          // Heat Map View with Colored Dots
          <>
            <HeatmapLayer
              points={getHeatMapPoints()}
              radius={30}
              blur={20}
              maxZoom={18}
              minOpacity={0.4}
              max={1.0}
              gradient={{
                0.0: 'blue',
                0.2: 'cyan',
                0.4: 'lime',
                0.6: 'yellow',
                0.8: 'orange',
                1.0: 'red',
              }}
            />
            {/* Colored dots showing individual reports */}
            <ReportDotsLayer
              reports={reports}
              radius={8}
              opacity={0.8}
              weight={2}
            />
          </>
        ) : (
          // Markers View
          reports.map((report) => (
            <Marker
              key={report.id}
              position={[report.latitude, report.longitude]}
              icon={getMarkerIcon(report.status)}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-semibold text-gray-900">{report.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{report.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      report.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {report.status?.replace(/_/g, ' ')}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      report.severity === 'critical' || report.severity === 'high' ? 'bg-red-100 text-red-800' :
                      report.severity === 'medium' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {report.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {report.address || 'Location not specified'}
                  </p>
                  {report.report_number && (
                    <p className="text-xs font-medium text-primary-600 mt-1">
                      {report.report_number}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))
        )}
      </MapContainer>
    </div>
  );
};

export default CityMap;
