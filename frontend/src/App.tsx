// App.tsx
import React, { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { HelpWidget } from "./components/HelpWidget";
import InitialAdminSetup from './pages/InitialAdminSetup';
import RoleBasedDashboard from "./pages/RoleBasedDashboard";

// ==================== QUERY CLIENT ====================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

// ==================== LAZY LOADING ====================
// Public Routes
const Index = lazy(() => import("./pages/Index"));
const Memberships = lazy(() => import("./pages/Memberships"));
const About = lazy(() => import("./pages/About"));
const Team = lazy(() => import("./pages/Team"));
const Legal = lazy(() => import("./pages/Legal"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const PAIAManual = lazy(() => import("./pages/PAIAManual"));
const DoctorEnrollment = lazy(() => import("./pages/doctor/DoctorEnrollmentForm"));
const AmbassadorProgramme = lazy(() => import("./pages/AmbassadorProgramme"));
const DoctorSearch = lazy(() => import("./pages/doctor/components/DoctorSearch"));
const DoctorProfile = lazy(() => import("./pages/DoctorProfile"));
const BookAppointment = lazy(() => import("./pages/BookAppointment"));
const Telemedicine = lazy(() => import("./pages/Telemedicine"));
const DoctorPortal = lazy(() => import("./pages/DoctorPortal"));
const PracticeManagement = lazy(() => import("./pages/PracticeManagement"));
const Support = lazy(() => import("./pages/Support"));
const Careers = lazy(() => import("./pages/Careers"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));
const PayFastSuccess = lazy(() => import("./pages/PayFastSuccess"));
const PayFastCancel = lazy(() => import("./pages/PayFastCancel"));
const BookingHistory = lazy(() => import("./pages/BookingHistory"));
const EmailVerification = lazy(() => import("./pages/EmailVerification"));
const Profile = lazy(() => import("./pages/Profile"));
const CreateAdminAccount = lazy(() => import("./pages/CreateAdminAccount"));
const RouteTest = lazy(() => import("./pages/RouteTest"));
const FixAdminAccount = lazy(() => import("./pages/FixAdminAccount"));
const ManualAdminSetup = lazy(() => import("./pages/ManualAdminSetup"));

// Auth Routes
const SignIn = lazy(() => import("./pages/auth/SignIn"));
const SignUpSelection = lazy(() => import("./pages/auth/SignUpSelection"));
const PatientSignUp = lazy(() => import("./pages/patient/PatientSignUp"));
const DoctorSignUp = lazy(() => import("./pages/doctor/DoctorSignUp"));
const AmbassadorSignUp = lazy(() => import("./pages/ambassador/AmbassadorSignUp"));

// Dashboard Routes
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const DoctorDashboard = lazy(() => import("./pages/doctor/DoctorDashboard"));
const PatientDashboard = lazy(() => import("./pages/patient/PatientDashboard"));
const AmbassadorPortal = lazy(() => import("./pages/ambassador/AmbassadorPortal"));
const PsychometricTest = lazy(() => import("./pages/ambassador/PsychometricTest"));

// ==================== LOADING SPINNER COMPONENT ====================
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-600 text-sm">Loading...</p>
    </div>
  </div>
);

// ==================== PROTECTED ROUTE ====================
const ProtectedRoute = () => {
  const { user, profile, isLoading } = useAuth();
  
  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // If user has no profile, redirect to signin
  if (!profile) {
    return <Navigate to="/signin" replace />;
  }

  return <Outlet />;
};

// ==================== APP COMPONENT ====================
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* ===== PUBLIC ROUTES ===== */}
                  <Route path="/" element={<Index />} />
                  <Route path="/memberships" element={<Memberships />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/legal" element={<Legal />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/paia-manual" element={<PAIAManual />} />
                  <Route path="/search" element={<DoctorSearch />} />
                  <Route path="/doctor/:doctorId" element={<DoctorProfile />} />
                  <Route path="/telemedicine" element={<Telemedicine />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/careers" element={<Careers />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/ambassador-programme" element={<AmbassadorProgramme />} />
                  
                  {/* ===== AUTH ROUTES ===== */}
                  <Route path="/signin" element={<SignIn />} />
                  <Route path="/login" element={<Navigate to="/signin" replace />} />
                  <Route path="/signup" element={<SignUpSelection />} />
                  <Route path="/signup/patient" element={<PatientSignUp />} />
                  <Route path="/signup/doctor" element={<DoctorSignUp />} />
                  <Route path="/signup/ambassador" element={<AmbassadorSignUp />} />
                  <Route path="/verify-email" element={<EmailVerification />} />
                  
                  {/* ===== PROTECTED ROUTES ===== */}
                  <Route element={<ProtectedRoute />}>
                    {/* Admin Routes */}
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/create-admin-account" element={<CreateAdminAccount />} />
                    <Route path="/admin-setup" element={<InitialAdminSetup />} />
                    
                    {/* Doctor Routes */}
                    <Route path="/doctor" element={<DoctorDashboard />} />
                    <Route path="/doctor-enrollment" element={<DoctorEnrollment />} />
                    <Route path="/doctor/enrollment" element={<DoctorEnrollment />} />
                    <Route path="/doctor-enrollment-form" element={<DoctorEnrollment />} />
                    <Route path="/doctor-portal" element={<DoctorPortal />} />
                    <Route path="/practice-management" element={<PracticeManagement />} />
                    
                    {/* Patient Routes */}
                    <Route path="/patient" element={<PatientDashboard />} />
                    <Route path="/dashboard" element={<RoleBasedDashboard />} />
                    <Route path="/book/:doctorId" element={<BookAppointment />} />
                    <Route path="/bookings" element={<BookingHistory />} />
                    <Route path="/booking-history" element={<BookingHistory />} />
                    <Route path="/BookingHistory" element={<BookingHistory />} />
                    <Route path="/profile" element={<Profile />} />
                    
                    {/* Ambassador Routes */}
                    <Route path="/ambassador/portal" element={<AmbassadorPortal />} />
                    <Route path="/ambassador/psychometric-test" element={<PsychometricTest />} />
                  </Route>
                  
                  {/* ===== PAYMENT ROUTES ===== */}
                  <Route path="/booking-success" element={<BookingSuccess />} />
                  <Route path="/BookingSuccess" element={<Navigate to="/booking-success" replace />} />
                  <Route path="/bookingSuccess" element={<Navigate to="/booking-success" replace />} />
                  <Route path="/payfast/success" element={<PayFastSuccess />} />
                  <Route path="/payfast/cancel" element={<PayFastCancel />} />
                  
                  {/* ===== ADMIN SETUP ROUTES (Aliases) ===== */}
                  <Route path="/AdminSetup" element={<Navigate to="/admin-setup" replace />} />
                  <Route path="/adminSetup" element={<Navigate to="/admin-setup" replace />} />
                  <Route path="/admin_setup" element={<Navigate to="/admin-setup" replace />} />
                  <Route path="/ADMIN_SETUP" element={<Navigate to="/admin-setup" replace />} />
                  
                  {/* ===== FIX/UTILITY ROUTES ===== */}
                  <Route path="/fix-admin-account" element={<FixAdminAccount />} />
                  <Route path="/manual-admin-setup" element={<ManualAdminSetup />} />
                  <Route path="/route-test" element={<RouteTest />} />
                  
                  {/* ===== 404 ===== */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <HelpWidget />
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;