import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: true, // disable in production later if needed
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

  } catch (err) {
    console.error("❌ DB CONNECTION ERROR:", err.message);
    process.exit(1);
  }
};

// =============================
// 🔄 CONNECTION EVENTS (IMPORTANT)
// =============================
mongoose.connection.on("connected", () => {
  console.log("📡 Mongoose connected");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ Mongoose error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected");
});

// =============================
// 🧠 GRACEFUL SHUTDOWN
// =============================
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("🔴 MongoDB connection closed (app terminated)");
  process.exit(0);
});

export default connectDB;