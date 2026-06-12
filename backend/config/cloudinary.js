import { v2 as cloudinary } from "cloudinary";

// =============================
// 🔐 CONFIG
// =============================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// =============================
// ⚡ BASE OPTIMIZATION
// =============================
const BASE = [{ fetch_format: "auto" }, { quality: "auto:eco" }, { dpr: "auto" }];

// =============================
// 🎯 TRANSFORMS
// =============================
const T = {
  full: [{ width: 1400, height: 900, crop: "limit" }, ...BASE],

  card: [{ width: 600, height: 400, crop: "fill", gravity: "auto" }, ...BASE],

  thumb: [{ width: 300, height: 200, crop: "fill", gravity: "auto" }, ...BASE],

  blur: [
    { width: 40, height: 30, crop: "fill" },
    { quality: "auto:low" },
    { effect: "blur:1000" },
    { fetch_format: "auto" },
  ],
};

// =============================
// 📤 UPLOAD IMAGE (SAFE)
// =============================
export const uploadImage = async (file, folder = "kayad/cars") => {
  try {
    // 🔥 SUPPORT BOTH MEMORY + DISK
    const uploadOptions = {
      folder,
      resource_type: "image",
      transformation: T.full,

      eager: [T.card, T.thumb],
      eager_async: true,

      invalidate: true,
    };

    let result;

    // memoryStorage (buffer)
    if (file.buffer) {
      result = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(uploadOptions, (err, res) => {
            if (err) reject(err);
            else resolve(res);
          })
          .end(file.buffer);
      });
    } else {
      // diskStorage (file.path)
      result = await cloudinary.uploader.upload(file.path, uploadOptions);
    }

    const publicId = result.public_id;

    return {
      public_id: publicId,

      // 🔥 ALWAYS KEEP THIS
      url: result.secure_url,

      // 🔥 STRUCTURED IMAGES (NEW UI)
      card: cloudinary.url(publicId, { transformation: T.card }),
      thumb: cloudinary.url(publicId, { transformation: T.thumb }),
      blur: cloudinary.url(publicId, { transformation: T.blur }),

      width: result.width,
      height: result.height,
    };
  } catch (err) {
    console.error("❌ CLOUDINARY ERROR:", err);
    throw new Error("Upload failed");
  }
};

// =============================
// 📦 MULTIPLE UPLOAD
// =============================
export const uploadMultiple = async (files, folder) => {
  return Promise.all(files.map((file) => uploadImage(file, folder)));
};

// =============================
// ❌ DELETE
// =============================
export const deleteImage = async (publicId) => {
  try {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
    });
  } catch (err) {
    console.error("❌ DELETE ERROR:", err.message);
  }
};

// =============================
// 🧠 UNIVERSAL IMAGE RESOLVER
// =============================
export const resolveImage = (img) => {
  if (!img) return "/placeholder.jpg";

  // 🔥 NEW FORMAT (object)
  if (typeof img === "object") {
    return img.card || img.url || "/placeholder.jpg";
  }

  // 🔥 OLD FORMAT (string)
  if (typeof img === "string") {
    return img;
  }

  return "/placeholder.jpg";
};

export default cloudinary;
