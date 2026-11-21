// Chat attachment security boundary.
//
// Threat model (verified against the code, see docs/audits/03-*):
//  * `POST /api/upload` used to store folder=chat uploads as PUBLIC Cloudinary assets and hand back a permanent
//    delivery URL; `POST /api/chat/:id/message` persisted ANY client-supplied URL string and echoed it to the
//    other participant and over Socket.IO. An asset URL is a bearer token: anyone who learns it can read the file
//    forever, whether or not they are (still) in the conversation, and an attacker could plant arbitrary URLs
//    (tracking pixels, `javascript:` links) in a conversation.
//
// Design:
//  * A message attachment is a *reference*: { uploadId, type:"image", fileName, mimeType, size }. No URL is stored.
//  * The sender may only reference an upload they own, from the private `chat` folder, that is an image.
//  * Readers get a same-origin, cookie-authenticated path `/api/chat/:chatId/attachments/:uploadId`. Every request
//    re-checks, against the database, that the caller is a participant of THAT chat and that THAT chat's messages
//    reference the upload — so leaving a conversation (or an upload being detached/deleted) ends access immediately.
//  * Bytes are served from the authoritative upload store, or by redirecting to a Cloudinary *authenticated* download
//    URL that expires in minutes. Nothing public, nothing permanent.
//  * Legacy `{url}` attachments (already persisted before this change) are never rewritten or deleted; on output they
//    are restricted to http(s) URLs and flagged `legacy: true` (see docs/audits/03 for the migration plan).

import { getUploadRecord } from "./sqlUploadStore.js";

export const CHAT_UPLOAD_FOLDER = "chat";
export const CHAT_ATTACHMENT_TYPES = new Set(["image"]);
export const CHAT_ATTACHMENT_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_CHAT_ATTACHMENTS = 10;
export const ATTACHMENT_URL_TTL_SECONDS = 120;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `kayad/chat`, `chat`, `kayad/chat/` -> `chat` (records store the Cloudinary folder path, routes use the bare name). */
export const bareFolder = (folder) => String(folder || "").replace(/^\/+|\/+$/g, "").replace(/^kayad\//, "");

export const parseMetadata = (record) => {
  if (!record?.metadata) return {};
  if (typeof record.metadata === "object") return record.metadata;
  try { return JSON.parse(record.metadata); } catch { return {}; }
};

export class AttachmentError extends Error {
  constructor(message, code = "CHAT_ATTACHMENTS_INVALID", status = 400) { super(message); this.code = code; this.status = status; }
}

/**
 * Validate the attachments a sender wants to attach and return the canonical stored form.
 * Throws AttachmentError for anything that is not an upload the sender owns in the private chat folder.
 */
export const normalizeIncomingAttachments = (raw, senderId, { lookup = getUploadRecord } = {}) => {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new AttachmentError("attachments must be an array");
  if (raw.length > MAX_CHAT_ATTACHMENTS) throw new AttachmentError(`At most ${MAX_CHAT_ATTACHMENTS} attachments per message`);
  const seen = new Set();
  return raw.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new AttachmentError("Attach files by upload id; arbitrary URLs are not accepted");
    }
    const uploadId = item.uploadId ?? item.storageId;
    if (typeof uploadId !== "string" || !UUID_RE.test(uploadId)) {
      throw new AttachmentError("Attach files by upload id; arbitrary URLs are not accepted");
    }
    if (seen.has(uploadId)) throw new AttachmentError("Duplicate attachment");
    seen.add(uploadId);
    const type = item.type === undefined ? "image" : item.type;
    if (!CHAT_ATTACHMENT_TYPES.has(type)) throw new AttachmentError("Unsupported attachment type");
    const record = lookup(uploadId);
    // Same answer for "does not exist" and "belongs to someone else": no oracle for other users' upload ids.
    if (!record || !senderId || String(record.userId || "") !== String(senderId)) {
      throw new AttachmentError("Attachment not found or not yours", "CHAT_ATTACHMENT_FORBIDDEN", 403);
    }
    if (bareFolder(record.folder) !== CHAT_UPLOAD_FOLDER) {
      throw new AttachmentError("Only files uploaded to the chat folder can be attached", "CHAT_ATTACHMENT_FORBIDDEN", 403);
    }
    if (!CHAT_ATTACHMENT_MIME.has(String(record.mimeType || "").toLowerCase())) {
      throw new AttachmentError("Unsupported file type");
    }
    return {
      uploadId,
      type: "image",
      fileName: String(record.originalName || "image").slice(0, 120),
      mimeType: String(record.mimeType).toLowerCase(),
      size: Number(record.size) || null,
      // Server-side storage coordinates, kept so delivery survives loss of the local upload record (ephemeral disk on redeploy).
      // They are NOT a URL and are never returned to clients (see presentAttachments).
      provider: record.provider || null,
      publicId: record.publicId || parseMetadata(record).publicId || null,
    };
  });
};

const safeLegacyUrl = (value) => {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" ? u.toString() : null; // never javascript:, data:, file:, http:
  } catch { return null; }
};

/** Output form for API responses and socket events. Never exposes a storage/CDN URL for referenced uploads. */
export const presentAttachments = (chatId, attachments) => {
  if (!Array.isArray(attachments)) return [];
  return attachments.map((att) => {
    if (typeof att === "string") { const url = safeLegacyUrl(att); return url ? { type: "image", url, legacy: true } : { type: "unavailable", legacy: true }; }
    if (!att || typeof att !== "object") return { type: "unavailable" };
    if (typeof att.uploadId === "string" && UUID_RE.test(att.uploadId)) {
      return {
        uploadId: att.uploadId,
        type: att.type || "image",
        fileName: att.fileName || null,
        mimeType: att.mimeType || null,
        size: att.size ?? null,
        url: `/api/chat/${chatId}/attachments/${att.uploadId}`,
      };
    }
    const url = safeLegacyUrl(att.url);
    return url
      ? { type: att.type || "image", url, fileName: att.fileName, legacy: true }
      : { type: "unavailable", legacy: true };
  });
};

export const presentMessage = (chatId, message) => (message && typeof message === "object"
  ? { ...message, attachments: presentAttachments(chatId, message.attachments) }
  : message);

/** The stored attachment entry for an upload id within one chat (undefined when the chat does not reference it). */
export const findChatAttachment = (chat, uploadId) => {
  for (const m of Array.isArray(chat?.messages) ? chat.messages : []) {
    for (const a of Array.isArray(m?.attachments) ? m.attachments : []) {
      if (a && typeof a === "object" && a.uploadId === uploadId) return a;
    }
  }
  return undefined;
};

/** Does any message in this chat reference the upload? (binding between an upload and ONE conversation) */
export const chatReferencesUpload = (chat, uploadId) =>
  (Array.isArray(chat?.messages) ? chat.messages : []).some((m) =>
    Array.isArray(m?.attachments) && m.attachments.some((a) => a && typeof a === "object" && a.uploadId === uploadId));

/** Declared image types must start with the right magic bytes (webp: RIFF....WEBP). */
export const hasImageSignature = (buffer, mimetype) => {
  if (!buffer || buffer.length < 12) return false;
  const b = Buffer.from(buffer.subarray(0, 12));
  switch (String(mimetype).toLowerCase()) {
    case "image/jpeg": return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "image/png": return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/webp": return b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP";
    default: return false;
  }
};
