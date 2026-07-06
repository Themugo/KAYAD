import LedgerAccount from "../models/LedgerAccount.js";

const ACCOUNTS = [
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

export async function seedLedgerAccounts() {
  const existing = await LedgerAccount.countDocuments();
  if (existing > 0) {
    console.log(`Ledger accounts already seeded (${existing} existing).`);
    return;
  }
  await LedgerAccount.insertMany(ACCOUNTS);
  console.log(`Seeded ${ACCOUNTS.length} ledger accounts.`);
}

export default seedLedgerAccounts;
