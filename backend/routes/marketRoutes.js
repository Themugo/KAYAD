import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { authRole } from "../middleware/authRole.js";
import { validateObjectId, validateQuery, analyticsQuerySchema } from "../middleware/validate.js";
import Car from "../models/Car.js";
import { getMarketPulse, getDealerInsights } from "../services/marketIntel.service.js";

const router = Router();

router.get(
  "/pulse/:carId",
  validateObjectId,
  asyncHandler(async (req, res) => {
    const car = await Car.findById(req.params.carId)
      .select("title brand year price mileage views createdAt images status")
      .lean();
    if (!car) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }
    const pulse = await getMarketPulse(req.params.carId, car);
    res.json({ success: true, data: pulse });
  }),
);

router.get(
  "/trends",
  validateQuery(analyticsQuerySchema),
  asyncHandler(async (req, res) => {
    const { brand, days = 90 } = req.query;
    const since = new Date(Date.now() - Number(days) * 86400000);
    const match = { createdAt: { $gte: since } };
    if (brand) match.brand = brand;
    const cars = await Car.find(match).select("brand price year createdAt").lean();
    const byBrand = {};
    cars.forEach((c) => {
      if (!byBrand[c.brand]) byBrand[c.brand] = { count: 0, totalPrice: 0 };
      byBrand[c.brand].count++;
      byBrand[c.brand].totalPrice += c.price;
    });
    const trends = Object.entries(byBrand).map(([b, d]) => ({
      brand: b,
      count: d.count,
      avgPrice: Math.round(d.totalPrice / d.count),
    }));
    res.json({ success: true, data: trends, totalCars: cars.length, period: `${days}d` });
  }),
);

router.get(
  "/dealer/insights",
  authenticate,
  authRole(["dealer", "admin", "superadmin"]),
  validateQuery(analyticsQuerySchema),
  asyncHandler(async (req, res) => {
    const dealerId =
      req.user.role === "admin" || req.user.role === "superadmin" ? req.query.dealerId || req.user._id : req.user._id;
    const insights = await getDealerInsights(dealerId);
    res.json({ success: true, data: insights });
  }),
);

export default router;
