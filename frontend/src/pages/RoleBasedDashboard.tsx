// pages/RoleBasedDashboard.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const RoleBasedDashboard = () => {
  const { profile, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!profile) {
        navigate('/signin');
        return;
      }

      // Redirect based on role
      switch (profile.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'doctor':
          navigate('/doctor');
          break;
        case 'patient':
          navigate('/patient');
          break;
        case 'ambassador':
          navigate('/ambassador/portal');
          break;
        default:
          navigate('/signin');
      }
    }
  }, [profile, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return null;
};

export default RoleBasedDashboard;