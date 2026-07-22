// lib/admin-service.ts
import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
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
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

// Check if Firebase is properly initialized
const isFirebaseInitialized = () => {
  return !!(auth && db);
};

// Helper function to generate referral code
function generateReferralCode(firstName?: string, lastName?: string): string {
  if (firstName && firstName.length >= 2) {
    const prefix = firstName.substring(0, 2).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${random}`;
  }
  // Fallback: generate a random code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'AMB';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const adminService = {
  // Create initial admin account (run once during setup)
  async createInitialAdmin(email: string, password: string, adminData: any, secretKey: string) {
    // Verify secret key (store this in environment variables)
    const MASTER_SECRET = import.meta.env.VITE_ADMIN_MASTER_SECRET;
    if (secretKey !== MASTER_SECRET) {
      return { error: 'Invalid master secret key' };
    }
    
    try {
      // Check if any admin exists
      const adminsSnapshot = await getDocs(collection(db, 'admins'));
      if (!adminsSnapshot.empty) {
        return { error: 'Admin already exists. Use admin panel to create additional admins.' };
      }
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create admin profile
      const adminProfile = {
        uid: user.uid,
        email: user.email!,
        emailVerified: true,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        fullName: `${adminData.firstName} ${adminData.lastName}`.trim(),
        role: 'admin',
        adminLevel: 'super',
        permissions: ['all'],
        department: adminData.department || 'Management',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
      };
      
      // Save to users collection
      await setDoc(doc(db, 'users', user.uid), {
        ...adminProfile,
        emailVerified: true,
      });
      
      // Save to admins collection
      await setDoc(doc(db, 'admins', user.uid), {
        uid: user.uid,
        adminLevel: 'super',
        permissions: ['all'],
        department: adminData.department,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      return { success: true, adminId: user.uid };
    } catch (error: any) {
      return { error: error.message };
    }
  },
  
  // Get all users with filters
  async getAllUsers(filters?: {
    role?: string;
    isActive?: boolean;
    searchTerm?: string;
    limit?: number;
    startAfter?: any;
  }) {
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
        accountAgeDays: Math.floor((Date.now() - doc.data().createdAt?.toDate()) / (1000 * 60 * 60 * 24)),
      }));
      
      // Client-side search if needed
      let filteredUsers = users;
      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filteredUsers = users.filter(user => 
          user.fullName?.toLowerCase().includes(term) ||
          user.email?.toLowerCase().includes(term)
        );
      }
      
      return { users: filteredUsers, error: null };
    } catch (error: any) {
      return { users: [], error: error.message };
    }
  },
  
  // Get pending doctors
  async getPendingDoctors() {
    try {
      const q = query(
        collection(db, 'doctors'),
        where('verificationStatus', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const doctors = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const doctorData = doc.data();
          const userDoc = await getDoc(doc(db, 'users', doc.id));
          const userData = userDoc.data();
          
          return {
            id: doc.id,
            ...doctorData,
            user: userData,
            submittedAt: doctorData.createdAt?.toDate().toISOString(),
          };
        })
      );
      
      return { doctors, error: null };
    } catch (error: any) {
      return { doctors: [], error: error.message };
    }
  },
  
  // ✅ FIXED: Approve doctor with referral handling
  async approveDoctor(doctorId: string, notes?: string) {
    if (!isFirebaseInitialized()) {
      return { error: 'Firebase is not initialized.' };
    }
    
    try {
      const batch = writeBatch(db);
      
      // Update doctor status
      const doctorRef = doc(db, 'doctors', doctorId);
      batch.update(doctorRef, {
        verificationStatus: 'verified',
        verifiedAt: serverTimestamp(),
        verificationNotes: notes || null,
        updatedAt: serverTimestamp(),
      });
      
      // Update user status
      const userRef = doc(db, 'users', doctorId);
      batch.update(userRef, {
        isActive: true,
        updatedAt: serverTimestamp(),
      });
      
      // ✅ Check if this doctor was referred
      const referralRef = doc(db, 'referrals', `doctor_${doctorId}`);
      const referralDoc = await getDoc(referralRef);
      
      if (referralDoc.exists()) {
        const referralData = referralDoc.data();
        const commissionAmount = 500; // Fixed commission amount
        
        // ✅ UPDATE referral status to 'verified'
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
      
      // Log admin action
      await this.logAdminAction('approve_doctor', doctorId, { notes });
      
      return { error: null };
    } catch (error: any) {
      console.error('Error approving doctor:', error);
      return { error: error.message };
    }
  },
  
  // ✅ FIXED: Reject doctor with referral handling
  async rejectDoctor(doctorId: string, reason: string) {
    if (!isFirebaseInitialized()) {
      return { error: 'Firebase is not initialized.' };
    }
    
    try {
      const batch = writeBatch(db);
      
      // Update doctor status
      const doctorRef = doc(db, 'doctors', doctorId);
      batch.update(doctorRef, {
        verificationStatus: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectionReason: reason,
        updatedAt: serverTimestamp(),
      });
      
      // Deactivate user
      const userRef = doc(db, 'users', doctorId);
      batch.update(userRef, {
        isActive: false,
        updatedAt: serverTimestamp(),
      });
      
      // ✅ Check if this doctor was referred
      const referralRef = doc(db, 'referrals', `doctor_${doctorId}`);
      const referralDoc = await getDoc(referralRef);
      
      if (referralDoc.exists()) {
        // ✅ UPDATE referral status to 'rejected'
        batch.update(referralRef, {
          status: 'rejected',
          rejectionReason: reason,
          updatedAt: serverTimestamp(),
        });
      }
      
      await batch.commit();
      
      // Log admin action
      await this.logAdminAction('reject_doctor', doctorId, { reason });
      
      return { error: null };
    } catch (error: any) {
      console.error('Error rejecting doctor:', error);
      return { error: error.message };
    }
  },
  
  // Get pending ambassadors
  async getPendingAmbassadors() {
    try {
      const q = query(
        collection(db, 'ambassadors'),
        where('applicationStatus', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const ambassadors = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const ambassadorData = doc.data();
          const userDoc = await getDoc(doc(db, 'users', doc.id));
          const userData = userDoc.data();
          
          return {
            id: doc.id,
            ...ambassadorData,
            user: userData,
            submittedAt: ambassadorData.createdAt?.toDate().toISOString(),
          };
        })
      );
      
      return { ambassadors, error: null };
    } catch (error: any) {
      return { ambassadors: [], error: error.message };
    }
  },
  
  // Approve ambassador with referral code generation
  async approveAmbassador(ambassadorId: string) {
    if (!isFirebaseInitialized()) {
      return { error: 'Firebase is not initialized.', referralCode: null };
    }

    try {
      // Get ambassador data first
      const ambassadorRef = doc(db, 'ambassadors', ambassadorId);
      const ambassadorDoc = await getDoc(ambassadorRef);
      
      if (!ambassadorDoc.exists()) {
        return { error: 'Ambassador not found', referralCode: null };
      }
      
      // Get user data for generating personalized referral code
      const userRef = doc(db, 'users', ambassadorId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      const firstName = userData?.firstName || 'AMB';
      const lastName = userData?.lastName || '';
      
      // Generate unique referral code
      let referralCode = generateReferralCode(firstName, lastName);
      
      // Ensure uniqueness - check if code already exists
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        const existingQuery = query(
          collection(db, 'ambassadors'),
          where('referralCode', '==', referralCode)
        );
        const existingSnapshot = await getDocs(existingQuery);
        
        if (existingSnapshot.empty) {
          isUnique = true;
        } else {
          // Generate new code with random suffix
          const random = Math.random().toString(36).substring(2, 6).toUpperCase();
          referralCode = `${referralCode.substring(0, 4)}${random}`;
          attempts++;
        }
      }
      
      const batch = writeBatch(db);
      
      // Update ambassador with referral code
      batch.update(ambassadorRef, {
        applicationStatus: 'approved',
        referralCode: referralCode,
        approvedAt: serverTimestamp(),
        onboardingStep: 5,
        updatedAt: serverTimestamp(),
        isActive: true,
      });
      
      // Update user status
      batch.update(userRef, {
        isActive: true,
        updatedAt: serverTimestamp(),
      });
      
      await batch.commit();
      
      // Log admin action
      await this.logAdminAction('approve_ambassador', ambassadorId, { referralCode });
      
      console.log(`✅ Ambassador ${ambassadorId} approved with referral code: ${referralCode}`);
      
      return { error: null, referralCode };
    } catch (error: any) {
      console.error('Error approving ambassador:', error);
      return { error: error.message, referralCode: null };
    }
  },
  
  // Reject ambassador
  async rejectAmbassador(ambassadorId: string, reason: string) {
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
      
      // Log admin action
      await this.logAdminAction('reject_ambassador', ambassadorId, { reason });
      
      return { error: null };
    } catch (error: any) {
      console.error('Error rejecting ambassador:', error);
      return { error: error.message };
    }
  },
  
  // Get dashboard stats
  async getDashboardStats() {
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
      
      const ticketsSnapshot = await getDocs(query(
        collection(db, 'tickets'),
        where('status', 'in', ['open', 'in_progress'])
      ));
      
      const urgentTicketsSnapshot = await getDocs(query(
        collection(db, 'tickets'),
        where('priority', '==', 'urgent'),
        where('status', 'in', ['open', 'in_progress'])
      ));
      
      // Get referral stats
      const referralsSnapshot = await getDocs(collection(db, 'referrals'));
      const referrals = referralsSnapshot.docs.map(doc => doc.data());
      
      return {
        stats: {
          totalUsers: users.length,
          totalDoctors: doctorsSnapshot.size,
          totalPatients: users.filter(u => u.role === 'patient').length,
          totalAmbassadors: users.filter(u => u.role === 'ambassador').length,
          pendingDoctors: pendingDoctorsSnapshot.size,
          pendingAmbassadors: pendingAmbassadorsSnapshot.size,
          openTickets: ticketsSnapshot.size,
          urgentTickets: urgentTicketsSnapshot.size,
          totalReferrals: referrals.length,
          pendingReferrals: referrals.filter(r => r.status === 'pending').length,
          totalCommission: referrals
            .filter(r => r.status === 'verified')
            .reduce((sum, r) => sum + (r.commissionEarned || 0), 0),
        },
        error: null,
      };
    } catch (error: any) {
      return { stats: null, error: error.message };
    }
  },
  
  // Get all tickets
  async getTickets(filters?: { status?: string; priority?: string }) {
    try {
      let q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
      
      if (filters?.status) {
        q = query(q, where('status', '==', filters.status));
      }
      
      if (filters?.priority) {
        q = query(q, where('priority', '==', filters.priority));
      }
      
      const snapshot = await getDocs(q);
      const tickets = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const ticketData = doc.data();
          const userDoc = await getDoc(doc(db, 'users', ticketData.userId));
          const userData = userDoc.data();
          
          // Get messages
          const messagesSnapshot = await getDocs(
            query(
              collection(db, 'tickets', doc.id, 'messages'),
              orderBy('createdAt', 'asc')
            )
          );
          
          const messages = await Promise.all(
            messagesSnapshot.docs.map(async (msgDoc) => {
              const msgData = msgDoc.data();
              const senderDoc = await getDoc(doc(db, 'users', msgData.senderId));
              return {
                id: msgDoc.id,
                ...msgData,
                sender: senderDoc.data(),
              };
            })
          );
          
          return {
            id: doc.id,
            ...ticketData,
            user: userData,
            messages,
            createdAt: ticketData.createdAt?.toDate().toISOString(),
            updatedAt: ticketData.updatedAt?.toDate().toISOString(),
          };
        })
      );
      
      return { tickets, error: null };
    } catch (error: any) {
      return { tickets: [], error: error.message };
    }
  },
  
  // Update ticket
  async updateTicket(ticketId: string, update: { status?: string; reply?: string }, adminId: string) {
    try {
      const batch = writeBatch(db);
      
      // Update ticket status
      if (update.status) {
        const ticketRef = doc(db, 'tickets', ticketId);
        batch.update(ticketRef, {
          status: update.status,
          updatedAt: serverTimestamp(),
          ...(update.status === 'resolved' ? { resolvedAt: serverTimestamp() } : {}),
          ...(update.status === 'closed' ? { closedAt: serverTimestamp() } : {}),
        });
      }
      
      // Add reply message
      if (update.reply) {
        const messageRef = doc(collection(db, 'tickets', ticketId, 'messages'));
        batch.set(messageRef, {
          senderId: adminId,
          message: update.reply,
          isStaffReply: true,
          createdAt: serverTimestamp(),
        });
      }
      
      await batch.commit();
      
      // Log admin action
      await this.logAdminAction('update_ticket', ticketId, update);
      
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },
  
  // Log admin action for audit
  async logAdminAction(action: string, targetId: string, details: any) {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      await setDoc(doc(collection(db, 'admin_logs')), {
        adminId: user.uid,
        adminEmail: user.email,
        action,
        targetId,
        details,
        timestamp: serverTimestamp(),
        ipAddress: null, // Could be added with a service
      });
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }
  },
  
  // Get admin logs
  async getAdminLogs(limitCount: number = 100) {
    try {
      const q = query(
        collection(db, 'admin_logs'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate().toISOString(),
      }));
      
      return { logs, error: null };
    } catch (error: any) {
      return { logs: [], error: error.message };
    }
  },

  // ============== REFERRAL FUNCTIONS ==============
  
  // Get all referrals
  async getReferrals(filters?: { status?: string; ambassadorId?: string }) {
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
  async getAmbassadorReferrals(ambassadorId: string) {
    return this.getReferrals({ ambassadorId });
  },

  // Get pending referrals (doctors waiting for verification)
  async getPendingReferrals() {
    return this.getReferrals({ status: 'pending' });
  },

  // Update referral status when doctor is verified
  async updateReferralStatus(doctorId: string, status: 'verified' | 'rejected', rejectionReason?: string) {
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
  async getReferralStats() {
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

  // Get ambassador referrals with doctor details
  async getAmbassadorReferralsWithDoctors(ambassadorId: string) {
    if (!isFirebaseInitialized()) {
      return { referrals: [], error: 'Firebase is not initialized.' };
    }

    try {
      // Get all referrals for this ambassador
      const q = query(
        collection(db, 'referrals'),
        where('ambassadorId', '==', ambassadorId),
        orderBy('referredAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const referrals = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const referralData = docSnapshot.data();
          const doctorId = referralData.doctorId;
          
          // Get doctor profile
          let doctorProfile = null;
          let userProfile = null;
          
          if (doctorId) {
            try {
              const doctorDoc = await getDoc(doc(db, 'doctors', doctorId));
              if (doctorDoc.exists()) {
                doctorProfile = doctorDoc.data();
              }
              
              const userDoc = await getDoc(doc(db, 'users', doctorId));
              if (userDoc.exists()) {
                userProfile = userDoc.data();
              }
            } catch (err) {
              console.error('Error fetching doctor data:', err);
            }
          }
          
          return {
            id: docSnapshot.id,
            ...referralData,
            referredAt: referralData.referredAt?.toDate?.()?.toISOString() || null,
            verifiedAt: referralData.verifiedAt?.toDate?.()?.toISOString() || null,
            doctorProfile: doctorProfile || null,
            userProfile: userProfile || null,
            // Combine doctor and user data for easy access
            doctorFullName: userProfile?.fullName || referralData.doctorName || 'Unknown Doctor',
            doctorEmail: userProfile?.email || referralData.doctorEmail || '',
            doctorSpecialization: doctorProfile?.specialization || 'N/A',
            doctorVerificationStatus: doctorProfile?.verificationStatus || referralData.status || 'pending',
            doctorIsActive: userProfile?.isActive || false,
            doctorJoinedAt: userProfile?.createdAt?.toDate?.()?.toISOString() || null,
            doctorPracticeName: doctorProfile?.practiceName || '',
            doctorHpcsaNumber: doctorProfile?.hpcsaNumber || '',
            doctorEnrollmentCompleted: doctorProfile?.enrollmentCompleted || false,
          };
        })
      );
      
      return { referrals, error: null };
    } catch (error: any) {
      console.error('Error getting ambassador referrals with doctors:', error);
      return { referrals: [], error: error.message };
    }
  },

  // Get referral stats for ambassador
  async getAmbassadorReferralStats(ambassadorId: string) {
    if (!isFirebaseInitialized()) {
      return { stats: null, error: 'Firebase is not initialized.' };
    }

    try {
      const q = query(
        collection(db, 'referrals'),
        where('ambassadorId', '==', ambassadorId)
      );
      
      const snapshot = await getDocs(q);
      const referrals = snapshot.docs.map(doc => doc.data());
      
      const totalReferrals = referrals.length;
      const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
      const verifiedReferrals = referrals.filter(r => r.status === 'verified').length;
      const rejectedReferrals = referrals.filter(r => r.status === 'rejected').length;
      const totalCommission = referrals
        .filter(r => r.status === 'verified')
        .reduce((sum, r) => sum + (r.commissionEarned || 0), 0);
      
      // Count active doctors (verified and active)
      const activeDoctors = referrals.filter(r => r.status === 'verified').length;
      
      // Calculate pending commission (verified but not paid)
      const pendingCommission = referrals
        .filter(r => r.status === 'verified' && !r.commissionPaid)
        .reduce((sum, r) => sum + (r.commissionEarned || 0), 0);
      
      const paidCommission = referrals
        .filter(r => r.status === 'verified' && r.commissionPaid)
        .reduce((sum, r) => sum + (r.commissionEarned || 0), 0);
      
      return {
        stats: {
          totalReferrals,
          pendingReferrals,
          verifiedReferrals,
          rejectedReferrals,
          totalCommission,
          activeDoctors,
          pendingCommission,
          paidCommission,
        },
        error: null,
      };
    } catch (error: any) {
      console.error('Error getting ambassador referral stats:', error);
      return { stats: null, error: error.message };
    }
  },

  // Get all ambassadors
  async getAllAmbassadors() {
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
  async getAmbassadorById(ambassadorId: string) {
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
  async updateAmbassadorInterviewStatus(
    ambassadorId: string, 
    status: 'pending' | 'scheduled' | 'completed' | 'passed' | 'failed',
    notes?: string
  ) {
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
      
      // Log admin action
      await this.logAdminAction('update_interview_status', ambassadorId, { status, notes });
      
      return { error: null };
    } catch (error: any) {
      console.error('Error updating interview status:', error);
      return { error: error.message };
    }
  },

  // Update ambassador onboarding step
  async updateAmbassadorOnboardingStep(ambassadorId: string, step: number) {
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
  async getPsychometricTestStatus(ambassadorId: string) {
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

  // Get all doctors
  async getAllDoctors() {
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
  async getAllPatients() {
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
  async deactivateUser(userId: string) {
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
  async deleteInactivePatients(daysThreshold: number = 365) {
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
  async checkAdminExists() {
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
};