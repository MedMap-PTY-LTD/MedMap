// pages/auth/AmbassadorSignUp.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Award, Users, TrendingUp, Phone, Mail, User, Lock, Briefcase, Heart, CreditCard } from 'lucide-react';

const AmbassadorSignUp = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    idNumber: '',
    password: '',
    confirmPassword: '',
    referralSource: '',
    experience: '',
    motivation: '',
    acceptTerms: false,
    acceptProgramRules: false,
  });
  const [loading, setLoading] = useState(false);

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
    
    if (!formData.email || !formData.password) {
      toast({ title: 'Missing details', description: 'Please enter email and password.', variant: 'destructive' });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({ title: 'Password mismatch', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }

    if (formData.password.length < 8) {
      toast({ title: 'Password too short', description: 'Password must be at least 8 characters long.', variant: 'destructive' });
      return;
    }

    if (!formData.firstName || !formData.lastName) {
      toast({ title: 'Missing details', description: 'Please enter your first and last name.', variant: 'destructive' });
      return;
    }

    if (!formData.idNumber || formData.idNumber.length !== 13) {
      toast({ title: 'Invalid ID Number', description: 'Please enter a valid 13-digit South African ID number.', variant: 'destructive' });
      return;
    }

    if (!formData.acceptTerms || !formData.acceptProgramRules) {
      toast({ title: 'Agreement required', description: 'Please accept all terms and conditions.', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      
      const { user, profile, error } = await signUp(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || null,
        idNumber: formData.idNumber,
        role: 'ambassador',
        referralSource: formData.referralSource || '',
        experience: formData.experience || '',
        motivation: formData.motivation || '',
      });

      if (error) {
        toast({ title: 'Sign up failed', description: error, variant: 'destructive' });
        return;
      }

      toast({
        title: 'Application Submitted!',
        description: 'We\'ve sent a verification link to your email. Please verify your email to access the ambassador portal.',
        duration: 8000,
      });
      
      navigate(`/verify-email?email=${encodeURIComponent(formData.email)}&role=ambassador`);
      
    } catch (err: any) {
      console.error('Signup error:', err);
      toast({ title: 'Unexpected error', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <Link to="/" className="text-3xl font-bold text-purple-600 mb-3 inline-block">MedMap</Link>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Award className="w-7 h-7 text-purple-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Become an Ambassador</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">Join our ambassador program and earn monthly commission</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 sm:p-4 text-center border border-purple-200">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600 mx-auto mb-1 sm:mb-2" />
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-0.5">Build Your Network</h3>
            <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Refer doctors and grow</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 text-center border border-blue-200">
            <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 mx-auto mb-1 sm:mb-2" />
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-0.5">Earn Monthly</h3>
            <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Up to 20% commission</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-4 text-center border border-green-200">
            <Award className="w-6 h-6 sm:w-7 sm:h-7 text-green-600 mx-auto mb-1 sm:mb-2" />
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-0.5">Tiered Rewards</h3>
            <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Bronze to Diamond</p>
          </div>
        </div>

        <Card className="w-full shadow-xl border-0">
          <CardHeader className="space-y-1 px-4 sm:px-6 border-b border-gray-100">
            <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              Ambassador Application
            </CardTitle>
            <CardDescription className="text-sm">
              Fill out the form below. After email verification, you'll complete a psychometric assessment.
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 px-4 sm:px-6 pt-6">
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm">First name *</Label>
                    <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="John" disabled={loading} className="h-10 sm:h-11" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm">Last name *</Label>
                    <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Doe" disabled={loading} className="h-10 sm:h-11" required />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="idNumber" className="text-sm flex items-center gap-1">
                    <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />
                    SA ID Number *
                  </Label>
                  <Input id="idNumber" name="idNumber" value={formData.idNumber} onChange={handleChange} placeholder="13-digit ID number" disabled={loading} className="h-10 sm:h-11" required maxLength={13} pattern="[0-9]{13}" />
                  <p className="text-xs text-gray-500">Required for psychometric assessment registration</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm flex items-center gap-1">
                      <Mail className="w-3 h-3 sm:w-4 sm:h-4" />Email *
                    </Label>
                    <Input id="email" name="email" type="email" autoComplete="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" disabled={loading} className="h-10 sm:h-11" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm flex items-center gap-1">
                      <Phone className="w-3 h-3 sm:w-4 sm:h-4" />Phone Number *
                    </Label>
                    <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+27 12 345 6789" disabled={loading} className="h-10 sm:h-11" required />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm flex items-center gap-1">
                      <Lock className="w-3 h-3 sm:w-4 sm:h-4" />Password *
                    </Label>
                    <Input id="password" name="password" type="password" autoComplete="new-password" value={formData.password} onChange={handleChange} placeholder="••••••••" disabled={loading} className="h-10 sm:h-11" required />
                    <p className="text-xs text-gray-500">Minimum 8 characters</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm">Confirm Password *</Label>
                    <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" disabled={loading} className="h-10 sm:h-11" required />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  Ambassador Information
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="referralSource" className="text-sm">How did you hear about the Ambassador Program?</Label>
                  <Input id="referralSource" name="referralSource" value={formData.referralSource} onChange={handleChange} placeholder="e.g., Social media, Referral, Search engine" disabled={loading} className="h-10 sm:h-11" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="experience" className="text-sm">Do you have experience in healthcare or business development?</Label>
                  <Textarea id="experience" name="experience" value={formData.experience} onChange={handleChange} placeholder="Please describe any relevant experience..." disabled={loading} rows={3} className="resize-none" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="motivation" className="text-sm flex items-center gap-1">
                    <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                    Why do you want to become a MedMap Ambassador? *
                  </Label>
                  <Textarea id="motivation" name="motivation" value={formData.motivation} onChange={handleChange} placeholder="Tell us why you're interested in this opportunity..." disabled={loading} rows={3} className="resize-none" required />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start space-x-2">
                  <Checkbox id="acceptTerms" name="acceptTerms" checked={formData.acceptTerms} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, acceptTerms: checked as boolean }))} disabled={loading} className="mt-1" />
                  <Label htmlFor="acceptTerms" className="text-xs sm:text-sm text-gray-600">
                    I agree to the{' '}
                    <Link to="/legal" className="text-purple-600 hover:text-purple-700" target="_blank">Terms of Service</Link>
                    {' '}and{' '}
                    <Link to="/privacy-policy" className="text-purple-600 hover:text-purple-700" target="_blank">Privacy Policy</Link>
                  </Label>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox id="acceptProgramRules" name="acceptProgramRules" checked={formData.acceptProgramRules} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, acceptProgramRules: checked as boolean }))} disabled={loading} className="mt-1" />
                  <Label htmlFor="acceptProgramRules" className="text-xs sm:text-sm text-gray-600">
                    I have read and agree to the{' '}
                    <Link to="/ambassador-programme" className="text-purple-600 hover:text-purple-700" target="_blank">Ambassador Program Rules & Guidelines</Link>
                  </Label>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-3 sm:space-y-4 px-4 sm:px-6 pb-6">
              <Button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white h-11 sm:h-12 text-sm sm:text-base shadow-lg hover:shadow-xl transition-all">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting application...
                  </div>
                ) : (
                  'Submit Application'
                )}
              </Button>
              
              <p className="text-xs sm:text-sm text-center text-gray-600">
                Already have an account?{' '}
                <Link to="/signin" className="text-purple-600 hover:text-purple-700 font-medium">Sign in</Link>
              </p>
              
              <p className="text-xs text-center text-gray-500">
                After verification, you'll complete a psychometric assessment as part of the application process.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AmbassadorSignUp;