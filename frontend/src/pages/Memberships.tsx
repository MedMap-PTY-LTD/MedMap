import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PaymentsRepo } from '@/backend/repositories/payments';
import { MembershipsRepo } from '@/backend/repositories/memberships';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Membership {
  id: string;
  title: string;
  price: number;
  description: string;
  duration_months: number;
}

const Memberships = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    fetchMemberships();
  }, []);

  const fetchMemberships = async () => {
    try {
      const data = await MembershipsRepo.getAll();
      setMemberships(data || []);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load memberships", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (membership: Membership) => {
    if (!user || !profile) {
      toast({ title: "Sign in required", description: "Please sign in to purchase a membership.", variant: "destructive" });
      return;
    }

    setIsPaying(true);
    try {
      // Convert amount to kobo (smallest currency unit)
      const amountKobo = membership.price * 100;

      // Initiate Paystack payment
      await PaymentsRepo.initiatePaystackMembershipPayment(membership.id, amountKobo, user.email!);

      toast({ title: "Success", description: "Redirecting to Paystack for payment..." });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Payment error", description: err?.message || "Failed to initiate payment.", variant: "destructive" });
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 text-medical-gradient">Membership Plans</h1>

        {!user && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            Please sign in to purchase memberships.
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading memberships...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memberships.map((m) => (
              <Card key={m.id} className="medical-hero-card">
                <CardHeader>
                  <CardTitle>{m.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p>{m.description}</p>
                  <p className="font-semibold text-primary">{formatCurrency(m.price)}</p>
                  <p className="text-sm text-muted-foreground">Duration: {m.duration_months} month{m.duration_months > 1 ? 's' : ''}</p>
                  <Button
                    onClick={() => handlePurchase(m)}
                    disabled={!user || isPaying}
                    className="w-full btn-medical-primary h-12 text-lg"
                  >
                    {isPaying ? 'Processing…' : 'Purchase'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Memberships;
