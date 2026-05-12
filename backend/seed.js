// backend/seed.js
// Run: node seed.js <admin-email>
// Example: node seed.js admin@gari.com

import mongoose from "mongoose";
import dotenv from "dotenv";
import Car from "./models/Car.js";
import User from "./models/User.js";

dotenv.config();

const ADMIN_EMAIL = process.argv[2];

// =============================
// 🚗 SAMPLE DATA
// =============================
const IMG = (u) => ({ url: u, thumb: u, public_id: "" });

const seedCars = [
  { title:"Toyota Land Cruiser V8 2021", brand:"Toyota", year:2021, price:8500000, fuel:"Diesel", transmission:"Automatic", mileage:45000, bodyType:"SUV", location:{city:"Nairobi"}, views:1842, isPromoted:true, isVerifiedDealer:true, allowBid:true, allowBuy:true, auctionStatus:"live", auctionEnd:new Date(Date.now()+3*86400000).toISOString(), bidsCount:14, currentBid:3200000, dealRating:"great", images:[ IMG("https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?w=600&h=400&fit=crop"), IMG("https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&h=400&fit=crop") ] },
  { title:"Mercedes-Benz GLE 350d 2022", brand:"Mercedes", year:2022, price:12000000, fuel:"Diesel", transmission:"Automatic", mileage:22000, bodyType:"SUV", location:{city:"Nairobi"}, views:2103, isPromoted:true, isVerifiedDealer:true, allowBid:false, allowBuy:true, auctionStatus:"ended", dealRating:"fair", images:[ IMG("https://images.unsplash.com/photo-1618843479313-40f8afb4b4d1?w=600&h=400&fit=crop"), IMG("https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=600&h=400&fit=crop") ] },
  { title:"BMW X5 M Sport 2020", brand:"BMW", year:2020, price:6200000, fuel:"Petrol", transmission:"Automatic", mileage:38000, bodyType:"SUV", location:{city:"Mombasa"}, views:1567, isPromoted:false, isVerifiedDealer:true, allowBid:true, allowBuy:false, auctionStatus:"live", auctionEnd:new Date(Date.now()+1.5*86400000).toISOString(), bidsCount:8, currentBid:4100000, dealRating:"great", images:[ IMG("https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&h=400&fit=crop"), IMG("https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&h=400&fit=crop") ] },
  { title:"Subaru Forester XT 2021", brand:"Subaru", year:2021, price:3800000, fuel:"Petrol", transmission:"Automatic", mileage:28000, bodyType:"SUV", location:{city:"Nairobi"}, views:982, isPromoted:false, isVerifiedDealer:true, allowBid:true, allowBuy:true, auctionStatus:"live", auctionEnd:new Date(Date.now()+0.5*86400000).toISOString(), bidsCount:3, currentBid:2850000, dealRating:"good", images:[ IMG("https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&h=400&fit=crop"), IMG("https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop") ] },
  { title:"Nissan X-Trail 2022", brand:"Nissan", year:2022, price:2900000, fuel:"Petrol", transmission:"Automatic", mileage:18000, bodyType:"SUV", location:{city:"Nakuru"}, views:734, isPromoted:false, isVerifiedDealer:false, allowBid:false, allowBuy:true, auctionStatus:"draft", currentBid:0, dealRating:"good", images:[ IMG("https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600&h=400&fit=crop"), IMG("https://images.unsplash.com/photo-1533928298208-27ff66555d8d?w=600&h=400&fit=crop") ] },
  { title:"Mazda CX-5 2023", brand:"Mazda", year:2023, price:4200000, fuel:"Petrol", transmission:"Automatic", mileage:12000, bodyType:"SUV", location:{city:"Nairobi"}, views:1289, isPromoted:true, isVerifiedDealer:true, allowBid:true, allowBuy:true, auctionStatus:"live", auctionEnd:new Date(Date.now()+2*86400000).toISOString(), bidsCount:5, currentBid:3600000, dealRating:"great", images:[ IMG("https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&h=400&fit=crop"), IMG("https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&h=400&fit=crop") ] },
  { title:"Land Rover Range Rover Sport 2020", brand:"Land Rover", year:2020, price:15000000, fuel:"Diesel", transmission:"Automatic", mileage:35000, bodyType:"SUV", location:{city:"Nairobi"}, views:3210, isPromoted:true, isVerifiedDealer:true, allowBid:false, allowBuy:true, auctionStatus:"ended", currentBid:0, dealRating:"overpriced", images:[ IMG("https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&h=400&fit=crop"), IMG("https://images.unsplash.com/photo-1607016284316-6e1019c28e23?w=600&h=400&fit=crop") ] },
  { title:"Audi A4 2.0 TFSI 2021", brand:"Audi", year:2021, price:3800000, fuel:"Petrol", transmission:"Automatic", mileage:25000, bodyType:"Sedan", location:{city:"Nairobi"}, views:876, isPromoted:false, isVerifiedDealer:true, allowBid:false, allowBuy:true, auctionStatus:"draft", currentBid:0, dealRating:"good", images:[ IMG("https://images.unsplash.com/photo-1603584173870-7f23fd4c2b4b?w=600&h=400&fit=crop"), IMG("https://images.unsplash.com/photo-1606664444110-0c1e1e84b8fe?w=600&h=400&fit=crop") ] },
  { title:"Lexus ES 350 2022", brand:"Lexus", year:2022, price:5200000, fuel:"Petrol", transmission:"Automatic", mileage:15000, bodyType:"Sedan", location:{city:"Mombasa"}, views:654, isPromoted:false, isVerifiedDealer:true, allowBid:true, allowBuy:true, auctionStatus:"live", auctionEnd:new Date(Date.now()+4*86400000).toISOString(), bidsCount:2, currentBid:6200000, dealRating:"fair", images:[ IMG("https://images.unsplash.com/photo-1511919886926-f7fb7d0c6e2c?w=600&h=400&fit=crop"), IMG("https://images.unsplash.com/photo-1581540222194-0def2dda95b8?w=600&h=400&fit=crop") ] },
  { title:"Volkswagen Passat 2021", brand:"Volkswagen", year:2021, price:2600000, fuel:"Diesel", transmission:"Automatic", mileage:32000, bodyType:"Sedan", location:{city:"Eldoret"}, views:521, isPromoted:false, isVerifiedDealer:false, allowBid:false, allowBuy:true, auctionStatus:"ended", currentBid:0, dealRating:"great", images:[ IMG("https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600&h=400&fit=crop"), IMG("https://images.unsplash.com/photo-1570733117311-d990c3816c47?w=600&h=400&fit=crop") ] },
  { title:"Honda Accord 2022", brand:"Honda", year:2022, price:3100000, fuel:"Petrol", transmission:"Automatic", mileage:20000, bodyType:"Sedan", location:{city:"Nairobi"}, views:445, isPromoted:false, isVerifiedDealer:false, allowBid:false, allowBuy:true, auctionStatus:"draft", currentBid:0, dealRating:"good", images:[ IMG("https://images.unsplash.com/photo-1605816988069-b11383b5076e?w=600&h=400&fit=crop"), IMG("https://images.unsplash.com/photo-1590362891991-f776e747a588?w=600&h=400&fit=crop") ] },
  { title:"Toyota Hilux Double Cabin 2021", brand:"Toyota", year:2021, price:4200000, fuel:"Diesel", transmission:"Automatic", mileage:40000, bodyType:"Pickup", location:{city:"Nairobi"}, views:1678, isPromoted:true, isVerifiedDealer:true, allowBid:true, allowBuy:true, auctionStatus:"live", auctionEnd:new Date(Date.now()+1*86400000).toISOString(), bidsCount:10, currentBid:3100000, dealRating:"great", images:[ IMG("https://images.unsplash.com/photo-1583267746897-3e42c7e14754?w=600&h=400&fit=crop"), IMG("https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=600&h=400&fit=crop") ] },
];

// =============================
// 🗄 CONNECT DB
// =============================
const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("DB connected for seeding");
};

// =============================
// 🌱 IMPORT DATA
// =============================
const importData = async () => {
  try {
    if (!ADMIN_EMAIL) {
      console.log("Usage: node seed.js <admin-email>");
      console.log("Example: node seed.js admin@gari.com");
      process.exit(1);
    }

    const admin = await User.findOne({ email: ADMIN_EMAIL });
    if (!admin) {
      console.log(`Admin user not found: ${ADMIN_EMAIL}`);
      console.log("Make sure the user exists and has role 'admin' or 'superadmin'");
      process.exit(1);
    }

    // Clear existing cars linked to this admin
    await Car.deleteMany({ dealer: admin._id });

    // Insert cars with dealer linked to admin
    const cars = seedCars.map((c, i) => ({
      ...c,
      dealer: admin._id,
      status: "active",
    }));

    const inserted = await Car.insertMany(cars);
    console.log(`Seeded ${inserted.length} cars linked to ${admin.name} (${admin.email})`);
    process.exit();
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
};

// =============================
// 🗑 DELETE DATA
// =============================
const destroyData = async () => {
  try {
    if (!ADMIN_EMAIL) {
      console.log("Usage: node seed.js -d <admin-email>");
      process.exit(1);
    }
    const admin = await User.findOne({ email: ADMIN_EMAIL });
    if (admin) {
      const r = await Car.deleteMany({ dealer: admin._id });
      console.log(`Deleted ${r.deletedCount} cars for ${ADMIN_EMAIL}`);
    }
    process.exit();
  } catch (err) {
    console.error("Delete error:", err);
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
