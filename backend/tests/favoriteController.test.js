import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// ── Model mocks ──
const mockCarFindById = jest.fn();
const mockCarFindByIdAndUpdate = jest.fn();

const mockLean = jest.fn();
const mockSelect = jest.fn(() => ({ lean: mockLean }));

const mockFavoriteFind = jest.fn();
const mockFavoriteFindOne = jest.fn();
const mockFavoriteFindOneAndUpdate = jest.fn();
const mockFavoriteFindOneAndDelete = jest.fn();
const mockFavoriteCountDocuments = jest.fn();
const mockFavoriteCreate = jest.fn();

const mockSort = jest.fn();
const mockSkip = jest.fn();
const mockLimit = jest.fn();
const mockPopulate = jest.fn();

jest.unstable_mockModule("../models/Favorite.js", () => ({
  default: {
    find: mockFavoriteFind,
    findOne: mockFavoriteFindOne,
    findOneAndUpdate: mockFavoriteFindOneAndUpdate,
    findOneAndDelete: mockFavoriteFindOneAndDelete,
    countDocuments: mockFavoriteCountDocuments,
    create: mockFavoriteCreate,
  },
}));
jest.unstable_mockModule("../models/Car.js", () => ({
  default: {
    findById: mockCarFindById,
    findByIdAndUpdate: mockCarFindByIdAndUpdate,
  },
}));

describe("favoriteController", () => {
  let ctrl;

  beforeAll(async () => {
    ctrl = await import("../controllers/favoriteController.js");
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default chain for Car.findById().select().lean()
    mockLean.mockResolvedValue(null);
    mockSelect.mockReturnValue({ lean: mockLean });
    mockCarFindById.mockReturnValue({ select: mockSelect });
    // Default chain for Favorite.find().sort().skip().limit()...
    mockPopulate.mockReturnValue({ lean: mockLean });
    mockLimit.mockReturnValue({ populate: mockPopulate, lean: mockLean });
    mockSkip.mockReturnValue({ limit: mockLimit });
    mockSort.mockReturnValue({ skip: mockSkip });
    mockFavoriteFind.mockReturnValue({ sort: mockSort });
    // Default: no favorite found (plain await, no .lean)
    mockFavoriteFindOne.mockResolvedValue(null);
  });

  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const mockReq = (overrides = {}) => ({
    user: { id: "user1" },
    params: {},
    query: {},
    body: {},
    ...overrides,
  });

  // ─── getFavorites ───────────────────────────────────────

  describe("getFavorites", () => {
    it("returns paginated favorites", async () => {
      mockLean.mockResolvedValue([
        { _id: "fav1", car: { title: "Car1", price: 100000 }, notifyOnPriceDrop: true },
      ]);
      mockFavoriteCountDocuments.mockResolvedValue(1);

      const res = mockRes();
      await ctrl.getFavorites(mockReq({ query: { page: "1", limit: "20" } }), res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          favorites: [{ title: "Car1", price: 100000, _favoriteId: "fav1", notifyOnPriceDrop: true }],
          total: 1,
        }),
      );
    });

    it("returns 500 on error", async () => {
      mockLean.mockRejectedValue(new Error("fail"));
      const res = mockRes();
      await ctrl.getFavorites(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── addFavorite ────────────────────────────────────────

  describe("addFavorite", () => {
    it("adds favorite and increments count", async () => {
      mockLean.mockResolvedValue({ _id: "car1", title: "Car", price: 100000, brand: "Toyota", images: [{ url: "img.jpg" }] });
      mockFavoriteFindOneAndUpdate.mockResolvedValue({ _id: "fav1" });

      const res = mockRes();
      await ctrl.addFavorite(mockReq({ params: { carId: "car1" } }), res);

      expect(mockCarFindById).toHaveBeenCalledWith("car1");
      expect(mockCarFindByIdAndUpdate).toHaveBeenCalledWith("car1", { $inc: { favoritesCount: 1 } });
      expect(res.json).toHaveBeenCalledWith({ success: true, favorited: true, notifyOnPriceDrop: false, message: expect.any(String) });
    });

    it("returns 404 if car not found", async () => {
      mockLean.mockResolvedValue(null);
      const res = mockRes();
      await ctrl.addFavorite(mockReq({ params: { carId: "bad" } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("handles duplicate key error as already favorited", async () => {
      mockLean.mockResolvedValue({ _id: "car1", title: "Car" });
      const dupErr = new Error("dup");
      dupErr.code = 11000;
      mockFavoriteFindOneAndUpdate.mockRejectedValue(dupErr);

      const res = mockRes();
      await ctrl.addFavorite(mockReq({ params: { carId: "car1" } }), res);
      expect(res.json).toHaveBeenCalledWith({ success: true, favorited: true, message: "Already in favourites" });
    });

    it("returns 500 on other error", async () => {
      mockLean.mockRejectedValue(new Error("fail"));
      const res = mockRes();
      await ctrl.addFavorite(mockReq({ params: { carId: "car1" } }), res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── removeFavorite ─────────────────────────────────────

  describe("removeFavorite", () => {
    it("removes and decrements if existed", async () => {
      mockFavoriteFindOneAndDelete.mockResolvedValue({ _id: "fav1" });
      const res = mockRes();
      await ctrl.removeFavorite(mockReq({ params: { carId: "car1" } }), res);
      expect(mockCarFindByIdAndUpdate).toHaveBeenCalledWith("car1", { $inc: { favoritesCount: -1 } });
      expect(res.json).toHaveBeenCalledWith({ success: true, favorited: false, message: expect.any(String) });
    });

    it("does not decrement if no favorite existed", async () => {
      mockFavoriteFindOneAndDelete.mockResolvedValue(null);
      const res = mockRes();
      await ctrl.removeFavorite(mockReq({ params: { carId: "car1" } }), res);
      expect(mockCarFindByIdAndUpdate).not.toHaveBeenCalled();
    });

    it("returns 500 on error", async () => {
      mockFavoriteFindOneAndDelete.mockRejectedValue(new Error("fail"));
      const res = mockRes();
      await ctrl.removeFavorite(mockReq({ params: { carId: "car1" } }), res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── toggleFavorite ─────────────────────────────────────

  describe("toggleFavorite", () => {
    it("removes if already favorited", async () => {
      const mockDeleteOne = jest.fn().mockResolvedValue({});
      mockLean.mockResolvedValue({ _id: "car1", title: "Car", price: 100000, brand: "Toyota" });
      mockFavoriteFindOne.mockResolvedValue({ _id: "fav1", deleteOne: mockDeleteOne });

      const res = mockRes();
      await ctrl.toggleFavorite(mockReq({ params: { carId: "car1" } }), res);

      expect(mockDeleteOne).toHaveBeenCalled();
      expect(mockCarFindByIdAndUpdate).toHaveBeenCalledWith("car1", { $inc: { favoritesCount: -1 } });
      expect(res.json).toHaveBeenCalledWith({ success: true, favorited: false, message: expect.any(String) });
    });

    it("adds if not favorited", async () => {
      mockLean.mockResolvedValue({ _id: "car1", title: "Car", price: 100000, brand: "Toyota", images: [{ url: "img.jpg" }] });
      mockFavoriteFindOne.mockResolvedValue(null);
      mockFavoriteCreate.mockResolvedValue({ _id: "fav1" });

      const res = mockRes();
      await ctrl.toggleFavorite(mockReq({ params: { carId: "car1" } }), res);

      expect(mockFavoriteCreate).toHaveBeenCalled();
      expect(mockCarFindByIdAndUpdate).toHaveBeenCalledWith("car1", { $inc: { favoritesCount: 1 } });
      expect(res.json).toHaveBeenCalledWith({ success: true, favorited: true, notifyOnPriceDrop: false, message: expect.any(String) });
    });

    it("returns 404 if car not found", async () => {
      mockLean.mockResolvedValue(null);
      const res = mockRes();
      await ctrl.toggleFavorite(mockReq({ params: { carId: "bad" } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 500 on error", async () => {
      mockLean.mockRejectedValue(new Error("fail"));
      const res = mockRes();
      await ctrl.toggleFavorite(mockReq({ params: { carId: "car1" } }), res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── updateFavoritePriceAlert ───────────────────────────

  describe("updateFavoritePriceAlert", () => {
    it("updates price alert setting", async () => {
      const existing = { notifyOnPriceDrop: false, save: jest.fn().mockResolvedValue() };
      mockFavoriteFindOne.mockResolvedValue(existing);

      const res = mockRes();
      await ctrl.updateFavoritePriceAlert(
        mockReq({ params: { carId: "car1" }, body: { notifyOnPriceDrop: true } }),
        res,
      );

      expect(existing.notifyOnPriceDrop).toBe(true);
      expect(existing.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, notifyOnPriceDrop: true });
    });

    it("returns 404 if favorite not found", async () => {
      mockFavoriteFindOne.mockResolvedValue(null);
      const res = mockRes();
      await ctrl.updateFavoritePriceAlert(
        mockReq({ params: { carId: "car1" }, body: { notifyOnPriceDrop: true } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 500 on error", async () => {
      mockFavoriteFindOne.mockRejectedValue(new Error("fail"));
      const res = mockRes();
      await ctrl.updateFavoritePriceAlert(
        mockReq({ params: { carId: "car1" } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
