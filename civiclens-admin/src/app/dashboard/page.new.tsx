import { Metadata } from 'next';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { getAllDashboardData } from '@/lib/server/dashboard-data';

// Add metadata for SEO
export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'CivicLens Admin Dashboard - Monitor and manage civic issues efficiently',
};

// Enable caching and revalidation
export const revalidate = 60; // Revalidate every 60 seconds

export default async function DashboardPage() {
  // Fetch data on server with caching
  const { stats, departmentStats, officerStats } = await getAllDashboardData();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Monitor system performance and manage civic issues
        </p>
      </div>

      {/* Client component for interactivity */}
      <DashboardClient
        initialStats={stats}
        initialDepartmentStats={departmentStats}
        initialOfficerStats={officerStats}
      />
    </div>
  );
}
