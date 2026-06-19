import Payment from "../models/Payment.ts";

export const calculateRevenue = async ({ startDate, endDate } = {}) => {
  const match = {
    status: "success",
  };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const revenue = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    total: revenue[0]?.total || 0,
    transactions: revenue[0]?.count || 0,
  };
};
