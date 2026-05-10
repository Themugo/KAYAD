import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// =============================
// 🔐 GENERATE TOKEN
// =============================
const generateToken = (userId, role) => {
  return jwt.sign(
    {
      id: userId,
      role: role || "user",
    },
    process.env.JWT_SECRET || "devsecret",
    { expiresIn: "7d" }
  );
};

// =============================
// 📝 REGISTER
// =============================
export const register = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    console.log("📝 REGISTER HIT:", req.body);

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    email = email.toLowerCase().trim();

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // ❗ DO NOT HASH (model handles it)
    const user = await User.create({
      name,
      email,
      password,
      role: "user",
    });

    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (err) {
    console.error("❌ REGISTER ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Registration failed",
    });
  }
};

// =============================
// 🔑 LOGIN (FINAL STABLE 🔥)
// =============================
export const login = async (req, res) => {
  console.log("🔥 LOGIN HIT:", req.body);

  try {
    let { email, password } = req.body;

    if (!email || !password) {
      console.log("❌ Missing fields");
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    email = email.toLowerCase().trim();

    // =============================
    // 🚀 DEMO LOGIN (ALWAYS WORKS)
    // =============================
    if (email === "demo@giclan.com" && password === "demo123") {
      console.log("🧪 DEMO LOGIN SUCCESS");

      return res.status(200).json({
        success: true,
        token: generateToken("demo-id", "admin"),
        user: {
          id: "demo-id",
          name: "Demo Admin",
          email: "demo@giclan.com",
          role: "admin",
        },
      });
    }

    console.log("➡️ Checking DB user...");

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      console.log("❌ USER NOT FOUND:", email);
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    console.log("✅ USER FOUND");

    if (!user.password) {
      console.log("❌ PASSWORD NOT LOADED");
      return res.status(500).json({
        success: false,
        message: "Password missing",
      });
    }

    console.log("🔐 Comparing password...");

    const isMatch = await bcrypt.compare(password, user.password);

    console.log("MATCH RESULT:", isMatch);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: "Account is banned",
      });
    }

    // update last login safely
    try {
      user.lastLogin = new Date();
      await user.save();
    } catch (e) {
      console.warn("⚠️ lastLogin update failed");
    }

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (err) {
    console.error("❌ LOGIN CRASH:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Login failed",
    });
  }
};

// =============================
// 👤 PROFILE
// =============================
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user,
    });

  } catch (err) {
    console.error("❌ PROFILE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};