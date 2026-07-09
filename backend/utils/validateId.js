// backend/utils/validateId.js
// Safe UUID validation for controllers.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isValidId = (id) => typeof id === "string" && UUID_RE.test(id);

export const requireValidId = (req, res, id, label = "ID") => {
  if (!isValidId(id)) {
    res.status(400).json({ success: false, message: `Invalid ${label} format` });
    return true;
  }
  return false;
};
