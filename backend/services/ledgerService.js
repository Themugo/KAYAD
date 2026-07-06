import mongoose from "mongoose";
import LedgerEntry from "../models/LedgerEntry.js";
import LedgerAccount from "../models/LedgerAccount.js";
import crypto from "crypto";

function generateTransactionId() {
  return `LGR-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function formatCurrency(amount) {
  return Math.round(amount * 100) / 100;
}

async function ensureAccounts() {
  const accounts = await LedgerAccount.find({}).lean();
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
    await LedgerAccount.insertMany(seed);
    return await LedgerAccount.find({}).lean();
  }
  return accounts;
}

async function getAccountId(code) {
  const account = await LedgerAccount.findOne({ code });
  if (!account) throw new Error(`Account not found: ${code}`);
  return account._id;
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
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await ensureAccounts();
    const debitAccountId = await getAccountId(debitAccountCode);
    const creditAccountId = await getAccountId(creditAccountCode);
    const roundedAmount = formatCurrency(amount);

    const entry = await LedgerEntry.create(
      [{
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
      }],
      { session },
    );

    await LedgerAccount.findByIdAndUpdate(debitAccountId, { $inc: { balance: roundedAmount } }, { session });
    await LedgerAccount.findByIdAndUpdate(creditAccountId, { $inc: { balance: -roundedAmount } }, { session });

    await session.commitTransaction();
    session.endSession();
    return entry[0];
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
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
  const accounts = await LedgerAccount.find({ isActive: true }).lean();
  const totals = { asset: 0, liability: 0, equity: 0, revenue: 0, expense: 0 };
  for (const acc of accounts) {
    totals[acc.type] = (totals[acc.type] || 0) + acc.balance;
  }
  return { accounts, totals, generatedAt: new Date() };
}

export async function getTrialBalance() {
  const accounts = await LedgerAccount.find({ isActive: true }).lean();
  let totalDebit = 0;
  let totalCredit = 0;
  for (const acc of accounts) {
    if (acc.balance > 0) totalDebit += acc.balance;
    else totalCredit += Math.abs(acc.balance);
  }
  return { accounts, totalDebit: formatCurrency(totalDebit), totalCredit: formatCurrency(totalCredit), inBalance: Math.abs(totalDebit - totalCredit) < 0.01, generatedAt: new Date() };
}

export async function getLedgerEntries({ source, status, user_id, startDate, endDate, page = 1, limit = 50 }) {
  const filter = {};
  if (source) filter.source = source;
  if (status) filter.status = status;
  if (user_id) filter.user = user_id;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  const skip = (page - 1) * limit;
  const [entries, total] = await Promise.all([
    LedgerEntry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("entries.account", "code name type").lean(),
    LedgerEntry.countDocuments(filter),
  ]);
  return { entries, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getLedgerEntryById(id) {
  const entry = await LedgerEntry.findById(id).populate("entries.account", "code name type").populate("user", "name email");
  return entry;
}

export async function reverseLedgerEntry(entryId, userId, reason) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const original = await LedgerEntry.findById(entryId).session(session);
    if (!original) throw new Error("Entry not found");
    if (original.status === "reversed") throw new Error("Entry already reversed");

    for (const e of original.entries) {
      const account = await LedgerAccount.findById(e.account).session(session);
      if (!account) throw new Error(`Account ${e.account} not found`);
      account.balance -= (e.debit || 0);
      account.balance += (e.credit || 0);
      await account.save({ session });
    }

    original.status = "reversed";
    original.reversed_at = new Date();
    original.reversed_by = userId;
    original.metadata = { ...original.metadata, reversal_reason: reason };
    await original.save({ session });

    const reversalEntry = await LedgerEntry.create(
      [{
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
      }],
      { session },
    );

    await session.commitTransaction();
    session.endSession();
    return reversalEntry[0];
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export async function getReconciliationReport({ startDate, endDate }) {
  const filter = {};
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  const entries = await LedgerEntry.find(filter).sort({ createdAt: -1 }).populate("entries.account", "code name").lean();
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
