/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Paystack from 'paystack';
import * as crypto from 'crypto';

admin.initializeApp();
const db = admin.firestore();

const paystackSecretKey = functions.config().paystack.secret_key;
const paystack = Paystack(paystackSecretKey);

// 🔐 SECURE endpoint - Only backend has the secret key
export const initializeSubscription = functions.https.onCall(async (data, context) => {
  const { uid, email, name } = data;
  
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }
  
  try {
    // 1. Create or get Paystack customer
    let customerCode = '';
    const customers = await paystack.customer.list({ email });
    if (customers.data && customers.data.length > 0) {
      customerCode = customers.data[0].customer_code;
    } else {
      const newCustomer = await paystack.customer.create({
        email,
        first_name: name.split(' ')[0] || 'Patient',
        last_name: name.split(' ').slice(1).join(' ') || '',
        metadata: { uid },
      });
      customerCode = newCustomer.data.customer_code;
    }
    
    // 2. Create subscription
    const subscription = await paystack.subscription.create({
      customer: customerCode,
      plan: 'PLAN_007_1234567890', // Your plan code
    });
    
    // 3. Return authorization URL
    return {
      authorizationUrl: subscription.data.authorization_url,
      subscriptionCode: subscription.data.subscription_code,
      customerCode: subscription.data.customer.customer_code,
    };
    
  } catch (error: any) {
    console.error('Error initializing subscription:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// 🔐 SECURE endpoint for verification
export const verifySubscription = functions.https.onCall(async (data, context) => {
  const { uid, reference } = data;
  
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }
  
  try {
    // Verify with Paystack using secret key
    const transaction = await paystack.transaction.verify(reference);
    
    if (transaction.data.status !== 'success') {
      throw new Error('Transaction not successful');
    }
    
    // Update subscription in Firestore
    const subRef = db.collection('subscriptions').doc(uid);
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(now.getMonth() + 1);
    
    await subRef.update({
      status: 'active',
      startDate: admin.firestore.Timestamp.fromDate(now),
      endDate: admin.firestore.Timestamp.fromDate(endDate),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    
    // Log transaction
    await db.collection('transactions').add({
      uid,
      type: 'subscription',
      reference,
      amount: transaction.data.amount / 100,
      status: 'success',
      paystackResponse: transaction.data,
      createdAt: admin.firestore.Timestamp.now(),
    });
    
    return { success: true };
    
  } catch (error: any) {
    console.error('Error verifying subscription:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Webhook endpoint (still needed for automated renewals)
export const paystackWebhook = functions.https.onRequest(async (req, res) => {
  // ... webhook code from previous example
});