"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { authApi } from "@/lib/api/auth";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// Normalize phone number to match backend format (+91XXXXXXXXXX)
const normalizePhone = (phone: string): string => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If starts with 91, add +
  if (digits.startsWith('91')) {
    return '+' + digits;
  }
  
  // If 10 digits, add +91
  if (digits.length === 10) {
    return '+91' + digits;
  }
  
  // Otherwise return as-is with + if not present
  return digits.startsWith('+') ? digits : '+' + digits;
};

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, setAuth } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const onLogin = useCallback(async () => {
    if (loading || !phone || password.length < 8) return;
    
    try {
      setLoading(true);
      const normalizedPhone = normalizePhone(phone);
      const data = await authApi.login(normalizedPhone, password);
      
      // Update auth store
      setAuth(data.access_token, data.refresh_token || '', {
        id: data.user_id,
        role: data.role,
        phone: normalizedPhone,
      });
      
      toast.success("Logged in successfully");
      router.push('/dashboard');
    } catch (e: any) {
      // Errors are toasted by API client interceptor
      setLoading(false);
    }
  }, [loading, phone, password, setAuth, router]);


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>CivicLens Admin Portal</CardTitle>
          <p className="text-sm text-gray-500 mt-2">Government Officials & Administrators Only</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <Input
                placeholder="Enter registered phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && phone && password.length >= 8) {
                    onLogin();
                  }
                }}
              />
            </div>

            <Button 
              onClick={onLogin} 
              disabled={loading || !phone || password.length < 8}
              className="w-full"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="mt-4 text-sm text-center">
              <a href="/auth/forgot-password" className="text-primary-600 hover:underline">
                Forgot password?
              </a>
            </div>

            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800">
              <p className="font-semibold mb-1">🔒 Secure Access</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Password-based authentication for government officials</li>
                <li>All login attempts are logged and monitored</li>
                <li>Contact your system administrator for access</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

