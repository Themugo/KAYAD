// KAYAD canonical media storage — Supabase Storage only.
// Supabase Storage is the sole active media provider.

import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import { logInfo, logError, logWarn } from "../utils/logger.js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
const PUBLIC_BUCKET = process.env.SUPABASE_PUBLIC_BUCKET || "kayad-images";
const PRIVATE_BUCKET = process.env.SUPABASE_PRIVATE_BUCKET || "kayad-private";

const PLACEHOLDERS = new Set(["", "<project-ref>", "https://<project-ref>.supabase.co", "<supabase-service-role-key>"]);
const configured = (value) => !PLACEHOLDERS.has(String(value || "").trim());

let client = null;
let connected = false;

if (configured(SUPABASE_URL) && configured(SUPABASE_SERVICE_KEY)) {
  try {
    client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    connected = true;
    logInfo("Supabase Storage initialized as canonical media provider");
  } catch (error) {
    logError("Supabase Storage initialization failed", error);
  }
} else {
  logWarn("Supabase Storage not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
}

const requireStorage = () => {
  if (!connected || !client) throw new Error("Supabase Storage is not configured");
  return client;
};

const safeName = (name = "upload") => String(name).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "upload";
const normalizeFolder = (folder = "uploads") => String(folder).replace(/^\/+|\/+$/g, "").replace(/\.\./g, "_");
const bucketFor = (visibility) => visibility === "private" ? PRIVATE_BUCKET : PUBLIC_BUCKET;

const publicUrl = (bucket, path) => {
  const { data } = requireStorage().storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
};

export const createSignedStorageUrl = async (bucket, path, expiresIn = 900) => {
  const { data, error } = await requireStorage().storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl || null;
};

export const uploadBuffer = async (buffer, {
  folder = "uploads",
  fileName = "upload",
  contentType = "application/octet-stream",
  visibility = "public",
  upsert = false,
  expiresIn = 900,
  metadata = {},
} = {}) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error("Upload buffer is empty");
  const bucket = bucketFor(visibility);
  const path = `${normalizeFolder(folder)}/${randomUUID()}-${safeName(fileName)}`;
  const { error } = await requireStorage().storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert,
    cacheControl: visibility === "public" ? "31536000" : "0",
  });
  if (error) throw error;

  const url = visibility === "private"
    ? await createSignedStorageUrl(bucket, path, expiresIn)
    : publicUrl(bucket, path);

  const checksum = createHash("sha256").update(buffer).digest("hex");
  return {
    provider: "supabase",
    storageProvider: "supabase",
    bucket,
    path,
    public_id: path,
    storageId: `supabase:${bucket}/${path}`,
    url,
    thumb: visibility === "public" ? publicUrl(bucket, path) : url,
    contentType,
    bytes: buffer.length,
    checksum,
    visibility,
    metadata,
  };
};

export const uploadFile = async (file, folder = "uploads", options = {}) => {
  const buffer = file?.buffer || (file?.path ? (await import("node:fs/promises")).readFile(file.path) : null);
  if (!buffer) throw new Error("No file data available");
  return uploadBuffer(buffer, {
    folder,
    fileName: file.originalname || file.filename || file.name || "upload",
    contentType: file.mimetype || "application/octet-stream",
    ...options,
  });
};

export const uploadMultiple = async (files, folder, options = {}) =>
  Promise.all((files || []).map((file) => uploadFile(file, folder, options)));

export const deleteMedia = async ({ bucket = PUBLIC_BUCKET, path }) => {
  if (!path) return;
  const { error } = await requireStorage().storage.from(bucket).remove([path]);
  if (error) throw error;
};

export const getStorageProvider = () => "supabase";
export const isStorageConnected = () => connected && Boolean(client);
export const getPublicStorageUrl = (bucket, path) => publicUrl(bucket, path);
export const getPrivateStorageUrl = (path, expiresIn = 900) => createSignedStorageUrl(PRIVATE_BUCKET, path, expiresIn);

export const uploadToSupabase = uploadFile;
export const deleteFromSupabase = async (path) => deleteMedia({ path });
export const getSupabasePublicUrl = (path) => publicUrl(PUBLIC_BUCKET, path);

export default {
  uploadBuffer,
  uploadFile,
  uploadMultiple,
  deleteMedia,
  createSignedStorageUrl,
  getStorageProvider,
  isStorageConnected,
  getPublicStorageUrl,
  getPrivateStorageUrl,
  uploadToSupabase,
  deleteFromSupabase,
  getSupabasePublicUrl,
};
