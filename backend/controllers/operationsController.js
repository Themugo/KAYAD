import Escrow from "../models/Escrow.js";
import Car from "../models/Car.js";
import InspectionOrder from "../models/InspectionOrder.js";
import User from "../models/User.js";
import Dispute from "../models/Dispute.js";
import Payment from "../models/Payment.js";

// =============================
// 📊 OPERATIONS COMMAND CENTER
// =============================

export const getOperationsDashboard = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today - 24 * 60 * 60 * 1000);

    // =============================
    // 🔒 ESCROW QUEUE
    // =============================
    const [escrowPending, escrowHeld, escrowDisputed, escrowStalled] = await Promise.all([
      Escrow.countDocuments({ status: "pending", createdAt: { $gte: today } }),
      Escrow.countDocuments({ status: "held", createdAt: { $gte: today } }),
      Escrow.countDocuments({ status: "disputed", createdAt: { $gte: today } }),
      Escrow.countDocuments({
        status: "held",
        createdAt: { $lt: yesterday },
        updatedAt: { $lt: yesterday },
      }),
    ]);

    // =============================
    // 🔍 INSPECTION QUEUE
    // =============================
    const [inspectionRequested, inspectionAssigned, inspectionCompleted, inspectionOverdue] = await Promise.all([
      InspectionOrder.countDocuments({ status: "requested", createdAt: { $gte: today } }),
      InspectionOrder.countDocuments({ status: "assigned", createdAt: { $gte: today } }),
      InspectionOrder.countDocuments({ status: "completed", createdAt: { $gte: today } }),
      InspectionOrder.countDocuments({
        status: { $in: ["requested", "assigned"] },
        scheduledDate: { $lt: today },
      }),
    ]);

    // =============================
    // 🚗 DEALER QUEUE
    // =============================
    const [dealerPendingVerification, dealerPendingKYC, dealerPendingApproval] = await Promise.all([
      User.countDocuments({ role: "dealer", verified: false, createdAt: { $gte: today } }),
      User.countDocuments({ role: "dealer", kycVerified: false, createdAt: { $gte: today } }),
      User.countDocuments({ role: "dealer", status: "pending", createdAt: { $gte: today } }),
    ]);

    // =============================
    // 🎫 SUPPORT QUEUE
    // =============================
    const [supportOpen, supportUrgent, supportEscalated] = await Promise.all([
      Dispute.countDocuments({ status: "open", createdAt: { $gte: today } }),
      Dispute.countDocuments({
        status: "open",
        severity: "critical",
        createdAt: { $gte: today },
      }),
      Dispute.countDocuments({ status: "appealed", createdAt: { $gte: today } }),
    ]);

    // =============================
    // 💰 PAYMENT QUEUE
    // =============================
    const [paymentPending, paymentFailed, paymentProcessing] = await Promise.all([
      Payment.countDocuments({ status: "pending", createdAt: { $gte: today } }),
      Payment.countDocuments({ status: "failed", createdAt: { $gte: today } }),
      Payment.countDocuments({ status: "processing", createdAt: { $gte: today } }),
    ]);

    res.json({
      success: true,
      dashboard: {
        escrowQueue: {
          pending: escrowPending,
          held: escrowHeld,
          disputed: escrowDisputed,
          stalled: escrowStalled,
          total: escrowPending + escrowHeld + escrowDisputed + escrowStalled,
        },
        inspectionQueue: {
          requested: inspectionRequested,
          assigned: inspectionAssigned,
          completed: inspectionCompleted,
          overdue: inspectionOverdue,
          total: inspectionRequested + inspectionAssigned + inspectionCompleted + inspectionOverdue,
        },
        dealerQueue: {
          pendingVerification: dealerPendingVerification,
          pendingKYC: dealerPendingKYC,
          pendingApproval: dealerPendingApproval,
          total: dealerPendingVerification + dealerPendingKYC + dealerPendingApproval,
        },
        supportQueue: {
          open: supportOpen,
          urgent: supportUrgent,
          escalated: supportEscalated,
          total: supportOpen + supportUrgent + supportEscalated,
        },
        paymentQueue: {
          pending: paymentPending,
          failed: paymentFailed,
          processing: paymentProcessing,
          total: paymentPending + paymentFailed + paymentProcessing,
        },
        overall: {
          totalIssues:
            escrowPending +
            escrowHeld +
            escrowDisputed +
            escrowStalled +
            inspectionRequested +
            inspectionAssigned +
            inspectionOverdue +
            dealerPendingVerification +
            dealerPendingKYC +
            dealerPendingApproval +
            supportOpen +
            supportUrgent +
            supportEscalated +
            paymentPending +
            paymentFailed +
            paymentProcessing,
          criticalIssues: escrowDisputed + inspectionOverdue + supportUrgent + supportEscalated + paymentFailed,
        },
      },
    });
  } catch (error) {
    console.error("Error getting operations dashboard:", error);
    res.status(500).json({ success: false, message: "Failed to get operations dashboard" });
  }
};

// =============================
// 🔒 ESCROW QUEUE DETAILS
// =============================

export const getEscrowQueue = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = status ? { status } : {};

    const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 100);

    const [escrows, total] = await Promise.all([
      Escrow.find(filter)
        .populate("buyer", "name email")
        .populate("seller", "name email")
        .populate("car", "title price")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(Number(limit), 100)),
      Escrow.countDocuments(filter),
    ]);

    res.json({
      success: true,
      escrows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting escrow queue:", error);
    res.status(500).json({ success: false, message: "Failed to get escrow queue" });
  }
};

// =============================
// 🔍 INSPECTION QUEUE DETAILS
// =============================

export const getInspectionQueue = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = status ? { status } : {};

    const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 100);

    const [inspections, total] = await Promise.all([
      InspectionOrder.find(filter)
        .populate("car", "title price")
        .populate("inspector", "name email")
        .populate("requestedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(Number(limit), 100)),
      InspectionOrder.countDocuments(filter),
    ]);

    res.json({
      success: true,
      inspections,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting inspection queue:", error);
    res.status(500).json({ success: false, message: "Failed to get inspection queue" });
  }
};

// =============================
// 🚗 DEALER QUEUE DETAILS
// =============================

export const getDealerQueue = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = { role: "dealer" };

    if (status === "pending_verification") {
      filter.verified = false;
    } else if (status === "pending_kyc") {
      filter.kycVerified = false;
    } else if (status === "pending_approval") {
      filter.status = "pending";
    }

    const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 100);

    const [dealers, total] = await Promise.all([
      User.find(filter)
        .select("name email phone businessName verified kycVerified status createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(Number(limit), 100)),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      dealers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting dealer queue:", error);
    res.status(500).json({ success: false, message: "Failed to get dealer queue" });
  }
};

// =============================
// 🎫 SUPPORT QUEUE DETAILS
// =============================

export const getSupportQueue = async (req, res) => {
  try {
    const { status, severity, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 100);

    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .populate("openedBy", "name email")
        .populate("openedAgainst", "name email")
        .populate("relatedEscrow", "amount status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(Number(limit), 100)),
      Dispute.countDocuments(filter),
    ]);

    res.json({
      success: true,
      disputes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting support queue:", error);
    res.status(500).json({ success: false, message: "Failed to get support queue" });
  }
};

// =============================
// 💰 PAYMENT QUEUE DETAILS
// =============================

export const getPaymentQueue = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = status ? { status } : {};

    const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 100);

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("user", "name email")
        .populate("escrow", "amount status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(Number(limit), 100)),
      Payment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      payments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting payment queue:", error);
    res.status(500).json({ success: false, message: "Failed to get payment queue" });
  }
};
