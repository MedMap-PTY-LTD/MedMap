"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpServer = exports.io = exports.app = void 0;
// src/index.ts
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = require("./middleware/auth");
dotenv_1.default.config();
const PaymentService_1 = require("./services/PaymentService");
const MembershipLifecycleService_1 = require("./services/MembershipLifecycleService");
const app = (0, express_1.default)();
exports.app = app;
app.set('trust proxy', 1); // Render's edge proxy forwards the original PayFast IP.
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
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
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
        if (!origin)
            return callback(null, true);
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
app.use((0, cors_1.default)(corsOptions));
// 🔥 Handle preflight for ALL routes (Express 4 needs this for nested routers)
app.options('*', (0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true })); // PayFast/ITN webhooks need this
// ==================== HEALTH + TEST ====================
app.get('/health', (req, res) => {
    const payments = PaymentService_1.PaymentService.publicStatus();
    res.json({
        status: 'healthy',
        service: 'booking-service',
        paymentMode: payments.mode,
        paymentIntegration: payments.integration,
        paymentEndpoints: payments,
        payfastNotification: payfastITN_1.payfastNotificationHealth,
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
const bookings_1 = __importDefault(require("./routes/bookings"));
const payfastITN_1 = __importStar(require("./routes/payfastITN"));
const refunds_1 = __importDefault(require("./routes/refunds"));
const memberships_1 = __importDefault(require("./routes/memberships"));
const accountCredits_1 = __importDefault(require("./routes/accountCredits"));
app.use(bookings_1.default);
app.use(payfastITN_1.default);
app.use(refunds_1.default);
app.use(memberships_1.default);
app.use(accountCredits_1.default);
//==================== SOCKET.IO SETUP ====================
const io = new socket_io_1.Server(httpServer, {
    cors: corsOptions,
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    allowEIO3: true,
});
exports.io = io;
io.use(async (socket, next) => {
    try {
        socket.data.authUser = await (0, auth_1.authenticateToken)(String(socket.handshake.auth?.token || ''));
        next();
    }
    catch {
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
        }
        else {
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
    MembershipLifecycleService_1.MembershipLifecycleService.start();
    console.log(`📅 Booking Service running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}/socket.io`);
    console.log(`✅ Allowed CORS origins:`, allowedOrigins);
});
//# sourceMappingURL=index.js.map