// lib/booking-socket.ts
import { io, Socket } from 'socket.io-client';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

let socketInstance: Socket | null = null;
let authUnsubscribe: (() => void) | null = null;
let reconnectAttempts = 0;

export const getBookingSocket = (): Socket => {
  if (!socketInstance) {
    const url = import.meta.env.VITE_BOOKING_SERVICE_URL || 'https://medmap-f4ob.onrender.com';
    
    console.log(`🔌 Connecting to booking service at: ${url}`);
    
    socketInstance = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      auth: async (callback) => {
        try {
          callback({ token: await auth.currentUser?.getIdToken() || '' });
        } catch {
          callback({ token: '' });
        }
      },
      reconnection: true,
      // The booking service can be temporarily unavailable while it starts or
      // recovers. Keep retrying so a signed-in user does not need to reload.
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    const current = socketInstance;
    authUnsubscribe = onAuthStateChanged(auth, user => {
      if (user) current.connect();
      else current.disconnect();
    });

    socketInstance.on('connect', () => {
      console.log('✅ Connected to booking service');
      reconnectAttempts = 0;
    });

    socketInstance.on('disconnect', (reason) => {
      console.log(`❌ Disconnected from booking service: ${reason}`);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      reconnectAttempts++;
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error(`❌ Reconnect error:`, error);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('❌ Reconnect failed');
    });
  }

  return socketInstance;
};

export const disconnectBookingSocket = (): void => {
  if (socketInstance) {
    authUnsubscribe?.();
    authUnsubscribe = null;
    socketInstance.disconnect();
    socketInstance = null;
    reconnectAttempts = 0;
    console.log('🔌 Booking socket disconnected');
  }
};

export const isBookingSocketConnected = (): boolean => {
  return socketInstance?.connected || false;
};
