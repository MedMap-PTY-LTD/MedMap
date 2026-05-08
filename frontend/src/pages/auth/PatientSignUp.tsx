// pages/auth/PatientSignUp.tsx
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Calendar, 
  Heart, 
  CreditCard, 
  AlertCircle,
  Users,
  Building2,
  Pill,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const PatientSignUp = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    idNumber: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
    // Medical Aid Information
    hasMedicalAid: false,
    medicalAidProvider: '',
    medicalAidNumber: '',
    // Emergency Contact (Next of Kin)
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    // Medical Information
    allergies: '',
    chronicConditions: '',
    currentMedications: '',
    acceptTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [showMedicalAid, setShowMedicalAid] = useState(false);
  const [showMedicalInfo, setShowMedicalInfo] = useState(false);

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

    if (!formData.idNumber) {
      toast({ 
        title: 'Missing details', 
        description: 'Please enter your ID number.', 
        variant: 'destructive' 
      });
      return;
    }

    if (formData.idNumber.length !== 13) {
      toast({ 
        title: 'Invalid ID Number', 
        description: 'Please enter a valid 13-digit South African ID number.', 
        variant: 'destructive' 
      });
      return;
    }

    if (!formData.emergencyName || !formData.emergencyPhone) {
      toast({ 
        title: 'Missing details', 
        description: 'Please provide emergency contact information.', 
        variant: 'destructive' 
      });
      return;
    }

    if (formData.hasMedicalAid && (!formData.medicalAidProvider || !formData.medicalAidNumber)) {
      toast({ 
        title: 'Missing details', 
        description: 'Please provide your medical aid details.', 
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
      
      // Prepare emergency contact object
      const emergencyContact = {
        name: formData.emergencyName,
        relationship: formData.emergencyRelationship || 'Not specified',
        phone: formData.emergencyPhone,
      };

      // Prepare allergies array
      const allergiesList = formData.allergies 
        ? formData.allergies.split(',').map(item => item.trim()).filter(item => item)
        : [];

      // Prepare chronic conditions array
      const conditionsList = formData.chronicConditions 
        ? formData.chronicConditions.split(',').map(item => item.trim()).filter(item => item)
        : [];

      // Prepare medications array
      const medicationsList = formData.currentMedications 
        ? formData.currentMedications.split(',').map(item => item.trim()).filter(item => item)
        : [];

      // Sign up with Firebase
      const { user, profile, error } = await signUp(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || null,
        role: 'patient',
        idNumber: formData.idNumber,
        dateOfBirth: formData.dateOfBirth || null,
        // Medical Aid
        medicalAidProvider: formData.hasMedicalAid ? formData.medicalAidProvider : null,
        medicalAidNumber: formData.hasMedicalAid ? formData.medicalAidNumber : null,
        // Emergency Contact
        emergencyContact: emergencyContact,
        // Medical Information
        allergies: allergiesList,
        chronicConditions: conditionsList,
        medications: medicationsList,
      });

      if (error) {
        toast({ 
          title: 'Sign up failed', 
          description: error, 
          variant: 'destructive' 
        });
        return;
      }

      toast({
        title: 'Account Created!',
        description: 'We\'ve sent a verification link to your email. Please verify your email before signing in.',
        duration: 8000,
      });
      
      // Redirect to verification page
      navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`);
      
    } catch (err: any) {
      console.error('Signup error:', err);
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
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <Link to="/" className="text-3xl font-bold text-blue-600 mb-3 inline-block">
            MedMap
          </Link>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="w-7 h-7 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create Patient Account</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            Sign up to book appointments and manage your healthcare
          </p>
        </div>

        <Card className="w-full shadow-xl border-0">
          <CardHeader className="space-y-1 px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl">Patient Registration</CardTitle>
            <CardDescription className="text-sm">
              Fill out the form below to create your account. All medical information is kept confidential.
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
                      placeholder="Jane"
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
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                    <Label htmlFor="dateOfBirth" className="text-sm flex items-center gap-1">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                      Date of Birth
                    </Label>
                    <Input 
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      disabled={loading}
                      className="h-10 sm:h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="idNumber" className="text-sm flex items-center gap-1">
                    <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />
                    SA ID Number *
                  </Label>
                  <Input 
                    id="idNumber"
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleChange}
                    placeholder="13-digit ID number"
                    disabled={loading}
                    className="h-10 sm:h-11"
                    required
                    maxLength={13}
                    pattern="[0-9]{13}"
                  />
                  <p className="text-xs text-gray-500">This cannot be changed later</p>
                </div>
              </div>

              {/* Emergency Contact (Next of Kin) */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                  Emergency Contact (Next of Kin) *
                </h3>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-red-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>This person will be contacted in case of an emergency during your appointments.</span>
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyName" className="text-sm">Full Name *</Label>
                    <Input 
                      id="emergencyName"
                      name="emergencyName"
                      value={formData.emergencyName}
                      onChange={handleChange}
                      placeholder="John Doe"
                      disabled={loading}
                      className="h-10 sm:h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyRelationship" className="text-sm">Relationship</Label>
                    <Select 
                      value={formData.emergencyRelationship} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, emergencyRelationship: value }))}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-10 sm:h-11">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Spouse">Spouse</SelectItem>
                        <SelectItem value="Parent">Parent</SelectItem>
                        <SelectItem value="Child">Child</SelectItem>
                        <SelectItem value="Sibling">Sibling</SelectItem>
                        <SelectItem value="Partner">Partner</SelectItem>
                        <SelectItem value="Friend">Friend</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone" className="text-sm flex items-center gap-1">
                    <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                    Contact Number *
                  </Label>
                  <Input 
                    id="emergencyPhone"
                    name="emergencyPhone"
                    type="tel"
                    value={formData.emergencyPhone}
                    onChange={handleChange}
                    placeholder="+27 12 345 6789"
                    disabled={loading}
                    className="h-10 sm:h-11"
                    required
                  />
                </div>
              </div>

              {/* Medical Aid Information */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    Medical Aid
                  </h3>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="hasMedicalAid" className="text-sm">I have medical aid</Label>
                    <Checkbox 
                      id="hasMedicalAid"
                      name="hasMedicalAid"
                      checked={formData.hasMedicalAid}
                      onCheckedChange={(checked) => {
                        setFormData(prev => ({ ...prev, hasMedicalAid: checked as boolean }));
                        setShowMedicalAid(checked as boolean);
                      }}
                      disabled={loading}
                    />
                  </div>
                </div>
                
                {formData.hasMedicalAid && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pl-0 sm:pl-2 border-l-2 border-green-200">
                    <div className="space-y-2">
                      <Label htmlFor="medicalAidProvider" className="text-sm">Medical Aid Provider *</Label>
                      <Select 
                        value={formData.medicalAidProvider} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, medicalAidProvider: value }))}
                        disabled={loading}
                      >
                        <SelectTrigger className="h-10 sm:h-11">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Discovery Health">Discovery Health</SelectItem>
                          <SelectItem value="Momentum Health">Momentum Health</SelectItem>
                          <SelectItem value="Bonitas">Bonitas</SelectItem>
                          <SelectItem value="Fedhealth">Fedhealth</SelectItem>
                          <SelectItem value="Medshield">Medshield</SelectItem>
                          <SelectItem value="Bestmed">Bestmed</SelectItem>
                          <SelectItem value="Sizwe">Sizwe</SelectItem>
                          <SelectItem value="GEMS">GEMS</SelectItem>
                          <SelectItem value="Polmed">Polmed</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="medicalAidNumber" className="text-sm">Membership Number *</Label>
                      <Input 
                        id="medicalAidNumber"
                        name="medicalAidNumber"
                        value={formData.medicalAidNumber}
                        onChange={handleChange}
                        placeholder="e.g., 123456789"
                        disabled={loading}
                        className="h-10 sm:h-11"
                        required={formData.hasMedicalAid}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Medical Information */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setShowMedicalInfo(!showMedicalInfo)}
                  className="w-full flex items-center justify-between text-base sm:text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Pill className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    Medical Information
                    <span className="text-xs font-normal text-gray-500">(Optional)</span>
                  </span>
                  {showMedicalInfo ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
                
                {showMedicalInfo && (
                  <div className="space-y-4 pl-0 sm:pl-2 border-l-2 border-purple-200">
                    <div className="space-y-2">
                      <Label htmlFor="allergies" className="text-sm">Allergies</Label>
                      <Textarea 
                        id="allergies"
                        name="allergies"
                        value={formData.allergies}
                        onChange={handleChange}
                        placeholder="e.g., Penicillin, Peanuts, Latex (separate with commas)"
                        disabled={loading}
                        rows={2}
                        className="resize-none"
                      />
                      <p className="text-xs text-gray-500">List any known allergies</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="chronicConditions" className="text-sm">Chronic Conditions</Label>
                      <Textarea 
                        id="chronicConditions"
                        name="chronicConditions"
                        value={formData.chronicConditions}
                        onChange={handleChange}
                        placeholder="e.g., Diabetes, Hypertension, Asthma (separate with commas)"
                        disabled={loading}
                        rows={2}
                        className="resize-none"
                      />
                      <p className="text-xs text-gray-500">List any ongoing medical conditions</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="currentMedications" className="text-sm">Current Medications</Label>
                      <Textarea 
                        id="currentMedications"
                        name="currentMedications"
                        value={formData.currentMedications}
                        onChange={handleChange}
                        placeholder="e.g., Insulin, Blood pressure medication (separate with commas)"
                        disabled={loading}
                        rows={2}
                        className="resize-none"
                      />
                      <p className="text-xs text-gray-500">List any medications you're currently taking</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Account Security */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                  Account Security
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm">Password *</Label>
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
                    . I confirm that the information provided is accurate.
                  </Label>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-3 sm:space-y-4 px-4 sm:px-6 pb-6">
              <Button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 sm:h-12 text-sm sm:text-base"
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
              
              <p className="text-xs text-center text-gray-500">
                By signing up, you'll receive a verification email. Please verify your email to activate your account.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default PatientSignUp;