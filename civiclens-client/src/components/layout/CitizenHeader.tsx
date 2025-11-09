import { Button } from "@/components/ui/button";
import { Bell, User, LogOut, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

/**
 * Professional header component for Citizen Portal
 * Provides consistent navigation and branding
 */
export const CitizenHeader = () => {
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
              className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
              onClick={() => navigate('/citizen/dashboard')}
              role="button"
              tabIndex={0}
              aria-label="CivicLens Citizen Portal Home"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate('/citizen/dashboard');
                }
              }}
            >
              <span className="text-lg font-bold text-primary-foreground">CL</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">CivicLens</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Citizen Portal</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/citizen/dashboard')}
              className="text-sm"
            >
              Dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/citizen/reports')}
              className="text-sm"
            >
              My Reports
            </Button>
            <NotificationBell notificationsRoute="/citizen/notifications" />
            <div className="flex items-center gap-2 pl-2 border-l">
              <span className="text-sm text-muted-foreground hidden lg:block">
                {user?.full_name || user?.phone}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/citizen/profile')}
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
                navigate('/citizen/dashboard');
                setMobileMenuOpen(false);
              }}
            >
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                navigate('/citizen/reports');
                setMobileMenuOpen(false);
              }}
            >
              My Reports
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                navigate('/citizen/notifications');
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
                navigate('/citizen/profile');
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

