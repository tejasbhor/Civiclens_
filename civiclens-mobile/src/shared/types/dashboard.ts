/**
 * Dashboard Types
 * Type definitions for citizen dashboard data
 */

export interface DashboardStats {
  issuesRaised: number;
  inProgress: number;
  resolved: number;
  total: number;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'emergency';
  icon: string;
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

export interface NearbyReport {
  id: number;
  latitude: number;
  longitude: number;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  title: string;
  distance?: number; // in kilometers
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  city: string;
  area: string;
  accuracy: number;
}
