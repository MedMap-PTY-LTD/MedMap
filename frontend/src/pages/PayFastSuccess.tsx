import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getBookingPaymentDetails } from '@/client/payfastClient';

const PayFastSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get('bookingId');
  const [status, setStatus] = useState('checking');
  const [paymentEnvironment, setPaymentEnvironment] = useState<'sandbox' | 'live' | undefined>();
  const [bookingFee, setBookingFee] = useState(10);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!bookingId) {
      setError('Booking reference is missing.');
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const check = async () => {
      try {
        const details = await getBookingPaymentDetails(bookingId);
        if (cancelled) return;
        setStatus(details.bookingFee === 0 ? 'membership-covered' : details.paymentStatus);
        setPaymentEnvironment(details.paymentEnvironment);
        setBookingFee(details.bookingFee ?? 10);
        if (!['paid', 'waived'].includes(details.paymentStatus) && attempts++ < 15) {
          timer = window.setTimeout(check, 2000);
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not check payment status.');
      }
    };
    let timer: number;
    check();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [bookingId]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-xl py-12">
        <Card>
          <CardContent className="pt-8 space-y-5 text-center">
            <h1 className="text-2xl font-semibold">
              {status === 'membership-covered'
                ? 'Booking confirmed with your membership'
                : status === 'paid' ? 'Booking fee payment confirmed' : 'Checking your booking fee'}
            </h1>
            <p className="text-muted-foreground">
              {error || (status === 'membership-covered'
                ? 'Your membership covered the booking fee. The consultation fee is paid separately at the doctor’s office.'
                : status === 'paid'
                ? paymentEnvironment === 'sandbox'
                  ? `PayFast confirmed the R${bookingFee.toFixed(2)} sandbox test. No real money was charged and no real consultation was purchased.`
                  : paymentEnvironment === 'live'
                    ? `PayFast confirmed your R${bookingFee.toFixed(2)} booking fee. The consultation fee is paid separately at the doctor's office.`
                    : 'PayFast confirmed your booking fee.'
                : 'We are waiting for PayFast to confirm the payment. Your booking stays pending until the confirmation arrives.')}
            </p>
            <Button onClick={() => navigate('/booking-history')}>View My Bookings</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PayFastSuccess;
