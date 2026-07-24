// BookAppointment.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, CreditCard, MapPin, Shield, Star, User, Loader2, ArrowLeft, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useBookingSocket } from '@/hooks/useBookingSocket';
import { format, startOfWeek, addDays, isSameDay, isPast, parseISO, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

// ==================== TYPES ====================

interface Doctor {
  id: string;
  uid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  specialization: string;
  practiceName: string;
  practiceAddress: string;
  city: string;
  province: string;
  consultationFee: number;
  consultationDuration: number;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  rating: number;
  reviewCount: number;
  yearsExperience: number;
  profileImage?: string;
  bio?: string;
  isAvailable: boolean;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

// ==================== MAIN COMPONENT ====================

const BookAppointment = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // State
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [patientNotes, setPatientNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Socket for real-time booking
  const { getSlots, createBooking, isConnected } = useBookingSocket({
    onBookingCreated: () => {
      toast({
        title: 'Booking Created!',
        description: 'Your appointment has been booked successfully.',
      });
      navigate('/bookings');
    },
  });

  // ==================== GENERATE DEFAULT SLOTS ====================

  const generateDefaultSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 8;
    const endHour = 17;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        slots.push({ time: timeStr, available: true });
      }
    }
    return slots;
  };

  // ==================== FETCH SLOTS ====================

  const fetchSlots = useCallback(async (doctorId: string, date: string) => {
    if (!doctorId || !date) {
      setTimeSlots([]);
      return;
    }

    try {
      setLoadingSlots(true);
      console.log('🔍 Fetching slots for:', { doctorId, date });
      
      // Get slots from booking service
      const response = await getSlots({ doctorId, date });
      console.log('📡 Slots response:', response);
      
      let slots: TimeSlot[] = [];
      
      if (response.success && response.slots && response.slots.length > 0) {
        // Use slots from booking service
        slots = response.slots
          .filter((slot: any) => slot.isAvailable)
          .map((slot: any) => ({
            time: slot.startTime,
            available: true
          }));
        console.log('✅ Got slots from service:', slots.length);
      } else {
        // Fallback: generate default slots
        slots = generateDefaultSlots();
        console.log('🔄 Using default slots:', slots.length);
      }

      // If no slots available, show message
      if (slots.length === 0) {
        console.log('⚠️ No slots available for this date');
      }

      setTimeSlots(slots);
      setSelectedTime(''); // Reset selected time when date changes
      
    } catch (err) {
      console.error('❌ Error fetching slots:', err);
      // Fallback to default slots
      const defaultSlots = generateDefaultSlots();
      setTimeSlots(defaultSlots);
      toast({
        title: 'Notice',
        description: 'Using default availability slots. Please refresh if you see issues.',
        variant: 'default',
      });
    } finally {
      setLoadingSlots(false);
    }
  }, [getSlots, toast]);

  // ==================== FETCH DOCTOR ====================

  useEffect(() => {
    const fetchDoctor = async () => {
      if (!doctorId) {
        toast({ title: 'Error', description: 'No doctor ID provided', variant: 'destructive' });
        navigate('/search');
        return;
      }

      try {
        setIsLoading(true);
        
        // Get doctor data from Firestore
        const doctorRef = doc(db, 'doctors', doctorId);
        const doctorSnap = await getDoc(doctorRef);

        if (!doctorSnap.exists()) {
          toast({ title: 'Error', description: 'Doctor not found', variant: 'destructive' });
          navigate('/search');
          return;
        }

        const data = doctorSnap.data();

        // Get user data
        const userRef = doc(db, 'users', doctorId);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};

        const doctorData: Doctor = {
          id: doctorId,
          uid: doctorId,
          firstName: userData.firstName || data.firstName || '',
          lastName: userData.lastName || data.lastName || '',
          fullName: userData.fullName || data.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Doctor',
          email: userData.email || data.email || '',
          specialization: data.specialization || '',
          practiceName: data.practiceName || '',
          practiceAddress: data.practiceAddress || '',
          city: data.city || '',
          province: data.province || '',
          consultationFee: data.consultationFee || 0,
          consultationDuration: data.consultationDuration || 30,
          verificationStatus: data.verificationStatus || 'pending',
          rating: data.rating || 0,
          reviewCount: data.reviewCount || 0,
          yearsExperience: data.yearsExperience || 0,
          profileImage: data.profileImage || userData.photoURL || '',
          bio: data.bio || '',
          isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
        };

        setDoctor(doctorData);

        // Auto-select today's date
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
        
        // Fetch slots for today
        await fetchSlots(doctorId, today);

      } catch (err: any) {
        console.error('Error fetching doctor:', err);
        toast({ 
          title: 'Error', 
          description: err.message || 'Failed to load doctor', 
          variant: 'destructive' 
        });
        navigate('/search');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDoctor();
  }, [doctorId, fetchSlots, navigate, toast]);

  // ==================== DATE CHANGE HANDLER ====================

  const handleDateChange = (date: string) => {
    console.log('📅 Date changed to:', date);
    setSelectedDate(date);
    if (doctor) {
      fetchSlots(doctor.id, date);
    }
  };

  // ==================== BOOKING HANDLER ====================

  const handleBooking = async () => {
    if (!user || !profile) {
      toast({
        title: 'Please Sign In',
        description: 'You need to be signed in to book an appointment.',
        variant: 'destructive',
      });
      navigate('/signin');
      return;
    }

    if (!doctor || !selectedDate || !selectedTime) {
      toast({
        title: 'Missing Information',
        description: 'Please select a date and time.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsBooking(true);

      const bookingData = {
        doctorId: doctor.id,
        patientId: user.uid,
        patientName: profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Patient',
        patientEmail: profile.email || user.email || '',
        patientPhone: profile.phone || '',
        doctorName: doctor.fullName,
        doctorSpecialization: doctor.specialization,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
        endTime: calculateEndTime(selectedTime, doctor.consultationDuration || 30),
        notes: patientNotes || undefined,
        consultationFee: doctor.consultationFee || 0,
      };

      console.log('📝 Creating booking:', bookingData);

      const response = await createBooking(bookingData);
      
      if (response.bookingId) {
        toast({
          title: 'Booking Requested',
          description: 'Your appointment request has been sent to the doctor.',
        });
        navigate('/bookings');
      } else {
        toast({
          title: 'Booking Failed',
          description: response.error || 'Could not book appointment. Please try again.',
          variant: 'destructive',
        });
        setIsBooking(false);
      }
    } catch (err: any) {
      console.error('Booking error:', err);
      toast({
        title: 'Booking Failed',
        description: err.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
      setIsBooking(false);
    }
  };

  // ==================== HELPER FUNCTIONS ====================

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string) => {
    if (!name) return 'D';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // ==================== RENDER WEEK DAYS ====================

  const renderWeekDays = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const days = [];

    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i);
      const dateStr = day.toISOString().split('T')[0];
      const isTodayDate = isToday(day);
      const isSelected = selectedDate === dateStr;
      const isPastDay = isPast(day) && !isTodayDate;

      days.push(
        <button
          key={i}
          onClick={() => !isPastDay && handleDateChange(dateStr)}
          disabled={isPastDay}
          className={cn(
            'flex-1 p-3 rounded-lg text-center transition-all',
            isPastDay ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer',
            isSelected 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'bg-white border border-gray-200',
            isTodayDate && !isSelected && 'border-blue-300 border-2'
          )}
        >
          <p className={cn(
            'text-xs font-medium',
            isSelected ? 'text-white' : 'text-gray-500'
          )}>
            {format(day, 'EEE')}
          </p>
          <p className={cn(
            'text-lg font-bold',
            isSelected ? 'text-white' : 'text-gray-900'
          )}>
            {format(day, 'd')}
          </p>
        </button>
      );
    }

    return days;
  };

  // ==================== NAVIGATION ====================

  const goToPreviousWeek = () => {
    setCurrentWeek(prev => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => addDays(prev, 7));
  };

  // ==================== LOADING STATE ====================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <p className="text-gray-600">Loading doctor details...</p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== NOT FOUND ====================

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="text-red-600 text-lg mb-2">⚠️ Doctor Not Found</div>
          <p className="text-gray-600 mb-4">The doctor you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/search')} className="bg-blue-600 hover:bg-blue-700">
            Browse Doctors
          </Button>
        </div>
      </div>
    );
  }

  // ==================== MAIN RENDER ====================

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/search')} 
          className="mb-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Search
        </Button>

        <h1 className="text-4xl font-bold text-medical-gradient mb-2">Book Appointment</h1>
        <p className="text-muted-foreground mb-8">Schedule your consultation with verified healthcare professionals</p>

        {/* Connection Status */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
          )} />
          <span className="text-gray-600">
            {isConnected ? 'Connected to booking service' : 'Connecting to booking service...'}
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Doctor Info */}
          <div className="lg:col-span-1">
            <Card className="medical-hero-card sticky top-4">
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-400 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  {getInitials(doctor.fullName)}
                </div>
                <h3 className="text-xl font-bold mb-1">
                  Dr. {doctor.fullName}
                  {doctor.verificationStatus === 'verified' && (
                    <Shield className="h-5 w-5 text-green-600 inline ml-1" />
                  )}
                </h3>
                <p className="text-blue-600 font-semibold mb-1">{doctor.specialization}</p>
                <p className="text-sm text-muted-foreground">{doctor.practiceName}</p>
                
                <Separator className="my-4" />
                
                <div className="space-y-2 text-sm text-left">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{[doctor.city, doctor.province].filter(Boolean).join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                    <span>{Number(doctor.rating || 0).toFixed(1)} ({doctor.reviewCount || 0} reviews)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{formatCurrency(doctor.consultationFee)} <span className="text-xs text-muted-foreground ml-1">Consultation fee</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{doctor.consultationDuration || 30} minute consultation</span>
                  </div>
                </div>

                {doctor.bio && (
                  <>
                    <Separator className="my-4" />
                    <p className="text-sm text-muted-foreground text-left">{doctor.bio}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-2">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Schedule Your Appointment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* User Info */}
                {!user && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-800">
                    Please <Button variant="link" className="p-0 h-auto text-amber-800 underline" onClick={() => navigate('/signin')}>sign in</Button> to book an appointment.
                  </div>
                )}

                {user && profile && (
                  <>
                    <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                      <div>
                        <Label className="text-xs text-muted-foreground">Name</Label>
                        <p className="font-medium">{profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <p className="font-medium">{profile.email}</p>
                      </div>
                    </div>

                    {/* Date Selection */}
                    <div>
                      <Label className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4" />
                        Select Date
                      </Label>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                            ←
                          </Button>
                          <Button variant="outline" size="sm" onClick={goToNextWeek}>
                            →
                          </Button>
                        </div>
                        <span className="text-sm text-gray-500">
                          {format(currentWeek, 'MMMM yyyy')}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {renderWeekDays()}
                      </div>
                    </div>

                    {/* Time Slots */}
                    <div>
                      <Label className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4" />
                        {selectedDate 
                          ? `Available Times for ${format(parseISO(selectedDate), 'MMM d, yyyy')}`
                          : 'Select a date first'
                        }
                      </Label>
                      {loadingSlots ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                          <span className="ml-2 text-gray-600">Loading available slots...</span>
                        </div>
                      ) : timeSlots.length > 0 ? (
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                          {timeSlots.map((slot) => (
                            <Button
                              key={slot.time}
                              variant={selectedTime === slot.time ? 'default' : 'outline'}
                              disabled={!slot.available}
                              onClick={() => setSelectedTime(slot.time)}
                              className={cn(
                                'h-12',
                                selectedTime === slot.time 
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                  : slot.available 
                                    ? 'hover:bg-gray-50' 
                                    : 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              {slot.time}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg">
                          {selectedDate ? 'No available slots for this date. Please select another date.' : 'Please select a date first.'}
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <Label htmlFor="notes" className="mb-2 block">
                        Additional Notes (Optional)
                      </Label>
                      <Textarea
                        id="notes"
                        value={patientNotes}
                        onChange={(e) => setPatientNotes(e.target.value)}
                        rows={4}
                        placeholder="Describe your symptoms or reason for consultation..."
                        className="resize-none"
                      />
                    </div>

                    {/* Booking Summary */}
                    {selectedDate && selectedTime && (
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-3 text-blue-900">Booking Summary</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-blue-700">Doctor</span>
                              <span className="font-medium text-blue-900">Dr. {doctor.fullName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-700">Date</span>
                              <span className="font-medium text-blue-900">{format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-700">Time</span>
                              <span className="font-medium text-blue-900">{selectedTime}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-700">Consultation Fee</span>
                              <span className="font-medium text-blue-900">{formatCurrency(doctor.consultationFee)}</span>
                            </div>
                            <Separator className="bg-blue-200" />
                            <div className="flex justify-between font-semibold">
                              <span className="text-blue-900">Total</span>
                              <span className="text-blue-900">{formatCurrency(doctor.consultationFee)}</span>
                            </div>
                            <p className="text-xs text-blue-600 mt-1">* Payment will be made at the doctor's office</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Book Button */}
                    <Button
                      onClick={handleBooking}
                      disabled={!user || !selectedDate || !selectedTime || isBooking || !isConnected}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg"
                    >
                      {isBooking ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : !isConnected ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Calendar className="w-5 h-5 mr-2" />
                          Confirm Booking
                        </>
                      )}
                    </Button>

                    {!isConnected && (
                      <p className="text-xs text-yellow-600 text-center mt-2">
                        ⚠️ Connecting to booking service... Please wait.
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;