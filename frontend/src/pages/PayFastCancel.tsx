import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { retryBookingPayment } from '@/client/payfastClient';

const PayFastCancel = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get('bookingId');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const retry = async () => {
    if (!bookingId) return navigate('/booking-history');
    try {
      setBusy(true);
      await retryBookingPayment(bookingId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not restart payment.');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-xl py-12">
        <Card>
          <CardContent className="pt-8 space-y-5 text-center">
            <h1 className="text-2xl font-semibold">PayFast checkout closed</h1>
            <p className="text-muted-foreground">
              Your booking fee has not been confirmed. Check My Bookings for the latest status or retry the PayFast payment.
            </p>
            {error && <p className="text-destructive">{error}</p>}
            <div className="flex justify-center gap-3">
              <Button disabled={busy || !bookingId} onClick={retry}>Retry Payment</Button>
              <Button variant="outline" onClick={() => navigate('/booking-history')}>My Bookings</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PayFastCancel;
