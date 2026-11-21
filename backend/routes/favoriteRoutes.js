// backend/routes/favoriteRoutes.js
import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateQuery, carListQuerySchema } from "../middleware/validate.js";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  updateFavoritePriceAlert,
} from "../controllers/favoriteController.js";

const router = express.Router();
router.use(protect);

router.get("/", validateQuery(carListQuerySchema), asyncHandler(getFavorites));
router.post("/:carId", asyncHandler(addFavorite));
router.delete("/:carId", asyncHandler(removeFavorite));
router.post("/:carId/toggle", asyncHandler(toggleFavorite));
router.put("/:carId/price-alert", asyncHandler(updateFavoritePriceAlert));

export default router;
