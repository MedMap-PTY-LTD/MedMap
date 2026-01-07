import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, CreditCard, MapPin, Shield, Star, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DoctorsRepo } from '@/backend/repositories/doctors';
import { BookingsRepo } from '@/backend/repositories/bookings';
import { PaymentsRepo } from '@/backend/repositories/payments';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { formatCurrency } from '@/lib/utils';

interface Doctor {
  id: string;
  user_id: string;
  practice_name: string;
  speciality: string;
  consultation_fee: number;
  address: string;
  city: string;
  province: string;
  bio: string;
  rating: number;
  total_bookings: number;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const BookAppointment = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [patientNotes, setPatientNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'medical_aid' | 'cash' | 'card'>('cash');
  const [medicalAid, setMedicalAid] = useState<string | null>(null);
  const [otherMedicalAid, setOtherMedicalAid] = useState<string>('');
  const [isBooking, setIsBooking] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    if (doctorId) fetchDoctor();
  }, [doctorId]);

  useEffect(() => {
    let isMounted = true;

    const loadAvailability = async () => {
      if (!doctorId || !selectedDate) {
        if (isMounted) setTimeSlots([]);
        return;
      }
      try {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay();

        const schedules = await DoctorsRepo.getSchedules(doctorId);
        const daySchedules = schedules.filter((s: any) => s.day_of_week === dayOfWeek && s.is_available);

        const takenSlots = await BookingsRepo.getTakenSlots(doctorId, selectedDate);
        const takenTimes = new Set(takenSlots);

        const slots: TimeSlot[] = [];
        (daySchedules || []).forEach((s: any) => {
          const start = s.start_time as string;
          const end = s.end_time as string;
          const toMinutes = (t: string) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
          };
          const toHHMM = (mins: number) => {
            const h = Math.floor(mins / 60).toString().padStart(2, '0');
            const m = (mins % 60).toString().padStart(2, '0');
            return `${h}:${m}`;
          };
          for (let m = toMinutes(start); m < toMinutes(end); m += 30) {
            const t = toHHMM(m);
            const isTaken = Array.from(takenTimes).some(taken => {
              const takenStr = String(taken);
              return takenStr.startsWith(t) || t.startsWith(takenStr.slice(0, 5));
            });
            slots.push({ time: t, available: !isTaken });
          }
        });

        const unique = new Map<string, TimeSlot>();
        slots.sort((a,b) => a.time.localeCompare(b.time)).forEach(s => unique.set(s.time, s));
        if (isMounted) setTimeSlots(Array.from(unique.values()));
      } catch (err) {
        console.error('Failed to load availability', err);
        if (isMounted) setTimeSlots([]);
      }
    };

    loadAvailability();
    const interval = setInterval(loadAvailability, 5000);

    return () => { isMounted = false; clearInterval(interval); };
  }, [doctorId, selectedDate]);

  const fetchDoctor = async () => {
    try {
      const doctorData = await DoctorsRepo.getById(doctorId!);
      if (!doctorData) throw new Error('Doctor not found');
      const enriched = { ...doctorData, profiles: { first_name: doctorData.first_name, last_name: doctorData.last_name } };
      setDoctor(enriched as any);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load doctor information", variant: "destructive" });
      navigate('/search');
    } finally {
      setIsLoading(false);
    }
  };

  const getMinDate = () => new Date().toISOString().split('T')[0];
  const getMaxDate = () => {
    const maxDate = new Date(); maxDate.setMonth(maxDate.getMonth() + 3);
    return maxDate.toISOString().split('T')[0];
  };

  const handleBooking = async () => {
    if (!user || !doctor || !selectedDate || !selectedTime) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setIsBooking(true);
    try {
      const medicalAidNote = paymentMethod === 'medical_aid' ? `Medical Aid: ${medicalAid === 'other' ? otherMedicalAid || 'Other' : medicalAid || 'Not specified'}` : '';
      const notes = `${patientNotes || ''}\nPayment method: ${paymentMethod.replace('_', ' ')}${medicalAidNote ? `\n${medicalAidNote}` : ''}`;

      const booking = await BookingsRepo.create({
        doctor: parseInt(doctor.id),
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        notes: notes,
        status: 'pending',
      });

      // Initiate Paystack payment for booking fee (R10)
      const bookingFeeNaira = 10; // R10
      const amountKobo = bookingFeeNaira * 100; // Paystack uses kobo
      await PaymentsRepo.initiatePaystackBookingPayment(booking.id, amountKobo, user.email!);

      toast({ title: "Success", description: "Booking created! Redirecting to Paystack..." });
    } catch (e: any) {
      console.error('Booking error:', e);
      toast({ title: "Error", description: e.message || "Failed to create booking", variant: "destructive" });
      setIsBooking(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Loading...</h2>
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
      </div>
    </div>
  );

  if (!doctor) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Doctor not found</h2>
        <Button onClick={() => navigate('/search')} className="btn-medical-primary">Back to Search</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Button variant="outline" onClick={() => navigate('/search')} className="mb-4">← Back to Search</Button>
          <h1 className="text-4xl font-bold text-medical-gradient mb-2">Book Appointment</h1>
          <p className="text-muted-foreground">Schedule your consultation with verified healthcare professionals</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Doctor Info */}
          <div className="lg:col-span-1">
            <Card className="medical-hero-card sticky top-4">
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-soft rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  {doctor.profiles?.first_name?.[0]}{doctor.profiles?.last_name?.[0]}
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="text-xl font-bold">Dr. {doctor.profiles?.first_name} {doctor.profiles?.last_name}</h3>
                  <Shield className="h-5 w-5 text-success" />
                </div>
                <p className="text-primary font-semibold mb-1">{doctor.speciality}</p>
                <p className="text-sm text-muted-foreground">{doctor.practice_name}</p>
                <Separator className="my-4" />
                <div className="space-y-3">
                  <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{doctor.city}, {doctor.province}</span></div>
                  <div className="flex items-center gap-3"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /><span className="text-sm">{Number(doctor.rating || 0).toFixed(1)} ({doctor.total_bookings} reviews)</span></div>
                  <div className="flex items-center gap-3"><CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col"><span className="text-sm font-semibold text-primary">{formatCurrency(doctor.consultation_fee)}</span>
                    <span className="text-xs text-muted-foreground">Consultation fee paid at doctor</span></div>
                  </div>
                </div>
                {doctor.bio && <><Separator className="my-4" /><p className="text-sm text-muted-foreground">{doctor.bio}</p></>}
              </CardContent>
            </Card>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-2">
            <Card className="medical-hero-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Schedule Your Appointment</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {!user && <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6"><p className="text-amber-800 text-sm">Please sign in to book an appointment.</p></div>}
                
                {user && profile && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2"><User className="h-4 w-4" />Patient Information</h3>
                    <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                      <div><Label className="text-xs text-muted-foreground">Name</Label><p className="font-medium">{profile.first_name} {profile.last_name}</p></div>
                      <div><Label className="text-xs text-muted-foreground">Email</Label><p className="font-medium">{profile.email}</p></div>
                    </div>
                  </div>
                )}

                {/* Date */}
                <div><Label htmlFor="date" className="flex items-center gap-2 mb-2"><Calendar className="h-4 w-4" />Appointment Date</Label>
                  <Input id="date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} min={getMinDate()} max={getMaxDate()} className="h-12" />
                </div>

                {/* Time Slots */}
                <div>
                  <Label className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4" />Available Time Slots</Label>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {timeSlots.length > 0 ? timeSlots.map(slot => (
                      <Button key={slot.time} variant={selectedTime === slot.time ? "default" : "outline"} disabled={!slot.available} onClick={() => setSelectedTime(slot.time)} className={`h-12 ${selectedTime===slot.time?'btn-medical-primary':'btn-medical-secondary'}`}>{slot.time}</Button>
                    )) : selectedDate && <div className="col-span-full text-center py-8 text-muted-foreground bg-muted/20 rounded-lg">No available slots for this date.</div>}
                  </div>
                </div>

                <Button onClick={handleBooking} disabled={!user || !selectedDate || !selectedTime || isBooking} className="w-full btn-medical-primary h-12 text-lg">
                  {isBooking ? 'Processing…' : 'Confirm Booking'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;
