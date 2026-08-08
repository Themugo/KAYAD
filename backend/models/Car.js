import { createModel } from "./_base.js";

const Car = createModel("Car");

// controllers/carController.js and routes/adminRoutes.js (2 call
// sites) call Car.softDelete(id, actorId) - doesn't exist anywhere,
// same class of gap as models/Bid.js and models/RefreshToken.js this
// session. Sets deletedAt/deletedBy rather than actually removing the
// row - confirmed cars already has deleted_at, and deletedBy is a real,
// separately-confirmed field (controllers/duplicateController.js does
// `car.deletedBy = req.user.id` directly).
Car.softDelete = async (id, actorId) => {
  return Car.findByIdAndUpdate(id, { deletedAt: new Date(), deletedBy: actorId });
};

export default Car;
