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
  const [accountCreditCents, setAccountCreditCents] = useState(0);
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
        const coveredByMembership = details.bookingFee === 0 &&
          (details.paymentMethod === 'membership' || details.membershipPlanId === 'premium_plus');
        const coveredByAccountCredit = details.bookingFee === 0 && details.paymentMethod === 'account_credit';
        const feeCoveredWithoutPayFast = details.bookingFee === 0 && details.paymentStatus === 'waived';
        setStatus(coveredByMembership ? 'membership-covered' : coveredByAccountCredit ? 'credit-covered' : feeCoveredWithoutPayFast ? 'fee-covered' : details.paymentStatus);
        setPaymentEnvironment(details.paymentEnvironment);
        setBookingFee(details.bookingFee ?? 10);
        setAccountCreditCents(details.accountCreditCents || 0);
        if (!['paid', 'waived', 'expired', 'credited', 'refunded'].includes(details.paymentStatus) && attempts++ < 15) {
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
                : status === 'credit-covered' ? 'Booking confirmed with account credit'
                : status === 'fee-covered' ? 'Booking confirmed'
                : status === 'paid' ? 'Booking fee payment confirmed'
                : status === 'expired' ? 'Payment window expired'
                : status === 'credited' ? 'Payment returned as account credit'
                : 'Checking your booking fee'}
            </h1>
            <p className="text-muted-foreground">
              {error || (status === 'membership-covered'
                ? 'Your membership covered the booking fee. The consultation fee is paid separately at the doctor’s office.'
                : status === 'credit-covered'
                  ? 'Your account credit covered the booking fee. The consultation fee is paid separately at the doctor’s office.'
                : status === 'fee-covered'
                  ? 'Your booking is confirmed. The consultation fee is paid separately at the doctor’s office.'
                : status === 'paid'
                ? paymentEnvironment === 'sandbox'
                  ? `PayFast confirmed the R${bookingFee.toFixed(2)} sandbox test. No real money was charged and no real consultation was purchased.`
                  : paymentEnvironment === 'live'
                    ? `PayFast confirmed your R${bookingFee.toFixed(2)} booking fee. The consultation fee is paid separately at the doctor's office.`
                    : 'PayFast confirmed your booking fee.'
                : status === 'expired'
                  ? accountCreditCents > 0
                    ? `The 10-minute payment window expired and the appointment was released. R${(accountCreditCents / 100).toFixed(2)} has been added to your account credit because PayFast completed the payment late. Please choose a new appointment time.`
                    : 'The 10-minute payment window expired and the appointment was released. Please choose a new appointment time. Any PayFast charge completed after expiry will be returned as account credit.'
                : status === 'credited'
                  ? `R${(accountCreditCents / 100).toFixed(2)} has been added to your account credit for a future booking.`
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
