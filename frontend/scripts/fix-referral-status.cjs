// scripts/fix-referral-status.cjs
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../serviceAccountKey.json'), 'utf8')
);

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

async function fixReferralStatuses() {
  console.log('🚀 Fixing referral statuses...\n');
  
  // Get all referrals with status 'pending'
  const referralsSnapshot = await db.collection('referrals')
    .where('status', '==', 'pending')
    .get();
  
  console.log(`📊 Found ${referralsSnapshot.size} pending referrals\n`);
  
  let fixed = 0;
  
  for (const doc of referralsSnapshot.docs) {
    const data = doc.data();
    const doctorId = data.doctorId;
    
    if (!doctorId) {
      console.log(`⚠️ No doctorId for referral ${doc.id}, skipping`);
      continue;
    }
    
    // Check if doctor is verified
    const doctorDoc = await db.collection('doctors').doc(doctorId).get();
    const userDoc = await db.collection('users').doc(doctorId).get();
    
    const isVerified = doctorDoc.exists && doctorDoc.data()?.verificationStatus === 'verified';
    const isActive = userDoc.exists && userDoc.data()?.isActive === true;
    
    if (isVerified && isActive) {
      // Update referral to verified
      await doc.ref.update({
        status: 'verified',
        verifiedAt: FieldValue.serverTimestamp(),
        commissionEarned: 500,
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      console.log(`✅ Fixed: ${data.doctorName || doctorId} → verified`);
      fixed++;
    } else {
      console.log(`ℹ️ Skipped: ${data.doctorName || doctorId} (not verified/active)`);
    }
  }
  
  console.log(`\n✅ Fixed ${fixed} referrals`);
}

fixReferralStatuses().catch(console.error);