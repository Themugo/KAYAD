import mongoose from "mongoose";

export const validateObjectIdParams = (...paramNames) => (req, res, next) => {
  for (const name of paramNames) {
    const val = req.params[name];
    if (val && !mongoose.Types.ObjectId.isValid(val)) {
      return res.status(400).json({ success: false, message: `Invalid ${name}` });
    }
  }
  next();
};
