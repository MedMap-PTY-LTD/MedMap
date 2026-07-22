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

  // Connection status
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setIsConnecting(false);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setIsConnecting(false);
    };

    const onError = () => {
      setIsConnected(false);
      setIsConnecting(false);
    };

    socket.current.on('connect', onConnect);
    socket.current.on('disconnect', onDisconnect);
    socket.current.on('connect_error', onError);

    // Event listeners
    if (events?.onBookingCreated) {
      socket.current.on('booking:created', events.onBookingCreated);
    }
    if (events?.onBookingRescheduled) {
      socket.current.on('booking:rescheduled', events.onBookingRescheduled);
    }
    if (events?.onBookingCancelled) {
      socket.current.on('booking:cancelled', events.onBookingCancelled);
    }
    if (events?.onBookingUpdated) {
      socket.current.on('booking:updated', events.onBookingUpdated);
    }
    if (events?.onAvailabilityUpdated) {
      socket.current.on('availability:updated', events.onAvailabilityUpdated);
    }

    return () => {
      socket.current.off('connect', onConnect);
      socket.current.off('disconnect', onDisconnect);
      socket.current.off('connect_error', onError);
      
      if (events?.onBookingCreated) {
        socket.current.off('booking:created', events.onBookingCreated);
      }
      if (events?.onBookingRescheduled) {
        socket.current.off('booking:rescheduled', events.onBookingRescheduled);
      }
      if (events?.onBookingCancelled) {
        socket.current.off('booking:cancelled', events.onBookingCancelled);
      }
      if (events?.onBookingUpdated) {
        socket.current.off('booking:updated', events.onBookingUpdated);
      }
      if (events?.onAvailabilityUpdated) {
        socket.current.off('availability:updated', events.onAvailabilityUpdated);
      }
    };
  }, [events]);

  // Join rooms
  const joinDoctorRoom = useCallback((doctorId: string) => {
    if (isConnected && doctorId) {
      socket.current.emit('join:doctor', doctorId);
    }
  }, [isConnected]);

  const joinPatientRoom = useCallback((patientId: string) => {
    if (isConnected && patientId) {
      socket.current.emit('join:patient', patientId);
    }
  }, [isConnected]);

  // Leave rooms
  const leaveDoctorRoom = useCallback((doctorId: string) => {
    if (isConnected && doctorId) {
      socket.current.emit('leave:doctor', doctorId);
    }
  }, [isConnected]);

  const leavePatientRoom = useCallback((patientId: string) => {
    if (isConnected && patientId) {
      socket.current.emit('leave:patient', patientId);
    }
  }, [isConnected]);

  // Booking operations
  const createBooking = useCallback((data: any): Promise<{ bookingId: string; error: string | null }> => {
    return new Promise((resolve) => {
      if (!isConnected) {
        resolve({ bookingId: '', error: 'Not connected to booking service' });
        return;
      }
      socket.current.emit('create:booking', data, (response: any) => {
        resolve(response);
      });
    });
  }, [isConnected]);

  const rescheduleBooking = useCallback((data: { 
    bookingId: string; 
    newDate: string; 
    newTime: string; 
    reason?: string 
  }): Promise<{ success: boolean; error: string | null }> => {
    return new Promise((resolve) => {
      if (!isConnected) {
        resolve({ success: false, error: 'Not connected to booking service' });
        return;
      }
      socket.current.emit('reschedule:booking', data, (response: any) => {
        resolve(response);
      });
    });
  }, [isConnected]);

  const cancelBooking = useCallback((data: { 
    bookingId: string; 
    reason?: string 
  }): Promise<{ success: boolean; error: string | null }> => {
    return new Promise((resolve) => {
      if (!isConnected) {
        resolve({ success: false, error: 'Not connected to booking service' });
        return;
      }
      socket.current.emit('cancel:booking', data, (response: any) => {
        resolve(response);
      });
    });
  }, [isConnected]);

  const updateBookingStatus = useCallback((data: { 
    bookingId: string; 
    status: 'pending' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled' | 'no-show'; 
    reason?: string 
  }): Promise<{ success: boolean; error: string | null }> => {
    return new Promise((resolve) => {
      if (!isConnected) {
        resolve({ success: false, error: 'Not connected to booking service' });
        return;
      }
      socket.current.emit('update:booking-status', data, (response: any) => {
        resolve(response);
      });
    });
  }, [isConnected]);

  // Query operations
  const getSlots = useCallback((data: { 
    doctorId: string; 
    date: string 
  }): Promise<{ success: boolean; slots?: BookingSlot[]; error?: string }> => {
    return new Promise((resolve) => {
      if (!isConnected) {
        resolve({ success: false, error: 'Not connected to booking service' });
        return;
      }
      socket.current.emit('get:slots', data, (response: any) => {
        resolve(response);
      });
    });
  }, [isConnected]);

  const getBookings = useCallback((data: { 
    userId: string; 
    role: 'doctor' | 'patient'; 
    status?: string 
  }): Promise<{ success: boolean; bookings?: Booking[]; error?: string }> => {
    return new Promise((resolve) => {
      if (!isConnected) {
        resolve({ success: false, error: 'Not connected to booking service' });
        return;
      }
      socket.current.emit('get:bookings', data, (response: any) => {
        resolve(response);
      });
    });
  }, [isConnected]);

  const getUpcomingBookings = useCallback((data: { 
    doctorId: string 
  }): Promise<{ success: boolean; bookings?: Booking[]; error?: string }> => {
    return new Promise((resolve) => {
      if (!isConnected) {
        resolve({ success: false, error: 'Not connected to booking service' });
        return;
      }
      socket.current.emit('get:upcoming', data, (response: any) => {
        resolve(response);
      });
    });
  }, [isConnected]);

  const getStats = useCallback((data: { 
    doctorId: string 
  }): Promise<{ success: boolean; stats?: any; error?: string }> => {
    return new Promise((resolve) => {
      if (!isConnected) {
        resolve({ success: false, error: 'Not connected to booking service' });
        return;
      }
      socket.current.emit('get:stats', data, (response: any) => {
        resolve(response);
      });
    });
  }, [isConnected]);

  const setAvailability = useCallback((data: { 
    doctorId: string; 
    date: string; 
    slots: BookingSlot[] 
  }): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!isConnected) {
        resolve({ success: false, error: 'Not connected to booking service' });
        return;
      }
      socket.current.emit('set:availability', data, (response: any) => {
        resolve(response);
      });
    });
  }, [isConnected]);

  return {
    isConnected,
    isConnecting,
    socket: socket.current,
    joinDoctorRoom,
    joinPatientRoom,
    leaveDoctorRoom,
    leavePatientRoom,
    createBooking,
    rescheduleBooking,
    cancelBooking,
    updateBookingStatus,
    getSlots,
    getBookings,
    getUpcomingBookings,
    getStats,
    setAvailability,
  };
}