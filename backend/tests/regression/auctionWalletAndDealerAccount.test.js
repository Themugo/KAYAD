// Wallet refunds/withdrawals orchestration, dealer collection account handling and credential encryption. Database RPCs are mocked here;
// their SQL behaviour was exercised separately on a scratch Postgres (see the audit log).
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const rpcCalls = [];
let rpcImpl = async () => ({ data: {}, error: null });
let maybeSingleImpl = async () => ({ data: null });
const chain = { select: () => chain, eq: () => chain, order: () => chain, limit: () => chain, maybeSingle: () => maybeSingleImpl(), then: (r) => r({ data: [], error: null }) };
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ rpc: (n, a) => { rpcCalls.push([n, a]); return rpcImpl(n, a); }, from: () => chain }) }));
const dbRows = { users: { id: "u1", phone: "0712345678" }, accounts: null };
jest.unstable_mockModule("../../db/index.js", () => ({
  findById: jest.fn(async (t, id) => (t === "users" ? dbRows.users : t === "dealer_payment_accounts" ? dbRows.accounts : null)),
  findOne: jest.fn(async (t) => (t === "dealer_payment_accounts" ? dbRows.accounts : null)),
  findAll: jest.fn(async () => []),
  create: jest.fn(async (_t, d) => ({ id: "acc1", ...d, credentialsEnc: d.credentials_enc, tillNumber: d.till_number, accountLabel: d.account_label })),
  update: jest.fn(async (_t, id, d) => ({ id, ...dbRows.accounts, ...d, credentialsEnc: d.credentials_enc || dbRows.accounts?.credentialsEnc, verifiedAt: d.verified_at })),
}));
const b2c = jest.fn(async () => ({ conversationID: "conv1" }));
jest.unstable_mockModule("../../services/mpesaB2C.service.js", () => ({ sendB2CPayment: b2c }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logError: jest.fn(), logInfo: jest.fn(), logWarn: jest.fn() }));

process.env.PAYMENT_ACCOUNT_ENCRYPTION_KEY = "a".repeat(64);
const { refundHold, withdraw, handleWalletB2CResult } = await import("../../services/auctionWallet.service.js");
const { saveDealerPaymentAccount, resolveDealerCollection, reviewDealerPaymentAccount } = await import("../../services/dealerPaymentAccount.service.js");
const { encryptJson, decryptJson } = await import("../../utils/paymentCrypto.js");

beforeEach(() => { rpcCalls.length = 0; b2c.mockClear(); rpcImpl = async (n) => ({ data: n.includes("refund") ? { amount: 5000, idempotent: false } : { id: "wd1", amount: 3000, idempotent: false }, error: null }); dbRows.accounts = null; });

describe("loser refund", () => {
  it("wallet choice only credits the wallet", async () => {
    await refundHold({ holdId: "h1", userId: "u1", destination: "wallet" });
    expect(rpcCalls.map((c) => c[0])).toEqual(["kayad_auction_refund_to_wallet_atomic"]);
    expect(b2c).not.toHaveBeenCalled();
  });
  it("mpesa choice credits the wallet first, then sends to the user's OWN profile phone", async () => {
    const r = await refundHold({ holdId: "h1", userId: "u1", destination: "mpesa" });
    expect(rpcCalls.map((c) => c[0])).toEqual(["kayad_auction_refund_to_wallet_atomic", "kayad_wallet_request_withdrawal_atomic", "kayad_wallet_withdrawal_result_atomic"]);
    expect(b2c).toHaveBeenCalledWith({ phone: "0712345678", amount: 3000 });
    expect(r.withdrawal.status).toBe("processing");
  });
  it("a failed send leaves the money safe in the wallet (reversal RPC)", async () => {
    b2c.mockRejectedValueOnce(new Error("down"));
    const r = await refundHold({ holdId: "h1", userId: "u1", destination: "mpesa" });
    expect(rpcCalls.some((c) => c[0] === "kayad_wallet_withdrawal_result_atomic" && c[1].p_status === "failed")).toBe(true);
    expect(r.withdrawal.error).toMatch(/safe in your wallet/);
  });
  it("rejects unknown destinations", async () => {
    await expect(refundHold({ holdId: "h1", userId: "u1", destination: "friend" })).rejects.toMatchObject({ status: 422 });
  });
  it("a replayed refund does not send money again", async () => {
    rpcImpl = async () => ({ data: { amount: 5000, idempotent: true }, error: null });
    await refundHold({ holdId: "h1", userId: "u1", destination: "mpesa" });
    expect(b2c).not.toHaveBeenCalled();
  });
});

describe("withdraw and B2C result", () => {
  it("never takes a phone from the request: it uses the profile phone", async () => {
    await withdraw({ userId: "u1", amount: 3000 });
    expect(rpcCalls[0][1].p_phone).toBe("0712345678");
  });
  it("provider success marks paid; failure marks failed; amount mismatch changes nothing", async () => {
    maybeSingleImpl = async () => ({ data: { id: "wd1", amount: 3000, status: "processing" } });
    await handleWalletB2CResult({ conversationId: "c", success: true, transactionId: "R1", amount: 3000 });
    expect(rpcCalls.at(-1)[1].p_status).toBe("paid");
    await handleWalletB2CResult({ conversationId: "c", success: false, resultDesc: "x" });
    expect(rpcCalls.at(-1)[1].p_status).toBe("failed");
    rpcCalls.length = 0;
    expect(await handleWalletB2CResult({ conversationId: "c", success: true, amount: 1 })).toBe(true);
    expect(rpcCalls).toHaveLength(0);
  });
  it("ignores conversations that are not wallet withdrawals", async () => {
    maybeSingleImpl = async () => ({ data: null });
    expect(await handleWalletB2CResult({ conversationId: "other", success: true })).toBe(false);
  });
});

describe("dealer collection account", () => {
  const body = { kind: "till", shortcode: "174379", tillNumber: "522522", consumerKey: "ck-12345678", consumerSecret: "cs-12345678", passkey: "pk-12345678" };
  it("only dealers, validated digits, lands pending, credentials never returned", async () => {
    await expect(saveDealerPaymentAccount({ user: { id: "p", role: "private_seller" }, body })).rejects.toMatchObject({ status: 403 });
    await expect(saveDealerPaymentAccount({ user: { id: "d", role: "dealer" }, body: { ...body, shortcode: "12ab" } })).rejects.toMatchObject({ status: 422 });
    const v = await saveDealerPaymentAccount({ user: { id: "d", role: "dealer" }, body });
    expect(v.status).toBe("pending");
    expect(JSON.stringify(v)).not.toMatch(/ck-12345678|credentials/i);
  });
  it("unverified accounts are never used; verified ones yield till overrides", async () => {
    expect(await resolveDealerCollection("d")).toBeNull();
    const enc = encryptJson({ consumerKey: "k", consumerSecret: "s", passkey: "p" });
    dbRows.accounts = { id: "a", kind: "till", shortcode: "174379", tillNumber: "522522", status: "verified", credentialsEnc: enc };
    const r = await resolveDealerCollection("d");
    expect(r.overrides).toMatchObject({ shortCode: "174379", partyB: "522522", transactionType: "CustomerBuyGoodsOnline", consumerKey: "k" });
  });
  it("corrupt credentials fall back to KAYAD-held (null), never throw", async () => {
    dbRows.accounts = { id: "a", kind: "paybill", shortcode: "174379", status: "verified", credentialsEnc: "v1.bad.bad.bad" };
    expect(await resolveDealerCollection("d")).toBeNull();
  });
  it("review accepts only verified/disabled", async () => {
    dbRows.accounts = { id: "a", status: "pending" };
    await expect(reviewDealerPaymentAccount({ accountId: "a", adminId: "ad", decision: "approved" })).rejects.toMatchObject({ status: 422 });
    expect((await reviewDealerPaymentAccount({ accountId: "a", adminId: "ad", decision: "verified" })).status).toBe("verified");
  });
});

describe("credential encryption", () => {
  it("round-trips, is non-deterministic, detects tampering, fails closed without a key", () => {
    const a = encryptJson({ x: 1 });
    expect(decryptJson(a)).toEqual({ x: 1 });
    expect(encryptJson({ x: 1 })).not.toBe(a);
    expect(() => decryptJson(a.slice(0, -2) + "AA")).toThrow();
    const k = process.env.PAYMENT_ACCOUNT_ENCRYPTION_KEY; delete process.env.PAYMENT_ACCOUNT_ENCRYPTION_KEY;
    expect(() => encryptJson({})).toThrow(/32 bytes/); process.env.PAYMENT_ACCOUNT_ENCRYPTION_KEY = k;
  });
});
