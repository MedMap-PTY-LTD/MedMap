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
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const serviceAccountPath = path_1.default.resolve(__dirname, '../../service-account.json');
let serviceAccount = null;
if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
}
else {
    console.warn(`⚠️ Firebase service account file not found at ${serviceAccountPath}`);
}
const serviceAccountProjectId = serviceAccount
    ? (serviceAccount.project_id ?? serviceAccount.projectId)
    : undefined;
// Initialize Firebase Admin
let app;
exports.app = app;
if (admin.apps.length === 0) {
    if (serviceAccount) {
        exports.app = app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccountProjectId,
        });
        console.log('✅ Firebase Admin initialized with Firestore service account credentials');
    }
    else {
        throw new Error('Firebase credentials are missing: service-account.json not found.');
    }
}
else {
    const existingApp = admin.apps[0];
    if (!existingApp) {
        throw new Error('Unexpected missing Firebase app instance');
    }
    exports.app = app = existingApp;
}
const db = (0, firestore_1.getFirestore)(app);
exports.db = db;
console.log('✅ Firestore initialized');
//# sourceMappingURL=firebase.js.map