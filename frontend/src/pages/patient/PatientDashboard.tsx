// pages/patient/PatientDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Clock, 
  Heart, 
  User, 
  CreditCard, 
  Activity,
  Shield,
  Plus,
  ArrowRight,
  LogOut,
  AlertCircle,
  Users,
  Building2,
  Pill,
  Home,
  Search as SearchIcon,
  History,
  UserCircle,
  Save,
  Edit,
  X,
  Lock,
  RefreshCw,
  Loader2,
  Stethoscope,
  Menu,
  X as CloseIcon
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { doc, getDoc, getDocs, updateDoc, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { serverTimestamp } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookingForm } from '@/pages/patient/components/BookingForm';
import { useBookingSocket } from '@/hooks/useBookingSocket';

// ==================== TYPES ====================
interface PatientProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string;
  idNumber?: string;
  dateOfBirth?: string;
  medicalAidProvider?: string;
  medicalAidNumber?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  allergies?: string[];
  chronicConditions?: string[];
  medications?: string[];
  photoURL?: string;
  createdAt?: any;
  lastLogin?: any;
}

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  specialization: string;
  practiceName: string;
  practiceAddress: string;
  consultationFee: number;
  consultationDuration: number;
  rating: number;
  reviewCount: number;
  profileImage?: string;
  verificationStatus: string;
}

interface Booking {
  id: string;
  doctorId: string;
  patientId: string;
  doctorName: string;
  doctorSpecialization: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'no-show';
  notes?: string;
  consultationFee: number;
  rescheduleCount?: number;
  maxReschedules?: number;
  createdAt: any;
}

interface Membership {
  tier: 'basic' | 'premium';
  startDate: any;
  endDate: any;
  features: string[];
}

// ==================== QUERY KEYS ====================
const QUERY_KEYS = {
  patientProfile: 'patientProfile',
  patientBookings: 'patientBookings',
  availableDoctors: 'availableDoctors',
  membership: 'membership',
};

// ==================== DATA FETCHING FUNCTIONS ====================

const fetchPatientProfile = async (uid: string): Promise<PatientProfile | null> => {
  if (!uid) return null;

  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return null;
    }
    
    const userData = userSnap.data();
    
    const patientRef = doc(db, 'patients', uid);
    const patientSnap = await getDoc(patientRef);
    const patientData = patientSnap.exists() ? patientSnap.data() : {};
    
    return {
      uid: uid,
      email: userData.email || '',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      fullName: userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      phone: userData.phone || '',
      idNumber: patientData.idNumber || '',
      dateOfBirth: patientData.dateOfBirth || '',
      medicalAidProvider: patientData.medicalAidProvider || '',
      medicalAidNumber: patientData.medicalAidNumber || '',
      emergencyContact: patientData.emergencyContact || { name: '', relationship: '', phone: '' },
      allergies: patientData.allergies || [],
      chronicConditions: patientData.chronicConditions || [],
      medications: patientData.medications || [],
      photoURL: userData.photoURL || '',
      createdAt: userData.createdAt || null,
      lastLogin: userData.lastLogin || null,
    };
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    throw error;
  }
};

const fetchPatientBookings = async (uid: string): Promise<Booking[]> => {
  if (!uid) return [];

  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('patientId', '==', uid),
      orderBy('appointmentDate', 'desc'),
      limit(50)
    );
    
    const bookingsSnap = await getDocs(q);
    const bookings: Booking[] = [];

    for (const docSnap of bookingsSnap.docs) {
      const data = docSnap.data();
      
      let doctorName = 'Unknown Doctor';
      let doctorSpecialization = '';
      
      if (data.doctorId) {
        try {
          const doctorRef = doc(db, 'doctors', data.doctorId);
          const doctorSnap = await getDoc(doctorRef);
          if (doctorSnap.exists()) {
            const doctorData = doctorSnap.data();
            const doctorUserRef = doc(db, 'users', data.doctorId);
            const doctorUserSnap = await getDoc(doctorUserRef);
            const doctorUserData = doctorUserSnap.exists() ? doctorUserSnap.data() : {};
            
            doctorName = doctorUserData.fullName || `${doctorUserData.firstName || ''} ${doctorUserData.lastName || ''}`.trim() || 'Unknown Doctor';
            doctorSpecialization = doctorData.specialization || '';
          }
        } catch (e) {
          console.error('Error fetching doctor info:', e);
        }
      }
      
      bookings.push({
        id: docSnap.id,
        doctorId: data.doctorId || '',
        patientId: data.patientId || '',
        doctorName: doctorName,
        doctorSpecialization: doctorSpecialization,
        appointmentDate: data.appointmentDate || '',
        appointmentTime: data.appointmentTime || '',
        status: data.status || 'pending',
        notes: data.notes || '',
        consultationFee: data.consultationFee || 0,
        rescheduleCount: data.rescheduleCount || 0,
        maxReschedules: data.maxReschedules || 2,
        createdAt: data.createdAt || null,
      });
    }
    
    return bookings;
  } catch (error) {
    console.log('No bookings found or bookings collection not yet created');
    return [];
  }
};

const fetchAvailableDoctors = async (): Promise<Doctor[]> => {
  try {
    const doctorsRef = collection(db, 'doctors');
    const q = query(
      doctorsRef,
      where('verificationStatus', '==', 'verified')
    );
    
    const doctorsSnap = await getDocs(q);
    const doctors: Doctor[] = [];

    for (const docSnap of doctorsSnap.docs) {
      const data = docSnap.data();
      
      const userRef = doc(db, 'users', docSnap.id);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      
      doctors.push({
        id: docSnap.id,
        firstName: userData.firstName || data.firstName || '',
        lastName: userData.lastName || data.lastName || '',
        fullName: userData.fullName || data.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        email: userData.email || data.email || '',
        specialization: data.specialization || '',
        practiceName: data.practiceName || '',
        practiceAddress: data.practiceAddress || '',
        consultationFee: data.consultationFee || 0,
        consultationDuration: data.consultationDuration || 30,
        rating: data.rating || 0,
        reviewCount: data.reviewCount || 0,
        profileImage: data.profileImage || '',
        verificationStatus: data.verificationStatus || 'pending',
      });
    }
    
    return doctors;
  } catch (error) {
    console.error('Error fetching available doctors:', error);
    return [];
  }
};

const fetchMembership = async (uid: string): Promise<Membership | null> => {
  if (!uid) return null;

  try {
    const membershipRef = doc(db, 'memberships', uid);
    const membershipSnap = await getDoc(membershipRef);
    
    if (membershipSnap.exists()) {
      const data = membershipSnap.data();
      return {
        tier: data.tier || 'basic',
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        features: data.features || [],
      };
    }
    
    return { tier: 'basic', startDate: null, endDate: null, features: [] };
  } catch (error) {
    console.error('Error fetching membership:', error);
    return { tier: 'basic', startDate: null, endDate: null, features: [] };
  }
};

// ==================== SIDEBAR COMPONENT ====================
const SidebarContent = ({ 
  activeTab, 
  setActiveTab, 
  patientProfile, 
  stats, 
  membership, 
  navigate, 
  refetchProfile, 
  isRefetchingProfile, 
  signOut,
  isMobile,
  closeMobileMenu,
  openBookingForm
}: any) => {
  const getInitials = (name: string) => {
    if (!name) return 'P';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Logo */}
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <h1 className="text-xl sm:text-2xl font-bold text-blue-600">MedMap</h1>
        <p className="text-xs text-gray-500 mt-1">Patient Portal</p>
      </div>
      
      {/* User Profile Summary */}
      <div className="p-3 sm:p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
            <AvatarImage src={patientProfile?.photoURL} />
            <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-bold">
              {patientProfile ? getInitials(patientProfile.fullName) : 'P'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
              {patientProfile?.fullName || 'Patient'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {patientProfile?.email}
            </p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-3 sm:p-4 space-y-1">
          <button
            onClick={() => {
              setActiveTab('overview');
              if (isMobile && closeMobileMenu) closeMobileMenu();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'overview' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Home className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Dashboard</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('appointments');
              if (isMobile && closeMobileMenu) closeMobileMenu();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'appointments' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Appointments</span>
            {stats.upcomingBookings > 0 && (
              <Badge className="ml-auto bg-blue-100 text-blue-800 text-xs flex-shrink-0">
                {stats.upcomingBookings}
              </Badge>
            )}
          </button>
          
          <button
            onClick={() => {
              setActiveTab('history');
              if (isMobile && closeMobileMenu) closeMobileMenu();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'history' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <History className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Medical History</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('profile');
              if (isMobile && closeMobileMenu) closeMobileMenu();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'profile' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <UserCircle className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">My Profile</span>
          </button>
          
          <button
            onClick={() => {
              if (isMobile && closeMobileMenu) closeMobileMenu();
              openBookingForm();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Book Appointment</span>
          </button>
        </nav>
      </ScrollArea>
      
      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-gray-100 space-y-2">
        <button
          onClick={() => {
            navigate('/memberships');
            if (isMobile && closeMobileMenu) closeMobileMenu();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Shield className="w-5 h-5 flex-shrink-0" />
          <span className="truncate">Membership</span>
          {membership?.tier === 'premium' && (
            <Badge className="ml-auto bg-purple-100 text-purple-800 text-xs flex-shrink-0">Premium</Badge>
          )}
        </button>
        
        <button
          onClick={() => refetchProfile()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          disabled={isRefetchingProfile}
        >
          <RefreshCw className={`w-4 h-4 flex-shrink-0 ${isRefetchingProfile ? 'animate-spin' : ''}`} />
          <span className="truncate">Refresh</span>
        </button>
        
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="truncate">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

// ==================== PATIENT DASHBOARD COMPONENT ====================
const PatientDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Booking form state
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  
  // Profile editing states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<PatientProfile>>({});
  const [allergiesInput, setAllergiesInput] = useState('');
  const [conditionsInput, setConditionsInput] = useState('');
  const [medicationsInput, setMedicationsInput] = useState('');

  // ==================== SOCKET CONNECTION ====================
  
  const {
    isConnected,
    joinPatientRoom,
    createBooking,
  } = useBookingSocket({
    onBookingCreated: (data) => {
      toast({
        title: 'Booking Requested',
        description: `Your appointment request for ${data.appointmentDate} at ${data.appointmentTime} has been sent.`,
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.patientBookings] });
    },
    onBookingRescheduled: (data) => {
      toast({
        title: 'Booking Rescheduled',
        description: `Your appointment has been rescheduled. ${data.rescheduleCount}/${data.maxReschedules} reschedules used.`,
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.patientBookings] });
    },
    onBookingCancelled: (data) => {
      toast({
        title: 'Booking Cancelled',
        description: data.reason || 'Your appointment has been cancelled.',
        variant: 'destructive',
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.patientBookings] });
    },
    onBookingUpdated: (data) => {
      toast({
        title: 'Booking Updated',
        description: `Your appointment status is now ${data.status}.`,
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.patientBookings] });
    },
  });

  // Join patient room when user is logged in
  useEffect(() => {
    if (user?.uid) {
      joinPatientRoom(user.uid);
    }
  }, [user?.uid]);

  // ==================== QUERIES ====================
  
  const {
    data: patientProfile,
    isLoading: isLoadingProfile,
    error: profileError,
    refetch: refetchProfile,
    isRefetching: isRefetchingProfile,
  } = useQuery({
    queryKey: [QUERY_KEYS.patientProfile, user?.uid],
    queryFn: () => fetchPatientProfile(user!.uid),
    enabled: !!user && profile?.role === 'patient',
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
  });

  const {
    data: bookings = [],
    isLoading: isLoadingBookings,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: [QUERY_KEYS.patientBookings, user?.uid],
    queryFn: () => fetchPatientBookings(user!.uid),
    enabled: !!user && profile?.role === 'patient',
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 30 * 1000,
  });

  const {
    data: availableDoctors = [],
    isLoading: isLoadingDoctors,
  } = useQuery({
    queryKey: [QUERY_KEYS.availableDoctors],
    queryFn: fetchAvailableDoctors,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const {
    data: membership,
    isLoading: isLoadingMembership,
  } = useQuery({
    queryKey: [QUERY_KEYS.membership, user?.uid],
    queryFn: () => fetchMembership(user!.uid),
    enabled: !!user && profile?.role === 'patient',
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // ==================== DERIVED DATA ====================
  const now = new Date();
  const upcomingBookings = bookings.filter(b => 
    new Date(b.appointmentDate) >= now && b.status !== 'cancelled'
  );
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  
  const stats = {
    totalBookings: bookings.length,
    upcomingBookings: upcomingBookings.length,
    pendingBookings: pendingBookings.length,
    completedBookings: completedBookings.length,
    cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
    membershipType: membership?.tier || 'basic',
    freeBookingsRemaining: Math.max(0, 3 - completedBookings.length)
  };

  const recentBookings = bookings.slice(0, 5);

  // ==================== MUTATIONS ====================
  
  const updateProfileMutation = useMutation({
    mutationFn: async (data: {
      editedProfile: Partial<PatientProfile>;
      allergiesList: string[];
      conditionsList: string[];
      medicationsList: string[];
    }) => {
      if (!user?.uid) throw new Error('User not authenticated');

      const { editedProfile, allergiesList, conditionsList, medicationsList } = data;
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        firstName: editedProfile.firstName,
        lastName: editedProfile.lastName,
        fullName: `${editedProfile.firstName || ''} ${editedProfile.lastName || ''}`.trim(),
        phone: editedProfile.phone || '',
        updatedAt: serverTimestamp(),
      });
      
      const patientRef = doc(db, 'patients', user.uid);
      await updateDoc(patientRef, {
        dateOfBirth: editedProfile.dateOfBirth || '',
        medicalAidProvider: editedProfile.medicalAidProvider || '',
        medicalAidNumber: editedProfile.medicalAidNumber || '',
        emergencyContact: editedProfile.emergencyContact || { name: '', relationship: '', phone: '' },
        allergies: allergiesList,
        chronicConditions: conditionsList,
        medications: medicationsList,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      });
      setIsEditingProfile(false);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.patientProfile] });
    },
    onError: (error: any) => {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // ==================== HANDLER FUNCTIONS ====================
  
  const openBookingForm = () => {
    setSelectedDoctor(null);
    setShowBookingForm(true);
  };

  const handleBookAppointment = async (doctorId: string, date: string, time: string, notes?: string) => {
    if (!user || !patientProfile) {
      toast({
        title: 'Error',
        description: 'Please sign in to book an appointment.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Get doctor details
      const doctorRef = doc(db, 'doctors', doctorId);
      const doctorSnap = await getDoc(doctorRef);
      const doctorData = doctorSnap.exists() ? doctorSnap.data() : {};

      // Get doctor user data
      const userRef = doc(db, 'users', doctorId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      const doctorName = userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Doctor';
      const doctorSpecialization = doctorData.specialization || '';

      const bookingData = {
        doctorId,
        patientId: user.uid,
        patientName: patientProfile.fullName,
        patientEmail: patientProfile.email,
        patientPhone: patientProfile.phone || '',
        doctorName: doctorName,
        doctorSpecialization: doctorSpecialization,
        appointmentDate: date,
        appointmentTime: time,
        endTime: calculateEndTime(time, doctorData.consultationDuration || 30),
        notes,
        consultationFee: doctorData.consultationFee || 0,
      };

      const response = await createBooking(bookingData);
      
      if (response.bookingId) {
        toast({
          title: 'Booking Requested',
          description: 'Your appointment request has been sent to the doctor.',
        });
        setShowBookingForm(false);
        setSelectedDoctor(null);
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.patientBookings] });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to create booking.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to book appointment.',
        variant: 'destructive',
      });
    }
  };

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  const handleSaveProfile = async () => {
    if (!patientProfile) return;
    
    const allergiesList = allergiesInput
      .split(',')
      .map(item => item.trim())
      .filter(item => item);
    
    const conditionsList = conditionsInput
      .split(',')
      .map(item => item.trim())
      .filter(item => item);
    
    const medicationsList = medicationsInput
      .split(',')
      .map(item => item.trim())
      .filter(item => item);
    
    updateProfileMutation.mutate({
      editedProfile,
      allergiesList,
      conditionsList,
      medicationsList,
    });
  };

  const handleCancelEdit = () => {
    if (patientProfile) {
      setEditedProfile(patientProfile);
      setAllergiesInput(patientProfile.allergies?.join(', ') || '');
      setConditionsInput(patientProfile.chronicConditions?.join(', ') || '');
      setMedicationsInput(patientProfile.medications?.join(', ') || '');
    }
    setIsEditingProfile(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    try {
      return format(new Date(`2000-01-01T${timeString}`), 'h:mm a');
    } catch {
      return timeString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      case 'rescheduled':
        return <Badge className="bg-purple-100 text-purple-800">Rescheduled</Badge>;
      case 'no-show':
        return <Badge className="bg-gray-100 text-gray-800">No-Show</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'P';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Set edit form when profile data loads
  useEffect(() => {
    if (patientProfile) {
      setEditedProfile(patientProfile);
      setAllergiesInput(patientProfile.allergies?.join(', ') || '');
      setConditionsInput(patientProfile.chronicConditions?.join(', ') || '');
      setMedicationsInput(patientProfile.medications?.join(', ') || '');
    }
  }, [patientProfile]);

  // Redirect if not patient
  useEffect(() => {
    if (profile && profile.role !== 'patient') {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileMenuOpen]);

  // ==================== LOADING STATE ====================
  if (isLoadingProfile || isLoadingBookings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 px-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 text-sm sm:text-base">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // ==================== ERROR STATE ====================
  if (profileError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Profile</h2>
            <p className="text-gray-600 mb-4">{(profileError as Error).message}</p>
            <Button onClick={() => refetchProfile()} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ===== MOBILE HEADER ===== */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-blue-600">MedMap</h1>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={openBookingForm}
          >
            <Plus className="h-4 w-4 mr-1" />
            Book
          </Button>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SidebarContent
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                patientProfile={patientProfile}
                stats={stats}
                membership={membership}
                navigate={navigate}
                refetchProfile={refetchProfile}
                isRefetchingProfile={isRefetchingProfile}
                signOut={handleSignOut}
                isMobile={true}
                closeMobileMenu={() => setMobileMenuOpen(false)}
                openBookingForm={openBookingForm}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* ===== DESKTOP SIDEBAR ===== */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col z-20">
        <SidebarContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          patientProfile={patientProfile}
          stats={stats}
          membership={membership}
          navigate={navigate}
          refetchProfile={refetchProfile}
          isRefetchingProfile={isRefetchingProfile}
          signOut={handleSignOut}
          isMobile={false}
          openBookingForm={openBookingForm}
        />
      </div>
      
      {/* ===== MAIN CONTENT ===== */}
      <div className="lg:ml-64 pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 lg:mb-8">
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                {activeTab === 'overview' && `Welcome back, ${patientProfile?.firstName || 'Patient'}!`}
                {activeTab === 'appointments' && 'All Appointments'}
                {activeTab === 'history' && 'Medical History'}
                {activeTab === 'profile' && 'My Profile'}
              </h1>
              <p className="text-gray-600 mt-1 text-xs sm:text-sm flex items-center gap-2">
                {new Date().toLocaleDateString('en-ZA', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
                <span className="hidden sm:inline-flex items-center gap-1 text-xs">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </p>
            </div>
            
            <div className="flex items-center gap-3 mt-3 sm:mt-0">
              {isLoadingBookings && (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              )}
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base"
                onClick={openBookingForm}
              >
                <Plus className="h-4 w-4 mr-2" />
                Book Appointment
              </Button>
            </div>
          </div>

          {activeTab === 'overview' && (
            <>
              {/* Quick Stats - Mobile Responsive Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 lg:mb-8">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3 sm:p-4 md:p-6">
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs md:text-sm text-gray-600">Total Bookings</p>
                        <p className="text-base sm:text-xl md:text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3 sm:p-4 md:p-6">
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs md:text-sm text-gray-600">Upcoming</p>
                        <p className="text-base sm:text-xl md:text-2xl font-bold text-gray-900">{stats.upcomingBookings}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3 sm:p-4 md:p-6">
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Activity className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs md:text-sm text-gray-600">Completed</p>
                        <p className="text-base sm:text-xl md:text-2xl font-bold text-gray-900">{stats.completedBookings}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3 sm:p-4 md:p-6">
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Shield className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs md:text-sm text-gray-600">Membership</p>
                        <p className="text-sm sm:text-base md:text-lg font-bold text-gray-900 capitalize">{stats.membershipType}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Recent Bookings */}
                <div className="lg:col-span-2">
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-3 sm:pb-4">
                      <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">Recent Bookings</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('appointments')}
                        className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm"
                      >
                        View All
                        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4">
                      {isLoadingBookings ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                      ) : recentBookings.length === 0 ? (
                        <div className="text-center py-8">
                          <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-gray-400" />
                          <h3 className="text-base sm:text-lg font-semibold mb-2">No bookings yet</h3>
                          <p className="text-sm sm:text-base text-gray-600 mb-4">
                            Book your first appointment to get started
                          </p>
                          <Button
                            className="bg-blue-600 hover:bg-blue-700 text-sm sm:text-base"
                            onClick={openBookingForm}
                          >
                            Book Now
                          </Button>
                        </div>
                      ) : (
                        recentBookings.map((booking) => (
                          <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-2 sm:gap-3">
                            <div className="flex items-center gap-3 sm:gap-4">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                                  {booking.doctorName || 'Unknown Doctor'}
                                </h4>
                                <p className="text-xs sm:text-sm text-gray-600 truncate">{booking.doctorSpecialization}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500">
                                  {formatDate(booking.appointmentDate)} at {formatTime(booking.appointmentTime)}
                                </p>
                                {booking.rescheduleCount && booking.rescheduleCount > 0 && (
                                  <p className="text-[10px] text-purple-600">
                                    Rescheduled {booking.rescheduleCount}/{booking.maxReschedules} times
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-left sm:text-right flex-shrink-0">
                              {getStatusBadge(booking.status)}
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-4 sm:space-y-6">
                  {/* Available Doctors */}
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3 sm:pb-4">
                      <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">Available Doctors</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {isLoadingDoctors ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                      ) : availableDoctors.length === 0 ? (
                        <p className="text-sm text-gray-600 text-center py-4">No doctors available right now.</p>
                      ) : (
                        availableDoctors.slice(0, 4).map((doctor) => (
                          <div key={doctor.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg gap-2">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                                <AvatarImage src={doctor.profileImage} />
                                <AvatarFallback className="bg-blue-100 text-blue-600 text-[10px] sm:text-xs font-medium">
                                  {getInitials(doctor.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <h4 className="font-medium text-gray-900 text-xs sm:text-sm truncate">Dr. {doctor.firstName} {doctor.lastName}</h4>
                                <p className="text-[10px] sm:text-xs text-gray-600 truncate">{doctor.specialization}</p>
                                <p className="text-[10px] text-gray-500">R{doctor.consultationFee}</p>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              className="bg-blue-600 hover:bg-blue-700 flex-shrink-0 text-xs sm:text-sm"
                              onClick={() => {
                                setSelectedDoctor(doctor);
                                setShowBookingForm(true);
                              }}
                            >
                              Book
                            </Button>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {/* Membership Card */}
                  <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                            {stats.membershipType === 'premium' ? 'Premium Member' : 'Basic Member'}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 truncate">
                            {stats.membershipType === 'premium' 
                              ? 'Unlimited bookings • Priority support' 
                              : `${stats.freeBookingsRemaining} free bookings remaining`}
                          </p>
                        </div>
                      </div>
                      
                      {stats.membershipType === 'basic' && (
                        <>
                          <Progress 
                            value={(stats.freeBookingsRemaining / 3) * 100} 
                            className="h-2 mb-4"
                          />
                          <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-sm"
                            onClick={() => navigate('/memberships')}
                          >
                            Upgrade to Premium
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}

          {activeTab === 'appointments' && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">All Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingBookings ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No appointments yet</h3>
                    <p className="text-gray-600 mb-4">Book your first appointment to get started</p>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={openBookingForm}
                    >
                      Book Now
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((booking) => (
                      <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-2 sm:gap-3">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                              {booking.doctorName || 'Unknown Doctor'}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 truncate">{booking.doctorSpecialization}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500">
                              {formatDate(booking.appointmentDate)} at {formatTime(booking.appointmentTime)}
                            </p>
                            {booking.rescheduleCount && booking.rescheduleCount > 0 && (
                              <p className="text-[10px] text-purple-600">
                                Rescheduled {booking.rescheduleCount}/{booking.maxReschedules} times
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0">
                          {getStatusBadge(booking.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4 sm:space-y-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">Medical History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
                  {/* Allergies */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                      Allergies
                    </h4>
                    {patientProfile?.allergies && patientProfile.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {patientProfile.allergies.map((allergy, i) => (
                          <Badge key={i} className="bg-red-50 text-red-700 text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No allergies recorded</p>
                    )}
                  </div>
                  
                  {/* Chronic Conditions */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                      <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                      Chronic Conditions
                    </h4>
                    {patientProfile?.chronicConditions && patientProfile.chronicConditions.length > 0 ? (
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {patientProfile.chronicConditions.map((condition, i) => (
                          <Badge key={i} className="bg-orange-50 text-orange-700 text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1">
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No chronic conditions recorded</p>
                    )}
                  </div>
                  
                  {/* Medications */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                      <Pill className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                      Current Medications
                    </h4>
                    {patientProfile?.medications && patientProfile.medications.length > 0 ? (
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {patientProfile.medications.map((medication, i) => (
                          <Badge key={i} className="bg-purple-50 text-purple-700 text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1">
                            {medication}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No medications recorded</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'profile' && patientProfile && (
            <div className="space-y-4 sm:space-y-6">
              {/* Profile Header with Edit/Save buttons */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">Personal Information</CardTitle>
                  {!isEditingProfile ? (
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingProfile(true)}
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={updateProfileMutation.isPending}
                        size="sm"
                        className="flex-1 sm:flex-none"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                        onClick={handleSaveProfile}
                        disabled={updateProfileMutation.isPending}
                        size="sm"
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
                    <Avatar className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20">
                      <AvatarImage src={patientProfile.photoURL} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-lg sm:text-xl md:text-2xl font-bold">
                        {getInitials(patientProfile.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate">{patientProfile.fullName}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{patientProfile.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                    <div>
                      <Label className="text-gray-500 text-xs sm:text-sm">First Name</Label>
                      {isEditingProfile ? (
                        <Input
                          value={editedProfile.firstName || ''}
                          onChange={(e) => setEditedProfile({ ...editedProfile, firstName: e.target.value })}
                          className="mt-1 text-sm"
                        />
                      ) : (
                        <p className="font-medium text-gray-900 mt-1 text-sm sm:text-base truncate">{patientProfile.firstName}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-gray-500 text-xs sm:text-sm">Last Name</Label>
                      {isEditingProfile ? (
                        <Input
                          value={editedProfile.lastName || ''}
                          onChange={(e) => setEditedProfile({ ...editedProfile, lastName: e.target.value })}
                          className="mt-1 text-sm"
                        />
                      ) : (
                        <p className="font-medium text-gray-900 mt-1 text-sm sm:text-base truncate">{patientProfile.lastName}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-gray-500 text-xs sm:text-sm flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        ID Number
                      </Label>
                      <p className="font-medium text-gray-900 mt-1 text-sm sm:text-base truncate">{patientProfile.idNumber || 'Not provided'}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1">ID number cannot be changed</p>
                    </div>
                    
                    <div>
                      <Label className="text-gray-500 text-xs sm:text-sm">Date of Birth</Label>
                      {isEditingProfile ? (
                        <Input
                          type="date"
                          value={editedProfile.dateOfBirth || ''}
                          onChange={(e) => setEditedProfile({ ...editedProfile, dateOfBirth: e.target.value })}
                          className="mt-1 text-sm"
                        />
                      ) : (
                        <p className="font-medium text-gray-900 mt-1 text-sm sm:text-base truncate">{patientProfile.dateOfBirth || 'Not provided'}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-gray-500 text-xs sm:text-sm">Phone Number</Label>
                      {isEditingProfile ? (
                        <Input
                          type="tel"
                          value={editedProfile.phone || ''}
                          onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                          className="mt-1 text-sm"
                        />
                      ) : (
                        <p className="font-medium text-gray-900 mt-1 text-sm sm:text-base truncate">{patientProfile.phone || 'Not provided'}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-gray-500 text-xs sm:text-sm">Email</Label>
                      <p className="font-medium text-gray-900 mt-1 text-sm sm:text-base truncate">{patientProfile.email}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                    Emergency Contact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                    <div>
                      <Label className="text-gray-500 text-xs sm:text-sm">Full Name</Label>
                      {isEditingProfile ? (
                        <Input
                          value={editedProfile.emergencyContact?.name || ''}
                          onChange={(e) => setEditedProfile({
                            ...editedProfile,
                            emergencyContact: { 
                              ...editedProfile.emergencyContact, 
                              name: e.target.value, 
                              relationship: editedProfile.emergencyContact?.relationship || '', 
                              phone: editedProfile.emergencyContact?.phone || '' 
                            }
                          })}
                          className="mt-1 text-sm"
                        />
                      ) : (
                        <p className="font-medium text-gray-900 mt-1 text-sm sm:text-base truncate">{patientProfile.emergencyContact?.name || 'Not provided'}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-gray-500 text-xs sm:text-sm">Relationship</Label>
                      {isEditingProfile ? (
                        <Select
                          value={editedProfile.emergencyContact?.relationship || ''}
                          onValueChange={(value) => setEditedProfile({
                            ...editedProfile,
                            emergencyContact: { 
                              ...editedProfile.emergencyContact, 
                              relationship: value, 
                              name: editedProfile.emergencyContact?.name || '', 
                              phone: editedProfile.emergencyContact?.phone || '' 
                            }
                          })}
                        >
                          <SelectTrigger className="mt-1 text-sm">
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Spouse">Spouse</SelectItem>
                            <SelectItem value="Parent">Parent</SelectItem>
                            <SelectItem value="Child">Child</SelectItem>
                            <SelectItem value="Sibling">Sibling</SelectItem>
                            <SelectItem value="Partner">Partner</SelectItem>
                            <SelectItem value="Friend">Friend</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="font-medium text-gray-900 mt-1 text-sm sm:text-base truncate">{patientProfile.emergencyContact?.relationship || 'Not provided'}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-gray-500 text-xs sm:text-sm">Contact Number</Label>
                      {isEditingProfile ? (
                        <Input
                          type="tel"
                          value={editedProfile.emergencyContact?.phone || ''}
                          onChange={(e) => setEditedProfile({
                            ...editedProfile,
                            emergencyContact: { 
                              ...editedProfile.emergencyContact, 
                              phone: e.target.value, 
                              name: editedProfile.emergencyContact?.name || '', 
                              relationship: editedProfile.emergencyContact?.relationship || '' 
                            }
                          })}
                          className="mt-1 text-sm"
                        />
                      ) : (
                        <p className="font-medium text-gray-900 mt-1 text-sm sm:text-base truncate">{patientProfile.emergencyContact?.phone || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Medical Aid */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                    Medical Aid
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                    <div>
                      <Label className="text-gray-500 text-xs sm:text-sm">Provider</Label>
                      {isEditingProfile ? (
                        <Select
                          value={editedProfile.medicalAidProvider || ''}
                          onValueChange={(value) => setEditedProfile({ ...editedProfile, medicalAidProvider: value })}
                        >
                          <SelectTrigger className="mt-1 text-sm">
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Discovery Health">Discovery Health</SelectItem>
                            <SelectItem value="Momentum Health">Momentum Health</SelectItem>
                            <SelectItem value="Bonitas">Bonitas</SelectItem>
                            <SelectItem value="Fedhealth">Fedhealth</SelectItem>
                            <SelectItem value="Medshield">Medshield</SelectItem>
                            <SelectItem value="Bestmed">Bestmed</SelectItem>
                            <SelectItem value="Sizwe">Sizwe</SelectItem>
                            <SelectItem value="GEMS">GEMS</SelectItem>
                            <SelectItem value="Polmed">Polmed</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="font-medium text-gray-900 mt-1 text-sm sm:text-base truncate">{patientProfile.medicalAidProvider || 'None'}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-gray-500 text-xs sm:text-sm">Membership Number</Label>
                      {isEditingProfile ? (
                        <Input
                          value={editedProfile.medicalAidNumber || ''}
                          onChange={(e) => setEditedProfile({ ...editedProfile, medicalAidNumber: e.target.value })}
                          className="mt-1 text-sm"
                        />
                      ) : (
                        <p className="font-medium text-gray-900 mt-1 text-sm sm:text-base truncate">{patientProfile.medicalAidNumber || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Medical Information */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Pill className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                    Medical Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
                  <div>
                    <Label className="text-gray-500 text-xs sm:text-sm flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                      Allergies
                    </Label>
                    {isEditingProfile ? (
                      <Textarea
                        value={allergiesInput}
                        onChange={(e) => setAllergiesInput(e.target.value)}
                        placeholder="e.g., Penicillin, Peanuts, Latex (separate with commas)"
                        className="mt-2 text-sm"
                        rows={2}
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                        {patientProfile.allergies?.length ? (
                          patientProfile.allergies.map((a, i) => (
                            <Badge key={i} className="bg-red-50 text-red-700 text-xs sm:text-sm">{a}</Badge>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">None reported</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-gray-500 text-xs sm:text-sm flex items-center gap-2">
                      <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
                      Chronic Conditions
                    </Label>
                    {isEditingProfile ? (
                      <Textarea
                        value={conditionsInput}
                        onChange={(e) => setConditionsInput(e.target.value)}
                        placeholder="e.g., Diabetes, Hypertension, Asthma (separate with commas)"
                        className="mt-2 text-sm"
                        rows={2}
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                        {patientProfile.chronicConditions?.length ? (
                          patientProfile.chronicConditions.map((c, i) => (
                            <Badge key={i} className="bg-orange-50 text-orange-700 text-xs sm:text-sm">{c}</Badge>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">None reported</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-gray-500 text-xs sm:text-sm flex items-center gap-2">
                      <Pill className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500" />
                      Current Medications
                    </Label>
                    {isEditingProfile ? (
                      <Textarea
                        value={medicationsInput}
                        onChange={(e) => setMedicationsInput(e.target.value)}
                        placeholder="e.g., Insulin, Blood pressure medication (separate with commas)"
                        className="mt-2 text-sm"
                        rows={2}
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                        {patientProfile.medications?.length ? (
                          patientProfile.medications.map((m, i) => (
                            <Badge key={i} className="bg-purple-50 text-purple-700 text-xs sm:text-sm">{m}</Badge>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">None reported</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* ===== BOOKING FORM ===== */}
      <BookingForm
        open={showBookingForm}
        onOpenChange={setShowBookingForm}
        onBook={handleBookAppointment}
        selectedDoctor={selectedDoctor}
      />
    </div>
  );
};

export default PatientDashboard;