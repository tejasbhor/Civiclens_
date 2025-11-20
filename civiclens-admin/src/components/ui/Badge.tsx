// NOTE: This file should be renamed to Badge.tsx (capital B) for proper module resolution
// Windows is case-insensitive but the module bundler is case-sensitive
"use client"

import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  status?: string; // For report status or severity
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ 
  variant = 'default', 
  size = 'md', 
  status,
  className, 
  children,
  ...props 
}) => {
  // If status prop is provided, determine styling based on status/severity
  const getStatusClasses = (status: string) => {
    const s = status.toLowerCase().replace(/_/g, ' ');
    
    // Severity levels
    if (s === 'critical') return 'bg-red-600 text-white border-red-700';
    if (s === 'high') return 'bg-orange-500 text-white border-orange-600';
    if (s === 'medium') return 'bg-yellow-500 text-white border-yellow-600';
    if (s === 'low') return 'bg-green-500 text-white border-green-600';
    
    // Report statuses
    if (s === 'received') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (s === 'pending classification') return 'bg-purple-100 text-purple-800 border-purple-200';
    if (s === 'classified') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    if (s === 'assigned to department') return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    if (s === 'assigned to officer') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (s === 'assignment rejected') return 'bg-orange-100 text-orange-800 border-orange-200';
    if (s === 'acknowledged') return 'bg-teal-100 text-teal-800 border-teal-200';
    if (s === 'in progress') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (s === 'pending verification') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (s === 'resolved') return 'bg-green-100 text-green-800 border-green-200';
    if (s === 'closed') return 'bg-gray-100 text-gray-800 border-gray-200';
    if (s === 'rejected') return 'bg-red-100 text-red-800 border-red-200';
    if (s === 'duplicate') return 'bg-gray-100 text-gray-800 border-gray-200';
    if (s === 'on hold') return 'bg-orange-100 text-orange-800 border-orange-200';
    if (s === 'reopened') return 'bg-purple-100 text-purple-800 border-purple-200';
    
    // Task statuses
    if (s === 'assigned') return 'bg-blue-100 text-blue-800 border-blue-200';
    
    // Appeal/Escalation statuses
    if (s === 'submitted' || s === 'pending') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (s === 'under review') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (s === 'approved') return 'bg-green-100 text-green-800 border-green-200';
    if (s === 'dismissed' || s === 'withdrawn') return 'bg-gray-100 text-gray-800 border-gray-200';
    
    // Default
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const variantClasses = {
    default: 'bg-blue-100 text-blue-800',
    secondary: 'bg-gray-100 text-gray-800',
    destructive: 'bg-red-100 text-red-800',
    outline: 'border border-gray-300 text-gray-700 bg-white',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-sm',
  };

  const displayText = status 
    ? status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : children;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg font-semibold border',
        status ? getStatusClasses(status) : variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {displayText}
    </span>
  );
};