// Run: node backend/scripts/seed-departments.js
// Creates platform staff accounts for production operations.
// Run this after the main seed to provision additional department roles.
// Make sure your .env MONGO_URI is set and backend isn't running

import mongoose from "mongoose";
import { config } from "dotenv";
config();

const departments = [
  { name: "Marketing",    email: "marketing@kayad.space", password: process.env.SEED_MARKET_PW  || "Market@Kayad2026!", role: "marketing" },
  { name: "Tech Support", email: "support@kayad.space",   password: process.env.SEED_SUPPORT_PW || "Support@Kayad2026!", role: "technical_support" },
  { name: "HR",           email: "hr@kayad.space",        password: process.env.SEED_HR_PW      || "Hr@Kayad2026!", role: "hr" },
  { name: "Accounts",     email: "accounts@kayad.space",  password: process.env.SEED_ACCOUNTS_PW|| "Acc@Kayad2026!", role: "accounts" },
  { name: "Escrow",       email: "escrow@kayad.space",    password: process.env.SEED_ESCROW_PW  || "Escrow@Kayad2026!", role: "escrow_officer" },
  { name: "Ad Manager",   email: "ads@kayad.space",       password: process.env.SEED_ADS_PW     || "Ads@Kayad2026!", role: "ad_manager" },
];

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error("MONGO_URI not set in .env"); process.exit(1); }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const User = mongoose.model("User", (await import("../models/User.js")).default.schema);

  for (const d of departments) {
    const exists = await User.findOne({ email: d.email });
    if (exists) {
      console.log(`  EXISTS: ${d.email} (${d.role})`);
    } else {
      await User.create(d);
      console.log(`  CREATED: ${d.email} (${d.role})`);
    }
  }

  await mongoose.disconnect();
  console.log("\nDone! Staff accounts provisioned.");
}

run().catch(err => { console.error(err); process.exit(1); });
