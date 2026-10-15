// src/pages/PaymentSuccess.tsx (React example)
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'paid' | 'pending'>('loading');
  const bookingId = searchParams.get('bookingId');

  useEffect(() => {
    if (!bookingId) return;

    // Poll your backend — ITN may take a few seconds
    const poll = setInterval(async () => {
      const res = await fetch(`/api/bookings/${bookingId}`);
      const booking = await res.json();

      if (booking.paymentStatus === 'paid') {
        setStatus('paid');
        clearInterval(poll);
      } else if (booking.paymentStatus === 'failed') {
        setStatus('pending');
        clearInterval(poll);
      }
    }, 2000);

    // Stop after 30 seconds
    setTimeout(() => clearInterval(poll), 30000);
    return () => clearInterval(poll);
  }, [bookingId]);

  return (
    <div>
      {status === 'paid' && <h1>✅ Payment confirmed! Your booking is locked in.</h1>}
      {status === 'pending' && <h1>⏳ Payment processing — we'll email you shortly.</h1>}
      {status === 'loading' && <h1>Verifying payment...</h1>}
    </div>
  );
}