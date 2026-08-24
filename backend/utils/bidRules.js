// Canonical bid-validation rules for the KAYAD auction engine.
// Single source of truth for minimum-increment tiers — every bidding
// entry point (REST, SMS, auto-bid) must use these, never local copies.

export const getMinIncrement = (currentBid) => {
  const bid = Number(currentBid) || 0;
  if (bid < 100000) return 1000;
  if (bid < 500000) return 5000;
  if (bid < 2000000) return 10000;
  return 25000;
};

export const getMinNextBid = (currentBid) => (Number(currentBid) || 0) + getMinIncrement(currentBid);
