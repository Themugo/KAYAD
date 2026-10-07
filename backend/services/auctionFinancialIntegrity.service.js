import { create, findById, findOne, update } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";
import { getAuctionPlatformPolicy } from "./auctionPlatformPolicy.service.js";
import { initiateBidSecurity } from "./bidSecurityService.js";

export async function getAuctionFinancialPolicy() {
  const policy = await getAuctionPlatformPolicy();
  return {
    ...policy,
    bidConfirmationFeeKes: Number(policy.bidConfirmationFeeKes ?? 1),
    highValueBidThresholdKes: Number(policy.highValueBidThresholdKes ?? 5_000_000),
    highValueDepositKes: Number(policy.highValueDepositKes ?? 50_000),
    commitmentCreditTowardWinningPayment: policy.commitmentCreditTowardWinningPayment !== false,
    nonWinnerCommitmentRefundRequired: policy.nonWinnerCommitmentRefundRequired !== false,
  };
}

export async function createAuctionSecurityHold({ auctionId, bidderId, registrationId, holdType, amount, policySnapshot = {} }) {
  if (!['commitment', 'high_value_deposit'].includes(holdType)) throw Object.assign(new Error('Unsupported auction security hold type'), { status: 400 });
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw Object.assign(new Error('Auction security hold amount must be positive'), { status: 422 });
  const existing = await findOne('auction_security_holds', {
    auction_id: auctionId,
    bidder_id: bidderId,
    hold_type: holdType,
  });
  if (existing && ['pending', 'held', 'refund_pending', 'applied'].includes(existing.status)) return existing;
  return create('auction_security_holds', {
    auction_id: auctionId,
    bidder_id: bidderId,
    registration_id: registrationId || null,
    hold_type: holdType,
    amount: value,
    status: 'pending',
    policy_snapshot: policySnapshot,
  });
}

export async function initiateHighValueDeposit({ auctionId, userId, req }) {
  const auction = await findById('cars', auctionId);
  const setup = await findOne('auction_setups', { car_id: auctionId, publication_status: 'published' });
  if (!auction || !setup) throw Object.assign(new Error('Auction is not published'), { status: 404 });
  const policy = await getAuctionFinancialPolicy();
  const registration = await findOne('auction_registrations', { auction_id: auctionId, bidder_id: userId });
  if (!registration || registration.status !== 'active') throw Object.assign(new Error('Active auction registration is required before a high-value deposit'), { status: 403 });
  const hold = await createAuctionSecurityHold({
    auctionId,
    bidderId: userId,
    registrationId: registration.id,
    holdType: 'high_value_deposit',
    amount: policy.highValueDepositKes,
    policySnapshot: {
      thresholdKes: policy.highValueBidThresholdKes,
      depositKes: policy.highValueDepositKes,
    },
  });
  if (hold.status === 'held' || hold.status === 'applied') return { hold, alreadyHeld: true };
  const user = await findById('users', userId);
  const result = await initiateBidSecurity({
    auctionId,
    userId,
    phone: user?.phone,
    amount: policy.highValueDepositKes,
    registrationId: registration.id,
    holdId: hold.id,
    holdType: 'high_value_deposit',
  });
  if (!result.success) {
    await update('auction_security_holds', hold.id, { status: 'failed' }).catch(() => {});
    throw Object.assign(new Error(result.message || 'Unable to initiate high-value deposit'), { status: 502 });
  }
  return { ...result, hold: await findById('auction_security_holds', hold.id) };
}

export async function settleAuctionSecurityCallback({ checkoutRequestID, success, receipt }) {
  const { data, error } = await getSupabase().rpc('kayad_settle_auction_security_hold_atomic', {
    p_checkout_request_id: checkoutRequestID,
    p_success: Boolean(success),
    p_receipt: receipt || null,
  });
  if (error) throw error;
  return data;
}

export async function reconcileAuctionSecurityHolds({ auctionId, outcomeId, winnerUserId }) {
  const { data, error } = await getSupabase().rpc('kayad_reconcile_auction_security_holds_atomic', {
    p_auction_id: auctionId,
    p_outcome_id: outcomeId,
    p_winner_user_id: winnerUserId || null,
  });
  if (error) throw error;
  return data;
}

export async function getAuctionSecurityHold({ auctionId, userId, holdType }) {
  return findOne('auction_security_holds', { auction_id: auctionId, bidder_id: userId, hold_type: holdType });
}

export async function forfeitAuctionWinnerSecurityHolds({ outcomeId, actorId }) {
  const { data, error } = await getSupabase().rpc('kayad_forfeit_auction_winner_security_holds_atomic', {
    p_outcome_id: outcomeId, p_actor_id: actorId || null,
  });
  if (error) throw error;
  return data;
}
