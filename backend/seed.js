// backend/seed.js
// Run: node seed.js
// Also exports reseed() for programmatic re-seeding from admin API
// Hierarchy: Webhost (superadmin) → Admin → Staff | Dealer → Dealer Staff | Seller | Buyer

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import Car from "./models/Car.js";
import User from "./models/User.js";

dotenv.config();

// Helper: upsert a user (create or update)
const upsertUser = async (match, data, createdList, listKey) => {
  let u = await User.findOne(match);
  if (!u) {
    u = await User.create(data);
    createdList.push(`${data.email}`);
  } else {
    for (const key of Object.keys(data)) u[key] = data[key];
    await u.save();
    createdList.push(`${data.email} (updated)`);
  }
  return u;
};

const IMG = (u) => ({ url: u, thumb: u, public_id: "" });

const SHARED = [
  "https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d1?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1533928298208-27ff66555d8d?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1607016284316-6e1019c28e23?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1603584173870-7f23fd4c2b4b?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1606664444110-0c1e1e84b8fe?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1511919886926-f7fb7d0c6e2c?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1581540222194-0def2dda95b8?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1570733117311-d990c3816c47?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1605816988069-b11383b5076e?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1583267746897-3e42c7e14754?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=600&h=400&fit=crop",
];

const eightImages = (urls, i) => {
  const dedicated = urls.map(IMG);
  const start = (i * 6) % 24;
  const shared = SHARED.slice(start, start + 6).map(IMG);
  return [...dedicated, ...shared];
};

const seedCars = [
  { title:"Toyota Land Cruiser V8 2021", brand:"Toyota", year:2021, price:8500000, fuel:"Diesel", transmission:"Automatic", mileage:45000, bodyType:"SUV", location:{city:"Nairobi", coordinates:{type:"Point",coordinates:[36.8219,-1.2921]}}, views:1842, isPromoted:true, isVerifiedDealer:true, allowBid:true, allowBuy:false, auctionStatus:"live", startingBid:100000, currentBid:100000, bidIncrement:50000, dealRating:"great", images:eightImages(["https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&h=400&fit=crop"], 0) },
  { title:"Mercedes-Benz GLE 350d 2022", brand:"Mercedes", year:2022, price:12000000, fuel:"Diesel", transmission:"Automatic", mileage:22000, bodyType:"SUV", location:{city:"Nairobi", coordinates:{type:"Point",coordinates:[36.8219,-1.2921]}}, views:2103, isPromoted:true, isVerifiedDealer:true, allowBid:true, allowBuy:false, auctionStatus:"live", startingBid:100000, currentBid:100000, bidIncrement:50000, dealRating:"fair", images:eightImages(["https://images.unsplash.com/photo-1618843479313-40f8afb4b4d1?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=600&h=400&fit=crop"], 1) },
  { title:"BMW X5 M Sport 2020", brand:"BMW", year:2020, price:6200000, fuel:"Petrol", transmission:"Automatic", mileage:38000, bodyType:"SUV", location:{city:"Mombasa", coordinates:{type:"Point",coordinates:[39.6682,-4.0435]}}, views:1567, isPromoted:false, isVerifiedDealer:true, allowBid:false, allowBuy:true, auctionStatus:"draft", dealRating:"great", images:eightImages(["https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&h=400&fit=crop"], 2) },
  { title:"Subaru Forester XT 2021", brand:"Subaru", year:2021, price:3800000, fuel:"Petrol", transmission:"Automatic", mileage:28000, bodyType:"SUV", location:{city:"Nairobi", coordinates:{type:"Point",coordinates:[36.8219,-1.2921]}}, views:982, isPromoted:false, isVerifiedDealer:true, allowBid:false, allowBuy:true, auctionStatus:"draft", dealRating:"good", images:eightImages(["https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop"], 3) },
  { title:"Nissan X-Trail 2022", brand:"Nissan", year:2022, price:2900000, fuel:"Petrol", transmission:"Automatic", mileage:18000, bodyType:"SUV", location:{city:"Nakuru", coordinates:{type:"Point",coordinates:[36.0667,-0.2833]}}, views:734, isPromoted:false, isVerifiedDealer:false, allowBid:false, allowBuy:true, auctionStatus:"draft", dealRating:"good", images:eightImages(["https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1533928298208-27ff66555d8d?w=600&h=400&fit=crop"], 4) },
  { title:"Mazda CX-5 2023", brand:"Mazda", year:2023, price:4200000, fuel:"Petrol", transmission:"Automatic", mileage:12000, bodyType:"SUV", location:{city:"Nairobi", coordinates:{type:"Point",coordinates:[36.8219,-1.2921]}}, views:1289, isPromoted:true, isVerifiedDealer:true, allowBid:false, allowBuy:true, auctionStatus:"draft", dealRating:"great", images:eightImages(["https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&h=400&fit=crop"], 5) },
  { title:"Land Rover Range Rover Sport 2020", brand:"Land Rover", year:2020, price:15000000, fuel:"Diesel", transmission:"Automatic", mileage:35000, bodyType:"SUV", location:{city:"Nairobi", coordinates:{type:"Point",coordinates:[36.8219,-1.2921]}}, views:3210, isPromoted:true, isVerifiedDealer:true, allowBid:true, allowBuy:false, auctionStatus:"live", startingBid:100000, currentBid:100000, bidIncrement:50000, dealRating:"overpriced", images:eightImages(["https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1607016284316-6e1019c28e23?w=600&h=400&fit=crop"], 6) },
  { title:"Audi A4 2.0 TFSI 2021", brand:"Audi", year:2021, price:3800000, fuel:"Petrol", transmission:"Automatic", mileage:25000, bodyType:"Sedan", location:{city:"Nairobi", coordinates:{type:"Point",coordinates:[36.8219,-1.2921]}}, views:876, isPromoted:false, isVerifiedDealer:true, allowBid:false, allowBuy:true, auctionStatus:"draft", dealRating:"good", images:eightImages(["https://images.unsplash.com/photo-1603584173870-7f23fd4c2b4b?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1606664444110-0c1e1e84b8fe?w=600&h=400&fit=crop"], 7) },
  { title:"Lexus ES 350 2022", brand:"Lexus", year:2022, price:5200000, fuel:"Petrol", transmission:"Automatic", mileage:15000, bodyType:"Sedan", location:{city:"Mombasa", coordinates:{type:"Point",coordinates:[39.6682,-4.0435]}}, views:654, isPromoted:false, isVerifiedDealer:true, allowBid:false, allowBuy:true, auctionStatus:"draft", dealRating:"fair", images:eightImages(["https://images.unsplash.com/photo-1511919886926-f7fb7d0c6e2c?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1581540222194-0def2dda95b8?w=600&h=400&fit=crop"], 8) },
  { title:"Volkswagen Passat 2021", brand:"Volkswagen", year:2021, price:2600000, fuel:"Diesel", transmission:"Automatic", mileage:32000, bodyType:"Sedan", location:{city:"Eldoret", coordinates:{type:"Point",coordinates:[35.2695,0.5204]}}, views:521, isPromoted:false, isVerifiedDealer:false, allowBid:false, allowBuy:true, auctionStatus:"draft", dealRating:"great", images:eightImages(["https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1570733117311-d990c3816c47?w=600&h=400&fit=crop"], 9) },
  { title:"Honda Accord 2022", brand:"Honda", year:2022, price:3100000, fuel:"Petrol", transmission:"Automatic", mileage:20000, bodyType:"Sedan", location:{city:"Nairobi", coordinates:{type:"Point",coordinates:[36.8219,-1.2921]}}, views:445, isPromoted:false, isVerifiedDealer:false, allowBid:false, allowBuy:true, auctionStatus:"draft", dealRating:"good", images:eightImages(["https://images.unsplash.com/photo-1605816988069-b11383b5076e?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1590362891991-f776e747a588?w=600&h=400&fit=crop"], 10) },
  { title:"Toyota Hilux Double Cabin 2021", brand:"Toyota", year:2021, price:4200000, fuel:"Diesel", transmission:"Automatic", mileage:40000, bodyType:"Pickup", location:{city:"Nairobi", coordinates:{type:"Point",coordinates:[36.8219,-1.2921]}}, views:1678, isPromoted:true, isVerifiedDealer:true, allowBid:false, allowBuy:true, auctionStatus:"draft", dealRating:"great", images:eightImages(["https://images.unsplash.com/photo-1583267746897-3e42c7e14754?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=600&h=400&fit=crop"], 11) },
];

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return; // already connected
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log("DB connected for seeding");
};

export async function reseed() {
  await connectDB();

  const created = { webhost: [], admin: [], demos: [], staff: [], dealers: [], cars: 0 };

  const isProd = process.env.NODE_ENV === "production";
  const devFallback = (pw) => {
    if (isProd) throw new Error(`Seed password required via env var in production`);
    console.warn(`⚠️  Using dev-only fallback password — set SEED_* env vars for production`);
    return pw;
  };

  // ══════════════════════════════════════════════════════════
  // 1. WEBHOST (IMMUTABLE SUPERADMIN) — owns the platform
  // ══════════════════════════════════════════════════════════
  const webhostEmail    = process.env.SEED_ADMIN_EMAIL;
  const webhostPassword = process.env.SEED_ADMIN_PASSWORD || devFallback("Jimmy@Kayad2026!");
  const webhostName     = process.env.SEED_ADMIN_NAME || "Jimmy Mugo (Webhost)";

  if (webhostEmail) {
    let admin = await User.findOne({ email: webhostEmail });
    if (!admin) {
      admin = await User.create({ name: webhostName, email: webhostEmail, password: webhostPassword, role: "superadmin", isDemo: false, emailVerified: true });
      created.webhost.push(webhostEmail);
    } else {
      admin.password = webhostPassword;
      admin.role = "superadmin";
      admin.isDemo = false;
      admin.emailVerified = true;
      await admin.save();
      created.webhost.push(`${webhostEmail} (updated)`);
    }
  }

  // ══════════════════════════════════════════════════════════
  // 2. PLATFORM ADMIN
  // ══════════════════════════════════════════════════════════
  const adminAcc = await User.findOne({ email: "admin@kayad.space" });
  const adminPw = process.env.SEED_ADMIN_PW || devFallback("Admin@Kayad2026!");
  await upsertUser(
    { email: "admin@kayad.space" },
    { name: "Platform Admin", email: "admin@kayad.space", password: adminPw, role: "admin", approved: true, mustChangePassword: true, isDemo: true, emailVerified: true },
    created.admin
  );

  // ══════════════════════════════════════════════════════════
  // 3. DEMO ACCOUNTS (3 only — Dealer, Seller, Buyer)
  // ══════════════════════════════════════════════════════════
  const demos = [
    { name: "Demo Dealer",  email: "dealer@kayad.space", password: process.env.SEED_DEALER_PW || devFallback("Dealer@Kayad2026!"), role: "dealer", approved: true, businessName: "Kayad Motors Demo", location: "Nairobi", dealerPackage: "starter", dealerRating: 4.7, mustChangePassword: true, isDemo: true, emailVerified: true },
    { name: "Demo Seller",  email: "seller@kayad.space", password: process.env.SEED_SELLER_PW || devFallback("Seller@Kayad2026!"), role: "broker", approved: true, businessName: "Private Seller", mustChangePassword: true, isDemo: true, emailVerified: true },
    { name: "Demo Buyer",   email: "buyer@kayad.space",  password: process.env.SEED_BUYER_PW  || devFallback("Buyer@Kayad2026!"),  role: "user",   approved: true, mustChangePassword: true, isDemo: true, emailVerified: true },
  ];

  for (const acc of demos) {
    await upsertUser({ email: acc.email }, acc, created.demos);
  }

  // ══════════════════════════════════════════════════════════
  // 3b. ADDITIONAL DEALER ACCOUNTS (Elite + Pending)
  // ══════════════════════════════════════════════════════════
  const extraDealers = [
    { name: "Elite Dealer", email: "elite@kayad.space", password: process.env.SEED_ELITE_PW || devFallback("Elite@Kayad2026!"), role: "dealer", approved: true, businessName: "Elite Motors Kenya", location: "Nairobi", dealerPackage: "elite", dealerRating: 4.9, mustChangePassword: true, isDemo: true, emailVerified: true },
    { name: "Pending Dealer", email: "pending@kayad.space", password: process.env.SEED_PENDING_PW || devFallback("Pending@Kayad2026!"), role: "dealer", approved: false, businessName: "New Ventures Ltd", location: "Nairobi", mustChangePassword: true, isDemo: true, emailVerified: true },
  ];

  for (const acc of extraDealers) {
    await upsertUser({ email: acc.email }, acc, created.dealers);
  }

  // ══════════════════════════════════════════════════════════
  // 3c. STAFF ACCOUNTS (departmental roles)
  // ══════════════════════════════════════════════════════════
  const staffAccounts = [
    { name: "HR Manager",       email: "hr@kayad.space",        password: process.env.SEED_HR_PW      || devFallback("Hr@Kayad2026!"),     role: "hr",              approved: true, mustChangePassword: true, isDemo: true, emailVerified: true },
    { name: "Accounts Officer", email: "accounts@kayad.space",  password: process.env.SEED_ACCOUNTS_PW || devFallback("Acc@Kayad2026!"),    role: "accounts",        approved: true, mustChangePassword: true, isDemo: true, emailVerified: true },
    { name: "Escrow Officer",   email: "escrow@kayad.space",    password: process.env.SEED_ESCROW_PW   || devFallback("Escrow@Kayad2026!"), role: "escrow_officer",   approved: true, mustChangePassword: true, isDemo: true, emailVerified: true },
    { name: "Marketing Lead",   email: "marketing@kayad.space", password: process.env.SEED_MARKET_PW  || devFallback("Market@Kayad2026!"),  role: "marketing",       approved: true, mustChangePassword: true, isDemo: true, emailVerified: true },
    { name: "Ad Manager",       email: "ads@kayad.space",       password: process.env.SEED_ADS_PW     || devFallback("Ads@Kayad2026!"),    role: "ad_manager",      approved: true, mustChangePassword: true, isDemo: true, emailVerified: true },
    { name: "Tech Support",     email: "support@kayad.space",   password: process.env.SEED_SUPPORT_PW || devFallback("Support@Kayad2026!"), role: "technical_support", approved: true, mustChangePassword: true, isDemo: true, emailVerified: true },
    { name: "Moderator",        email: "mod@kayad.space",       password: process.env.SEED_MOD_PW     || devFallback("Mod@Kayad2026!"),    role: "moderator",       approved: true, mustChangePassword: true, isDemo: true, emailVerified: true },
  ];

  for (const acc of staffAccounts) {
    await upsertUser({ email: acc.email }, acc, created.staff);
  }

  // ══════════════════════════════════════════════════════════
  // 4. DEMO CARS
  // ══════════════════════════════════════════════════════════
  const dealer = await User.findOne({ email: "dealer@kayad.space" });
  if (dealer) {
    await Car.deleteMany({ dealer: dealer._id });
    dealer.listingCount = 0;
    dealer.trialListingsUsed = 0;
    dealer.firstVehicleUsed = false;
    await dealer.save();
    const cars = seedCars.map((c) => ({ ...c, dealer: dealer._id, status: "active", coverImage: 0, isDemo: true }));
    const inserted = await Car.insertMany(cars);
    created.cars = inserted.length;
  }

  return created;
}

const seed = async () => {
  dotenv.config();
  try {
    await connectDB();
    const result = await reseed();
    console.log(`\nWebhost: ${result.webhost.join(", ")}`);
    console.log(`Admin: ${result.admin.join(", ")}`);
    console.log(`Demos: ${result.demos.join(", ")}`);
    console.log(`Staff: ${result.staff.join(", ")}`);
    console.log(`Dealers: ${result.dealers.join(", ")}`);
    console.log(`Cars: ${result.cars}`);
    console.log(`\n✅ KAYAD — SEED COMPLETE`);
    process.exit();
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
};

// CLI: node seed.js (skip when imported by admin route)
const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && (
  path.resolve(process.argv[1]) === __filename ||
  process.argv[1] === path.basename(__filename)
);
if (isMain) seed();
