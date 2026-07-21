// lib/types/ambassador.ts
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
  // All referrals (pending + verified + rejected)
  totalReferrals: number;
  pendingReferrals: number;
  verifiedReferrals: number;
  rejectedReferrals: number;
  
  // Quality metrics
  activeDoctors: number;           // Verified + Active + 50+ bookings/month
  eligibleDoctors: number;         // Verified + Active (regardless of bookings)
  
  // Tier (based on ACTIVE doctors)
  currentTier: string;
  commissionRate: number;
  
  // Progress (based on TOTAL referrals)
  tierProgress: {
    current: number;   // Total referrals
    next: number | null;  // Next tier threshold
    max: number;
  };
  
  // Commission (from ACTIVE doctors only)
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  eligibleBookingFeeRevenue: number;
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

// TIERS based on ACTIVE doctors (quality)
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