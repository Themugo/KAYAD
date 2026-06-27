import express from "express";
import rateLimit from "express-rate-limit";
import { submitContact, listContacts, markRead } from "../controllers/contactController.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { validateObjectId, validateQuery, analyticsQuerySchema } from "../middleware/validate.js";

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many messages. Try again later." },
});

router.post("/", contactLimiter, submitContact);
router.get("/", protect, adminOnly, validateQuery(analyticsQuerySchema), listContacts);
router.patch("/:id/read", protect, adminOnly, validateObjectId, markRead);

export default router;
