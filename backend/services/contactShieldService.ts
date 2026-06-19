import ContactShield from "../models/ContactShield.ts";
import Escrow from "../models/Escrow.ts";
import Car from "../models/Car.ts";

// =============================
// 🔒 CONTACT PATTERNS TO BLOCK
// =============================

const CONTACT_PATTERNS = [
  // Phone numbers
  /\b\d{10}\b/g,
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  /\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  // WhatsApp
  /whatsapp\.com\/send\?phone=\d+/gi,
  /wa\.me\/\d+/gi,
  /whatsapp:/gi,

  // Telegram
  /t\.me\/\w+/gi,
  /telegram\.me\/\w+/gi,
  /telegram:/gi,

  // Other messaging
  /call me/i,
  /text me/i,
  /dm me/i,
  /my number/i,
  /contact me directly/i,
  /off platform/i,
  /outside this/i,
];

// =============================
// 🔒 CHECK IF SHIELD IS ACTIVE
// =============================

export const isShieldActive = async (buyerId, dealerId, carId) => {
  const shield = await ContactShield.findOne({
    buyer: buyerId,
    dealer: dealerId,
    car: carId,
    status: "active",
  });

  return !!shield;
};

// =============================
// 🔒 CREATE SHIELD
// =============================

export const createShield = async (buyerId, dealerId, carId) => {
  const existing = await ContactShield.findOne({
    buyer: buyerId,
    dealer: dealerId,
    car: carId,
  });

  if (existing) {
    return existing;
  }

  return await ContactShield.create({
    buyer: buyerId,
    dealer: dealerId,
    car: carId,
    status: "active",
  });
};

// =============================
// 🔓 UNLOCK SHIELD
// =============================

export const unlockShield = async (buyerId, dealerId, carId, reason, referenceId) => {
  const shield = await ContactShield.findOne({
    buyer: buyerId,
    dealer: dealerId,
    car: carId,
    status: "active",
  });

  if (!shield) {
    return null;
  }

  shield.status = "unlocked";
  shield.unlockedAt = new Date();
  shield.unlockedBy = reason;

  if (reason === "escrow_initiated") {
    shield.escrowId = referenceId;
  } else if (reason === "offer_submitted") {
    shield.offerId = referenceId;
  }

  await shield.save();
  return shield;
};

// =============================
// 🔍 SCAN MESSAGE FOR CONTACT INFO
// =============================

export const scanMessageForContactInfo = (message) => {
  const blockedMessages = [];
  const detectedPatterns = [];

  for (const pattern of CONTACT_PATTERNS) {
    const matches = message.match(pattern);
    if (matches) {
      for (const match of matches) {
        blockedMessages.push({
          type: "contact_info",
          content: match,
          pattern: pattern.toString(),
        });
        detectedPatterns.push(pattern.toString());
      }
    }
  }

  return {
    hasContactInfo: blockedMessages.length > 0,
    blockedMessages,
    detectedPatterns,
  };
};

// =============================
// 🔒 SANITIZE MESSAGE
// =============================

export const sanitizeMessage = (message) => {
  let sanitized = message;

  for (const pattern of CONTACT_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }

  return sanitized;
};

// =============================
// 📊 LOG CONTACT ATTEMPT
// =============================

export const logContactAttempt = async (buyerId, dealerId, carId, message) => {
  const shield = await ContactShield.findOne({
    buyer: buyerId,
    dealer: dealerId,
    car: carId,
  });

  if (!shield) {
    return null;
  }

  const scanResult = scanMessageForContactInfo(message);

  if (scanResult.hasContactInfo) {
    shield.contactAttempts += 1;
    shield.lastContactAttemptAt = new Date();

    for (const blocked of scanResult.blockedMessages) {
      shield.blockedMessages.push({
        type: blocked.type,
        content: blocked.content,
        detectedAt: new Date(),
        pattern: blocked.pattern,
      });
    }

    await shield.save();
  }

  return shield;
};

// =============================
// 🎯 GET ESCROW INCENTIVES
// =============================

export const getEscrowIncentives = (carId) => {
  return {
    buyerProtection: {
      title: "Buyer Protection",
      description: "Full refund if vehicle doesn't match description",
      icon: "🛡️",
    },
    vehicleVerification: {
      title: "Vehicle Verification",
      description: "Professional inspection before purchase",
      icon: "✅",
    },
    disputeResolution: {
      title: "Dispute Resolution",
      description: "Fair resolution process for any issues",
      icon: "⚖️",
    },
    transferSupport: {
      title: "Transfer Support",
      description: "Assistance with ownership transfer process",
      icon: "📋",
    },
  };
};

// =============================
// 🔒 CHECK IF CONTACT ALLOWED
// =============================

export const isContactAllowed = async (buyerId, dealerId, carId) => {
  const shield = await ContactShield.findOne({
    buyer: buyerId,
    dealer: dealerId,
    car: carId,
  });

  if (!shield) {
    // No shield exists, create one
    await createShield(buyerId, dealerId, carId);
    return false;
  }

  return shield.status === "unlocked";
};
