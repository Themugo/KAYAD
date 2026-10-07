import { findOne, create, update } from "../db/index.js";

export const DEFAULT_AUCTION_PLATFORM_POLICY = {
  allowedSettlementModes: ["direct", "escrow"],
  allowDealerReaward: true,
  allowDealerCustomDefaultRules: true,
  allowDealerCustomCollectionRules: true,
  allowDealerCustomCancellationRules: true,
  minPaymentDeadlineHours: 1,
  maxPaymentDeadlineHours: 168,
  bidConfirmationFeeKes: 1,
  highValueBidThresholdKes: 5000000,
  highValueDepositKes: 50000,
  commitmentCreditTowardWinningPayment: true,
  nonWinnerCommitmentRefundRequired: true,
};

export async function getAuctionPlatformPolicy() {
  const row = await findOne("auction_platform_policies", { id: 1 });
  return { ...DEFAULT_AUCTION_PLATFORM_POLICY, ...(row?.config || {}) };
}

export function enforceAuctionPlatformPolicy(config, policy) {
  const errors = [];
  const settlementMode = config?.settlement?.mode || "direct";
  if (!policy.allowedSettlementModes.includes(settlementMode)) {
    errors.push(`Settlement mode '${settlementMode}' is not enabled by KAYAD for this platform.`);
  }
  if (settlementMode === "escrow" && config?.settlement?.escrow?.enabled !== true) {
    errors.push("Escrow settlement must explicitly be enabled when escrow mode is selected.");
  }
  if (settlementMode === "direct" && config?.settlement?.escrow?.enabled === true) {
    errors.push("Escrow cannot be enabled when direct settlement is selected.");
  }
  const deadline = Number(config?.paymentDeadlineHours);
  if (deadline < Number(policy.minPaymentDeadlineHours) || deadline > Number(policy.maxPaymentDeadlineHours)) {
    errors.push(`Winner payment deadline must be between ${policy.minPaymentDeadlineHours} and ${policy.maxPaymentDeadlineHours} hours under KAYAD policy.`);
  }
  if (config?.defaultRules?.reawardEnabled && !policy.allowDealerReaward) {
    errors.push("KAYAD has disabled dealer re-award for this platform.");
  }
  if (config?.defaultRules && !policy.allowDealerCustomDefaultRules) {
    errors.push("Dealer custom default rules are disabled by KAYAD.");
  }
  if (config?.winnerFulfilment && !policy.allowDealerCustomCollectionRules) {
    errors.push("Dealer custom collection rules are disabled by KAYAD.");
  }
  if (config?.cancellationRules && !policy.allowDealerCustomCancellationRules) {
    errors.push("Dealer custom cancellation rules are disabled by KAYAD.");
  }
  return errors;
}

export async function getDealerAuctionCapabilities() {
  const policy = await getAuctionPlatformPolicy();
  return {
    settlementModes: policy.allowedSettlementModes,
    escrowOptional: policy.allowedSettlementModes.includes("escrow") && policy.allowedSettlementModes.includes("direct"),
    allowDealerReaward: Boolean(policy.allowDealerReaward),
    allowDealerCustomDefaultRules: Boolean(policy.allowDealerCustomDefaultRules),
    allowDealerCustomCollectionRules: Boolean(policy.allowDealerCustomCollectionRules),
    allowDealerCustomCancellationRules: Boolean(policy.allowDealerCustomCancellationRules),
    paymentDeadlineHours: {
      min: Number(policy.minPaymentDeadlineHours),
      max: Number(policy.maxPaymentDeadlineHours),
    },
  };
}

export async function setAuctionPlatformPolicy({ config, actorId }) {
  const normalized = { ...DEFAULT_AUCTION_PLATFORM_POLICY, ...config };
  if (!Array.isArray(normalized.allowedSettlementModes) || normalized.allowedSettlementModes.some((m) => !["direct", "escrow"].includes(m))) {
    throw Object.assign(new Error("Invalid allowed settlement modes"), { status: 400 });
  }
  if (Number(normalized.minPaymentDeadlineHours) <= 0 || Number(normalized.maxPaymentDeadlineHours) < Number(normalized.minPaymentDeadlineHours) || Number(normalized.maxPaymentDeadlineHours) > 168) {
    throw Object.assign(new Error("Invalid platform payment deadline bounds"), { status: 400 });
  }
  const existing = await findOne("auction_platform_policies", { id: 1 });
  const payload = { id: 1, config: normalized, updated_by: actorId, updated_at: new Date().toISOString() };
  return existing ? update("auction_platform_policies", 1, payload) : create("auction_platform_policies", payload);
}
