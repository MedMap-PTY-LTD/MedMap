// pages/ambassador/AmbassadorPortal.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import TrainingModule from './TrainingModule';
import KnowledgeTest from './KnowledgeTest';
import {
  Award,
  BookOpen,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Brain,
  GraduationCap,
  Video,
  Gift,
  Star,
  Target,
  Heart,
  Sparkles,
  ChevronRight,
  Stethoscope,
  Mail,
  Phone,
  Calendar,
  Search,
  Filter,
  Eye,
  User,
  Building2,
  CreditCard,
} from 'lucide-react';

const AmbassadorPortal = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ambassadorData, setAmbassadorData] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referralStats, setReferralStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchAmbassadorData();
  }, [user]);

  const fetchAmbassadorData = async () => {
    if (!user) return;
    
    try {
      // Get ambassador data
      const ambassadorDoc = await getDoc(doc(db, 'ambassadors', user.uid));
      if (ambassadorDoc.exists()) {
        const data = ambassadorDoc.data();
        setAmbassadorData(data);
        
        // Check if approved and has referral code
        if (data.applicationStatus === 'approved' && data.referralCode) {
          await fetchReferrals(user.uid);
        }
        
        // Check onboarding step and redirect if needed
        const step = data.onboardingStep || 1;
        
        if (step === 1) {
          if (data.psychometricTest?.passed === false) {
            const nextAttemptDate = data.psychometricTest?.nextAttemptDate?.toDate();
            if (nextAttemptDate && nextAttemptDate > new Date()) {
              toast({
                title: 'Assessment Cooldown',
                description: `You can retake the psychometric assessment after ${nextAttemptDate.toLocaleDateString()}.`,
                variant: 'destructive',
              });
            } else if (nextAttemptDate && nextAttemptDate <= new Date()) {
              await updateDoc(doc(db, 'ambassadors', user.uid), {
                onboardingStep: 1,
                'psychometricTest.passed': null,
              });
            }
          } else if (!data.psychometricTest?.passed && !data.psychometricTest?.attemptDate) {
            navigate('/ambassador/psychometric-test');
          }
        }
      } else {
        toast({
          title: 'Error',
          description: 'Ambassador profile not found. Please contact support.',
          variant: 'destructive',
        });
        navigate('/');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching ambassador data:', error);
      toast({ title: 'Error', description: 'Failed to load ambassador data.', variant: 'destructive' });
      setLoading(false);
    }
  };

  const fetchReferrals = async (ambassadorId: string) => {
    try {
      // Get referrals from Firestore directly
      const referralsRef = collection(db, 'referrals');
      const q = query(
        referralsRef,
        where('ambassadorId', '==', ambassadorId)
      );
      const snapshot = await getDocs(q);
      
      const referralsList: any[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Get doctor details
        let doctorFullName = data.doctorName || 'Unknown Doctor';
        let doctorEmail = data.doctorEmail || '';
        let doctorSpecialization = 'N/A';
        let doctorVerificationStatus = data.status || 'pending';
        let doctorIsActive = false;
        
        if (data.doctorId) {
          try {
            const doctorDoc = await getDoc(doc(db, 'doctors', data.doctorId));
            if (doctorDoc.exists()) {
              const doctorData = doctorDoc.data();
              doctorSpecialization = doctorData.specialization || 'N/A';
              doctorVerificationStatus = doctorData.verificationStatus || data.status || 'pending';
            }
            
            const userDoc = await getDoc(doc(db, 'users', data.doctorId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              doctorFullName = userData.fullName || doctorFullName;
              doctorEmail = userData.email || doctorEmail;
              doctorIsActive = userData.isActive || false;
            }
          } catch (e) {
            console.error('Error fetching doctor details:', e);
          }
        }
        
        referralsList.push({
          id: docSnap.id,
          ...data,
          doctorFullName,
          doctorEmail,
          doctorSpecialization,
          doctorVerificationStatus,
          doctorIsActive,
          referredAt: data.referredAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          verifiedAt: data.verifiedAt?.toDate?.()?.toISOString() || null,
          commissionEarned: data.commissionEarned || 0,
          commissionPaid: data.commissionPaid || false,
          status: data.status || 'pending',
        });
      }
      
      setReferrals(referralsList);
      
      // Calculate stats
      const stats = {
        totalReferrals: referralsList.length,
        pendingReferrals: referralsList.filter(r => r.status === 'pending').length,
        verifiedReferrals: referralsList.filter(r => r.status === 'verified').length,
        rejectedReferrals: referralsList.filter(r => r.status === 'rejected').length,
        totalCommission: referralsList
          .filter(r => r.status === 'verified')
          .reduce((sum, r) => sum + (r.commissionEarned || 0), 0),
        activeDoctors: referralsList.filter(r => r.status === 'verified' && r.doctorIsActive).length,
        pendingCommission: referralsList
          .filter(r => r.status === 'verified' && !r.commissionPaid)
          .reduce((sum, r) => sum + (r.commissionEarned || 0), 0),
        paidCommission: referralsList
          .filter(r => r.status === 'verified' && r.commissionPaid)
          .reduce((sum, r) => sum + (r.commissionEarned || 0), 0),
      };
      
      setReferralStats(stats);
      
    } catch (error) {
      console.error('Error fetching referrals:', error);
      toast({ title: 'Error', description: 'Failed to load referrals.', variant: 'destructive' });
    }
  };

  const handleCopyReferralCode = () => {
    if (ambassadorData?.referralCode) {
      navigator.clipboard.writeText(ambassadorData.referralCode);
      toast({ title: 'Copied!', description: 'Referral code copied to clipboard.' });
    }
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

  const getFilteredReferrals = () => {
    let filtered = referrals;
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.doctorFullName?.toLowerCase().includes(term) ||
        r.doctorEmail?.toLowerCase().includes(term) ||
        r.doctorSpecialization?.toLowerCase().includes(term) ||
        r.referralCode?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const step = ambassadorData?.onboardingStep || 1;
  const psychometricPassed = ambassadorData?.psychometricTest?.passed;
  const psychometricScore = ambassadorData?.psychometricTest?.score;
  const nextAttemptDate = ambassadorData?.psychometricTest?.nextAttemptDate?.toDate();
  const trainingCompleted = ambassadorData?.trainingModule?.completed;
  const knowledgePassed = ambassadorData?.knowledgeTest?.passed;
  const knowledgeScore = ambassadorData?.knowledgeTest?.score;
  const knowledgeAttempts = ambassadorData?.knowledgeTest?.attempts || 0;
  const interviewStatus = ambassadorData?.interviewStatus;
  const applicationStatus = ambassadorData?.applicationStatus;

  // Step 2: Failed psychometric - Show cooldown
  if (step === 2 && psychometricPassed === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle>Assessment Cooldown Period</CardTitle>
            <CardDescription>
              Your psychometric assessment did not meet the required threshold.
            </CardDescription>
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
                <p className="text-sm text-yellow-800">
                  You can retake the assessment on:
                </p>
                <p className="text-xl font-bold text-yellow-900 mt-1">
                  {nextAttemptDate.toLocaleDateString('en-ZA', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
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

  // Step 3: Knowledge Test (after training completed)
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
            <CardDescription>
              You have successfully passed the knowledge test!
            </CardDescription>
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
            <CardDescription>
              Your interview has been scheduled with our team.
            </CardDescription>
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
            <CardDescription>
              Thank you for your interest in becoming a MedMap Ambassador.
            </CardDescription>
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

  // Step 5: Approved Ambassador - Full Dashboard
  if (step === 5 && applicationStatus === 'approved') {
    const filteredReferrals = getFilteredReferrals();
    
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">Ambassador Dashboard</h1>
                <p className="text-purple-100 mt-1">Welcome back, {profile?.firstName}!</p>
              </div>
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Total Referrals</p>
                    <p className="text-xl font-bold">{referralStats?.totalReferrals || 0}</p>
                  </div>
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Active Doctors</p>
                    <p className="text-xl font-bold">{referralStats?.activeDoctors || 0}</p>
                  </div>
                  <Heart className="w-6 h-6 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Pending</p>
                    <p className="text-xl font-bold text-yellow-600">{referralStats?.pendingReferrals || 0}</p>
                  </div>
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Current Tier</p>
                    <div className="flex items-center gap-1">
                      <Award className="w-4 h-4 text-amber-600" />
                      <p className="text-xl font-bold capitalize">{ambassadorData?.currentTier || 'Bronze'}</p>
                    </div>
                  </div>
                  <Star className="w-6 h-6 text-amber-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Total Earnings</p>
                    <p className="text-xl font-bold text-green-600">
                      R{(referralStats?.totalCommission || 0).toLocaleString()}
                    </p>
                  </div>
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="referrals" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="referrals">Referrals</TabsTrigger>
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
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
                        <Button size="sm" onClick={handleCopyReferralCode}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Share this code with doctors when they sign up for MedMap. Each doctor you refer is permanently linked to you.
                      </p>
                    </div>
                    <div className="mt-4">
                      <Button 
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        onClick={() => {
                          const link = `${window.location.origin}/doctor-enrollment?ref=${ambassadorData?.referralCode}`;
                          navigator.clipboard.writeText(link);
                          toast({ title: 'Copied!', description: 'Referral link copied to clipboard.' });
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Full Referral Link
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-purple-600" />
                      Tier Progress
                    </CardTitle>
                    <CardDescription>Refer more doctors to unlock higher tiers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>Bronze (1-10 doctors)</span>
                        <span className="font-semibold">{referralStats?.activeDoctors || 0} active</span>
                      </div>
                      <Progress value={Math.min(((referralStats?.activeDoctors || 0) / 10) * 100, 100)} className="h-2" />
                      
                      {referralStats?.activeDoctors >= 10 && (
                        <>
                          <div className="flex justify-between text-sm mt-4">
                            <span>Silver (11-50 doctors)</span>
                            <span className="font-semibold">{referralStats?.activeDoctors || 0} active</span>
                          </div>
                          <Progress value={Math.min(((referralStats?.activeDoctors - 10) / 40) * 100, 100)} className="h-2" />
                        </>
                      )}
                      
                      {referralStats?.activeDoctors >= 50 && (
                        <>
                          <div className="flex justify-between text-sm mt-4">
                            <span>Gold (51-99 doctors)</span>
                            <span className="font-semibold">{referralStats?.activeDoctors || 0} active</span>
                          </div>
                          <Progress value={Math.min(((referralStats?.activeDoctors - 50) / 49) * 100, 100)} className="h-2" />
                        </>
                      )}
                      
                      {referralStats?.activeDoctors >= 99 && (
                        <>
                          <div className="flex justify-between text-sm mt-4">
                            <span>Diamond (100+ doctors)</span>
                            <span className="font-semibold">{referralStats?.activeDoctors || 0} active</span>
                          </div>
                          <Progress value={100} className="h-2" />
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="referrals">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-purple-600" />
                        Doctors You've Referred
                      </CardTitle>
                      <CardDescription>
                        Track the doctors who signed up using your referral code
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-100 text-purple-800">
                        Total: {referrals.length}
                      </Badge>
                      <Badge className="bg-green-100 text-green-800">
                        Verified: {referrals.filter(r => r.status === 'verified').length}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
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
                    <div className="flex gap-2">
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
                  </div>

                  {referrals.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No referrals yet</p>
                      <p className="text-sm">Start sharing your referral code with doctors today!</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={handleCopyReferralCode}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Your Referral Code
                      </Button>
                    </div>
                  ) : filteredReferrals.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No matching referrals</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Mobile Card View */}
                      <div className="block lg:hidden space-y-4">
                        {filteredReferrals.map((referral) => (
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
                                    <Badge className={getStatusBadge(referral.status)}>
                                      {referral.status}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Commission</p>
                                    <p className="font-medium text-green-600">
                                      R{referral.commissionEarned || 0}
                                    </p>
                                  </div>
                                </div>
                                {referral.verifiedAt && (
                                  <p className="text-xs text-gray-400 mt-2">
                                    Verified: {formatDate(referral.verifiedAt)}
                                  </p>
                                )}
                                {referral.rejectionReason && (
                                  <p className="text-xs text-red-600 mt-2">
                                    Reason: {referral.rejectionReason}
                                  </p>
                                )}
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
                              <th className="text-left py-3 px-4 text-sm font-semibold">Commission</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredReferrals.map((referral) => (
                              <tr key={referral.id} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4">
                                  <div>
                                    <p className="font-medium text-sm">{referral.doctorFullName}</p>
                                    <p className="text-xs text-gray-600">{referral.doctorEmail}</p>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  {referral.doctorSpecialization || 'N/A'}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  {formatDate(referral.referredAt)}
                                </td>
                                <td className="py-3 px-4">
                                  <Badge className={getStatusBadge(referral.status)}>
                                    {referral.status}
                                  </Badge>
                                  {referral.verifiedAt && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      Verified: {formatDate(referral.verifiedAt)}
                                    </p>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-medium text-green-600">
                                    R{referral.commissionEarned || 0}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {filteredReferrals.length > 0 && (
                        <div className="text-sm text-gray-500 text-center pt-4">
                          Showing {filteredReferrals.length} of {referrals.length} referrals
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="earnings">
              <Card>
                <CardHeader>
                  <CardTitle>Commission History</CardTitle>
                  <CardDescription>Track your monthly earnings from referrals</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <p className="text-sm text-gray-600">Total Earned</p>
                      <p className="text-2xl font-bold text-green-700">
                        R{(referralStats?.totalCommission || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg text-center">
                      <p className="text-sm text-gray-600">Pending Commission</p>
                      <p className="text-2xl font-bold text-yellow-700">
                        R{(referralStats?.pendingCommission || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <p className="text-sm text-gray-600">Paid Commission</p>
                      <p className="text-2xl font-bold text-blue-700">
                        R{(referralStats?.paidCommission || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {referrals.filter(r => r.status === 'verified').length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No earnings yet</p>
                      <p className="text-sm">Commission is earned when referred doctors get verified</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={handleCopyReferralCode}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Share Your Referral Code
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {referrals
                        .filter(r => r.status === 'verified')
                        .map((referral) => (
                          <div key={referral.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{referral.doctorFullName}</p>
                              <p className="text-sm text-gray-500">{referral.doctorSpecialization || 'General Practice'}</p>
                              <p className="text-xs text-gray-400">Verified: {formatDate(referral.verifiedAt)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">R{referral.commissionEarned || 0}</p>
                              <Badge className={referral.commissionPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                {referral.commissionPaid ? 'Paid' : 'Pending'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Default onboarding view (should not reach here normally)
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
          <Sparkles className="w-8 h-8 text-purple-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome to the Ambassador Program!</h1>
        <p className="text-gray-600 mt-2">Loading your onboarding progress...</p>
        <div className="mt-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    </div>
  );
};

export default AmbassadorPortal;