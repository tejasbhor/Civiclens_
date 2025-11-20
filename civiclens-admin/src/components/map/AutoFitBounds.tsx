/**
 * Component to automatically fit map bounds to show all reports
 */
'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface AutoFitBoundsProps {
  reports: Array<{ latitude: number; longitude: number }>;
  padding?: [number, number]; // [top, bottom, left, right] padding in pixels
}

/**
 * Auto-fit map bounds to show all reports
 */
export const AutoFitBounds: React.FC<AutoFitBoundsProps> = ({ 
  reports, 
  padding = [50, 50, 50, 50] 
}) => {
  const map = useMap();

  useEffect(() => {
    if (!reports || reports.length === 0) {
      return;
    }

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
      return;
    }

    // Calculate bounds from all reports
    const bounds = L.latLngBounds(
      validReports.map((report) => [report.latitude, report.longitude])
    );

    // Fit map to bounds with padding
    try {
      map.fitBounds(bounds, {
        padding: padding,
        maxZoom: 15, // Don't zoom in too much if reports are close together
      });
    } catch (error) {
      console.error('Error fitting bounds:', error);
    }
  }, [map, reports, padding]);

  return null;
};

