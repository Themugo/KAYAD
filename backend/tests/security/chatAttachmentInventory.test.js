// Unit tests (pure, no network/DB) for the legacy chat-attachment inventory classifier.
import { describe, it, expect } from "@jest/globals";
import { parseCloudinaryUrl, classifyAttachment, buildInventory } from "../../services/chatAttachmentInventory.js";

const U = "11111111-1111-4111-8111-111111111111";
const pub = (id, ext = "png", t = "upload", pre = "v1712345678") => `https://res.cloudinary.com/demo/image/${t}/${pre}/${id}.${ext}`;

describe("parseCloudinaryUrl", () => {
  it("strips version, transformation and signature segments and the extension", () => {
    expect(parseCloudinaryUrl(pub("kayad/chat/abc"))).toEqual({ cloud: "demo", deliveryType: "upload", publicId: "kayad/chat/abc" });
    expect(parseCloudinaryUrl("https://res.cloudinary.com/demo/image/upload/c_fill,w_200/q_auto/v1/kayad/chat/x.webp").publicId).toBe("kayad/chat/x");
    expect(parseCloudinaryUrl("https://res.cloudinary.com/demo/image/authenticated/s--AbC123--/kayad/chat/y.jpg")).toMatchObject({ deliveryType: "authenticated", publicId: "kayad/chat/y" });
    expect(parseCloudinaryUrl("https://example.com/a.png")).toBeNull();
  });
});

describe("classifyAttachment", () => {
  it.each([
    [{ uploadId: U }, "reference"],
    [{ url: pub("kayad/chat/abc") }, "legacy_public_chat"],
    [pub("kayad/chat/abc"), "legacy_public_chat"],
    [{ url: pub("kayad/chat/abc", "jpg", "authenticated", "s--sig--") }, "legacy_authenticated"],
    [{ url: pub("kayad/cars/car1") }, "legacy_public_other"],
    [{ url: "https://tracker.example/p.gif" }, "legacy_external"],
    [{ url: "http://insecure.example/x.png" }, "legacy_unsafe"],
    [{ url: "javascript:alert(1)" }, "legacy_unsafe"],
    [null, "legacy_unsafe"],
  ])("%j -> %s", (att, cls) => { expect(classifyAttachment(att).class).toBe(cls); });
});

describe("buildInventory", () => {
  const chats = [
    { id: "c1", messages: [{ text: "SECRET TEXT", attachments: [{ url: pub("kayad/chat/a") }, { uploadId: U }] }, { attachments: [pub("kayad/chat/a")] }] },
    { id: "c2", messages: [{ attachments: [{ url: pub("kayad/chat/shared") }, { url: pub("kayad/cars/car1") }, { url: "https://x.example/p.png" }] }] },
  ];
  const cars = [{ id: "car", images: [pub("kayad/chat/shared"), { public_id: "kayad/cars/car1" }] }];
  const inv = buildInventory(chats, cars);
  it("counts every attachment by class", () => {
    expect(inv.counts).toEqual({ legacy_public_chat: 3, reference: 1, legacy_public_other: 1, legacy_external: 1 });
  });
  it("candidates are only kayad/chat public assets not used by a vehicle listing; shared ones are excluded with a reason", () => {
    expect(inv.candidates).toEqual([{ publicId: "kayad/chat/a", cloud: "demo", chats: 1, messages: 2 }]);
    expect(inv.excluded.map((e) => [e.publicId, e.reason])).toEqual([["kayad/cars/car1", "legacy_public_other"], ["kayad/chat/shared", "shared_with_vehicle_listing"]]);
  });
  it("never carries message text", () => { expect(JSON.stringify(inv)).not.toMatch(/SECRET/); });
});
