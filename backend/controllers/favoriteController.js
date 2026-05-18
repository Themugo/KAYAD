// backend/controllers/favoriteController.js
// Uses the Favorite collection (separate model — no embedded User.favorites needed)
import Favorite from "../models/Favorite.js";
import Car      from "../models/Car.js";

// GET /api/favorites
export const getFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate({
        path: "car",
        select: "title price images brand model year fuel transmission mileage location auctionStatus currentBid bidsCount views favoritesCount isPromoted isVerifiedDealer",
      })
      .lean();

    const cars = favorites.map(f => f.car).filter(Boolean);
    res.json({ success: true, favorites: cars, total: cars.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/favorites/:carId
export const addFavorite = async (req, res) => {
  try {
    const { carId } = req.params;
    const car = await Car.findById(carId).select("title price images brand").lean();
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    await Favorite.findOneAndUpdate(
      { user: req.user.id, car: carId },
      {
        user: req.user.id, car: carId,
        carSnapshot: { title: car.title, price: car.price, brand: car.brand, image: car.images?.[0]?.url || car.images?.[0] || null },
      },
      { upsert: true, new: true }
    );

    await Car.findByIdAndUpdate(carId, { $inc: { favoritesCount: 1 } });
    res.json({ success: true, favorited: true, message: "Added to favourites" });
  } catch (err) {
    if (err.code === 11000) return res.json({ success: true, favorited: true, message: "Already in favourites" });
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/favorites/:carId
export const removeFavorite = async (req, res) => {
  try {
    const { carId } = req.params;
    const deleted = await Favorite.findOneAndDelete({ user: req.user.id, car: carId });
    if (deleted) await Car.findByIdAndUpdate(carId, { $inc: { favoritesCount: -1 } });
    res.json({ success: true, favorited: false, message: "Removed from favourites" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/favorites/:carId/toggle
export const toggleFavorite = async (req, res) => {
  try {
    const { carId } = req.params;
    const car = await Car.findById(carId).select("title price images brand").lean();
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const existing = await Favorite.findOne({ user: req.user.id, car: carId });

    if (existing) {
      await existing.deleteOne();
      await Car.findByIdAndUpdate(carId, { $inc: { favoritesCount: -1 } });
      return res.json({ success: true, favorited: false, message: "Removed from favourites" });
    }

    await Favorite.create({
      user: req.user.id, car: carId,
      carSnapshot: { title: car.title, price: car.price, brand: car.brand, image: car.images?.[0]?.url || car.images?.[0] || null },
    });
    await Car.findByIdAndUpdate(carId, { $inc: { favoritesCount: 1 } });
    return res.json({ success: true, favorited: true, message: "Added to favourites" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
