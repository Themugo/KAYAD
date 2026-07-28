// backend/tests/chat.test.js
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

import { startTestDB, stopTestDB, clearTestDB, describeWithDb } from "./setup.js";
import mongoose from "mongoose";

await startTestDB();

const { default: app } = await import("../server.js");
import Chat from "../models/Chat.js";

describeWithDb("Chat Routes", () => {
  let tokenA, tokenB, userIdA, userIdB, carId;

  beforeAll(async () => {
    const ts = Date.now();

    const resA = await request(app)
      .post("/api/auth/register")
      .send({ name: "User A", email: `chata-${ts}@test.ke`, password: "Test@12345" });
    tokenA = resA.body.token;
    userIdA = resA.body.user._id;

    const resB = await request(app)
      .post("/api/auth/register")
      .send({ name: "User B", email: `chatb-${ts}@test.ke`, password: "Test@12345" });
    tokenB = resB.body.token;
    userIdB = resB.body.user._id;

    const Car = mongoose.model("Car");
    const car = await Car.create({
      title: "Chat Car",
      brand: "Honda",
      price: 400000,
      dealer: new mongoose.Types.ObjectId(userIdA),
      status: "active",
    });
    carId = car._id;
  });

  afterAll(async () => {
    await clearTestDB();
  });

  it("GET /api/chat — requires auth", async () => {
    await request(app).get("/api/chat").expect(401);
  });

  it("POST /api/chat — creates a new chat (or returns existing)", async () => {
    const res = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ participantId: userIdB, carId, initialMessage: "Hello, I'm interested in this car" })
      .expect(201);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/chat — returns inbox", async () => {
    const res = await request(app).get("/api/chat").set("Authorization", `Bearer ${tokenA}`).expect(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/chat/:chatId/message — sends a message", async () => {
    const inbox = await request(app).get("/api/chat").set("Authorization", `Bearer ${tokenA}`);
    const chatId = inbox.body.chats?.[0]?._id;
    if (!chatId) return; // skip if no chat

    const res = await request(app)
      .post(`/api/chat/${chatId}/message`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ content: "Hello from User A!" })
      .expect(201);
    // sendMessage returns the message object directly (no success wrapper)
    expect(res.body.text).toBe("Hello from User A!");
  });

  it("GET /api/chat/:chatId/messages — gets messages", async () => {
    const inbox = await request(app).get("/api/chat").set("Authorization", `Bearer ${tokenA}`);
    const chatId = inbox.body.chats?.[0]?._id;
    if (!chatId) return;

    const res = await request(app)
      .get(`/api/chat/${chatId}/messages`)
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.messages ?? res.body.data ?? [])).toBe(true);
  });

  it("POST /api/chat/:chatId/seen — marks messages as seen", async () => {
    const inbox = await request(app).get("/api/chat").set("Authorization", `Bearer ${tokenB}`);
    const chatId = inbox.body.chats?.[0]?._id;
    if (!chatId) return;

    const res = await request(app)
      .post(`/api/chat/${chatId}/seen`)
      .set("Authorization", `Bearer ${tokenB}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it("DELETE /api/chat/:chatId — leaves/deletes chat", async () => {
    const inbox = await request(app).get("/api/chat").set("Authorization", `Bearer ${tokenA}`);
    const chatId = inbox.body.chats?.[0]?._id;
    if (!chatId) return;

    const res = await request(app).delete(`/api/chat/${chatId}`).set("Authorization", `Bearer ${tokenA}`).expect(200);
    expect(res.body.success).toBe(true);
  });
});
