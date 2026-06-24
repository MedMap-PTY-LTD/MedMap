// pages/doctor/DoctorDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  Users,
  DollarSign,
  Settings,
  TrendingUp,
  Eye,
  Edit,
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
  User,
  Building2,
  Stethoscope,
  Save,
  X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DoctorProfile {
  uid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  practiceName: string;
  practiceAddress: string;
  practicePhone: string;
  practiceEmail: string;
  specialization: string;
  hpcsaNumber: string;
  qualifications: string[];
  experience: string;
  bio: string;
  consultationFee: number;
  consultationDuration: number;
  operatingHours: any;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  enrollmentCompleted: boolean;
  rating: number;
  reviewCount: number;
  profileImage?: string;
  createdAt: any;
  updatedAt: any;
  rejectionReason?: string;
}

const DoctorDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    monthlyRevenue: 0,
    rating: 0,
    totalPatients: 0,
  });
  const [analyticsData, setAnalyticsData] = useState({
    bookingStatus: [] as any[],
    revenueTrend: [] as any[],
  });

  useEffect(() => {
    if (profile?.role === 'doctor') {
      fetchDoctorData();
    } else if (profile && profile.role !== 'doctor') {
      navigate('/dashboard');
    }
  }, [user, profile]);

  const fetchDoctorData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Get doctor profile
      const doctorRef = doc(db, 'doctors', user.uid);
      const doctorSnap = await getDoc(doctorRef);
      
      if (doctorSnap.exists()) {
        const doctorData = doctorSnap.data();
        
        // Get user data
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};
        
        const combinedDoctor: DoctorProfile = {
          uid: user.uid,
          firstName: userData.firstName || doctorData.firstName || '',
          lastName: userData.lastName || doctorData.lastName || '',
          fullName: userData.fullName || doctorData.fullName || '',
          email: userData.email || doctorData.email || '',
          phone: userData.phone || doctorData.phone || '',
          practiceName: doctorData.practiceName || '',
          practiceAddress: doctorData.practiceAddress || '',
          practicePhone: doctorData.practicePhone || '',
          practiceEmail: doctorData.practiceEmail || '',
          specialization: doctorData.specialization || '',
          hpcsaNumber: doctorData.hpcsaNumber || '',
          qualifications: doctorData.qualifications || [],
          experience: doctorData.experience || '',
          bio: doctorData.bio || '',
          consultationFee: doctorData.consultationFee || 0,
          consultationDuration: doctorData.consultationDuration || 30,
          operatingHours: doctorData.operatingHours || {},
          verificationStatus: doctorData.verificationStatus || 'pending',
          enrollmentCompleted: doctorData.enrollmentCompleted || false,
          rating: doctorData.rating || 0,
          reviewCount: doctorData.reviewCount || 0,
          profileImage: doctorData.profileImage || userData.photoURL || '',
          createdAt: doctorData.createdAt || userData.createdAt,
          updatedAt: doctorData.updatedAt || userData.updatedAt,
          rejectionReason: doctorData.rejectionReason || '',
        };
        
        setDoctor(combinedDoctor);
        setEditForm(combinedDoctor);
        
        // If enrollment is not completed, redirect to enrollment form
        if (!combinedDoctor.enrollmentCompleted) {
          navigate('/doctor-enrollment');
          setLoading(false);
          return;
        }
        
        // Fetch bookings (with error handling)
        await fetchBookings(combinedDoctor.uid);
        
      } else {
        // No doctor profile exists - redirect to enrollment
        toast({
          title: 'Profile Incomplete',
          description: 'Please complete your doctor profile first.',
        });
        navigate('/doctor-enrollment');
      }
    } catch (error: any) {
      console.error('Error fetching doctor data:', error);
      // Don't show error toast for missing collections, just log it
      if (!error.message?.includes('collection')) {
        toast({
          title: 'Error',
          description: 'Failed to load doctor profile. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async (doctorId: string) => {
    try {
      // Try to get bookings - if collection doesn't exist, just use empty array
      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef,
        where('doctorId', '==', doctorId),
        orderBy('appointmentDate', 'desc'),
        limit(50)
      );
      const bookingsSnap = await getDocs(q);
      
      const bookings: any[] = [];
      let totalRevenue = 0;
      let completedCount = 0;
      let pendingCount = 0;
      
      for (const docSnap of bookingsSnap.docs) {
        const data = docSnap.data();
        
        // Get patient info
        let patientName = 'Unknown Patient';
        
        if (data.patientId) {
          try {
            const patientRef = doc(db, 'users', data.patientId);
            const patientSnap = await getDoc(patientRef);
            if (patientSnap.exists()) {
              const patientData = patientSnap.data();
              patientName = patientData.fullName || `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Unknown Patient';
            }
          } catch (e) {
            // Ignore patient fetch errors
          }
        }
        
        const booking = {
          id: docSnap.id,
          patientId: data.patientId || '',
          patientName,
          appointmentDate: data.appointmentDate || '',
          appointmentTime: data.appointmentTime || '',
          status: data.status || 'pending',
          notes: data.notes || '',
          consultationFee: data.consultationFee || doctor?.consultationFee || 0,
          createdAt: data.createdAt,
        };
        
        bookings.push(booking);
        
        if (booking.status === 'completed') {
          totalRevenue += booking.consultationFee;
          completedCount++;
        }
        if (booking.status === 'pending') {
          pendingCount++;
        }
      }
      
      setPendingBookings(bookings.filter(b => b.status === 'pending'));
      
      // Upcoming bookings (today and future)
      const today = new Date().toISOString().split('T')[0];
      const upcoming = bookings.filter(b => 
        b.appointmentDate >= today && 
        b.status !== 'cancelled' &&
        b.status !== 'completed'
      );
      setUpcomingBookings(upcoming);
      
      // Calculate stats
      const uniquePatients = new Set(bookings.map(b => b.patientId)).size;
      
      setStats({
        totalBookings: bookings.length,
        pendingBookings: pendingCount,
        completedBookings: completedCount,
        monthlyRevenue: totalRevenue,
        rating: doctor?.rating || 0,
        totalPatients: uniquePatients,
      });
      
      // Prepare analytics data
      const statusCounts = bookings.reduce((acc: any, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, {});
      
      const COLORS: Record<string, string> = {
        pending: '#F59E0B',
        confirmed: '#10B981',
        completed: '#3B82F6',
        cancelled: '#EF4444'
      };
      
      const bookingStatusData = Object.keys(statusCounts).map(status => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: statusCounts[status],
        color: COLORS[status] || '#888888'
      }));
      
      setAnalyticsData({
        bookingStatus: bookingStatusData,
        revenueTrend: [],
      });
      
    } catch (error: any) {
      // If collection doesn't exist, just use empty data
      console.log('No bookings found or bookings collection not yet created');
      setPendingBookings([]);
      setUpcomingBookings([]);
      setStats({
        totalBookings: 0,
        pendingBookings: 0,
        completedBookings: 0,
        monthlyRevenue: 0,
        rating: doctor?.rating || 0,
        totalPatients: 0,
      });
      setAnalyticsData({
        bookingStatus: [],
        revenueTrend: [],
      });
    }
  };

  const handleApproveBooking = async (bookingId: string) => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        status: 'confirmed',
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: 'Booking Approved',
        description: 'The appointment has been confirmed.',
      });
      
      await fetchBookings(doctor!.uid);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve booking.',
        variant: 'destructive',
      });
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: 'Booking Rejected',
        description: 'The appointment has been cancelled.',
      });
      
      await fetchBookings(doctor!.uid);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject booking.',
        variant: 'destructive',
      });
    }
  };

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setEditing(true);
    try {
      const doctorRef = doc(db, 'doctors', user.uid);
      const userRef = doc(db, 'users', user.uid);
      
      // Update doctor profile
      const doctorUpdateData = {
        practiceName: editForm.practiceName,
        practiceAddress: editForm.practiceAddress,
        practicePhone: editForm.practicePhone,
        practiceEmail: editForm.practiceEmail,
        specialization: editForm.specialization,
        hpcsaNumber: editForm.hpcsaNumber,
        qualifications: editForm.qualifications || [],
        experience: editForm.experience,
        bio: editForm.bio,
        consultationFee: parseFloat(editForm.consultationFee) || 0,
        consultationDuration: parseInt(editForm.consultationDuration) || 30,
        operatingHours: editForm.operatingHours,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(doctorRef, doctorUpdateData);
      
      // Update user profile
      await updateDoc(userRef, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone,
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      });
      
      setEditOpen(false);
      await fetchDoctorData();
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile.',
        variant: 'destructive',
      });
    } finally {
      setEditing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-ZA', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // No doctor profile
  if (!doctor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Complete Your Profile</h2>
            <p className="text-gray-600 mb-4">You need to complete your healthcare provider application before accessing the dashboard.</p>
            <Button onClick={() => navigate('/doctor-enrollment')} className="w-full">
              Complete Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verification status banner
  const renderVerificationBanner = () => {
    if (doctor.verificationStatus === 'verified') {
      return (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Profile Verified</p>
                <p className="text-sm text-green-700">Your practice is live and accepting patients.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    } else if (doctor.verificationStatus === 'rejected') {
      return (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <X className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Application Rejected</p>
                <p className="text-sm text-red-700">
                  Your application was not approved. {doctor.rejectionReason && `Reason: ${doctor.rejectionReason}`}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 border-red-300 text-red-700 hover:bg-red-100"
                  onClick={() => navigate('/doctor-enrollment')}
                >
                  Reapply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    } else {
      return (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Awaiting Verification</p>
                <p className="text-sm text-yellow-700">
                  Your application is being reviewed by our team. You'll receive a notification once approved.
                  While waiting, you can continue to edit your profile.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge className="bg-yellow-200 text-yellow-800">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Under Review
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                    onClick={() => setEditOpen(true)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit Profile
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome, Dr. {doctor.firstName} {doctor.lastName}
            </h1>
            <p className="text-gray-600 mt-1">
              {doctor.practiceName || 'Your Practice'} • {doctor.specialization || 'Specialization not set'}
            </p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button 
              variant="outline" 
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Verification Banner */}
        {renderVerificationBanner()}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingBookings}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.monthlyRevenue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Rating</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {doctor.rating ? doctor.rating.toFixed(1) : 'New'}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="mt-8">
          <Tabs defaultValue="appointments" className="space-y-6">
            <TabsList className="flex flex-wrap gap-1">
              <TabsTrigger value="appointments" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Appointments
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Appointments Tab */}
            <TabsContent value="appointments">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Pending Appointments</span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {pendingBookings.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pendingBookings.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No pending appointments</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {pendingBookings.map((booking) => (
                          <div key={booking.id} className="border rounded-lg p-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <p className="font-medium text-gray-900">{booking.patientName}</p>
                                <p className="text-sm text-gray-600">
                                  {formatDate(booking.appointmentDate)} at {booking.appointmentTime}
                                </p>
                                {booking.notes && (
                                  <p className="text-sm text-gray-500 mt-1">{booking.notes}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleApproveBooking(booking.id)}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => handleRejectBooking(booking.id)}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Decline
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Upcoming Appointments</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {upcomingBookings.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {upcomingBookings.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No upcoming appointments</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {upcomingBookings.map((booking) => (
                          <div key={booking.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{booking.patientName}</p>
                                <p className="text-sm text-gray-600">
                                  {formatDate(booking.appointmentDate)} at {booking.appointmentTime}
                                </p>
                              </div>
                              <Badge className={getStatusBadge(booking.status)}>
                                {booking.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Practice Profile</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditOpen(true)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Practice Name</h3>
                        <p className="text-lg font-semibold text-gray-900">{doctor.practiceName || 'Not set'}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Specialization</h3>
                        <p className="text-lg font-semibold text-gray-900">{doctor.specialization || 'Not set'}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">HPCSA Number</h3>
                        <p className="text-lg font-semibold text-gray-900">{doctor.hpcsaNumber || 'Not set'}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Consultation Fee</h3>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(doctor.consultationFee)}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Practice Address</h3>
                        <p className="text-lg font-semibold text-gray-900">{doctor.practiceAddress || 'Not set'}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Practice Phone</h3>
                        <p className="text-lg font-semibold text-gray-900">{doctor.practicePhone || 'Not set'}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Practice Email</h3>
                        <p className="text-lg font-semibold text-gray-900">{doctor.practiceEmail || 'Not set'}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Experience</h3>
                        <p className="text-lg font-semibold text-gray-900">{doctor.experience || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {doctor.bio && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-gray-500">Bio</h3>
                      <p className="text-gray-700 mt-1 whitespace-pre-wrap">{doctor.bio}</p>
                    </div>
                  )}

                  {doctor.qualifications && doctor.qualifications.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-500">Qualifications</h3>
                      <ul className="list-disc list-inside text-gray-700 mt-1">
                        {doctor.qualifications.map((qual, index) => (
                          <li key={index}>{qual}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Shield className="w-4 h-4" />
                      <span>Verification Status: </span>
                      <Badge className={getStatusBadge(doctor.verificationStatus)}>
                        {doctor.verificationStatus.charAt(0).toUpperCase() + doctor.verificationStatus.slice(1)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Profile last updated: {doctor.updatedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Booking Status</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {analyticsData.bookingStatus.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.bookingStatus}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {analyticsData.bookingStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        No bookings yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-gray-600">Total Patients</span>
                        <span className="font-bold text-gray-900">{stats.totalPatients}</span>
                      </div>
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-gray-600">Completed Bookings</span>
                        <span className="font-bold text-gray-900">{stats.completedBookings}</span>
                      </div>
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-gray-600">Pending Bookings</span>
                        <span className="font-bold text-yellow-600">{stats.pendingBookings}</span>
                      </div>
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-gray-600">Total Revenue</span>
                        <span className="font-bold text-green-600">{formatCurrency(stats.monthlyRevenue)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Average Rating</span>
                        <span className="font-bold text-purple-600">
                          {doctor.rating ? doctor.rating.toFixed(1) : 'No ratings yet'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Practice Profile</DialogTitle>
            <DialogDescription>
              Update your practice information. Changes will be visible to patients.
              {doctor.verificationStatus !== 'verified' && (
                <span className="block text-yellow-600 mt-1">
                  ⚠️ Your profile is currently under review. You can still edit your information.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditProfile}>
            <div className="space-y-4 py-4">
              {/* Personal Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={editForm.firstName || ''}
                      onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={editForm.lastName || ''}
                      onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Practice Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Practice Information
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="practiceName">Practice Name</Label>
                    <Input
                      id="practiceName"
                      value={editForm.practiceName || ''}
                      onChange={(e) => setEditForm({...editForm, practiceName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="practiceAddress">Practice Address</Label>
                    <Input
                      id="practiceAddress"
                      value={editForm.practiceAddress || ''}
                      onChange={(e) => setEditForm({...editForm, practiceAddress: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="practicePhone">Practice Phone</Label>
                      <Input
                        id="practicePhone"
                        value={editForm.practicePhone || ''}
                        onChange={(e) => setEditForm({...editForm, practicePhone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="practiceEmail">Practice Email</Label>
                      <Input
                        id="practiceEmail"
                        value={editForm.practiceEmail || ''}
                        onChange={(e) => setEditForm({...editForm, practiceEmail: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  Professional Information
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="specialization">Specialization</Label>
                    <Input
                      id="specialization"
                      value={editForm.specialization || ''}
                      onChange={(e) => setEditForm({...editForm, specialization: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hpcsaNumber">HPCSA Number</Label>
                    <Input
                      id="hpcsaNumber"
                      value={editForm.hpcsaNumber || ''}
                      onChange={(e) => setEditForm({...editForm, hpcsaNumber: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experience">Experience</Label>
                    <Input
                      id="experience"
                      value={editForm.experience || ''}
                      onChange={(e) => setEditForm({...editForm, experience: e.target.value})}
                      placeholder="e.g., 5 years in private practice"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={editForm.bio || ''}
                      onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                      placeholder="Tell patients about yourself..."
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              {/* Consultation Settings */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  Consultation Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="consultationFee">Consultation Fee (R)</Label>
                    <Input
                      id="consultationFee"
                      type="number"
                      value={editForm.consultationFee || ''}
                      onChange={(e) => setEditForm({...editForm, consultationFee: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consultationDuration">Consultation Duration (minutes)</Label>
                    <Input
                      id="consultationDuration"
                      type="number"
                      value={editForm.consultationDuration || 30}
                      onChange={(e) => setEditForm({...editForm, consultationDuration: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editing} className="bg-blue-600 hover:bg-blue-700">
                {editing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DoctorDashboard;