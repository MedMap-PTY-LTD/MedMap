// src/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { authenticateToken } from './middleware/auth';

dotenv.config();
import { PaymentService } from './services/PaymentService';
import { MembershipLifecycleService } from './services/MembershipLifecycleService';

const app = express();
app.set('trust proxy', 1); // Render's edge proxy forwards the original PayFast IP.
const httpServer = createServer(app);

// 🔥 Allow multiple origins (array is supported by the cors package)
const allowedOrigins = [
  'https://medmap.co.za',
  'https://www.medmap.co.za',
  'http://localhost:5173',
  'http://localhost:3000',
  // add your Render preview URLs if any, e.g.:
  // 'https://medmap-booking.onrender.com',
];

// Allow extra origins via env var (comma-separated)
if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL.split(',').forEach(url => {
    const trimmed = url.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`🚫 CORS blocked origin: ${origin}`);
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  // 🔥 Paystack sends these headers on webhook / API calls
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
};

// 🔥 CORS must be the FIRST middleware
app.use(cors(corsOptions));

// 🔥 Handle preflight for ALL routes (Express 4 needs this for nested routers)
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // PayFast/ITN webhooks need this

// ==================== HEALTH + TEST ====================

app.get('/health', (req, res) => {
  const payments = PaymentService.publicStatus();
  res.json({
    status: 'healthy',
    service: 'booking-service',
    paymentMode: payments.mode,
    paymentIntegration: payments.integration,
    paymentEndpoints: payments,
    payfastNotification: payfastNotificationHealth,
    revision: process.env.RENDER_GIT_COMMIT || 'local',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Booking service is running',
    timestamp: new Date().toISOString(),
  });
});

// ==================== ROUTES ====================
import bookingsRouter from './routes/bookings';
import payfastITNRouter, { payfastNotificationHealth } from './routes/payfastITN';
import refundsRouter from './routes/refunds';
import membershipsRouter from './routes/memberships';
import accountCreditsRouter from './routes/accountCredits';

app.use(bookingsRouter);
app.use(payfastITNRouter);
app.use(refundsRouter);
app.use(membershipsRouter);
app.use(accountCreditsRouter);

 //==================== SOCKET.IO SETUP ====================

const io = new Server(httpServer, {
  cors: corsOptions,
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  allowEIO3: true,
});

io.use(async (socket, next) => {
  try {
    socket.data.authUser = await authenticateToken(String(socket.handshake.auth?.token || ''));
    next();
  } catch {
    next(new Error('Authentication required'));
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.emit('welcome', {
    message: 'Connected to booking service',
    timestamp: new Date().toISOString(),
  });

  socket.on('ping', (callback) => {
    console.log('📡 Ping received');
    if (callback && typeof callback === 'function') {
      callback({ pong: true, timestamp: new Date().toISOString() });
    } else {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    }
  });

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
  MembershipLifecycleService.start();
  console.log(`📅 Booking Service running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/socket.io`);
  console.log(`✅ Allowed CORS origins:`, allowedOrigins);
});

export { app, io, httpServer };
