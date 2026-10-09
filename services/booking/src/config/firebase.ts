// src/config/firebase.ts
import * as fs from 'fs';
import path from 'path';
import { initializeApp, cert, getApps, getApp, App, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function loadServiceAccount(): ServiceAccount {
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
  const serviceAccountPath = path.resolve(__dirname, '../../service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    const json = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    return {
      projectId: json.project_id ?? json.projectId,
      clientEmail: json.client_email ?? json.clientEmail,
      privateKey: json.private_key ?? json.privateKey,
    };
  }

  throw new Error(
    'Firebase credentials missing: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL ' +
    'and FIREBASE_PRIVATE_KEY, or provide service-account.json for local dev.'
  );
}

// Initialize Firebase Admin (once)
const app: App =
  getApps().length === 0
    ? initializeApp({
        credential: cert(loadServiceAccount()),
        projectId: process.env.FIREBASE_PROJECT_ID,
      })
    : getApp();

const db = getFirestore(app);

console.log('✅ Firebase Admin initialized');
console.log('✅ Firestore initialized');

export { db, app };