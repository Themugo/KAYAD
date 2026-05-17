import axios from "axios";

const CONSUMER_KEY    = process.env.MPESA_CONSUMER_KEY || "";
const CONSUMER_SECRET = process.env.MPESA_SECRET || "";
const PASSKEY         = process.env.MPESA_PASSKEY || "";
const SHORTCODE       = process.env.MPESA_SHORTCODE || "174379";
const ENV             = process.env.MPESA_ENV || "sandbox";

const BASE_URL =
  ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

let _accessToken = null;
let _tokenExpiry = 0;

async function getToken() {
  if (_accessToken && Date.now() < _tokenExpiry) return _accessToken;
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const { data } = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  _accessToken = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return _accessToken;
}

export async function stkPush(amount, phone, accountRef, transactionDesc, callbackUrl) {
  const token = await getToken();
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");

  const payload = {
    BusinessShortCode: SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(amount),
    PartyA: phone,
    PartyB: SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: callbackUrl,
    AccountReference: accountRef || "KAYAD",
    TransactionDesc: transactionDesc || "Vehicle Payment",
  };

  const { data } = await axios.post(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return data;
}

export async function queryStatus(checkoutRequestId) {
  const token = await getToken();
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");

  const { data } = await axios.post(
    `${BASE_URL}/mpesa/stkpushquery/v1/query`,
    {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return data;
}
