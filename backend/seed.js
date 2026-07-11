// backend/seed.js
// Run: node seed.js
// Also exports reseed() for programmatic re-seeding from admin API

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import bcrypt from "bcryptjs";
import { logInfo, logWarn, logError } from "./utils/logger.js";
import { initSupabase, getSupabase } from "./utils/supabase.js";
import { findOne, create, upsert } from "./db/index.js";

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
  { title: "Toyota Land Cruiser V8 2021", make: "Toyota", model: "Land Cruiser V8", year: 2021, price: 8500000, fuel_type: "Diesel", transmission: "Automatic", mileage: 45000, body_type: "SUV", featured: true, status: "available" },
  { title: "Mercedes-Benz GLE 350d 2022", make: "Mercedes-Benz", model: "GLE 350d", year: 2022, price: 12000000, fuel_type: "Diesel", transmission: "Automatic", mileage: 22000, body_type: "SUV", featured: true, status: "available" },
  { title: "BMW X5 M Sport 2020", make: "BMW", model: "X5 M Sport", year: 2020, price: 6200000, fuel_type: "Petrol", transmission: "Automatic", mileage: 38000, body_type: "SUV", featured: false, status: "available" },
  { title: "Subaru Forester XT 2021", make: "Subaru", model: "Forester XT", year: 2021, price: 3800000, fuel_type: "Petrol", transmission: "Automatic", mileage: 28000, body_type: "SUV", featured: false, status: "available" },
  { title: "Nissan X-Trail 2022", make: "Nissan", model: "X-Trail", year: 2022, price: 2900000, fuel_type: "Petrol", transmission: "Automatic", mileage: 18000, body_type: "SUV", featured: false, status: "available" },
  { title: "Mazda CX-5 2023", make: "Mazda", model: "CX-5", year: 2023, price: 4200000, fuel_type: "Petrol", transmission: "Automatic", mileage: 12000, body_type: "SUV", featured: true, status: "available" },
  { title: "Land Rover Range Rover Sport 2020", make: "Land Rover", model: "Range Rover Sport", year: 2020, price: 15000000, fuel_type: "Diesel", transmission: "Automatic", mileage: 35000, body_type: "SUV", featured: true, has_auction: true, status: "available" },
  { title: "Audi A4 2.0 TFSI 2021", make: "Audi", model: "A4 2.0 TFSI", year: 2021, price: 3800000, fuel_type: "Petrol", transmission: "Automatic", mileage: 25000, body_type: "Sedan", featured: false, status: "available" },
  { title: "Lexus ES 350 2022", make: "Lexus", model: "ES 350", year: 2022, price: 5200000, fuel_type: "Petrol", transmission: "Automatic", mileage: 15000, body_type: "Sedan", featured: false, status: "available" },
  { title: "Volkswagen Passat 2021", make: "Volkswagen", model: "Passat", year: 2021, price: 2600000, fuel_type: "Diesel", transmission: "Automatic", mileage: 32000, body_type: "Sedan", featured: false, status: "available" },
  { title: "Honda Accord 2022", make: "Honda", model: "Accord", year: 2022, price: 3100000, fuel_type: "Petrol", transmission: "Automatic", mileage: 20000, body_type: "Sedan", featured: false, status: "available" },
  { title: "Toyota Hilux Double Cabin 2021", make: "Toyota", model: "Hilux Double Cabin", year: 2021, price: 4200000, fuel_type: "Diesel", transmission: "Automatic", mileage: 40000, body_type: "Pickup", featured: true, status: "available" },
];

const connectDB = () => {
  initSupabase();
};

export async function reseed() {
  connectDB();
  const sb = getSupabase();

  const created = { webhost: [], admin: [], demos: [], staff: [], dealers: [], cars: 0 };

  const isProd = process.env.NODE_ENV === "production";
  const { randomBytes } = await import("crypto");
  const devFallback = (label) => {
    if (isProd) throw new Error(`Seed password required via env var (${label}) in production`);
    const pw = randomBytes(16).toString("base64url") + "!A1";
    logWarn(`Generated random dev password for ${label} — set SEED_* env vars for production`);
    return pw;
  };

  // 🚨 CRITICAL: Fail fast in production if using insecure fallback passwords
  const INSECURE_FALLBACK_PATTERNS = ['changeme', 'changeme123', 'demo', 'test', 'password', '123456', 'admin'];
  const validateProductionPassword = (pw, label) => {
    if (!isProd) return;
    const lowerPw = pw.toLowerCase();
    if (INSECURE_FALLBACK_PATTERNS.some(p => lowerPw.includes(p))) {
      throw new Error(`INSECURE: ${label} uses a weak fallback password in production. Set SEED_${label}_PW env var.`);
    }
  };

  const hashPw = (pw) => bcrypt.hashSync(pw, 12);

  // 1. WEBHOST (SUPERADMIN)
  const webhostEmail = process.env.SEED_ADMIN_EMAIL;
  const webhostPassword = hashPw(process.env.SEED_ADMIN_PASSWORD || devFallback("SEED_ADMIN_PASSWORD"));
  const webhostName = process.env.SEED_ADMIN_NAME || "Platform Owner";

  const { OWNER_EMAILS } = await import("./config/owners.js");
  const ownerList = OWNER_EMAILS.length ? OWNER_EMAILS : webhostEmail ? [webhostEmail.toLowerCase()] : [];

  for (const ownerEmail of ownerList) {
    const isPrimary = ownerEmail === (webhostEmail || ownerList[0])?.toLowerCase();
    let pw;
    if (isPrimary) {
      pw = webhostPassword;
      validateProductionPassword(pw, 'SEED_ADMIN_PASSWORD');
    } else {
      pw = hashPw(process.env.SEED_WEBHOST_PW || devFallback("SEED_WEBHOST_PW"));
      validateProductionPassword(process.env.SEED_WEBHOST_PW || '', 'SEED_WEBHOST_PW');
    }
    const name = isPrimary ? webhostName : "KAYAD Webhost";
    try {
      await upsert("users", "email", ownerEmail, {
        name,
        email: ownerEmail,
        password: pw,
        role: "superadmin",
        is_demo: false,
        email_verified: true,
      });
      created.webhost.push(ownerEmail);
    } catch (err) {
      logError("Failed to upsert webhost", { email: ownerEmail, error: err.message });
    }
  }

  // 2. PLATFORM ADMIN
  const adminPw = hashPw(process.env.SEED_ADMIN_PW || process.env.SEED_ADMIN_PASSWORD || devFallback("SEED_ADMIN_PW"));
  await upsert("users", "email", "admin@kayad.space", {
    name: "Platform Admin",
    email: "admin@kayad.space",
    password: adminPw,
    role: "admin",
    email_verified: true,
    must_change_password: true,
  });
  created.admin.push("admin@kayad.space");

  // 3. DEMO ACCOUNTS
  const demos = [
    { name: "Demo Dealer", email: "dealer@kayad.space", password: hashPw(process.env.SEED_DEALER_PW || devFallback("SEED_DEALER_PW")), role: "dealer", business_name: "Kayad Motors Demo" },
    { name: "Demo Seller", email: "seller@kayad.space", password: hashPw(process.env.SEED_SELLER_PW || devFallback("SEED_SELLER_PW")), role: "individual_seller", business_name: "Private Seller" },
    { name: "Demo Buyer", email: "buyer@kayad.space", password: hashPw(process.env.SEED_BUYER_PW || devFallback("SEED_BUYER_PW")), role: "user" },
  ];

  for (const acc of demos) {
    await upsert("users", "email", acc.email, { ...acc, must_change_password: true, email_verified: true });
    created.demos.push(acc.email);
  }

  // Extra dealers
  const extraDealers = [
    { name: "Elite Dealer", email: "elite@kayad.space", password: hashPw(process.env.SEED_ELITE_PW || devFallback("SEED_ELITE_PW")), role: "dealer", business_name: "Elite Motors Kenya" },
    { name: "Pending Dealer", email: "pending@kayad.space", password: hashPw(process.env.SEED_PENDING_PW || devFallback("SEED_PENDING_PW")), role: "dealer", business_name: "New Ventures Ltd", status: "pending" },
  ];

  for (const acc of extraDealers) {
    await upsert("users", "email", acc.email, { ...acc, must_change_password: true, email_verified: true });
    created.dealers.push(acc.email);
  }

  // Staff accounts
  const staffAccounts = [
    { name: "HR Manager", email: "hr@kayad.space", role: "hr" },
    { name: "Accounts Officer", email: "accounts@kayad.space", role: "accounts" },
    { name: "Escrow Officer", email: "escrow@kayad.space", role: "escrow_officer" },
    { name: "Marketing Lead", email: "marketing@kayad.space", role: "marketing" },
    { name: "Ad Manager", email: "ads@kayad.space", role: "ad_manager" },
    { name: "Tech Support", email: "support@kayad.space", role: "technical_support" },
    { name: "Moderator", email: "mod@kayad.space", role: "moderator" },
  ];

  const staffPw = hashPw(process.env.SEED_STAFF_PW || devFallback("SEED_STAFF_PW"));
  for (const acc of staffAccounts) {
    await upsert("users", "email", acc.email, { ...acc, password: staffPw, must_change_password: true, email_verified: true });
    created.staff.push(acc.email);
  }

  // 4. DEMO CARS
  const dealer = await findOne("users", { email: "dealer@kayad.space" });
  if (dealer) {
    await sb.from("cars").delete().eq("dealer_id", dealer.id);
    for (const c of seedCars) {
      const images = eightImages([], seedCars.indexOf(c));
      await create("cars", {
        ...c,
        dealer_id: dealer.id,
        images: images.map((i) => i.url),
        featured_image: images[0]?.url || "",
        views: Math.floor(Math.random() * 2000),
        description: `${c.title} — well maintained, genuine mileage, ready for test drive.`,
        condition: "Excellent",
        color: ["White", "Black", "Silver", "Blue", "Red"][Math.floor(Math.random() * 5)],
        location: "Nairobi, Kenya",
      });
    }
    created.cars = seedCars.length;
  }

  return created;
}

const seed = async () => {
  dotenv.config();
  try {
    connectDB();
    const result = await reseed();
    logInfo("KAYAD — SEED COMPLETE", {
      webhost: result.webhost,
      admin: result.admin,
      demos: result.demos,
      staff: result.staff,
      dealers: result.dealers,
      cars: result.cars,
    });
    process.exit();
  } catch (err) {
    logError("Seed error", err);
    process.exit(1);
  }
};

const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && (path.resolve(process.argv[1]) === __filename || process.argv[1] === path.basename(__filename));
if (isMain) seed();
