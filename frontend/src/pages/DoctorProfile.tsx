// pages/DoctorProfile.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Star,
  MapPin,
  Phone,
  Mail,
  Clock,
  Calendar,
  DollarSign,
  Award,
  Stethoscope,
  Building2,
  Users,
  Heart,
  Shield,
  AlertCircle,
  Loader2,
  CheckCircle,
  MessageCircle,
  Video,
  ExternalLink
} from 'lucide-react';

interface DoctorProfileData {
  uid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  specialization: string;
  hpcsaNumber?: string;
  practiceName?: string;
  practiceAddress?: string;
  practicePhone?: string;
  practiceEmail?: string;
  consultationFee?: number;
  consultationDuration?: number;
  bio?: string;
  experience?: string;
  qualifications?: string[];
  operatingHours?: {
    monday?: { isOpen: boolean; start: string; end: string };
    tuesday?: { isOpen: boolean; start: string; end: string };
    wednesday?: { isOpen: boolean; start: string; end: string };
    thursday?: { isOpen: boolean; start: string; end: string };
    friday?: { isOpen: boolean; start: string; end: string };
    saturday?: { isOpen: boolean; start: string; end: string };
    sunday?: { isOpen: boolean; start: string; end: string };
  };
  verificationStatus: 'pending' | 'verified' | 'rejected';
  rating?: number;
  reviewCount?: number;
  profileImage?: string;
  createdAt?: any;
  updatedAt?: any;
}

const DoctorProfile = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [doctor, setDoctor] = useState<DoctorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBooked, setIsBooked] = useState(false);

  useEffect(() => {
    if (doctorId) {
      fetchDoctorProfile();
    }
  }, [doctorId]);

  const fetchDoctorProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      // First, get the doctor's data from the doctors collection
      const doctorRef = doc(db, 'doctors', doctorId!);
      const doctorSnap = await getDoc(doctorRef);

      if (!doctorSnap.exists()) {
        setError('Doctor not found');
        setLoading(false);
        return;
      }

      const doctorData = doctorSnap.data();

      // Get the user profile data
      const userRef = doc(db, 'users', doctorId!);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      // Combine the data
      const combinedData: DoctorProfileData = {
        uid: doctorId!,
        firstName: userData.firstName || doctorData.firstName || '',
        lastName: userData.lastName || doctorData.lastName || '',
        fullName: userData.fullName || doctorData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        email: userData.email || doctorData.email || '',
        phone: userData.phone || doctorData.phone || '',
        specialization: doctorData.specialization || '',
        hpcsaNumber: doctorData.hpcsaNumber || '',
        practiceName: doctorData.practiceName || '',
        practiceAddress: doctorData.practiceAddress || '',
        practicePhone: doctorData.practicePhone || '',
        practiceEmail: doctorData.practiceEmail || '',
        consultationFee: doctorData.consultationFee || 0,
        consultationDuration: doctorData.consultationDuration || 30,
        bio: doctorData.bio || '',
        experience: doctorData.experience || '',
        qualifications: doctorData.qualifications || [],
        operatingHours: doctorData.operatingHours || {},
        verificationStatus: doctorData.verificationStatus || 'pending',
        rating: doctorData.rating || 0,
        reviewCount: doctorData.reviewCount || 0,
        profileImage: doctorData.profileImage || userData.photoURL || '',
        createdAt: doctorData.createdAt || userData.createdAt,
        updatedAt: doctorData.updatedAt || userData.updatedAt,
      };

      setDoctor(combinedData);

      // Check if current user has booked this doctor
      if (user) {
        const bookingsRef = collection(db, 'bookings');
        const q = query(
          bookingsRef,
          where('doctorId', '==', doctorId),
          where('patientId', '==', user.uid),
          where('status', 'in', ['pending', 'confirmed'])
        );
        const bookingsSnap = await getDocs(q);
        setIsBooked(!bookingsSnap.empty);
      }
    } catch (err: any) {
      console.error('Error fetching doctor profile:', err);
      setError(err.message || 'Failed to load doctor profile');
      toast({
        title: 'Error',
        description: 'Failed to load doctor profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const getDayName = (day: string) => {
    const days: Record<string, string> = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
    };
    return days[day] || day;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading doctor profile...</p>
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Doctor Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'The doctor you are looking for does not exist.'}</p>
            <Button asChild>
              <Link to="/search">Find Another Doctor</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 h-32 sm:h-48"></div>
          <div className="px-4 sm:px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end -mt-16 sm:-mt-12 gap-4">
              <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white shadow-lg">
                <AvatarImage src={doctor.profileImage || undefined} />
                <AvatarFallback className="bg-blue-100 text-blue-800 text-2xl sm:text-4xl font-bold">
                  {getInitials(doctor.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                      Dr. {doctor.fullName}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge className="bg-blue-100 text-blue-800">
                        <Stethoscope className="w-3 h-3 mr-1" />
                        {doctor.specialization}
                      </Badge>
                      <Badge className={getStatusBadge(doctor.verificationStatus)}>
                        {doctor.verificationStatus === 'verified' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : null}
                        {doctor.verificationStatus.charAt(0).toUpperCase() + doctor.verificationStatus.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      <span className="ml-1 text-lg font-semibold text-gray-900">
                        {doctor.rating?.toFixed(1) || 'New'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      ({doctor.reviewCount || 0} reviews)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About Dr. {doctor.fullName}</CardTitle>
              </CardHeader>
              <CardContent>
                {doctor.bio ? (
                  <p className="text-gray-700 whitespace-pre-wrap">{doctor.bio}</p>
                ) : (
                  <p className="text-gray-500">No bio provided yet.</p>
                )}
                
                {doctor.experience && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-700">Experience</h4>
                    <p className="text-gray-600">{doctor.experience}</p>
                  </div>
                )}

                {doctor.qualifications && doctor.qualifications.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-700">Qualifications</h4>
                    <ul className="list-disc list-inside text-gray-600 mt-1">
                      {doctor.qualifications.map((qual, index) => (
                        <li key={index}>{qual}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {doctor.hpcsaNumber && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-700">HPCSA Number</h4>
                    <p className="text-gray-600">{doctor.hpcsaNumber}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Operating Hours */}
            {doctor.operatingHours && Object.keys(doctor.operatingHours).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Operating Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                      const hours = doctor.operatingHours?.[day as keyof typeof doctor.operatingHours];
                      if (!hours) return null;
                      return (
                        <div key={day} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                          <span className="font-medium text-gray-700">{getDayName(day)}</span>
                          {hours.isOpen ? (
                            <span className="text-gray-600">
                              {hours.start} - {hours.end}
                            </span>
                          ) : (
                            <span className="text-gray-400">Closed</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Contact & Actions */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {doctor.practiceName && (
                  <div className="flex items-start gap-3">
                    <Building2 className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">{doctor.practiceName}</p>
                      {doctor.practiceAddress && (
                        <p className="text-sm text-gray-600">{doctor.practiceAddress}</p>
                      )}
                    </div>
                  </div>
                )}

                {doctor.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <a href={`tel:${doctor.phone}`} className="text-sm text-blue-600 hover:underline">
                      {doctor.phone}
                    </a>
                  </div>
                )}

                {doctor.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <a href={`mailto:${doctor.email}`} className="text-sm text-blue-600 hover:underline">
                      {doctor.email}
                    </a>
                  </div>
                )}

                {doctor.practicePhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <a href={`tel:${doctor.practicePhone}`} className="text-sm text-blue-600 hover:underline">
                      {doctor.practicePhone} (Practice)
                    </a>
                  </div>
                )}

                {doctor.practiceEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <a href={`mailto:${doctor.practiceEmail}`} className="text-sm text-blue-600 hover:underline">
                      {doctor.practiceEmail} (Practice)
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Consultation Fee */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Consultation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Fee</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatCurrency(doctor.consultationFee || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium text-gray-900">
                    {doctor.consultationDuration || 30} minutes
                  </span>
                </div>
                <Separator />
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link to={`/book/${doctor.uid}`}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Appointment
                  </Link>
                </Button>
                <Button variant="outline" className="w-full">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
                {doctor.verificationStatus === 'verified' && (
                  <Button variant="outline" className="w-full border-green-600 text-green-600 hover:bg-green-50">
                    <Video className="w-4 h-4 mr-2" />
                    Telemedicine
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{doctor.reviewCount || 0}</p>
                    <p className="text-xs text-gray-500">Reviews</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {doctor.rating ? doctor.rating.toFixed(1) : 'New'}
                    </p>
                    <p className="text-xs text-gray-500">Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Verification Badge */}
            {doctor.verificationStatus === 'verified' && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <Shield className="w-5 h-5" />
                    <span className="text-sm font-medium">Verified Healthcare Provider</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    This doctor's credentials have been verified by MedMap.
                  </p>
                </CardContent>
              </Card>
            )}

            {isBooked && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-blue-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">You have an appointment</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    You have a pending or confirmed appointment with this doctor.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;