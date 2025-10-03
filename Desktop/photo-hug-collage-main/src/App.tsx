import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ProjectSetupDialog } from "@/components/ProjectSetupDialog";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Dashboard from "@/pages/Dashboard";
import PatientOnboarding from "@/pages/PatientOnboarding";
import VitalDataCollection from "@/pages/VitalDataCollection";
import AppointmentBooking from "@/pages/AppointmentBooking";
import DoctorAnalysis from "@/pages/DoctorAnalysis";
import LabTests from "@/pages/LabTests";
import Prescriptions from "@/pages/Prescriptions";
import Pharmacy from "@/pages/Pharmacy";
import ConsentManagement from "@/pages/ConsentManagement";
import PreOperative from "@/pages/PreOperative";
import DuringOperation from "@/pages/DuringOperation";
import SurgeryTracking from "@/pages/SurgeryTracking";
import PostOperative from "@/pages/PostOperative";
import RecordsManagement from "@/pages/RecordsManagement";
import PatientFollowup from "@/pages/PatientFollowup";
import DataExport from "@/pages/DataExport";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

// App Content with Auth Context
function AppContent() {
  const [showProjectSetup, setShowProjectSetup] = useState(false);
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    // Check if project setup was already completed after authentication
    if (isAuthenticated) {
      const projectType = localStorage.getItem('aiaa-project-type');
      if (!projectType) {
        setShowProjectSetup(true);
      }
    }
  }, [isAuthenticated]);

  const handleProjectSetupComplete = (projectType: string) => {
    localStorage.setItem('aiaa-project-type', projectType);
    setShowProjectSetup(false);
  };

  return (
    <>
      <Toaster />
      <Sonner />
      <ProjectSetupDialog 
        open={showProjectSetup}
        onComplete={handleProjectSetupComplete}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout title="Dashboard" subtitle="Overview & Analytics"><Dashboard /></DashboardLayout></ProtectedRoute>} />
          <Route path="/patients" element={<ProtectedRoute><DashboardLayout title="Patient Onboarding" subtitle="Register new patients"><PatientOnboarding /></DashboardLayout></ProtectedRoute>} />
          <Route path="/vitals" element={<ProtectedRoute><DashboardLayout title="Vital Data Collection" subtitle="Record vital signs"><VitalDataCollection /></DashboardLayout></ProtectedRoute>} />
          <Route path="/appointments" element={<ProtectedRoute><DashboardLayout title="Appointment Booking" subtitle="Schedule consultations"><AppointmentBooking /></DashboardLayout></ProtectedRoute>} />
          <Route path="/analysis" element={<ProtectedRoute><DashboardLayout title="Doctor Analysis" subtitle="Assessment & diagnosis"><DoctorAnalysis /></DashboardLayout></ProtectedRoute>} />
          <Route path="/lab-tests" element={<ProtectedRoute><DashboardLayout title="Laboratory Tests" subtitle="Order & manage diagnostic tests"><LabTests /></DashboardLayout></ProtectedRoute>} />
          <Route path="/prescriptions" element={<ProtectedRoute><DashboardLayout title="Prescriptions" subtitle="Medication management"><Prescriptions /></DashboardLayout></ProtectedRoute>} />
          <Route path="/pharmacy" element={<ProtectedRoute><DashboardLayout title="Pharmacy" subtitle="Drug dispensing & collection"><Pharmacy /></DashboardLayout></ProtectedRoute>} />
          <Route path="/consent" element={<ProtectedRoute><DashboardLayout title="Consent Management" subtitle="Surgery consent forms"><ConsentManagement /></DashboardLayout></ProtectedRoute>} />
          <Route path="/pre-operative" element={<ProtectedRoute><DashboardLayout title="Pre-Operative" subtitle="WHO pre-op checklist"><PreOperative /></DashboardLayout></ProtectedRoute>} />
          <Route path="/during-operation" element={<ProtectedRoute><DashboardLayout title="During Operation" subtitle="Intra-operative monitoring"><DuringOperation /></DashboardLayout></ProtectedRoute>} />
          <Route path="/surgery-tracking" element={<ProtectedRoute><DashboardLayout title="Surgery Tracking" subtitle="Monitor surgical procedures"><SurgeryTracking /></DashboardLayout></ProtectedRoute>} />
          <Route path="/post-operative" element={<ProtectedRoute><DashboardLayout title="Post-Operative" subtitle="Recovery tracking"><PostOperative /></DashboardLayout></ProtectedRoute>} />
          <Route path="/records" element={<ProtectedRoute><DashboardLayout title="Patient Records" subtitle="Complete history & export"><RecordsManagement /></DashboardLayout></ProtectedRoute>} />
          <Route path="/followup" element={<ProtectedRoute><DashboardLayout title="Follow-up" subtitle="Patient follow-up care"><PatientFollowup /></DashboardLayout></ProtectedRoute>} />
          <Route path="/data-export" element={<ProtectedRoute><DashboardLayout title="Data Export" subtitle="Export patient data for research"><DataExport /></DashboardLayout></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
