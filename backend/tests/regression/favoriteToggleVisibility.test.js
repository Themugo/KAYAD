// Saved-vehicle toggle visibility contract: hidden listings cannot be newly saved,
// while an existing saved item remains removable after moderation/deletion.
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

let car;
let existing;
const Favorite = {
  findOne: jest.fn(async () => existing),
  create: jest.fn(async () => ({})),
};
const Car = {
  findById: jest.fn(() => ({ select: jest.fn(async () => car) })),
  findByIdAndUpdate: jest.fn(async () => ({})),
};
jest.unstable_mockModule("../../models/Favorite.js", () => ({ default: Favorite }));
jest.unstable_mockModule("../../models/Car.js", () => ({ default: Car }));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: jest.fn() }));

const { toggleFavorite } = await import("../../controllers/favoriteController.js");
const run = async () => {
  const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await toggleFavorite({ params: { carId: "car-1" }, user: { id: "user-1" } }, res);
  return res;
};

beforeEach(() => {
  car = { title: "Toyota", price: 1000000, images: [], brand: "Toyota", status: "available" };
  existing = null;
  Favorite.findOne.mockClear();
  Favorite.create.mockClear();
  Car.findById.mockClear();
  Car.findByIdAndUpdate.mockClear();
});

describe("toggleFavorite public listing visibility", () => {
  it.each(["pending", "hidden", "draft", "rejected", "reserved", undefined])("refuses a new favorite for %s listings", async (status) => {
    car.status = status;
    const res = await run();
    expect(res.statusCode).toBe(404);
    expect(Favorite.create).not.toHaveBeenCalled();
    expect(Car.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("refuses a new favorite for a soft-deleted listing", async () => {
    car.deletedAt = new Date().toISOString();
    const res = await run();
    expect(res.statusCode).toBe(404);
    expect(Favorite.create).not.toHaveBeenCalled();
  });

  it("allows a public available listing to be saved", async () => {
    const res = await run();
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, favorited: true });
    expect(Favorite.create).toHaveBeenCalledWith(expect.objectContaining({ user: "user-1", car: "car-1" }));
    expect(Car.findByIdAndUpdate).toHaveBeenCalledWith("car-1", { $inc: { favoritesCount: 1 } });
  });

  it("allows an existing favorite to be removed after its listing becomes hidden", async () => {
    car.status = "hidden";
    existing = { deleteOne: jest.fn(async () => ({})) };
    const res = await run();
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, favorited: false });
    expect(existing.deleteOne).toHaveBeenCalled();
    expect(Favorite.create).not.toHaveBeenCalled();
  });
});
