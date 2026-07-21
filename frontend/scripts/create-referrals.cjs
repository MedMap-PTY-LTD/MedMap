// scripts/create-referrals.cjs
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../serviceAccountKey.json'), 'utf8')
);

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

async function createReferrals() {
  console.log('🚀 Creating missing referrals...\n');
  
  // Get all ambassadors with referral codes
  const ambassadorsSnapshot = await db.collection('ambassadors').get();
  const ambassadorMap = {};
  
  for (const doc of ambassadorsSnapshot.docs) {
    const data = doc.data();
    if (data.referralCode && data.referralCode !== 'NONE') {
      ambassadorMap[data.referralCode] = {
        id: doc.id,
        name: `${data.firstName || 'Unknown'} ${data.lastName || ''}`.trim() || 'Unknown',
        email: data.email || 'N/A',
      };
    }
  }
  
  console.log(`📋 Found ${Object.keys(ambassadorMap).length} ambassadors with referral codes:\n`);
  for (const [code, info] of Object.entries(ambassadorMap)) {
    console.log(`   ${code} → ${info.name} (${info.id})`);
  }
  
  // Get all doctors with referral codes
  const doctorsSnapshot = await db.collection('doctors').get();
  const doctorsWithReferrals = [];
  
  for (const doc of doctorsSnapshot.docs) {
    const data = doc.data();
    if (data.referralCodeUsed && data.referralCodeUsed !== 'NONE') {
      // Get user data for doctor
      let doctorEmail = data.email || 'N/A';
      let doctorName = data.fullName || data.firstName || 'Unknown';
      
      // Try to get from users collection
      try {
        const userDoc = await db.collection('users').doc(doc.id).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          doctorEmail = userData.email || doctorEmail;
          doctorName = userData.fullName || userData.firstName || doctorName;
        }
      } catch (e) {}
      
      doctorsWithReferrals.push({
        id: doc.id,
        name: doctorName,
        email: doctorEmail,
        referralCodeUsed: data.referralCodeUsed,
        specialization: data.specialization || 'N/A',
      });
    }
  }
  
  console.log(`\n📋 Found ${doctorsWithReferrals.length} doctors with referral codes:\n`);
  for (const doc of doctorsWithReferrals) {
    console.log(`   ${doc.name} (${doc.email}) → ${doc.referralCodeUsed}`);
  }
  
  // Create referral documents
  let created = 0;
  let skipped = 0;
  
  for (const doctor of doctorsWithReferrals) {
    const ambassadorInfo = ambassadorMap[doctor.referralCodeUsed];
    
    if (!ambassadorInfo) {
      console.log(`\n⚠️ No ambassador found for referral code: ${doctor.referralCodeUsed}`);
      skipped++;
      continue;
    }
    
    // Check if referral already exists
    const existingRef = await db.collection('referrals')
      .where('doctorId', '==', doctor.id)
      .get();
    
    if (!existingRef.empty) {
      console.log(`\n⚠️ Referral already exists for doctor: ${doctor.name}`);
      skipped++;
      continue;
    }
    
    // Create referral document
    const referralData = {
      ambassadorId: ambassadorInfo.id,
      ambassadorName: ambassadorInfo.name,
      referralCode: doctor.referralCodeUsed,
      referredAt: FieldValue.serverTimestamp(),
      doctorId: doctor.id,
      doctorName: doctor.name,
      doctorEmail: doctor.email,
      doctorSpecialization: doctor.specialization,
      status: 'pending',
      commissionEarned: 0,
      commissionPaid: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    await db.collection('referrals').doc(`doctor_${doctor.id}`).set(referralData);
    
    // Update ambassador's totalReferredDoctors
    const ambassadorRef = db.collection('ambassadors').doc(ambassadorInfo.id);
    const ambassadorDoc = await ambassadorRef.get();
    const currentTotal = ambassadorDoc.data()?.totalReferredDoctors || 0;
    await ambassadorRef.update({
      totalReferredDoctors: currentTotal + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    created++;
    console.log(`\n✅ Created referral for: ${doctor.name}`);
    console.log(`   → Ambassador: ${ambassadorInfo.name}`);
    console.log(`   → Referral Code: ${doctor.referralCodeUsed}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Created: ${created} referrals`);
  console.log(`⚠️ Skipped: ${skipped} (already exist or no ambassador)`);
  console.log('\n✅ Migration complete!');
}

createReferrals().catch(console.error);