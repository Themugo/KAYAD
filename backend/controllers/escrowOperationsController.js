// KAYAD Escrow Operations Center — projection/control layer only.
// Reuses the canonical escrow, reconciliation, anomaly and audit services.
import Escrow from "../models/Escrow.js";
import EscrowAnomaly from "../models/EscrowAnomaly.js";
import EscrowAudit from "../models/EscrowAudit.js";
import ReconciliationReport from "../models/ReconciliationReport.js";
import Refund from "../models/Refund.js";
import { getAuditTrail } from "../services/escrowAuditService.js";
import { triggerManualReconciliation } from "../services/reconciliationCron.js";
import { runAnomalyDetection } from "../services/escrowAnomalyDetectionService.js";
import { logActionFromReq } from "../utils/securityLogger.js";

const safeEscrow = (e) => ({
  id: e.id || e._id,
  status: e.status,
  amount: Number(e.amount || 0),
  commission: Number(e.commission || 0),
  sellerAmount: Number(e.sellerAmount || 0),
  createdAt: e.createdAt,
  updatedAt: e.updatedAt,
  fundedAt: e.fundedAt || null,
  releasedAt: e.releasedAt || null,
  refundedAt: e.refundedAt || null,
  disputedAt: e.disputedAt || null,
  buyer: e.buyer ? { id: e.buyer.id || e.buyer._id, name: e.buyer.name || "Buyer" } : null,
  seller: e.seller ? { id: e.seller.id || e.seller._id, name: e.seller.name || "Seller" } : null,
  car: e.car ? { id: e.car.id || e.car._id, title: e.car.title, registrationNumber: e.car.registrationNumber, vinLast4: String(e.car.vin || "").slice(-4) || null } : null,
  refund: e.refund ? { id: e.refund.id || e.refund._id, status: e.refund.status, amount: Number(e.refund.amount || 0) } : null,
});

export const getEscrowOperationsDashboard = async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);
  const [funded, disputed, refundsPending, reconciliation, anomalies] = await Promise.all([
    Escrow.find({ status: "funded" }).sort({ fundedAt: 1 }).limit(limit).populate("buyer", "name").populate("seller", "name").populate("car", "title registrationNumber vin").lean(),
    Escrow.find({ status: "disputed" }).sort({ disputedAt: -1 }).limit(limit).populate("buyer", "name").populate("seller", "name").populate("car", "title registrationNumber vin").lean(),
    Refund.find({ status: { $in: ["pending", "processing", "approved"] } }).sort({ createdAt: 1 }).limit(limit).lean(),
    ReconciliationReport.find({ "issueDetails.resolved": false }).sort({ createdAt: -1 }).limit(limit).lean(),
    EscrowAnomaly.find({ status: { $in: ["detected", "under_review", "confirmed"] } }).sort({ createdAt: -1 }).limit(limit).lean(),
  ]);

  const [fundedCount, disputedCount, unreconciledCount, anomalyCount, heldAgg] = await Promise.all([
    Escrow.countDocuments({ status: "funded" }),
    Escrow.countDocuments({ status: "disputed" }),
    ReconciliationReport.countDocuments({ "issueDetails.resolved": false }),
    EscrowAnomaly.countDocuments({ status: { $in: ["detected", "under_review", "confirmed"] } }),
    Escrow.aggregate([{ $match: { status: "funded" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
  ]);

  res.json({
    success: true,
    data: {
      queues: {
        funded: { count: fundedCount, amount: Number(heldAgg[0]?.total || 0), items: funded.map(safeEscrow) },
        disputed: { count: disputedCount, items: disputed.map(safeEscrow) },
        refunds: { count: refundsPending.length, items: refundsPending.map(r => ({ id: r.id || r._id, status: r.status, amount: Number(r.amount || 0), escrow: r.escrow || r.escrowId || null, createdAt: r.createdAt })) },
        reconciliation: { count: unreconciledCount, items: reconciliation.map(r => ({ id: r.id || r._id, status: r.status, createdAt: r.createdAt, issueCount: Array.isArray(r.issueDetails) ? r.issueDetails.filter(i => i.resolved === false).length : 0 })) },
        anomalies: { count: anomalyCount, items: anomalies.map(a => ({ id: a.id || a._id, category: a.category, severity: a.severity, status: a.status, escrow: a.escrow || null, createdAt: a.createdAt, summary: a.summary })) },
      },
      operator: {
        role: req.user.role,
        permissions: req.user.permissions || req.user.customPermissions || [],
      },
      generatedAt: new Date().toISOString(),
    },
  });
};

export const getEscrowOperationsCase = async (req, res) => {
  const escrow = await Escrow.findById(req.params.id).populate("buyer", "name").populate("seller", "name").populate("car", "title registrationNumber vin").lean();
  if (!escrow) return res.status(404).json({ success: false, message: "Escrow not found" });
  const [audits, anomalies, reconciliation] = await Promise.all([
    getAuditTrail(req.params.id),
    EscrowAnomaly.find({ escrow: req.params.id }).sort({ createdAt: -1 }).limit(20).lean(),
    ReconciliationReport.find({ $or: [{ "issueDetails.escrowId": req.params.id }, { "issueDetails.escrow": req.params.id }] }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);
  res.json({ success: true, data: { escrow: safeEscrow(escrow), timeline: audits.map(a => ({ id: a.id || a._id, action: a.action, actor: a.performedByName || "Operator", role: a.performedByRole, timestamp: a.timestamp, reason: a.reason || null, notes: a.notes || null, stateChanges: a.stateChanges || {} })), anomalies, reconciliation } });
};

export const runEscrowReconciliation = async (req, res) => {
  const result = await triggerManualReconciliation(req.body?.reportType || "full", req.body?.timeRange || "24h");
  await logActionFromReq(req, "escrow_reconciliation_run", { targetModel: "Escrow", details: { triggeredBy: req.user.id } });
  res.json({ success: true, data: result });
};

export const runEscrowAnomalyScan = async (req, res) => {
  const result = await runAnomalyDetection({ scanWindowHours: Math.min(Math.max(Number(req.body?.scanWindowHours) || 24, 1), 168) });
  await logActionFromReq(req, "escrow_anomaly_scan", { targetModel: "Escrow", details: { triggeredBy: req.user.id, scanWindowHours: Number(req.body?.scanWindowHours) || 24 } });
  res.json({ success: true, data: result });
};
