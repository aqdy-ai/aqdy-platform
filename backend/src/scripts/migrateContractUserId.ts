import mongoose from 'mongoose';
import { config } from 'dotenv';
import { Contract } from '../models/contract.model.js';

config();

const SYSTEM_USER_ID = 'system_migration_user';

async function migrate() {
  console.log('🚀 Starting userId migration...');

  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('✅ Connected to MongoDB');

  // جيب الـ contracts اللي مالهاش userId
  const contractsWithoutUserId = await Contract.find({
    $or: [
      { userId: { $exists: false } },
      { userId: null },
      { userId: '' },
    ],
  });

  console.log(`📄 Found ${contractsWithoutUserId.length} contracts without userId`);

  if (contractsWithoutUserId.length === 0) {
    console.log('✅ No migration needed!');
    await mongoose.disconnect();
    return;
  }

  // Backfill بالـ system userId
  const result = await Contract.updateMany(
    {
      $or: [
        { userId: { $exists: false } },
        { userId: null },
        { userId: '' },
      ],
    },
    { $set: { userId: SYSTEM_USER_ID } },
  );

  console.log(`✅ Updated ${result.modifiedCount} contracts with userId: ${SYSTEM_USER_ID}`);

  await mongoose.disconnect();
  console.log('✅ Migration complete!');
}

migrate().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});