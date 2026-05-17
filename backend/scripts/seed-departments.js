// Run: node backend/scripts/seed-departments.js
// Make sure your .env MONGO_URI is set and backend isn't running

import mongoose from "mongoose";
import { config } from "dotenv";
config();

const departments = [
  { name: "Admin",        email: "admin@kayad.space",     password: "Admin@123",     role: "admin" },
  { name: "Marketing",    email: "marketing@kayad.space", password: "Market@123",    role: "marketing" },
  { name: "Tech Support", email: "support@kayad.space",   password: "Support@123",   role: "technical_support" },
  { name: "HR",           email: "hr@kayad.space",        password: "Hr@123456",     role: "hr" },
  { name: "Accounts",     email: "accounts@kayad.space",  password: "Acc@12345",     role: "accounts" },
  { name: "Escrow",       email: "escrow@kayad.space",    password: "Escrow@123",    role: "escrow_officer" },
  { name: "Ad Manager",   email: "ads@kayad.space",       password: "Ads@12345",     role: "ad_manager" },
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
  console.log("\nDone! You can now login with any of these accounts.");
}

run().catch(err => { console.error(err); process.exit(1); });
