// pages/admin/AdminDashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { adminService } from '../../lib/firebase';
import { authService } from '../../lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  UserCheck,
  Clock,
  Ticket,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  Stethoscope,
  Award,
  Search,
  Download,
  Shield,
  LogOut,
  User,
  Mail,
  Lock,
  Save,
  Trash2,
  UserCog,
  Activity,
  Calendar,
  Phone,
  MapPin,
  CreditCard,
  AlertCircle,
  Heart,
  Pill,
  Building2,
  ClipboardCheck,
  BookOpen,
  Trophy,
  Loader2,
  Copy,
  Send,
  Video,
  Brain,
  GraduationCap,
  Menu,
  X,
  ChevronDown,
  Filter,
  ArrowUpDown,
} from 'lucide-react';

interface UserProfile {
  uid: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string;
  role: 'patient' | 'doctor' | 'ambassador' | 'admin';
  createdAt: any;
  updatedAt: any;
  lastLogin?: any;
  isActive: boolean;
  photoURL?: string;
}

interface DoctorProfile extends UserProfile {
  role: 'doctor';
  specialization: string;
  hpcsaNumber?: string;
  practiceName?: string;
  practiceAddress?: string;
  consultationFee?: number;
  bio?: string;
  qualifications?: string[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationDocuments?: string[];
  operatingHours?: OperatingHours;
  profilePicture?: string;
}

interface PatientProfile extends UserProfile {
  role: 'patient';
  idNumber: string;
  dateOfBirth?: string;
  phone?: string;
  medicalAidProvider?: string;
  medicalAidNumber?: string;
  emergencyContact?: EmergencyContact;
  allergies?: string[];
  chronicConditions?: string[];
  medications?: string[];
  bloodType?: string;
}

interface AmbassadorProfile extends UserProfile {
  role: 'ambassador';
  idNumber: string;
  referralSource: string;
  experience: string;
  motivation: string;
  applicationStatus: 'pending' | 'approved' | 'rejected';
  onboardingStep: number;
  psychometricTest: {
    passed: boolean | null;
    attemptDate: any;
    nextAttemptDate: any;
    score: number | null;
  };
  trainingModule: {
    completed: boolean;
    startedAt: any;
    completedAt: any;
  };
  knowledgeTest: {
    passed: boolean | null;
    attempts: number;
    maxAttempts: number;
    lastAttemptDate: any;
    score: number | null;
  };
  interviewStatus: 'pending' | 'scheduled' | 'completed' | 'passed' | 'failed';
  interviewNotes?: string;
  referralCode: string | null;
  rejectionReason?: string;
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

interface OperatingHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

interface DayHours {
  isOpen: boolean;
  startTime: string;
  endTime: string;
}

const AdminDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    totalAmbassadors: 0,
    pendingDoctors: 0,
    pendingAmbassadors: 0,
    readyForApproval: 0,
    openTickets: 0,
    urgentTickets: 0,
  });

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [ambassadors, setAmbassadors] = useState<AmbassadorProfile[]>([]);
  const [pendingDoctors, setPendingDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ambassadorSearchTerm, setAmbassadorSearchTerm] = useState('');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showPatientDetailsDialog, setShowPatientDetailsDialog] = useState(false);
  const [showDoctorDetailsDialog, setShowDoctorDetailsDialog] = useState(false);
  const [showAmbassadorDetailsDialog, setShowAmbassadorDetailsDialog] = useState(false);
  const [showReferralCodeDialog, setShowReferralCodeDialog] = useState(false);
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
  const [selectedAmbassador, setSelectedAmbassador] = useState<AmbassadorProfile | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [generatedReferralCode, setGeneratedReferralCode] = useState('');
  const [approvingAmbassadorId, setApprovingAmbassadorId] = useState<string | null>(null);
  const [interviewStatus, setInterviewStatus] = useState<'pending' | 'scheduled' | 'completed' | 'passed' | 'failed'>('pending');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [adminProfileData, setAdminProfileData] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    email: profile?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchDashboardData();
  }, [profile]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [
        statsData,
        usersData,
        doctorsData,
        patientsData,
        ambassadorsData,
        pendingDoctorsData,
      ] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getAllUsers(),
        adminService.getAllDoctors(),
        adminService.getAllPatients(),
        adminService.getAllAmbassadors(),
        adminService.getPendingDoctors(),
      ]);

      if (statsData.stats) setStats(statsData.stats);
      if (usersData.users) setUsers(usersData.users as UserProfile[]);
      if (doctorsData.doctors) setDoctors(doctorsData.doctors as DoctorProfile[]);
      if (patientsData.patients) setPatients(patientsData.patients as PatientProfile[]);
      if (ambassadorsData.ambassadors) setAmbassadors(ambassadorsData.ambassadors as AmbassadorProfile[]);
      if (pendingDoctorsData.doctors) setPendingDoctors(pendingDoctorsData.doctors as DoctorProfile[]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDoctor = async (doctorId: string) => {
    try {
      await adminService.approveDoctor(doctorId);
      toast({ title: 'Success', description: 'Doctor approved successfully.' });
      fetchDashboardData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to approve doctor.', variant: 'destructive' });
    }
  };

  const handleRejectDoctor = async () => {
    if (!selectedDoctor || !rejectReason) return;
    try {
      await adminService.rejectDoctor(selectedDoctor.uid, rejectReason);
      toast({ title: 'Success', description: 'Doctor application rejected.' });
      setShowRejectDialog(false);
      setSelectedDoctor(null);
      setRejectReason('');
      fetchDashboardData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reject doctor.', variant: 'destructive' });
    }
  };

  const handleUpdateInterviewStatus = async () => {
    if (!selectedAmbassador) return;
    
    try {
      await adminService.updateAmbassadorInterviewStatus(selectedAmbassador.uid, interviewStatus, interviewNotes);
      toast({ title: 'Success', description: `Interview status updated to ${interviewStatus}.` });
      setShowInterviewDialog(false);
      setInterviewNotes('');
      fetchDashboardData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update interview status.', variant: 'destructive' });
    }
  };

  const handleApproveAmbassador = async (ambassadorId: string) => {
    setApprovingAmbassadorId(ambassadorId);
    try {
      const result = await adminService.approveAmbassador(ambassadorId);
      if (result.referralCode) {
        setGeneratedReferralCode(result.referralCode);
        setShowReferralCodeDialog(true);
        toast({ title: 'Success', description: 'Ambassador approved and referral code generated.' });
      }
      fetchDashboardData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to approve ambassador.', variant: 'destructive' });
    } finally {
      setApprovingAmbassadorId(null);
    }
  };

  const handleRejectAmbassador = async (ambassadorId: string, reason: string) => {
    try {
      await adminService.rejectAmbassador(ambassadorId, reason);
      toast({ title: 'Success', description: 'Ambassador application rejected.' });
      fetchDashboardData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reject ambassador.', variant: 'destructive' });
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      await adminService.deactivateUser(userId);
      toast({ title: 'Success', description: 'User status updated.' });
      fetchDashboardData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update user.', variant: 'destructive' });
    }
  };

  const handleDeleteInactivePatients = async () => {
    try {
      const result = await adminService.deleteInactivePatients(365);
      toast({ title: 'Cleanup Complete', description: `${result.count} inactive patient accounts deleted.` });
      fetchDashboardData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete inactive patients.', variant: 'destructive' });
    }
  };

  const handleCopyReferralCode = () => {
    navigator.clipboard.writeText(generatedReferralCode);
    toast({ title: 'Copied!', description: 'Referral code copied to clipboard.' });
  };

  const handleUpdateAdminProfile = async () => {
    if (adminProfileData.newPassword !== adminProfileData.confirmPassword) {
      toast({ title: 'Password Mismatch', description: 'New passwords do not match.', variant: 'destructive' });
      return;
    }
    try {
      await authService.updateAdminPassword(adminProfileData.currentPassword, adminProfileData.newPassword);
      toast({ title: 'Success', description: 'Password updated successfully.' });
      setShowProfileDialog(false);
      setAdminProfileData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update password.', variant: 'destructive' });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      approved: 'bg-green-100 text-green-800',
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      passed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const getOnboardingStatusBadge = (step: number) => {
    const labels: Record<number, { label: string; color: string }> = {
      1: { label: 'Psychometric Test', color: 'bg-purple-100 text-purple-800' },
      2: { label: 'Training Module', color: 'bg-blue-100 text-blue-800' },
      3: { label: 'Knowledge Test', color: 'bg-cyan-100 text-cyan-800' },
      4: { label: 'Interview', color: 'bg-amber-100 text-amber-800' },
      5: { label: 'Approved', color: 'bg-green-100 text-green-800' },
    };
    return labels[step] || { label: 'Not Started', color: 'bg-gray-100 text-gray-800' };
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Ambassadors ready for approval (passed interview)
  const readyForApproval = ambassadors.filter(a => a.interviewStatus === 'passed' && a.applicationStatus === 'pending');
  
  // Ambassadors pending interview review
  const pendingInterview = ambassadors.filter(a => a.onboardingStep === 4 && a.interviewStatus === 'pending');

  // Stats cards data for mapping
  const statsCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'blue' },
    { title: 'Doctors', value: stats.totalDoctors, icon: Stethoscope, color: 'green' },
    { title: 'Patients', value: stats.totalPatients, icon: Activity, color: 'purple' },
    { title: 'Ambassadors', value: stats.totalAmbassadors, icon: Award, color: 'amber' },
    { title: 'Pending', value: stats.pendingDoctors + stats.pendingAmbassadors, icon: Clock, color: 'yellow' },
    { title: 'Ready to Approve', value: stats.readyForApproval, icon: Trophy, color: 'green' },
  ];

  const getIconColor = (color: string) => {
    switch(color) {
      case 'blue': return 'text-blue-600';
      case 'green': return 'text-green-600';
      case 'purple': return 'text-purple-600';
      case 'amber': return 'text-amber-600';
      case 'yellow': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Button - Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">Admin Dashboard</h1>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-200 bg-white py-2">
            <div className="px-4 py-2 border-b border-gray-100">
              <Badge className="bg-blue-100 text-blue-800 w-full justify-center py-1.5">
                {profile?.email}
              </Badge>
            </div>
            <button
              onClick={() => {
                setShowProfileDialog(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
            >
              <UserCog className="w-4 h-4" />
              Profile
            </button>
            <button
              onClick={() => {
                handleSignOut();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Desktop Top Bar */}
      <div className="hidden lg:block bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-100 text-blue-800">{profile?.email}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setShowProfileDialog(true)}>
              <UserCog className="w-4 h-4 mr-2" />Profile
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <LogOut className="w-4 h-4 mr-2" />Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Add padding-top for mobile to account for fixed header */}
      <div className="pt-16 lg:pt-0">
        {/* Stats Cards - Responsive Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            {statsCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 md:pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm text-gray-600 truncate">{stat.title}</p>
                        <p className="text-lg md:text-2xl font-bold">{stat.value}</p>
                      </div>
                      <Icon className={`w-6 h-6 md:w-8 md:h-8 ${getIconColor(stat.color)} flex-shrink-0`} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Main Content Tabs - Responsive */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <Tabs defaultValue="doctors" className="space-y-6">
            {/* Responsive Tabs List - Horizontal scroll on mobile */}
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 sm:w-full max-w-4xl">
                <TabsTrigger value="doctors" className="flex-1 text-xs sm:text-sm">Doctors</TabsTrigger>
                <TabsTrigger value="patients" className="flex-1 text-xs sm:text-sm">Patients</TabsTrigger>
                <TabsTrigger value="ambassadors" className="flex-1 text-xs sm:text-sm">Ambassadors</TabsTrigger>
                <TabsTrigger value="users" className="flex-1 text-xs sm:text-sm">All Users</TabsTrigger>
                <TabsTrigger value="settings" className="flex-1 text-xs sm:text-sm">Settings</TabsTrigger>
              </TabsList>
            </div>

            {/* Doctors Tab */}
            <TabsContent value="doctors" className="space-y-6">
              {pendingDoctors.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span>Pending Doctor Approvals</span>
                      <Badge className="bg-yellow-100 text-yellow-800 w-fit">{pendingDoctors.length}</Badge>
                    </CardTitle>
                    <CardDescription>Review and verify doctor applications</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pendingDoctors.map((doctor) => (
                      <div key={doctor.uid} className="border rounded-lg p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-base sm:text-lg truncate">{doctor.fullName}</p>
                                <p className="text-xs sm:text-sm text-gray-600 truncate">{doctor.email}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 ml-0 sm:ml-14">
                              <div>
                                <p className="text-xs text-gray-500">Specialization</p>
                                <p className="text-xs sm:text-sm font-medium truncate">{doctor.specialization}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">HPCSA Number</p>
                                <p className="text-xs sm:text-sm font-medium truncate">{doctor.hpcsaNumber || 'Not provided'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Practice Name</p>
                                <p className="text-xs sm:text-sm font-medium truncate">{doctor.practiceName || 'Not provided'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Consultation Fee</p>
                                <p className="text-xs sm:text-sm font-medium">R{doctor.consultationFee || 'N/A'}</p>
                              </div>
                              {doctor.practiceAddress && (
                                <div className="sm:col-span-2">
                                  <p className="text-xs text-gray-500">Practice Address</p>
                                  <p className="text-xs sm:text-sm">{doctor.practiceAddress}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-row sm:flex-col gap-2 ml-0 sm:ml-4">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-sm" onClick={() => handleApproveDoctor(doctor.uid)}>
                              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 border-red-300 text-sm" onClick={() => { setSelectedDoctor(doctor); setShowRejectDialog(true); }}>
                              <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-base sm:text-lg">Verified Doctors</CardTitle>
                      <CardDescription>Active doctors on the platform</CardDescription>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        placeholder="Search doctors..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="pl-9 w-full sm:w-64 text-sm"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Mobile Card View for Doctors */}
                  <div className="block lg:hidden space-y-3">
                    {doctors
                      .filter(d => d.verificationStatus === 'verified')
                      .filter(d =>
                        d.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        d.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        d.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((doctor) => (
                        <div key={doctor.uid} className="border rounded-lg p-3 bg-white">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Stethoscope className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{doctor.fullName}</p>
                              <p className="text-xs text-gray-500 truncate">{doctor.email}</p>
                            </div>
                            <Badge className={getStatusBadge(doctor.verificationStatus)}>{doctor.verificationStatus}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                            <div>
                              <p className="text-gray-500">Specialization</p>
                              <p className="font-medium truncate">{doctor.specialization}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">HPCSA</p>
                              <p className="font-medium truncate">{doctor.hpcsaNumber || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedDoctor(doctor); setShowDoctorDetailsDialog(true); }}>
                              <Eye className="w-4 h-4" /> View Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    {doctors.filter(d => d.verificationStatus === 'verified').length === 0 && (
                      <div className="text-center py-8 text-gray-500">No doctors found</div>
                    )}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 text-sm font-semibold">Doctor</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Specialization</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">HPCSA</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Practice</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doctors
                          .filter(d => d.verificationStatus === 'verified')
                          .filter(d =>
                            d.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            d.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            d.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((doctor) => (
                            <tr key={doctor.uid} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Stethoscope className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{doctor.fullName}</p>
                                    <p className="text-xs text-gray-600">{doctor.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm">{doctor.specialization}</td>
                              <td className="py-3 px-4 text-sm">{doctor.hpcsaNumber || 'N/A'}</td>
                              <td className="py-3 px-4 text-sm">{doctor.practiceName || 'N/A'}</td>
                              <td className="py-3 px-4"><Badge className={getStatusBadge(doctor.verificationStatus)}>{doctor.verificationStatus}</Badge></td>
                              <td className="py-3 px-4">
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedDoctor(doctor); setShowDoctorDetailsDialog(true); }}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Patients Tab - Mobile Responsive */}
            <TabsContent value="patients">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-base sm:text-lg">Patients</CardTitle>
                      <CardDescription>All registered patients</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input 
                          placeholder="Search patients..." 
                          value={searchTerm} 
                          onChange={(e) => setSearchTerm(e.target.value)} 
                          className="pl-9 w-full sm:w-64 text-sm"
                        />
                      </div>
                      <Button variant="outline" size="sm" onClick={handleDeleteInactivePatients}>
                        <Trash2 className="w-4 h-4 mr-2" />Cleanup
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Mobile Card View for Patients */}
                  <div className="block lg:hidden space-y-3">
                    {patients
                      .filter(p =>
                        p.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.idNumber?.includes(searchTerm)
                      )
                      .map((patient) => {
                        const daysSinceLastLogin = patient.lastLogin
                          ? Math.floor((Date.now() - patient.lastLogin.toDate()) / (1000 * 60 * 60 * 24))
                          : 999;
                        return (
                          <div key={patient.uid} className="border rounded-lg p-3 bg-white">
                            <div className="mb-2">
                              <p className="font-medium text-sm truncate">{patient.fullName}</p>
                              <p className="text-xs text-gray-500 truncate">{patient.email}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                              <div>
                                <p className="text-gray-500">ID Number</p>
                                <p className="font-medium">{patient.idNumber || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Phone</p>
                                <p className="font-medium">{patient.phone || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Medical Aid</p>
                                <p className="font-medium">{patient.medicalAidProvider || 'None'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Last Login</p>
                                <p className="font-medium">{patient.lastLogin ? formatDate(patient.lastLogin) : 'Never'}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <Badge className={patient.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                {patient.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedPatient(patient); setShowPatientDetailsDialog(true); }}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeactivateUser(patient.uid)} disabled={!patient.isActive}>
                                  {patient.isActive ? 'Deactivate' : 'Activate'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 text-sm font-semibold">Patient</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">ID Number</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Phone</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Medical Aid</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Last Login</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patients
                          .filter(p =>
                            p.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.idNumber?.includes(searchTerm)
                          )
                          .map((patient) => {
                            const daysSinceLastLogin = patient.lastLogin
                              ? Math.floor((Date.now() - patient.lastLogin.toDate()) / (1000 * 60 * 60 * 24))
                              : 999;
                            return (
                              <tr key={patient.uid} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4">
                                  <div>
                                    <p className="font-medium text-sm">{patient.fullName}</p>
                                    <p className="text-xs text-gray-600">{patient.email}</p>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-sm">{patient.idNumber || 'N/A'}</td>
                                <td className="py-3 px-4 text-sm">{patient.phone || 'N/A'}</td>
                                <td className="py-3 px-4 text-sm">
                                  {patient.medicalAidProvider ? (
                                    <Badge className="bg-green-100 text-green-800">{patient.medicalAidProvider}</Badge>
                                  ) : 'None'}
                                </td>
                                <td className="py-3 px-4 text-sm">{patient.lastLogin ? formatDate(patient.lastLogin) : 'Never'}</td>
                                <td className="py-3 px-4">
                                  <Badge className={patient.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                    {patient.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                 </td>
                                <td className="py-3 px-4">
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => { setSelectedPatient(patient); setShowPatientDetailsDialog(true); }}>
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeactivateUser(patient.uid)} disabled={!patient.isActive}>
                                      {patient.isActive ? 'Deactivate' : 'Activate'}
                                    </Button>
                                  </div>
                                 </td>
                               </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Ambassadors Tab - Mobile Responsive */}
            <TabsContent value="ambassadors" className="space-y-6">
              {/* Ready for Approval Section - Mobile Responsive */}
              {readyForApproval.length > 0 && (
                <Card className="border-2 border-green-200">
                  <CardHeader className="bg-green-50 pb-3">
                    <CardTitle className="text-base sm:text-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-green-600" />
                        Ready for Approval
                      </span>
                      <Badge className="bg-green-100 text-green-800 w-fit">{readyForApproval.length}</Badge>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Ambassadors who have completed all steps and passed their interview</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {readyForApproval.map((ambassador) => (
                      <div key={ambassador.uid} className="border rounded-lg p-3 sm:p-4 bg-white">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Award className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-base sm:text-lg truncate">{ambassador.fullName}</p>
                                <p className="text-xs sm:text-sm text-gray-600 truncate">{ambassador.email}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                              <div>
                                <p className="text-gray-500">ID Number</p>
                                <p className="font-medium truncate">{ambassador.idNumber || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Phone</p>
                                <p className="font-medium truncate">{ambassador.phone || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Psychometric Score</p>
                                <p className="font-medium">{ambassador.psychometricTest?.score}%</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Knowledge Test</p>
                                <p className="font-medium">{ambassador.knowledgeTest?.score}% ({ambassador.knowledgeTest?.attempts} attempts)</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-row sm:flex-col gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-sm whitespace-nowrap"
                              onClick={() => handleApproveAmbassador(ambassador.uid)}
                              disabled={approvingAmbassadorId === ambassador.uid}
                            >
                              {approvingAmbassadorId === ambassador.uid ? (
                                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              )}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 border-red-300 text-sm whitespace-nowrap"
                              onClick={() => {
                                const reason = prompt('Enter rejection reason:');
                                if (reason) handleRejectAmbassador(ambassador.uid, reason);
                              }}
                            >
                              <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Pending Interview Section - Mobile Responsive */}
              {pendingInterview.length > 0 && (
                <Card className="border-2 border-blue-200">
                  <CardHeader className="bg-blue-50 pb-3">
                    <CardTitle className="text-base sm:text-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-blue-600" />
                        Pending Interview Review
                      </span>
                      <Badge className="bg-blue-100 text-blue-800 w-fit">{pendingInterview.length}</Badge>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Ambassadors who passed the knowledge test and are ready for interview</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {pendingInterview.map((ambassador) => (
                      <div key={ambassador.uid} className="border rounded-lg p-3 sm:p-4 bg-white">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-base sm:text-lg truncate">{ambassador.fullName}</p>
                                <p className="text-xs sm:text-sm text-gray-600 truncate">{ambassador.email}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                              <div>
                                <p className="text-gray-500">ID Number</p>
                                <p className="font-medium truncate">{ambassador.idNumber || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Knowledge Score</p>
                                <p className="font-medium">{ambassador.knowledgeTest?.score}%</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Psychometric Score</p>
                                <p className="font-medium">{ambassador.psychometricTest?.score}%</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Step</p>
                                <Badge className={getOnboardingStatusBadge(ambassador.onboardingStep).color}>
                                  {getOnboardingStatusBadge(ambassador.onboardingStep).label}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-row sm:flex-col gap-2">
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-sm whitespace-nowrap"
                              onClick={() => {
                                setSelectedAmbassador(ambassador);
                                setInterviewStatus(ambassador.interviewStatus);
                                setInterviewNotes(ambassador.interviewNotes || '');
                                setShowInterviewDialog(true);
                              }}
                            >
                              <Video className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              Manage Interview
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedAmbassador(ambassador);
                                setShowAmbassadorDetailsDialog(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* All Ambassadors Table - Mobile Responsive */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-base sm:text-lg">All Ambassadors</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Complete list of ambassador applications and their progress</CardDescription>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search ambassadors..."
                        value={ambassadorSearchTerm}
                        onChange={(e) => setAmbassadorSearchTerm(e.target.value)}
                        className="pl-9 w-full sm:w-64 text-sm"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Mobile Card View for Ambassadors */}
                  <div className="block lg:hidden space-y-3">
                    {ambassadors
                      .filter(a =>
                        a.fullName?.toLowerCase().includes(ambassadorSearchTerm.toLowerCase()) ||
                        a.email?.toLowerCase().includes(ambassadorSearchTerm.toLowerCase()) ||
                        a.idNumber?.includes(ambassadorSearchTerm)
                      )
                      .map((ambassador) => (
                        <div key={ambassador.uid} className="border rounded-lg p-3 bg-white">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <Award className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{ambassador.fullName}</p>
                              <p className="text-xs text-gray-500 truncate">{ambassador.email}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge className={getOnboardingStatusBadge(ambassador.onboardingStep).color}>
                              {getOnboardingStatusBadge(ambassador.onboardingStep).label}
                            </Badge>
                            {ambassador.psychometricTest?.passed && (
                              <Badge className="bg-green-100 text-green-800">Psych: {ambassador.psychometricTest?.score}%</Badge>
                            )}
                            {ambassador.knowledgeTest?.passed && (
                              <Badge className="bg-green-100 text-green-800">Knowledge: {ambassador.knowledgeTest?.score}%</Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge className={getStatusBadge(ambassador.applicationStatus)}>
                              {ambassador.applicationStatus}
                            </Badge>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => {
                                setSelectedAmbassador(ambassador);
                                setShowAmbassadorDetailsDialog(true);
                              }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 text-sm font-semibold">Ambassador</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Onboarding</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Psychometric</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Knowledge Test</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Interview</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Referral Code</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ambassadors
                          .filter(a =>
                            a.fullName?.toLowerCase().includes(ambassadorSearchTerm.toLowerCase()) ||
                            a.email?.toLowerCase().includes(ambassadorSearchTerm.toLowerCase()) ||
                            a.idNumber?.includes(ambassadorSearchTerm)
                          )
                          .map((ambassador) => (
                            <tr key={ambassador.uid} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                    <Award className="w-4 h-4 text-purple-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{ambassador.fullName}</p>
                                    <p className="text-xs text-gray-600">{ambassador.email}</p>
                                  </div>
                                </div>
                               </td>
                              <td className="py-3 px-4">
                                <Badge className={getOnboardingStatusBadge(ambassador.onboardingStep).color}>
                                  {getOnboardingStatusBadge(ambassador.onboardingStep).label}
                                </Badge>
                               </td>
                              <td className="py-3 px-4">
                                {ambassador.psychometricTest?.passed ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    Passed ({ambassador.psychometricTest?.score}%)
                                  </Badge>
                                ) : ambassador.psychometricTest?.passed === false ? (
                                  <Badge className="bg-red-100 text-red-800">
                                    Failed
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-600">Pending</Badge>
                                )}
                               </td>
                              <td className="py-3 px-4">
                                {ambassador.knowledgeTest?.passed ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    Passed ({ambassador.knowledgeTest?.score}%)
                                  </Badge>
                                ) : ambassador.knowledgeTest?.attempts >= 3 ? (
                                  <Badge className="bg-red-100 text-red-800">Failed</Badge>
                                ) : ambassador.knowledgeTest?.attempts > 0 ? (
                                  <Badge className="bg-yellow-100 text-yellow-800">
                                    {ambassador.knowledgeTest?.attempts}/3 attempts
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-600">Pending</Badge>
                                )}
                               </td>
                              <td className="py-3 px-4">
                                <Badge className={getStatusBadge(ambassador.interviewStatus)}>
                                  {ambassador.interviewStatus}
                                </Badge>
                               </td>
                              <td className="py-3 px-4">
                                <Badge className={getStatusBadge(ambassador.applicationStatus)}>
                                  {ambassador.applicationStatus}
                                </Badge>
                               </td>
                              <td className="py-3 px-4">
                                {ambassador.referralCode ? (
                                  <div className="flex items-center gap-2">
                                    <code className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs font-bold">
                                      {ambassador.referralCode}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        navigator.clipboard.writeText(ambassador.referralCode!);
                                        toast({ title: 'Copied!', description: 'Referral code copied.' });
                                      }}
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                               </td>
                              <td className="py-3 px-4">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => {
                                    setSelectedAmbassador(ambassador);
                                    setShowAmbassadorDetailsDialog(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                               </td>
                             </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Users Tab - Mobile Responsive */}
            <TabsContent value="users">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-base sm:text-lg">All Users</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Complete list of platform users</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input 
                          placeholder="Search users..." 
                          value={searchTerm} 
                          onChange={(e) => setSearchTerm(e.target.value)} 
                          className="pl-9 w-full sm:w-64 text-sm"
                        />
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Mobile Card View for Users */}
                  <div className="block lg:hidden space-y-3">
                    {users
                      .filter(u =>
                        u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((user) => (
                        <div key={user.uid} className="border rounded-lg p-3 bg-white">
                          <div className="mb-2">
                            <p className="font-medium text-sm truncate">{user.fullName}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge className={
                              user.role === 'admin' ? 'bg-red-100 text-red-800' :
                              user.role === 'doctor' ? 'bg-blue-100 text-blue-800' :
                              user.role === 'ambassador' ? 'bg-purple-100 text-purple-800' :
                              'bg-green-100 text-green-800'
                            }>{user.role}</Badge>
                            <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div className="flex justify-end mt-2">
                            {user.role !== 'admin' && (
                              <Button variant="ghost" size="sm" onClick={() => handleDeactivateUser(user.uid)}>
                                {user.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 text-sm font-semibold">User</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Role</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Joined</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Last Login</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Actions</th>
                         </tr>
                      </thead>
                      <tbody>
                        {users
                          .filter(u =>
                            u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            u.email?.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((user) => (
                            <tr key={user.uid} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div>
                                  <p className="font-medium text-sm">{user.fullName}</p>
                                  <p className="text-xs text-gray-600">{user.email}</p>
                                </div>
                               </td>
                              <td className="py-3 px-4">
                                <Badge className={
                                  user.role === 'admin' ? 'bg-red-100 text-red-800' :
                                  user.role === 'doctor' ? 'bg-blue-100 text-blue-800' :
                                  user.role === 'ambassador' ? 'bg-purple-100 text-purple-800' :
                                  'bg-green-100 text-green-800'
                                }>{user.role}</Badge>
                               </td>
                              <td className="py-3 px-4 text-sm">{formatDate(user.createdAt)}</td>
                              <td className="py-3 px-4 text-sm">{user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</td>
                              <td className="py-3 px-4">
                                <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                               </td>
                              <td className="py-3 px-4">
                                {user.role !== 'admin' && (
                                  <Button variant="ghost" size="sm" onClick={() => handleDeactivateUser(user.uid)}>
                                    {user.isActive ? 'Deactivate' : 'Activate'}
                                  </Button>
                                )}
                               </td>
                             </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab - Mobile Responsive */}
            <TabsContent value="settings">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Platform Settings</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Manage system configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold">Automated Cleanup</h3>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-yellow-800 text-sm sm:text-base">Inactive Patient Cleanup</p>
                          <p className="text-xs sm:text-sm text-yellow-700 mt-1">
                            Patients who haven't logged in for 365 days will be automatically deleted from the database.
                          </p>
                          <Button variant="outline" size="sm" className="mt-3" onClick={handleDeleteInactivePatients}>
                            <Trash2 className="w-4 h-4 mr-2" />Run Cleanup Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* All Dialogs remain the same as before - they are already responsive */}
      {/* Patient Details Dialog */}
      <Dialog open={showPatientDetailsDialog} onOpenChange={setShowPatientDetailsDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Patient Details</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Complete profile information for {selectedPatient?.fullName}</DialogDescription>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <User className="w-4 h-4" />Personal Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div><p className="text-gray-500">Full Name</p><p className="font-medium">{selectedPatient.fullName}</p></div>
                  <div><p className="text-gray-500">Email</p><p className="font-medium break-all">{selectedPatient.email}</p></div>
                  <div><p className="text-gray-500">Phone</p><p className="font-medium">{selectedPatient.phone || 'Not provided'}</p></div>
                  <div><p className="text-gray-500">ID Number</p><p className="font-medium">{selectedPatient.idNumber}</p></div>
                  <div><p className="text-gray-500">Date of Birth</p><p className="font-medium">{selectedPatient.dateOfBirth || 'Not provided'}</p></div>
                </div>
              </div>
              {/* Rest of the dialog content remains the same */}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowPatientDetailsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Doctor Details Dialog - Mobile Responsive */}
      <Dialog open={showDoctorDetailsDialog} onOpenChange={setShowDoctorDetailsDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Doctor Details</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Complete profile information for {selectedDoctor?.fullName}</DialogDescription>
          </DialogHeader>
          {selectedDoctor && (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base"><User className="w-4 h-4" />Personal Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div><p className="text-gray-500">Full Name</p><p className="font-medium">{selectedDoctor.fullName}</p></div>
                  <div><p className="text-gray-500">Email</p><p className="font-medium break-all">{selectedDoctor.email}</p></div>
                  <div><p className="text-gray-500">Phone</p><p className="font-medium">{selectedDoctor.phone || 'Not provided'}</p></div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base"><Stethoscope className="w-4 h-4" />Professional Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div><p className="text-gray-500">Specialization</p><p className="font-medium">{selectedDoctor.specialization}</p></div>
                  <div><p className="text-gray-500">HPCSA Number</p><p className="font-medium">{selectedDoctor.hpcsaNumber || 'Not provided'}</p></div>
                  <div><p className="text-gray-500">Practice Name</p><p className="font-medium">{selectedDoctor.practiceName || 'Not provided'}</p></div>
                  <div><p className="text-gray-500">Consultation Fee</p><p className="font-medium">R{selectedDoctor.consultationFee || 'N/A'}</p></div>
                  <div className="sm:col-span-2"><p className="text-gray-500">Practice Address</p><p className="font-medium">{selectedDoctor.practiceAddress || 'Not provided'}</p></div>
                </div>
              </div>
              {selectedDoctor.bio && (
                <div><h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Bio</h4><p className="text-xs sm:text-sm text-gray-700">{selectedDoctor.bio}</p></div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowDoctorDetailsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ambassador Details Dialog */}
      <Dialog open={showAmbassadorDetailsDialog} onOpenChange={setShowAmbassadorDetailsDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Ambassador Details</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Complete profile information for {selectedAmbassador?.fullName}</DialogDescription>
          </DialogHeader>
          {selectedAmbassador && (
            <div className="space-y-4 sm:space-y-6">
              {/* Content remains the same as before */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <User className="w-4 h-4" />Personal Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div><p className="text-gray-500">Full Name</p><p className="font-medium">{selectedAmbassador.fullName}</p></div>
                  <div><p className="text-gray-500">Email</p><p className="font-medium break-all">{selectedAmbassador.email}</p></div>
                  <div><p className="text-gray-500">Phone</p><p className="font-medium">{selectedAmbassador.phone || 'Not provided'}</p></div>
                  <div><p className="text-gray-500">ID Number</p><p className="font-medium">{selectedAmbassador.idNumber}</p></div>
                </div>
              </div>
              {/* Rest of the ambassador details sections */}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedAmbassador?.onboardingStep === 4 && selectedAmbassador?.interviewStatus === 'pending' && (
              <Button 
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                onClick={() => {
                  setShowAmbassadorDetailsDialog(false);
                  setInterviewStatus(selectedAmbassador.interviewStatus);
                  setInterviewNotes(selectedAmbassador.interviewNotes || '');
                  setShowInterviewDialog(true);
                }}
              >
                <Video className="w-4 h-4 mr-2" />
                Manage Interview
              </Button>
            )}
            {selectedAmbassador?.interviewStatus === 'passed' && selectedAmbassador?.applicationStatus === 'pending' && (
              <Button 
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                onClick={() => {
                  setShowAmbassadorDetailsDialog(false);
                  handleApproveAmbassador(selectedAmbassador.uid);
                }}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Ambassador
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowAmbassadorDetailsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Profile Dialog - Mobile Responsive */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Admin Profile</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">View your profile information. Only password can be changed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="firstName" className="text-sm">First Name</Label>
              <Input id="firstName" value={adminProfileData.firstName} disabled className="bg-gray-50 text-sm" />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="lastName" className="text-sm">Last Name</Label>
              <Input id="lastName" value={adminProfileData.lastName} disabled className="bg-gray-50 text-sm" />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input id="email" type="email" value={adminProfileData.email} disabled className="bg-gray-50 text-sm" />
            </div>
            <div className="border-t pt-3 sm:pt-4">
              <p className="font-medium mb-2 sm:mb-3 text-sm">Change Password</p>
              <div className="space-y-2 sm:space-y-3">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="currentPassword" className="text-sm">Current Password</Label>
                  <Input id="currentPassword" type="password" value={adminProfileData.currentPassword} onChange={(e) => setAdminProfileData(prev => ({ ...prev, currentPassword: e.target.value }))} placeholder="Enter current password" className="text-sm" />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="newPassword" className="text-sm">New Password</Label>
                  <Input id="newPassword" type="password" value={adminProfileData.newPassword} onChange={(e) => setAdminProfileData(prev => ({ ...prev, newPassword: e.target.value }))} placeholder="Enter new password" className="text-sm" />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" value={adminProfileData.confirmPassword} onChange={(e) => setAdminProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))} placeholder="Confirm new password" className="text-sm" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateAdminProfile}><Save className="w-4 h-4 mr-2" />Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Doctor Dialog - Mobile Responsive */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Reject Doctor Application</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Please provide a reason for rejecting this application.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="rejectReason" className="text-sm">Rejection Reason</Label>
              <Textarea id="rejectReason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why this application is being rejected..." rows={4} className="text-sm" />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleRejectDoctor} disabled={!rejectReason}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interview Management Dialog - Mobile Responsive */}
      <Dialog open={showInterviewDialog} onOpenChange={setShowInterviewDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Video className="w-5 h-5 text-blue-600" />
              Manage Ambassador Interview
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update interview status for {selectedAmbassador?.fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-1 sm:space-y-2">
              <Label className="text-sm">Interview Status</Label>
              <select 
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={interviewStatus}
                onChange={(e) => setInterviewStatus(e.target.value as any)}
              >
                <option value="pending">Pending - Awaiting Scheduling</option>
                <option value="scheduled">Scheduled - Date Set</option>
                <option value="completed">Completed - Awaiting Decision</option>
                <option value="passed">Passed - Ready for Approval</option>
                <option value="failed">Failed - Reject Application</option>
              </select>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="interviewNotes" className="text-sm">Interview Notes (Optional)</Label>
              <Textarea 
                id="interviewNotes"
                value={interviewNotes} 
                onChange={(e) => setInterviewNotes(e.target.value)}
                placeholder="Add notes about the interview, feedback, or next steps..."
                rows={4}
                className="text-sm"
              />
            </div>
            {interviewStatus === 'failed' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs sm:text-sm text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  This will reject the ambassador's application and deactivate their account.
                </p>
              </div>
            )}
            {interviewStatus === 'passed' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs sm:text-sm text-green-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  This will mark the ambassador as ready for approval.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowInterviewDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleUpdateInterviewStatus} 
              className={
                interviewStatus === 'passed' ? 'bg-green-600 hover:bg-green-700' :
                interviewStatus === 'failed' ? 'bg-red-600 hover:bg-red-700' :
                'bg-blue-600 hover:bg-blue-700'
              }
            >
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Referral Code Dialog - Mobile Responsive */}
      <Dialog open={showReferralCodeDialog} onOpenChange={setShowReferralCodeDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              Ambassador Approved!
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              The referral code has been generated. Copy it and send it to the ambassador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 sm:p-6 text-center">
              <p className="text-xs sm:text-sm text-purple-600 mb-2">Referral Code</p>
              <p className="text-xl sm:text-3xl font-bold text-purple-700 tracking-widest break-all">{generatedReferralCode}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button className="flex-1" onClick={handleCopyReferralCode}>
                <Copy className="w-4 h-4 mr-2" />Copy Code
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowReferralCodeDialog(false)}>
                Close
              </Button>
            </div>
            <p className="text-xs text-center text-gray-500">
              An email with this referral code will be sent to the ambassador automatically.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;