import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';
import { api } from '@/lib/django-api';
import { db } from '@/lib/firebase';
import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';

export interface Notification {
  id: string;
  type: 'booking_created' | 'booking_approved' | 'booking_cancelled' | 'booking_payment_expired' | 'user_registered' | 'doctor_approved' | 'system' | 'warning' | 'info';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'system' | 'booking' | 'user' | 'doctor' | 'general';
  read: boolean;
  archived: boolean;
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, any>;
  created_at: string;
  expires_at?: string;
  sound?: boolean;
  desktop?: boolean;
}

interface NotificationFilters {
  category?: string;
  priority?: string;
  read?: boolean;
  archived?: boolean;
}

interface NotificationSystemState {
  notifications: Notification[];
  unreadCount: number;
  filters: NotificationFilters;
  isLoading: boolean;
  error: string | null;
}

const POLL_INTERVAL = 30000; // 30 seconds
const hasFirestore = () => Boolean(db && typeof db === 'object' && (db as any).type === 'firestore');
const announcedBookingNotifications = new Set<string>();

export const useNotificationSystem = () => {
  const { user } = useAuth();
  const [bookingNotifications, setBookingNotifications] = useState<Notification[]>([]);
  const bookingSnapshotInitialized = useRef(false);
  const [state, setState] = useState<NotificationSystemState>({
    notifications: [],
    unreadCount: 0,
    filters: {},
    isLoading: false,
    error: null,
  });

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const response = await api.request('/notifications/notifications/');
      if (response.ok) {
        const data = await response.json();
        const results = Array.isArray(data) ? data : data.results || [];
        
        const mapped: Notification[] = results.map((n: any) => ({
            id: String(n.id),
            type: n.type || 'system',
            title: n.title,
            message: n.message,
            priority: inferPriority(n.type),
            category: inferCategory(n.type),
            read: n.read,
            archived: false, 
            metadata: n.data,
            created_at: n.created_at,
            actionUrl: n.data?.actionUrl,
        }));

        setState(prev => ({
            ...prev,
            notifications: mapped,
            unreadCount: mapped.filter(n => !n.read).length,
            error: null
        }));
      }
    } catch (err) {
        console.error('Failed to fetch notifications', err);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user?.uid || !hasFirestore()) {
      setBookingNotifications([]);
      bookingSnapshotInitialized.current = false;
      return;
    }
    bookingSnapshotInitialized.current = false;

    const notificationsQuery = query(
      collection(db, 'users', user.uid, 'bookingNotifications'),
      orderBy('createdAt', 'desc'),
      limit(50),
    );
    return onSnapshot(notificationsQuery, snapshot => {
      if (bookingSnapshotInitialized.current) {
        snapshot.docChanges().forEach(change => {
          if (change.type !== 'added') return;
          const value = change.doc.data();
          if (value.read === true || announcedBookingNotifications.has(change.doc.id)) return;
          announcedBookingNotifications.add(change.doc.id);
          toast({
            title: String(value.title || 'Booking update'),
            description: String(value.message || ''),
          });
        });
      }
      bookingSnapshotInitialized.current = true;
      setBookingNotifications(snapshot.docs.map(notificationDoc => {
        const value = notificationDoc.data();
        const type = (value.type || 'system') as Notification['type'];
        return {
          id: `booking__${notificationDoc.id}`,
          type,
          title: String(value.title || 'Booking update'),
          message: String(value.message || ''),
          priority: type === 'booking_cancelled' || type === 'booking_payment_expired' ? 'high' : 'medium',
          category: 'booking',
          read: value.read === true,
          archived: false,
          metadata: { bookingId: value.bookingId },
          created_at: String(value.createdAt || new Date().toISOString()),
          actionUrl: String(value.actionUrl || '/bookings'),
        };
      }));
    }, error => {
      console.error('Failed to listen for booking notifications', error);
    });
  }, [user?.uid]);

  // Mark as read
  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: prev.notifications.filter(n => !n.read && n.id !== id).length
    }));

    setBookingNotifications(current => current.map(notification =>
      notification.id === id ? { ...notification, read: true } : notification
    ));

    if (id.startsWith('booking__')) {
      if (!user?.uid || !hasFirestore()) return;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'bookingNotifications', id.slice('booking__'.length)), { read: true });
      } catch (error) {
        console.error('Failed to mark booking notification as read', error);
      }
      return;
    }

    try {
        await api.request(`/notifications/notifications/${id}/mark_read/`, { method: 'POST' });
    } catch (e) {
        console.error('Failed to mark as read', e);
    }
  }, [user?.uid]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }));
    setBookingNotifications(current => current.map(notification => ({ ...notification, read: true })));

    if (user?.uid && hasFirestore()) {
      await Promise.all(bookingNotifications.map(notification =>
        updateDoc(doc(db, 'users', user.uid, 'bookingNotifications', notification.id.slice('booking__'.length)), { read: true })
          .catch(error => console.error('Failed to mark booking notification as read', error))
      ));
    }

    try {
        await api.request(`/notifications/notifications/mark_all_read/`, { method: 'POST' });
    } catch (e) {
        console.error('Failed to mark all as read', e);
    }
  }, [bookingNotifications, user?.uid]);

  // Archive notification 
  const archiveNotification = useCallback(async (id: string) => {
      // Treat as delete for now to clean up
      await deleteNotification(id);
  }, [deleteNotification]);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    setState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== id),
        unreadCount: prev.notifications.filter(n => !n.read && n.id !== id).length
    }));
    setBookingNotifications(current => current.filter(notification => notification.id !== id));

    if (id.startsWith('booking__')) {
      if (!user?.uid || !hasFirestore()) return;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'bookingNotifications', id.slice('booking__'.length)));
      } catch (error) {
        console.error('Failed to delete booking notification', error);
      }
      return;
    }
    
    try {
        await api.request(`/notifications/notifications/${id}/`, { method: 'DELETE' });
    } catch (e) {
        console.error('Failed to delete notification', e);
    }
  }, [user?.uid]);
  
  // Clear all
  const clearAllNotifications = useCallback(async () => {
    setState(prev => ({ ...prev, notifications: [], unreadCount: 0 }));
    const currentBookingNotifications = bookingNotifications;
    setBookingNotifications([]);
    if (user?.uid && hasFirestore()) {
      await Promise.all(currentBookingNotifications.map(notification =>
        deleteDoc(doc(db, 'users', user.uid, 'bookingNotifications', notification.id.slice('booking__'.length)))
          .catch(error => console.error('Failed to clear booking notification', error))
      ));
    }
  }, [bookingNotifications, user?.uid]);

  // Set filters
  const setFilters = useCallback((filters: NotificationFilters) => {
    setState(prev => ({
      ...prev,
      filters,
    }));
  }, []);

  // Get filtered notifications
  const allNotifications = useMemo(() => [...bookingNotifications, ...state.notifications], [bookingNotifications, state.notifications]);

  const filteredNotifications = useMemo(() => {
    let filtered = allNotifications;

    if (state.filters.category) {
      filtered = filtered.filter(n => n.category === state.filters.category);
    }
    if (state.filters.priority) {
      filtered = filtered.filter(n => n.priority === state.filters.priority);
    }
    if (typeof state.filters.read === 'boolean') {
      filtered = filtered.filter(n => n.read === state.filters.read);
    }

    return filtered;
  }, [allNotifications, state.filters]);

  // Add notification (Client-side only for temporary alerts)
  const addNotification = useCallback((notificationData: Omit<Notification, 'id' | 'created_at' | 'read' | 'archived'>) => {
     toast({
         title: notificationData.title,
         description: notificationData.message,
         variant: notificationData.priority === 'urgent' ? 'destructive' : 'default'
     });
  }, []);
  
  const requestDesktopPermission = useCallback(async () => {
      if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission();
      }
  }, []);

  return {
    notifications: filteredNotifications,
    unreadCount: allNotifications.filter(notification => !notification.read).length,
    isLoading: state.isLoading,
    error: state.error,
    addNotification,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    clearAllNotifications,
    filters: state.filters,
    setFilters,
    requestDesktopPermission
  };
};

function inferPriority(type: string): 'low' | 'medium' | 'high' | 'urgent' {
    if (type.includes('cancelled') || type === 'urgent') return 'high';
    if (type.includes('approved') || type === 'booking_created') return 'medium';
    return 'low';
}

function inferCategory(type: string): 'system' | 'booking' | 'user' | 'doctor' | 'general' {
    if (type.includes('booking')) return 'booking';
    if (type.includes('doctor')) return 'doctor';
    if (type.includes('user')) return 'user';
    return 'system';
}
