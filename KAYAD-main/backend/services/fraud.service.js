// =============================
// 🧠 FRAUD DETECTION ENGINE (ADVANCED)
// =============================

const LIMITS = {
  MAX_BID: 100_000_000,
  BASE_MIN_INTERVAL: 1000,
  MAX_BIDS_PER_MIN: 20,
  SPIKE_MULTIPLIER_LOW: 3,   // for low price ranges
  SPIKE_MULTIPLIER_HIGH: 2,  // for high price ranges
};

// =============================
// 🧠 MAIN DETECTOR
// =============================
export const detectFraud = ({
  bid,
  previousBid = 0,
  lastBidTime = 0,
  now = Date.now(),
  userBidsCount = 0,
  bidsLastMinute = 0,
  auctionAverageBid = 0,
}) => {
  let score = 0;
  let reasons = [];

  // =============================
  // 1️⃣ EXTREME VALUE CHECK
  // =============================
  if (bid > LIMITS.MAX_BID) {
    score += 3;
    reasons.push("Unrealistic bid amount");
  }

  // =============================
  // 2️⃣ ADAPTIVE SPIKE CHECK
  // =============================
  const multiplier =
    previousBid > 1_000_000
      ? LIMITS.SPIKE_MULTIPLIER_HIGH
      : LIMITS.SPIKE_MULTIPLIER_LOW;

  if (previousBid > 0 && bid > previousBid * multiplier) {
    score += 2;
    reasons.push("Abnormal bid spike");
  }

  // =============================
  // 3️⃣ RAPID BIDDING (DYNAMIC)
  // =============================
  const dynamicInterval =
    previousBid > 1_000_000 ? 2000 : LIMITS.BASE_MIN_INTERVAL;

  if (lastBidTime && now - lastBidTime < dynamicInterval) {
    score += 2;
    reasons.push("Bidding too fast");
  }

  // =============================
  // 4️⃣ HIGH FREQUENCY (BOT SIGNAL)
  // =============================
  if (bidsLastMinute > LIMITS.MAX_BIDS_PER_MIN) {
    score += 2;
    reasons.push("Too many bids per minute");
  }

  // =============================
  // 5️⃣ USER BEHAVIOR (LONG SESSION)
  // =============================
  if (userBidsCount > 100) {
    score += 1;
    reasons.push("Unusual bidding volume");
  }

  // =============================
  // 6️⃣ DEVIATION FROM MARKET
  // =============================
  if (
    auctionAverageBid > 0 &&
    bid > auctionAverageBid * 3
  ) {
    score += 2;
    reasons.push("Far above average bid range");
  }

  // =============================
  // 🎯 DECISION ENGINE
  // =============================
  if (score >= 5) {
    return {
      flagged: true,
      severity: "high",
      action: "block",
      score,
      reasons,
    };
  }

  if (score >= 3) {
    return {
      flagged: true,
      severity: "medium",
      action: "cooldown",
      cooldown: 30, // seconds
      score,
      reasons,
    };
  }

  if (score >= 2) {
    return {
      flagged: true,
      severity: "low",
      action: "warn",
      score,
      reasons,
    };
  }

  return { flagged: false, score };
};