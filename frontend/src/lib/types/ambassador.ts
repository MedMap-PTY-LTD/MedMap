export const MEDMAP_BOOKING_FEE = 10;

export interface TierConfig {
  name: 'bronze' | 'silver' | 'gold' | 'diamond';
  minDoctors: number;
  maxDoctors: number;
  commissionRate: number;
  color: string;
  label: string;
}

export interface ReferralDoctor {
  id: string;
  doctorId: string;
  doctorFullName: string;
  doctorEmail: string;
  doctorSpecialization: string;
  referralCode: string;
  referredAt: string;
  verifiedAt: string | null;
  status: 'pending' | 'verified' | 'rejected';
  commissionEarned: number;
  commissionPaid: boolean;
  rejectionReason?: string;
  monthlyBookings: number;
  monthlyRevenue: number;
  monthlyBookingFeeRevenue: number;
  eligibleForCommission: boolean;
  doctorIsActive: boolean;
}

export interface AmbassadorStats {
  totalReferrals: number;
  pendingReferrals: number;
  verifiedReferrals: number;
  rejectedReferrals: number;
  totalCommission: number;
  activeDoctors: number;
  eligibleDoctors: number;
  eligibleBookingFeeRevenue: number;
  pendingCommission: number;
  paidCommission: number;
  currentTier: string;
  commissionRate: number;
  tierProgress: {
    current: number;
    next: number | null;
    max: number;
  };
}

export interface AmbassadorData {
  uid: string;
  referralCode: string | null;
  applicationStatus: 'pending' | 'approved' | 'rejected';
  onboardingStep: number;
  currentTier: 'bronze' | 'silver' | 'gold' | 'diamond';
  totalEarnings: number;
  pendingEarnings: number;
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
  rejectionReason?: string;
  createdAt: any;
  updatedAt: any;
  isActive: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export const TIERS: TierConfig[] = [
  { 
    name: 'bronze', 
    minDoctors: 0, 
    maxDoctors: 10, 
    commissionRate: 0.10, 
    color: 'bg-amber-600', 
    label: 'Bronze' 
  },
  { 
    name: 'silver', 
    minDoctors: 11, 
    maxDoctors: 50, 
    commissionRate: 0.15, 
    color: 'bg-gray-400', 
    label: 'Silver' 
  },
  { 
    name: 'gold', 
    minDoctors: 51, 
    maxDoctors: 99, 
    commissionRate: 0.20, 
    color: 'bg-yellow-500', 
    label: 'Gold' 
  },
  { 
    name: 'diamond', 
    minDoctors: 100, 
    maxDoctors: Infinity, 
    commissionRate: 0.25, 
    color: 'bg-cyan-400', 
    label: 'Diamond' 
  },
];