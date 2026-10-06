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
import { getSupabase } from "../utils/supabase.js";
import { disburseB2C } from "../services/mpesaB2C.service.js";

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
  payout: e.payout ? { id: e.payout.id || e.payout._id, status: e.payout.status, amount: Number(e.payout.amount || 0), netAmount: Number(e.payout.net_amount || e.payout.netAmount || 0), conversationId: e.payout.conversation_id || e.payout.conversationId || null, transactionId: e.payout.transaction_id || e.payout.transactionId || null, failureReason: e.payout.failure_reason || e.payout.failureReason || null } : null,
});

export const getEscrowOperationsDashboard = async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);
  const [funded, vehicleConfirmed, delivered, released, disputed, refundsPending, reconciliation, anomalies] = await Promise.all([
    Escrow.find({ status: "funded" }).sort({ fundedAt: 1 }).limit(limit).populate("buyer", "name").populate("seller", "name").populate("car", "title registrationNumber vin").lean(),
    Escrow.find({ status: "vehicle_confirmed" }).sort({ vehicleConfirmedAt: 1 }).limit(limit).populate("buyer", "name").populate("seller", "name").populate("car", "title registrationNumber vin").lean(),
    Escrow.find({ status: "delivered" }).sort({ updatedAt: 1 }).limit(limit).populate("buyer", "name").populate("seller", "name").populate("car", "title registrationNumber vin").lean(),
    Escrow.find({ status: "released" }).sort({ releasedAt: -1 }).limit(limit).populate("buyer", "name").populate("seller", "name").populate("car", "title registrationNumber vin").lean(),
    Escrow.find({ status: "disputed" }).sort({ disputedAt: -1 }).limit(limit).populate("buyer", "name").populate("seller", "name").populate("car", "title registrationNumber vin").lean(),
    Refund.find({ status: { $in: ["pending", "processing", "approved"] } }).sort({ createdAt: 1 }).limit(limit).lean(),
    ReconciliationReport.find({ "issueDetails.resolved": false }).sort({ createdAt: -1 }).limit(limit).lean(),
    EscrowAnomaly.find({ status: { $in: ["detected", "under_review", "confirmed"] } }).sort({ createdAt: -1 }).limit(limit).lean(),
  ]);

  const [fundedCount, vehicleConfirmedCount, deliveredCount, disputedCount, releasedCount, refundsPendingCount, unreconciledCount, anomalyCount, heldAgg] = await Promise.all([
    Escrow.countDocuments({ status: "funded" }),
    Escrow.countDocuments({ status: "vehicle_confirmed" }),
    Escrow.countDocuments({ status: "delivered" }),
    Escrow.countDocuments({ status: "disputed" }),
    Escrow.countDocuments({ status: "released" }),
    Refund.countDocuments({ status: { $in: ["pending", "processing", "approved"] } }),
    ReconciliationReport.countDocuments({ "issueDetails.resolved": false }),
    EscrowAnomaly.countDocuments({ status: { $in: ["detected", "under_review", "confirmed"] } }),
    Escrow.aggregate([{ $match: { status: "funded" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
  ]);

  res.json({
    success: true,
    data: {
      queues: {
        funded: { count: fundedCount, amount: Number(heldAgg[0]?.total || 0), items: funded.map(safeEscrow) },
        vehicleConfirmed: { count: vehicleConfirmedCount, items: vehicleConfirmed.map(safeEscrow) },
        delivered: { count: deliveredCount, items: delivered.map(safeEscrow) },
        released: { count: releasedCount, items: released.map(safeEscrow) },
        disputed: { count: disputedCount, items: disputed.map(safeEscrow) },
        refunds: { count: refundsPendingCount, items: refundsPending.map(r => ({ id: r.id || r._id, status: r.status, amount: Number(r.amount || 0), escrow: r.escrow || r.escrowId || null, createdAt: r.createdAt })) },
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
  const [audits, anomalies, reconciliation, refund, payout] = await Promise.all([
    getAuditTrail(req.params.id),
    EscrowAnomaly.find({ escrow: req.params.id }).sort({ createdAt: -1 }).limit(20).lean(),
    ReconciliationReport.find({ $or: [{ "issueDetails.escrowId": req.params.id }, { "issueDetails.escrow": req.params.id }] }).sort({ createdAt: -1 }).limit(10).lean(),
    Refund.findOne({ escrow: req.params.id }).sort({ createdAt: -1 }).lean(),
    getSupabase().from("dealer_payouts").select("id,status,amount,net_amount,conversation_id,transaction_id,failure_reason,metadata").eq("escrow", req.params.id).maybeSingle().then(r => r.data || null),
  ]);
  const caseEscrow = { ...escrow, refund, payout };
  res.json({ success: true, data: { escrow: safeEscrow(caseEscrow), timeline: audits.map(a => ({ id: a.id || a._id, action: a.action, actor: a.performedByName || "Operator", role: a.performedByRole, timestamp: a.timestamp, reason: a.reason || null, notes: a.notes || null, stateChanges: a.stateChanges || {} })), anomalies, reconciliation } });
};

export const initiateEscrowPayout = async (req, res) => {
  const escrow = await Escrow.findById(req.params.id).lean();
  if (!escrow) return res.status(404).json({ success: false, message: "Escrow not found" });
  if (escrow.status !== "released") return res.status(409).json({ success: false, message: "Only released escrows can be paid out" });
  const seller = await Escrow.findById(req.params.id).populate("seller", "phone name").lean();
  const sellerPhone = seller?.seller?.phone || null;
  if (!sellerPhone) return res.status(400).json({ success: false, message: "Seller payout phone number is not configured" });

  const { data: prepared, error: prepareError } = await getSupabase().rpc("kayad_prepare_dealer_payout_atomic", {
    p_escrow: req.params.id, p_dealer: escrow.seller, p_phone: sellerPhone,
  });
  if (prepareError) throw prepareError;
  const payout = prepared?.payout;
  if (!payout?.id) return res.status(500).json({ success: false, message: "Payout preparation failed" });
  if (prepared.idempotent && ["processing", "paid"].includes(payout.status)) {
    return res.json({ success: true, data: { payout, idempotent: true } });
  }

  const provider = await disburseB2C({
    phone: sellerPhone, amount: payout.net_amount, escrowId: req.params.id, payoutId: payout.id,
    sellerName: seller?.seller?.name, idempotencyKey: payout.id,
  });
  await logActionFromReq(req, "escrow_payout_initiated", { target: req.params.id, targetModel: "Escrow", details: { payoutId: payout.id, actorId: req.user.id } });
  return res.status(202).json({ success: true, data: { payout: provider.payout || payout, provider } });
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
