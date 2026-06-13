import Dispute from "../models/Dispute.js";
import Escrow from "../models/Escrow.js";
import { uploadImage as uploadToCloudinary } from "../config/cloudinary.js";

// =============================
// 📋 CREATE DISPUTE
// =============================

export const createDispute = async (req, res) => {
  try {
    const { escrowId, title, description, category } = req.body;
    const userId = req.user.id;

    if (!escrowId || !title || !description || !category) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Verify escrow exists and user is involved
    const escrow = await Escrow.findById(escrowId);
    if (!escrow) {
      return res.status(404).json({ success: false, message: "Escrow not found" });
    }

    if (escrow.buyer.toString() !== userId && escrow.seller.toString() !== userId) {
      return res.status(403).json({ success: false, message: "You are not involved in this escrow" });
    }

    if (["released", "refunded"].includes(escrow.status)) {
      return res.status(400).json({ success: false, message: "Cannot dispute finalized escrow" });
    }

    // Determine who the dispute is opened against
    const openedAgainst = escrow.buyer.toString() === userId ? escrow.seller : escrow.buyer;

    // Create dispute
    const dispute = new Dispute({
      escrow: escrowId,
      car: escrow.car,
      openedBy: userId,
      openedAgainst,
      title,
      description,
      category,
      openedAt: new Date(),
    });

    await dispute.save();

    // Update escrow status to disputed
    escrow.status = "disputed";
    escrow.disputedBy = userId;
    escrow.disputedAt = new Date();
    escrow.disputeReason = title;
    await escrow.save();

    res.json({ success: true, dispute });
  } catch (error) {
    console.error("Error creating dispute:", error);
    res.status(500).json({ success: false, message: "Failed to create dispute" });
  }
};

// =============================
// 📎 UPLOAD EVIDENCE
// =============================

export const uploadEvidence = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { type, description } = req.body;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Verify dispute exists and user is involved
    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      return res.status(404).json({ success: false, message: "Dispute not found" });
    }

    if (dispute.openedBy.toString() !== userId && dispute.openedAgainst.toString() !== userId) {
      return res.status(403).json({ success: false, message: "You are not involved in this dispute" });
    }

    if (dispute.status === "resolved" || dispute.status === "closed") {
      return res.status(400).json({ success: false, message: "Cannot add evidence to resolved dispute" });
    }

    // Upload file to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file, "dispute-evidence");

    // Determine evidence type
    const fileType = type || getFileType(req.file.mimetype);

    // Add evidence to dispute
    dispute.evidence.push({
      type: fileType,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      description,
      uploadedBy: userId,
      uploadedAt: new Date(),
    });

    await dispute.save();

    res.json({ success: true, evidence: dispute.evidence[dispute.evidence.length - 1] });
  } catch (error) {
    console.error("Error uploading evidence:", error);
    res.status(500).json({ success: false, message: "Failed to upload evidence" });
  }
};

// Helper function to determine evidence type from MIME type
function getFileType(mimeType) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("video/")) return "video";
  return "other";
}

// =============================
// ⚖️ RESOLVE DISPUTE
// =============================

export const resolveDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { decision, amount, sellerAmount, buyerAmount, reason } = req.body;
    const adminId = req.user.id;

    if (!decision) {
      return res.status(400).json({ success: false, message: "Decision is required" });
    }

    // Verify dispute exists
    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      return res.status(404).json({ success: false, message: "Dispute not found" });
    }

    if (dispute.status === "resolved" || dispute.status === "closed") {
      return res.status(400).json({ success: false, message: "Dispute already resolved" });
    }

    // Get escrow
    const escrow = await Escrow.findById(dispute.escrow);
    if (!escrow) {
      return res.status(404).json({ success: false, message: "Escrow not found" });
    }

    // Apply resolution based on decision
    if (decision === "full_refund") {
      await escrow.refundBuyer(adminId, reason || "Full refund due to dispute resolution");
    } else if (decision === "release_funds") {
      await escrow.releaseFunds(adminId);
    } else if (decision === "partial_refund") {
      escrow.status = "refunded";
      escrow.refundedAt = new Date();
      escrow.refundedBy = adminId;
      escrow.commission = escrow.amount * 0.05;
      escrow.sellerAmount = escrow.amount - escrow.commission;
      escrow.buyerAmount = amount || 0;
      await escrow.save();
    } else if (decision === "split_settlement") {
      escrow.status = "released";
      escrow.releasedAt = new Date();
      escrow.releasedBy = adminId;
      escrow.commission = escrow.amount * 0.05;
      escrow.sellerAmount = sellerAmount || 0;
      escrow.buyerAmount = buyerAmount || 0;
      await escrow.save();
    }

    // Update dispute
    dispute.resolution = {
      decision,
      amount: amount || escrow.amount,
      sellerAmount: sellerAmount || escrow.sellerAmount,
      buyerAmount: buyerAmount || escrow.buyerAmount || 0,
      reason,
      decidedBy: adminId,
      decidedAt: new Date(),
    };
    dispute.status = "resolved";
    dispute.resolvedAt = new Date();
    await dispute.save();

    res.json({ success: true, dispute });
  } catch (error) {
    console.error("Error resolving dispute:", error);
    res.status(500).json({ success: false, message: "Failed to resolve dispute" });
  }
};

// =============================
// 🔄 SUBMIT APPEAL
// =============================

export const submitAppeal = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { reason, evidence } = req.body;
    const userId = req.user.id;

    if (!reason) {
      return res.status(400).json({ success: false, message: "Reason is required" });
    }

    // Verify dispute exists and user is involved
    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      return res.status(404).json({ success: false, message: "Dispute not found" });
    }

    if (dispute.openedBy.toString() !== userId && dispute.openedAgainst.toString() !== userId) {
      return res.status(403).json({ success: false, message: "You are not involved in this dispute" });
    }

    if (dispute.status !== "resolved") {
      return res.status(400).json({ success: false, message: "Can only appeal resolved disputes" });
    }

    if (dispute.appeal && dispute.appeal.status !== "rejected") {
      return res.status(400).json({ success: false, message: "Appeal already submitted" });
    }

    // Create appeal
    dispute.appeal = {
      reason,
      evidence: evidence || [],
      appealedBy: userId,
      appealedAt: new Date(),
      status: "pending",
    };
    dispute.status = "appealed";
    await dispute.save();

    res.json({ success: true, dispute });
  } catch (error) {
    console.error("Error submitting appeal:", error);
    res.status(500).json({ success: false, message: "Failed to submit appeal" });
  }
};

// =============================
// 📋 GET DISPUTE DETAILS
// =============================

export const getDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const userId = req.user.id;

    const dispute = await Dispute.findById(disputeId)
      .populate("escrow")
      .populate("car")
      .populate("openedBy", "name email phone")
      .populate("openedAgainst", "name email phone")
      .populate("resolution.decidedBy", "name email")
      .populate("appeal.appealedBy", "name email")
      .populate("appeal.reviewedBy", "name email");

    if (!dispute) {
      return res.status(404).json({ success: false, message: "Dispute not found" });
    }

    // Check if user is involved or admin
    const isAdmin = req.user.role === "admin" || req.user.role === "escrow_officer";
    const isInvolved =
      dispute.openedBy._id.toString() === userId ||
      dispute.openedAgainst._id.toString() === userId;

    if (!isAdmin && !isInvolved) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({ success: true, dispute });
  } catch (error) {
    console.error("Error getting dispute:", error);
    res.status(500).json({ success: false, message: "Failed to get dispute" });
  }
};

// =============================
// 📊 GET USER DISPUTES
// =============================

export const getUserDisputes = async (req, res) => {
  try {
    const userId = req.user.id;

    const disputes = await Dispute.find({
      $or: [{ openedBy: userId }, { openedAgainst: userId }],
    })
      .populate("escrow")
      .populate("car", "title brand model")
      .populate("openedBy", "name email")
      .populate("openedAgainst", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, disputes });
  } catch (error) {
    console.error("Error getting user disputes:", error);
    res.status(500).json({ success: false, message: "Failed to get disputes" });
  }
};

// =============================
// 📊 GET ALL DISPUTES (ADMIN)
// =============================

export const getAllDisputes = async (req, res) => {
  try {
    const { status, category } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;

    const disputes = await Dispute.find(filter)
      .populate("escrow")
      .populate("car", "title brand model")
      .populate("openedBy", "name email")
      .populate("openedAgainst", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, disputes });
  } catch (error) {
    console.error("Error getting all disputes:", error);
    res.status(500).json({ success: false, message: "Failed to get disputes" });
  }
};

// =============================
// 📝 ADD ADMIN NOTE
// =============================

export const addAdminNote = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { note } = req.body;
    const adminId = req.user.id;

    if (!note) {
      return res.status(400).json({ success: false, message: "Note is required" });
    }

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      return res.status(404).json({ success: false, message: "Dispute not found" });
    }

    dispute.adminNotes.push({
      note,
      addedBy: adminId,
      addedAt: new Date(),
    });

    await dispute.save();

    res.json({ success: true, dispute });
  } catch (error) {
    console.error("Error adding admin note:", error);
    res.status(500).json({ success: false, message: "Failed to add note" });
  }
};
