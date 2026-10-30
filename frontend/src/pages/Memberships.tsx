import React, { useEffect, useState } from 'react';
import DoctorMemberships from '@/pages/doctor/DoctorMemberships';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { hasUserRole } from '@/lib/firebase';
import { useToast } from '@/components/ui/use-toast';
import {
  cancelPatientMembershipRenewal,
  createPatientMembershipCheckout,
  getPatientMembership,
  schedulePatientMembershipDowngrade,
  submitPatientMembershipCheckout,
  type PatientMembership,
} from '@/client/payfastClient';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    bestFor: 'Trying MedMap',
    features: [
      'Find and book doctors',
      'Booking confirmation',
      'Basic rescheduling and cancellation',
      'R10 per completed booking (collected when booked)',
    ],
  },
  {
    id: 'basic_premium',
    name: 'Basic Premium',
    price: 39,
    bestFor: 'Individuals',
    features: [
      'Appointment reminders — coming soon',
      'Enhanced rescheduling and cancellation — coming soon',
      'Full appointment history access — coming soon',
      'First 5 completed bookings in each membership period have no booking fee',
      'Then R8 booking fee per booking (collected when booked)',
    ],
  },
  {
    id: 'premium_plus',
    name: 'Premium Plus',
    price: 99,
    bestFor: 'Families',
    features: [
      'All Basic Premium booking-fee benefits',
      'No booking fee on any booking',
      'Family profile for up to 5 people — coming soon',
      'Priority booking — coming soon',
      'Priority support — coming soon',
      'Quarterly telemedicine credit — coming soon',
    ],
  },
] as const;

const planName = (id: PatientMembership['planId']) =>
  plans.find(plan => plan.id === id)?.name || 'Free';

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('en-ZA') : '';

const PatientMemberships = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [membership, setMembership] = useState<PatientMembership | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [downgrading, setDowngrading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setMembership(null);
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    const refresh = async () => {
      try {
        let current = await getPatientMembership();
        if (searchParams.get('payment') === 'success' && current.planId === 'free') {
          for (let attempt = 0; attempt < 8 && active && current.planId === 'free'; attempt++) {
            await new Promise(resolve => window.setTimeout(resolve, 1500));
            current = await getPatientMembership();
          }
        }
        if (active) setMembership(current);
      } catch (error: any) {
        if (active) {
          toast({
            title: 'Membership status unavailable',
            description: error?.message || 'Please refresh and try again.',
            variant: 'destructive',
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    refresh();
    return () => { active = false; };
  }, [user?.uid, searchParams, toast]);

  const subscribe = async (planId: string) => {
    if (!user) {
      navigate('/signin');
      return;
    }
    if (profile && !hasUserRole(profile, 'patient')) {
      toast({
        title: 'Patient account required',
        description: 'These membership plans are for patients.',
        variant: 'destructive',
      });
      return;
    }
    setProcessing(planId);
    try {
      const result = await createPatientMembershipCheckout(planId);
      submitPatientMembershipCheckout(result.checkout, result.planId);
    } catch (error: any) {
      toast({
        title: 'Membership checkout unavailable',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
      setProcessing(null);
    }
  };

  const cancelRenewal = async () => {
    if (!window.confirm('Cancel future renewals? Your membership benefits will remain available until the current period ends.')) return;
    setCanceling(true);
    try {
      const updated = await cancelPatientMembershipRenewal();
      setMembership(updated);
      toast({
        title: 'Renewal canceled',
        description: 'Your membership remains active through the current paid period.',
      });
    } catch (error: any) {
      toast({
        title: 'Could not cancel renewal',
        description: error?.message || 'Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setCanceling(false);
    }
  };

  const scheduleDowngrade = async (planId: string) => {
    const plan = plans.find(item => item.id === planId);
    if (!plan || !membership?.currentPeriodEnd) return;
    if (!window.confirm(`Your current plan will remain active until ${formatDate(membership.currentPeriodEnd)}. ${plan.name} will begin at renewal.`)) return;
    setDowngrading(true);
    try {
      setMembership(await schedulePatientMembershipDowngrade(planId));
      toast({ title: 'Downgrade scheduled', description: `${plan.name} will take effect at the end of your current billing period.` });
    } catch (error: any) {
      toast({ title: 'Could not schedule downgrade', description: error?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setDowngrading(false);
    }
  };

  const hasPaidMembership = membership?.planId !== 'free' &&
    (membership?.status === 'active' || membership?.status === 'past_due');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-medical-gradient">Patient Memberships</h1>
            <p className="mt-2 text-muted-foreground">
              Choose the level of booking support that works for you. Paid plans renew every 3 months through PayFast.
            </p>
          </div>

          {searchParams.get('payment') === 'success' && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardContent className="py-4 text-sm text-blue-900">
                PayFast returned you to MedMap. Your membership will appear here once the payment confirmation arrives.
              </CardContent>
            </Card>
          )}
          {searchParams.get('payment') === 'cancelled' && (
            <Card className="mb-6">
              <CardContent className="py-4 text-sm text-muted-foreground">
                Checkout was canceled. Your current membership has not changed.
              </CardContent>
            </Card>
          )}

          {user && profile && !hasUserRole(profile, 'patient') && (
            <Card className="mb-6">
              <CardContent className="py-4 text-sm text-muted-foreground">
                These plans are for patient accounts. Provider membership plans are managed separately.
              </CardContent>
            </Card>
          )}

          {user && hasUserRole(profile, 'patient') && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-3">
                  <span>Your current plan: {membership ? planName(membership.planId) : 'Loading'}</span>
                  {membership && <Badge variant={membership.planId === 'free' ? 'secondary' : 'default'}>{membership.status}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-5">
                <div className="space-y-1 text-sm text-muted-foreground">
                  {loading ? (
                    <p>Loading membership details…</p>
                  ) : membership?.planId === 'basic_premium' ? (
                    <>
                      <p>{membership.completedFreeBookings} of 5 free bookings completed; {membership.freeBookingsRemaining} available to book free this period.</p>
                      <p>Period ends {formatDate(membership.currentPeriodEnd)}.</p>
                    </>
                  ) : membership?.planId === 'premium_plus' ? (
                    <p>Premium Plus is active through {formatDate(membership.currentPeriodEnd)}.</p>
                  ) : membership?.status === 'expired' ? (
                    <p>Your previous paid plan has ended. Your account is now on Free.</p>
                  ) : (
                    <p>Free plan booking fee: R10 per completed booking.</p>
                  )}
                  {membership?.cancelAtPeriodEnd && (
                    <p className="font-medium text-amber-700">Renewal is canceled; benefits remain until the period ends.</p>
                  )}
                  {membership?.status === 'past_due' && (
                    <p className="font-medium text-amber-700">PayFast could not collect the renewal. Your benefits remain available through {formatDate(membership.gracePeriodEnd)}. Update your payment details to keep them.</p>
                  )}
                  {membership?.pendingPlanId && <p className="font-medium text-blue-700">{planName(membership.pendingPlanId)} is scheduled to start on {formatDate(membership.pendingPlanEffectiveAt)}.</p>}
                </div>
                {membership?.canCancel && (
                  <Button variant="outline" onClick={cancelRenewal} disabled={canceling}>
                    {canceling ? 'Canceling…' : 'Cancel renewal'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {!!membership?.notifications?.length && (
            <Card className="mb-8 border-amber-200 bg-amber-50">
              <CardHeader><CardTitle className="text-base">Membership reminders</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {membership.notifications.map(notification => (
                  <div key={notification.id} className="border-b border-amber-200 pb-3 last:border-0 last:pb-0">
                    <p className="font-medium text-amber-950">{notification.title}</p>
                    <p className="text-sm text-amber-900">{notification.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-3">
            {plans.map(plan => {
              const isCurrent = membership?.planId === plan.id && hasPaidMembership;
              const activePaid = !!hasPaidMembership;
              const currentPrice = plans.find(item => item.id === membership?.planId)?.price || 0;
              const isUpgrade = activePaid && plan.price > currentPrice;
              const isDowngrade = activePaid && plan.price > 0 && plan.price < currentPrice;
              const isNewSubscription = !activePaid && plan.price > 0;
              return (
                <Card key={plan.id} className={isCurrent ? 'border-2 border-primary shadow-lg' : 'shadow-md'}>
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{plan.bestFor}</p>
                    <div className="pt-2 text-3xl font-bold">
                      {plan.price === 0 ? 'Free' : 'R' + plan.price}
                      {plan.price > 0 && <span className="text-base font-normal text-muted-foreground"> / 3 months</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <ul className="space-y-3 text-sm">
                      {plan.features.map(feature => (
                        <li key={feature} className="flex gap-2">
                          <span className="font-semibold text-primary">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <Badge className="w-full justify-center py-2">Current plan</Badge>
                    ) : plan.price === 0 ? (
                      <Button variant="outline" className="w-full" disabled>Free plan</Button>
                    ) : membership?.pendingPlanId === plan.id ? (
                      <Badge variant="secondary" className="w-full justify-center py-2">Downgrade scheduled</Badge>
                    ) : plan.price > 0 && (isUpgrade || isDowngrade || isNewSubscription) ? (
                      <Button
                        className="w-full btn-medical-primary"
                        variant={isDowngrade ? 'outline' : 'default'}
                        onClick={() => isDowngrade ? void scheduleDowngrade(plan.id) : void subscribe(plan.id)}
                        disabled={loading || !!processing || downgrading || (!!user && !hasUserRole(profile, 'patient'))}
                      >
                        {processing === plan.id || (downgrading && isDowngrade) ? 'Updating plan…' : isUpgrade ? `Upgrade now · R${plan.price} today` : isDowngrade ? 'Downgrade at renewal' : user ? 'Subscribe with PayFast' : 'Sign in to subscribe'}
                      </Button>
                    ) : null}
                    {isUpgrade && <p className="text-xs text-muted-foreground">The full plan price is charged now, and a new billing period starts after payment.</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Recurring PayFast memberships require a credit card. Booking fees are collected when booked; Basic Premium’s first five free bookings count only when completed.
          </p>
        </div>
      </main>
    </div>
  );
};

const Memberships = () => {
  const { user, profile } = useAuth();
  return user && profile?.role === 'doctor' ? <DoctorMemberships /> : <PatientMemberships />;
};

export default Memberships;
