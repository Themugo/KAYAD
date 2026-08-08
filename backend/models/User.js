import { createModel } from "./_base.js";

const User = createModel("User");

// routes/adminRoutes.js calls User.softDelete(id, actorId) - same gap,
// same fix as models/Car.js's softDelete added alongside this.
User.softDelete = async (id, actorId) => {
  return User.findByIdAndUpdate(id, { deletedAt: new Date(), deletedBy: actorId });
};

// Mongoose-style updateOne(filter, update). routes/adminRoutes.js has
// exactly one call site (confirmed via grep - not a general-purpose
// need), and it uses MongoDB's aggregation-pipeline update syntax (an
// array of stages) specifically to clamp listingCount/
// trialListingsUsed to a minimum of 0 after a $inc -1 that could have
// taken either negative:
//   User.updateOne({ _id: dealerId }, [
//     { $set: { listingCount: { $max: ["$listingCount", 0] },
//                trialListingsUsed: { $max: ["$trialListingsUsed", 0] } } }
//   ])
// Implementing a general aggregation-pipeline interpreter for this one
// caller would be a large, speculative undertaking for a shape nothing
// else in this codebase uses. Instead: detect this specific
// { $set: { field: { $max: ["$field", floor] } } } shape and apply it
// directly - clamp each named field to be no lower than the given
// floor. Falls back to a plain findOneAndUpdate for the (currently
// unused) case of a non-pipeline update, so this doesn't silently
// misbehave if a future caller passes a normal object instead.
User.updateOne = async (filter, update) => {
  if (Array.isArray(update)) {
    const doc = await User.findOne(filter);
    if (!doc) return { modifiedCount: 0 };
    const clamped = {};
    for (const stage of update) {
      const setClause = stage?.$set || {};
      for (const [field, expr] of Object.entries(setClause)) {
        if (expr && typeof expr === "object" && Array.isArray(expr.$max)) {
          const [ref, floor] = expr.$max;
          const currentVal = typeof ref === "string" && ref.startsWith("$")
            ? (doc[ref.slice(1)] ?? 0)
            : ref;
          clamped[field] = Math.max(currentVal, floor);
        }
      }
    }
    if (Object.keys(clamped).length === 0) return { modifiedCount: 0 };
    await User.findByIdAndUpdate(doc.id, clamped);
    return { modifiedCount: 1 };
  }
  return User.findOneAndUpdate(filter, update);
};

export default User;
