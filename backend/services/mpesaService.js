// backend/services/mpesaService.js

import axios from "axios";
import moment from "moment";

// =============================
// ⚙️ CONFIG
// =============================
const {
  MPESA_ENV = "sandbox", // sandbox | production | mock
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  MPESA_SHORTCODE,
  MPESA_PASSKEY,
  MPESA_CALLBACK_URL,
} = process.env;

const BASE_URL =
  MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

// =============================
// 🔑 GET ACCESS TOKEN
// =============================
const getAccessToken = async () => {
  const auth = Buffer.from(
    `${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const res = await axios.get(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  return res.data.access_token;
};

// =============================
// 📱 FORMAT PHONE (KE)
// =============================
const formatPhone = (phone) => {
  if (phone.startsWith("0")) {
    return "254" + phone.slice(1);
  }
  if (phone.startsWith("+")) {
    return phone.replace("+", "");
  }
  return phone;
};

// =============================
// 📲 STK PUSH
// =============================
export const stkPush = async (phone, amount) => {
  try {
    // =============================
    // 🧪 MOCK MODE
    // =============================
    if (MPESA_ENV === "mock") {
      console.log("📲 MOCK STK:", phone, amount);

      return {
        CheckoutRequestID: "mock_" + Date.now(),
        ResponseCode: "0",
        CustomerMessage: "STK push simulated",
      };
    }

    const token = await getAccessToken();

    const timestamp = moment().format("YYYYMMDDHHmmss");

    const password = Buffer.from(
      `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    const payload = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: formatPhone(phone),
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: formatPhone(phone),
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: "GICLAN",
      TransactionDesc: "Car payment",
    };

    const res = await axios.post(
      `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res.data;

  } catch (err) {
    console.error(
      "❌ MPESA ERROR:",
      err.response?.data || err.message
    );

    throw new Error("MPESA STK push failed");
  }
};