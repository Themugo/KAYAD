import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const backendRoot = process.cwd();
const dataDir = path.join(backendRoot, "data");
const dbPath = path.join(dataDir, "uploads.sqlite");
const uploadsDir = path.join(backendRoot, "uploads");

mkdirSync(dataDir, { recursive: true });

let dbInstance = null;
let initialized = false;

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".json": "application/json",
  ".csv": "text/csv",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const initializeStore = () => {
  if (initialized && dbInstance) return dbInstance;

  dbInstance = new DatabaseSync(dbPath);
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      originalName TEXT,
      mimeType TEXT,
      size INTEGER,
      folder TEXT,
      provider TEXT,
      storagePath TEXT,
      publicId TEXT,
      url TEXT,
      thumb TEXT,
      metadata TEXT,
      createdAt TEXT,
      userId TEXT,
      checksum TEXT,
      content BLOB
    );
  `);
  dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_uploads_publicId ON uploads(publicId);`);
  dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_uploads_folder ON uploads(folder);`);

  initialized = true;
  return dbInstance;
};

const ensureLegacyImport = () => {
  if (!existsSync(uploadsDir)) return;

  const db = initializeStore();
  const existing = new Set(
    db
      .prepare("SELECT storagePath FROM uploads WHERE storagePath IS NOT NULL")
      .all()
      .map((row) => row.storagePath),
  );

  for (const entry of readdirSync(uploadsDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const absolutePath = path.join(uploadsDir, entry.name);
    const relativePath = path.relative(backendRoot, absolutePath).replace(/\\/g, "/");
    if (existing.has(relativePath)) continue;

    try {
      const buffer = readFileSync(absolutePath);
      const ext = path.extname(entry.name).toLowerCase();
      const mimeType = MIME_BY_EXT[ext] || "application/octet-stream";
      createUploadRecord({
        originalName: entry.name,
        mimeType,
        size: statSync(absolutePath).size,
        folder: "legacy",
        provider: "filesystem",
        storagePath: relativePath,
        url: `/uploads/${entry.name}`,
        thumb: `/uploads/${entry.name}`,
        content: buffer,
        metadata: { importedFrom: "legacy-uploads-directory" },
      });
    } catch (error) {
      console.warn(`Unable to import legacy upload ${entry.name}: ${error.message}`);
    }
  }
};

export const initializeUploadStore = () => {
  const db = initializeStore();
  ensureLegacyImport();
  return db;
};

export const createUploadRecord = (payload = {}) => {
  const db = initializeStore();
  const id = payload.id || randomUUID();
  const createdAt = payload.createdAt || new Date().toISOString();
  const content = payload.content ?? null;
  const checksum = content ? createHash("sha256").update(content).digest("hex") : payload.checksum || null;

  db.prepare(`
    INSERT INTO uploads (
      id,
      originalName,
      mimeType,
      size,
      folder,
      provider,
      storagePath,
      publicId,
      url,
      thumb,
      metadata,
      createdAt,
      userId,
      checksum,
      content
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    payload.originalName || null,
    payload.mimeType || null,
    payload.size || null,
    payload.folder || null,
    payload.provider || "cloudinary",
    payload.storagePath || null,
    payload.publicId || null,
    payload.url || null,
    payload.thumb || null,
    payload.metadata ? JSON.stringify(payload.metadata) : null,
    createdAt,
    payload.userId || null,
    checksum,
    content,
  );

  return { id, ...payload, checksum, createdAt };
};

export const getUploadRecord = (id) => {
  const db = initializeStore();
  const record = db.prepare("SELECT * FROM uploads WHERE id = ?").get(id);
  return record || null;
};

export const getUploadRecordByPublicId = (publicId) => {
  const db = initializeStore();
  const record = db.prepare("SELECT * FROM uploads WHERE publicId = ?").get(publicId);
  return record || null;
};

export const deleteUploadRecord = (publicId) => {
  const db = initializeStore();
  if (!publicId) return 0;
  const result = db.prepare("DELETE FROM uploads WHERE publicId = ?").run(publicId);
  return result.changes;
};

initializeUploadStore();

export default initializeUploadStore;
