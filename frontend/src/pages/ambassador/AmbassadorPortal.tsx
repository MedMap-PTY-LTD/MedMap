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
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
} from 'lucide-react';

const AmbassadorPortal = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ambassadorData, setAmbassadorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAmbassadorData();
  }, [user]);

  const fetchAmbassadorData = async () => {
    if (!user) return;
    
    try {
      const ambassadorDoc = await getDoc(doc(db, 'ambassadors', user.uid));
      if (ambassadorDoc.exists()) {
        const data = ambassadorDoc.data();
        setAmbassadorData(data);
        
        // Check onboarding step and redirect if needed
        const step = data.onboardingStep || 1;
        
        if (step === 1) {
          // Check if psychometric test was already taken and failed
          if (data.psychometricTest?.passed === false) {
            const nextAttemptDate = data.psychometricTest?.nextAttemptDate?.toDate();
            if (nextAttemptDate && nextAttemptDate > new Date()) {
              // In cooldown period - stay on portal
              toast({
                title: 'Assessment Cooldown',
                description: `You can retake the psychometric assessment after ${nextAttemptDate.toLocaleDateString()}.`,
                variant: 'destructive',
              });
            } else if (nextAttemptDate && nextAttemptDate <= new Date()) {
              // Can retake - update onboarding step to allow retake
              await updateDoc(doc(db, 'ambassadors', user.uid), {
                onboardingStep: 1,
                'psychometricTest.passed': null,
              });
            }
          } else if (!data.psychometricTest?.passed && !data.psychometricTest?.attemptDate) {
            // Need to take psychometric test
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

  const handleCopyReferralCode = () => {
    if (ambassadorData?.referralCode) {
      navigator.clipboard.writeText(ambassadorData.referralCode);
      toast({ title: 'Copied!', description: 'Referral code copied to clipboard.' });
    }
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

  // Step 5: Approved Ambassador
  if (step === 5 && applicationStatus === 'approved') {
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Referred Doctors</p>
                    <p className="text-2xl font-bold">{ambassadorData?.totalReferredDoctors || 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Doctors</p>
                    <p className="text-2xl font-bold">{ambassadorData?.activeReferredDoctors || 0}</p>
                  </div>
                  <Heart className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Current Tier</p>
                    <div className="flex items-center gap-1">
                      <Award className="w-5 h-5 text-amber-600" />
                      <p className="text-2xl font-bold capitalize">{ambassadorData?.currentTier || 'Bronze'}</p>
                    </div>
                  </div>
                  <Star className="w-8 h-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Earnings</p>
                    <p className="text-2xl font-bold text-green-600">
                      R{(ambassadorData?.totalEarnings || 0).toLocaleString()}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
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
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-purple-600" />
                      Tier Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>Bronze (1-10 doctors)</span>
                        <span className="font-semibold">{ambassadorData?.activeReferredDoctors || 0} active</span>
                      </div>
                      <Progress value={Math.min(((ambassadorData?.activeReferredDoctors || 0) / 10) * 100, 100)} className="h-2" />
                      
                      {ambassadorData?.activeReferredDoctors >= 10 && (
                        <>
                          <div className="flex justify-between text-sm mt-4">
                            <span>Silver (11-50 doctors)</span>
                            <span className="font-semibold">{ambassadorData?.activeReferredDoctors || 0} active</span>
                          </div>
                          <Progress value={Math.min(((ambassadorData?.activeReferredDoctors - 10) / 40) * 100, 100)} className="h-2" />
                        </>
                      )}
                      
                      {ambassadorData?.activeReferredDoctors >= 50 && (
                        <>
                          <div className="flex justify-between text-sm mt-4">
                            <span>Gold (51-99 doctors)</span>
                            <span className="font-semibold">{ambassadorData?.activeReferredDoctors || 0} active</span>
                          </div>
                          <Progress value={Math.min(((ambassadorData?.activeReferredDoctors - 50) / 49) * 100, 100)} className="h-2" />
                        </>
                      )}
                      
                      {ambassadorData?.activeReferredDoctors >= 99 && (
                        <>
                          <div className="flex justify-between text-sm mt-4">
                            <span>Diamond (100+ doctors)</span>
                            <span className="font-semibold">{ambassadorData?.activeReferredDoctors || 0} active</span>
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
                  <CardTitle>Your Referred Doctors</CardTitle>
                  <CardDescription>Track the doctors you've brought to MedMap</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No referrals yet</p>
                    <p className="text-sm">Start sharing your referral code with doctors today!</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="earnings">
              <Card>
                <CardHeader>
                  <CardTitle>Commission History</CardTitle>
                  <CardDescription>Track your monthly earnings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No earnings yet</p>
                    <p className="text-sm">Start referring doctors to earn commission!</p>
                  </div>
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