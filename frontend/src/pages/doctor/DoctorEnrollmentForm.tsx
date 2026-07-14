// pages/doctor/DoctorEnrollmentForm.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Stethoscope, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Clock, 
  CreditCard,
  FileText,
  GraduationCap,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  Award,
  XCircle,
  RefreshCw
} from 'lucide-react';

interface DoctorEnrollmentData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  practiceName: string;
  practiceAddress: string;
  practicePhone: string;
  practiceEmail: string;
  specialization: string;
  hpcsaNumber: string;
  qualifications: string[];
  experience: string;
  bio: string;
  consultationFee: string;
  consultationDuration: string;
  operatingHours: {
    monday: { isOpen: boolean; start: string; end: string };
    tuesday: { isOpen: boolean; start: string; end: string };
    wednesday: { isOpen: boolean; start: string; end: string };
    thursday: { isOpen: boolean; start: string; end: string };
    friday: { isOpen: boolean; start: string; end: string };
    saturday: { isOpen: boolean; start: string; end: string };
    sunday: { isOpen: boolean; start: string; end: string };
  };
  idDocument: File | null;
  qualificationDocument: File | null;
  hpcsaDocument: File | null;
  profilePicture: File | null;
  referralCode: string;
  acceptTerms: boolean;
  acceptDataProcessing: boolean;
}

// ==================== QUERY KEYS ====================
const QUERY_KEYS = {
  validateReferral: 'validateReferral',
};

// ==================== DATA FETCHING FUNCTIONS ====================
const validateReferralCode = async (code: string): Promise<{ valid: boolean; ambassadorName: string | null }> => {
  if (!code || code.length < 4) {
    return { valid: false, ambassadorName: null };
  }

  try {
    const upperCode = code.toUpperCase().trim();
    const ambassadorsQuery = query(
      collection(db, 'ambassadors'),
      where('referralCode', '==', upperCode),
      where('applicationStatus', '==', 'approved')
    );
    const snapshot = await getDocs(ambassadorsQuery);
    
    if (!snapshot.empty) {
      const ambassadorDoc = snapshot.docs[0];
      const ambassadorData = ambassadorDoc.data();
      const name = `${ambassadorData.firstName || ''} ${ambassadorData.lastName || ''}`.trim();
      return { valid: true, ambassadorName: name || 'an ambassador' };
    }
    
    return { valid: false, ambassadorName: null };
  } catch (error) {
    console.error('Error validating referral code:', error);
    return { valid: false, ambassadorName: null };
  }
};

const DoctorEnrollmentForm = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [submitted, setSubmitted] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [debouncedReferralCode, setDebouncedReferralCode] = useState('');
  
  const referralCodeFromUrl = searchParams.get('ref') || '';
  
  const [formData, setFormData] = useState<DoctorEnrollmentData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    practiceName: '',
    practiceAddress: '',
    practicePhone: '',
    practiceEmail: '',
    specialization: '',
    hpcsaNumber: '',
    qualifications: [],
    experience: '',
    bio: '',
    consultationFee: '',
    consultationDuration: '30',
    operatingHours: {
      monday: { isOpen: true, start: '08:00', end: '17:00' },
      tuesday: { isOpen: true, start: '08:00', end: '17:00' },
      wednesday: { isOpen: true, start: '08:00', end: '17:00' },
      thursday: { isOpen: true, start: '08:00', end: '17:00' },
      friday: { isOpen: true, start: '08:00', end: '17:00' },
      saturday: { isOpen: false, start: '09:00', end: '13:00' },
      sunday: { isOpen: false, start: '09:00', end: '13:00' },
    },
    idDocument: null,
    qualificationDocument: null,
    hpcsaDocument: null,
    profilePicture: null,
    referralCode: referralCodeFromUrl,
    acceptTerms: false,
    acceptDataProcessing: false,
  });

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

  // ==================== QUERY: Validate Referral Code ====================
  const {
    data: referralValidation,
    isLoading: isValidatingReferral,
    isError: referralError,
    refetch: revalidateReferral,
  } = useQuery({
    queryKey: [QUERY_KEYS.validateReferral, debouncedReferralCode],
    queryFn: () => validateReferralCode(debouncedReferralCode),
    enabled: debouncedReferralCode.length >= 4,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });

  // ==================== MUTATION: Submit Enrollment ====================
  const submitEnrollmentMutation = useMutation({
    mutationFn: async (data: DoctorEnrollmentData) => {
      if (!user) throw new Error('You must be logged in to submit this application.');

      // Prepare the data for Firestore
      const doctorData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: `${data.firstName} ${data.lastName}`.trim(),
        email: data.email,
        phone: data.phone || '',
        practiceName: data.practiceName,
        practiceAddress: data.practiceAddress,
        practicePhone: data.practicePhone || '',
        practiceEmail: data.practiceEmail || '',
        specialization: data.specialization,
        hpcsaNumber: data.hpcsaNumber,
        qualifications: data.qualifications || [],
        experience: data.experience || '',
        bio: data.bio || '',
        consultationFee: data.consultationFee ? parseFloat(data.consultationFee) : null,
        consultationDuration: parseInt(data.consultationDuration) || 30,
        operatingHours: data.operatingHours,
        verificationStatus: 'pending',
        enrollmentCompleted: true,
        enrolledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add referral code if provided and valid
      if (data.referralCode && referralValidation?.valid) {
        doctorData.referralCodeUsed = data.referralCode.toUpperCase();
      }

      // Update the doctor document in Firestore
      const doctorRef = doc(db, 'doctors', user.uid);
      await updateDoc(doctorRef, doctorData);

      // Also update the user profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: `${data.firstName} ${data.lastName}`.trim(),
        phone: data.phone || '',
        updatedAt: serverTimestamp(),
        enrollmentCompleted: true,
      });

      // If referral code was provided and valid, create referral record
      if (data.referralCode && referralValidation?.valid) {
        // Find the ambassador with this referral code
        const ambassadorsQuery = query(
          collection(db, 'ambassadors'),
          where('referralCode', '==', data.referralCode.toUpperCase()),
          where('applicationStatus', '==', 'approved')
        );
        const ambassadorSnapshot = await getDocs(ambassadorsQuery);
        
        if (!ambassadorSnapshot.empty) {
          const ambassadorDoc = ambassadorSnapshot.docs[0];
          const ambassadorData = ambassadorDoc.data();
          
          // Create referral record
          const referralRef = doc(db, 'referrals', `doctor_${user.uid}`);
          const referralData = {
            ambassadorId: ambassadorDoc.id,
            ambassadorName: `${ambassadorData.firstName || ''} ${ambassadorData.lastName || ''}`.trim(),
            referralCode: data.referralCode.toUpperCase(),
            referredAt: serverTimestamp(),
            doctorId: user.uid,
            doctorName: `${data.firstName} ${data.lastName}`.trim(),
            doctorEmail: data.email,
            status: 'pending',
            commissionEarned: 0,
            commissionPaid: false,
          };
          
          await updateDoc(referralRef, referralData);
          
          // Update ambassador's referral count
          const ambassadorRef = doc(db, 'ambassadors', ambassadorDoc.id);
          await updateDoc(ambassadorRef, {
            totalReferredDoctors: (ambassadorData.totalReferredDoctors || 0) + 1,
            updatedAt: serverTimestamp(),
          });
          
          // Update doctor with referredBy
          await updateDoc(doctorRef, {
            referredBy: ambassadorDoc.id,
          });
          
          return { referralLinked: true, ambassadorName: referralData.ambassadorName };
        }
      }
      
      return { referralLinked: false, ambassadorName: null };
    },
    onSuccess: (result) => {
      let toastMessage = 'Your healthcare provider application has been submitted for review.';
      
      if (result.referralLinked) {
        toastMessage = `Your application has been linked to ${result.ambassadorName}'s referral. ${toastMessage}`;
      }
      
      toast({
        title: 'Application Submitted! 🎉',
        description: toastMessage,
        duration: 8000,
      });

      setSubmitted(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/doctor/dashboard');
      }, 3000);
    },
    onError: (error: any) => {
      console.error('Enrollment error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit application. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // ==================== EFFECTS ====================
  
  // Set referral code from URL
  useEffect(() => {
    if (referralCodeFromUrl) {
      setReferralCodeInput(referralCodeFromUrl);
      setDebouncedReferralCode(referralCodeFromUrl);
      setFormData(prev => ({ ...prev, referralCode: referralCodeFromUrl }));
    }
  }, [referralCodeFromUrl]);

  // Load existing profile data
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        phone: profile.phone || '',
      }));
    }
  }, [profile]);

  // Show toast when referral validation completes
  useEffect(() => {
    if (referralValidation && debouncedReferralCode.length >= 4) {
      if (referralValidation.valid) {
        toast({
          title: 'Valid Referral Code ✅',
          description: `You've been referred by ${referralValidation.ambassadorName || 'an ambassador'}`,
        });
        setFormData(prev => ({ ...prev, referralCode: debouncedReferralCode }));
      } else if (debouncedReferralCode.length >= 4) {
        toast({
          title: 'Invalid Referral Code',
          description: 'The referral code you entered is not valid.',
          variant: 'destructive',
        });
      }
    }
  }, [referralValidation, debouncedReferralCode, toast]);

  // ==================== HANDLER FUNCTIONS ====================
  
  const handleReferralCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase().trim();
    setReferralCodeInput(code);
    setFormData(prev => ({ ...prev, referralCode: code }));
    
    // Debounce the validation
    clearTimeout((window as any).referralTimeout);
    (window as any).referralTimeout = setTimeout(() => {
      setDebouncedReferralCode(code);
    }, 500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleFileChange = (name: string, file: File | null) => {
    setFormData(prev => ({ ...prev, [name]: file }));
  };

  const handleOperatingHoursChange = (day: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day as keyof typeof prev.operatingHours],
          [field]: value,
        },
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.firstName || !formData.lastName) {
      toast({ title: 'Missing Information', description: 'Please enter your full name.', variant: 'destructive' });
      return;
    }

    if (!formData.specialization) {
      toast({ title: 'Missing Information', description: 'Please select your specialization.', variant: 'destructive' });
      return;
    }

    if (!formData.hpcsaNumber) {
      toast({ title: 'Missing Information', description: 'Please enter your HPCSA number.', variant: 'destructive' });
      return;
    }

    if (!formData.practiceName) {
      toast({ title: 'Missing Information', description: 'Please enter your practice name.', variant: 'destructive' });
      return;
    }

    if (!formData.practiceAddress) {
      toast({ title: 'Missing Information', description: 'Please enter your practice address.', variant: 'destructive' });
      return;
    }

    if (!formData.acceptTerms || !formData.acceptDataProcessing) {
      toast({ title: 'Terms Required', description: 'Please accept all terms and conditions.', variant: 'destructive' });
      return;
    }

    // Validate referral code if provided
    if (formData.referralCode && formData.referralCode.length >= 4) {
      if (!referralValidation?.valid) {
        // If we haven't validated yet or it's invalid, trigger validation
        if (debouncedReferralCode !== formData.referralCode) {
          setDebouncedReferralCode(formData.referralCode);
          await new Promise(resolve => setTimeout(resolve, 600)); // Wait for validation
        }
        
        if (!referralValidation?.valid) {
          toast({ 
            title: 'Invalid Referral Code', 
            description: 'Please check the referral code and try again.', 
            variant: 'destructive' 
          });
          return;
        }
      }
    }

    // Submit the enrollment
    submitEnrollmentMutation.mutate(formData);
  };

  // ==================== RENDER ====================
  
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full shadow-xl border-0">
          <CardContent className="pt-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
            <p className="text-gray-600 mb-4">
              Your healthcare provider application has been successfully submitted for review.
            </p>
            {formData.referralCode && referralValidation?.valid && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <Award className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                <p className="text-sm text-purple-800">
                  Referral code <strong>{formData.referralCode}</strong> applied successfully!
                </p>
              </div>
            )}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Next Steps:</p>
                  <ul className="text-sm text-yellow-700 list-disc list-inside">
                    <li>Admin will review your application</li>
                    <li>You'll receive an email notification</li>
                    <li>Once approved, you can start accepting patients</li>
                  </ul>
                </div>
              </div>
            </div>
            <Button onClick={() => navigate('/doctor/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Stethoscope className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Healthcare Provider Application</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            Complete your profile to start practicing on MedMap
          </p>
        </div>

        {/* Referral Banner */}
        {referralCodeFromUrl && referralValidation?.valid === true && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 text-center">
            <Award className="w-6 h-6 text-purple-600 mx-auto mb-1" />
            <p className="text-sm text-purple-800">
              You were referred by <strong>{referralValidation.ambassadorName || 'an ambassador'}</strong>!
              Welcome to the MedMap network. 🎉
            </p>
          </div>
        )}

        {referralCodeFromUrl && referralValidation?.valid === false && !isValidatingReferral && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-center">
            <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
            <p className="text-sm text-red-800">
              The referral code <strong>{referralCodeFromUrl}</strong> is invalid.
              You can still apply without a referral.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Card className="w-full shadow-xl border-0">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-xl sm:text-2xl">Complete Your Profile</CardTitle>
              <CardDescription>
                Fill out all required fields to submit your application for review.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-8 px-4 sm:px-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input 
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="John"
                      disabled={submitEnrollmentMutation.isPending}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input 
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Doe"
                      disabled={submitEnrollmentMutation.isPending}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input 
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={true}
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input 
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+27 12 345 6789"
                      disabled={submitEnrollmentMutation.isPending}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  Professional Information
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization *</Label>
                  <Select 
                    value={formData.specialization} 
                    onValueChange={(value) => handleSelectChange('specialization', value)}
                    disabled={submitEnrollmentMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      {specializations.map((spec) => (
                        <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="hpcsaNumber">HPCSA Number *</Label>
                  <Input 
                    id="hpcsaNumber"
                    name="hpcsaNumber"
                    value={formData.hpcsaNumber}
                    onChange={handleChange}
                    placeholder="MP 0123456"
                    disabled={submitEnrollmentMutation.isPending}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input 
                    id="experience"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="e.g., 5 years in private practice"
                    disabled={submitEnrollmentMutation.isPending}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio / About You</Label>
                  <Textarea 
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Tell patients about yourself, your approach to healthcare, and what makes you unique..."
                    rows={4}
                    disabled={submitEnrollmentMutation.isPending}
                  />
                </div>
              </div>

              {/* Practice Information */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Practice Information
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="practiceName">Practice Name *</Label>
                  <Input 
                    id="practiceName"
                    name="practiceName"
                    value={formData.practiceName}
                    onChange={handleChange}
                    placeholder="e.g., Sandton Medical Centre"
                    disabled={submitEnrollmentMutation.isPending}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="practiceAddress">Practice Address *</Label>
                  <Input 
                    id="practiceAddress"
                    name="practiceAddress"
                    value={formData.practiceAddress}
                    onChange={handleChange}
                    placeholder="Street address, City, Province, Postal Code"
                    disabled={submitEnrollmentMutation.isPending}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="practicePhone">Practice Phone</Label>
                    <Input 
                      id="practicePhone"
                      name="practicePhone"
                      type="tel"
                      value={formData.practicePhone}
                      onChange={handleChange}
                      placeholder="+27 12 345 6789"
                      disabled={submitEnrollmentMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="practiceEmail">Practice Email</Label>
                    <Input 
                      id="practiceEmail"
                      name="practiceEmail"
                      type="email"
                      value={formData.practiceEmail}
                      onChange={handleChange}
                      placeholder="practice@example.com"
                      disabled={submitEnrollmentMutation.isPending}
                    />
                  </div>
                </div>
              </div>

              {/* Consultation Settings */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Consultation Settings
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="consultationFee">Consultation Fee (R) *</Label>
                    <Input 
                      id="consultationFee"
                      name="consultationFee"
                      type="number"
                      value={formData.consultationFee}
                      onChange={handleChange}
                      placeholder="500"
                      disabled={submitEnrollmentMutation.isPending}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consultationDuration">Consultation Duration (minutes)</Label>
                    <Select 
                      value={formData.consultationDuration} 
                      onValueChange={(value) => handleSelectChange('consultationDuration', value)}
                      disabled={submitEnrollmentMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Operating Hours
                </h3>
                
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                  <div key={day} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id={`${day}-open`}
                        checked={formData.operatingHours[day as keyof typeof formData.operatingHours].isOpen}
                        onCheckedChange={(checked) => 
                          handleOperatingHoursChange(day, 'isOpen', checked)
                        }
                        disabled={submitEnrollmentMutation.isPending}
                      />
                      <Label htmlFor={`${day}-open`} className="capitalize font-medium">
                        {day}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="time"
                        value={formData.operatingHours[day as keyof typeof formData.operatingHours].start}
                        onChange={(e) => handleOperatingHoursChange(day, 'start', e.target.value)}
                        disabled={!formData.operatingHours[day as keyof typeof formData.operatingHours].isOpen || submitEnrollmentMutation.isPending}
                        className="w-28"
                      />
                      <span className="text-gray-500">to</span>
                      <Input 
                        type="time"
                        value={formData.operatingHours[day as keyof typeof formData.operatingHours].end}
                        onChange={(e) => handleOperatingHoursChange(day, 'end', e.target.value)}
                        disabled={!formData.operatingHours[day as keyof typeof formData.operatingHours].isOpen || submitEnrollmentMutation.isPending}
                        className="w-28"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Referral Code (Optional) */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  Referral Code (Optional)
                </h3>
                <p className="text-sm text-gray-500">
                  If an ambassador referred you, enter their referral code below to link your application.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="referralCode">Ambassador Referral Code</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="referralCode"
                      name="referralCode"
                      value={referralCodeInput}
                      onChange={handleReferralCodeChange}
                      placeholder="e.g., ABXY12"
                      disabled={submitEnrollmentMutation.isPending}
                      className="uppercase flex-1"
                    />
                    {isValidatingReferral && debouncedReferralCode.length >= 4 && (
                      <Button variant="outline" disabled>
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </Button>
                    )}
                    {debouncedReferralCode.length >= 4 && referralValidation && !isValidatingReferral && (
                      <Button 
                        variant="outline" 
                        onClick={() => revalidateReferral()}
                        disabled={submitEnrollmentMutation.isPending}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {isValidatingReferral && debouncedReferralCode.length >= 4 && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Validating referral code...
                    </p>
                  )}
                  {referralValidation?.valid === true && debouncedReferralCode.length >= 4 && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Valid referral code from {referralValidation.ambassadorName || 'an ambassador'} ✅
                    </p>
                  )}
                  {referralValidation?.valid === false && debouncedReferralCode.length >= 4 && !isValidatingReferral && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      Invalid referral code. Please check and try again.
                    </p>
                  )}
                  {referralError && debouncedReferralCode.length >= 4 && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Error validating referral code. Please try again.
                    </p>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  Supporting Documents
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="idDocument">ID / Passport Copy</Label>
                    <Input 
                      id="idDocument"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('idDocument', e.target.files?.[0] || null)}
                      disabled={submitEnrollmentMutation.isPending}
                    />
                    <p className="text-xs text-gray-500">PDF, JPG, or PNG (max 5MB)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qualificationDocument">Qualification Certificate</Label>
                    <Input 
                      id="qualificationDocument"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('qualificationDocument', e.target.files?.[0] || null)}
                      disabled={submitEnrollmentMutation.isPending}
                    />
                    <p className="text-xs text-gray-500">PDF, JPG, or PNG (max 5MB)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hpcsaDocument">HPCSA Registration Certificate</Label>
                    <Input 
                      id="hpcsaDocument"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('hpcsaDocument', e.target.files?.[0] || null)}
                      disabled={submitEnrollmentMutation.isPending}
                    />
                    <p className="text-xs text-gray-500">PDF, JPG, or PNG (max 5MB)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profilePicture">Profile Picture</Label>
                    <Input 
                      id="profilePicture"
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('profilePicture', e.target.files?.[0] || null)}
                      disabled={submitEnrollmentMutation.isPending}
                    />
                    <p className="text-xs text-gray-500">JPG or PNG (max 2MB)</p>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="acceptTerms"
                    checked={formData.acceptTerms}
                    onCheckedChange={(checked) => handleCheckboxChange('acceptTerms', checked as boolean)}
                    disabled={submitEnrollmentMutation.isPending}
                    className="mt-1"
                  />
                  <Label htmlFor="acceptTerms" className="text-sm text-gray-600">
                    I confirm that all information provided is accurate and complete. I understand that providing false information may result in rejection of my application.
                  </Label>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="acceptDataProcessing"
                    checked={formData.acceptDataProcessing}
                    onCheckedChange={(checked) => handleCheckboxChange('acceptDataProcessing', checked as boolean)}
                    disabled={submitEnrollmentMutation.isPending}
                    className="mt-1"
                  />
                  <Label htmlFor="acceptDataProcessing" className="text-sm text-gray-600">
                    I consent to the processing of my personal and professional data for the purpose of verifying my credentials and managing my practice on the MedMap platform.
                  </Label>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-3 px-4 sm:px-6 pb-6">
              <Button 
                type="submit"
                disabled={submitEnrollmentMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 sm:h-12 text-sm sm:text-base"
              >
                {submitEnrollmentMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting application...
                  </div>
                ) : (
                  'Submit Application'
                )}
              </Button>
              
              <p className="text-xs text-center text-gray-500">
                Your application will be reviewed by our team. You'll receive a notification once your account is verified.
              </p>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default DoctorEnrollmentForm;