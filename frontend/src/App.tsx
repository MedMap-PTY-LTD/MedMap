import React, { lazy, Suspense, useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HelpCircle, MessageCircle, Phone, AlertTriangle, Heart, Ambulance, Shield } from 'lucide-react';
import InitialAdminSetup from './pages/InitialAdminSetup';

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Memberships = lazy(() => import("./pages/Memberships"));
const About = lazy(() => import("./pages/About"));
const Team = lazy(() => import("./pages/Team"));
const Legal = lazy(() => import("./pages/Legal"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const PAIAManual = lazy(() => import("./pages/PAIAManual"));
const DoctorEnrollment = lazy(() => import("./pages/DoctorEnrollment"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const DoctorDashboard = lazy(() => import("./pages/doctor/DoctorDashboard"));
const DoctorSearch = lazy(() => import("./pages/DoctorSearch"));
const DoctorProfile = lazy(() => import("./pages/DoctorProfile"));
const BookAppointment = lazy(() => import("./pages/BookAppointment"));
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));
const PayFastSuccess = lazy(() => import("./pages/PayFastSuccess"));
const PayFastCancel = lazy(() => import("./pages/PayFastCancel"));
const Telemedicine = lazy(() => import("./pages/Telemedicine"));
const DoctorPortal = lazy(() => import("./pages/DoctorPortal"));
const PracticeManagement = lazy(() => import("./pages/PracticeManagement"));
const Support = lazy(() => import("./pages/Support"));
const Careers = lazy(() => import("./pages/Careers"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BookingHistory = lazy(() => import("./pages/BookingHistory"));
const PatientDashboard = lazy(() => import("./pages/PatientDashboard"));
const EmailVerification = lazy(() => import("./pages/EmailVerification"));
const Profile = lazy(() => import("./pages/Profile"));
const CreateAdminAccount = lazy(() => import("./pages/CreateAdminAccount"));
const RouteTest = lazy(() => import("./pages/RouteTest"));
const FixAdminAccount = lazy(() => import("./pages/FixAdminAccount"));
const ManualAdminSetup = lazy(() => import("./pages/ManualAdminSetup"));
const AmbassadorProgramme = lazy(() => import("./pages/AmbassadorProgramme"));

// Auth Pages
const SignIn = lazy(() => import("./pages/auth/SignIn"));
const SignUpSelection = lazy(() => import("./pages/auth/SignUpSelection"));
const PatientSignUp = lazy(() => import("./pages/auth/PatientSignUp"));
const DoctorSignUp = lazy(() => import("./pages/auth/DoctorSignUp"));
const AmbassadorSignUp = lazy(() => import("./pages/auth/AmbassadorSignUp"));
const AmbassadorPortal = lazy(() => import("./pages/ambassador/AmbassadorPortal"));
const PsychometricTest = lazy(() => import("./pages/ambassador/PsychometricTest"));


// Lazy load notification center
const NotificationCenter = lazy(() => 
  import("@/components/notifications/NotificationCenter").then(module => ({
    default: module.NotificationCenter
  }))
);

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
  </div>
);

const queryClient = new QueryClient();

// Professional Emergency & Support Widget
const HelpWidget = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);

  const emergencyNumbers = [
    { name: 'National Emergency', number: '10111', icon: Shield, description: 'Police, Fire, Medical' },
    { name: 'Ambulance', number: '10177', icon: Ambulance, description: 'Medical Emergency' },
    { name: 'Netcare 911', number: '082 911', icon: Heart, description: 'Private Ambulance' },
    { name: 'ER24', number: '084 124', icon: Heart, description: 'Private Ambulance' },
    { name: 'Poison Control', number: '0861 555 777', icon: AlertTriangle, description: '24/7 Helpline' },
    { name: 'AIDS Helpline', number: '0800 012 322', icon: Phone, description: 'Toll-free' },
  ];

  const handleEmergencyCall = (number: string) => {
    window.location.href = `tel:${number.replace(/\s/g, '')}`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* EMERGENCY BUTTON - RED */}
      <div className="relative">
        <button
          onClick={() => setIsEmergencyOpen(!isEmergencyOpen)}
          className="w-12 h-12 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center animate-pulse-subtle"
          aria-label="Emergency numbers"
        >
          <AlertTriangle className="h-6 w-6" />
        </button>

        {/* Emergency Numbers Menu */}
        {isEmergencyOpen && (
          <div className="absolute bottom-14 right-0 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden mb-2">
            <div className="p-4 bg-red-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Emergency Contacts</h3>
                  <p className="text-xs text-white/80">24/7 - Call immediately for help</p>
                </div>
              </div>
            </div>
            <div className="p-2 max-h-[400px] overflow-y-auto">
              {emergencyNumbers.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => handleEmergencyCall(item.number)}
                    className="w-full flex items-center gap-3 px-3 py-3 text-slate-700 hover:bg-red-50 rounded-lg transition-colors group"
                  >
                    <div className="w-8 h-8 bg-red-100 group-hover:bg-red-200 rounded-full flex items-center justify-center flex-shrink-0 transition-colors">
                      <Icon className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900">{item.name}</span>
                        <span className="text-sm font-bold text-red-600">{item.number}</span>
                      </div>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-600 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-slate-500" />
                For medical emergencies, call your local emergency services immediately
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Help & Support Button - DARK */}
      <div className="relative">
        <button
          onClick={() => setIsHelpOpen(!isHelpOpen)}
          className="w-12 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
          aria-label="Help & Support"
        >
          <HelpCircle className="h-6 w-6" />
        </button>

        {/* Help Menu */}
        {isHelpOpen && (
          <div className="absolute bottom-14 right-0 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden mb-2">
            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <h3 className="font-medium text-slate-900 text-sm">How can we help?</h3>
            </div>
            <div className="p-2">
              <button
                onClick={() => window.location.href = '/support'}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-slate-500" />
                <span>Live Chat</span>
                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Available</span>
              </button>
              <button
                onClick={() => window.location.href = '/contact'}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <HelpCircle className="h-4 w-4 text-slate-500" />
                <span>FAQs & Support</span>
              </button>
              <button
                onClick={() => window.location.href = '/doctor-enrollment'}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <Phone className="h-4 w-4 text-slate-500" />
                <span>Join as Doctor</span>
              </button>
            </div>
            <div className="p-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-slate-400" />
                Response time: &lt; 2 hours
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

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
              <div className="flex min-h-screen w-full">
                <main className="flex-1 relative">
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/memberships" element={<Memberships />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/team" element={<Team />} />
                      <Route path="/legal" element={<Legal />} />
                      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                      <Route path="/paia-manual" element={<PAIAManual />} />
                      <Route path="/doctor-enrollment" element={<DoctorEnrollment />} />
                      <Route path="/DoctorEnrollment" element={<Navigate to="/doctor-enrollment" replace />} />
                      <Route path="/doctorEnrollment" element={<Navigate to="/doctor-enrollment" replace />} />
                      <Route path="/telemedicine" element={<Telemedicine />} />
                      <Route path="/doctor-portal" element={<DoctorPortal />} />
                      <Route path="/practice-management" element={<PracticeManagement />} />
                      <Route path="/support" element={<Support />} />
                      <Route path="/careers" element={<Careers />} />
                      <Route path="/contact" element={<Contact />} />
                      
                      {/* Auth Routes */}
                      <Route path="/signin" element={<SignIn />} />
                      <Route path="/login" element={<Navigate to="/signin" replace />} />
                      <Route path="/signup" element={<SignUpSelection />} />
                      <Route path="/signup/patient" element={<PatientSignUp />} />
                      <Route path="/signup/doctor" element={<DoctorSignUp />} />
                      <Route path="/signup/ambassador" element={<AmbassadorSignUp />} />
                      <Route path="/admin-setup" element={<InitialAdminSetup />} />
                      <Route path="/verify-email" element={<EmailVerification />} />
                      
                      {/* Ambassador Programme Route */}
                      <Route path="/ambassador-programme" element={<AmbassadorProgramme />} />
                      <Route path="/ambassadorProgramme" element={<Navigate to="/ambassador-programme" replace />} />
                      <Route path="/AmbassadorProgramme" element={<Navigate to="/ambassador-programme" replace />} />
                      <Route path="/become-an-ambassador" element={<Navigate to="/ambassador-programme" replace />} />
                      <Route path="/ambassador/portal" element={<AmbassadorPortal />} />
                      <Route path="/ambassador/psychometric-test" element={<PsychometricTest />} />
                      
                      <Route path="/admin" element={<AdminDashboard />} />
                      <Route path="/search" element={<DoctorSearch />} />
                      <Route path="/doctor/:doctorId" element={<DoctorProfile />} />
                      <Route path="/book/:doctorId" element={<BookAppointment />} />
                      <Route path="/booking-success" element={<BookingSuccess />} />
                      <Route path="/BookingSuccess" element={<Navigate to="/booking-success" replace />} />
                      <Route path="/bookingSuccess" element={<Navigate to="/booking-success" replace />} />
                      <Route path="/payfast/success" element={<PayFastSuccess />} />
                      <Route path="/payfast/cancel" element={<PayFastCancel />} />
                      <Route path="/doctor" element={<DoctorDashboard />} />
                      <Route path="/create-admin-account" element={<CreateAdminAccount />} />
                      <Route path="/CreateAdminAccount" element={<Navigate to="/create-admin-account" replace />} />
                      <Route path="/createAdminAccount" element={<Navigate to="/create-admin-account" replace />} />
                      <Route path="/admin-setup" element={<InitialAdminSetup />} />
                      <Route path="/AdminSetup" element={<Navigate to="/admin-setup" replace />} />
                      <Route path="/adminSetup" element={<Navigate to="/admin-setup" replace />} />
                      <Route path="/admin_setup" element={<Navigate to="/admin-setup" replace />} />
                      <Route path="/ADMIN_SETUP" element={<Navigate to="/admin-setup" replace />} />
                      <Route path="/bookings" element={<BookingHistory />} />
                      <Route path="/BookingHistory" element={<BookingHistory />} />
                      <Route path="/booking-history" element={<BookingHistory />} />
                      <Route path="/dashboard" element={<PatientDashboard />} />
                      <Route path="/verify-email" element={<EmailVerification />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/route-test" element={<RouteTest />} />
                      <Route path="/fix-admin-account" element={<FixAdminAccount />} />
                      <Route path="/manual-admin-setup" element={<ManualAdminSetup />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </main>
              </div>

              {/* PROFESSIONAL EMERGENCY & SUPPORT WIDGET */}
              <HelpWidget />

            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;