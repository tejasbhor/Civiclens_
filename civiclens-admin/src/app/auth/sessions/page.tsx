"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import RequireAuth from "@/components/auth/RequireAuth";
import { toast } from "sonner";

interface SessionItem {
  id: number;
  ip_address?: string;
  user_agent?: string;
  last_activity?: string;
  created_at?: string;
  is_active?: boolean;
}

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await authApi.getSessions();
      setSessions(res.sessions as any);
    } catch (e) {
      // handled globally
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Redirect to new Profile Settings location but retain a functional page if user stays
    router.replace('/profile/settings?s=sessions');
    load();
  }, []);

  const revoke = async (id: number) => {
    try {
      await authApi.revokeSession(id);
      toast.success("Session revoked");
      load();
    } catch (e) {}
  };

  const logoutAll = async () => {
    try {
      await authApi.logoutAll();
      toast.success("Logged out from all devices");
      // user will be redirected by RequireAuth on next navigation
    } catch (e) {}
  };

  return (
    <RequireAuth>
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Manage your active sessions. Revoke any unfamiliar devices.
              </div>
              <Button variant="secondary" onClick={logoutAll}>Logout All</Button>
            </div>

            {loading ? (
              <div>Loading...</div>
            ) : sessions.length === 0 ? (
              <div className="text-sm text-gray-600">No active sessions.</div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="space-y-1 text-sm">
                      <div className="font-medium text-gray-900">{s.user_agent || "Unknown device"}</div>
                      <div className="text-gray-600">IP: {s.ip_address || "-"}</div>
                      <div className="text-gray-500">Last activity: {s.last_activity || "-"}</div>
                    </div>
                    <div>
                      <Button variant="secondary" onClick={() => revoke(s.id)}>Revoke</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RequireAuth>
  );
}
