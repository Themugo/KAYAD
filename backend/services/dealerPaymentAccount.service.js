import { findOne, findById, findAll, create, update } from "../db/index.js";
import { encryptJson, decryptJson } from "../utils/paymentCrypto.js";

const SHORTCODE_RE = /^[0-9]{5,8}$/;

const publicView = (row) => row && ({
  id: row.id, kind: row.kind, shortcode: row.shortcode, tillNumber: row.tillNumber || null,
  accountLabel: row.accountLabel || null, status: row.status, verifiedAt: row.verifiedAt || null,
});

/** A dealer registers their own paybill/till + Daraja credentials. Always lands as 'pending' until an admin verifies it. */
export async function saveDealerPaymentAccount({ user, body }) {
  if (!user || user.role !== "dealer") throw Object.assign(new Error("Only dealer accounts can register a collection account"), { status: 403 });
  const kind = body.kind === "till" ? "till" : body.kind === "paybill" ? "paybill" : null;
  if (!kind) throw Object.assign(new Error("kind must be paybill or till"), { status: 422 });
  const shortcode = String(body.shortcode || "").trim();
  const tillNumber = kind === "till" ? String(body.tillNumber || "").trim() : null;
  if (!SHORTCODE_RE.test(shortcode) || (kind === "till" && !SHORTCODE_RE.test(tillNumber))) throw Object.assign(new Error("Shortcode/till must be 5-8 digits"), { status: 422 });
  const { consumerKey, consumerSecret, passkey } = body;
  if (![consumerKey, consumerSecret, passkey].every((v) => typeof v === "string" && v.trim().length >= 8)) throw Object.assign(new Error("Daraja consumer key, consumer secret and passkey are required"), { status: 422 });
  const credentials_enc = encryptJson({ consumerKey: consumerKey.trim(), consumerSecret: consumerSecret.trim(), passkey: passkey.trim() });
  const fields = { kind, shortcode, till_number: tillNumber, account_label: String(body.accountLabel || "").slice(0, 80) || null, credentials_enc, status: "pending", verified_by: null, verified_at: null };
  const existing = await findOne("dealer_payment_accounts", { user_id: user.id });
  const row = existing ? await update("dealer_payment_accounts", existing.id, fields) : await create("dealer_payment_accounts", { user_id: user.id, ...fields });
  return publicView(row);
}

export async function getDealerPaymentAccount(userId) {
  return publicView(await findOne("dealer_payment_accounts", { user_id: userId }));
}

export async function reviewDealerPaymentAccount({ accountId, adminId, decision }) {
  if (!["verified", "disabled"].includes(decision)) throw Object.assign(new Error("decision must be verified or disabled"), { status: 422 });
  const row = await findById("dealer_payment_accounts", accountId);
  if (!row) throw Object.assign(new Error("Account not found"), { status: 404 });
  return publicView(await update("dealer_payment_accounts", accountId, { status: decision, verified_by: adminId, verified_at: decision === "verified" ? new Date().toISOString() : null }));
}

/** STK overrides for dealer-direct collection, or null (=> KAYAD collects). Never returns credentials to callers outside payment initiation. */
export async function resolveDealerCollection(dealerUserId) {
  if (!dealerUserId) return null;
  const row = await findOne("dealer_payment_accounts", { user_id: dealerUserId, status: "verified" });
  if (!row) return null;
  try {
    const c = decryptJson(row.credentialsEnc);
    return {
      overrides: {
        consumerKey: c.consumerKey, consumerSecret: c.consumerSecret, passkey: c.passkey, shortCode: row.shortcode,
        ...(row.kind === "till" ? { transactionType: "CustomerBuyGoodsOnline", partyB: row.tillNumber } : {}),
      },
      accountId: row.id, kind: row.kind, shortcode: row.shortcode,
    };
  } catch { return null; } // unreadable credentials: fall back to KAYAD-held, never to a guess
}

/** Admin queue. Never includes credentials; includes the owner's name so staff can check it against the dealer's KYC before verifying. */
export async function listDealerPaymentAccounts({ status = "pending" } = {}) {
  const rows = await findAll("dealer_payment_accounts", { filters: status === "all" ? {} : { status }, limit: 200 });
  return Promise.all(rows.map(async (r) => {
    const owner = await findById("users", r.userId || r.user_id).catch(() => null);
    return { ...publicView(r), userId: r.userId || r.user_id, ownerName: owner?.name || null, ownerEmail: owner?.email || null };
  }));
}
