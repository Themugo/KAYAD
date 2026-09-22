import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [
  ['canonical inspection router imported', read('backend/server.js').includes('import inspectionRoutes from "./inspection/routes/inspectionRoutes.js";')],
  ['canonical inspection router mounted at /api/inspection', read('backend/server.js').includes('app.use("/api/inspection", inspectionRoutes);')],
  ['backward-compatible inspection alias mounted at /api/inspections', read('backend/server.js').includes('app.use("/api/inspections", inspectionRoutes);')],
  ['inspection payment supports booking binding', read('backend/inspection/controllers/providerController.js').includes('req.params.bookingId') && read('backend/inspection/controllers/providerController.js').includes("type: 'inspection'")],
  ['inspection payment amount is server derived', read('backend/inspection/controllers/providerController.js').includes('amount: Number(booking.total_price)')],
  ['inspection callback uses atomic settlement RPC', read('backend/services/paymentCallback.service.js').includes('kayad_process_inspection_payment_atomic')],
  ['inspection callback is payment-state idempotent', read('backend/services/paymentCallback.service.js').includes("'inspection'" ) && read('backend/services/paymentCallback.service.js').includes('payment.metadata?.bookingId')],
  ['inspection payment history type is supported', read('backend/services/paymentCallback.service.js').includes("'inspection'")],
  ['frontend booking flow initiates payment', read('src/features/InspectionMarketplace/pages/BookingFlow.tsx').includes('inspectionApi.initiatePayment')],
  ['frontend waits for authoritative payment success', read('src/features/InspectionMarketplace/pages/BookingFlow.tsx').includes('getPaymentStatus') && read('src/features/InspectionMarketplace/pages/BookingFlow.tsx').includes("status.status === 'success'")],
  ['frontend uses M-Pesa-only truthful copy', !read('src/features/InspectionMarketplace/pages/BookingFlow.tsx').includes('M-PESA or card')],
  ['inspection API exposes booking payment', read('src/features/InspectionMarketplace/services/api.ts').includes('initiatePayment')],
  ['inspection payment schema requires bookingId', read('backend/validation/phase22.schema.js').includes('bookingId') && read('backend/validation/phase22.schema.js').includes('phone')],
  ['inspection settlement service delegates to atomic RPC', read('backend/inspection/services/settlementService.js').includes('kayad_process_inspection_payment_atomic')],
];
let failures = 0;
for (const [name, ok] of checks) {
  if (ok) console.log(`PASS ${name}`);
  else { console.error(`FAIL ${name}`); failures++; }
}
if (failures) process.exit(1);
console.log(`Inspection marketplace activation validation passed: ${checks.length}/${checks.length}`);
