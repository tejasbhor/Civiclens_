"use client";

import React from 'react';
import { Report } from '@/types';

interface StatusActionsProps {
  report: Report;
  onAction: (action: string) => void;
}

export function StatusActions({ report, onAction }: StatusActionsProps) {
  // Deprecated component - replaced by PrimaryActionsPanel
  return null;
}
