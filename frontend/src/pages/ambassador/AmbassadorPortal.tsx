// pages/ambassador/AmbassadorPortal.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAmbassador } from '@/hooks/useAmbassador';
import { TIERS } from '@/lib/types/ambassador';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  RefreshCw, 
  Copy, 
  Users, 
  Heart, 
  Target, 
  Award, 
  TrendingUp, 
  Gift, 
  Stethoscope, 
  Search,
  Info,
  AlertCircle,
  XCircle,
  Clock,
  Video,
  Sparkles,
} from 'lucide-react';
import TrainingModule from './TrainingModule';
import KnowledgeTest from './KnowledgeTest';

// ==================== SUB-COMPONENTS ====================

const StatsCard = ({ title, value, icon: Icon, color, badge }: any) => (
  <Card>
    <CardContent className="pt-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-600">{title}</p>
          <p className="text-xl font-bold">{value}</p>
          {badge && <div className={`w-3 h-3 rounded-full ${badge} mt-1`} />}
        </div>
        <Icon className={`w-6 h-6 text-${color}-600`} />
      </div>
    </CardContent>
  </Card>
);

const OverviewTab = ({ ambassadorData, stats, tierDisplay, onCopyCode }: any) => {
  const { toast } = useToast();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-600" />
            Your Referral Link
          </CardTitle>
          <CardDescription>Share this unique link with doctors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Your Referral Code</p>
            <div className="flex items-center justify-between">
              <code className="text-lg font-mono font-bold text-purple-700">{ambassadorData?.referralCode}</code>
              <Button size="sm" onClick={onCopyCode}>
                <Copy className="w-4 h-4 mr-2" />Copy
              </Button>
            </div>
          </div>
          <div className="mt-4 bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              Share this code with doctors when they sign up for MedMap. Each doctor you refer is permanently linked to you.
            </p>
          </div>
          <Button 
            className="w-full bg-purple-600 hover:bg-purple-700 mt-4"
            onClick={() => {
              const link = `${window.location.origin}/doctor-enrollment?ref=${ambassadorData?.referralCode}`;
              navigator.clipboard.writeText(link);
              toast({ title: 'Copied!', description: 'Referral link copied to clipboard.' });
            }}
          >
            <Copy className="w-4 h-4 mr-2" />Copy Full Referral Link
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Tier Progress & Commission
          </CardTitle>
          <CardDescription>
            Current Tier: <strong className="capitalize">{tierDisplay.label}</strong> ({tierDisplay.rate} of MedMap's R10 booking fee)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Active Doctors: {stats?.activeDoctors || 0}</span>
              <span className="font-semibold">
                {stats?.tierProgress?.next 
                  ? `${stats.activeDoctors}/${stats.tierProgress.next} for next tier`
                  : 'Max Tier Reached!'}
              </span>
            </div>
            <Progress 
              value={Math.min(((stats?.activeDoctors || 0) / (stats?.tierProgress?.next || 10)) * 100, 100)} 
              className="h-2" 
            />
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-600" />
                How Commission Works:
              </h4>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• MedMap charges a <strong>R10 booking fee</strong> per consultation</li>
                <li>• You earn a percentage of the <strong>R10 booking fee</strong></li>
                <li>• Only doctors with <strong>50+ bookings per month</strong> generate commission</li>
                <li className="font-medium text-purple-700 mt-1">
                  Current rate: <strong>{tierDisplay.rate}</strong> of R10 per eligible booking
                </li>
              </ul>
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Eligible Doctors:</strong> {stats?.eligibleDoctors || 0} of {stats?.verifiedReferrals || 0} verified doctors
                {stats?.eligibleBookingFeeRevenue && stats.eligibleBookingFeeRevenue > 0 && (
                  <span className="block text-xs text-green-700 mt-1">
                    Total booking fee revenue: R{(stats.eligibleBookingFeeRevenue || 0).toLocaleString()}
                  </span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ReferralsTab = ({ 
  referrals, 
  totalReferrals, 
  searchTerm, 
  setSearchTerm, 
  filterStatus, 
  setFilterStatus,
  isLoading,
  getStatusBadge,
  formatDate,
}: any) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-purple-600" />
              Doctors You've Referred
            </CardTitle>
            <CardDescription>Track the doctors who signed up using your referral code</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-100 text-purple-800">Total: {totalReferrals}</Badge>
            <Badge className="bg-green-100 text-green-800">Verified: {referrals.filter((r: any) => r.status === 'verified').length}</Badge>
            <Badge className="bg-blue-100 text-blue-800">Eligible: {referrals.filter((r: any) => r.eligibleForCommission).length}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or specialization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            className="px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No referrals yet</p>
            <p className="text-sm">Start sharing your referral code with doctors today!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-4">
              {referrals.map((referral: any) => (
                <div key={referral.id} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Stethoscope className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold">{referral.doctorFullName}</p>
                          <p className="text-sm text-gray-500">{referral.doctorEmail}</p>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500">Specialization</p>
                          <p className="font-medium">{referral.doctorSpecialization || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Referred</p>
                          <p className="font-medium">{formatDate(referral.referredAt)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Status</p>
                          <Badge className={getStatusBadge(referral.status)}>{referral.status}</Badge>
                        </div>
                        <div>
                          <p className="text-gray-500">Monthly Bookings</p>
                          <p className={`font-medium ${referral.monthlyBookings >= 50 ? 'text-green-600' : 'text-gray-600'}`}>
                            {referral.monthlyBookings}
                            {referral.monthlyBookings >= 50 && ' ✅'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Booking Fees</p>
                          <p className="font-medium">R{referral.monthlyBookingFeeRevenue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Eligible</p>
                          <Badge className={referral.eligibleForCommission ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                            {referral.eligibleForCommission ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold">Doctor</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Specialization</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Referred</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Monthly Bookings</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Booking Fees</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Eligible</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((referral: any) => (
                    <tr key={referral.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-sm">{referral.doctorFullName}</p>
                          <p className="text-xs text-gray-600">{referral.doctorEmail}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{referral.doctorSpecialization || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm">{formatDate(referral.referredAt)}</td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusBadge(referral.status)}>{referral.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className={referral.monthlyBookings >= 50 ? 'font-bold text-green-600' : 'text-gray-600'}>
                          {referral.monthlyBookings}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">R{referral.monthlyBookingFeeRevenue.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        {referral.eligibleForCommission ? (
                          <Badge className="bg-green-100 text-green-800">Yes</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600">No</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {referrals.length > 0 && (
              <div className="text-sm text-gray-500 text-center pt-4">
                Showing {referrals.length} referrals
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const EarningsTab = ({ stats, referrals, tierDisplay, formatDate, getStatusBadge }: any) => {
  const eligibleReferrals = referrals.filter((r: any) => r.status === 'verified' && r.eligibleForCommission);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission History</CardTitle>
        <CardDescription>
          Current Tier: <strong className="capitalize">{tierDisplay.label}</strong> ({tierDisplay.rate} of R10 booking fee)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-600">Total Earned</p>
            <p className="text-2xl font-bold text-green-700">
              R{(stats?.totalCommission || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-600">Pending Commission</p>
            <p className="text-2xl font-bold text-yellow-700">
              R{(stats?.pendingCommission || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-600">Paid Commission</p>
            <p className="text-2xl font-bold text-blue-700">
              R{(stats?.paidCommission || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-purple-800">
            <strong>Commission Summary:</strong> {stats?.eligibleDoctors || 0} eligible doctors with 50+ monthly bookings
            {stats?.eligibleBookingFeeRevenue && stats.eligibleBookingFeeRevenue > 0 && (
              <span className="block text-xs text-purple-700 mt-1">
                Total booking fee revenue: R{(stats.eligibleBookingFeeRevenue || 0).toLocaleString()} × {tierDisplay.rate} = 
                R{(stats.totalCommission || 0).toLocaleString()} estimated commission
              </span>
            )}
          </p>
        </div>

        {eligibleReferrals.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No eligible earnings yet</p>
            <p className="text-sm">Commission is earned when referred doctors have 50+ monthly bookings</p>
          </div>
        ) : (
          <div className="space-y-3">
            {eligibleReferrals.map((referral: any) => {
              const commissionAmount = referral.monthlyBookingFeeRevenue * (stats?.commissionRate || 10) / 100;
              return (
                <div key={referral.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{referral.doctorFullName}</p>
                    <p className="text-sm text-gray-500">{referral.doctorSpecialization || 'General Practice'}</p>
                    <p className="text-xs text-gray-400">
                      Monthly Bookings: {referral.monthlyBookings} | Booking Fees: R{referral.monthlyBookingFeeRevenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">R{commissionAmount.toLocaleString()}</p>
                    <Badge className={referral.commissionPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {referral.commissionPaid ? 'Paid' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ==================== MAIN COMPONENT ====================
const AmbassadorPortal = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // ✅ USING THE HOOK
  const {
    ambassadorData,
    referrals,
    stats,
    isLoading,
    refetch,
  } = useAmbassador(user?.uid || '');

  // ==================== HANDLERS ====================
  const handleCopyReferralCode = () => {
    if (ambassadorData?.referralCode) {
      navigator.clipboard.writeText(ambassadorData.referralCode);
      toast({ title: 'Copied!', description: 'Referral code copied to clipboard.' });
    }
  };

  const handleRefresh = async () => {
    await refetch();
    toast({ title: 'Refreshed', description: 'Data updated successfully.' });
  };

  const getTierDisplay = (tierName: string) => {
    const tier = TIERS.find(t => t.name === tierName);
    if (!tier) return { label: 'Bronze', color: 'bg-amber-600', rate: '10%' };
    return { label: tier.label, color: tier.color, rate: `${tier.commissionRate * 100}%` };
  };

  const getFilteredReferrals = () => {
    let filtered = referrals;
    if (filterStatus !== 'all') {
      filtered = filtered.filter((r: any) => r.status === filterStatus);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((r: any) => 
        r.doctorFullName?.toLowerCase().includes(term) ||
        r.doctorEmail?.toLowerCase().includes(term) ||
        r.doctorSpecialization?.toLowerCase().includes(term)
      );
    }
    return filtered;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      approved: 'bg-green-100 text-green-800',
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      passed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // ==================== LOADING ====================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
      </div>
    );
  }

  // ==================== NOT FOUND ====================
  if (!ambassadorData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
            <p className="text-gray-600 mb-4">Your ambassador profile could not be found. Please contact support.</p>
            <Button onClick={() => navigate('/')} className="w-full">Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==================== ONBOARDING STEPS ====================
  const step = ambassadorData?.onboardingStep || 1;
  const psychometricPassed = ambassadorData?.psychometricTest?.passed;
  const psychometricScore = ambassadorData?.psychometricTest?.score;
  const nextAttemptDate = ambassadorData?.psychometricTest?.nextAttemptDate?.toDate?.();
  const trainingCompleted = ambassadorData?.trainingModule?.completed;
  const knowledgePassed = ambassadorData?.knowledgeTest?.passed;
  const knowledgeScore = ambassadorData?.knowledgeTest?.score;
  const interviewStatus = ambassadorData?.interviewStatus;
  const applicationStatus = ambassadorData?.applicationStatus;

  // Step 2: Failed psychometric
  if (step === 2 && psychometricPassed === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle>Assessment Cooldown Period</CardTitle>
            <CardDescription>Your psychometric assessment did not meet the required threshold.</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {psychometricScore && (
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Your Score</p>
                <p className="text-2xl font-bold text-gray-800">{psychometricScore}%</p>
                <p className="text-xs text-gray-500 mt-1">Required: 70% to pass</p>
              </div>
            )}
            {nextAttemptDate && nextAttemptDate > new Date() && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">You can retake the assessment on:</p>
                <p className="text-xl font-bold text-yellow-900 mt-1">
                  {nextAttemptDate.toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}
            <p className="text-sm text-gray-600">
              Please use this time to prepare. You will receive an email notification when you can retake the assessment.
            </p>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Training Module
  if (step === 2 || (step === 3 && !trainingCompleted)) {
    return <TrainingModule />;
  }

  // Step 3: Knowledge Test
  if (step === 3 && trainingCompleted) {
    return <KnowledgeTest />;
  }

  // Step 4: Interview pending
  if (step === 4 && interviewStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle>Application Under Review</CardTitle>
            <CardDescription>You have successfully passed the knowledge test!</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {knowledgeScore && (
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-800 font-medium">Your Knowledge Test Score</p>
                <p className="text-2xl font-bold text-green-900">{knowledgeScore}%</p>
                <p className="text-xs text-green-700 mt-1">Required: 75% to pass</p>
              </div>
            )}
            <p className="text-gray-600">
              Our team is reviewing your application. If selected, you will be contacted to schedule an interview.
            </p>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 4: Interview scheduled
  if (step === 4 && interviewStatus === 'scheduled') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Video className="w-8 h-8 text-purple-600" />
            </div>
            <CardTitle>Interview Scheduled</CardTitle>
            <CardDescription>Your interview has been scheduled with our team.</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              You will receive an email with the interview details and link. Please check your inbox.
            </p>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 4: Interview failed
  if (step === 4 && interviewStatus === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle>Application Not Successful</CardTitle>
            <CardDescription>Thank you for your interest in becoming a MedMap Ambassador.</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              While your application showed promise, we have decided to move forward with other candidates at this time.
            </p>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==================== APPROVED AMBASSADOR - FULL DASHBOARD ====================
  if (step === 5 && applicationStatus === 'approved') {
    const tierDisplay = getTierDisplay(stats?.currentTier || 'bronze');
    const filteredReferrals = getFilteredReferrals();

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">Ambassador Dashboard</h1>
                <p className="text-purple-100 mt-1">Welcome back, {profile?.firstName || 'Ambassador'}!</p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/20"
                  onClick={handleRefresh}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
                  <p className="text-xs text-purple-200">Your Referral Code</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xl font-bold tracking-wider font-mono">{ambassadorData?.referralCode}</code>
                    <button onClick={handleCopyReferralCode} className="p-1 hover:bg-white/20 rounded transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatsCard title="Total Referrals" value={stats?.totalReferrals || 0} icon={Users} color="purple" />
            <StatsCard title="Active Doctors" value={stats?.activeDoctors || 0} icon={Heart} color="green" />
            <StatsCard title="Eligible for Commission" value={stats?.eligibleDoctors || 0} icon={Target} color="blue" />
            <StatsCard title="Current Tier" value={tierDisplay.label} icon={Award} color="amber" badge={tierDisplay.color} />
            <StatsCard title="Total Earnings" value={`R${(stats?.totalCommission || 0).toLocaleString()}`} icon={TrendingUp} color="green" />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="referrals">Referrals</TabsTrigger>
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab 
                ambassadorData={ambassadorData} 
                stats={stats} 
                tierDisplay={tierDisplay}
                onCopyCode={handleCopyReferralCode}
              />
            </TabsContent>

            <TabsContent value="referrals">
              <ReferralsTab 
                referrals={filteredReferrals} 
                totalReferrals={referrals.length}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                isLoading={isLoading}
                getStatusBadge={getStatusBadge}
                formatDate={formatDate}
              />
            </TabsContent>

            <TabsContent value="earnings">
              <EarningsTab 
                stats={stats} 
                referrals={referrals} 
                tierDisplay={tierDisplay}
                formatDate={formatDate}
                getStatusBadge={getStatusBadge}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // ==================== DEFAULT ONBOARDING VIEW ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
          <Sparkles className="w-8 h-8 text-purple-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome to the Ambassador Program!</h1>
        <p className="text-gray-600 mt-2">Loading your onboarding progress...</p>
        <div className="mt-8 flex justify-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      </div>
    </div>
  );
};

export default AmbassadorPortal;