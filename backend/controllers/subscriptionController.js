const unavailable = (res) => res.status(501).json({
  success: false,
  code: "DEALER_SUBSCRIPTION_UNAVAILABLE",
  message: "Dealer subscription management is not available because the authoritative migration chain does not define a dealer subscription contract.",
});

export const getPlans = async (req, res) => unavailable(res);
export const getSubscription = async (req, res) => unavailable(res);
export const upgradeSubscription = async (req, res) => unavailable(res);
export const cancelSubscription = async (req, res) => unavailable(res);
export const reactivateSubscription = async (req, res) => unavailable(res);
export const checkUsageLimits = async (req, res) => unavailable(res);
export const getAllSubscriptions = async (req, res) => unavailable(res);
export const getSubscriptionAnalytics = async (req, res) => unavailable(res);
