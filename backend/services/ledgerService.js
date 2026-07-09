import { findAll, findById, findOne, create, update } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";
import crypto from "crypto";

function generateTransactionId() {
  return `LGR-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function formatCurrency(amount) {
  return Math.round(amount * 100) / 100;
}

async function ensureAccounts() {
  const accounts = await findAll("ledger_accounts", {});
  if (accounts.length === 0) {
    const seed = [
      { code: "1000", name: "Cash - M-Pesa", type: "asset", category: "cash", description: "M-Pesa payment collections" },
      { code: "1100", name: "Escrow Holdings", type: "asset", category: "escrow", description: "Funds held in escrow" },
      { code: "1200", name: "Bank Account", type: "asset", category: "cash", description: "Platform bank account" },
      { code: "2000", name: "Escrow Payable", type: "liability", category: "escrow", description: "Funds owed to sellers" },
      { code: "2100", name: "Refund Payable", type: "liability", category: "refund", description: "Funds owed to buyers" },
      { code: "2200", name: "Commission Payable", type: "liability", category: "commission", description: "Unpaid commissions" },
      { code: "3000", name: "Retained Earnings", type: "equity", category: "reserve", description: "Platform retained earnings" },
      { code: "4000", name: "Commission Revenue", type: "revenue", category: "commission", description: "Platform commission fees" },
      { code: "4100", name: "Subscription Revenue", type: "revenue", category: "subscription", description: "Dealer subscription fees" },
      { code: "4200", name: "Inspection Fees", type: "revenue", category: "inspection", description: "Vehicle inspection fees" },
      { code: "4300", name: "Listing Fees", type: "revenue", category: "fees", description: "Listing promotion fees" },
      { code: "5000", name: "B2C Disbursement Payable", type: "liability", category: "payable", description: "Pending seller payouts" },
    ];
    const created = [];
    for (const acct of seed) {
      created.push(await create("ledger_accounts", acct));
    }
    return created;
  }
  return accounts;
}

async function getAccountId(code) {
  const account = await findOne("ledger_accounts", { code });
  if (!account) throw new Error(`Account not found: ${code}`);
  return account.id;
}

export async function recordLedgerEntry({
  external_reference,
  user_id,
  amount,
  currency = "KES",
  source,
  destination,
  description,
  metadata = {},
  debitAccountCode,
  creditAccountCode,
}) {
  try {
    await ensureAccounts();
    const debitAccountId = await getAccountId(debitAccountCode);
    const creditAccountId = await getAccountId(creditAccountCode);
    const roundedAmount = formatCurrency(amount);

    const entry = await create("ledger_entries", {
      transaction_id: generateTransactionId(),
      external_reference,
      user: user_id,
      amount: roundedAmount,
      currency,
      source,
      destination,
      status: "completed",
      description: description || `${source} → ${destination}`,
      entries: [
        { account: debitAccountId, debit: roundedAmount, credit: 0 },
        { account: creditAccountId, debit: 0, credit: roundedAmount },
      ],
      metadata,
    });

    const debitAccount = await findById("ledger_accounts", debitAccountId);
    if (debitAccount) {
      await update("ledger_accounts", debitAccountId, { balance: (debitAccount.balance || 0) + roundedAmount });
    }

    const creditAccount = await findById("ledger_accounts", creditAccountId);
    if (creditAccount) {
      await update("ledger_accounts", creditAccountId, { balance: (creditAccount.balance || 0) - roundedAmount });
    }

    return entry;
  } catch (err) {
    throw err;
  }
}

export async function recordEscrowDeposit({ payment_id, user_id, amount }) {
  return recordLedgerEntry({
    external_reference: String(payment_id),
    user_id,
    amount,
    source: "escrow_deposit",
    destination: "buyer",
    description: `Escrow deposit of KES ${amount.toLocaleString("en-KE")}`,
    metadata: { payment_id, event: "escrow_deposit" },
    debitAccountCode: "1100",
    creditAccountCode: "2000",
  });
}

export async function recordEscrowRelease({ escrow_id, user_id, amount, commission }) {
  const sellerAmount = amount - commission;
  const releaseEntry = await recordLedgerEntry({
    external_reference: String(escrow_id),
    user_id,
    amount: sellerAmount,
    source: "escrow_release",
    destination: "seller",
    description: `Escrow release of KES ${sellerAmount.toLocaleString("en-KE")} to seller`,
    metadata: { escrow_id, commission, event: "escrow_release" },
    debitAccountCode: "2000",
    creditAccountCode: "5000",
  });
  if (commission > 0) {
    await recordLedgerEntry({
      external_reference: String(escrow_id),
      user_id,
      amount: commission,
      source: "commission",
      destination: "platform",
      description: `Platform commission of KES ${commission.toLocaleString("en-KE")}`,
      metadata: { escrow_id, event: "commission" },
      debitAccountCode: "2000",
      creditAccountCode: "4000",
    });
  }
  return releaseEntry;
}

export async function recordRefund({ escrow_id, user_id, amount }) {
  return recordLedgerEntry({
    external_reference: String(escrow_id),
    user_id,
    amount,
    source: "refund",
    destination: "buyer",
    description: `Refund of KES ${amount.toLocaleString("en-KE")} to buyer`,
    metadata: { escrow_id, event: "refund" },
    debitAccountCode: "2100",
    creditAccountCode: "1100",
  });
}

export async function recordSubscriptionPayment({ subscription_id, user_id, amount }) {
  return recordLedgerEntry({
    external_reference: String(subscription_id),
    user_id,
    amount,
    source: "subscription",
    destination: "platform",
    description: `Dealer subscription payment of KES ${amount.toLocaleString("en-KE")}`,
    metadata: { subscription_id, event: "subscription" },
    debitAccountCode: "1000",
    creditAccountCode: "4100",
  });
}

export async function recordInspectionFee({ inspection_id, user_id, amount }) {
  return recordLedgerEntry({
    external_reference: String(inspection_id),
    user_id,
    amount,
    source: "inspection_fee",
    destination: "platform",
    description: `Inspection fee of KES ${amount.toLocaleString("en-KE")}`,
    metadata: { inspection_id, event: "inspection_fee" },
    debitAccountCode: "1000",
    creditAccountCode: "4200",
  });
}

export async function recordAuctionPayment({ payment_id, user_id, amount, commission }) {
  const sellerAmount = amount - (commission || 0);
  const paymentEntry = await recordLedgerEntry({
    external_reference: String(payment_id),
    user_id,
    amount: sellerAmount,
    source: "auction_payment",
    destination: "seller",
    description: `Auction payment of KES ${sellerAmount.toLocaleString("en-KE")}`,
    metadata: { payment_id, commission, event: "auction_payment" },
    debitAccountCode: "1000",
    creditAccountCode: "5000",
  });
  if (commission > 0) {
    await recordLedgerEntry({
      external_reference: String(payment_id),
      user_id,
      amount: commission,
      source: "commission",
      destination: "platform",
      description: `Auction commission of KES ${commission.toLocaleString("en-KE")}`,
      metadata: { payment_id, event: "auction_commission" },
      debitAccountCode: "1000",
      creditAccountCode: "4000",
    });
  }
  return paymentEntry;
}

export async function getBalanceSheet() {
  const accounts = await findAll("ledger_accounts", { filters: { isActive: true } });
  const totals = { asset: 0, liability: 0, equity: 0, revenue: 0, expense: 0 };
  for (const acc of accounts) {
    totals[acc.type] = (totals[acc.type] || 0) + (acc.balance || 0);
  }
  return { accounts, totals, generatedAt: new Date() };
}

export async function getTrialBalance() {
  const accounts = await findAll("ledger_accounts", { filters: { isActive: true } });
  let totalDebit = 0;
  let totalCredit = 0;
  for (const acc of accounts) {
    if (acc.balance > 0) totalDebit += acc.balance;
    else totalCredit += Math.abs(acc.balance);
  }
  return { accounts, totalDebit: formatCurrency(totalDebit), totalCredit: formatCurrency(totalCredit), inBalance: Math.abs(totalDebit - totalCredit) < 0.01, generatedAt: new Date() };
}

export async function getLedgerEntries({ source, status, user_id, startDate, endDate, page = 1, limit = 50 }) {
  const sb = getSupabase();
  let query = sb.from("ledger_entries").select("*", { count: "exact" });

  if (source) query = query.eq("source", source);
  if (status) query = query.eq("status", status);
  if (user_id) query = query.eq("user", user_id);
  if (startDate) query = query.gte("createdAt", new Date(startDate).toISOString());
  if (endDate) query = query.lte("createdAt", new Date(endDate).toISOString());

  query = query.order("createdAt", { ascending: false });
  query = query.range((page - 1) * limit, (page - 1) * limit + limit - 1);

  const { data: entries, error, count } = await query;
  if (error) throw error;

  for (const entry of entries) {
    if (entry.entries) {
      for (const e of entry.entries) {
        if (e.account) {
          const acc = await findById("ledger_accounts", e.account);
          if (acc) e.account = { id: acc.id, code: acc.code, name: acc.name, type: acc.type };
        }
      }
    }
  }

  return { entries, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } };
}

export async function getLedgerEntryById(id) {
  const entry = await findById("ledger_entries", id);
  if (!entry) return null;
  if (entry.entries) {
    for (const e of entry.entries) {
      if (e.account) {
        const acc = await findById("ledger_accounts", e.account);
        if (acc) e.account = { id: acc.id, code: acc.code, name: acc.name, type: acc.type };
      }
    }
  }
  if (entry.user) {
    const user = await findById("users", entry.user);
    if (user) entry.user = { id: user.id, name: user.name, email: user.email };
  }
  return entry;
}

export async function reverseLedgerEntry(entryId, userId, reason) {
  try {
    const original = await findById("ledger_entries", entryId);
    if (!original) throw new Error("Entry not found");
    if (original.status === "reversed") throw new Error("Entry already reversed");

    for (const e of original.entries) {
      const account = await findById("ledger_accounts", e.account);
      if (!account) throw new Error(`Account ${e.account} not found`);
      const newBalance = (account.balance || 0) - (e.debit || 0) + (e.credit || 0);
      await update("ledger_accounts", account.id, { balance: newBalance });
    }

    await update("ledger_entries", original.id, {
      status: "reversed",
      reversed_at: new Date().toISOString(),
      reversed_by: userId,
      metadata: { ...original.metadata, reversal_reason: reason },
    });

    const reversalEntry = await create("ledger_entries", {
      transaction_id: generateTransactionId(),
      external_reference: original.transaction_id,
      user: original.user,
      amount: original.amount,
      currency: original.currency,
      source: original.source,
      destination: original.destination,
      status: "completed",
      description: `Reversal: ${reason} — ref ${original.transaction_id}`,
      entries: original.entries.map((e) => ({
        account: e.account,
        debit: e.credit || 0,
        credit: e.debit || 0,
      })),
      metadata: { reversed_entry_id: entryId, reason, event: "reversal" },
    });

    return reversalEntry;
  } catch (err) {
    throw err;
  }
}

export async function getReconciliationReport({ startDate, endDate }) {
  const sb = getSupabase();
  let query = sb.from("ledger_entries").select("*");

  if (startDate) query = query.gte("createdAt", new Date(startDate).toISOString());
  if (endDate) query = query.lte("createdAt", new Date(endDate).toISOString());

  query = query.order("createdAt", { ascending: false });

  const { data: entries, error } = await query;
  if (error) throw error;

  for (const entry of entries) {
    if (entry.entries) {
      for (const e of entry.entries) {
        if (e.account) {
          const acc = await findById("ledger_accounts", e.account);
          if (acc) e.account = { id: acc.id, code: acc.code, name: acc.name };
        }
      }
    }
  }

  const summary = {
    total_entries: entries.length,
    total_debit: 0,
    total_credit: 0,
    by_source: {},
    by_status: {},
  };
  for (const entry of entries) {
    for (const e of entry.entries) {
      summary.total_debit += e.debit || 0;
      summary.total_credit += e.credit || 0;
    }
    summary.by_source[entry.source] = (summary.by_source[entry.source] || 0) + entry.amount;
    summary.by_status[entry.status] = (summary.by_status[entry.status] || 0) + 1;
  }
  summary.total_debit = formatCurrency(summary.total_debit);
  summary.total_credit = formatCurrency(summary.total_credit);
  return { entries, summary };
}

export async function seedAccounts() {
  return ensureAccounts();
}
