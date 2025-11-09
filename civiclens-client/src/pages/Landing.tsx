import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Users, Shield, TrendingUp, CheckCircle2, Clock, MapPin, FileText, AlertCircle, Mail, Phone, ExternalLink, HelpCircle, Info } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useState, useEffect } from "react";
import apiClient from "@/services/apiClient";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardPath } from "@/utils/authHelpers";

interface Stats {
  total_reports: number;
  resolved_reports: number;
  active_officers: number;
  avg_resolution_days: number;
}

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Redirect logged-in users to their appropriate dashboard
  useEffect(() => {
    if (!authLoading && user) {
      const dashboardPath = getDashboardPath(user);
      if (dashboardPath !== '/') {
        navigate(dashboardPath, { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  // Fetch real-time stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        // Use public stats endpoint (no auth required)
        const response = await apiClient.get('/analytics/public/stats');
        logger.debug('Public stats received:', response.data);
        
        // Map backend response to frontend format
        const statsData = response.data;
        setStats({
          total_reports: statsData.total_reports || 0,
          resolved_reports: statsData.resolved_reports || 0,
          active_officers: statsData.active_officers || 0,
          avg_resolution_days: statsData.avg_resolution_days || 0
        });
      } catch (error: any) {
        logger.error('Failed to fetch stats:', error);
        // Don't show error to user, just don't display stats section
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    };

    // Only fetch if user is not logged in (to avoid unnecessary calls)
    if (!user) {
    fetchStats();
    }
  }, [user]);

  // Format number with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(Math.floor(num));
  };

  return (
    <>
      <SEO
        title="CivicLens - Civic Issue Reporting Portal"
        description="CivicLens is the official civic issue reporting and resolution portal. Citizens can report issues and track their resolution, while officers manage and resolve civic concerns."
        keywords="civic issues, municipal services, citizen reporting, issue tracking, government portal"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
        <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <MapPin className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">CivicLens</h1>
                  <p className="text-xs text-muted-foreground">Civic Issue Reporting Portal</p>
                </div>
              </div>
            </div>
          </div>
      </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12 max-w-6xl">
          {/* Introduction Section */}
          <section className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Civic Issue Reporting Portal
          </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
              Report civic issues, track their resolution progress, and contribute to improving your community. 
              This portal facilitates communication between citizens and municipal officers for efficient issue resolution.
          </p>
          </section>

          {/* Portal Access Cards - PRIMARY CTA */}
          <section className="mb-16">
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <Card 
                className="p-8 hover:shadow-xl transition-all cursor-pointer border-2 border-primary/20 hover:border-primary bg-gradient-to-br from-primary/5 via-card to-card"
                onClick={() => navigate('/citizen/login')}
                role="button"
                tabIndex={0}
                aria-label="Access Citizen Portal"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate('/citizen/login');
                  }
                }}
              >
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Users className="w-10 h-10 text-white" />
              </div>
                <h3 className="text-2xl font-bold text-foreground mb-3 text-center">Citizen Portal</h3>
                <p className="text-muted-foreground mb-6 text-center">
                  Report civic issues, track resolution progress, and view your report history
                </p>
                <Button className="w-full" size="lg" variant="default">
                  Access Citizen Portal
              </Button>
            </Card>

              <Card 
                className="p-8 hover:shadow-xl transition-all cursor-pointer border-2 border-secondary/20 hover:border-secondary bg-gradient-to-br from-secondary/5 via-card to-card"
                onClick={() => navigate('/officer/login')}
                role="button"
                tabIndex={0}
                aria-label="Access Officer Portal"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate('/officer/login');
                  }
                }}
              >
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Shield className="w-10 h-10 text-white" />
              </div>
                <h3 className="text-2xl font-bold text-foreground mb-3 text-center">Officer Portal</h3>
                <p className="text-muted-foreground mb-6 text-center">
                  Manage assigned tasks, update issue status, and resolve civic concerns
                </p>
              <Button variant="secondary" className="w-full" size="lg">
                  Access Officer Portal
              </Button>
            </Card>
          </div>
          </section>

          {/* System Statistics - SECONDARY INFO */}
          <section className="mb-16">
            <div className="text-center mb-6">
              <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-2">
                Platform Statistics
              </h3>
              <p className="text-sm text-muted-foreground">
                Real-time metrics showcasing our impact
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
              <Card className="p-4 text-center border border-blue-200/50 bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                  <FileText className="w-5 h-5 text-blue-600" />
        </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                {statsLoading ? (
                    <span className="inline-block animate-pulse bg-gray-200 rounded h-6 w-16"></span>
                  ) : stats ? (
                    formatNumber(stats.total_reports)
                ) : (
                    <span className="text-muted-foreground text-lg">-</span>
                )}
              </div>
                <div className="text-xs font-medium text-muted-foreground">Total Reports</div>
            </Card>
              <Card className="p-4 text-center border border-green-200/50 bg-green-50/30 hover:bg-green-50/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
        </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {statsLoading ? (
                    <span className="inline-block animate-pulse bg-gray-200 rounded h-6 w-16"></span>
                  ) : stats ? (
                    formatNumber(stats.resolved_reports)
                  ) : (
                    <span className="text-muted-foreground text-lg">-</span>
                  )}
                </div>
                <div className="text-xs font-medium text-muted-foreground">Resolved Issues</div>
              </Card>
              <Card className="p-4 text-center border border-purple-200/50 bg-purple-50/30 hover:bg-purple-50/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
                  <Shield className="w-5 h-5 text-purple-600" />
          </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {statsLoading ? (
                    <span className="inline-block animate-pulse bg-gray-200 rounded h-6 w-16"></span>
                  ) : stats ? (
                    formatNumber(stats.active_officers)
                  ) : (
                    <span className="text-muted-foreground text-lg">-</span>
                  )}
        </div>
                <div className="text-xs font-medium text-muted-foreground">Active Officers</div>
              </Card>
              <Card className="p-4 text-center border border-orange-200/50 bg-orange-50/30 hover:bg-orange-50/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-5 h-5 text-orange-600" />
          </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {statsLoading ? (
                    <span className="inline-block animate-pulse bg-gray-200 rounded h-6 w-16"></span>
                  ) : stats ? (
                    `${stats.avg_resolution_days.toFixed(1)}`
                  ) : (
                    <span className="text-muted-foreground text-lg">-</span>
                  )}
        </div>
                <div className="text-xs font-medium text-muted-foreground">Avg. Resolution (Days)</div>
              </Card>
            </div>
            {!stats && !statsLoading && (
              <div className="text-center mt-3">
                <p className="text-xs text-muted-foreground">
                  Statistics are being updated
                </p>
        </div>
            )}
      </section>

          {/* Quick Information */}
          <section className="mb-12">
            <Card className="p-8 bg-card/50">
              <h3 className="text-xl font-semibold text-foreground mb-4">About This Portal</h3>
              <div className="space-y-4 text-muted-foreground">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground mb-1">For Citizens</p>
                    <p className="text-sm">Submit reports for civic issues such as potholes, streetlights, waste management, and other municipal concerns. Track the status of your reports and receive updates on resolution progress.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
            <div>
                    <p className="font-medium text-foreground mb-1">For Officers</p>
                    <p className="text-sm">Access your assigned tasks, update issue status, upload resolution documentation, and manage civic issue resolution workflow.</p>
                  </div>
                </div>
              </div>
            </Card>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t bg-card/80 backdrop-blur-sm mt-16">
          <div className="container mx-auto px-4 py-12">
            {/* Main Footer Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              {/* Brand Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">CivicLens</h3>
                    <p className="text-xs text-muted-foreground">Civic Issue Reporting Portal</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Empowering citizens and officers to work together for better civic infrastructure and community services.
              </p>
            </div>
            
              {/* Quick Links */}
            <div>
                <h4 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide">Quick Links</h4>
                <ul className="space-y-2">
                  <li>
                    <a 
                      href="#" 
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/citizen/login');
                      }}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Citizen Portal
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#" 
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/officer/login');
                      }}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Officer Portal
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                      <HelpCircle className="w-3 h-3" />
                      Help & Support
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                      <Info className="w-3 h-3" />
                      About This Portal
                    </a>
                  </li>
              </ul>
            </div>
            
              {/* Legal & Policies */}
            <div>
                <h4 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide">Legal</h4>
                <ul className="space-y-2">
                  <li>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Terms of Service
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Accessibility Statement
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Data Protection
                    </a>
                  </li>
              </ul>
            </div>
            
              {/* Contact Information */}
            <div>
                <h4 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide">Contact</h4>
                <ul className="space-y-3">
                  <li>
                    <a 
                      href="mailto:support@civiclens.gov.in" 
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4 shrink-0" />
                      <span className="break-all">support@civiclens.gov.in</span>
                    </a>
                  </li>
                  <li>
                    <a 
                      href="tel:+911234567890" 
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4 shrink-0" />
                      <span>+91 1234 567 890</span>
                    </a>
                  </li>
                  <li className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      Office Hours: Monday - Friday<br />
                      9:00 AM - 6:00 PM IST
                    </p>
                  </li>
              </ul>
            </div>
          </div>
          
            {/* Bottom Bar */}
            <div className="border-t border-border/50 pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground text-center md:text-left">
                  <p>© {new Date().getFullYear()} CivicLens Portal. All rights reserved.</p>
                  <p className="text-xs mt-1">A Government of India initiative for civic issue management and resolution.</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Version 1.0.0</span>
                  <span className="hidden md:inline">•</span>
                  <span className="hidden md:inline">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
};

export default Landing;
