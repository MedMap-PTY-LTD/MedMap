import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/django-api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import PaymentsRepo from '@/backend/repositories/payments';

interface Membership {
  id: string;
  name: string;
  description: string;
  price: number;
}

const Memberships = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchMemberships();
  }, []);

  const fetchMemberships = async () => {
    try {
      const response = await api.request('/memberships/plans/');
      if (!response.ok) throw new Error('Failed to fetch plans');
      const data: Membership[] = await response.json();
      setMemberships(data);
    } catch (err) {
      console.error('Failed to load memberships', err);
      toast({ title: 'Error', description: 'Failed to load memberships', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const startPremiumCheckout = async (membership: Membership) => {
    if (!user || !profile) {
      toast({ title: 'Sign in required', description: 'Please sign in to purchase a membership', variant: 'destructive' });
      return;
    }

    try {
      setProcessing(membership.id);
      const res = await PaymentsRepo.initiateMembershipPayment(membership.id, membership.price);
      const paymentUrl = res?.data?.authorization_url || res?.payment_url || res?.authorization_url || res?.data?.authorizationUrl;
      if (!paymentUrl) {
        throw new Error('Payment URL not returned by the server');
      }
      window.location.href = paymentUrl;
    } catch (err: any) {
      console.error('Payment error:', err);
      toast({ title: 'Payment failed', description: err?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Loading memberships...</h2>
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-medical-gradient mb-8">Membership Plans</h1>
        <div className="grid md:grid-cols-3 gap-6">
          {memberships.map((membership) => (
            <Card key={membership.id} className="shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="text-xl font-bold">{membership.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{membership.description}</p>
                <p className="font-semibold text-lg">Price: {formatCurrency(membership.price)}</p>
                <Button
                  className="w-full btn-medical-primary"
                  onClick={() => startPremiumCheckout(membership)}
                  disabled={processing === membership.id}
                >
                  {processing === membership.id ? 'Processing…' : 'Subscribe'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Memberships;
