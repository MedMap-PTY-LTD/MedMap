// lib/services/ambassadorStats.ts
import { ReferralDoctor, AmbassadorStats, TIERS, TierConfig } from '@/lib/types/ambassador';

export class AmbassadorStatsCalculator {
  static calculate(referrals: ReferralDoctor[]): AmbassadorStats {
    // Always return stats, even if empty
    const verifiedDoctors = referrals.filter(r => r.status === 'verified');
    const activeDoctors = verifiedDoctors.filter(r => r.doctorIsActive);
    const activeVerifiedCount = activeDoctors.length;
    
    const currentTier = this.getCurrentTier(activeVerifiedCount);
    const eligibleDoctors = referrals.filter(r => r.eligibleForCommission && r.status === 'verified');
    
    const totalEligibleBookingFeeRevenue = eligibleDoctors.reduce(
      (sum, r) => sum + (r.monthlyBookingFeeRevenue || 0), 0
    );
    
    const commissionRate = currentTier.commissionRate;
    const totalCommission = totalEligibleBookingFeeRevenue * commissionRate;
    
    const pendingCommission = referrals
      .filter(r => r.status === 'verified' && !r.commissionPaid && r.eligibleForCommission)
      .reduce((sum, r) => sum + ((r.monthlyBookingFeeRevenue || 0) * commissionRate), 0);
    
    const paidCommission = referrals
      .filter(r => r.status === 'verified' && r.commissionPaid && r.eligibleForCommission)
      .reduce((sum, r) => sum + ((r.monthlyBookingFeeRevenue || 0) * commissionRate), 0);
    
    const tierIndex = TIERS.indexOf(currentTier);
    const nextTier = tierIndex < TIERS.length - 1 ? TIERS[tierIndex + 1] : null;
    
    // Ensure we always return valid numbers
    return {
      totalReferrals: referrals.length,
      pendingReferrals: referrals.filter(r => r.status === 'pending').length,
      verifiedReferrals: referrals.filter(r => r.status === 'verified').length,
      rejectedReferrals: referrals.filter(r => r.status === 'rejected').length,
      totalCommission: totalCommission || 0,
      activeDoctors: activeVerifiedCount,
      eligibleDoctors: eligibleDoctors.length,
      eligibleBookingFeeRevenue: totalEligibleBookingFeeRevenue || 0,
      pendingCommission: pendingCommission || 0,
      paidCommission: paidCommission || 0,
      currentTier: currentTier.name,
      commissionRate: commissionRate * 100,
      tierProgress: {
        current: activeVerifiedCount,
        next: nextTier ? nextTier.minDoctors : null,
        max: currentTier.maxDoctors,
      },
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