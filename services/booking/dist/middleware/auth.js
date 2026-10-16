"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.requireAuth = exports.authenticateToken = void 0;
const auth_1 = require("firebase-admin/auth");
const firebase_1 = require("../config/firebase");
async function authenticateToken(token) {
    if (!token)
        throw new Error('Authentication required');
    const decoded = await (0, auth_1.getAuth)(firebase_1.app).verifyIdToken(token);
    return { uid: decoded.uid, admin: decoded.admin === true, email: decoded.email || '' };
}
exports.authenticateToken = authenticateToken;
async function requireAuth(req, res, next) {
    try {
        const match = /^Bearer (.+)$/.exec(req.header('Authorization') || '');
        req.authUser = await authenticateToken(match?.[1] || '');
        next();
    }
    catch {
        res.status(401).json({ error: 'Authentication required' });
    }
}
exports.requireAuth = requireAuth;
function requireAdmin(req, res, next) {
    if (!req.authUser?.admin) {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    next();
}
exports.requireAdmin = requireAdmin;
//# sourceMappingURL=auth.js.map