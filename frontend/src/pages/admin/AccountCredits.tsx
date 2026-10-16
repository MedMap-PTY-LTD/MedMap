import { useEffect, useState } from 'react';
import { CreditCard, Search, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  issueAccountCredit,
  getPendingRefundCreditReviews,
  issueRefundReviewCredit,
  declineRefundCreditReview,
  lookupPatientAccountCredit,
  type AccountCreditTransaction,
  type RefundCreditReview,
} from '@/client/payfastClient';

interface PatientCreditAccount {
  user: { uid: string; email: string; fullName: string };
  balanceCents: number;
  transactions: AccountCreditTransaction[];
}

function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' });
}

function formatDate(value?: string): string {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime())
    ? date.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';
}

export default function AccountCredits() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [patient, setPatient] = useState<PatientCreditAccount | null>(null);
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<'refund' | 'compensation'>('refund');
  const [reason, setReason] = useState('');
  const [source, setSource] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [refundReviews, setRefundReviews] = useState<RefundCreditReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [resolvingReviewId, setResolvingReviewId] = useState<string | null>(null);

  const refreshReviews = async () => {
    setIsLoadingReviews(true);
    try {
      setRefundReviews(await getPendingRefundCreditReviews());
    } catch (error: any) {
      toast({ title: 'Refund reviews unavailable', description: error.message || 'Could not load pending refund reviews.', variant: 'destructive' });
    } finally {
      setIsLoadingReviews(false);
    }
  };

  useEffect(() => { void refreshReviews(); }, []);

  const lookup = async (value = email) => {
    if (!value.trim()) return;
    setIsSearching(true);
    try {
      const result = await lookupPatientAccountCredit(value.trim());
      setPatient(result);
    } catch (error: any) {
      setPatient(null);
      toast({ title: 'Patient not found', description: error.message || 'Could not find a patient with that email.', variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const issueCredit = async () => {
    if (!patient || !amount || reason.trim().length < 3) return;
    setIsIssuing(true);
    try {
      await issueAccountCredit({
        userId: patient.user.uid,
        amount,
        kind,
        reason: reason.trim(),
        source: source.trim() || undefined,
      });
      setAmount('');
      setReason('');
      setSource('');
      await lookup(patient.user.email);
      toast({ title: 'Account credited', description: `${formatMoney(Math.round(Number(amount) * 100))} was added to ${patient.user.fullName}'s account.` });
    } catch (error: any) {
      toast({ title: 'Credit was not issued', description: error.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsIssuing(false);
    }
  };

  const creditReview = async (review: RefundCreditReview) => {
    const reason = window.prompt('Reason for approving account credit', `Approved booking-fee credit: ${review.reason || 'eligible exception'}`);
    if (!reason || reason.trim().length < 3) return;
    setResolvingReviewId(review.id);
    try {
      await issueRefundReviewCredit(review.id, reason.trim());
      await refreshReviews();
      toast({ title: 'Account credited', description: `${formatMoney(review.amountCents ?? Math.round(review.amount * 100))} was credited to ${review.customerName || 'the patient'}.` });
    } catch (error: any) {
      toast({ title: 'Credit was not issued', description: error.message || 'Please refresh and try again.', variant: 'destructive' });
    } finally {
      setResolvingReviewId(null);
    }
  };

  const declineReview = async (review: RefundCreditReview) => {
    const reason = window.prompt('Reason for keeping the booking fee', 'Booking fee retained under the non-refundable booking-fee policy');
    if (!reason || reason.trim().length < 3) return;
    setResolvingReviewId(review.id);
    try {
      await declineRefundCreditReview(review.id, reason.trim());
      await refreshReviews();
      toast({ title: 'Refund review closed', description: 'The booking fee was retained and the decision was recorded.' });
    } catch (error: any) {
      toast({ title: 'Review was not closed', description: error.message || 'Please refresh and try again.', variant: 'destructive' });
    } finally {
      setResolvingReviewId(null);
    }
  };

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Account Credits</CardTitle>
        <CardDescription>Issue account credit for refunds or customer compensation. Credit can be used toward a future booking fee.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="credit-patient-email">Patient email</Label>
            <Input
              id="credit-patient-email"
              type="email"
              value={email}
              disabled={isIssuing}
              onChange={event => { setEmail(event.target.value); setPatient(null); }}
              onKeyDown={event => { if (event.key === 'Enter') void lookup(); }}
              placeholder="patient@example.com"
            />
          </div>
          <Button onClick={() => void lookup()} disabled={isSearching || isIssuing || !email.trim()}>
            {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Find patient
          </Button>
        </div>

        {patient && (
          <>
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <p className="font-semibold">{patient.user.fullName}</p>
                  <p className="text-sm text-muted-foreground">{patient.user.email}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm text-muted-foreground">Available account credit</p>
                  <p className="text-xl font-bold">{formatMoney(patient.balanceCents)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="credit-kind">Credit type</Label>
                <select id="credit-kind" value={kind} onChange={event => setKind(event.target.value as 'refund' | 'compensation')} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="refund">Refund to account credit</option>
                  <option value="compensation">Service compensation</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="credit-amount">Amount (ZAR)</Label>
                <Input id="credit-amount" type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="credit-source">Source or reference (optional)</Label>
                <Input id="credit-source" value={source} onChange={event => setSource(event.target.value)} placeholder="Booking ID, refund reference, or case number" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="credit-reason">Reason</Label>
                <Textarea id="credit-reason" value={reason} onChange={event => setReason(event.target.value)} maxLength={1000} rows={3} placeholder="Record why this credit is being issued" />
              </div>
            </div>
            <Button onClick={() => void issueCredit()} disabled={isIssuing || !amount || reason.trim().length < 3}>
              {isIssuing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add account credit
            </Button>

            <div className="space-y-3">
              <h3 className="font-semibold">Credit history</h3>
              {patient.transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No account credit activity yet.</p>
              ) : (
                <div className="space-y-2">
                  {patient.transactions.map(transaction => (
                    <div key={transaction.id} className="flex flex-col gap-1 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">{transaction.kind.replaceAll('_', ' ')}</p>
                        <p className="text-muted-foreground">{transaction.reason}{transaction.source ? ` · ${transaction.source}` : ''}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(transaction.createdAt)}{transaction.adminEmail ? ` · by ${transaction.adminEmail}` : ''}</p>
                      </div>
                      <div className="font-semibold">{transaction.amountCents < 0 ? '−' : '+'}{formatMoney(Math.abs(transaction.amountCents))}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><RotateCcw className="h-5 w-5" />Booking fee refund reviews</span>
          <Button variant="outline" size="sm" onClick={() => void refreshReviews()} disabled={isLoadingReviews || !!resolvingReviewId}>
            {isLoadingReviews ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
        </CardTitle>
        <CardDescription>Booking fees are non-refundable by default. Approve an exception to credit the patient’s account, or record the reason for retaining the fee.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoadingReviews ? <p className="text-sm text-muted-foreground">Loading refund reviews…</p> : refundReviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No booking fee refund reviews are waiting.</p>
        ) : refundReviews.map(review => (
          <div key={review.id} className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{review.customerName || 'Patient'} · {formatMoney(review.amountCents ?? Math.round(review.amount * 100))}</p>
              <p className="text-muted-foreground">{review.customerEmail}{review.doctorName ? ` · Dr. ${review.doctorName}` : ''}</p>
              <p className="text-muted-foreground">{review.appointmentDate || review.bookingId || 'Booking'}{review.appointmentTime ? ` at ${review.appointmentTime}` : ''}</p>
              <p>{review.reason || 'No cancellation reason provided'}</p>
              <p className="text-xs text-muted-foreground">Requested {formatDate(review.createdAt)}{review.status === 'pending_manual_refund' ? ' · payment exception' : ''}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={() => void creditReview(review)} disabled={!!resolvingReviewId}>
                {resolvingReviewId === review.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Credit account'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void declineReview(review)} disabled={!!resolvingReviewId}>Keep fee</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
    </div>
  );
}
