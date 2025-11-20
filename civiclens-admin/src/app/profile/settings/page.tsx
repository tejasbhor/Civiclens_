"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RequireAuth from "@/components/auth/RequireAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authApi } from "@/lib/api/auth";
import { usersApi } from "@/lib/api/users";
import { toast } from "sonner";
import { 
  User, 
  Shield, 
  Activity, 
  Settings, 
  Eye, 
  Palette, 
  Mail, 
  Phone, 
  Lock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Monitor,
  Smartphone,
  Globe,
  LogOut,
  Loader2
} from "lucide-react";

interface SessionItem {
  id: number;
  ip_address?: string;
  user_agent?: string;
  last_activity?: string;
  created_at?: string;
  is_active?: boolean;
}

type TabKey = "overview" | "security" | "sessions" | "preferences" | "accessibility" | "integrations";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabKey) || "overview";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Overview data
  const [user, setUser] = useState<any>(null);

  // Security: change password
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Preferences
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefSaving, setPrefSaving] = useState(false);
  const [theme, setTheme] = useState<'light'|'dark'|'auto'>("auto");
  const [density, setDensity] = useState<'comfortable'|'compact'>("comfortable");

  // Verification
  const [verLoading, setVerLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ value?: string; verified: boolean; last_sent_at?: string|null }|null>(null);
  const [phoneStatus, setPhoneStatus] = useState<{ value?: string; verified: boolean; last_sent_at?: string|null }|null>(null);
  const [emailToken, setEmailToken] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const me = await usersApi.getMe();
        setUser(me);
      } catch {}
    })();
  }, []);

  const profileCompletion = useMemo(() => {
    if (!user) return 0;
    const fields = [user.full_name, user.email, user.phone];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [user]);

  const loadSessions = async () => {
    try {
      setSessionsLoading(true);
      const res = await authApi.getSessions();
      setSessions(res.sessions as any);
    } catch (e) {
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "sessions") {
      loadSessions();
    }
    if (activeTab === "preferences") {
      (async () => {
        try {
          setPrefLoading(true);
          const pref = await usersApi.getMyPreferences();
          setTheme(pref.theme);
          setDensity(pref.density);
        } catch {}
        finally {
          setPrefLoading(false);
        }
      })();
    }
    if (activeTab === "security") {
      (async () => {
        try {
          setVerLoading(true);
          const ver = await usersApi.getMyVerification();
          setEmailStatus(ver.email);
          setPhoneStatus(ver.phone);
        } catch {}
        finally {
          setVerLoading(false);
        }
      })();
    }
  }, [activeTab]);

  const revoke = async (id: number) => {
    try {
      await authApi.revokeSession(id);
      toast.success("Session revoked");
      loadSessions();
    } catch (e) {}
  };

  const logoutAll = async () => {
    try {
      await authApi.logoutAll();
      toast.success("Logged out from all devices");
      // Redirect to login since current session is invalidated
      router.replace('/auth/login');
    } catch (e) {}
  };

  const logoutOthers = async () => {
    try {
      await authApi.logoutOthers();
      toast.success("All other sessions terminated");
      loadSessions();
    } catch (e) {}
  };

  const onChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }
    try {
      setChanging(true);
      await authApi.changePassword(oldPassword, newPassword);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully");
    } catch (e) {
    } finally {
      setChanging(false);
    }
  };

  const tabIcons: Record<TabKey, React.ElementType> = {
    overview: User,
    security: Shield,
    sessions: Activity,
    preferences: Settings,
    accessibility: Eye,
    integrations: Globe,
  };

  const TabButton = ({ k, label }: { k: TabKey; label: string }) => {
    const Icon = tabIcons[k];
    return (
      <button
        onClick={() => setActiveTab(k)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
          activeTab === k 
            ? "bg-blue-600 text-white shadow-sm" 
            : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
        }`}
      >
        <Icon className="w-4 h-4" />
        {label}
      </button>
    );
  };

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Settings className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Profile Settings</h1>
                  <p className="text-sm text-gray-600">Manage your account and preferences</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6">

        <div className="flex flex-wrap gap-2">
          <TabButton k="overview" label="Overview" />
          <TabButton k="security" label="Security" />
          <TabButton k="sessions" label="Activity & Sessions" />
          <TabButton k="preferences" label="Preferences" />
          <TabButton k="accessibility" label="Accessibility" />
          <TabButton k="integrations" label="Integrations" />
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!user ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                        {(user.full_name?.[0] || user.phone?.[0] || 'U').toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{user.full_name || 'User'}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full capitalize">
                            {user.role}
                          </span>
                          <span className="text-sm text-gray-500">
                            Joined {new Date(user.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <Phone className="w-4 h-4" />
                          <span className="text-sm font-medium">Phone Number</span>
                        </div>
                        <div className="text-gray-900 font-semibold">{user.phone}</div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <Mail className="w-4 h-4" />
                          <span className="text-sm font-medium">Email Address</span>
                        </div>
                        <div className="text-gray-900 font-semibold">{user.email || 'Not provided'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-600" />
                  Profile Completion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="relative inline-flex items-center justify-center w-32 h-32">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-200"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - profileCompletion / 100)}`}
                        className="text-blue-600 transition-all duration-500"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-gray-900">{profileCompletion}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-4">Complete your profile to unlock all features</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "security" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-red-600" />
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input 
                    type="password" 
                    label="Current Password"
                    value={oldPassword} 
                    onChange={(e) => setOldPassword(e.target.value)}
                    startIcon={<Lock className="w-4 h-4" />}
                  />
                  <Input 
                    type="password" 
                    label="New Password"
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                    startIcon={<Lock className="w-4 h-4" />}
                    helperText="Must be at least 8 characters"
                  />
                  <Input 
                    type="password" 
                    label="Confirm New Password"
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    startIcon={<Lock className="w-4 h-4" />}
                  />
                  <Button 
                    onClick={onChangePassword} 
                    loading={changing}
                    className="w-full"
                  >
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  Account Verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                {verLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-blue-900 font-medium">
                          <Mail className="w-4 h-4" />
                          Email Verification
                        </div>
                        {emailStatus?.verified ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            Not Verified
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-blue-800 mb-3">{emailStatus?.value || 'No email provided'}</div>
                      {!emailStatus?.verified && (
                        <div className="space-y-2">
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={async () => { 
                              const r = await usersApi.sendEmailVerification(); 
                              toast.success('Verification email sent'); 
                            }}
                          >
                            Send Verification Link
                          </Button>
                          <div className="flex gap-2">
                            <Input 
                              placeholder="Enter token" 
                              value={emailToken} 
                              onChange={(e) => setEmailToken(e.target.value)}
                              fullWidth={false}
                              className="flex-1"
                            />
                            <Button 
                              variant="secondary" 
                              size="sm"
                              onClick={async () => { 
                                await usersApi.verifyEmail(emailToken); 
                                toast.success('Email verified'); 
                                setEmailToken(''); 
                                const ver = await usersApi.getMyVerification(); 
                                setEmailStatus(ver.email); 
                              }}
                            >
                              Verify
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-purple-900 font-medium">
                          <Phone className="w-4 h-4" />
                          Phone Verification
                        </div>
                        {phoneStatus?.verified ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            Not Verified
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-purple-800 mb-3">{phoneStatus?.value || 'No phone provided'}</div>
                      {!phoneStatus?.verified && (
                        <div className="space-y-2">
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={async () => { 
                              const r = await usersApi.sendPhoneVerification(); 
                              toast.success('Verification OTP sent'); 
                            }}
                          >
                            Send OTP
                          </Button>
                          <div className="flex gap-2">
                            <Input 
                              placeholder="Enter OTP" 
                              value={phoneOtp} 
                              onChange={(e) => setPhoneOtp(e.target.value)}
                              fullWidth={false}
                              className="flex-1"
                            />
                            <Button 
                              variant="secondary" 
                              size="sm"
                              onClick={async () => { 
                                await usersApi.verifyPhone(phoneOtp); 
                                toast.success('Phone verified'); 
                                setPhoneOtp(''); 
                                const ver = await usersApi.getMyVerification(); 
                                setPhoneStatus(ver.phone); 
                              }}
                            >
                              Verify
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "sessions" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Activity & Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Manage your active sessions</p>
                    <p className="text-sm text-yellow-700 mt-1">Review and revoke access from any unfamiliar devices or locations</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                <Button variant="secondary" size="sm" onClick={logoutOthers}>
                  <LogOut className="w-4 h-4" />
                  Terminate Other Sessions
                </Button>
                <Button variant="danger" size="sm" onClick={logoutAll}>
                  <LogOut className="w-4 h-4" />
                  Terminate All Sessions
                </Button>
              </div>

              {sessionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium">No active sessions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((s) => {
                    const isThisDevice = typeof navigator !== 'undefined' && s.user_agent && navigator.userAgent && s.user_agent.indexOf(navigator.userAgent.substring(0, 25)) !== -1;
                    const isMobile = s.user_agent?.toLowerCase().includes('mobile');
                    return (
                      <div key={s.id} className="flex items-start justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 bg-white rounded-lg border border-gray-200">
                            {isMobile ? (
                              <Smartphone className="w-5 h-5 text-gray-600" />
                            ) : (
                              <Monitor className="w-5 h-5 text-gray-600" />
                            )}
                          </div>
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900 text-sm">{s.user_agent || 'Unknown device'}</span>
                              {isThisDevice && (
                                <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                  <CheckCircle className="w-3 h-3" />
                                  Current Session
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600">
                              <span>IP: {s.ip_address || 'Unknown'}</span>
                              <span className="mx-2">•</span>
                              <span>Last active: {s.last_activity || 'Unknown'}</span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => revoke(s.id)}
                          className="ml-4"
                        >
                          Revoke
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "preferences" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-indigo-600" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {prefLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
                      <div className="grid grid-cols-3 gap-3">
                        {['auto', 'light', 'dark'].map((t) => (
                          <button
                            key={t}
                            onClick={() => setTheme(t as any)}
                            className={`p-4 border-2 rounded-lg text-center transition-all ${
                              theme === t
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-sm font-medium capitalize">{t}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Density</label>
                      <div className="grid grid-cols-2 gap-3">
                        {['comfortable', 'compact'].map((d) => (
                          <button
                            key={d}
                            onClick={() => setDensity(d as any)}
                            className={`p-4 border-2 rounded-lg text-center transition-all ${
                              density === d
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-sm font-medium capitalize">{d}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button 
                      loading={prefSaving} 
                      onClick={async () => { 
                        try { 
                          setPrefSaving(true); 
                          await usersApi.updateMyPreferences({ theme, density }); 
                          toast.success('Preferences saved'); 
                        } finally { 
                          setPrefSaving(false); 
                        } 
                      }}
                      className="w-full"
                    >
                      Save Preferences
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-600" />
                  Display Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Additional display and notification preferences will be available here.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "accessibility" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-teal-600" />
                Accessibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg text-center">
                  <Eye className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">Accessibility Features Coming Soon</h4>
                  <p className="text-sm text-gray-600">
                    We're working on accessibility options including high contrast mode, font size adjustments, and screen reader optimizations.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-1">High Contrast Mode</h5>
                    <p className="text-xs text-gray-600">Enhanced visibility for better readability</p>
                  </div>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-1">Font Size Control</h5>
                    <p className="text-xs text-gray-600">Adjust text size for comfortable reading</p>
                  </div>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-1">Screen Reader Support</h5>
                    <p className="text-xs text-gray-600">Full compatibility with assistive technologies</p>
                  </div>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-1">Keyboard Navigation</h5>
                    <p className="text-xs text-gray-600">Complete keyboard accessibility</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "integrations" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                Connected Apps & Integrations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg text-center">
                  <Globe className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">Integrations Coming Soon</h4>
                  <p className="text-sm text-gray-600">
                    Connect with government services and third-party applications for enhanced functionality.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-orange-600" />
                      </div>
                      <h5 className="font-semibold text-gray-900">DigiLocker</h5>
                    </div>
                    <p className="text-xs text-gray-600">Link your DigiLocker for document verification</p>
                  </div>
                  
                  <div className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-red-600" />
                      </div>
                      <h5 className="font-semibold text-gray-900">Aadhaar</h5>
                    </div>
                    <p className="text-xs text-gray-600">Verify identity with Aadhaar integration</p>
                  </div>
                  
                  <div className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Lock className="w-5 h-5 text-blue-600" />
                      </div>
                      <h5 className="font-semibold text-gray-900">API Tokens</h5>
                    </div>
                    <p className="text-xs text-gray-600">Generate API keys for third-party access</p>
                  </div>
                  
                  <div className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Globe className="w-5 h-5 text-green-600" />
                      </div>
                      <h5 className="font-semibold text-gray-900">Webhooks</h5>
                    </div>
                    <p className="text-xs text-gray-600">Configure webhooks for real-time updates</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
        </div>
      </div>
    </RequireAuth>
  );
}
