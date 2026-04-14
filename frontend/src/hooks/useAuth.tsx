import { useState, useEffect, createContext, useContext } from 'react';
import { api, User as DjangoUser } from '@/lib/django-api';

// Adapt types to match what the app expects (Supabase-like)
interface Profile {
  full_name: any;
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: 'patient' | 'doctor' | 'admin';
  created_at?: string;
  updated_at?: string;
}

// Minimal mock of Supabase User
interface User {
  id: string;
  email?: string;
  user_metadata?: any;
}

interface AuthContextType {
  user: User | null;
  session: any | null; // We might not need a real session object
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const mapUserToState = (djangoUser: DjangoUser) => {
    const userIdStr = djangoUser.id.toString();
    
    const mappedUser: User = {
        id: userIdStr,
        email: djangoUser.email,
        user_metadata: {
            first_name: djangoUser.first_name,
            last_name: djangoUser.last_name,
        }
    };

    const mappedProfile: Profile = {
        id: userIdStr,
        email: djangoUser.email,
        role: djangoUser.role,
        first_name: djangoUser.first_name,
        last_name: djangoUser.last_name,
        phone: djangoUser.phone_number
    };

    setUser(mappedUser);
    setProfile(mappedProfile);
  };

  const fetchProfile = async () => {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            setUser(null);
            setProfile(null);
            return;
        }
        const userData = await api.getProfile(token);
        mapUserToState(userData);
    } catch (error) {
        console.error('Error fetching profile:', error);
        setUser(null);
        setProfile(null);
        localStorage.removeItem('access_token');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { user: djangoUser, error } = await api.login(email, password);
    if (djangoUser) {
        mapUserToState(djangoUser);
        return { error: null };
    }
    return { error };
  };

  const signOut = async () => {
    api.logout();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
      await fetchProfile();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session: user ? { user } : null, // Mock session
      profile,
      loading,
      signIn,
      signOut,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
