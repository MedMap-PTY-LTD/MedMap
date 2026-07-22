// src/config/firebase.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as serviceAccount from '../../service-account.json';

const app = initializeApp({
  credential: cert(serviceAccount as any)
});

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, app };