"use strict";
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
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
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
const io = new socket_io_1.Server(httpServer, {
    cors: corsOptions,
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    // Allow all connections - NO AUTH
    allowEIO3: true,
});
exports.io = io;
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
        }
        else {
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
//# sourceMappingURL=index.js.map