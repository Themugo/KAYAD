// backend/middleware/validate.js

import mongoose from "mongoose";

// =============================
// 🧠 HELPER: ERROR RESPONSE
// =============================
const badRequest = (res, message, req) => {
  console.warn("🚫 VALIDATION FAILED:", {
    message,
    path: req.originalUrl,
    requestId: req.requestId,
  });

  return res.status(400).json({
    success: false,
    message,
  });
};

// =============================
// 📞 NORMALIZE + VALIDATE PHONE (KE)
// =============================
export const normalizePhone = (phone) => {
  if (!phone) return null;

  phone = phone.toString().replace(/\s+/g, "");

  if (phone.startsWith("0")) return "254" + phone.slice(1);
  if (phone.startsWith("+254")) return phone.replace("+", "");
  if (phone.startsWith("254")) return phone;

  return null;
};

const isValidPhone = (phone) => {
  const formatted = normalizePhone(phone);
  return formatted && /^254(7|1)\d{8}$/.test(formatted);
};

// =============================
// 🔢 VALID NUMBER
// =============================
const isValidNumber = (val) => {
  return typeof val !== "undefined" && !isNaN(val) && Number(val) > 0;
};

// =============================
// 🚗 VALIDATE CAR
// =============================
export const validateCar = (req, res, next) => {
  let { title, price, brand } = req.body;

  title = title?.toString().trim();
  brand = brand?.toString().trim();
  price = Number(price);

  if (!title || title.length < 3) {
    return badRequest(res, "Car title must be at least 3 characters", req);
  }

  if (!brand || brand.length < 2) {
    return badRequest(res, "Brand is required", req);
  }

  if (!isValidNumber(price)) {
    return badRequest(res, "Valid price required", req);
  }

  // ✅ sanitize
  req.body.title = title;
  req.body.brand = brand;
  req.body.price = price;

  next();
};

// =============================
// 💰 VALIDATE BID
// =============================
export const validateBid = (req, res, next) => {
  let { amount, phone } = req.body;

  amount = Number(amount);

  if (!isValidNumber(amount)) {
    return badRequest(res, "Invalid bid amount", req);
  }

  if (!isValidPhone(phone)) {
    return badRequest(res, "Invalid Kenyan phone number", req);
  }

  req.body.amount = amount;
  req.body.phone = normalizePhone(phone);

  next();
};

// =============================
// 🔐 VALIDATE AUTH
// =============================
export const validateAuth = (req, res, next) => {
  let { email, password, name } = req.body;

  email = email?.toString().trim().toLowerCase();
  name = name?.toString().trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    return badRequest(res, "Valid email required", req);
  }

  if (!password || password.length < 6) {
    return badRequest(res, "Password must be at least 6 characters", req);
  }

  if (req.path.includes("register")) {
    if (!name || name.length < 2) {
      return badRequest(res, "Name must be at least 2 characters", req);
    }
  }

  req.body.email = email;
  if (name) req.body.name = name;

  next();
};

// =============================
// 💳 VALIDATE PAYMENT
// =============================
export const validatePayment = (req, res, next) => {
  let { phone, amount } = req.body;

  amount = Number(amount);

  if (!isValidPhone(phone)) {
    return badRequest(res, "Invalid phone number", req);
  }

  if (!isValidNumber(amount)) {
    return badRequest(res, "Invalid amount", req);
  }

  req.body.phone = normalizePhone(phone);
  req.body.amount = amount;

  next();
};

// =============================
// 🆔 VALIDATE OBJECT ID
// =============================
export const validateObjectId = (req, res, next) => {
  const id = req.params.id || req.params.carId;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return badRequest(res, "Invalid ID", req);
  }

  next();
};