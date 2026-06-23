// backend/utils/validateId.js
// Safe ObjectId validation for controllers.
//
// Usage:
//   import { isValidId, requireValidId } from "../utils/validateId.js";
//
//   // Check only:
//   if (!isValidId(req.params.id)) return res.status(400).json(...)
//
//   // Check + auto-respond:
//   if (requireValidId(req, res, req.params.id)) return;
//   // ^ returns true if INVALID (already sent 400), false if valid

import mongoose from "mongoose";

export const isValidId = (id) =>
  typeof id === "string" && mongoose.Types.ObjectId.isValid(id) && /^[a-f0-9]{24}$/i.test(id);

/**
 * Validates an ObjectId param. If invalid, sends 400 and returns true.
 * If valid, returns false (continue processing).
 *
 * @param {object} req
 * @param {object} res
 * @param {string} id - The ID to validate
 * @param {string} [label="ID"] - Label for the error message
 * @returns {boolean} true if INVALID (response already sent), false if valid
 */
export const requireValidId = (req, res, id, label = "ID") => {
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: `Invalid ${label} format` });
    return true;
  }
  return false;
};
