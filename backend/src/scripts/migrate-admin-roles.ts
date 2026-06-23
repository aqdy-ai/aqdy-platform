/**
 * Migration Script: Convert existing admin users to super_admin role
 *
 * Run: npx tsx src/scripts/migrate-admin-roles.ts
 */
import mongoose from "mongoose";
import "dotenv/config";
import { env } from "../config/env.js";

async function migrate() {
  console.log("🔄 Connecting to database...");
  await mongoose.connect(env.MONGODB_URI);

  const db = mongoose.connection.db;
  if (!db) {
    console.error("❌ Failed to connect to database");
    process.exit(1);
  }

  const usersCollection = db.collection("users");

  // Find all users with role "admin"
  const adminUsers = await usersCollection.find({ role: "admin" }).toArray();
  console.log(`📋 Found ${adminUsers.length} user(s) with role "admin"`);

  if (adminUsers.length === 0) {
    console.log("✅ No migration needed — no admin users found.");
    await mongoose.disconnect();
    process.exit(0);
  }

  // Update all "admin" roles to "super_admin"
  const result = await usersCollection.updateMany(
    { role: "admin" },
    { $set: { role: "super_admin" } },
  );

  console.log(
    `✅ Migrated ${result.modifiedCount} user(s) from "admin" to "super_admin"`,
  );

  for (const user of adminUsers) {
    console.log(`   → ${user.email} (${user._id})`);
  }

  await mongoose.disconnect();
  console.log("🔌 Disconnected from database");
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
