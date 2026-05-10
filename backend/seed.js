// backend/seed.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import Car from "./models/Car.js";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";

// =============================
// 🚗 SAMPLE DATA
// =============================
const seedCars = [
  {
    title: "Toyota Land Cruiser V8",
    brand: "Toyota",
    price: 8500000,
    year: 2021,
    mileage: 32000,
    images: ["https://via.placeholder.com/400x300"],
    allowBuy: true,
    allowBid: true,
    auctionStatus: "live",
    auctionEndTime: new Date(Date.now() + 3600000),
  },
  {
    title: "BMW X5 M Sport",
    brand: "BMW",
    price: 6200000,
    year: 2020,
    mileage: 45000,
    images: ["https://via.placeholder.com/400x300"],
    allowBuy: true,
    allowBid: false,
  },
];

// =============================
// 🗄 CONNECT DB
// =============================
const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ DB connected for seeding");
};

// =============================
// 🌱 IMPORT DATA
// =============================
const importData = async () => {
  try {
    if (isProd) {
      console.log("⛔ Seeding blocked in production");
      process.exit();
    }

    await Car.deleteMany();
    await Car.insertMany(seedCars);

    console.log("🌱 Data imported");
    process.exit();
  } catch (err) {
    console.error("❌ Import error:", err);
    process.exit(1);
  }
};

// =============================
// 🗑 DELETE DATA
// =============================
const destroyData = async () => {
  try {
    if (isProd) {
      console.log("⛔ Delete blocked in production");
      process.exit();
    }

    await Car.deleteMany();

    console.log("🗑 Data destroyed");
    process.exit();
  } catch (err) {
    console.error("❌ Delete error:", err);
    process.exit(1);
  }
};

// =============================
// 🚀 RUNNER
// =============================
const run = async () => {
  await connectDB();

  if (process.argv[2] === "-d") {
    await destroyData();
  } else {
    await importData();
  }
};

run();