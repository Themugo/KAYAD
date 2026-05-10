import Car from "../models/Car.js";

export const getDealerStats = async (req, res) => {
  try {
    const dealerId = req.user.id;

    const stats = await Car.aggregate([
      { $match: { dealer: dealerId } },
      {
        $group: {
          _id: null,
          totalCars: { $sum: 1 },
          totalViews: { $sum: "$views" },
          totalBids: { $sum: "$bidsCount" },
          avgPrice: { $avg: "$price" },
        },
      },
    ]);

    res.json({
      success: true,
      data: stats[0] || {},
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};