// pages/doctor/DoctorEnrollmentForm.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
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
  XCircle
} from 'lucide-react';

interface DoctorEnrollmentData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Practice Information
  practiceName: string;
  practiceAddress: string;
  practicePhone: string;
  practiceEmail: string;
  
  // Professional Information
  specialization: string;
  hpcsaNumber: string;
  qualifications: string[];
  experience: string;
  bio: string;
  
  // Consultation
  consultationFee: string;
  consultationDuration: string;
  
  // Operating Hours
  operatingHours: {
    monday: { isOpen: boolean; start: string; end: string };
    tuesday: { isOpen: boolean; start: string; end: string };
    wednesday: { isOpen: boolean; start: string; end: string };
    thursday: { isOpen: boolean; start: string; end: string };
    friday: { isOpen: boolean; start: string; end: string };
    saturday: { isOpen: boolean; start: string; end: string };
    sunday: { isOpen: boolean; start: string; end: string };
  };
  
  // Documents
  idDocument: File | null;
  qualificationDocument: File | null;
  hpcsaDocument: File | null;
  profilePicture: File | null;
  
  // Referral
  referralCode: string;
  
  // Terms
  acceptTerms: boolean;
  acceptDataProcessing: boolean;
}

const DoctorEnrollmentForm = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referralAmbassador, setReferralAmbassador] = useState<string | null>(null);
  const [referralCodeInput, setReferralCodeInput] = useState('');
  
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

  // Validate referral code from URL
  useEffect(() => {
    if (referralCodeFromUrl) {
      setReferralCodeInput(referralCodeFromUrl);
      validateReferralCode(referralCodeFromUrl);
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

  const validateReferralCode = async (code: string) => {
    if (!code || code.length < 4) {
      setReferralValid(null);
      setReferralAmbassador(null);
      return;
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
        setReferralValid(true);
        const name = `${ambassadorData.firstName || ''} ${ambassadorData.lastName || ''}`.trim();
        setReferralAmbassador(name || 'an ambassador');
        toast({
          title: 'Valid Referral Code ✅',
          description: `You've been referred by ${name || 'an ambassador'}`,
        });
        setFormData(prev => ({ ...prev, referralCode: upperCode }));
      } else {
        setReferralValid(false);
        setReferralAmbassador(null);
        toast({
          title: 'Invalid Referral Code',
          description: 'The referral code you entered is not valid.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error validating referral code:', error);
      setReferralValid(false);
    }
  };

  const handleReferralCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase().trim();
    setReferralCodeInput(code);
    setFormData(prev => ({ ...prev, referralCode: code }));
    
    if (code.length >= 4) {
      await validateReferralCode(code);
    } else {
      setReferralValid(null);
      setReferralAmbassador(null);
    }
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
    if (formData.referralCode) {
      // If referral code was provided but not validated yet, validate it
      if (referralValid === null) {
        await validateReferralCode(formData.referralCode);
        if (referralValid === false) {
          toast({ 
            title: 'Invalid Referral Code', 
            description: 'Please check the referral code and try again.', 
            variant: 'destructive' 
          });
          return;
        }
      } else if (referralValid === false) {
        toast({ 
          title: 'Invalid Referral Code', 
          description: 'Please check the referral code and try again.', 
          variant: 'destructive' 
        });
        return;
      }
    }

    try {
      setLoading(true);

      if (!user) {
        toast({ title: 'Error', description: 'You must be logged in to submit this application.', variant: 'destructive' });
        return;
      }

      // Prepare the data for Firestore
      const doctorData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone || '',
        practiceName: formData.practiceName,
        practiceAddress: formData.practiceAddress,
        practicePhone: formData.practicePhone || '',
        practiceEmail: formData.practiceEmail || '',
        specialization: formData.specialization,
        hpcsaNumber: formData.hpcsaNumber,
        qualifications: formData.qualifications || [],
        experience: formData.experience || '',
        bio: formData.bio || '',
        consultationFee: formData.consultationFee ? parseFloat(formData.consultationFee) : null,
        consultationDuration: parseInt(formData.consultationDuration) || 30,
        operatingHours: formData.operatingHours,
        verificationStatus: 'pending',
        enrollmentCompleted: true,
        enrolledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add referral code if provided and valid
      if (formData.referralCode && referralValid) {
        doctorData.referralCodeUsed = formData.referralCode.toUpperCase();
        // We'll add referredBy when we find the ambassador
      }

      // Update the doctor document in Firestore
      const doctorRef = doc(db, 'doctors', user.uid);
      await updateDoc(doctorRef, doctorData);

      // Also update the user profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        phone: formData.phone || '',
        updatedAt: serverTimestamp(),
        enrollmentCompleted: true,
      });

      // If referral code was provided, create referral record
      if (formData.referralCode && referralValid) {
        // Find the ambassador with this referral code
        const ambassadorsQuery = query(
          collection(db, 'ambassadors'),
          where('referralCode', '==', formData.referralCode.toUpperCase()),
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
            referralCode: formData.referralCode.toUpperCase(),
            referredAt: serverTimestamp(),
            doctorId: user.uid,
            doctorName: `${formData.firstName} ${formData.lastName}`.trim(),
            doctorEmail: formData.email,
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
          
          toast({
            title: 'Referral Linked!',
            description: `Your application has been linked to ${referralData.ambassadorName}'s referral.`,
          });
        }
      }

      toast({
        title: 'Application Submitted! 🎉',
        description: 'Your healthcare provider application has been submitted for review. You will be notified once approved.',
        duration: 8000,
      });

      setSubmitted(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/doctor/dashboard');
      }, 3000);

    } catch (error: any) {
      console.error('Enrollment error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit application. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
            {formData.referralCode && referralValid && (
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
        {referralCodeFromUrl && referralValid === true && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 text-center">
            <Award className="w-6 h-6 text-purple-600 mx-auto mb-1" />
            <p className="text-sm text-purple-800">
              You were referred by <strong>{referralAmbassador || 'an ambassador'}</strong>!
              Welcome to the MedMap network. 🎉
            </p>
          </div>
        )}

        {referralCodeFromUrl && referralValid === false && (
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
                      disabled={loading}
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
                      disabled={loading}
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
                      disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
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
                      disabled={loading}
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
                      disabled={loading}
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
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consultationDuration">Consultation Duration (minutes)</Label>
                    <Select 
                      value={formData.consultationDuration} 
                      onValueChange={(value) => handleSelectChange('consultationDuration', value)}
                      disabled={loading}
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
                        disabled={loading}
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
                        disabled={!formData.operatingHours[day as keyof typeof formData.operatingHours].isOpen || loading}
                        className="w-28"
                      />
                      <span className="text-gray-500">to</span>
                      <Input 
                        type="time"
                        value={formData.operatingHours[day as keyof typeof formData.operatingHours].end}
                        onChange={(e) => handleOperatingHoursChange(day, 'end', e.target.value)}
                        disabled={!formData.operatingHours[day as keyof typeof formData.operatingHours].isOpen || loading}
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
                      disabled={loading}
                      className="uppercase flex-1"
                    />
                  </div>
                  {referralValid === true && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Valid referral code from {referralAmbassador || 'an ambassador'} ✅
                    </p>
                  )}
                  {referralValid === false && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      Invalid referral code. Please check and try again.
                    </p>
                  )}
                  {referralValid === null && referralCodeInput.length > 0 && (
                    <p className="text-sm text-gray-500">
                      Checking referral code...
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
                      disabled={loading}
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
                      disabled={loading}
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
                      disabled={loading}
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
                      disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
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
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 sm:h-12 text-sm sm:text-base"
              >
                {loading ? (
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