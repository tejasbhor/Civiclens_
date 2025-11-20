"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/auth/RequireAuth";

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile/settings?tab=overview');
  }, [router]);

  return (
    <RequireAuth>
      <div className="p-6">Redirecting to Profile Settings…</div>
    </RequireAuth>
  );
}
