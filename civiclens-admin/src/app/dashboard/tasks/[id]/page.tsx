'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Task Detail - {taskId}
        </h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">
            Task detail page is under development.
          </p>
          <button
            onClick={() => router.push('/dashboard/tasks')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Back to Tasks
          </button>
        </div>
      </div>
    </div>
  );
}
