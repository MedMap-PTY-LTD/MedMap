// pages/InitialAdminSetup.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, Key, Mail, User, Lock, AlertTriangle, Loader2 } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, serverTimestamp } from 'firebase/firestore';

const InitialAdminSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    department: 'Management',
    secretKey: '',
  });

  // Check if admin already exists
  useEffect(() => {
    const checkAdminExists = async () => {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        );
        
        const checkPromise = getDocs(collection(db, 'admins'));
        
        const adminsSnapshot = await Promise.race([checkPromise, timeoutPromise]) as any;
        
        if (!adminsSnapshot.empty) {
          setAdminExists(true);
          console.log('Admin already exists');
        } else {
          console.log('No admin found, ready for setup');
        }
      } catch (error: any) {
        console.error('Error checking admin:', error);
        // If we can't check, assume no admin exists
        setAdminExists(false);
        toast({
          title: 'Database Connection Issue',
          description: 'Running in setup mode. You may need to configure Firestore rules.',
          variant: 'destructive',
        });
      } finally {
        setChecking(false);
      }
    };
    
    checkAdminExists();
  }, [toast]);

  // Update the handleSubmit function in InitialAdminSetup.tsx

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const MASTER_SECRET = import.meta.env.VITE_ADMIN_MASTER_SECRET || 'medmap-admin-master-secret-2026';
  
  if (formData.secretKey !== MASTER_SECRET) {
    toast({
      title: 'Invalid Secret Key',
      description: 'Use: medmap-admin-master-secret-2026',
      variant: 'destructive',
    });
    return;
  }
  
  if (formData.password !== formData.confirmPassword) {
    toast({
      title: 'Password Mismatch',
      description: 'Passwords do not match.',
      variant: 'destructive',
    });
    return;
  }
  
  setLoading(true);
  setCurrentStep('Creating admin account...');
  
  try {
    // Create the user
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      formData.email, 
      formData.password
    );
    const user = userCredential.user;
    
    console.log('✅ Auth user created:', user.uid);
    setCurrentStep('Authentication created! Saving profile...');
    
    // Create admin profile
    const adminProfile = {
      uid: user.uid,
      email: formData.email,
      emailVerified: true,
      firstName: formData.firstName,
      lastName: formData.lastName,
      fullName: `${formData.firstName} ${formData.lastName}`.trim(),
      role: 'admin',
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    // Save to Firestore
    await setDoc(doc(db, 'users', user.uid), adminProfile);
    console.log('✅ User profile saved');
    
    await setDoc(doc(db, 'admins', user.uid), {
      uid: user.uid,
      adminLevel: 'super',
      permissions: ['all'],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log('✅ Admin profile saved');
    
    setCurrentStep('Success! Redirecting to sign in...');
    
    toast({
      title: '🎉 Admin Account Created!',
      description: 'Redirecting you to the sign in page...',
      duration: 3000,
    });
    
    // Redirect after short delay
    setTimeout(() => {
      navigate('/signin');
    }, 2000);
    
  } catch (error: any) {
    console.error('Error:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      toast({
        title: 'Account Already Exists',
        description: 'This email is already registered. Try signing in instead.',
        action: {
          label: 'Sign In',
          onClick: () => navigate('/signin')
        }
      });
    } else {
      toast({
        title: 'Setup Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
    setCurrentStep('');
  } finally {
    setLoading(false);
  }
};

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Checking system status...</p>
        </div>
      </div>
    );
  }

  if (adminExists) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Admin Already Exists</CardTitle>
            <CardDescription>
              An administrator account has already been created.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              For security reasons, the initial admin setup can only be run once.
            </p>
            <Button onClick={() => navigate('/signin')} className="w-full">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Initial Admin Setup</CardTitle>
          <CardDescription>
            Create the first administrator account
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                <strong>⚠️ Secret Key:</strong> medmap-admin-master-secret-2026
              </p>
            </div>
            
            {currentStep && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {currentStep}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="secretKey" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Master Secret Key
              </Label>
              <Input
                id="secretKey"
                type="password"
                value={formData.secretKey}
                onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                placeholder="Enter master secret key"
                required
                autoComplete="off"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  First Name
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                  required
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                  required
                  autoComplete="off"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Admin Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@medmap.co.za"
                required
                autoComplete="off"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password (min 8 characters)
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                autoComplete="new-password"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                autoComplete="new-password"
              />
            </div>
          </CardContent>
          
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {currentStep || 'Creating Admin Account...'}
                </>
              ) : (
                'Create Initial Admin'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default InitialAdminSetup;