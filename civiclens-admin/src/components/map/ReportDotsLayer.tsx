/**
 * Colored dots layer for reports
 * Shows individual reports as colored circles based on severity
 */
'use client';

import React from 'react';
import { CircleMarker, Popup } from 'react-leaflet';
import { Report } from '@/types';

interface ReportDotsLayerProps {
  reports: Report[];
  radius?: number;
  opacity?: number;
  weight?: number;
}

/**
 * Get color based on report severity
 */
const getSeverityColor = (severity: string): string => {
  const colorMap: Record<string, string> = {
    critical: '#ef4444', // red-500
    high: '#f97316',     // orange-500
    medium: '#eab308',   // yellow-500
    low: '#3b82f6',      // blue-500
  };
  return colorMap[severity] || '#6b7280'; // gray-500
};

/**
 * Get fill color (lighter version) based on severity
 */
const getSeverityFillColor = (severity: string): string => {
  const colorMap: Record<string, string> = {
    critical: '#fee2e2', // red-100
    high: '#ffedd5',     // orange-100
    medium: '#fef9c3',   // yellow-100
    low: '#dbeafe',      // blue-100
  };
  return colorMap[severity] || '#f3f4f6'; // gray-100
};

/**
 * Report dots layer component
 * Displays reports as colored circles on the map
 */
export const ReportDotsLayer: React.FC<ReportDotsLayerProps> = ({
  reports,
  radius = 8,
  opacity = 0.8,
  weight = 2,
}) => {
  if (!reports || reports.length === 0) {
    return null;
  }

  return (
    <>
      {reports.map((report) => {
        if (!report.latitude || !report.longitude) {
          return null;
        }

        const color = getSeverityColor(report.severity);
        const fillColor = getSeverityFillColor(report.severity);

        return (
          <CircleMarker
            key={report.id}
            center={[report.latitude, report.longitude]}
            radius={radius}
            pathOptions={{
              color,
              fillColor,
              fillOpacity: opacity,
              weight,
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-semibold text-gray-900">
                  {report.title || `Report #${report.id}`}
                </h3>
                {report.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {report.description}
                  </p>
                )}
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
                {report.address && (
                  <p className="text-xs text-gray-500 mt-2">
                    {report.address}
                  </p>
                )}
                {report.report_number && (
                  <p className="text-xs font-medium text-primary-600 mt-1">
                    {report.report_number}
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
};

