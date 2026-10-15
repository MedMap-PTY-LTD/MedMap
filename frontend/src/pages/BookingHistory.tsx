import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, Phone, User, Eye, X, CheckCircle, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Header from '@/components/Header';
import { Booking as RepoBooking } from '@/backend/repositories/bookings';
import { cancelBookingRequest, retryBookingPayment, getPatientBookings } from '@/client/payfastClient';
import { useSearchParams } from 'react-router-dom';

// Map or extend RepoBooking to match local needs
interface Booking extends Omit<RepoBooking, 'id'> {
  id: string;
  is_test?: boolean;
  payment_status: string; // Not in repo interface yet?
  total_amount: number;
  consultation_fee: number;
  booking_fee: number;
  notes?: string;
  patient_notes?: string;
  doctor_notes?: string;
  // doctors mapped from doctor_details
  doctors?: {
    practice_name: string;
    speciality: string;
    city: string;
    province: string;
    profiles?: {
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
    } | null;
  } | null;
}

const BookingHistory = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      toast({
        title: "Checking payment status",
        description: "Check the latest booking fee status below.",
        className: "bg-green-500 text-white",
      });
    } else if (status === 'cancelled') {
      toast({
        title: "Payment Cancelled",
        description: "The payment process was cancelled.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      if (!user?.uid) {        // Firebase uses .uid, not .id
        setLoading(false);
        return;
      }

      // The authenticated service reads bookings; client Firestore rules deny this collection.
      const rows = await getPatientBookings(user.uid);
      const mapped = rows.map((b) => {
        return {
          id: b.id,
          is_test: b.isTestBooking === true,
          appointment_date: b.appointmentDate,
          appointment_time: b.appointmentTime,
          status: b.status,
          notes: b.notes || '',
          patient_notes: b.notes || '',
          doctor_notes: '',
          payment_status: b.paymentStatus || 'unpaid',
          consultation_fee: b.consultationFee || 0,
          booking_fee: b.bookingFee ?? 10,
          total_amount: b.bookingFee ?? 10,
          doctors: {
            practice_name: b.doctorName || 'Doctor',
            speciality: b.doctorSpecialization || '',
            city: '',
            province: '',
            profiles: {
              first_name: b.doctorName || null,
              last_name: null,
              phone: b.patientPhone || null,
            },
          },
        };
      }) as unknown as Booking[];

      setBookings(mapped);
    } catch (error: any) {
      console.error('❌ Failed to fetch bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch your bookings',
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

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEEE, MMMM d, yyyy');
  };

  const formatTime = (timeString: string) => {
    return format(new Date(`2000-01-01T${timeString}`), 'h:mm a');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-success text-success-foreground">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'completed':
        return <Badge className="bg-primary text-primary-foreground">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success text-success-foreground">Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filterBookings = (bookings: Booking[], filter: string) => {
    const now = new Date();
    
    switch (filter) {
      case 'upcoming':
        return bookings.filter(booking => 
          new Date(booking.appointment_date) >= now && 
          booking.status !== 'cancelled'
        );
      case 'past':
        return bookings.filter(booking => 
          new Date(booking.appointment_date) < now ||
          booking.status === 'completed'
        );
      case 'cancelled':
        return bookings.filter(booking => booking.status === 'cancelled');
      default:
        return bookings;
    }
  };

  const handlePayment = async (booking: Booking) => {
    try {
      await retryBookingPayment(booking.id);
    } catch (error: any) {
      toast({
        title: 'Payment Error',
        description: error.message || 'Failed to start payment',
        variant: 'destructive',
      });
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      await cancelBookingRequest(bookingId);

      toast({
        title: "Success",
        description: "Booking cancelled successfully",
      });

      fetchBookings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-medical-gradient mb-2">My Bookings</h1>
          <p className="text-muted-foreground">Manage your appointments and view booking history</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Bookings</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          {['all', 'upcoming', 'past', 'cancelled'].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <div className="space-y-4">
                {filterBookings(bookings, tab).length === 0 ? (
                  <Card className="medical-card">
                    <CardContent className="p-8 text-center">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
                      <p className="text-muted-foreground mb-4">
                        {tab === 'all' 
                          ? "You haven't made any bookings yet."
                          : `No ${tab} bookings to display.`
                        }
                      </p>
                      <Button className="btn-medical-primary" onClick={() => window.location.href = '/search'}>
                        Find Doctors
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  filterBookings(bookings, tab).map((booking) => (
                    <Card key={booking.id} className="medical-card">
                      <CardContent className="p-6">
                        {booking.is_test && <Badge variant="outline">Sandbox test — no real consultation</Badge>}
                        <div className="grid md:grid-cols-3 gap-6">
                          {/* Doctor Info */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                <User className="h-6 w-6 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">
                                  {booking.doctors?.practice_name || 'Practice'}
                                </h3>
                                <p className="text-primary text-sm">{booking.doctors?.speciality}</p>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{booking.doctors?.city}, {booking.doctors?.province}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>Not provided</span>
                              </div>
                            </div>
                          </div>

                          {/* Appointment Details */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-primary">Appointment Details</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{formatDate(booking.appointment_date)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>{formatTime(booking.appointment_time)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Status:</span>
                                {getStatusBadge(booking.status)}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Payment:</span>
                                {getPaymentStatusBadge(booking.payment_status)}
                              </div>
                            </div>
                            {booking.patient_notes && (
                              <div className="p-3 bg-muted/30 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1">Your Notes:</p>
                                <p className="text-sm">{booking.patient_notes}</p>
                              </div>
                            )}
                          </div>

                          {/* Actions & Payment */}
                          <div className="space-y-4">
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Booking Fee</p>
                              <p className="text-2xl font-bold text-primary">
                                {formatCurrency(booking.total_amount)}
                              </p>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div>Consultation: {formatCurrency(booking.consultation_fee)} (paid separately)</div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              {booking.status === 'pending' && booking.payment_status !== 'paid' && (
                                <Button
                                  className="w-full bg-green-600 hover:bg-green-700"
                                  size="sm"
                                  onClick={() => handlePayment(booking)}
                                >
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Pay Now
                                </Button>
                              )}
                              {booking.status === 'pending' && new Date(booking.appointment_date) > new Date() && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => cancelBooking(booking.id)}
                                  className="w-full"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Cancel Booking
                                </Button>
                              )}
                              <Button variant="outline" size="sm" className="w-full">
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </div>

                            {booking.doctor_notes && (
                              <div className="p-3 bg-primary/5 rounded-lg">
                                <p className="text-xs text-primary mb-1">Doctor's Notes:</p>
                                <p className="text-sm">{booking.doctor_notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default BookingHistory;
