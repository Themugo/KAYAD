// utils/format.js

// =============================
// 📞 FORMAT PHONE (KENYA - STRICT)
// =============================
export const formatPhone = (phone) => {
  if (!phone) return null;

  phone = phone.toString().replace(/\s+/g, "");

  if (phone.startsWith("0")) phone = "254" + phone.slice(1);
  if (phone.startsWith("+254")) phone = phone.slice(1);

  // ✅ VALIDATE (Kenya numbers: 2547 or 2541 + 8 digits)
  if (!/^254(7|1)\d{8}$/.test(phone)) {
    return null;
  }

  return phone;
};

// =============================
// 💰 FORMAT CURRENCY (KES)
// =============================
export const formatCurrency = (amount) => {
  const value = Number(amount);

  if (isNaN(value)) return "KES 0.00";

  return `KES ${value.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// =============================
// 🕒 FORMAT DATE (CONSISTENT)
// =============================
export const formatDate = (date) => {
  if (!date) return null;

  return new Date(date).toLocaleString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// =============================
// ⏱ FORMAT TIME AGO (UX BOOST)
// =============================
export const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hrs ago`;

  return `${Math.floor(seconds / 86400)} days ago`;
};