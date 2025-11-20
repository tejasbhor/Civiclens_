'use client';

import React from 'react';
import { AlertTriangle, ArrowRight, Users, Clock } from 'lucide-react';
import Link from 'next/link';

interface CriticalAction {
  id: string;
  type: 'unassigned' | 'overloaded' | 'sla_breach' | 'high_priority';
  title: string;
  description: string;
  count: number;
  actionLabel: string;
  actionLink: string;
}

interface CriticalActionsAlertProps {
  actions: CriticalAction[];
}

export const CriticalActionsAlert: React.FC<CriticalActionsAlertProps> = ({ actions }) => {
  if (actions.length === 0) {
    return null; // Don't show if no critical actions
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'unassigned':
        return Clock;
      case 'overloaded':
        return Users;
      default:
        return AlertTriangle;
    }
  };

  return (
    <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-red-100 rounded-lg flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-red-900 mb-3">
            Critical Actions Required
          </h3>
          <div className="space-y-3">
            {actions.map((action) => {
              const Icon = getIcon(action.type);
              return (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200 hover:border-red-300 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Icon className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {action.count} {action.title}
                      </p>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                  </div>
                  <Link
                    href={action.actionLink}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm whitespace-nowrap ml-4"
                  >
                    {action.actionLabel}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
