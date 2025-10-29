import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import AcknowledgeTask from "./pages/officer/AcknowledgeTask";
import StartWork from "./pages/officer/StartWork";
import CompleteWork from "./pages/officer/CompleteWork";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            
            {/* Citizen Routes */}
            <Route path="/citizen/login" element={<CitizenLogin />} />
            <Route path="/citizen/dashboard" element={<CitizenDashboard />} />
            <Route path="/citizen/profile" element={<CitizenProfile />} />
            <Route path="/citizen/notifications" element={<CitizenNotifications />} />
            <Route path="/citizen/submit-report" element={<SubmitReport />} />
            <Route path="/citizen/track/:reportId" element={<TrackReport />} />
            <Route path="/citizen/reports" element={<Reports />} />
            
            {/* Officer Routes */}
            <Route path="/officer/login" element={<OfficerLogin />} />
            <Route path="/officer/dashboard" element={<OfficerDashboard />} />
            <Route path="/officer/profile" element={<OfficerProfile />} />
            <Route path="/officer/tasks" element={<Tasks />} />
            <Route path="/officer/task/:id" element={<TaskDetail />} />
            <Route path="/officer/task/:id/acknowledge" element={<AcknowledgeTask />} />
            <Route path="/officer/task/:id/start" element={<StartWork />} />
            <Route path="/officer/task/:id/complete" element={<CompleteWork />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
