// hooks/useBookingSocket.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { getBookingSocket } from '../lib/booking-socket';
import { Booking, BookingSlot } from '../lib/firebase';

export interface BookingEvents {
  onBookingCreated?: (data: any) => void;
  onBookingRescheduled?: (data: any) => void;
  onBookingCancelled?: (data: any) => void;
  onBookingUpdated?: (data: any) => void;
  onAvailabilityUpdated?: (data: any) => void;
}

export function useBookingSocket(events?: BookingEvents) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const socket = useRef(getBookingSocket());
  const eventsRef = useRef(events);

  // Update events ref when events change
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Setup event listeners
  useEffect(() => {
    const currentSocket = socket.current;

    // Connection handlers
    const onConnect = () => {
      console.log('✅ Socket connected to booking service');
      setIsConnected(true);
      setIsConnecting(false);
    };

    const onDisconnect = (reason: string) => {
      console.log(`❌ Socket disconnected: ${reason}`);
      setIsConnected(false);
      setIsConnecting(false);
    };

    const onConnectError = (error: Error) => {
      console.error('❌ Socket connection error:', error);
      setIsConnected(false);
      setIsConnecting(false);
    };

    // Event handlers
    const onBookingCreated = (data: any) => {
      console.log('📅 Booking created event:', data);
      eventsRef.current?.onBookingCreated?.(data);
    };

    const onBookingRescheduled = (data: any) => {
      console.log('🔄 Booking rescheduled event:', data);
      eventsRef.current?.onBookingRescheduled?.(data);
    };

    const onBookingCancelled = (data: any) => {
      console.log('❌ Booking cancelled event:', data);
      eventsRef.current?.onBookingCancelled?.(data);
    };

    const onBookingUpdated = (data: any) => {
      console.log('📊 Booking updated event:', data);
      eventsRef.current?.onBookingUpdated?.(data);
    };

    const onAvailabilityUpdated = (data: any) => {
      console.log('📡 Availability updated event:', data);
      eventsRef.current?.onAvailabilityUpdated?.(data);
    };

    // Register event listeners
    currentSocket.on('connect', onConnect);
    currentSocket.on('disconnect', onDisconnect);
    currentSocket.on('connect_error', onConnectError);
    currentSocket.on('booking:created', onBookingCreated);
    currentSocket.on('booking:rescheduled', onBookingRescheduled);
    currentSocket.on('booking:cancelled', onBookingCancelled);
    currentSocket.on('booking:updated', onBookingUpdated);
    currentSocket.on('availability:updated', onAvailabilityUpdated);

    // Cleanup
    return () => {
      currentSocket.off('connect', onConnect);
      currentSocket.off('disconnect', onDisconnect);
      currentSocket.off('connect_error', onConnectError);
      currentSocket.off('booking:created', onBookingCreated);
      currentSocket.off('booking:rescheduled', onBookingRescheduled);
      currentSocket.off('booking:cancelled', onBookingCancelled);
      currentSocket.off('booking:updated', onBookingUpdated);
      currentSocket.off('availability:updated', onAvailabilityUpdated);
    };
  }, []);

  // ==================== ROOM MANAGEMENT ====================

  // Join a doctor's room to receive updates
  const joinDoctorRoom = useCallback((doctorId: string) => {
    if (!socket.current || !isConnected) {
      console.warn('⚠️ Cannot join doctor room: socket not connected');
      return;
    }
    socket.current.emit('join:doctor', doctorId);
    console.log(`👨‍⚕️ Joined doctor room: ${doctorId}`);
  }, [isConnected]);

  // Join a patient's room to receive updates
  const joinPatientRoom = useCallback((patientId: string) => {
    if (!socket.current || !isConnected) {
      console.warn('⚠️ Cannot join patient room: socket not connected');
      return;
    }
    socket.current.emit('join:patient', patientId);
    console.log(`👤 Joined patient room: ${patientId}`);
  }, [isConnected]);

  // Leave a doctor's room
  const leaveDoctorRoom = useCallback((doctorId: string) => {
    if (!socket.current || !isConnected) return;
    socket.current.emit('leave:doctor', doctorId);
    console.log(`👨‍⚕️ Left doctor room: ${doctorId}`);
  }, [isConnected]);

  // Leave a patient's room
  const leavePatientRoom = useCallback((patientId: string) => {
    if (!socket.current || !isConnected) return;
    socket.current.emit('leave:patient', patientId);
    console.log(`👤 Left patient room: ${patientId}`);
  }, [isConnected]);

  // ==================== BOOKING OPERATIONS ====================

  // Create a new booking
  const createBooking = useCallback((data: any): Promise<{ bookingId: string; error: string | null }> => {
    return new Promise((resolve) => {
      if (!socket.current || !isConnected) {
        resolve({ bookingId: '', error: 'Not connected to booking service' });
        return;
      }
      
      console.log('📝 Creating booking:', data);
      socket.current.emit('create:booking', data, (response: any) => {
        console.log('📝 Booking response:', response);
        resolve(response);
      });
    });
  }, [isConnected]);

  // Reschedule a booking
  const rescheduleBooking = useCallback((data: { 
    bookingId: string; 
    newDate: string; 
    newTime: string; 
    reason?: string 
  }): Promise<{ success: boolean; error: string | null }> => {
    return new Promise((resolve) => {
      if (!socket.current || !isConnected) {
        resolve({ success: false, error: 'Not connected to booking service' });
        return;
      }
      
      console.log('🔄 Rescheduling booking:', data);
      socket.current.emit('reschedule:booking', data, (response: any) => {
        console.log('🔄 Reschedule response:', response);
        resolve(response);
      });
    });
  }, [isConnected]);

  // Cancel a booking
  const cancelBooking = useCallback((data: { 
    bookingId: string; 
    reason?: string 
  }): Promise<{ success: boolean; error: string | null }> => {
    return new Promise((resolve) => {
      if (!socket.current || !isConnected) {
        resolve({ success: false, error: 'Not connected to booking service' });
        return;
      }
      
      console.log('❌ Cancelling booking:', data);
      socket.current.emit('cancel:booking', data, (response: any) => {
        console.log('❌ Cancel response:', response);
        resolve(response);
      });
    });
  }, [isConnected]);

  // Update booking status
  const updateBookingStatus = useCallback((data: { 
    bookingId: string; 
    status: 'pending' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled' | 'no-show'; 
    reason?: string 
  }): Promise<{ success: boolean; error: string | null }> => {
    return new Promise((resolve) => {
      if (!socket.current || !isConnected) {
        resolve({ success: false, error: 'Not connected to booking service' });
        return;
      }
      
      console.log('📊 Updating booking status:', data);
      socket.current.emit('update:booking-status', data, (response: any) => {
        console.log('📊 Update status response:', response);
        resolve(response);
      });
    });
  }, [isConnected]);

  // ==================== QUERY OPERATIONS ====================

  // Get available slots for a doctor on a specific date
  const getSlots = useCallback((data: { 
    doctorId: string; 
    date: string 
  }): Promise<{ success: boolean; slots?: BookingSlot[]; error?: string; count?: number }> => {
    return new Promise((resolve) => {
      if (!socket.current || !isConnected) {
        resolve({ success: false, error: 'Not connected to booking service', slots: [] });
        return;
      }
      
      console.log('📡 Getting slots:', data);
      socket.current.emit('get:slots', data, (response: any) => {
        console.log('📡 Slots response:', response);
        resolve(response);
      });
    });
  }, [isConnected]);

  // Get bookings for a user (patient or doctor)
  const getBookings = useCallback((data: { 
    userId: string; 
    role: 'doctor' | 'patient'; 
    status?: string 
  }): Promise<{ success: boolean; bookings?: Booking[]; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket.current || !isConnected) {
        resolve({ success: false, error: 'Not connected to booking service', bookings: [] });
        return;
      }
      
      console.log('📋 Getting bookings:', data);
      socket.current.emit('get:bookings', data, (response: any) => {
        console.log('📋 Bookings response:', response);
        resolve(response);
      });
    });
  }, [isConnected]);

  // Get upcoming bookings for a doctor
  const getUpcomingBookings = useCallback((data: { 
    doctorId: string 
  }): Promise<{ success: boolean; bookings?: Booking[]; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket.current || !isConnected) {
        resolve({ success: false, error: 'Not connected to booking service', bookings: [] });
        return;
      }
      
      console.log('📅 Getting upcoming bookings:', data);
      socket.current.emit('get:upcoming', data, (response: any) => {
        console.log('📅 Upcoming bookings response:', response);
        resolve(response);
      });
    });
  }, [isConnected]);

  // Get booking statistics for a doctor
  const getStats = useCallback((data: { 
    doctorId: string 
  }): Promise<{ success: boolean; stats?: any; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket.current || !isConnected) {
        resolve({ success: false, error: 'Not connected to booking service', stats: null });
        return;
      }
      
      console.log('📊 Getting stats:', data);
      socket.current.emit('get:stats', data, (response: any) => {
        console.log('📊 Stats response:', response);
        resolve(response);
      });
    });
  }, [isConnected]);

  // Set availability for a doctor on a specific date
  const setAvailability = useCallback((data: { 
    doctorId: string; 
    date: string; 
    slots: BookingSlot[] 
  }): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket.current || !isConnected) {
        resolve({ success: false, error: 'Not connected to booking service' });
        return;
      }
      
      console.log('📝 Setting availability:', { doctorId: data.doctorId, date: data.date, slots: data.slots.length });
      socket.current.emit('set:availability', data, (response: any) => {
        console.log('📝 Set availability response:', response);
        resolve(response);
      });
    });
  }, [isConnected]);

  // ==================== PING / HEALTH CHECK ====================

  const ping = useCallback((): Promise<{ pong: boolean; timestamp?: string }> => {
    return new Promise((resolve) => {
      if (!socket.current || !isConnected) {
        resolve({ pong: false });
        return;
      }
      
      socket.current.emit('ping', (response: any) => {
        resolve(response);
      });
    });
  }, [isConnected]);

  // ==================== RETURN VALUE ====================

  return {
    // Connection status
    isConnected,
    isConnecting,
    socket: socket.current,
    
    // Room management
    joinDoctorRoom,
    joinPatientRoom,
    leaveDoctorRoom,
    leavePatientRoom,
    
    // Booking operations
    createBooking,
    rescheduleBooking,
    cancelBooking,
    updateBookingStatus,
    
    // Query operations
    getSlots,
    getBookings,
    getUpcomingBookings,
    getStats,
    setAvailability,
    
    // Utility
    ping,
  };
}

export default useBookingSocket;