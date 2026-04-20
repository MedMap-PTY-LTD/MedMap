// pages/auth/PatientSignUp.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/django-api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Mail, Lock, Phone } from 'lucide-react';

const PatientSignUp = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({ 
        title: 'Missing details', 
        description: 'Please enter email and password.', 
        variant: 'destructive' 
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({ 
        title: 'Password mismatch', 
        description: 'Passwords do not match.', 
        variant: 'destructive' 
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({ 
        title: 'Password too short', 
        description: 'Password must be at least 8 characters long.', 
        variant: 'destructive' 
      });
      return;
    }

    if (!formData.acceptTerms) {
      toast({ 
        title: 'Terms required', 
        description: 'Please accept the terms and conditions.', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await api.signup({
        email: formData.email,
        password: formData.password,
        username: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        is_patient: true,
        phone: formData.phone,
      });

      if (error) {
        let errorMsg = 'Signup failed';
        if (error.username) errorMsg = error.username[0];
        else if (error.email) errorMsg = error.email[0];
        else if (error.password) errorMsg = error.password[0];
        
        toast({ title: 'Sign up failed', description: errorMsg, variant: 'destructive' });
        return;
      }

      const { error: loginError } = await signIn(formData.email, formData.password);
      
      if (loginError) {
        toast({ title: 'Success', description: 'Account created. Please sign in.' });
        navigate('/signin');
      } else {
        toast({ title: 'Welcome', description: 'Account created successfully.' });
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast({ 
        title: 'Unexpected error', 
        description: err?.message || 'Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <Link to="/" className="text-3xl font-bold text-blue-600 mb-3 inline-block">
            MedMap
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Create Patient Account</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Sign up to book appointments and manage your healthcare
          </p>
        </div>

        <Card className="w-full shadow-xl border-0">
          <CardHeader className="space-y-1 px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl">Patient Registration</CardTitle>
            <CardDescription className="text-sm">
              Fill out the form below to create your account
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 px-4 sm:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm">First name</Label>
                  <Input 
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Jane"
                    disabled={loading}
                    className="h-10 sm:h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm">Last name</Label>
                  <Input 
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    disabled={loading}
                    className="h-10 sm:h-11"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm flex items-center gap-1">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                  Email *
                </Label>
                <Input 
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  disabled={loading}
                  className="h-10 sm:h-11"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm flex items-center gap-1">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                  Phone Number
                </Label>
                <Input 
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+27 12 345 6789"
                  disabled={loading}
                  className="h-10 sm:h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm flex items-center gap-1">
                  <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
                  Password *
                </Label>
                <Input 
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  disabled={loading}
                  className="h-10 sm:h-11"
                  required
                />
                <p className="text-xs text-gray-500">Minimum 8 characters</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm">Confirm Password *</Label>
                <Input 
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  disabled={loading}
                  className="h-10 sm:h-11"
                  required
                />
              </div>
              
              <div className="flex items-start space-x-2 pt-2">
                <Checkbox 
                  id="acceptTerms"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, acceptTerms: checked as boolean }))
                  }
                  disabled={loading}
                  className="mt-1"
                />
                <Label htmlFor="acceptTerms" className="text-xs sm:text-sm text-gray-600">
                  I agree to the{' '}
                  <Link to="/legal" className="text-blue-600 hover:text-blue-700" target="_blank">
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link to="/privacy-policy" className="text-blue-600 hover:text-blue-700" target="_blank">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-3 sm:space-y-4 px-4 sm:px-6 pb-6">
              <Button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 sm:h-11 text-sm sm:text-base"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating account...
                  </div>
                ) : (
                  'Create account'
                )}
              </Button>
              
              <p className="text-xs sm:text-sm text-center text-gray-600">
                Already have an account?{' '}
                <Link to="/signin" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default PatientSignUp;