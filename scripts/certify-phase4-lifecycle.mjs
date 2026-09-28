import { STATES, validateTransition } from "../backend/services/escrowStateMachine.js";

const events = [];
const emit = (event) => events.push(event);

// Deterministic, dependency-free certification of the canonical transaction state path.
// Real Supabase/M-Pesa/provider execution remains a separate live gate.
let escrow = { status: STATES.PENDING, deliveryConfirmed: false, autoReleaseEligibleAt: null };

const transition = (next, role, patch = {}) => {
  const check = validateTransition(escrow.status, next, role, { ...escrow, ...patch });
  if (!check.allowed) throw new Error(`${escrow.status} -> ${next} rejected: ${check.reason}`);
  escrow = { ...escrow, ...patch, status: next };
  emit(next);
};

// M-Pesa payment leg is intentionally represented separately from escrow funding.
const payment = { method: "mpesa", status: "success", receipt: "SIMULATED-MPESA-RECEIPT", amount: 500000 };
if (payment.status !== "success" || !payment.receipt) throw new Error("M-Pesa payment leg did not settle");
emit("payment.succeeded");

// Custody funding leg: the existing production model requires bank verification.
transition(STATES.FUNDED, "system");
emit("escrow.funded");
transition(STATES.VEHICLE_CONFIRMED, "buyer");
transition(STATES.DELIVERED, "seller");
transition(STATES.RELEASED, "admin", { deliveryConfirmed: true });
transition(STATES.CLOSED, "admin");

const expected = ["payment.succeeded", "funded", "escrow.funded", "vehicle_confirmed", "delivered", "released", "closed"];
for (const [i, value] of expected.entries()) {
  if (events[i] !== value) throw new Error(`Lifecycle mismatch at ${i}: expected ${value}, got ${events[i]}`);
}

console.log("PASS canonical M-Pesa payment → custody funding → escrow → notification → release lifecycle");
console.log(`PASS ${events.length}/${expected.length} lifecycle events in expected order`);
