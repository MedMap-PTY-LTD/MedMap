// scripts/migrate.cjs
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

console.log('🔧 Initializing Firebase Admin SDK...');

const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account key not found!');
  console.error(`📁 Expected: ${serviceAccountPath}`);
  console.error('📋 Download from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key');
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  // Initialize using the new v14 API
  const app = initializeApp({
    credential: cert(serviceAccount),
  });
  
  console.log('✅ Firebase Admin SDK initialized\n');
  console.log(`📡 Project: ${app.options?.projectId || 'medmap-4da69'}\n`);
} catch (error) {
  console.error('❌ Error initializing:', error.message);
  process.exit(1);
}

const db = getFirestore();

async function main() {
  console.log('🚀 Starting migration...\n');
  
  try {
    const ambassadors = await db.collection('ambassadors').get();
    console.log(`📊 Found ${ambassadors.size} ambassadors\n`);
    
    let count = 0;
    let totalRefs = 0;
    
    for (const doc of ambassadors.docs) {
      const data = doc.data();
      const name = `${data.firstName || 'Unknown'} ${data.lastName || ''}`.trim() || 'Unnamed';
      
      const referrals = await db.collection('referrals')
        .where('ambassadorId', '==', doc.id)
        .get();
      
      const refCount = referrals.size;
      totalRefs += refCount;
      
      // Count verified referrals
      const verifiedReferrals = referrals.docs.filter(d => d.data().status === 'verified');
      let activeDoctors = 0;
      
      for (const refDoc of verifiedReferrals) {
        const doctorId = refDoc.data().doctorId;
        if (doctorId) {
          try {
            const userDoc = await db.collection('users').doc(doctorId).get();
            if (userDoc.exists && userDoc.data()?.isActive === true) {
              activeDoctors++;
            }
          } catch (e) {}
        }
      }
      
      let earnings = 0;
      let pendingEarnings = 0;
      for (const refDoc of verifiedReferrals) {
        const commission = refDoc.data().commissionEarned || 0;
        earnings += commission;
        if (!refDoc.data().commissionPaid) {
          pendingEarnings += commission;
        }
      }
      
      // Determine tier
      let currentTier = 'bronze';
      if (activeDoctors >= 100) currentTier = 'diamond';
      else if (activeDoctors >= 51) currentTier = 'gold';
      else if (activeDoctors >= 11) currentTier = 'silver';
      
      await doc.ref.update({
        totalReferredDoctors: refCount,
        activeReferredDoctors: activeDoctors,
        totalEarnings: earnings,
        pendingEarnings: pendingEarnings,
        currentTier: currentTier,
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      count++;
      console.log(`✅ ${count}/${ambassadors.size}: ${name}`);
      console.log(`   📋 ${refCount} referrals (${verifiedReferrals.length} verified)`);
      console.log(`   🟢 ${activeDoctors} active | 💰 R${earnings}`);
      console.log(`   🏆 ${currentTier}\n`);
    }
    
    console.log('='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Updated: ${count} ambassadors`);
    console.log(`📋 Total referrals: ${totalRefs}`);
    console.log('\n✅ Migration complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

main();