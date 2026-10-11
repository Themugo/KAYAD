// Unit tests (pure functions, injected lookup) for the chat attachment boundary. No network, no DB.
import { describe, it, expect } from "@jest/globals";
import { normalizeIncomingAttachments, presentAttachments, chatReferencesUpload, hasImageSignature, bareFolder, AttachmentError } from "../../services/chatAttachments.js";

const U1 = "11111111-1111-4111-8111-111111111111", U2 = "22222222-2222-4222-8222-222222222222";
const rec = (o = {}) => ({ id: U1, userId: "alice", folder: "kayad/chat", mimeType: "image/png", size: 10, originalName: "a.png", ...o });
const lookup = (r) => () => r;

describe("normalizeIncomingAttachments", () => {
  it("accepts an owned chat image and stores a reference only", () => {
    expect(normalizeIncomingAttachments([{ uploadId: U1 }], "alice", { lookup: lookup(rec()) })).toEqual([{ uploadId: U1, type: "image", fileName: "a.png", mimeType: "image/png", size: 10, provider: null, publicId: null }]);
  });
  it.each([["url object", [{ url: "https://x.test/a.png" }]], ["string", ["https://x.test/a.png"]], ["bad id", [{ uploadId: "x" }]], ["non-array", "x"]])("rejects %s", (_n, v) => {
    expect(() => normalizeIncomingAttachments(v, "alice", { lookup: lookup(rec()) })).toThrow(AttachmentError);
  });
  it("rejects other user's upload and missing upload with the same 403", () => {
    for (const r of [rec({ userId: "bob" }), null]) {
      try { normalizeIncomingAttachments([{ uploadId: U1 }], "alice", { lookup: lookup(r) }); throw new Error("no throw"); } catch (e) { expect(e.status).toBe(403); expect(e.code).toBe("CHAT_ATTACHMENT_FORBIDDEN"); }
    }
  });
  it("rejects non-chat folder (e.g. a vehicle image), non-image MIME, duplicates and >10", () => {
    expect(() => normalizeIncomingAttachments([{ uploadId: U1 }], "alice", { lookup: lookup(rec({ folder: "kayad/vehicles" })) })).toThrow(/chat folder/);
    expect(() => normalizeIncomingAttachments([{ uploadId: U1 }], "alice", { lookup: lookup(rec({ mimeType: "text/html" })) })).toThrow(/Unsupported/);
    expect(() => normalizeIncomingAttachments([{ uploadId: U1 }, { uploadId: U1 }], "alice", { lookup: lookup(rec()) })).toThrow(/Duplicate/);
    expect(() => normalizeIncomingAttachments(Array.from({ length: 11 }, (_, i) => ({ uploadId: `${i}`.padStart(8, "0") + U2.slice(8) })), "alice", { lookup: lookup(rec()) })).toThrow(/At most/);
  });
  it("treats empty/undefined as no attachments", () => {
    expect(normalizeIncomingAttachments(undefined, "alice")).toEqual([]);
  });
});

describe("presentAttachments", () => {
  it("never emits a storage URL or storage coordinates for references", () => {
    const out = presentAttachments("c1", [{ uploadId: U1, type: "image", url: "https://res.cloudinary.com/x", provider: "cloudinary", publicId: "kayad/chat/p" }]);
    expect(out[0].url).toBe(`/api/chat/c1/attachments/${U1}`);
    expect(JSON.stringify(out)).not.toMatch(/cloudinary|kayad\/chat\/p/);
  });
  it("neutralises unsafe legacy URLs but keeps https legacy ones flagged", () => {
    const out = presentAttachments("c1", ["http://a.test/x.png", { url: "javascript:alert(1)" }, { url: "https://a.test/x.png" }, null]);
    expect(out.map((o) => o.type)).toEqual(["unavailable", "unavailable", "image", "unavailable"]);
    expect(out[2].legacy).toBe(true);
  });
});

describe("helpers", () => {
  it("chatReferencesUpload binds an upload to the chat that references it", () => {
    expect(chatReferencesUpload({ messages: [{ attachments: [{ uploadId: U1 }] }] }, U1)).toBe(true);
    expect(chatReferencesUpload({ messages: [{ attachments: [{ uploadId: U2 }] }] }, U1)).toBe(false);
    expect(chatReferencesUpload({ messages: [{ attachments: ["https://x"] }] }, U1)).toBe(false);
  });
  it("bareFolder normalises Cloudinary folder paths", () => { expect(bareFolder("kayad/chat")).toBe("chat"); expect(bareFolder("/chat/")).toBe("chat"); expect(bareFolder("kayad/vehicles")).toBe("vehicles"); });
  it("hasImageSignature checks real magic bytes", () => {
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8)]);
    expect(hasImageSignature(png, "image/png")).toBe(true); expect(hasImageSignature(png, "image/jpeg")).toBe(false);
    expect(hasImageSignature(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]), "image/webp")).toBe(true);
    expect(hasImageSignature(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("AVI ")]), "image/webp")).toBe(false);
    expect(hasImageSignature(Buffer.from("<html></html>"), "image/png")).toBe(false);
  });
});
