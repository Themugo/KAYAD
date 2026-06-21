import {
  isShieldActive,
  scanMessageForContactInfo,
  sanitizeMessage,
  logContactAttempt,
  isContactAllowed,
} from "../services/contactShieldService.js";

/**
 * Middleware to check if contact is allowed before allowing message
 */
export const checkContactShield = async (req, res, next) => {
  try {
    const { carId, dealerId } = req.body;
    const buyerId = req.user?.id || req.user?._id;

    if (!buyerId || !dealerId || !carId) {
      return next();
    }

    const allowed = await isContactAllowed(buyerId, dealerId, carId);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message:
          "Contact information is protected. Please submit an offer or initiate escrow to unlock contact details.",
        shieldActive: true,
        incentives: {
          buyerProtection: "Full refund if vehicle doesn't match description",
          vehicleVerification: "Professional inspection before purchase",
          disputeResolution: "Fair resolution process for any issues",
          transferSupport: "Assistance with ownership transfer process",
        },
      });
    }

    next();
  } catch (error) {
    console.error("Contact shield check error:", error);
    next(); // Allow request if shield check fails
  }
};

/**
 * Middleware to sanitize messages for contact information
 */
export const sanitizeContactInfo = async (req, res, next) => {
  try {
    if (req.body.message) {
      const scanResult = scanMessageForContactInfo(req.body.message);

      if (scanResult.hasContactInfo) {
        // Log the attempt
        const { carId, dealerId } = req.body;
        const buyerId = req.user?.id || req.user?._id;

        if (buyerId && dealerId && carId) {
          await logContactAttempt(buyerId, dealerId, carId, req.body.message);
        }

        // Sanitize the message
        req.body.message = sanitizeMessage(req.body.message);

        return res.status(400).json({
          success: false,
          message: "Contact information is not allowed in messages. Please use the platform for all communication.",
          sanitizedMessage: req.body.message,
          detectedPatterns: scanResult.detectedPatterns,
        });
      }
    }

    next();
  } catch (error) {
    console.error("Message sanitization error:", error);
    next(); // Allow request if sanitization fails
  }
};

/**
 * Middleware to create shield on car view
 */
export const createShieldOnView = async (req, res, next) => {
  try {
    const { carId } = req.params;
    const buyerId = req.user?.id || req.user?._id;

    if (buyerId && carId) {
      const car = await req.models.Car.findById(carId).populate("dealer");
      if (car && car.dealer) {
        const { createShield } = await import("../services/contactShieldService.js");
        await createShield(buyerId, car.dealer._id, carId);
      }
    }

    next();
  } catch (error) {
    console.error("Shield creation error:", error);
    next(); // Allow request if shield creation fails
  }
};
