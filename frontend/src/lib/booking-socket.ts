// lib/booking-socket.ts
import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

export const getBookingSocket = (): Socket => {
  if (!socketInstance) {
    const url = import.meta.env.VITE_BOOKING_SERVICE_URL || 'http://localhost:3001';
    
    console.log(`🔌 Connecting to booking service at: ${url}`);
    
    socketInstance = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
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
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('❌ Max reconnection attempts reached');
      }
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
    socketInstance.disconnect();
    socketInstance = null;
    reconnectAttempts = 0;
    console.log('🔌 Booking socket disconnected');
  }
};

export const isBookingSocketConnected = (): boolean => {
  return socketInstance?.connected || false;
};