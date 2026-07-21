// lib/services/ambassadorStats.ts
import { ReferralDoctor, AmbassadorStats, TIERS, TierConfig } from '@/lib/types/ambassador';

export class AmbassadorStatsCalculator {
  static calculate(referrals: ReferralDoctor[]): AmbassadorStats {
    // Total referrals (all statuses)
    const totalReferrals = referrals.length;
    
    // Count by status
    const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
    const verifiedReferrals = referrals.filter(r => r.status === 'verified').length;
    const rejectedReferrals = referrals.filter(r => r.status === 'rejected').length;
    
    // QUALITY METRICS: Active doctors = verified + active + eligibleForCommission (50+ bookings)
    const activeDoctors = referrals.filter(
      r => r.status === 'verified' && r.doctorIsActive && r.eligibleForCommission
    ).length;
    
    // Eligible doctors = verified + active (regardless of bookings)
    const eligibleDoctors = referrals.filter(
      r => r.status === 'verified' && r.doctorIsActive
    ).length;
    
    // TIER: Based on ACTIVE doctors (quality)
    const currentTier = this.getCurrentTier(activeDoctors);
    const commissionRate = currentTier.commissionRate;
    
    // TIER PROGRESS: Based on TOTAL referrals (motivation)
    const tierIndex = TIERS.indexOf(currentTier);
    const nextTier = tierIndex < TIERS.length - 1 ? TIERS[tierIndex + 1] : null;
    
    // COMMISSION: Only from active doctors with 50+ bookings
    const activeDoctorsList = referrals.filter(
      r => r.status === 'verified' && r.doctorIsActive && r.eligibleForCommission
    );
    
    const eligibleBookingFeeRevenue = activeDoctorsList.reduce(
      (sum, r) => sum + (r.monthlyBookingFeeRevenue || 0), 0
    );
    
    const totalCommission = eligibleBookingFeeRevenue * commissionRate;
    
    // Pending commission = active doctors not yet paid
    const pendingCommission = activeDoctorsList
      .filter(r => !r.commissionPaid)
      .reduce((sum, r) => sum + ((r.monthlyBookingFeeRevenue || 0) * commissionRate), 0);
    
    // Paid commission = active doctors already paid
    const paidCommission = activeDoctorsList
      .filter(r => r.commissionPaid)
      .reduce((sum, r) => sum + ((r.monthlyBookingFeeRevenue || 0) * commissionRate), 0);
    
    return {
      // All referrals
      totalReferrals,
      pendingReferrals,
      verifiedReferrals,
      rejectedReferrals,
      
      // Quality metrics
      activeDoctors,
      eligibleDoctors,
      
      // Tier (based on active doctors)
      currentTier: currentTier.name,
      commissionRate: commissionRate * 100,
      
      // Progress (based on total referrals)
      tierProgress: {
        current: totalReferrals,    // Show total referrals in progress bar
        next: nextTier ? nextTier.minDoctors : null,
        max: currentTier.maxDoctors,
      },
      
      // Commission (from active doctors only)
      totalCommission: totalCommission || 0,
      pendingCommission: pendingCommission || 0,
      paidCommission: paidCommission || 0,
      eligibleBookingFeeRevenue: eligibleBookingFeeRevenue || 0,
    };
  }

  private static getCurrentTier(activeDoctorCount: number): TierConfig {
    for (const tier of TIERS) {
      if (activeDoctorCount >= tier.minDoctors && activeDoctorCount <= tier.maxDoctors) {
        return tier;
      }
    }
    return TIERS[0];
  }
}