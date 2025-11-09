import { Button } from "@/components/ui/button";
import { Bell, User, LogOut, Menu, X, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface OfficerHeaderProps {
  onRefresh?: () => void;
  refreshing?: boolean;
}

/**
 * Professional header component for Officer Portal
 * Provides consistent navigation and branding
 */
export const OfficerHeader = ({ onRefresh, refreshing = false }: OfficerHeaderProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Branding */}
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary to-accent flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
              onClick={() => navigate('/officer/dashboard')}
              role="button"
              tabIndex={0}
              aria-label="CivicLens Officer Portal Home"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate('/officer/dashboard');
                }
              }}
            >
              <span className="text-lg font-bold text-white">CL</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">CivicLens</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Officer Portal</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/officer/dashboard')}
              className="text-sm"
            >
              Dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/officer/tasks')}
              className="text-sm"
            >
              Tasks
            </Button>
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={refreshing}
                aria-label="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <NotificationBell notificationsRoute="/officer/notifications" />
            <div className="flex items-center gap-2 pl-2 border-l">
              <span className="text-sm text-muted-foreground hidden lg:block">
                {user?.full_name || user?.phone}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/officer/profile')}
                aria-label="Profile"
              >
                <User className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-sm"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t mt-3 pt-3 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                navigate('/officer/dashboard');
                setMobileMenuOpen(false);
              }}
            >
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                navigate('/officer/tasks');
                setMobileMenuOpen(false);
              }}
            >
              Tasks
            </Button>
            {onRefresh && (
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  onRefresh();
                  setMobileMenuOpen(false);
                }}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                navigate('/officer/notifications');
                setMobileMenuOpen(false);
              }}
            >
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                navigate('/officer/profile');
                setMobileMenuOpen(false);
              }}
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive"
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

