// backend/seeder/megaSeed.js

import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "../models/User.js";
import Car from "../models/Car.js";
import Bid from "../models/Bid.js";
import Payment from "../models/Payment.js";
import Review from "../models/Review.js";

dotenv.config();

// =============================
// 🔌 CONNECT
// =============================
const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ DB Connected");
};

// =============================
// 🧹 CLEAR
// =============================
const clearAll = async () => {
  await Promise.all([
    User.deleteMany(),
    Car.deleteMany(),
    Bid.deleteMany(),
    Payment.deleteMany(),
    Review.deleteMany(),
  ]);
  console.log("🧹 Cleared DB");
};

// =============================
// 🎲 HELPERS
// =============================
const rand = (min, max) => Math.floor(Math.random() * (max - min) + min);

const brands = [
  "Toyota", "Mazda", "Subaru", "Nissan", "Mercedes",
  "BMW", "Audi", "Honda", "Volkswagen", "Isuzu"
];

const carNames = {
  Toyota: ["Prado", "Hilux", "Corolla", "Harrier"],
  Mazda: ["CX-5", "Axela"],
  Subaru: ["Forester", "Outback"],
  Nissan: ["X-Trail", "Navara"],
  Mercedes: ["C200", "E300"],
  BMW: ["X5", "320i"],
  Audi: ["Q5", "A4"],
  Honda: ["CR-V", "Fit"],
  Volkswagen: ["Tiguan", "Golf"],
  Isuzu: ["D-Max"],
};

// =============================
// 👤 USERS
// =============================
const seedUsers = async () => {
  const users = [];

  // Admin
  users.push({
    name: "Admin",
    email: "admin@giclan.com",
    password: "123456",
    role: "admin",
    approved: true,
  });

  // Dealers
  for (let i = 1; i <= 5; i++) {
    users.push({
      name: `Dealer ${i}`,
      email: `dealer${i}@giclan.com`,
      password: "123456",
      role: "dealer",
      approved: true,
      businessName: `Motors ${i}`,
      location: ["Nairobi", "Mombasa", "Kisumu"][i % 3],
    });
  }

  // Buyers
  for (let i = 1; i <= 15; i++) {
    users.push({
      name: `User ${i}`,
      email: `user${i}@giclan.com`,
      password: "123456",
      role: "user",
    });
  }

  const created = await User.insertMany(users);
  console.log(`👤 ${created.length} users created`);
  return created;
};

// =============================
// 🚗 CARS
// =============================
const seedCars = async (users) => {
  const dealers = users.filter((u) => u.role === "dealer");

  const cars = [];

  for (let i = 0; i < 50; i++) {
    const brand = brands[rand(0, brands.length)];
    const model = carNames[brand][rand(0, carNames[brand].length)];

    const price = rand(800000, 8000000);
    const allowBid = Math.random() > 0.5;

    cars.push({
      title: `${brand} ${model}`,
      brand,
      price,
      images: [`https://picsum.photos/400/30${i}`],
      allowBid,
      allowBuy: true,
      currentBid: allowBid ? price * 0.8 : 0,
      auctionStatus: allowBid ? "LIVE" : "SCHEDULED",
      user: dealers[rand(0, dealers.length)]._id,
    });
  }

  const created = await Car.insertMany(cars);
  console.log(`🚗 ${created.length} cars created`);
  return created;
};

// =============================
// 💰 BIDS (REALISTIC CHAOS)
// =============================
const seedBids = async (users, cars) => {
  const buyers = users.filter((u) => u.role === "user");

  const bids = [];

  for (const car of cars.filter((c) => c.allowBid)) {
    const numBids = rand(2, 8);

    let current = car.currentBid || car.price * 0.6;

    for (let i = 0; i < numBids; i++) {
      const increment = rand(10000, 150000);
      current += increment;

      bids.push({
        amount: current,
        phone: `2547${rand(10000000, 99999999)}`,
        bidderTag: `BID${rand(1000, 9999)}`,
        status: "ACTIVE",
        carId: car._id,
        userId: buyers[rand(0, buyers.length)]._id,
      });
    }

    car.currentBid = current;
  }

  await Car.bulkSave(cars);

  const created = await Bid.insertMany(bids);
  console.log(`💰 ${created.length} bids created`);
  return created;
};

// =============================
// 💳 PAYMENTS
// =============================
const seedPayments = async (users, cars, bids) => {
  const payments = [];

  const buyers = users.filter((u) => u.role === "user");

  for (let i = 0; i < 80; i++) {
    const isBid = Math.random() > 0.5;

    payments.push({
      type: isBid ? "bid" : "buy",
      amount: isBid ? rand(500, 2000) : rand(800000, 5000000),
      phone: `2547${rand(10000000, 99999999)}`,
      status: Math.random() > 0.2 ? "success" : "failed",
      mpesaReceipt: `MPESA${rand(100000, 999999)}`,
      user: buyers[rand(0, buyers.length)]._id,
      referenceId: isBid
        ? bids[rand(0, bids.length)]._id
        : cars[rand(0, cars.length)]._id,
      referenceModel: isBid ? "Bid" : "Car",
    });
  }

  await Payment.insertMany(payments);
  console.log(`💳 ${payments.length} payments created`);
};

// =============================
// ⭐ REVIEWS
// =============================
const seedReviews = async (users, cars) => {
  const buyers = users.filter((u) => u.role === "user");
  const dealers = users.filter((u) => u.role === "dealer");

  const reviews = [];

  for (let i = 0; i < 40; i++) {
    reviews.push({
      rating: rand(3, 6),
      comment: [
        "Excellent dealer",
        "Smooth transaction",
        "Average experience",
        "Very professional",
        "Would recommend",
      ][rand(0, 5)],
      user: buyers[rand(0, buyers.length)]._id,
      dealer: dealers[rand(0, dealers.length)]._id,
      car: cars[rand(0, cars.length)]._id,
      isVerified: Math.random() > 0.5,
    });
  }

  await Review.insertMany(reviews);
  console.log(`⭐ ${reviews.length} reviews created`);
};

// =============================
// 🚀 RUN
// =============================
const run = async () => {
  try {
    await connectDB();

    if (process.env.NODE_ENV === "production") {
      throw new Error("❌ BLOCKED IN PRODUCTION");
    }

    await clearAll();

    const users = await seedUsers();
    const cars = await seedCars(users);
    const bids = await seedBids(users, cars);

    await seedPayments(users, cars, bids);
    await seedReviews(users, cars);

    console.log("🔥 MEGA SEED COMPLETE");

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();