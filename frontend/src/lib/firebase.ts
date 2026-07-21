// lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  updatePassword, 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc, 
  query, 
  where, 
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  writeBatch,
  persistentLocalCache,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED,
  deleteDoc
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if all required config values are present
const validateConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];
  const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);
  
  if (missingFields.length > 0) {
    console.error('Missing Firebase configuration fields:', missingFields);
    return false;
  }
  return true;
};

// Initialize Firebase only if config is valid
let app: any;
let auth: any;
let db: any;
let storage: any;

if (validateConfig()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    
    // Use the new persistentLocalCache API instead of deprecated enableIndexedDbPersistence
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        cacheSizeBytes: CACHE_SIZE_UNLIMITED
      })
    });
    
    storage = getStorage(app);
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
} else {
  console.warn('Firebase initialization skipped due to missing configuration');
  app = {} as any;
  auth = {} as any;
  db = {} as any;
  storage = {} as any;
}

export { auth, db, storage };

// Types
export interface UserProfile {
  uid: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string;
  role: 'patient' | 'doctor' | 'ambassador' | 'admin';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLogin?: Timestamp;
  isActive: boolean;
  photoURL?: string;
}

export interface DoctorProfile extends UserProfile {
  role: 'doctor';
  specialization: string;
  hpcsaNumber?: string;
  practiceName?: string;
  practiceAddress?: string;
  consultationFee?: number;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedAt?: Timestamp;
  rejectionReason?: string;
  referralCodeUsed?: string;
  referredBy?: string;
}

export interface AmbassadorProfile extends UserProfile {
  role: 'ambassador';
  idNumber?: string;
  referralCode: string | null;
  referralSource: string;
  experience?: string;
  motivation: string;
  applicationStatus: 'pending' | 'approved' | 'rejected';
  onboardingStep: number;
  psychometricTest?: {
    passed: boolean | null;
    attemptDate: any;
    nextAttemptDate: any;
    score: number | null;
  };
  trainingModule?: {
    completed: boolean;
    startedAt: any;
    completedAt: any;
  };
  knowledgeTest?: {
    passed: boolean | null;
    attempts: number;
    maxAttempts: number;
    lastAttemptDate: any;
    score: number | null;
  };
  interviewStatus: 'pending' | 'scheduled' | 'completed' | 'passed' | 'failed';
  interviewNotes?: string;
  approvedAt?: Timestamp;
  rejectedAt?: Timestamp;
  rejectionReason?: string;
  totalReferredDoctors: number;
  activeReferredDoctors: number;
  currentTier: 'bronze' | 'silver' | 'gold' | 'diamond';
  totalEarnings: number;
  pendingEarnings: number;
}

export interface PatientProfile extends UserProfile {
  role: 'patient';
  idNumber?: string;
  dateOfBirth?: string;
  medicalAidProvider?: string;
  medicalAidNumber?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  allergies?: string[];
  chronicConditions?: string[];
  medications?: string[];
  bloodType?: string;
}

export interface AdminProfile extends UserProfile {
  role: 'admin';
  adminLevel: 'super' | 'standard' | 'support';
  permissions: string[];
  department?: string;
}

export interface ReferralData {
  ambassadorId: string;
  ambassadorName: string;
  referralCode: string;
  referredAt: Timestamp;
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  status: 'pending' | 'verified' | 'rejected';
  commissionEarned: number;
  commissionPaid: boolean;
  verifiedAt?: Timestamp;
  rejectionReason?: string;
}

// Helper function to generate referral code
function generateReferralCode(firstName?: string, lastName?: string): string {
  if (firstName && lastName && firstName.length >= 2 && lastName.length >= 2) {
    const prefix = firstName.substring(0, 2).toUpperCase();
    const suffix = lastName.substring(0, 2).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${suffix}${random}`;
  }
  // Fallback: generate a random code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'MM';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Check if Firebase is properly initialized
const isFirebaseInitialized = () => {
  return !!(auth && db && storage);
};

// Auth service functions
export const authService = {
  // Update admin password
  updateAdminPassword: async (currentPassword: string, newPassword: string) => {
    const user = auth.currentUser;
    if (!user) {
      return { error: 'No user logged in' };
    }
    
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  // Sign up with email verification and referral code support
  signUp: async (email: string, password: string, profileData: Partial<UserProfile> & { [key: string]: any }, referralCode?: string) => {
    if (!isFirebaseInitialized()) {
      return { user: null, profile: null, error: 'Firebase is not initialized. Please check your configuration.' };
    }
    
    try {
      console.log('📝 Creating auth user...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('✅ Auth user created:', user.uid);
      
      console.log('📧 Sending verification email...');
      await sendEmailVerification(user);
      console.log('✅ Verification email sent');
      
      // Create user profile WITHOUT undefined values
      const userProfile = {
        uid: user.uid,
        email: user.email!,
        emailVerified: user.emailVerified,
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        fullName: `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim(),
        role: profileData.role || 'patient',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        ...(profileData.phone ? { phone: profileData.phone } : {}),
        ...(user.photoURL ? { photoURL: user.photoURL } : {}),
      };
      
      console.log('💾 Saving user profile to Firestore...');
      await setDoc(doc(db, 'users', user.uid), userProfile);
      console.log('✅ User profile saved to users collection');
      
      const role = profileData.role || 'patient';
      const baseProfile = {
        uid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      console.log(`💾 Creating ${role} specific profile...`);
      
      switch (role) {
        case 'doctor':
          // Store referral code if provided
          let referralData = null;
          if (referralCode) {
            console.log(`🔍 Checking referral code: ${referralCode}`);
            
            // Find the ambassador with this referral code
            const ambassadorsQuery = query(
              collection(db, 'ambassadors'),
              where('referralCode', '==', referralCode),
              where('applicationStatus', '==', 'approved')
            );
            const ambassadorSnapshot = await getDocs(ambassadorsQuery);
            
            if (!ambassadorSnapshot.empty) {
              const ambassadorDoc = ambassadorSnapshot.docs[0];
              const ambassadorData = ambassadorDoc.data();
              const ambassadorId = ambassadorDoc.id;
              
              referralData = {
                ambassadorId: ambassadorId,
                ambassadorName: `${ambassadorData.firstName || ''} ${ambassadorData.lastName || ''}`.trim(),
                referralCode: referralCode,
                referredAt: serverTimestamp(),
                doctorId: user.uid,
                doctorName: userProfile.fullName,
                doctorEmail: user.email!,
                doctorSpecialization: profileData.specialization || '',
                status: 'pending',
                commissionEarned: 0,
                commissionPaid: false,
              };
              
              console.log(`✅ Referral found from ambassador: ${referralData.ambassadorName}`);
              
              // Save referral data with the correct document ID
              await setDoc(doc(db, 'referrals', `doctor_${user.uid}`), referralData);
              
              // ✅ CRITICAL: Update ambassador's totalReferredDoctors count
              console.log(`📊 Updating ambassador ${ambassadorId} total referrals...`);
              await updateDoc(doc(db, 'ambassadors', ambassadorId), {
                totalReferredDoctors: (ambassadorData.totalReferredDoctors || 0) + 1,
                updatedAt: serverTimestamp(),
              });
              console.log(`✅ Ambassador ${ambassadorId} total referrals updated to ${(ambassadorData.totalReferredDoctors || 0) + 1}`);
              
              console.log('✅ Referral data saved');
            } else {
              console.log('⚠️ Invalid referral code or ambassador not approved');
            }
          }
          
          const doctorData = {
            ...baseProfile,
            role: 'doctor',
            specialization: profileData.specialization || '',
            verificationStatus: 'pending',
            ...(profileData.hpcsaNumber ? { hpcsaNumber: profileData.hpcsaNumber } : {}),
            ...(profileData.practiceName ? { practiceName: profileData.practiceName } : {}),
            ...(profileData.practiceAddress ? { practiceAddress: profileData.practiceAddress } : {}),
            ...(profileData.consultationFee ? { consultationFee: parseFloat(profileData.consultationFee) } : {}),
            ...(profileData.bio ? { bio: profileData.bio } : {}),
            ...(profileData.qualifications ? { qualifications: profileData.qualifications } : {}),
            ...(profileData.operatingHours ? { operatingHours: profileData.operatingHours } : {}),
            ...(profileData.profilePicture ? { profilePicture: profileData.profilePicture } : {}),
            ...(referralCode ? { referralCodeUsed: referralCode } : {}),
            ...(referralData ? { referredBy: referralData.ambassadorId } : {}),
          };
          await setDoc(doc(db, 'doctors', user.uid), doctorData);
          console.log('✅ Doctor profile saved');
          break;

        case 'patient':
          const patientData = {
            ...baseProfile,
            role: 'patient',
            allergies: profileData.allergies || [],
            chronicConditions: profileData.chronicConditions || [],
            medications: profileData.medications || [],
            ...(profileData.idNumber ? { idNumber: profileData.idNumber } : {}),
            ...(profileData.dateOfBirth ? { dateOfBirth: profileData.dateOfBirth } : {}),
            ...(profileData.phone ? { phone: profileData.phone } : {}),
            ...(profileData.medicalAidProvider ? { medicalAidProvider: profileData.medicalAidProvider } : {}),
            ...(profileData.medicalAidNumber ? { medicalAidNumber: profileData.medicalAidNumber } : {}),
            ...(profileData.emergencyContact ? { emergencyContact: profileData.emergencyContact } : {}),
            ...(profileData.bloodType ? { bloodType: profileData.bloodType } : {}),
          };
          await setDoc(doc(db, 'patients', user.uid), patientData);
          console.log('✅ Patient profile saved');
          break;
          
        case 'ambassador':
          const ambassadorData = {
            ...baseProfile,
            role: 'ambassador',
            referralCode: null,
            applicationStatus: 'pending',
            onboardingStep: 1,
            totalReferredDoctors: 0,
            activeReferredDoctors: 0,
            currentTier: 'bronze',
            totalEarnings: 0,
            pendingEarnings: 0,
            psychometricTest: {
              passed: null,
              attemptDate: null,
              nextAttemptDate: null,
              score: null,
            },
            trainingModule: {
              completed: false,
              startedAt: null,
              completedAt: null,
            },
            knowledgeTest: {
              passed: null,
              attempts: 0,
              maxAttempts: 3,
              lastAttemptDate: null,
              score: null,
            },
            interviewStatus: 'pending',
            ...(profileData.idNumber ? { idNumber: profileData.idNumber } : {}),
            ...(profileData.referralSource ? { referralSource: profileData.referralSource } : { referralSource: '' }),
            ...(profileData.experience ? { experience: profileData.experience } : { experience: '' }),
            ...(profileData.motivation ? { motivation: profileData.motivation } : { motivation: '' }),
          };
          await setDoc(doc(db, 'ambassadors', user.uid), ambassadorData);
          console.log('✅ Ambassador profile saved');
          break;
          
        case 'admin':
          await setDoc(doc(db, 'admins', user.uid), {
            ...baseProfile,
            role: 'admin',
            adminLevel: profileData.adminLevel || 'standard',
            permissions: profileData.permissions || ['view_dashboard'],
            department: profileData.department || null,
          });
          console.log('✅ Admin profile saved');
          break;
      }
      
      console.log('🎉 Signup complete!');
      return { user, profile: userProfile, error: null };
      
    } catch (error: any) {
      console.error('❌ Signup error:', error);
      
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address. Please check and try again.';
      }
      
      return { user: null, profile: null, error: errorMessage };
    }
  },
  
  // Sign in with email verification check
  signIn: async (email: string, password: string) => {
    if (!isFirebaseInitialized()) {
      return { user: null, profile: null, error: 'Firebase is not initialized.' };
    }
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get user profile from Firestore
      const profileDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!profileDoc.exists()) {
        // Check if this is an admin created during setup
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        
        if (adminDoc.exists()) {
          const userProfile: UserProfile = {
            uid: user.uid,
            email: user.email!,
            emailVerified: true,
            firstName: 'Admin',
            lastName: 'User',
            fullName: 'Admin User',
            role: 'admin',
            isActive: true,
            createdAt: serverTimestamp() as Timestamp,
            updatedAt: serverTimestamp() as Timestamp,
          };
          
          await setDoc(doc(db, 'users', user.uid), userProfile);
          return { user, profile: userProfile, error: null };
        }
        
        await signOut(auth);
        return { 
          user: null, 
          profile: null, 
          error: 'User profile not found. Please contact support.' 
        };
      }
      
      const profile = profileDoc.data() as UserProfile;
      
      // Skip email verification check for admin accounts
      if (!user.emailVerified && profile.role !== 'admin') {
        await signOut(auth);
        return { 
          user: null, 
          profile: null, 
          error: 'Please verify your email before signing in. Check your inbox for the verification link.' 
        };
      }
      
      await updateDoc(doc(db, 'users', user.uid), {
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      if (!profile.isActive) {
        await signOut(auth);
        return { 
          user: null, 
          profile: null, 
          error: 'Your account has been deactivated. Please contact support.' 
        };
      }
      
      return { user, profile, error: null };
    } catch (error: any) {
      console.error('Signin error:', error);
      
      let errorMessage = error.message;
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      
      return { user: null, profile: null, error: errorMessage };
    }
  },
  
  // Sign out
  signOut: async () => {
    if (!isFirebaseInitialized()) {
      return { error: 'Firebase is not initialized.' };
    }
    
    try {
      await signOut(auth);
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },
  
  // Resend verification email
  resendVerificationEmail: async () => {
    if (!isFirebaseInitialized()) {
      return { error: 'Firebase is not initialized.' };
    }
    
    const user = auth.currentUser;
    if (user && !user.emailVerified) {
      try {
        await sendEmailVerification(user);
        return { error: null };
      } catch (error: any) {
        return { error: error.message };
      }
    }
    return { error: 'No user or email already verified' };
  },
  
  // Reset password
  resetPassword: async (email: string) => {
    if (!isFirebaseInitialized()) {
      return { error: 'Firebase is not initialized.' };
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },
  
  // Get current user
  onAuthStateChange: (callback: (user: FirebaseUser | null) => void) => {
    if (!isFirebaseInitialized()) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, callback);
  },
  
  // Get user profile
  getUserProfile: async (uid: string) => {
    if (!isFirebaseInitialized()) {
      return { profile: null, error: 'Firebase is not initialized.' };
    }
    
    try {
      const profileDoc = await getDoc(doc(db, 'users', uid));
      if (profileDoc.exists()) {
        return { profile: profileDoc.data() as UserProfile, error: null };
      }
      return { profile: null, error: 'Profile not found' };
    } catch (error: any) {
      return { profile: null, error: error.message };
    }
  },
  
  // Update user profile
  updateProfile: async (uid: string, data: Partial<UserProfile>) => {
    if (!isFirebaseInitialized()) {
      return { error: 'Firebase is not initialized.' };
    }
    
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },
};

// Admin service functions
export const adminService = {
  // Get all ambassadors
  getAllAmbassadors: async () => {
    if (!isFirebaseInitialized()) {
      return { ambassadors: [], error: 'Firebase is not initialized.' };
    }

    try {
      const q = query(collection(db, 'ambassadors'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const ambassadors = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const ambassadorData = docSnapshot.data();
          const userDoc = await getDoc(doc(db, 'users', docSnapshot.id));
          const userData = userDoc.data();
          return { 
            ...ambassadorData, 
            ...userData, 
            uid: docSnapshot.id 
          };
        })
      );
      return { ambassadors, error: null };
    } catch (error: any) {
      console.error('Error getting ambassadors:', error);
      return { ambassadors: [], error: error.message };
    }
  },

  // Get ambassador by ID
  getAmbassadorById: async (ambassadorId: string) => {
    if (!isFirebaseInitialized()) {
      return { ambassador: null, error: 'Firebase is not initialized.' };
    }

    try {
      const ambassadorDoc = await getDoc(doc(db, 'ambassadors', ambassadorId));
      if (!ambassadorDoc.exists()) {
        return { ambassador: null, error: 'Ambassador not found' };
      }
      
      const userDoc = await getDoc(doc(db, 'users', ambassadorId));
      const userData = userDoc.data();
      
      return { 
        ambassador: { ...ambassadorDoc.data(), ...userData, uid: ambassadorId }, 
        error: null 
      };
    } catch (error: any) {
      return { ambassador: null, error: error.message };
    }
  },

  // Update ambassador interview status
  updateAmbassadorInterviewStatus: async (
    ambassadorId: string, 
    status: 'pending' | 'scheduled' | 'completed' | 'passed' | 'failed',
    notes?: string
  ) => {
    if (!isFirebaseInitialized()) {
      return { error: 'Firebase is not initialized.' };
    }
    
    try {
      const ambassadorRef = doc(db, 'ambassadors', ambassadorId);
      const updateData: any = {
        interviewStatus: status,
        updatedAt: serverTimestamp(),
      };
      
      if (notes) {
        updateData.interviewNotes = notes;
      }
      
      if (status === 'passed') {
        // Move to approval pending stage
        updateData.onboardingStep = 4;
        updateData.applicationStatus = 'pending';
      } else if (status === 'failed') {
        updateData.applicationStatus = 'rejected';
        updateData.rejectedAt = serverTimestamp();
        updateData.isActive = false;
        updateData.onboardingStep = 4;
      }
      
      await updateDoc(ambassadorRef, updateData);
      
      // Also update the user's isActive status if rejected
      if (status === 'failed') {
        const userRef = doc(db, 'users', ambassadorId);
        await updateDoc(userRef, {
          isActive: false,
          updatedAt: serverTimestamp(),
        });
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('Error updating interview status:', error);
      return { error: error.message };
    }
  },

  // Approve ambassador and generate referral code
  approveAmbassador: async (ambassadorId: string) => {
    if (!isFirebaseInitialized()) {
      return { error: 'Firebase is not initialized.', referralCode: null };
    }

    try {
      // Get ambassador data first to generate personalized code
      const ambassadorRef = doc(db, 'ambassadors', ambassadorId);
      const ambassadorDoc = await getDoc(ambassadorRef);
      
      if (!ambassadorDoc.exists()) {
        return { error: 'Ambassador not found', referralCode: null };
      }
      
      const ambassadorData = ambassadorDoc.data();
      
      // Generate personalized referral code using name
      const userDoc = await getDoc(doc(db, 'users', ambassadorId));
      const userData = userDoc.data();
      const firstName = userData?.firstName || '';
      const lastName = userData?.lastName || '';
      const referralCode = generateReferralCode(firstName, lastName);
      
      const batch = writeBatch(db);
      
      batch.update(ambassadorRef, {
        applicationStatus: 'approved',
        referralCode,
        approvedAt: serverTimestamp(),
        onboardingStep: 5,
        updatedAt: serverTimestamp(),
      });
      
      const userRef = doc(db, 'users', ambassadorId);
      batch.update(userRef, {
        isActive: true,
        updatedAt: serverTimestamp(),
      });
      
      await batch.commit();
      
      // TODO: Send email with referral code
      // You would integrate an email service here (e.g., SendGrid, AWS SES, etc.)
      console.log(`✅ Ambassador ${ambassadorId} approved with referral code: ${referralCode}`);
      
      return { error: null, referralCode };
    } catch (error: any) {
      console.error('Error approving ambassador:', error);
      return { error: error.message, referralCode: null };
    }
  },

  // Reject ambassador
  rejectAmbassador: async (ambassadorId: string, reason: string) => {
    if (!isFirebaseInitialized()) {
      return { error: 'Firebase is not initialized.' };
    }

    try {
      const batch = writeBatch(db);
      
      const ambassadorRef = doc(db, 'ambassadors', ambassadorId);
      batch.update(ambassadorRef, {
        applicationStatus: 'rejected',
        rejectionReason: reason,
        rejectedAt: serverTimestamp(),
        onboardingStep: 4,
        updatedAt: serverTimestamp(),
      });
      
      const userRef = doc(db, 'users', ambassadorId);
      batch.update(userRef, {
        isActive: false,
        updatedAt: serverTimestamp(),
      });
      
      await batch.commit();
      
      return { error: null };
    } catch (error: any) {
      console.error('Error rejecting ambassador:', error);
      return { error: error.message };
    }
  },

  // Get all doctors
  getAllDoctors: async () => {
    if (!isFirebaseInitialized()) {
      return { doctors: [], error: 'Firebase is not initialized.' };
    }
    
    try {
      const q = query(collection(db, 'doctors'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const doctors = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const doctorData = docSnapshot.data();
          const userDoc = await getDoc(doc(db, 'users', docSnapshot.id));
          const userData = userDoc.data();
          
          return {
            ...doctorData,
            ...userData,
            uid: docSnapshot.id,
          };
        })
      );
      
      return { doctors, error: null };
    } catch (error: any) {
      console.error('Error getting doctors:', error);
      return { doctors: [], error: error.message };
    }
  },

  // Get all patients
  getAllPatients: async () => {
    if (!isFirebaseInitialized()) {
      return { patients: [], error: 'Firebase is not initialized.' };
    }
    
    try {
      const q = query(collection(db, 'patients'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const patients = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const patientData = docSnapshot.data();
          const userDoc = await getDoc(doc(db, 'users', docSnapshot.id));
          const userData = userDoc.data();
          
          return {
            ...patientData,
            ...userData,
            uid: docSnapshot.id,
          };
        })
      );
      
      return { patients, error: null };
    } catch (error: any) {
      console.error('Error getting patients:', error);
      return { patients: [], error: error.message };
    }
  },

  // Deactivate/Activate user
  deactivateUser: async (userId: string) => {
    if (!isFirebaseInitialized()) {
      return { error: 'Firebase is not initialized.' };
    }
    
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        await updateDoc(userRef, {
          isActive: !userData.isActive,
          updatedAt: serverTimestamp(),
        });
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('Error deactivating user:', error);
      return { error: error.message };
    }
  },

  // Delete inactive patients
  deleteInactivePatients: async (daysThreshold: number = 365) => {
    if (!isFirebaseInitialized()) {
      return { count: 0, error: 'Firebase is not initialized.' };
    }
    
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
      
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'patient'),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      let deleteCount = 0;
      
      snapshot.docs.forEach(docSnapshot => {
        const userData = docSnapshot.data();
        const lastLogin = userData.lastLogin?.toDate() || userData.createdAt?.toDate();
        
        if (lastLogin && lastLogin < thresholdDate) {
          batch.delete(doc(db, 'users', docSnapshot.id));
          batch.delete(doc(db, 'patients', docSnapshot.id));
          deleteCount++;
        }
      });
      
      if (deleteCount > 0) {
        await batch.commit();
      }
      
      return { count: deleteCount, error: null };
    } catch (error: any) {
      console.error('Error deleting inactive patients:', error);
      return { count: 0, error: error.message };
    }
  },
  
  // Check if admin exists
  checkAdminExists: async () => {
    if (!isFirebaseInitialized()) {
      return false;
    }
    
    try {
      const adminsSnapshot = await getDocs(collection(db, 'admins'));
      return !adminsSnapshot.empty;
    } catch (error) {
      console.error('Error checking admin:', error);
      return false;
    }
  },

  // Get dashboard stats
  getDashboardStats: async () => {
    if (!isFirebaseInitialized()) {
      return { stats: null, error: 'Firebase is not initialized.' };
    }
    
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => doc.data());
      
      const doctorsSnapshot = await getDocs(query(
        collection(db, 'doctors'),
        where('verificationStatus', '==', 'verified')
      ));
      
      const pendingDoctorsSnapshot = await getDocs(query(
        collection(db, 'doctors'),
        where('verificationStatus', '==', 'pending')
      ));
      
      const pendingAmbassadorsSnapshot = await getDocs(query(
        collection(db, 'ambassadors'),
        where('applicationStatus', '==', 'pending')
      ));
      
      // Count ambassadors who passed interview and are ready for approval
      const readyForApprovalSnapshot = await getDocs(query(
        collection(db, 'ambassadors'),
        where('interviewStatus', '==', 'passed'),
        where('applicationStatus', '==', 'pending')
      ));
      
      // Get referral stats
      const referralsSnapshot = await getDocs(collection(db, 'referrals'));
      const referrals = referralsSnapshot.docs.map(doc => doc.data());
      
      return {
        stats: {
          totalUsers: users.length,
          totalDoctors: doctorsSnapshot.size,
          totalPatients: users.filter((u: any) => u.role === 'patient').length,
          totalAmbassadors: users.filter((u: any) => u.role === 'ambassador').length,
          pendingDoctors: pendingDoctorsSnapshot.size,
          pendingAmbassadors: pendingAmbassadorsSnapshot.size,
          readyForApproval: readyForApprovalSnapshot.size,
          openTickets: 0,
          urgentTickets: 0,
          totalReferrals: referrals.length,
          pendingReferrals: referrals.filter(r => r.status === 'pending').length,
          totalCommission: referrals
            .filter(r => r.status === 'verified')
            .reduce((sum, r) => sum + (r.commissionEarned || 0), 0),
        },
        error: null,
      };
    } catch (error: any) {
      console.error('Error getting dashboard stats:', error);
      return { stats: null, error: error.message };
    }
  },
  
  // Get all users
  getAllUsers: async (filters?: { role?: string; isActive?: boolean; limit?: number }) => {
    if (!isFirebaseInitialized()) {
      return { users: [], error: 'Firebase is not initialized.' };
    }
    
    try {
      let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      
      if (filters?.role) {
        q = query(q, where('role', '==', filters.role));
      }
      
      if (filters?.isActive !== undefined) {
        q = query(q, where('isActive', '==', filters.isActive));
      }
      
      if (filters?.limit) {
        q = query(q, limit(filters.limit));
      }
      
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        accountAgeDays: doc.data().createdAt 
          ? Math.floor((Date.now() - doc.data().createdAt.toDate()) / (1000 * 60 * 60 * 24))
          : 0,
      }));
      
      return { users, error: null };
    } catch (error: any) {
      console.error('Error getting all users:', error);
      return { users: [], error: error.message };
    }
  },
  
  // Get pending doctors
  getPendingDoctors: async () => {
    if (!isFirebaseInitialized()) {
      return { doctors: [], error: 'Firebase is not initialized.' };
    }
    
    try {
      const q = query(
        collection(db, 'doctors'),
        where('verificationStatus', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const doctors = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const doctorData = docSnapshot.data();
          const userDoc = await getDoc(doc(db, 'users', docSnapshot.id));
          const userData = userDoc.data();
          
          return {
            id: docSnapshot.id,
            ...doctorData,
            user: userData,
            ...userData,
            uid: docSnapshot.id,
            submittedAt: doctorData.createdAt?.toDate().toISOString(),
          };
        })
      );
      
      return { doctors, error: null };
    } catch (error: any) {
      console.error('Error getting pending doctors:', error);
      return { doctors: [], error: error.message };
    }
  },
  
  // Approve doctor with referral handling
  approveDoctor: async (doctorId: string, notes?: string) => {
    if (!isFirebaseInitialized()) {
      return { error: 'Firebase is not initialized.' };
    }
    
    try {
      const batch = writeBatch(db);
      
      const doctorRef = doc(db, 'doctors', doctorId);
      batch.update(doctorRef, {
        verificationStatus: 'verified',
        verifiedAt: serverTimestamp(),
        verificationNotes: notes || null,
        updatedAt: serverTimestamp(),
      });
      
      const userRef = doc(db, 'users', doctorId);
      batch.update(userRef, {
        isActive: true,
        updatedAt: serverTimestamp(),
      });
      
      // Check if this doctor was referred
      const referralRef = doc(db, 'referrals', `doctor_${doctorId}`);
      const referralDoc = await getDoc(referralRef);
      
      if (referralDoc.exists()) {
        // Update referral status to verified
        const referralData = referralDoc.data();
        const commissionAmount = 500; // Fixed commission amount
        
        batch.update(referralRef, {
          status: 'verified',
          verifiedAt: serverTimestamp(),
          commissionEarned: commissionAmount,
          updatedAt: serverTimestamp(),
        });
        
        // Update ambassador's earnings
        const ambassadorRef = doc(db, 'ambassadors', referralData.ambassadorId);
        const ambassadorDoc = await getDoc(ambassadorRef);
        if (ambassadorDoc.exists()) {
          const ambassadorData = ambassadorDoc.data();
          const currentPending = ambassadorData.pendingEarnings || 0;
          const currentTotal = ambassadorData.totalEarnings || 0;
          const activeReferred = ambassadorData.activeReferredDoctors || 0;
          
          batch.update(ambassadorRef, {
            pendingEarnings: currentPending + commissionAmount,
            totalEarnings: currentTotal + commissionAmount,
            activeReferredDoctors: activeReferred + 1,
            updatedAt: serverTimestamp(),
          });
        }
      }
      
      await batch.commit();
      return { error: null };
    } catch (error: any) {
      console.error('Error approving doctor:', error);
      return { error: error.message };
    }
  },
  
  // Reject doctor with referral handling
  rejectDoctor: async (doctorId: string, reason: string) => {
    if (!isFirebaseInitialized()) {
      return { error: 'Firebase is not initialized.' };
    }
    
    try {
      const batch = writeBatch(db);
      
      const doctorRef = doc(db, 'doctors', doctorId);
      batch.update(doctorRef, {
        verificationStatus: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectionReason: reason,
        updatedAt: serverTimestamp(),
      });
      
      const userRef = doc(db, 'users', doctorId);
      batch.update(userRef, {
        isActive: false,
        updatedAt: serverTimestamp(),
      });
      
      // Check if this doctor was referred
      const referralRef = doc(db, 'referrals', `doctor_${doctorId}`);
      const referralDoc = await getDoc(referralRef);
      
      if (referralDoc.exists()) {
        // Update referral status to rejected
        batch.update(referralRef, {
          status: 'rejected',
          rejectionReason: reason,
          updatedAt: serverTimestamp(),
        });
      }
      
      await batch.commit();
      return { error: null };
    } catch (error: any) {
      console.error('Error rejecting doctor:', error);
      return { error: error.message };
    }
  },

  // Update ambassador onboarding step
  updateAmbassadorOnboardingStep: async (ambassadorId: string, step: number) => {
    if (!isFirebaseInitialized()) {
      return { error: 'Firebase is not initialized.' };
    }
    
    try {
      const ambassadorRef = doc(db, 'ambassadors', ambassadorId);
      await updateDoc(ambassadorRef, {
        onboardingStep: step,
        updatedAt: serverTimestamp(),
      });
      return { error: null };
    } catch (error: any) {
      console.error('Error updating onboarding step:', error);
      return { error: error.message };
    }
  },

  // Get ambassador psychometric test status
  getPsychometricTestStatus: async (ambassadorId: string) => {
    if (!isFirebaseInitialized()) {
      return { status: null, error: 'Firebase is not initialized.' };
    }
    
    try {
      const ambassadorDoc = await getDoc(doc(db, 'ambassadors', ambassadorId));
      if (!ambassadorDoc.exists()) {
        return { status: null, error: 'Ambassador not found' };
      }
      
      const data = ambassadorDoc.data();
      return { 
        status: {
          passed: data.psychometricTest?.passed,
          score: data.psychometricTest?.score,
          attemptDate: data.psychometricTest?.attemptDate,
          nextAttemptDate: data.psychometricTest?.nextAttemptDate,
        },
        error: null 
      };
    } catch (error: any) {
      return { status: null, error: error.message };
    }
  },

  // ============== REFERRAL FUNCTIONS ==============
  
  // Get all referrals
  getReferrals: async (filters?: { status?: string; ambassadorId?: string }) => {
    if (!isFirebaseInitialized()) {
      return { referrals: [], error: 'Firebase is not initialized.' };
    }
    
    try {
      let q = query(collection(db, 'referrals'), orderBy('referredAt', 'desc'));
      
      if (filters?.status) {
        q = query(q, where('status', '==', filters.status));
      }
      
      if (filters?.ambassadorId) {
        q = query(q, where('ambassadorId', '==', filters.ambassadorId));
      }
      
      const snapshot = await getDocs(q);
      const referrals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        referredAt: doc.data().referredAt?.toDate().toISOString(),
        verifiedAt: doc.data().verifiedAt?.toDate().toISOString(),
      }));
      
      return { referrals, error: null };
    } catch (error: any) {
      console.error('Error getting referrals:', error);
      return { referrals: [], error: error.message };
    }
  },

  // Get referrals by ambassador
  getAmbassadorReferrals: async (ambassadorId: string) => {
    return adminService.getReferrals({ ambassadorId });
  },

  // Get pending referrals (doctors waiting for verification)
  getPendingReferrals: async () => {
    return adminService.getReferrals({ status: 'pending' });
  },

  // Update referral status when doctor is verified
  updateReferralStatus: async (doctorId: string, status: 'verified' | 'rejected', rejectionReason?: string) => {
    if (!isFirebaseInitialized()) {
      return { error: 'Firebase is not initialized.' };
    }
    
    try {
      const referralRef = doc(db, 'referrals', `doctor_${doctorId}`);
      const referralDoc = await getDoc(referralRef);
      
      if (!referralDoc.exists()) {
        return { error: 'Referral not found' };
      }
      
      const referralData = referralDoc.data();
      const batch = writeBatch(db);
      
      // Update referral
      batch.update(referralRef, {
        status: status,
        ...(status === 'verified' ? { verifiedAt: serverTimestamp() } : {}),
        ...(rejectionReason ? { rejectionReason } : {}),
        updatedAt: serverTimestamp(),
      });
      
      if (status === 'verified') {
        // Calculate commission (e.g., R500 for a verified doctor)
        const commissionAmount = 500;
        
        batch.update(referralRef, {
          commissionEarned: commissionAmount,
        });
        
        // Update ambassador's earnings
        const ambassadorRef = doc(db, 'ambassadors', referralData.ambassadorId);
        const ambassadorDoc = await getDoc(ambassadorRef);
        if (ambassadorDoc.exists()) {
          const ambassadorData = ambassadorDoc.data();
          const currentPending = ambassadorData.pendingEarnings || 0;
          const currentTotal = ambassadorData.totalEarnings || 0;
          const activeReferred = ambassadorData.activeReferredDoctors || 0;
          
          batch.update(ambassadorRef, {
            pendingEarnings: currentPending + commissionAmount,
            totalEarnings: currentTotal + commissionAmount,
            activeReferredDoctors: activeReferred + 1,
            updatedAt: serverTimestamp(),
          });
        }
      }
      
      await batch.commit();
      
      return { error: null };
    } catch (error: any) {
      console.error('Error updating referral status:', error);
      return { error: error.message };
    }
  },

  // Get referral stats for dashboard
  getReferralStats: async () => {
    if (!isFirebaseInitialized()) {
      return { stats: null, error: 'Firebase is not initialized.' };
    }
    
    try {
      const referralsSnapshot = await getDocs(collection(db, 'referrals'));
      const referrals = referralsSnapshot.docs.map(doc => doc.data());
      
      const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
      const verifiedReferrals = referrals.filter(r => r.status === 'verified').length;
      const rejectedReferrals = referrals.filter(r => r.status === 'rejected').length;
      const totalCommission = referrals
        .filter(r => r.status === 'verified')
        .reduce((sum, r) => sum + (r.commissionEarned || 0), 0);
      
      return {
        stats: {
          totalReferrals: referrals.length,
          pendingReferrals,
          verifiedReferrals,
          rejectedReferrals,
          totalCommission,
        },
        error: null,
      };
    } catch (error: any) {
      console.error('Error getting referral stats:', error);
      return { stats: null, error: error.message };
    }
  },
};

export default app;