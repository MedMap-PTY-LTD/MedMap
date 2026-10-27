import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import {
  cancelDoctorMembershipRenewal,
  createDoctorMembershipCheckout,
  getDoctorMembership,
  scheduleDoctorMembershipDowngrade,
  submitDoctorMembershipCheckout,
  type DoctorMembership,
} from '@/client/payfastClient';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    bestFor: 'Getting started',
    features: [
      'Listed in search, patient bookings, and booking notifications',
      'Basic profile: name, specialty, and location',
      'Basic calendar with schedule management',
      'Standard search placement',
      'Email and in-app help',
    ],
  },
  {
    id: 'member',
    name: 'Member',
    price: 199,
    bestFor: 'Growing practices',
    features: [
      'Enhanced profile: photo, bio, services, languages, and practice details',
      'Full calendar and availability tools',
      'Automatic appointment reminders to patients — coming soon',
      'Patient reviews and ratings',
      'Basic booking statistics',
      'Member badge and standard search placement',
      'Priority support by email and chat',
    ],
  },
  {
    id: 'partner',
    name: 'Partner',
    price: 699,
    bestFor: 'Busy practices that want the most patients and hands-on help',
    features: [
      'All Member profile, calendar, reviews, and reminder benefits',
      'Partner badge and featured placement ahead of standard listings',
      'Advanced booking statistics — coming soon',
      'Dedicated support by phone and WhatsApp',
      'Booking support from the MedMap team',
      'Featured in MedMap promotions',
      'Assistance with medical aid claims — coming soon',
      'Priority telemedicine listing — coming soon',
    ],
  },
] as const;

const planName = (id: DoctorMembership['planId']) => plans.find(plan => plan.id === id)?.name || 'Free';
const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString('en-ZA') : '';

const DoctorMemberships = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [membership, setMembership] = useState<DoctorMembership | null>(null);
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
        let current = await getDoctorMembership();
        if (searchParams.get('payment') === 'success' && current.planId === 'free') {
          for (let attempt = 0; attempt < 8 && active && current.planId === 'free'; attempt++) {
            await new Promise(resolve => window.setTimeout(resolve, 1500));
            current = await getDoctorMembership();
          }
        }
        if (active) setMembership(current);
      } catch (error: any) {
        if (active) toast({
          title: 'Membership status unavailable',
          description: error?.message || 'Please refresh and try again.',
          variant: 'destructive',
        });
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
    if (profile?.role !== 'doctor') {
      toast({ title: 'Provider account required', description: 'These membership plans are for providers.', variant: 'destructive' });
      return;
    }
    setProcessing(planId);
    try {
      const result = await createDoctorMembershipCheckout(planId);
      submitDoctorMembershipCheckout(result.checkout, result.planId);
    } catch (error: any) {
      toast({ title: 'Membership checkout unavailable', description: error?.message || 'Please try again.', variant: 'destructive' });
      setProcessing(null);
    }
  };

  const cancelRenewal = async () => {
    if (!window.confirm('Cancel future renewals? Your membership benefits will remain available until the current period ends.')) return;
    setCanceling(true);
    try {
      setMembership(await cancelDoctorMembershipRenewal());
      toast({ title: 'Renewal canceled', description: 'Your membership remains active through the current paid period.' });
    } catch (error: any) {
      toast({ title: 'Could not cancel renewal', description: error?.message || 'Please try again or contact support.', variant: 'destructive' });
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
      setMembership(await scheduleDoctorMembershipDowngrade(planId));
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
            <h1 className="text-4xl font-bold text-medical-gradient">Provider Memberships</h1>
            <p className="mt-2 text-muted-foreground">
              Grow your practice with Member or Partner. Paid plans renew monthly through PayFast.
            </p>
          </div>

          {searchParams.get('payment') === 'success' && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardContent className="py-4 text-sm text-blue-900">
                PayFast returned you to MedMap. Your membership will appear here once payment confirmation arrives.
              </CardContent>
            </Card>
          )}
          {searchParams.get('payment') === 'cancelled' && (
            <Card className="mb-6">
              <CardContent className="py-4 text-sm text-muted-foreground">Checkout was canceled. Your current membership has not changed.</CardContent>
            </Card>
          )}

          {user && membership && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-3">
                  <span>Your current plan: {planName(membership.planId)}</span>
                  <Badge variant={membership.planId === 'free' ? 'secondary' : 'default'}>{membership.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-5">
                <div className="space-y-1 text-sm text-muted-foreground">
                  {loading ? <p>Loading membership details…</p> : membership.planId !== 'free' ? (
                    <p>{planName(membership.planId)} is active through {formatDate(membership.currentPeriodEnd)}.</p>
                  ) : membership.status === 'expired' ? (
                    <p>Your previous paid plan has ended. Your account is now on Free.</p>
                  ) : <p>Free plan: standard search placement and a basic provider profile.</p>}
                  {membership.cancelAtPeriodEnd && <p className="font-medium text-amber-700">Renewal is canceled; benefits remain until the period ends.</p>}
                  {membership.status === 'past_due' && <p className="font-medium text-amber-700">PayFast could not collect the renewal. Your benefits remain available through {formatDate(membership.gracePeriodEnd)}. Update your payment details to keep them.</p>}
                  {membership.pendingPlanId && <p className="font-medium text-blue-700">{planName(membership.pendingPlanId)} is scheduled to start on {formatDate(membership.pendingPlanEffectiveAt)}.</p>}
                </div>
                {membership.canCancel && <Button variant="outline" onClick={cancelRenewal} disabled={canceling}>{canceling ? 'Canceling…' : 'Cancel renewal'}</Button>}
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
              const currentPrice = plans.find(item => item.id === membership?.planId)?.price || 0;
              const isUpgrade = hasPaidMembership && plan.price > currentPrice;
              const isDowngrade = hasPaidMembership && plan.price > 0 && plan.price < currentPrice;
              const isNewSubscription = !hasPaidMembership && plan.price > 0;
              return (
                <Card key={plan.id} className={isCurrent ? 'border-2 border-primary shadow-lg' : 'shadow-md'}>
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{plan.bestFor}</p>
                    <div className="pt-2 text-3xl font-bold">
                      {plan.price === 0 ? 'Free' : `R${plan.price}`}
                      {plan.price > 0 && <span className="text-base font-normal text-muted-foreground"> / month</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <ul className="space-y-3 text-sm">
                      {plan.features.map(feature => (
                        <li key={feature} className="flex gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
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
                        disabled={loading || !!processing || downgrading || (!!user && profile?.role !== 'doctor')}
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
            Recurring PayFast memberships require a credit card. Appointment reminders, Partner advanced statistics, medical aid claims assistance, and priority telemedicine listing are coming soon.
          </p>
          {!user && <p className="mt-2 text-sm text-muted-foreground">Sign in with a verified provider account to subscribe.</p>}
          {user && profile?.role && profile.role !== 'doctor' && <p className="mt-2 text-sm text-amber-700">These plans are for provider accounts.</p>}
          {user && !profile && <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading account…</div>}
        </div>
      </main>
    </div>
  );
};

export default DoctorMemberships;
