import React, { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { HelpWidget } from "./components/HelpWidget";
import { ProtectedRoute } from "./components/ProtectedRoute";

// ==================== CONSTANTS ====================
export const ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  PATIENT: 'patient',
  AMBASSADOR: 'ambassador',
} as const;

export const ROUTES = {
  HOME: '/',
  SIGNIN: '/signin',
  SIGNUP: '/signup',
  ADMIN: '/admin',
  DOCTOR: '/doctor',
  PATIENT: '/dashboard',
  AMBASSADOR: '/ambassador/portal',
  SEARCH: '/search',
  BOOKINGS: '/bookings',
  PROFILE: '/profile',
} as const;

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
const load = (path: string) => lazy(() => import(path));

// Public Routes
const Index = load("./pages/Index");
const Memberships = load("./pages/Memberships");
const About = load("./pages/About");
const Team = load("./pages/Team");
const Legal = load("./pages/Legal");
const PrivacyPolicy = load("./pages/PrivacyPolicy");
const PAIAManual = load("./pages/PAIAManual");
const DoctorEnrollment = load("./pages/doctor/DoctorEnrollmentForm");
const AmbassadorProgramme = load("./pages/AmbassadorProgramme");
const DoctorSearch = load("./pages/DoctorSearch");
const DoctorProfile = load("./pages/DoctorProfile");
const Telemedicine = load("./pages/Telemedicine");
const DoctorPortal = load("./pages/DoctorPortal");
const PracticeManagement = load("./pages/PracticeManagement");
const Support = load("./pages/Support");
const Careers = load("./pages/Careers");
const Contact = load("./pages/Contact");
const NotFound = load("./pages/NotFound");
const BookingSuccess = load("./pages/BookingSuccess");
const PayFastSuccess = load("./pages/PayFastSuccess");
const PayFastCancel = load("./pages/PayFastCancel");
const BookingHistory = load("./pages/BookingHistory");
const EmailVerification = load("./pages/EmailVerification");
const Profile = load("./pages/Profile");
const CreateAdminAccount = load("./pages/CreateAdminAccount");
const RouteTest = load("./pages/RouteTest");
const FixAdminAccount = load("./pages/FixAdminAccount");
const ManualAdminSetup = load("./pages/ManualAdminSetup");
const InitialAdminSetup = load("./pages/InitialAdminSetup");

// Auth Routes
const SignIn = load("./pages/auth/SignIn");
const SignUpSelection = load("./pages/auth/SignUpSelection");
const PatientSignUp = load("./pages/auth/PatientSignUp");
const DoctorSignUp = load("./pages/auth/DoctorSignUp");
const AmbassadorSignUp = load("./pages/auth/AmbassadorSignUp");

// Dashboard Routes
const AdminDashboard = load("./pages/admin/AdminDashboard");
const DoctorDashboard = load("./pages/doctor/DoctorDashboard");
const PatientDashboard = load("./pages/patient/PatientDashboard");
const AmbassadorPortal = load("./pages/ambassador/AmbassadorPortal");
const PsychometricTest = load("./pages/ambassador/PsychometricTest");

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
              <Suspense fallback={<LoadingSpinner />}>
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
                    
                    {/* Doctor Routes */}
                    <Route path="/doctor" element={<DoctorDashboard />} />
                    <Route path="/doctor-enrollment" element={<DoctorEnrollment />} />
                    <Route path="/doctor/enrollment" element={<DoctorEnrollment />} />
                    <Route path="/doctor-enrollment-form" element={<DoctorEnrollment />} />
                    <Route path="/doctor-portal" element={<DoctorPortal />} />
                    <Route path="/practice-management" element={<PracticeManagement />} />
                    
                    {/* Patient Routes */}
                    <Route path="/dashboard" element={<PatientDashboard />} />
                    <Route path="/book/:doctorId" element={<BookAppointment />} />
                    <Route path="/bookings" element={<BookingHistory />} />
                    <Route path="/booking-history" element={<BookingHistory />} />
                    <Route path="/profile" element={<Profile />} />
                    
                    {/* Ambassador Routes */}
                    <Route path="/ambassador/portal" element={<AmbassadorPortal />} />
                    <Route path="/ambassador/psychometric-test" element={<PsychometricTest />} />
                  </Route>
                  
                  {/* ===== PAYMENT ROUTES (Public but handle redirects) ===== */}
                  <Route path="/booking-success" element={<BookingSuccess />} />
                  <Route path="/payfast/success" element={<PayFastSuccess />} />
                  <Route path="/payfast/cancel" element={<PayFastCancel />} />
                  
                  {/* ===== ADMIN SETUP ROUTES ===== */}
                  <Route path="/admin-setup" element={<InitialAdminSetup />} />
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