// scripts/debug.cjs
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../serviceAccountKey.json'), 'utf8')
);

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

async function debug() {
  console.log('🔍 DEBUGGING DATABASE...\n');
  
  // Check ambassadors
  const ambassadors = await db.collection('ambassadors').get();
  console.log(`📊 Ambassadors: ${ambassadors.size}`);
  
  for (const doc of ambassadors.docs) {
    const data = doc.data();
    console.log(`\n📋 Ambassador: ${doc.id}`);
    console.log(`   Name: ${data.firstName || 'Unknown'} ${data.lastName || ''}`);
    console.log(`   Email: ${data.email || 'N/A'}`);
    console.log(`   Referral Code: ${data.referralCode || 'NONE'}`);
    console.log(`   Total Referrals (stored): ${data.totalReferredDoctors || 0}`);
  }
  
  // Check referrals
  const referrals = await db.collection('referrals').get();
  console.log(`\n📊 Referrals: ${referrals.size}`);
  
  for (const doc of referrals.docs) {
    const data = doc.data();
    console.log(`\n📋 Referral: ${doc.id}`);
    console.log(`   Ambassador ID: ${data.ambassadorId || 'N/A'}`);
    console.log(`   Doctor ID: ${data.doctorId || 'N/A'}`);
    console.log(`   Doctor Name: ${data.doctorName || 'N/A'}`);
    console.log(`   Status: ${data.status || 'N/A'}`);
    console.log(`   Referral Code: ${data.referralCode || 'N/A'}`);
  }
  
  // Check if there are any doctors
  const doctors = await db.collection('doctors').get();
  console.log(`\n📊 Doctors: ${doctors.size}`);
  
  for (const doc of doctors.docs) {
    const data = doc.data();
    console.log(`\n📋 Doctor: ${doc.id}`);
    console.log(`   Name: ${data.fullName || data.firstName || 'Unknown'}`);
    console.log(`   Email: ${data.email || 'N/A'}`);
    console.log(`   Referral Code Used: ${data.referralCodeUsed || 'NONE'}`);
  }
  
  console.log('\n✅ Debug complete!');
}

debug().catch(console.error);