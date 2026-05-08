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
  writeBatch
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

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
  
  // Approve doctor
  async approveDoctor(doctorId: string, notes?: string) {
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
      
      await batch.commit();
      
      // Log admin action
      await this.logAdminAction('approve_doctor', doctorId, { notes });
      
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },
  
  // Reject doctor
  async rejectDoctor(doctorId: string, reason: string) {
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
      
      await batch.commit();
      
      // Log admin action
      await this.logAdminAction('reject_doctor', doctorId, { reason });
      
      return { error: null };
    } catch (error: any) {
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
  
  // Approve ambassador
  async approveAmbassador(ambassadorId: string) {
    try {
      const batch = writeBatch(db);
      
      // Update ambassador status
      const ambassadorRef = doc(db, 'ambassadors', ambassadorId);
      batch.update(ambassadorRef, {
        applicationStatus: 'approved',
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Update user status
      const userRef = doc(db, 'users', ambassadorId);
      batch.update(userRef, {
        isActive: true,
        updatedAt: serverTimestamp(),
      });
      
      await batch.commit();
      
      // Log admin action
      await this.logAdminAction('approve_ambassador', ambassadorId, {});
      
      return { error: null };
    } catch (error: any) {
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
  async getAdminLogs(limit: number = 100) {
    try {
      const q = query(
        collection(db, 'admin_logs'),
        orderBy('timestamp', 'desc'),
        limit(limit)
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
};