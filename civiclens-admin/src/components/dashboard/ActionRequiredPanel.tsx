'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, Clock, CheckCircle, Zap } from 'lucide-react';
import Link from 'next/link';

interface ActionItem {
  id: number;
  title: string;
  type: 'high_priority' | 'pending_review' | 'overdue' | 'ai_alert';
  count?: number;
  items: Array<{
    id: number;
    title: string;
    subtitle: string;
    priority?: string;
  }>;
}

const mockData: ActionItem[] = [
  {
    id: 1,
    title: 'High Priority Unassigned',
    type: 'high_priority',
    count: 7,
    items: [
      { id: 1234, title: 'Pothole on MG Road', subtitle: 'Navi Mumbai, Jharkhand', priority: 'critical' },
      { id: 1235, title: 'Streetlight failure', subtitle: 'Circular Road', priority: 'high' },
    ],
  },
  {
    id: 2,
    title: 'Pending Reviews',
    type: 'pending_review',
    count: 3,
    items: [
      { id: 456, title: 'Task #456 - Proof needed', subtitle: 'Officer Kumar', priority: 'medium' },
    ],
  },
  {
    id: 3,
    title: 'Overdue Tasks',
    type: 'overdue',
    count: 2,
    items: [
      { id: 789, title: 'Task #789', subtitle: '2 days late', priority: 'high' },
    ],
  },
  {
    id: 4,
    title: 'AI Alerts',
    type: 'ai_alert',
    count: 1,
    items: [
      { id: 1, title: 'Duplicate cluster detected', subtitle: '5 similar reports in Doranda', priority: 'medium' },
    ],
  },
];

export const ActionRequiredPanel: React.FC = () => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'high_priority':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'pending_review':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'overdue':
        return <CheckCircle className="w-5 h-5 text-orange-600" />;
      case 'ai_alert':
        return <Zap className="w-5 h-5 text-purple-600" />;
      default:
        return null;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Action Required</CardTitle>
        <Link href="/dashboard/reports?filter=action_required" className="text-sm text-primary-600 hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin">
        {mockData.map((section) => (
          <div key={section.id} className="border-b border-gray-200 pb-4 last:border-0">
            <div className="flex items-center gap-2 mb-3">
              {getIcon(section.type)}
              <h4 className="font-semibold text-gray-900 flex-1">
                {section.title}
              </h4>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                {section.count}
              </span>
            </div>
            <div className="space-y-2">
              {section.items.map((item) => (
                <Link
                  key={item.id}
                  href={`/dashboard/reports/${item.id}`}
                  className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border-l-3 border-l-red-500"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
                    </div>
                    {item.priority && (
                      <Badge status={item.priority} size="sm" />
                    )}
                  </div>
                </Link>
              ))}
              {section.count && section.count > section.items.length && (
                <button className="text-sm text-primary-600 hover:underline pl-3">
                  See all {section.count}
                </button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
