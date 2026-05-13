// Run: node scripts/enableDemoAuctions.js
// Enables 3 demo cars for live auction testing

import mongoose from "mongoose";
import dotenv from "dotenv";
import Car from "../models/Car.js";
import User from "../models/User.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/kayad";

async function enableAuctions() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  // Find the demo dealer
  const dealer = await User.findOne({ role: "dealer" }).lean();
  if (!dealer) {
    console.log("No dealer found — run seed.js first");
    process.exit(1);
  }

  // Pick 3 high-value cars for elite auction testing
  const titles = [
    "Toyota Land Cruiser V8 2021",
    "Mercedes-Benz GLE 350d 2022",
    "Land Rover Range Rover Sport 2020",
  ];

  const result = await Car.updateMany(
    { title: { $in: titles }, dealer: dealer._id },
    {
      $set: {
        allowBid: true,
        allowBuy: false,
        auctionStatus: "live",
        auctionStartTime: new Date(),
        auctionEndTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        currentBid: 100000,
        startingBid: 100000,
        bidIncrement: 50000,
      },
    }
  );

  console.log(`Modified ${result.modifiedCount} cars`);

  // Show what was updated
  const updated = await Car.find({
    title: { $in: titles },
  }).select("title allowBid auctionStatus currentBid").lean();

  updated.forEach((c) =>
    console.log(`  ✅ ${c.title}: allowBid=${c.allowBid}, status=${c.auctionStatus}`)
  );

  await mongoose.disconnect();
}

enableAuctions().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
