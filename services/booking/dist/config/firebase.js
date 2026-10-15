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
exports.app = exports.db = void 0;
// src/config/firebase.ts
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
function loadServiceAccount() {
    // 1. Prefer environment variables (production / Render)
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (projectId && clientEmail && privateKey) {
        privateKey = privateKey
            .trim()
            // Strip surrounding double-quotes if the value was pasted with them.
            .replace(/^"(.*)"$/s, '$1')
            // Convert literal "\n" sequences into real newlines (safe no-op if
            // the key already uses real newlines).
            .replace(/\\n/g, '\n');
        return { projectId, clientEmail, privateKey };
    }
    // 2. Fall back to a local service-account.json file (local dev only)
    const serviceAccountPath = path_1.default.resolve(__dirname, '../../service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
        const json = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        return {
            projectId: json.project_id ?? json.projectId,
            clientEmail: json.client_email ?? json.clientEmail,
            privateKey: json.private_key ?? json.privateKey,
        };
    }
    throw new Error('Firebase credentials missing: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL ' +
        'and FIREBASE_PRIVATE_KEY, or provide service-account.json for local dev.');
}
// Initialize Firebase Admin (once)
const app = (0, app_1.getApps)().length === 0
    ? (0, app_1.initializeApp)({
        credential: (0, app_1.cert)(loadServiceAccount()),
        projectId: process.env.FIREBASE_PROJECT_ID,
    })
    : (0, app_1.getApp)();
exports.app = app;
const db = (0, firestore_1.getFirestore)(app);
exports.db = db;
console.log('✅ Firebase Admin initialized');
console.log('✅ Firestore initialized');
//# sourceMappingURL=firebase.js.map