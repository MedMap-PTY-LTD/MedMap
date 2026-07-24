// src/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'booking-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ==================== SIMPLE TEST ROUTES ====================

// Test route - no auth
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Booking service is running',
    timestamp: new Date().toISOString()
  });
});

// ==================== SOCKET.IO SETUP ====================

const io = new Server(httpServer, {
  cors: corsOptions,
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  // Allow all connections - NO AUTH
  allowEIO3: true,
});

// Connection handler - NO AUTH CHECK
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Send a welcome message
  socket.emit('welcome', { 
    message: 'Connected to booking service',
    timestamp: new Date().toISOString()
  });

  // Ping test
  socket.on('ping', (callback) => {
    console.log('📡 Ping received');
    if (callback && typeof callback === 'function') {
      callback({ pong: true, timestamp: new Date().toISOString() });
    } else {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    }
  });

  // Initialize socket handlers - NO AUTH REQUIRED
  const { SocketHandlers } = require('./handlers/socketHandlers');
  new SocketHandlers({ io, socket });
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });

  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`📅 Booking Service running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/socket.io`);
  console.log(`🔓 AUTH IS DISABLED - All connections allowed`);
});

export { app, io, httpServer };