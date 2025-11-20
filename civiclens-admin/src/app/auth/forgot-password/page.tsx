"use client";

import React, { useState } from "react";
import { authApi } from "@/lib/api/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

// Normalize phone number to match backend format (+91XXXXXXXXXX)
const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91')) return '+' + digits;
  if (digits.length === 10) return '+91' + digits;
  return digits.startsWith('+') ? digits : '+' + digits;
};

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<{ token?: string; expires?: number } | null>(null);

  const requestReset = async () => {
    try {
      setLoading(true);
      const normalizedPhone = normalizePhone(phone);
      const res = await authApi.requestPasswordReset(normalizedPhone);
      setSent({ token: res.reset_token, expires: res.expires_in_minutes });
      toast.success("If the phone exists, a reset token has been sent.");
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
          <CardTitle>Forgot Password</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Enter your registered phone number. We'll send a reset token via SMS (or display it in development).
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +91XXXXXXXXXX" />
            </div>
            <Button onClick={requestReset} disabled={loading || !phone}>
              {loading ? "Sending..." : "Send Reset Token"}
            </Button>
            {sent?.token && (
              <div className="mt-4 p-3 rounded-md bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                Development token: <code className="font-mono">{sent.token}</code>
                <div>Expires in {sent.expires} minutes</div>
              </div>
            )}
          </div>
          <div className="mt-6 text-sm text-gray-600">
            Remembered your password? <a href="/auth/login" className="text-primary-600 hover:underline">Back to sign in</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
