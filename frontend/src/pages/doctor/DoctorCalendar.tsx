// pages/doctor/DoctorCalendar.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Loader2,
  Settings,
  Save,
  Edit,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useBookingSocket } from '@/hooks/useBookingSocket';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Booking, BookingSlot } from '@/lib/firebase';

interface DoctorCalendarProps {
  doctorId: string;
  consultationDuration?: number;
}

export const DoctorCalendar: React.FC<DoctorCalendarProps> = ({ 
  doctorId, 
  consultationDuration = 30 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Socket connection
  const {
    isConnected,
    isConnecting,
    joinDoctorRoom,
    leaveDoctorRoom,
    getSlots,
    getUpcomingBookings,
    getStats,
    setAvailability,
    updateBookingStatus,
  } = useBookingSocket({
    onBookingCreated: () => {
      toast({
        title: 'New Booking Request',
        description: 'A patient has requested an appointment.',
      });
      refreshAll();
    },
    onBookingRescheduled: (data) => {
      toast({
        title: 'Booking Rescheduled',
        description: `Appointment rescheduled. ${data.rescheduleCount}/${data.maxReschedules} reschedules used.`,
      });
      refreshAll();
    },
    onBookingCancelled: (data) => {
      toast({
        title: 'Booking Cancelled',
        description: data.reason || 'A booking has been cancelled.',
        variant: 'destructive',
      });
      refreshAll();
    },
    onBookingUpdated: (data) => {
      toast({
        title: 'Booking Updated',
        description: `Booking status changed to ${data.status}`,
      });
      refreshAll();
    },
    onAvailabilityUpdated: () => {
      refreshSlots();
    },
  });

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<BookingSlot[]>([]);
  
  // Refresh functions
  const refreshSlots = useCallback(async () => {
    if (!selectedDate) return;
    
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await getSlots({ doctorId, date: dateStr });
      
      if (response.success && response.slots) {
        setSlots(response.slots);
      }
    } catch (error) {
      console.error('Error refreshing slots:', error);
    }
  }, [selectedDate, doctorId, getSlots]);

  const refreshBookings = useCallback(async () => {
    try {
      const response = await getUpcomingBookings({ doctorId });
      
      if (response.success && response.bookings) {
        setUpcomingBookings(response.bookings);
      }
    } catch (error) {
      console.error('Error refreshing bookings:', error);
    }
  }, [doctorId, getUpcomingBookings]);

  const refreshStats = useCallback(async () => {
    try {
      const response = await getStats({ doctorId });
      
      if (response.success && response.stats) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  }, [doctorId, getStats]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      refreshSlots(),
      refreshBookings(),
      refreshStats(),
    ]);
    setLoading(false);
  }, [refreshSlots, refreshBookings, refreshStats]);

  // Effects
  useEffect(() => {
    if (doctorId) {
      joinDoctorRoom(doctorId);
      refreshAll();
      
      return () => {
        leaveDoctorRoom(doctorId);
      };
    }
  }, [doctorId]);

  useEffect(() => {
    if (selectedDate) {
      refreshSlots();
    }
  }, [selectedDate, refreshSlots]);

  // Handlers
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleConfirmBooking = async (bookingId: string) => {
    try {
      const response = await updateBookingStatus({
        bookingId,
        status: 'confirmed',
      });
      
      if (response.success) {
        toast({
          title: 'Booking Confirmed',
          description: 'The appointment has been confirmed.',
        });
        refreshAll();
        setShowBookingDetails(false);
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to confirm booking.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to confirm booking.',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    try {
      const response = await updateBookingStatus({
        bookingId,
        status: 'completed',
      });
      
      if (response.success) {
        toast({
          title: 'Booking Completed',
          description: 'The appointment has been marked as completed.',
        });
        refreshAll();
        setShowBookingDetails(false);
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to complete booking.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete booking.',
        variant: 'destructive',
      });
    }
  };

  const handleNoShowBooking = async (bookingId: string) => {
    try {
      const response = await updateBookingStatus({
        bookingId,
        status: 'no-show',
      });
      
      if (response.success) {
        toast({
          title: 'No-Show Recorded',
          description: 'The patient has been marked as no-show.',
        });
        refreshAll();
        setShowBookingDetails(false);
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to mark as no-show.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark as no-show.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveAvailability = async () => {
    if (!selectedDate) return;
    
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await setAvailability({
        doctorId,
        date: dateStr,
        slots: editingAvailability,
      });
      
      if (response.success) {
        toast({
          title: 'Availability Updated',
          description: 'Your availability has been saved.',
        });
        setShowAvailabilityDialog(false);
        refreshSlots();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to update availability.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update availability.',
        variant: 'destructive',
      });
    }
  };

  const toggleSlotAvailability = (index: number) => {
    setEditingAvailability(prev => 
      prev.map((slot, i) => 
        i === index 
          ? { ...slot, isAvailable: !slot.isAvailable }
          : slot
      )
    );
  };

  // Render functions
  const renderWeek = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = [];

    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i);
      const isToday = isSameDay(day, new Date());
      const isSelected = selectedDate && isSameDay(day, selectedDate);
      const dateStr = format(day, 'yyyy-MM-dd');
      const daySlots = slots.filter(s => s.date === dateStr);
      const availableSlots = daySlots.filter(s => s.isAvailable);
      const dayBookings = upcomingBookings.filter(
        b => b.appointmentDate === dateStr && b.status !== 'cancelled'
      );
      const pendingDayBookings = dayBookings.filter(b => b.status === 'pending');

      weekDays.push(
        <div
          key={i}
          className={cn(
            'flex-1 min-w-[40px] p-2 rounded-lg cursor-pointer transition-all',
            isSelected ? 'bg-blue-50 border-2 border-blue-500' : 'hover:bg-gray-50',
            isToday && !isSelected ? 'border-2 border-blue-300' : 'border border-transparent'
          )}
          onClick={() => handleDateSelect(day)}
        >
          <div className="text-center">
            <p className={cn(
              'text-xs font-medium',
              isToday ? 'text-blue-600' : 'text-gray-500'
            )}>
              {format(day, 'EEE')}
            </p>
            <p className={cn(
              'text-lg font-bold',
              isToday ? 'text-blue-600' : 'text-gray-900'
            )}>
              {format(day, 'd')}
            </p>
            <div className="mt-1 flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-gray-500">
                {availableSlots.length} slots
              </span>
              {dayBookings.length > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5">
                  {dayBookings.length} booked
                </Badge>
              )}
              {pendingDayBookings.length > 0 && (
                <Badge className="text-[9px] px-1.5 py-0.5 bg-yellow-100 text-yellow-800">
                  {pendingDayBookings.length} pending
                </Badge>
              )}
            </div>
          </div>
        </div>
      );
    }

    return weekDays;
  };

  const renderSlots = () => {
    if (!selectedDate) {
      return (
        <div className="text-center py-8 text-gray-500">
          <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select a date to view available slots</p>
        </div>
      );
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const daySlots = slots.filter(s => s.date === dateStr);

    if (daySlots.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No slots available for this day</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => {
              setEditingAvailability(slots);
              setShowAvailabilityDialog(true);
            }}
          >
            <Settings className="w-4 h-4 mr-2" />
            Manage Availability
          </Button>
        </div>
      );
    }

    // Group slots by time
    const groupedSlots = daySlots.reduce((acc, slot) => {
      const timeStr = slot.startTime;
      if (!acc[timeStr]) {
        acc[timeStr] = slot;
      }
      return acc;
    }, {} as Record<string, BookingSlot>);

    const slotEntries = Object.values(groupedSlots);

    return (
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {slotEntries.map((slot) => {
          const booking = upcomingBookings.find(
            b => b.appointmentDate === dateStr && b.appointmentTime === slot.startTime
          );
          const isBooked = !!booking && booking.status !== 'cancelled';

          return (
            <div
              key={`${slot.date}-${slot.startTime}`}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border transition-all',
                isBooked 
                  ? 'bg-gray-50 border-gray-200' 
                  : slot.isAvailable 
                    ? 'bg-green-50 border-green-200 hover:bg-green-100'
                    : 'bg-red-50 border-red-200 cursor-not-allowed'
              )}
            >
              <div className="flex items-center gap-3">
                <Clock className={cn(
                  'w-4 h-4',
                  isBooked ? 'text-gray-400' : slot.isAvailable ? 'text-green-600' : 'text-red-400'
                )} />
                <div>
                  <p className="font-medium text-sm">
                    {slot.startTime} - {slot.endTime}
                  </p>
                  {isBooked && booking && (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-600">
                        {booking.patientName}
                      </p>
                      <Badge className={cn(
                        'text-[9px] px-1.5 py-0.5',
                        booking.status === 'pending' && 'bg-yellow-100 text-yellow-800',
                        booking.status === 'confirmed' && 'bg-blue-100 text-blue-800',
                        booking.status === 'rescheduled' && 'bg-purple-100 text-purple-800',
                        booking.status === 'completed' && 'bg-green-100 text-green-800',
                        booking.status === 'no-show' && 'bg-gray-100 text-gray-800',
                      )}>
                        {booking.status}
                      </Badge>
                    </div>
                  )}
                  {!isBooked && slot.isAvailable && (
                    <p className="text-xs text-green-600">Available</p>
                  )}
                  {!isBooked && !slot.isAvailable && (
                    <p className="text-xs text-red-400">Unavailable</p>
                  )}
                </div>
              </div>
              {isBooked && booking && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedBooking(booking);
                    setShowBookingDetails(true);
                  }}
                >
                  View Details
                </Button>
              )}
            </div>
          );
        })}

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-2"
          onClick={() => {
            setEditingAvailability(daySlots);
            setShowAvailabilityDialog(true);
          }}
        >
          <Settings className="w-4 h-4 mr-2" />
          Manage Availability
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500' : 'bg-red-500'
          )} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected to booking service' : isConnecting ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={refreshAll}
          disabled={loading}
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold text-gray-900">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-lg font-bold text-yellow-600">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Confirmed</p>
              <p className="text-lg font-bold text-blue-600">{stats.confirmed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Completed</p>
              <p className="text-lg font-bold text-green-600">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Cancelled</p>
              <p className="text-lg font-bold text-red-600">{stats.cancelled}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Revenue</p>
              <p className="text-lg font-bold text-purple-600">
                R{stats.revenue.toFixed(0)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {format(currentDate, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(prev => addDays(prev, -7))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(prev => addDays(prev, 7))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 mb-4">
            {renderWeek()}
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            renderSlots()
          )}
        </CardContent>
      </Card>

      {/* Booking Details Dialog */}
      {selectedBooking && (
        <Dialog open={showBookingDetails} onOpenChange={setShowBookingDetails}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
              <DialogDescription>
                Appointment with {selectedBooking.patientName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Patient</p>
                  <p className="font-medium">{selectedBooking.patientName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="font-medium text-sm truncate">{selectedBooking.patientEmail}</p>
                </div>
                <div>
                  <p className="text-gray-500">Date</p>
                  <p className="font-medium">{format(parseISO(selectedBooking.appointmentDate), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-gray-500">Time</p>
                  <p className="font-medium">{selectedBooking.appointmentTime}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <Badge className={cn(
                    selectedBooking.status === 'pending' && 'bg-yellow-100 text-yellow-800',
                    selectedBooking.status === 'confirmed' && 'bg-blue-100 text-blue-800',
                    selectedBooking.status === 'rescheduled' && 'bg-purple-100 text-purple-800',
                    selectedBooking.status === 'completed' && 'bg-green-100 text-green-800',
                    selectedBooking.status === 'cancelled' && 'bg-red-100 text-red-800',
                    selectedBooking.status === 'no-show' && 'bg-gray-100 text-gray-800',
                  )}>
                    {selectedBooking.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-gray-500">Reschedules</p>
                  <p className="font-medium">{selectedBooking.rescheduleCount}/{selectedBooking.maxReschedules}</p>
                </div>
              </div>

              {selectedBooking.notes && (
                <div>
                  <p className="text-gray-500 text-sm">Notes</p>
                  <p className="text-sm">{selectedBooking.notes}</p>
                </div>
              )}

              {selectedBooking.rescheduleHistory.length > 0 && (
                <div>
                  <p className="text-gray-500 text-sm">Reschedule History</p>
                  <div className="space-y-1 mt-1 max-h-32 overflow-y-auto">
                    {selectedBooking.rescheduleHistory.map((history, idx) => (
                      <div key={idx} className="text-xs text-gray-600 border-l-2 border-gray-200 pl-2">
                        {history.fromDate} {history.fromTime} → {history.toDate} {history.toTime}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                {selectedBooking.status === 'pending' && (
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleConfirmBooking(selectedBooking.id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm
                  </Button>
                )}
                {(selectedBooking.status === 'confirmed' || selectedBooking.status === 'rescheduled') && (
                  <>
                    <Button 
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleCompleteBooking(selectedBooking.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1 text-red-600 hover:text-red-700 border-red-200"
                      onClick={() => handleNoShowBooking(selectedBooking.id)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      No-Show
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Manage Availability Dialog */}
      <Dialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Availability</DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Toggle slots to mark them as available or unavailable.
            </p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {editingAvailability.map((slot, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{slot.startTime} - {slot.endTime}</p>
                    <p className="text-xs text-gray-500">
                      {slot.isAvailable ? 'Available' : 'Unavailable'}
                    </p>
                  </div>
                  <Switch
                    checked={slot.isAvailable}
                    onCheckedChange={() => toggleSlotAvailability(index)}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAvailabilityDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSaveAvailability}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Availability
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};