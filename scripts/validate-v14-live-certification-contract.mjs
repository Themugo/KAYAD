import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const source = read("scripts/certify-v14-live-api.mjs");
const server = read("backend/server.js");
const v1 = read("backend/routes/v1.js");
const auth = read("backend/routes/authRoutes.js");
const bid = read("backend/routes/bidRoutes.js");
const payment = read("backend/routes/paymentRoutes.js");
const escrow = read("backend/routes/escrowRoutes.js");
const dispute = read("backend/routes/disputeRoutes.js");
const inspection = read("backend/routes/inspectionRoutes.js");
const loan = read("backend/routes/loanApplicationRoutes.js");
const subscription = read("backend/routes/subscriptionRoutes.js");
const auction = read("backend/routes/auctionRoutes.js");
const dealer = read("backend/routes/dealerPlatformRoutes.js");

const checks = [
  ["live harness uses canonical auth profile endpoint", source.includes('"/api/v1/auth/profile"') && !source.includes('"/api/v1/auth/me"')],
  ["v1 auth router mounted", server.includes('app.use("/api/v1", v1Routes)') && v1.includes('router.use("/auth", authLimiter, authRoutes)')],
  ["auth profile route exists", auth.includes('router.get("/profile", protect, asyncHandler(getProfile))')],
  ["v1 bids my route exists", v1.includes('router.use("/bids",') && bid.includes('router.get("/my", protect')],
  ["v1 payments my route exists", v1.includes('router.use("/payments",') && payment.includes('router.get("/my", protect')],
  ["v1 escrow my route exists", v1.includes('router.use("/escrow",') && escrow.includes('router.get("/my", protect')],
  ["dispute my route exists", server.includes('app.use("/api/disputes",') && dispute.includes('router.get("/my", protect')],
  ["inspection my route exists", server.includes('app.use("/api/inspections", inspectionRoutes)') && inspection.includes('router.use(protect)') && inspection.includes('router.get(\n  "/my"')],
  ["loan my route exists", server.includes('app.use("/api/loans", loanApplicationRoutes)') && loan.includes('router.get("/my", protect')],
  ["subscription routes exist", server.includes('app.use("/api/subscriptions", subscriptionRoutes)') && subscription.includes('router.get("/my-subscription", protect') && subscription.includes('router.get("/all", protect, adminOnly')],
  ["public auction catalogue route exists", server.includes('app.use("/api/auctions",') || v1.includes('router.use("/auctions", auctionRoutes)')],
  ["public subscription plans route exists", server.includes('app.use("/api/subscriptions", subscriptionRoutes)') && subscription.includes('router.get("/plans"')],
  ["dealer certification routes exist", server.includes('app.use("/api/dealer-platform", dealerPlatformRoutes)') && dealer.includes('router.get("/dashboard", protect, dealerOnly') && dealer.includes('router.get("/finance", protect, dealerOnly')],
  ["admin escrow route exists", server.includes('app.use("/api/escrow",') && escrow.includes('router.get("/", protect, adminOnly')],
  ["admin disputes route exists", dispute.includes('router.get("/", protect, adminOnly')],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (ok) passed += 1;
}
console.log(`V14 live certification contract: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
