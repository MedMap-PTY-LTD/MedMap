// src/config/firebase.ts
import * as fs from 'fs';
import path from 'path';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountPath = path.resolve(__dirname, '../../service-account.json');
let serviceAccount: admin.ServiceAccount | null = null;

if (fs.existsSync(serviceAccountPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')) as admin.ServiceAccount;
} else {
  console.warn(`⚠️ Firebase service account file not found at ${serviceAccountPath}`);
}

const serviceAccountProjectId = serviceAccount
  ? ((serviceAccount as any).project_id ?? serviceAccount.projectId)
  : undefined;

// Initialize Firebase Admin
let app: admin.app.App;

if (admin.apps.length === 0) {
  if (serviceAccount) {
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccountProjectId,
    });
    console.log('✅ Firebase Admin initialized with Firestore service account credentials');
  } else {
    throw new Error('Firebase credentials are missing: service-account.json not found.');
  }
} else {
  const existingApp = admin.apps[0];
  if (!existingApp) {
    throw new Error('Unexpected missing Firebase app instance');
  }
  app = existingApp;
}

const db = getFirestore(app);

console.log('✅ Firestore initialized');

export { db, app };