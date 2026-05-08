// pages/EmailVerification.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '../../lib/firebase';
import { sendEmailVerification, onAuthStateChanged, signOut } from 'firebase/auth';
import { Mail, CheckCircle, RefreshCw, AlertCircle, ArrowRight, LogIn } from 'lucide-react';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  
  const email = searchParams.get('email') || user?.email || 'your email';

  useEffect(() => {
    // Check verification status
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser?.emailVerified) {
        setIsVerified(true);
        setCheckingStatus(false);
        toast({
          title: 'Email Verified!',
          description: 'Your email has been verified successfully. You can now sign in.',
        });
      } else {
        setCheckingStatus(false);
      }
    });
    
    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    // Countdown timer for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setResendDisabled(false);
    }
  }, [countdown]);

  const handleResendVerification = async () => {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      toast({
        title: 'No User Found',
        description: 'Please sign up first.',
        variant: 'destructive',
      });
      navigate('/signup');
      return;
    }
    
    if (currentUser.emailVerified) {
      setIsVerified(true);
      toast({
        title: 'Already Verified',
        description: 'Your email is already verified!',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      await sendEmailVerification(currentUser);
      
      toast({
        title: 'Verification Email Sent',
        description: `We've sent a new verification link to ${currentUser.email}`,
      });
      
      // Disable resend for 60 seconds
      setResendDisabled(true);
      setCountdown(60);
      
    } catch (error: any) {
      console.error('Resend error:', error);
      
      let errorMessage = 'Failed to send verification email.';
      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoToSignIn = async () => {
    // Sign out the current user so they can sign in fresh
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
    navigate('/signin');
  };

  const handleCheckVerification = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await currentUser.reload();
      if (currentUser.emailVerified) {
        setIsVerified(true);
        toast({
          title: 'Email Verified!',
          description: 'Your email has been verified. You can now sign in.',
        });
      } else {
        toast({
          title: 'Not Verified Yet',
          description: 'Please check your inbox and click the verification link.',
        });
      }
    }
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Checking verification status...</p>
        </div>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <CardTitle className="text-3xl text-green-700">Email Verified!</CardTitle>
            <CardDescription className="text-lg">
              Thank you for verifying your email address.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center space-y-6">
            <p className="text-gray-600">
              Your account is now fully activated. You can now sign in and access all features of MedMap.
            </p>
            
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Click below to sign in to your account.
              </p>
            </div>
            
            <Button onClick={handleGoToSignIn} className="w-full" size="lg">
              <LogIn className="w-4 h-4 mr-2" />
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-12 h-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription className="text-base">
            We sent a verification link to
          </CardDescription>
          <p className="text-lg font-semibold text-gray-900 mt-1">{email}</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Check your inbox</p>
                <p>Click the verification link in the email to activate your account. 
                   If you don't see it, check your spam folder.</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button
              onClick={handleCheckVerification}
              variant="outline"
              className="w-full"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              I've Verified My Email
            </Button>
            
            <Button
              onClick={handleResendVerification}
              disabled={loading || resendDisabled}
              variant="outline"
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : resendDisabled ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend available in {countdown}s
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend Verification Email
                </>
              )}
            </Button>
            
            <Button
              onClick={handleGoToSignIn}
              variant="ghost"
              className="w-full"
            >
              Back to Sign In
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          
          <div className="border-t pt-4">
            <p className="text-xs text-center text-gray-500">
              Wrong email?{' '}
              <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign up again
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerification;