// lib/services/ambassadorService.ts
import { db } from '@/lib/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { 
  MEDMAP_BOOKING_FEE, 
  ReferralDoctor, 
  AmbassadorData 
} from '@/lib/types/ambassador';

export class AmbassadorService {
  static async getAmbassadorData(uid: string): Promise<AmbassadorData | null> {
    if (!uid) return null;
    
    try {
      const docRef = doc(db, 'ambassadors', uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      
      return { uid, ...docSnap.data() } as AmbassadorData;
    } catch (error) {
      console.error('❌ Error fetching ambassador data:', error);
      return null;
    }
  }

  static async updateAmbassadorTier(uid: string, tier: string): Promise<void> {
    try {
      const ref = doc(db, 'ambassadors', uid);
      await updateDoc(ref, { 
        currentTier: tier, 
        updatedAt: serverTimestamp() 
      });
    } catch (error) {
      console.error('❌ Error updating ambassador tier:', error);
      throw error;
    }
  }

  static async getReferrals(ambassadorId: string): Promise<ReferralDoctor[]> {
    if (!ambassadorId) {
      console.log('❌ No ambassadorId provided');
      return [];
    }

    try {
      console.log(`🔍 Fetching referrals for ambassador: ${ambassadorId}`);
      
      const ref = collection(db, 'referrals');
      const q = query(ref, where('ambassadorId', '==', ambassadorId));
      const snapshot = await getDocs(q);
      
      console.log(`📊 Found ${snapshot.size} referral documents`);
      
      if (snapshot.empty) {
        console.log('ℹ️ No referrals found for this ambassador');
        return [];
      }
      
      const referrals: ReferralDoctor[] = [];
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        console.log(`📝 Processing referral: ${docSnap.id}`, data);
        
        // Get doctor details - handle doctorId properly
        const doctorId = data.doctorId || '';
        const doctorData = await this.getDoctorData(doctorId);
        const monthlyStats = await this.getDoctorMonthlyStats(doctorId, currentMonth, currentYear);
        
        const referral: ReferralDoctor = {
          id: docSnap.id,
          doctorId: doctorId,
          doctorFullName: doctorData.fullName || data.doctorName || 'Unknown Doctor',
          doctorEmail: doctorData.email || data.doctorEmail || '',
          doctorSpecialization: doctorData.specialization || data.doctorSpecialization || 'N/A',
          referralCode: data.referralCode || '',
          referredAt: data.referredAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          verifiedAt: data.verifiedAt?.toDate?.()?.toISOString() || null,
          status: data.status || 'pending',
          commissionEarned: data.commissionEarned || 0,
          commissionPaid: data.commissionPaid || false,
          rejectionReason: data.rejectionReason || '',
          doctorIsActive: doctorData.isActive || false,
          ...monthlyStats,
        };
        
        console.log(`✅ Added referral for doctor: ${referral.doctorFullName} (${referral.status})`);
        referrals.push(referral);
      }
      
      console.log(`✅ Total referrals loaded: ${referrals.length}`);
      return referrals;
    } catch (error) {
      console.error('❌ Error fetching referrals:', error);
      return [];
    }
  }

  private static async getDoctorData(doctorId: string) {
    if (!doctorId) {
      return { fullName: 'Unknown Doctor', email: '', specialization: 'N/A', isActive: false };
    }
    
    try {
      console.log(`🔍 Fetching doctor data for: ${doctorId}`);
      
      // Try to get from doctors collection first
      let doctorData = {};
      let userData = {};
      
      try {
        const doctorDoc = await getDoc(doc(db, 'doctors', doctorId));
        if (doctorDoc.exists()) {
          doctorData = doctorDoc.data();
        }
      } catch (e) {
        console.warn(`⚠️ Doctor doc not found for ${doctorId}`);
      }
      
      try {
        const userDoc = await getDoc(doc(db, 'users', doctorId));
        if (userDoc.exists()) {
          userData = userDoc.data();
        }
      } catch (e) {
        console.warn(`⚠️ User doc not found for ${doctorId}`);
      }
      
      // If we have no data, try to use the data from the referral document directly
      if (!userData && !doctorData) {
        console.warn(`⚠️ No data found for doctor ${doctorId}, checking referral data`);
        try {
          const referralDoc = await getDoc(doc(db, 'referrals', `doctor_${doctorId}`));
          if (referralDoc.exists()) {
            const referralData = referralDoc.data();
            return {
              fullName: referralData.doctorName || 'Unknown Doctor',
              email: referralData.doctorEmail || '',
              specialization: referralData.doctorSpecialization || 'N/A',
              isActive: false,
            };
          }
        } catch (e) {
          console.warn(`⚠️ Referral doc not found for ${doctorId}`);
        }
      }
      
      const result = {
        fullName: userData?.fullName || doctorData?.fullName || 'Unknown Doctor',
        email: userData?.email || doctorData?.email || '',
        specialization: doctorData?.specialization || 'N/A',
        isActive: userData?.isActive || false,
      };
      
      console.log(`✅ Doctor data: ${result.fullName} (${result.email})`);
      return result;
    } catch (error) {
      console.error(`❌ Error fetching doctor data for ${doctorId}:`, error);
      return { fullName: 'Unknown Doctor', email: '', specialization: 'N/A', isActive: false };
    }
  }

  private static async getDoctorMonthlyStats(doctorId: string, month: number, year: number) {
    if (!doctorId) {
      return { 
        monthlyBookings: 0, 
        monthlyRevenue: 0, 
        monthlyBookingFeeRevenue: 0, 
        eligibleForCommission: false 
      };
    }
    
    try {
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);
      
      // Format dates for query
      const startDateStr = startOfMonth.toISOString().split('T')[0];
      const endDateStr = endOfMonth.toISOString().split('T')[0];
      
      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef,
        where('doctorId', '==', doctorId),
        where('status', '==', 'completed'),
        where('appointmentDate', '>=', startDateStr),
        where('appointmentDate', '<=', endDateStr)
      );
      
      const snapshot = await getDocs(q);
      const monthlyBookings = snapshot.size;
      let monthlyRevenue = 0;
      
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        monthlyRevenue += data.consultationFee || 0;
      });
      
      const monthlyBookingFeeRevenue = monthlyBookings * MEDMAP_BOOKING_FEE;
      const eligibleForCommission = monthlyBookings >= 50;
      
      return { 
        monthlyBookings, 
        monthlyRevenue, 
        monthlyBookingFeeRevenue, 
        eligibleForCommission 
      };
    } catch (error) {
      console.error(`❌ Error fetching monthly stats for ${doctorId}:`, error);
      return { 
        monthlyBookings: 0, 
        monthlyRevenue: 0, 
        monthlyBookingFeeRevenue: 0, 
        eligibleForCommission: false 
      };
    }
  }

  // ==================== NEW METHODS ====================

  /**
   * Update ambassador stats (total referrals, active doctors, earnings, tier)
   * Call this whenever a referral status changes
   */
  static async updateAmbassadorStats(ambassadorId: string): Promise<void> {
    try {
      console.log(`📊 Updating stats for ambassador: ${ambassadorId}`);
      
      // Get all referrals for this ambassador
      const referrals = await this.getReferrals(ambassadorId);
      
      const totalReferredDoctors = referrals.length;
      const verifiedReferrals = referrals.filter(r => r.status === 'verified');
      const activeReferredDoctors = verifiedReferrals.filter(r => r.doctorIsActive).length;
      
      // Calculate total earnings from verified referrals
      const totalEarnings = verifiedReferrals.reduce(
        (sum, r) => sum + (r.commissionEarned || 0), 0
      );
      
      const pendingEarnings = verifiedReferrals
        .filter(r => !r.commissionPaid)
        .reduce((sum, r) => sum + (r.commissionEarned || 0), 0);
      
      // Determine tier based on active referred doctors
      let currentTier: 'bronze' | 'silver' | 'gold' | 'diamond' = 'bronze';
      if (activeReferredDoctors >= 100) currentTier = 'diamond';
      else if (activeReferredDoctors >= 51) currentTier = 'gold';
      else if (activeReferredDoctors >= 11) currentTier = 'silver';
      
      const ambassadorRef = doc(db, 'ambassadors', ambassadorId);
      await updateDoc(ambassadorRef, {
        totalReferredDoctors,
        activeReferredDoctors,
        totalEarnings,
        pendingEarnings,
        currentTier,
        updatedAt: serverTimestamp(),
      });
      
      console.log(`✅ Updated ambassador stats: ${totalReferredDoctors} referrals, ${activeReferredDoctors} active, tier: ${currentTier}`);
    } catch (error) {
      console.error('❌ Error updating ambassador stats:', error);
      throw error;
    }
  }

  /**
   * Verify a referral when a doctor is approved
   * @param doctorId - The doctor's UID
   * @param commissionAmount - The commission amount (default: R500)
   */
  static async verifyReferral(doctorId: string, commissionAmount: number = 500): Promise<void> {
    try {
      console.log(`✅ Verifying referral for doctor: ${doctorId}`);
      
      // Find the referral document
      const referralRef = doc(db, 'referrals', `doctor_${doctorId}`);
      const referralDoc = await getDoc(referralRef);
      
      if (!referralDoc.exists()) {
        console.warn(`⚠️ Referral not found for doctor ${doctorId}`);
        return;
      }
      
      const referralData = referralDoc.data();
      const ambassadorId = referralData.ambassadorId;
      
      if (!ambassadorId) {
        console.warn(`⚠️ No ambassadorId found in referral for doctor ${doctorId}`);
        return;
      }
      
      // Update referral status
      await updateDoc(referralRef, {
        status: 'verified',
        verifiedAt: serverTimestamp(),
        commissionEarned: commissionAmount,
        updatedAt: serverTimestamp(),
      });
      
      console.log(`✅ Referral verified for doctor ${doctorId}, commission: R${commissionAmount}`);
      
      // Update ambassador stats
      await this.updateAmbassadorStats(ambassadorId);
    } catch (error) {
      console.error('❌ Error verifying referral:', error);
      throw error;
    }
  }

  /**
   * Reject a referral when a doctor is rejected
   * @param doctorId - The doctor's UID
   * @param reason - The rejection reason
   */
  static async rejectReferral(doctorId: string, reason: string): Promise<void> {
    try {
      console.log(`❌ Rejecting referral for doctor: ${doctorId}`);
      
      // Find the referral document
      const referralRef = doc(db, 'referrals', `doctor_${doctorId}`);
      const referralDoc = await getDoc(referralRef);
      
      if (!referralDoc.exists()) {
        console.warn(`⚠️ Referral not found for doctor ${doctorId}`);
        return;
      }
      
      const referralData = referralDoc.data();
      const ambassadorId = referralData.ambassadorId;
      
      // Update referral status
      await updateDoc(referralRef, {
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: serverTimestamp(),
      });
      
      console.log(`✅ Referral rejected for doctor ${doctorId}`);
      
      // Update ambassador stats if we have an ambassadorId
      if (ambassadorId) {
        await this.updateAmbassadorStats(ambassadorId);
      }
    } catch (error) {
      console.error('❌ Error rejecting referral:', error);
      throw error;
    }
  }

  /**
   * Get a referral by doctor ID
   */
  static async getReferralByDoctorId(doctorId: string): Promise<any | null> {
    try {
      const referralRef = doc(db, 'referrals', `doctor_${doctorId}`);
      const referralDoc = await getDoc(referralRef);
      
      if (!referralDoc.exists()) {
        return null;
      }
      
      return {
        id: referralDoc.id,
        ...referralDoc.data()
      };
    } catch (error) {
      console.error(`❌ Error fetching referral for doctor ${doctorId}:`, error);
      return null;
    }
  }

  /**
   * Get ambassador by referral code
   */
  static async getAmbassadorByReferralCode(referralCode: string): Promise<any | null> {
    try {
      const q = query(
        collection(db, 'ambassadors'),
        where('referralCode', '==', referralCode),
        where('applicationStatus', '==', 'approved')
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error(`❌ Error fetching ambassador by referral code ${referralCode}:`, error);
      return null;
    }
  }
}