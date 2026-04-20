// pages/auth/DoctorSignUp.tsx
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Stethoscope, Building2, MapPin, Phone, Mail, User, Lock, Award, Users } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';

const DoctorSignUp = () => {
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
    practiceName: '',
    specialization: '',
    hpcsaNumber: '',
    practiceAddress: '',
    consultationFee: '',
    acceptTerms: false,
  });
  const [loading, setLoading] = useState(false);

  const specializations = [
    'General Practitioner',
    'Cardiologist',
    'Dermatologist',
    'Endocrinologist',
    'Gastroenterologist',
    'Neurologist',
    'Obstetrician/Gynecologist',
    'Oncologist',
    'Ophthalmologist',
    'Orthopedic Surgeon',
    'Pediatrician',
    'Psychiatrist',
    'Pulmonologist',
    'Radiologist',
    'Urologist',
    'Dentist',
    'Physiotherapist',
    'Other',
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
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

    if (!formData.firstName || !formData.lastName) {
      toast({ 
        title: 'Missing details', 
        description: 'Please enter your first and last name.', 
        variant: 'destructive' 
      });
      return;
    }

    if (!formData.specialization) {
      toast({ 
        title: 'Missing details', 
        description: 'Please select your specialization.', 
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
        is_doctor: true,
        phone: formData.phone,
        // Additional doctor fields
        practice_name: formData.practiceName,
        specialization: formData.specialization,
        hpcsa_number: formData.hpcsaNumber,
        practice_address: formData.practiceAddress,
        consultation_fee: formData.consultationFee,
      });

      if (error) {
        let errorMsg = 'Signup failed';
        if (error.username) errorMsg = error.username[0];
        else if (error.email) errorMsg = error.email[0];
        else if (error.password) errorMsg = error.password[0];
        
        toast({ title: 'Sign up failed', description: errorMsg, variant: 'destructive' });
        return;
      }

      // Auto sign-in after signup
      const { error: loginError } = await signIn(formData.email, formData.password);
      
      if (loginError) {
        toast({ 
          title: 'Account Created', 
          description: 'Your account has been created. Please complete your profile setup.',
        });
        navigate('/doctor-enrollment');
      } else {
        toast({ 
          title: 'Welcome to MedMap', 
          description: 'Your doctor account has been created successfully. Please complete your profile.',
        });
        navigate('/doctor-enrollment');
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
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <Link to="/" className="text-3xl font-bold text-blue-600 mb-3 inline-block">
            MedMap
          </Link>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Stethoscope className="w-7 h-7 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Join as a Doctor</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            Create your account and start growing your practice with MedMap
          </p>
        </div>

        {/* Benefits Cards - Mobile Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 text-center">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 mx-auto mb-1 sm:mb-2" />
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-0.5">More Patients</h3>
            <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Reach thousands of patients</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-4 text-center">
            <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-green-600 mx-auto mb-1 sm:mb-2" />
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-0.5">Easy Scheduling</h3>
            <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Manage appointments effortlessly</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 sm:p-4 text-center">
            <Award className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600 mx-auto mb-1 sm:mb-2" />
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-0.5">Grow Practice</h3>
            <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Build your reputation</p>
          </div>
        </div>

        {/* Signup Form */}
        <Card className="w-full shadow-xl border-0">
          <CardHeader className="space-y-1 px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl">Doctor Registration</CardTitle>
            <CardDescription className="text-sm">
              Fill out the form below to create your doctor account. You'll be able to complete your full profile after registration.
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 px-4 sm:px-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm">First name *</Label>
                    <Input 
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="John"
                      disabled={loading}
                      className="h-10 sm:h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm">Last name *</Label>
                    <Input 
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Doe"
                      disabled={loading}
                      className="h-10 sm:h-11"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                      placeholder="doctor@example.com"
                      disabled={loading}
                      className="h-10 sm:h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm flex items-center gap-1">
                      <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                      Phone Number *
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
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Professional Information
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="specialization" className="text-sm">Specialization *</Label>
                  <Select 
                    value={formData.specialization} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, specialization: value }))}
                    disabled={loading}
                  >
                    <SelectTrigger className="h-10 sm:h-11">
                      <SelectValue placeholder="Select your specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      {specializations.map((spec) => (
                        <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hpcsaNumber" className="text-sm">HPCSA Number</Label>
                    <Input 
                      id="hpcsaNumber"
                      name="hpcsaNumber"
                      value={formData.hpcsaNumber}
                      onChange={handleChange}
                      placeholder="MP 0123456"
                      disabled={loading}
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consultationFee" className="text-sm">Consultation Fee (R)</Label>
                    <Input 
                      id="consultationFee"
                      name="consultationFee"
                      type="number"
                      value={formData.consultationFee}
                      onChange={handleChange}
                      placeholder="500"
                      disabled={loading}
                      className="h-10 sm:h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Practice Information */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Practice Information
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="practiceName" className="text-sm">Practice Name</Label>
                  <Input 
                    id="practiceName"
                    name="practiceName"
                    value={formData.practiceName}
                    onChange={handleChange}
                    placeholder="e.g., Sandton Medical Centre"
                    disabled={loading}
                    className="h-10 sm:h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="practiceAddress" className="text-sm flex items-center gap-1">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                    Practice Address
                  </Label>
                  <Input 
                    id="practiceAddress"
                    name="practiceAddress"
                    value={formData.practiceAddress}
                    onChange={handleChange}
                    placeholder="Street address, City, Province"
                    disabled={loading}
                    className="h-10 sm:h-11"
                  />
                </div>
              </div>

              {/* Terms Agreement */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start space-x-2">
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
                    . I confirm that I am a licensed medical practitioner.
                  </Label>
                </div>
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
                  'Create Doctor Account'
                )}
              </Button>
              
              <p className="text-xs sm:text-sm text-center text-gray-600">
                Already have an account?{' '}
                <Link to="/signin" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </Link>
              </p>
              
              <p className="text-xs text-center text-gray-500">
                After registration, you'll be directed to complete your full profile including practice details, availability, and verification documents.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default DoctorSignUp;