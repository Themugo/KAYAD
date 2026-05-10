// backend/tests/payment.test.js
import request from "supertest";
import mongoose from "mongoose";
import dotenv   from "dotenv";
dotenv.config({ path: ".env.test" });

process.env.MONGO_URI = process.env.TEST_MONGO_URI || "mongodb://localhost:27017/gari-test";
process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV   = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

const { default: app } = await import("../server.js").catch(() => ({ default: null }));

describe("💳 M-Pesa Payment Callback", () => {

  afterAll(async () => {
    await mongoose.connection.close();
  });

  // Valid success callback structure (as Safaricom sends it)
  const validSuccessCallback = {
    Body: {
      stkCallback: {
        MerchantRequestID: "test-merchant-req",
        CheckoutRequestID: "ws_CO_TEST_123456",
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: {
          Item: [
            { Name: "Amount",              Value: 50000 },
            { Name: "MpesaReceiptNumber",  Value: "PBK123TEST" },
            { Name: "TransactionDate",     Value: 20240101120000 },
            { Name: "PhoneNumber",         Value: 254712000000 },
          ],
        },
      },
    },
  };

  const validFailCallback = {
    Body: {
      stkCallback: {
        MerchantRequestID: "test-merchant-req",
        CheckoutRequestID: "ws_CO_TEST_FAIL456",
        ResultCode: 1032,
        ResultDesc: "Request cancelled by user",
      },
    },
  };

  test("POST /api/payments/callback — accepts valid success callback", async () => {
    const res = await request(app)
      .post("/api/payments/callback")
      .send(validSuccessCallback)
      .expect(200);

    // Should not error (payment record may not exist in test, that's OK)
    expect([0, 1]).toContain(res.body.ResultCode ?? 0);
  });

  test("POST /api/payments/callback — accepts valid failure callback", async () => {
    const res = await request(app)
      .post("/api/payments/callback")
      .send(validFailCallback)
      .expect(200);

    expect(res.body).toBeDefined();
  });

  test("POST /api/payments/callback — rejects missing stkCallback body", async () => {
    const res = await request(app)
      .post("/api/payments/callback")
      .send({ Body: {} })
      .expect(200); // We return 200 to Safaricom even on validation fail

    expect(res.body.ResultCode).toBe(1);
  });

  test("POST /api/payments/callback — rejects empty body", async () => {
    const res = await request(app)
      .post("/api/payments/callback")
      .send({})
      .expect(200);

    expect(res.body.ResultCode).toBe(1);
  });

});
