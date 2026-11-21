// MOCKED unit tests (injected collaborators, no DB/network) for the outbox delivery step. The real-database behaviour
// (atomic commit, SKIP LOCKED claims, retry, restart) is proven in docs/messaging-consistency-audit/harness/tests/m8-chat-outbox.test.mjs.
import { describe, it, expect, jest } from "@jest/globals";
import { deliverChatOutboxEvent, buildNewMessageEvent } from "../../services/chatOutbox.service.js";

const U1 = "11111111-1111-4111-8111-111111111111";
const row = { event_id: "m1", chat_id: "c1", sender_id: "alice" };
const chat = {
  id: "c1",
  participants: ["alice", "bob"],
  messages: [{ id: "m1", sender: "alice", text: "hi", createdAt: "2026-10-11T00:00:00Z", attachments: [{ uploadId: U1, provider: "cloudinary", publicId: "kayad/chat/x" }] }],
};
const mk = (over = {}) => {
  const emit = jest.fn();
  const to = jest.fn(() => ({ emit }));
  return { emit, to, deps: { find: async () => chat, io: () => ({ to }), notify: jest.fn(async () => ({ id: "n1" })), exists: jest.fn(async () => false), ...over } };
};

describe("deliverChatOutboxEvent", () => {
  it("emits the unchanged newMessage contract (no storage coordinates) and notifies only the recipient", async () => {
    const { emit, to, deps } = mk();
    expect(await deliverChatOutboxEvent(row, deps)).toBe("delivered");
    expect(to).toHaveBeenCalledWith("chat_c1");
    const [name, payload] = emit.mock.calls[0];
    expect(name).toBe("newMessage");
    expect(Object.keys(payload).sort()).toEqual(["attachments", "chatId", "createdAt", "id", "message", "seen", "seenBy", "sender", "text"]);
    expect(JSON.stringify(payload)).not.toMatch(/publicId|cloudinary|kayad\/chat\/x/);
    expect(deps.notify).toHaveBeenCalledTimes(1);
    expect(deps.notify.mock.calls[0][0]).toMatchObject({ userId: "bob", type: "chat", data: { chatId: "c1", messageId: "m1" } });
  });

  it("skips a notification that already exists (crash after create) - no duplicate", async () => {
    const { deps } = mk({ exists: jest.fn(async () => true) });
    await deliverChatOutboxEvent(row, deps);
    expect(deps.notify).not.toHaveBeenCalled();
  });

  it("throws (so the event is retried) when the notification could not be created", async () => {
    const { deps } = mk({ notify: jest.fn(async () => null) });
    await expect(deliverChatOutboxEvent(row, deps)).rejects.toThrow(/not created/);
  });

  it("treats a deleted chat or a moderated-away message as nothing to deliver", async () => {
    expect(await deliverChatOutboxEvent(row, mk({ find: async () => null }).deps)).toBe("skipped:chat-gone");
    expect(await deliverChatOutboxEvent(row, mk({ find: async () => ({ ...chat, messages: [] }) }).deps)).toBe("skipped:message-gone");
  });

  it("buildNewMessageEvent presents attachments through the authenticated path", () => {
    expect(buildNewMessageEvent("c1", chat.messages[0]).attachments[0].url).toBe(`/api/chat/c1/attachments/${U1}`);
  });
});
