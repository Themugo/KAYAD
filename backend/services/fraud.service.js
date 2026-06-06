const LIMITS = {
  MAX_BID: 100_000_000,
  BASE_MIN_INTERVAL: 1000,
  MAX_BIDS_PER_MIN: 20,
  SPIKE_MULTIPLIER_LOW: 3,
  SPIKE_MULTIPLIER_HIGH: 2,
  CONSECUTIVE_BIDS_WINDOW: 5000,
};

export const detectFraud = ({
  bid,
  previousBid = 0,
  lastBidTime = 0,
  now = Date.now(),
  userBidsCount = 0,
  bidsLastMinute = 0,
  auctionAverageBid = 0,
  previousBidderId = null,
  currentUserId = null,
  bidHistory = [],
}) => {
  let score = 0;
  let reasons = [];

  if (bid > LIMITS.MAX_BID) {
    score += 3;
    reasons.push("Unrealistic bid amount");
  }

  const multiplier = previousBid > 1_000_000 ? LIMITS.SPIKE_MULTIPLIER_HIGH : LIMITS.SPIKE_MULTIPLIER_LOW;

  if (previousBid > 0 && bid > previousBid * multiplier) {
    score += 2;
    reasons.push("Abnormal bid spike");
  }

  const dynamicInterval = previousBid > 1_000_000 ? 2000 : LIMITS.BASE_MIN_INTERVAL;

  if (lastBidTime && now - lastBidTime < dynamicInterval) {
    score += 2;
    reasons.push("Bidding too fast");
  }

  if (bidsLastMinute > LIMITS.MAX_BIDS_PER_MIN) {
    score += 2;
    reasons.push("Too many bids per minute");
  }

  if (userBidsCount > 100) {
    score += 1;
    reasons.push("Unusual bidding volume");
  }

  if (auctionAverageBid > 0 && bid > auctionAverageBid * 3) {
    score += 2;
    reasons.push("Far above average bid range");
  }

  if (previousBidderId && currentUserId && previousBidderId === currentUserId) {
    const recentBids = bidHistory.filter(
      (b) => b.userId === currentUserId && now - b.time < LIMITS.CONSECUTIVE_BIDS_WINDOW,
    );
    if (recentBids.length >= 2) {
      score += 2;
      reasons.push("Consecutive self-bidding");
    }
  }

  if (bidHistory.length >= 3) {
    const lastThree = bidHistory.slice(-3);
    const increments = [];
    for (let i = 1; i < lastThree.length; i++) {
      increments.push(lastThree[i].bid - lastThree[i - 1].bid);
    }
    if (increments.length >= 2) {
      const avgIncrement = increments.reduce((a, b) => a + b, 0) / increments.length;
      const pattern = increments.every((inc) => Math.abs(inc - avgIncrement) < avgIncrement * 0.1);
      if (pattern && avgIncrement > 0) {
        score += 1;
        reasons.push("Suspicious bid increment pattern");
      }
    }
  }

  const hour = new Date(now).getHours();
  if (hour >= 1 && hour <= 5) {
    score += 1;
    reasons.push("Unusual bidding hour");
  }

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
      cooldown: 30,
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
