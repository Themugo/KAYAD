import { Router } from "express";
import { authLimiter } from "../middleware/rateLimiter.js";
import { validateQuery, analyticsQuerySchema } from "../middleware/validate.js";

// Import v2 routes (future implementation)
// import authRoutesV2 from "./v2/authRoutes.js";
// import carRoutesV2 from "./v2/carRoutes.js";

const router = Router();

// Placeholder for v2 routes
// This file is prepared for future API versioning
// When v2 is implemented, import and use v2-specific routes here

router.get("/", validateQuery(analyticsQuerySchema), (req, res) => {
  res.json({
    success: true,
    message: "KAYAD API v2 - Coming Soon",
    version: "2.0.0",
    documentation: "/api-docs",
  });
});

export default router;
