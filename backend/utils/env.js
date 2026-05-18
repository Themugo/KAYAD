// utils/env.js

// =============================
// 🧠 CORE GETTER
// =============================
export const getEnv = (
  key,
  {
    required = true,
    defaultValue = null,
    type = "string", // string | number | boolean
  } = {}
) => {
  let value = process.env[key];

  // =============================
  // ⚠️ REQUIRED CHECK
  // =============================
  if (!value) {
    if (required && defaultValue === null) {
      throw new Error(`❌ Missing env variable: ${key}`);
    }
    value = defaultValue;
  }

  // =============================
  // 🔄 TYPE PARSING
  // =============================
  if (type === "number") {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`❌ Env ${key} must be a number`);
    }
    return num;
  }

  if (type === "boolean") {
    return value === "true" || value === true;
  }

  return value;
};