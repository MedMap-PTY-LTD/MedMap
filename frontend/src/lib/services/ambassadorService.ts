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
    
    const docRef = doc(db, 'ambassadors', uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    
    return { uid, ...docSnap.data() } as AmbassadorData;
  }

  static async updateAmbassadorTier(uid: string, tier: string): Promise<void> {
    const ref = doc(db, 'ambassadors', uid);
    await updateDoc(ref, { 
      currentTier: tier, 
      updatedAt: serverTimestamp() 
    });
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
        
        // Get doctor details
        const doctorData = await this.getDoctorData(data.doctorId);
        const monthlyStats = await this.getDoctorMonthlyStats(data.doctorId, currentMonth, currentYear);
        
        const referral: ReferralDoctor = {
          id: docSnap.id,
          doctorId: data.doctorId || '',
          doctorFullName: doctorData.fullName || data.doctorName || 'Unknown Doctor',
          doctorEmail: doctorData.email || data.doctorEmail || '',
          doctorSpecialization: doctorData.specialization || 'N/A',
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
      
      const [doctorDoc, userDoc] = await Promise.all([
        getDoc(doc(db, 'doctors', doctorId)),
        getDoc(doc(db, 'users', doctorId))
      ]);
      
      const doctorData = doctorDoc.exists() ? doctorDoc.data() : {};
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      const result = {
        fullName: userData.fullName || doctorData.fullName || 'Unknown Doctor',
        email: userData.email || doctorData.email || '',
        specialization: doctorData.specialization || 'N/A',
        isActive: userData.isActive || false,
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
      return { monthlyBookings: 0, monthlyRevenue: 0, monthlyBookingFeeRevenue: 0, eligibleForCommission: false };
    }
    
    try {
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);
      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef,
        where('doctorId', '==', doctorId),
        where('status', '==', 'completed'),
        where('appointmentDate', '>=', startOfMonth.toISOString().split('T')[0]),
        where('appointmentDate', '<=', endOfMonth.toISOString().split('T')[0])
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
      
      return { monthlyBookings, monthlyRevenue, monthlyBookingFeeRevenue, eligibleForCommission };
    } catch (error) {
      console.error(`❌ Error fetching monthly stats for ${doctorId}:`, error);
      return { monthlyBookings: 0, monthlyRevenue: 0, monthlyBookingFeeRevenue: 0, eligibleForCommission: false };
    }
  }
}