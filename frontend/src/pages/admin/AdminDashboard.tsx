// pages/admin/AdminDashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { adminService } from '../../../lib/firebase';
import { authService } from '../../../lib/firebase';
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
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

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Doctors</p>
                  <p className="text-2xl font-bold">{stats.totalDoctors}</p>
                </div>
                <Stethoscope className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Patients</p>
                  <p className="text-2xl font-bold">{stats.totalPatients}</p>
                </div>
                <Activity className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ambassadors</p>
                  <p className="text-2xl font-bold">{stats.totalAmbassadors}</p>
                </div>
                <Award className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold">{stats.pendingDoctors + stats.pendingAmbassadors}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ready to Approve</p>
                  <p className="text-2xl font-bold">{stats.readyForApproval}</p>
                </div>
                <Trophy className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Tabs defaultValue="doctors" className="space-y-6">
          <TabsList className="grid w-full max-w-4xl grid-cols-5">
            <TabsTrigger value="doctors">Doctors</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="ambassadors">Ambassadors</TabsTrigger>
            <TabsTrigger value="users">All Users</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Doctors Tab */}
          <TabsContent value="doctors" className="space-y-6">
            {pendingDoctors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Pending Doctor Approvals</span>
                    <Badge className="bg-yellow-100 text-yellow-800">{pendingDoctors.length}</Badge>
                  </CardTitle>
                  <CardDescription>Review and verify doctor applications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendingDoctors.map((doctor) => (
                    <div key={doctor.uid} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <Stethoscope className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-lg">{doctor.fullName}</p>
                              <p className="text-sm text-gray-600">{doctor.email}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 ml-14">
                            <div>
                              <p className="text-xs text-gray-500">Specialization</p>
                              <p className="text-sm font-medium">{doctor.specialization}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">HPCSA Number</p>
                              <p className="text-sm font-medium">{doctor.hpcsaNumber || 'Not provided'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Practice Name</p>
                              <p className="text-sm font-medium">{doctor.practiceName || 'Not provided'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Consultation Fee</p>
                              <p className="text-sm font-medium">R{doctor.consultationFee || 'N/A'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500">Practice Address</p>
                              <p className="text-sm">{doctor.practiceAddress || 'Not provided'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproveDoctor(doctor.uid)}>
                            <CheckCircle className="w-4 h-4 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 border-red-300" onClick={() => { setSelectedDoctor(doctor); setShowRejectDialog(true); }}>
                            <XCircle className="w-4 h-4 mr-1" />Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Verified Doctors</CardTitle>
                    <CardDescription>Active doctors on the platform</CardDescription>
                  </div>
                  <Input placeholder="Search doctors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-64" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Doctor</th>
                        <th className="text-left py-3 px-4">Specialization</th>
                        <th className="text-left py-3 px-4">HPCSA</th>
                        <th className="text-left py-3 px-4">Practice</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Actions</th>
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
                                  <p className="font-medium">{doctor.fullName}</p>
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

          {/* Patients Tab */}
          <TabsContent value="patients">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Patients</CardTitle>
                    <CardDescription>All registered patients</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input placeholder="Search patients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-64" />
                    <Button variant="outline" onClick={handleDeleteInactivePatients}>
                      <Trash2 className="w-4 h-4 mr-2" />Cleanup Inactive
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Patient</th>
                        <th className="text-left py-3 px-4">ID Number</th>
                        <th className="text-left py-3 px-4">Phone</th>
                        <th className="text-left py-3 px-4">Medical Aid</th>
                        <th className="text-left py-3 px-4">Last Login</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Actions</th>
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
                                  <p className="font-medium">{patient.fullName}</p>
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
                                {daysSinceLastLogin > 300 && patient.isActive && (
                                  <Badge className="bg-yellow-100 text-yellow-800 ml-1">{daysSinceLastLogin}d</Badge>
                                )}
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

          {/* Ambassadors Tab */}
          <TabsContent value="ambassadors" className="space-y-6">
            {/* Ready for Approval Section */}
            {readyForApproval.length > 0 && (
              <Card className="border-2 border-green-200">
                <CardHeader className="bg-green-50">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-green-600" />
                      Ready for Approval
                    </span>
                    <Badge className="bg-green-100 text-green-800">
                      {readyForApproval.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription>Ambassadors who have completed all steps and passed their interview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {readyForApproval.map((ambassador) => (
                    <div key={ambassador.uid} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                              <Award className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-lg">{ambassador.fullName}</p>
                              <p className="text-sm text-gray-600">{ambassador.email}</p>
                            </div>
                          </div>
                          <div className="ml-14 grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-xs text-gray-500">ID Number</p>
                              <p className="font-medium">{ambassador.idNumber || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Phone</p>
                              <p className="font-medium">{ambassador.phone || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Psychometric Score</p>
                              <p className="font-medium">{ambassador.psychometricTest?.score}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Knowledge Test</p>
                              <p className="font-medium">
                                {ambassador.knowledgeTest?.score}% ({ambassador.knowledgeTest?.attempts} attempts)
                              </p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500">Motivation</p>
                              <p className="text-sm">{ambassador.motivation?.substring(0, 150)}...</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveAmbassador(ambassador.uid)}
                            disabled={approvingAmbassadorId === ambassador.uid}
                          >
                            {approvingAmbassadorId === ambassador.uid ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-1" />
                            )}
                            Approve & Generate Code
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 border-red-300"
                            onClick={() => {
                              const reason = prompt('Enter rejection reason:');
                              if (reason) handleRejectAmbassador(ambassador.uid, reason);
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Pending Interview Section */}
            {pendingInterview.length > 0 && (
              <Card className="border-2 border-blue-200">
                <CardHeader className="bg-blue-50">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Video className="w-5 h-5 text-blue-600" />
                      Pending Interview Review
                    </span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {pendingInterview.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription>Ambassadors who passed the knowledge test and are ready for interview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {pendingInterview.map((ambassador) => (
                    <div key={ambassador.uid} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                              <GraduationCap className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-lg">{ambassador.fullName}</p>
                              <p className="text-sm text-gray-600">{ambassador.email}</p>
                            </div>
                          </div>
                          <div className="ml-14 grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-xs text-gray-500">ID Number</p>
                              <p className="font-medium">{ambassador.idNumber || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Knowledge Test Score</p>
                              <p className="font-medium">{ambassador.knowledgeTest?.score}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Psychometric Score</p>
                              <p className="font-medium">{ambassador.psychometricTest?.score}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Onboarding Step</p>
                              <Badge className={getOnboardingStatusBadge(ambassador.onboardingStep).color}>
                                {getOnboardingStatusBadge(ambassador.onboardingStep).label}
                              </Badge>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500">Motivation</p>
                              <p className="text-sm">{ambassador.motivation?.substring(0, 150)}...</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                              setSelectedAmbassador(ambassador);
                              setInterviewStatus(ambassador.interviewStatus);
                              setInterviewNotes(ambassador.interviewNotes || '');
                              setShowInterviewDialog(true);
                            }}
                          >
                            <Video className="w-4 h-4 mr-1" />
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

            {/* All Ambassadors */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Ambassadors</CardTitle>
                    <CardDescription>Complete list of ambassador applications and their progress</CardDescription>
                  </div>
                  <Input
                    placeholder="Search ambassadors..."
                    value={ambassadorSearchTerm}
                    onChange={(e) => setAmbassadorSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Ambassador</th>
                        <th className="text-left py-3 px-4">Onboarding</th>
                        <th className="text-left py-3 px-4">Psychometric</th>
                        <th className="text-left py-3 px-4">Knowledge Test</th>
                        <th className="text-left py-3 px-4">Interview</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Referral Code</th>
                        <th className="text-left py-3 px-4">Actions</th>
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
                                  <p className="font-medium">{ambassador.fullName}</p>
                                  <p className="text-xs text-gray-600">{ambassador.email}</p>
                                </div>
                              </div>
                            </td>
                            // pages/admin/AdminDashboard.tsx (continued from previous)

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
                                  Failed - Next: {formatDate(ambassador.psychometricTest?.nextAttemptDate)}
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
                                <Badge className="bg-red-100 text-red-800">Failed (Max attempts)</Badge>
                              ) : ambassador.knowledgeTest?.attempts > 0 ? (
                                <Badge className="bg-yellow-100 text-yellow-800">
                                  {ambassador.knowledgeTest?.attempts}/3 attempts ({ambassador.knowledgeTest?.score}%)
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
                                  <code className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-sm font-bold">
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
                              <div className="flex gap-1">
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
                                {ambassador.onboardingStep === 4 && ambassador.interviewStatus === 'pending' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-blue-600"
                                    onClick={() => {
                                      setSelectedAmbassador(ambassador);
                                      setInterviewStatus(ambassador.interviewStatus);
                                      setInterviewNotes(ambassador.interviewNotes || '');
                                      setShowInterviewDialog(true);
                                    }}
                                  >
                                    <Video className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>Complete list of platform users</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-64" />
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">User</th>
                        <th className="text-left py-3 px-4">Role</th>
                        <th className="text-left py-3 px-4">Joined</th>
                        <th className="text-left py-3 px-4">Last Login</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Actions</th>
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
                                <p className="font-medium">{user.fullName}</p>
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

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>Manage system configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Automated Cleanup</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-800">Inactive Patient Cleanup</p>
                        <p className="text-sm text-yellow-700 mt-1">
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

      {/* Patient Details Dialog */}
      <Dialog open={showPatientDetailsDialog} onOpenChange={setShowPatientDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
            <DialogDescription>Complete profile information for {selectedPatient?.fullName}</DialogDescription>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500">Full Name</p><p className="font-medium">{selectedPatient.fullName}</p></div>
                  <div><p className="text-gray-500">Email</p><p className="font-medium">{selectedPatient.email}</p></div>
                  <div><p className="text-gray-500">Phone</p><p className="font-medium">{selectedPatient.phone || 'Not provided'}</p></div>
                  <div><p className="text-gray-500">ID Number</p><p className="font-medium">{selectedPatient.idNumber}</p></div>
                  <div><p className="text-gray-500">Date of Birth</p><p className="font-medium">{selectedPatient.dateOfBirth || 'Not provided'}</p></div>
                </div>
              </div>
              {selectedPatient.emergencyContact && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />Emergency Contact
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm bg-red-50 p-3 rounded-lg">
                    <div><p className="text-gray-500">Name</p><p className="font-medium">{selectedPatient.emergencyContact.name}</p></div>
                    <div><p className="text-gray-500">Relationship</p><p className="font-medium">{selectedPatient.emergencyContact.relationship}</p></div>
                    <div><p className="text-gray-500">Phone</p><p className="font-medium">{selectedPatient.emergencyContact.phone}</p></div>
                  </div>
                </div>
              )}
              {selectedPatient.medicalAidProvider && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-green-500" />Medical Aid
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm bg-green-50 p-3 rounded-lg">
                    <div><p className="text-gray-500">Provider</p><p className="font-medium">{selectedPatient.medicalAidProvider}</p></div>
                    <div><p className="text-gray-500">Membership Number</p><p className="font-medium">{selectedPatient.medicalAidNumber}</p></div>
                  </div>
                </div>
              )}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-purple-500" />Medical Information
                </h4>
                <div className="space-y-3 text-sm">
                  <div><p className="text-gray-500">Allergies</p><p className="font-medium">{selectedPatient.allergies?.length ? selectedPatient.allergies.join(', ') : 'None reported'}</p></div>
                  <div><p className="text-gray-500">Chronic Conditions</p><p className="font-medium">{selectedPatient.chronicConditions?.length ? selectedPatient.chronicConditions.join(', ') : 'None reported'}</p></div>
                  <div><p className="text-gray-500">Current Medications</p><p className="font-medium">{selectedPatient.medications?.length ? selectedPatient.medications.join(', ') : 'None reported'}</p></div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPatientDetailsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Doctor Details Dialog */}
      <Dialog open={showDoctorDetailsDialog} onOpenChange={setShowDoctorDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Doctor Details</DialogTitle>
            <DialogDescription>Complete profile information for {selectedDoctor?.fullName}</DialogDescription>
          </DialogHeader>
          {selectedDoctor && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><User className="w-4 h-4" />Personal Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500">Full Name</p><p className="font-medium">{selectedDoctor.fullName}</p></div>
                  <div><p className="text-gray-500">Email</p><p className="font-medium">{selectedDoctor.email}</p></div>
                  <div><p className="text-gray-500">Phone</p><p className="font-medium">{selectedDoctor.phone || 'Not provided'}</p></div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Stethoscope className="w-4 h-4" />Professional Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500">Specialization</p><p className="font-medium">{selectedDoctor.specialization}</p></div>
                  <div><p className="text-gray-500">HPCSA Number</p><p className="font-medium">{selectedDoctor.hpcsaNumber || 'Not provided'}</p></div>
                  <div><p className="text-gray-500">Practice Name</p><p className="font-medium">{selectedDoctor.practiceName || 'Not provided'}</p></div>
                  <div><p className="text-gray-500">Consultation Fee</p><p className="font-medium">R{selectedDoctor.consultationFee || 'N/A'}</p></div>
                  <div className="col-span-2"><p className="text-gray-500">Practice Address</p><p className="font-medium">{selectedDoctor.practiceAddress || 'Not provided'}</p></div>
                </div>
              </div>
              {selectedDoctor.bio && (
                <div><h4 className="font-semibold text-gray-900 mb-3">Bio</h4><p className="text-sm text-gray-700">{selectedDoctor.bio}</p></div>
              )}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Verification</h4>
                <div className="flex items-center gap-3">
                  <Badge className={getStatusBadge(selectedDoctor.verificationStatus)}>{selectedDoctor.verificationStatus}</Badge>
                  <p className="text-sm text-gray-500">Joined: {formatDate(selectedDoctor.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDoctorDetailsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ambassador Details Dialog */}
      <Dialog open={showAmbassadorDetailsDialog} onOpenChange={setShowAmbassadorDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ambassador Details</DialogTitle>
            <DialogDescription>Complete profile information for {selectedAmbassador?.fullName}</DialogDescription>
          </DialogHeader>
          {selectedAmbassador && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500">Full Name</p><p className="font-medium">{selectedAmbassador.fullName}</p></div>
                  <div><p className="text-gray-500">Email</p><p className="font-medium">{selectedAmbassador.email}</p></div>
                  <div><p className="text-gray-500">Phone</p><p className="font-medium">{selectedAmbassador.phone || 'Not provided'}</p></div>
                  <div><p className="text-gray-500">ID Number</p><p className="font-medium">{selectedAmbassador.idNumber}</p></div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-600" />Psychometric Assessment
                </h4>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-gray-500">Status</p>
                      {selectedAmbassador.psychometricTest?.passed ? (
                        <Badge className="bg-green-100 text-green-800">Passed</Badge>
                      ) : selectedAmbassador.psychometricTest?.passed === false ? (
                        <Badge className="bg-red-100 text-red-800">Failed</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600">Not Taken</Badge>
                      )}
                    </div>
                    <div><p className="text-gray-500">Score</p><p className="font-medium">{selectedAmbassador.psychometricTest?.score || 'N/A'}%</p></div>
                    <div><p className="text-gray-500">Attempt Date</p><p className="font-medium">{formatDate(selectedAmbassador.psychometricTest?.attemptDate)}</p></div>
                    <div><p className="text-gray-500">Next Attempt</p><p className="font-medium">{formatDate(selectedAmbassador.psychometricTest?.nextAttemptDate)}</p></div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />Training & Knowledge Test
                </h4>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-gray-500">Training Completed</p>
                      <Badge className={selectedAmbassador.trainingModule?.completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                        {selectedAmbassador.trainingModule?.completed ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div><p className="text-gray-500">Knowledge Test Status</p>
                      {selectedAmbassador.knowledgeTest?.passed ? (
                        <Badge className="bg-green-100 text-green-800">Passed</Badge>
                      ) : selectedAmbassador.knowledgeTest?.passed === false ? (
                        <Badge className="bg-red-100 text-red-800">Failed</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600">Pending</Badge>
                      )}
                    </div>
                    <div><p className="text-gray-500">Knowledge Score</p><p className="font-medium">{selectedAmbassador.knowledgeTest?.score || 'N/A'}%</p></div>
                    <div><p className="text-gray-500">Attempts</p><p className="font-medium">{selectedAmbassador.knowledgeTest?.attempts || 0}/3</p></div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Video className="w-4 h-4 text-amber-600" />Interview & Application
                </h4>
                <div className="bg-amber-50 p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-gray-500">Interview Status</p><Badge className={getStatusBadge(selectedAmbassador.interviewStatus)}>{selectedAmbassador.interviewStatus}</Badge></div>
                    <div><p className="text-gray-500">Application Status</p><Badge className={getStatusBadge(selectedAmbassador.applicationStatus)}>{selectedAmbassador.applicationStatus}</Badge></div>
                    <div className="col-span-2"><p className="text-gray-500">Interview Notes</p><p className="font-medium">{selectedAmbassador.interviewNotes || 'No notes'}</p></div>
                    {selectedAmbassador.rejectionReason && (
                      <div className="col-span-2"><p className="text-gray-500">Rejection Reason</p><p className="font-medium text-red-600">{selectedAmbassador.rejectionReason}</p></div>
                    )}
                  </div>
                </div>
              </div>

              {selectedAmbassador.motivation && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />Motivation
                  </h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedAmbassador.motivation}</p>
                </div>
              )}

              {selectedAmbassador.experience && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Experience</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedAmbassador.experience}</p>
                </div>
              )}

              {selectedAmbassador.referralCode && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-green-600" />Referral Code
                  </h4>
                  <div className="flex items-center gap-2 bg-green-50 p-3 rounded-lg">
                    <code className="text-lg font-bold text-green-700">{selectedAmbassador.referralCode}</code>
                    <Button variant="ghost" size="sm" onClick={() => {
                      navigator.clipboard.writeText(selectedAmbassador.referralCode!);
                      toast({ title: 'Copied!', description: 'Referral code copied.' });
                    }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedAmbassador?.onboardingStep === 4 && selectedAmbassador?.interviewStatus === 'pending' && (
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
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
                className="bg-green-600 hover:bg-green-700"
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

      {/* Admin Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Admin Profile</DialogTitle>
            <DialogDescription>View your profile information. Only password can be changed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" value={adminProfileData.firstName} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" value={adminProfileData.lastName} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={adminProfileData.email} disabled className="bg-gray-50" />
            </div>
            <div className="border-t pt-4">
              <p className="font-medium mb-3">Change Password</p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" value={adminProfileData.currentPassword} onChange={(e) => setAdminProfileData(prev => ({ ...prev, currentPassword: e.target.value }))} placeholder="Enter current password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" value={adminProfileData.newPassword} onChange={(e) => setAdminProfileData(prev => ({ ...prev, newPassword: e.target.value }))} placeholder="Enter new password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" value={adminProfileData.confirmPassword} onChange={(e) => setAdminProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))} placeholder="Confirm new password" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateAdminProfile}><Save className="w-4 h-4 mr-2" />Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Doctor Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Doctor Application</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this application.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Rejection Reason</Label>
              <Textarea id="rejectReason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why this application is being rejected..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleRejectDoctor} disabled={!rejectReason}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interview Management Dialog */}
      <Dialog open={showInterviewDialog} onOpenChange={setShowInterviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-blue-600" />
              Manage Ambassador Interview
            </DialogTitle>
            <DialogDescription>
              Update interview status for {selectedAmbassador?.fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Interview Status</Label>
              <select 
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="space-y-2">
              <Label htmlFor="interviewNotes">Interview Notes (Optional)</Label>
              <Textarea 
                id="interviewNotes"
                value={interviewNotes} 
                onChange={(e) => setInterviewNotes(e.target.value)}
                placeholder="Add notes about the interview, feedback, or next steps..."
                rows={4}
              />
            </div>
            {interviewStatus === 'failed' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  This will reject the ambassador's application and deactivate their account.
                </p>
              </div>
            )}
            {interviewStatus === 'passed' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  This will mark the ambassador as ready for approval. You can then approve them from the "Ready for Approval" section.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
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

      {/* Referral Code Dialog */}
      <Dialog open={showReferralCodeDialog} onOpenChange={setShowReferralCodeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-purple-600" />
              Ambassador Approved!
            </DialogTitle>
            <DialogDescription>
              The referral code has been generated. Copy it and send it to the ambassador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 text-center">
              <p className="text-sm text-purple-600 mb-2">Referral Code</p>
              <p className="text-3xl font-bold text-purple-700 tracking-widest">{generatedReferralCode}</p>
            </div>
            <div className="flex gap-2">
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