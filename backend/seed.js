// backend/seed.js
// Run: node seed.js
// Seeds: super_admin (Jimmy), demo dealer, and sample cars

import mongoose from "mongoose";
import dotenv from "dotenv";
import Car from "./models/Car.js";
import User from "./models/User.js";

dotenv.config();

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
  { title:"Toyota Land Cruiser V8 2021", brand:"Toyota", year:2021, price:8500000, fuel:"Diesel", transmission:"Automatic", mileage:45000, bodyType:"SUV", location:{city:"Nairobi"}, views:1842, isPromoted:true, isVerifiedDealer:true, allowBid:true, allowBuy:false, auctionStatus:"live", startingBid:100000, currentBid:100000, bidIncrement:50000, dealRating:"great", images:eightImages(["https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&h=400&fit=crop"], 0) },
  { title:"Mercedes-Benz GLE 350d 2022", brand:"Mercedes", year:2022, price:12000000, fuel:"Diesel", transmission:"Automatic", mileage:22000, bodyType:"SUV", location:{city:"Nairobi"}, views:2103, isPromoted:true, isVerifiedDealer:true, allowBid:true, allowBuy:false, auctionStatus:"live", startingBid:100000, currentBid:100000, bidIncrement:50000, dealRating:"fair", images:eightImages(["https://images.unsplash.com/photo-1618843479313-40f8afb4b4d1?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=600&h=400&fit=crop"], 1) },
  { title:"BMW X5 M Sport 2020", brand:"BMW", year:2020, price:6200000, fuel:"Petrol", transmission:"Automatic", mileage:38000, bodyType:"SUV", location:{city:"Mombasa"}, views:1567, isPromoted:false, isVerifiedDealer:true, allowBid:false, allowBuy:true, auctionStatus:"draft", dealRating:"great", images:eightImages(["https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&h=400&fit=crop"], 2) },
  { title:"Subaru Forester XT 2021", brand:"Subaru", year:2021, price:3800000, fuel:"Petrol", transmission:"Automatic", mileage:28000, bodyType:"SUV", location:{city:"Nairobi"}, views:982, isPromoted:false, isVerifiedDealer:true, allowBid:false, allowBuy:true, auctionStatus:"draft", dealRating:"good", images:eightImages(["https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop"], 3) },
  { title:"Nissan X-Trail 2022", brand:"Nissan", year:2022, price:2900000, fuel:"Petrol", transmission:"Automatic", mileage:18000, bodyType:"SUV", location:{city:"Nakuru"}, views:734, isPromoted:false, isVerifiedDealer:false, allowBid:false, allowBuy:true, auctionStatus:"draft", dealRating:"good", images:eightImages(["https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1533928298208-27ff66555d8d?w=600&h=400&fit=crop"], 4) },
  { title:"Mazda CX-5 2023", brand:"Mazda", year:2023, price:4200000, fuel:"Petrol", transmission:"Automatic", mileage:12000, bodyType:"SUV", location:{city:"Nairobi"}, views:1289, isPromoted:true, isVerifiedDealer:true, allowBid:false, allowBuy:true, auctionStatus:"draft", dealRating:"great", images:eightImages(["https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&h=400&fit=crop"], 5) },
  { title:"Land Rover Range Rover Sport 2020", brand:"Land Rover", year:2020, price:15000000, fuel:"Diesel", transmission:"Automatic", mileage:35000, bodyType:"SUV", location:{city:"Nairobi"}, views:3210, isPromoted:true, isVerifiedDealer:true, allowBid:true, allowBuy:false, auctionStatus:"live", startingBid:100000, currentBid:100000, bidIncrement:50000, dealRating:"overpriced", images:eightImages(["https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1607016284316-6e1019c28e23?w=600&h=400&fit=crop"], 6) },
  { title:"Audi A4 2.0 TFSI 2021", brand:"Audi", year:2021, price:3800000, fuel:"Petrol", transmission:"Automatic", mileage:25000, bodyType:"Sedan", location:{city:"Nairobi"}, views:876, isPromoted:false, isVerifiedDealer:true, allowBid:false, allowBuy:true, auctionStatus:"draft", dealRating:"good", images:eightImages(["https://images.unsplash.com/photo-1603584173870-7f23fd4c2b4b?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1606664444110-0c1e1e84b8fe?w=600&h=400&fit=crop"], 7) },
  { title:"Lexus ES 350 2022", brand:"Lexus", year:2022, price:5200000, fuel:"Petrol", transmission:"Automatic", mileage:15000, bodyType:"Sedan", location:{city:"Mombasa"}, views:654, isPromoted:false, isVerifiedDealer:true, allowBid:false, allowBuy:true, auctionStatus:"draft", dealRating:"fair", images:eightImages(["https://images.unsplash.com/photo-1511919886926-f7fb7d0c6e2c?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1581540222194-0def2dda95b8?w=600&h=400&fit=crop"], 8) },
  { title:"Volkswagen Passat 2021", brand:"Volkswagen", year:2021, price:2600000, fuel:"Diesel", transmission:"Automatic", mileage:32000, bodyType:"Sedan", location:{city:"Eldoret"}, views:521, isPromoted:false, isVerifiedDealer:false, allowBid:false, allowBuy:true, auctionStatus:"draft", dealRating:"great", images:eightImages(["https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1570733117311-d990c3816c47?w=600&h=400&fit=crop"], 9) },
  { title:"Honda Accord 2022", brand:"Honda", year:2022, price:3100000, fuel:"Petrol", transmission:"Automatic", mileage:20000, bodyType:"Sedan", location:{city:"Nairobi"}, views:445, isPromoted:false, isVerifiedDealer:false, allowBid:false, allowBuy:true, auctionStatus:"draft", dealRating:"good", images:eightImages(["https://images.unsplash.com/photo-1605816988069-b11383b5076e?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1590362891991-f776e747a588?w=600&h=400&fit=crop"], 10) },
  { title:"Toyota Hilux Double Cabin 2021", brand:"Toyota", year:2021, price:4200000, fuel:"Diesel", transmission:"Automatic", mileage:40000, bodyType:"Pickup", location:{city:"Nairobi"}, views:1678, isPromoted:true, isVerifiedDealer:true, allowBid:false, allowBuy:true, auctionStatus:"draft", dealRating:"great", images:eightImages(["https://images.unsplash.com/photo-1583267746897-3e42c7e14754?w=600&h=400&fit=crop","https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=600&h=400&fit=crop"], 11) },
];

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log("DB connected for seeding");
};

const seed = async () => {
  try {
    await connectDB();

    // 1. Create or find Super Admin — driven by environment variables
    const adminEmail    = process.env.WEBHOIST_EMAIL || process.env.SEED_ADMIN_EMAIL;
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Temp@ChangeMe1!";
    const adminName     = process.env.SEED_ADMIN_NAME || "Platform Admin";

    if (!adminEmail) {
      console.warn("⚠️  WEBHOIST_EMAIL not set — skipping superadmin seed");
    } else {
      let admin = await User.findOne({ email: adminEmail });
      if (!admin) {
        admin = await User.create({
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          role: "superadmin",
        });
        console.log(`Created super admin: ${adminEmail}`);
      } else {
        console.log("Super admin already exists");
      }
    }

    // ── SEED ALL TEST ACCOUNTS ──────────────────────────────────
    const accounts = [
      // Staff (admin hierarchy)
      { name: "Admin",          email: "admin@kayad.space",     password: "Admin@Kayad2026!",     role: "admin",             approved: true },
      { name: "HR Manager",     email: "hr@kayad.space",        password: "Hr@Kayad2026!",        role: "hr",                approved: true },
      { name: "Accounts",       email: "accounts@kayad.space",  password: "Acc@Kayad2026!",       role: "accounts",          approved: true },
      { name: "Escrow Officer", email: "escrow@kayad.space",    password: "Escrow@Kayad2026!",    role: "escrow_officer",    approved: true },
      { name: "Marketing",      email: "marketing@kayad.space", password: "Market@Kayad2026!",    role: "marketing",         approved: true },
      { name: "Ad Manager",     email: "ads@kayad.space",       password: "Ads@Kayad2026!",       role: "ad_manager",        approved: true },
      { name: "Tech Support",   email: "support@kayad.space",   password: "Support@Kayad2026!",   role: "technical_support", approved: true },
      { name: "Moderator",      email: "mod@kayad.space",       password: "Mod@Kayad2026!",       role: "moderator",         approved: true },
      // Dealers (approved — can list immediately)
      { name: "Demo Dealer",    email: "dealer@kayad.space",    password: "Dealer@Kayad2026!",    role: "dealer",            approved: true,  businessName: "Kayad Motors Demo",   location: "Nairobi", dealerPackage: "starter",      dealerRating: 4.7 },
      { name: "Elite Dealer",   email: "elite@kayad.space",     password: "Elite@Kayad2026!",     role: "dealer",            approved: true,  businessName: "Elite Auto Nairobi",  location: "Westlands", dealerPackage: "elite",        dealerRating: 4.9 },
      { name: "Pending Dealer", email: "pending@kayad.space",   password: "Pending@Kayad2026!",   role: "dealer",            approved: false, businessName: "NewWheels Ltd",       location: "Mombasa", dealerPackage: "starter" },
      // Sellers (brokers)
      { name: "Demo Seller",    email: "seller@kayad.space",    password: "Seller@Kayad2026!",    role: "broker",            approved: true,  businessName: "Private Seller" },
      // Buyer
      { name: "Demo Buyer",     email: "buyer@kayad.space",     password: "Buyer@Kayad2026!",     role: "user",              approved: true },
    ];

    for (const acc of accounts) {
      let u = await User.findOne({ email: acc.email });
      if (!u) {
        u = await User.create(acc);
        console.log(`✅ Created: ${acc.role.padEnd(18)} ${acc.email}`);
      } else {
        console.log(`⬜ Exists:  ${acc.role.padEnd(18)} ${acc.email}`);
      }
    }

    // Use the first approved dealer for demo cars
    const dealer = await User.findOne({ email: "dealer@kayad.space" });

    // 3. Clear old cars for this dealer and re-seed
    await Car.deleteMany({ dealer: dealer._id });
    const cars = seedCars.map((c) => ({
      ...c,
      dealer: dealer._id,
      status: "active",
      coverImage: 0,
    }));
    const inserted = await Car.insertMany(cars);
    console.log(`\n🚗 Seeded ${inserted.length} cars for ${dealer.businessName}`);
    console.log("\n✅ DEMO READY — all test accounts created.");
    process.exit();
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
};

seed();
