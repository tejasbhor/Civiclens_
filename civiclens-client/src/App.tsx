import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { HelmetProvider } from "react-helmet-async";
import Landing from "./pages/Landing";
import CitizenLogin from "./pages/citizen/Login";
import CitizenDashboard from "./pages/citizen/Dashboard";
import CitizenProfile from "./pages/citizen/Profile";
import CitizenNotifications from "./pages/citizen/Notifications";
import SubmitReport from "./pages/citizen/SubmitReport";
import TrackReport from "./pages/citizen/TrackReport";
import Reports from "./pages/citizen/Reports";
import OfficerLogin from "./pages/officer/Login";
import OfficerDashboard from "./pages/officer/Dashboard";
import OfficerProfile from "./pages/officer/Profile";
import Tasks from "./pages/officer/Tasks";
import TaskDetail from "./pages/officer/TaskDetail";
import StartWork from "./pages/officer/StartWork";
import CompleteWork from "./pages/officer/CompleteWork";
import OfficerNotifications from "./pages/officer/Notifications";
import NotFound from "./pages/NotFound";

// Configure React Query with better error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on network errors or auth errors
        if (error?.isNetworkError || error?.isAuthError) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <ConnectionStatus />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                
                {/* Citizen Routes */}
                <Route path="/citizen/login" element={<CitizenLogin />} />
                <Route
                  path="/citizen/dashboard"
                  element={
                    <ProtectedRoute requiredRole="citizen">
                      <CitizenDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/citizen/profile"
                  element={
                    <ProtectedRoute requiredRole="citizen">
                      <CitizenProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/citizen/notifications"
                  element={
                    <ProtectedRoute requiredRole="citizen">
                      <CitizenNotifications />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/citizen/submit-report"
                  element={
                    <ProtectedRoute requiredRole="citizen">
                      <SubmitReport />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/citizen/track/:reportId"
                  element={
                    <ProtectedRoute requiredRole="citizen">
                      <TrackReport />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/citizen/reports"
                  element={
                    <ProtectedRoute requiredRole="citizen">
                      <Reports />
                    </ProtectedRoute>
                  }
                />
                
                {/* Officer Routes */}
                <Route path="/officer/login" element={<OfficerLogin />} />
                <Route
                  path="/officer/dashboard"
                  element={
                    <ProtectedRoute requiredRole="officer">
                      <OfficerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/officer/profile"
                  element={
                    <ProtectedRoute requiredRole="officer">
                      <OfficerProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/officer/tasks"
                  element={
                    <ProtectedRoute requiredRole="officer">
                      <Tasks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/officer/task/:id"
                  element={
                    <ProtectedRoute requiredRole="officer">
                      <TaskDetail />
                    </ProtectedRoute>
                  }
                />
                {/* Acknowledge action removed - now handled in TaskDetail page */}
                <Route
                  path="/officer/task/:id/start"
                  element={
                    <ProtectedRoute requiredRole="officer">
                      <StartWork />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/officer/task/:id/complete"
                  element={
                    <ProtectedRoute requiredRole="officer">
                      <CompleteWork />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/officer/notifications"
                  element={
                    <ProtectedRoute requiredRole="officer">
                      <OfficerNotifications />
                    </ProtectedRoute>
                  }
                />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
