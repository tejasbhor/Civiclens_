import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import RequireAuth from '@/components/auth/RequireAuth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <TopNav />
        <main className="ml-64 pt-16">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
