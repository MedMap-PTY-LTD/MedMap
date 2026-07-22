// pages/patient/components/BookingForm.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useBookingSocket } from '@/hooks/useBookingSocket';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar, Clock, User, Stethoscope, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Doctor {
  id: string;
  fullName: string;
  email: string;
  specialization: string;
  practiceName: string;
  consultationFee: number;
  verificationStatus: string;
}

interface BookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBook: (doctorId: string, date: string, time: string, notes?: string) => void;
  selectedDoctor?: Doctor | null;
}

export const BookingForm: React.FC<BookingFormProps> = ({ 
  open, 
  onOpenChange, 
  onBook,
  selectedDoctor: initialDoctor 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getSlots, isConnected } = useBookingSocket();
  
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(initialDoctor || null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select-doctor' | 'select-slot' | 'confirm'>(
    initialDoctor ? 'select-slot' : 'select-doctor'
  );
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Fetch available doctors
  useEffect(() => {
    if (open && !initialDoctor) {
      fetchAvailableDoctors();
    }
  }, [open, initialDoctor]);

  // If initialDoctor is provided, set it and go to slot selection
  useEffect(() => {
    if (initialDoctor) {
      setSelectedDoctor(initialDoctor);
      setStep('select-slot');
      setSelectedDate(new Date());
      fetchSlots(initialDoctor.id, new Date());
    }
  }, [initialDoctor]);

  const fetchAvailableDoctors = async () => {
    setLoading(true);
    try {
      // Fetch from Firestore
      const { db } = await import('@/lib/firebase');
      const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore');
      
      const doctorsRef = collection(db, 'doctors');
      const q = query(doctorsRef, where('verificationStatus', '==', 'verified'));
      const snapshot = await getDocs(q);
      
      const doctorList: Doctor[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const userRef = doc(db, 'users', docSnap.id);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};
        
        doctorList.push({
          id: docSnap.id,
          fullName: userData.fullName || data.fullName || '',
          email: userData.email || data.email || '',
          specialization: data.specialization || '',
          practiceName: data.practiceName || '',
          consultationFee: data.consultationFee || 0,
          verificationStatus: data.verificationStatus || 'pending',
        });
      }
      
      setDoctors(doctorList);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available doctors.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async (doctorId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setLoading(true);
    try {
      const response = await getSlots({ doctorId, date: dateStr });
      
      if (response.success && response.slots) {
        const available = response.slots
          .filter(slot => slot.isAvailable)
          .map(slot => slot.startTime);
        setAvailableSlots(available);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setStep('select-slot');
    const today = new Date();
    setSelectedDate(today);
    fetchSlots(doctor.id, today);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    if (selectedDoctor) {
      fetchSlots(selectedDoctor.id, date);
    }
    setSelectedTime(null);
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    setStep('confirm');
  };

  const handleConfirmBooking = () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) {
      toast({
        title: 'Error',
        description: 'Please select a doctor, date, and time.',
        variant: 'destructive',
      });
      return;
    }

    onBook(
      selectedDoctor.id,
      format(selectedDate, 'yyyy-MM-dd'),
      selectedTime,
      notes || undefined
    );
  };

  const goToPreviousWeek = () => {
    setCurrentWeek(prev => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => addDays(prev, 7));
  };

  const renderWeekDays = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const days = [];

    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i);
      const isToday = isSameDay(day, new Date());
      const isSelected = selectedDate && isSameDay(day, selectedDate);
      const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

      days.push(
        <button
          key={i}
          onClick={() => !isPast && handleSelectDate(day)}
          disabled={isPast}
          className={cn(
            'flex-1 p-2 rounded-lg text-center transition-all',
            isPast ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100',
            isSelected 
              ? 'bg-blue-600 text-white' 
              : 'hover:bg-gray-100',
            isToday && !isSelected && 'border-2 border-blue-300'
          )}
        >
          <p className="text-xs font-medium">
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

  const handleClose = () => {
    setStep(initialDoctor ? 'select-slot' : 'select-doctor');
    setSelectedDoctor(initialDoctor || null);
    setSelectedDate(null);
    setSelectedTime(null);
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {step === 'select-doctor' && 'Book an Appointment'}
            {step === 'select-slot' && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-0 h-8 w-8"
                  onClick={() => setStep('select-doctor')}
                  disabled={!!initialDoctor}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                Select Date & Time
              </>
            )}
            {step === 'confirm' && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-0 h-8 w-8"
                  onClick={() => setStep('select-slot')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                Confirm Booking
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 'select-doctor' && 'Choose a doctor from our verified healthcare providers.'}
            {step === 'select-slot' && `Select an available date and time for your appointment with ${selectedDoctor?.fullName}.`}
            {step === 'confirm' && 'Review your booking details and confirm.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Select Doctor */}
        {step === 'select-doctor' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className={cn(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-green-500' : 'bg-red-500'
              )} />
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No doctors available at the moment.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {doctors.map((doctor) => (
                  <Card
                    key={doctor.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleSelectDoctor(doctor)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Stethoscope className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900">Dr. {doctor.fullName}</h4>
                        <p className="text-sm text-gray-600">{doctor.specialization}</p>
                        <p className="text-sm text-gray-500">{doctor.practiceName}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Verified
                          </Badge>
                          <span className="text-sm font-medium text-gray-900">
                            R{doctor.consultationFee}
                          </span>
                        </div>
                      </div>
                      <Button className="flex-shrink-0 bg-blue-600 hover:bg-blue-700">
                        Select
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Date & Time */}
        {step === 'select-slot' && selectedDoctor && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Dr. {selectedDoctor.fullName}</p>
                  <p className="text-xs text-gray-600">{selectedDoctor.specialization}</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">R{selectedDoctor.consultationFee}</Badge>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Select Date</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToNextWeek}>
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-1">
                {renderWeekDays()}
              </div>
            </div>

            {selectedDate && (
              <div>
                <p className="text-sm font-medium mb-2">
                  Available Times for {format(selectedDate, 'MMM d, yyyy')}
                </p>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No available slots for this date.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => handleSelectTime(time)}
                        className={cn(
                          'p-2 rounded-lg border text-sm transition-all',
                          selectedTime === time
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'hover:bg-gray-50 border-gray-200'
                        )}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Confirm Booking */}
        {step === 'confirm' && selectedDoctor && selectedDate && selectedTime && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium">Dr. {selectedDoctor.fullName}</p>
                  <p className="text-sm text-gray-600">{selectedDoctor.specialization}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                  <p className="text-sm text-gray-600">at {selectedTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium">30 minutes</p>
                  <p className="text-sm text-gray-600">Consultation duration</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 text-blue-600 font-bold">R</span>
                <div>
                  <p className="font-medium">R{selectedDoctor.consultationFee}</p>
                  <p className="text-sm text-gray-600">Consultation fee</p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests or information for the doctor..."
                rows={3}
                className="mt-1"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('select-slot')}>
                Back
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleConfirmBooking}
              >
                Confirm Booking
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};