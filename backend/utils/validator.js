// utils/validator.js

import { formatPhone } from "./format.js";

// =============================
// 💰 VALIDATE AMOUNT
// =============================
export const isValidAmount = (amount) => {
  const value = Number(amount);

  if (isNaN(value)) return false;

  // ✅ enforce limits (adjust as needed)
  if (value <= 0) return false;
  if (value > 100_000_000) return false; // anti-fraud cap

  return true;
};

// =============================
// 📞 VALIDATE PHONE (KENYA STRICT)
// =============================
export const isValidPhone = (phone) => {
  const formatted = formatPhone(phone);
  return !!formatted; // valid if formatting succeeds
};