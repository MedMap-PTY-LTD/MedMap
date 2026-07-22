// hooks/useAuth.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth, authService, UserProfile, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useToast } from './use-toast';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, profileData: any) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<any>;
  resendVerification: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Subscribe to user profile
        const profileUnsubscribe = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (snapshot) => {
            if (snapshot.exists()) {
              const profileData = snapshot.data() as UserProfile;
              setProfile(profileData);
            } else {
              // If profile doesn't exist in Firestore but user is authenticated
              console.log('User authenticated but no profile found in Firestore');
            }
            setLoading(false);
          },
          (error) => {
            console.error('Profile subscription error:', error);
            setLoading(false);
          }
        );
        
        return () => profileUnsubscribe();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, profileData: any) => {
    const result = await authService.signUp(email, password, profileData);
    
    if (result.error) {
      toast({
        title: 'Sign Up Failed',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Verification Email Sent',
        description: 'Please check your inbox and verify your email address.',
      });
    }
    
    return result;
  };

  const signIn = async (email: string, password: string) => {
    const result = await authService.signIn(email, password);
    
    if (result.error) {
      toast({
        title: 'Sign In Failed',
        description: result.error,
        variant: 'destructive',
      });
    } else if (result.user && result.profile) {
      toast({
        title: 'Welcome Back',
        description: `Signed in as ${result.profile.fullName || email}`,
      });
    }
    
    return result;
  };

  const signOut = async () => {
    const result = await authService.signOut();
    
    if (result.error) {
      toast({
        title: 'Sign Out Failed',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Signed Out',
        description: 'You have been signed out successfully.',
      });
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return { error: 'No user logged in' };
    return await authService.updateProfile(user.uid, data);
  };

  const resendVerification = async () => {
    return await authService.resendVerificationEmail();
  };

  const value = {
    user,
    profile,
    loading,
    isLoading: loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resendVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}