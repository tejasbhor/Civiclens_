"use client";

import React, { useState } from "react";
import { authApi } from "@/lib/api/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Normalize phone number to match backend format (+91XXXXXXXXXX)
const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91')) return '+' + digits;
  if (digits.length === 10) return '+91' + digits;
  return digits.startsWith('+') ? digits : '+' + digits;
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const onReset = async () => {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      setLoading(true);
      const normalizedPhone = normalizePhone(phone);
      await authApi.resetPassword(normalizedPhone, token, password);
      toast.success("Password reset successfully. Please sign in.");
      router.replace("/auth/login");
    } catch (e) {
      // handled globally
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Enter the phone number used for your account, the reset token you received, and choose a new password.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +91XXXXXXXXXX" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Reset Token</label>
              <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste reset token" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">New Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Confirm Password</label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button onClick={onReset} disabled={loading || !phone || !token || password.length < 6 || password !== confirm}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
            <div className="mt-4 text-sm text-gray-600">
              Back to <a href="/auth/login" className="text-primary-600 hover:underline">Sign in</a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
