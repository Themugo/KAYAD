import cloudinary from "../config/cloudinary.js";
import fs from "fs";

// =============================
// 📦 UPLOAD IMAGE (OPTIMIZED)
// =============================
export const uploadToCloudinary = async (filePath) => {
  try {
    const res = await cloudinary.uploader.upload(filePath, {
      folder: "giclan/cars",
      resource_type: "image",
      transformation: [
        { width: 1200, height: 800, crop: "limit" }, // resize
        { quality: "auto" }, // optimize
        { fetch_format: "auto" }, // webp/avif
      ],
    });

    // 🧹 cleanup local file
    fs.unlinkSync(filePath);

    return {
      url: res.secure_url,
      public_id: res.public_id,
      width: res.width,
      height: res.height,
    };
  } catch (err) {
    console.error("❌ CLOUDINARY ERROR:", err.message);
    throw err;
  }
};