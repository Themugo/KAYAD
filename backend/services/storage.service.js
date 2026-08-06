// backend/services/storage.service.js - Unified Storage Interface v1.0
// ─────────────────────────────────────────────────────────────
// Provides unified interface for image storage (Supabase + Cloudinary)
// Falls back gracefully when services are not configured
// ─────────────────────────────────────────────────────────────

import { logInfo, logError, logWarn } from "../utils/logger.js";
import { getSupabase, isSupabaseConnected } from "../utils/supabase.js";

// =============================
// 🔐 SUPABASE CONFIG
// =============================

const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "kayad-images";

// This module used to create its own second Supabase client here,
// separate from the shared one in utils/supabase.js (different auth
// options, different logging, same env vars). It now reads from the
// single shared client instead. Calls are lazy (resolved at request
// time, not at module-import time) because utils/supabase.js's
// initSupabase() runs during server.js's bootstrap sequence, which
// can happen after this module is first imported - a module-load-time
// client reference here would risk running before that init completes.
const getClient = () => {
  try {
    return isSupabaseConnected() ? getSupabase() : null;
  } catch {
    return null;
  }
};

// =============================
// 🏗️ IMAGE VARIANTS CONFIG
// =============================

const IMAGE_VARIANTS = {
  original: { width: 0, height: 0 },
  full: { width: 1400, height: 900 },
  card: { width: 600, height: 400 },
  thumb: { width: 300, height: 200 },
  mobile: { width: 320, height: 0 },
  tablet: { width: 768, height: 0 },
  desktop: { width: 1200, height: 0 },
  blur: { width: 20, height: 20 },
};

// =============================
// 📤 UPLOAD TO SUPABASE
// =============================

export const uploadToSupabase = async (file, folder = "cars") => {
  const supabaseClient = getClient();
  if (!supabaseClient) {
    throw new Error("Supabase storage not available");
  }

  try {
    const timestamp = Date.now();
    const sanitizedName = file.originalname
      ?.replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_{2,}/g, "_");
    const fileName = `${timestamp}-${sanitizedName || "upload"}`;
    const filePath = `${folder}/${fileName}`;

    // Convert buffer to base64 for upload
    const buffer = file.buffer ? Buffer.from(file.buffer) : null;
    if (!buffer) {
      throw new Error("No file data available");
    }

    const { data, error } = await supabaseClient.storage
      .from(SUPABASE_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.mimetype || "image/jpeg",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(data.path);

    const baseUrl = urlData.publicUrl;

    // Generate variant URLs (Supabase uses transform params)
    const variants = {};
    for (const [name, dims] of Object.entries(IMAGE_VARIANTS)) {
      const params = new URLSearchParams();
      if (dims.width) params.set("width", dims.width.toString());
      if (dims.height) params.set("height", dims.height.toString());
      if (name === "blur") params.set("quality", "10");
      
      const queryString = params.toString();
      variants[name] = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    }

    return {
      public_id: data.path,
      url: baseUrl,
      ...variants,
      format: file.mimetype?.split("/")[1] || "jpg",
      bytes: buffer.length,
      storageId: `supabase:${data.path}`,
      storageProvider: "supabase",
    };
  } catch (err) {
    logError("Supabase upload failed:", err);
    throw err;
  }
};

// =============================
// ❌ DELETE FROM SUPABASE
// =============================

export const deleteFromSupabase = async (publicId) => {
  const supabaseClient = getClient();
  if (!supabaseClient || !publicId) {
    return;
  }

  try {
    const { error } = await supabaseClient.storage
      .from(SUPABASE_BUCKET)
      .remove([publicId]);

    if (error) {
      logWarn("Supabase delete warning:", error.message);
    }
  } catch (err) {
    logError("Supabase delete failed:", err);
  }
};

// =============================
// 🔍 GET PUBLIC URL
// =============================

export const getSupabasePublicUrl = (path) => {
  const supabaseClient = getClient();
  if (!supabaseClient) return null;

  const { data } = supabaseClient.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(path);

  return data?.publicUrl || null;
};

// =============================
// 📊 STORAGE STATUS
// =============================

export const isStorageConnected = () => isSupabaseConnected();

export const getStorageProvider = () =>
  isSupabaseConnected() ? "supabase" : "cloudinary-fallback";

export default {
  uploadToSupabase,
  deleteFromSupabase,
  getSupabasePublicUrl,
  isStorageConnected,
  getStorageProvider,
};
