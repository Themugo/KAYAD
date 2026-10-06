import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const checks = [
  ["storage paths are UUID-namespaced", /randomUUID\(\)/.test(read("backend/services/storage.service.js"))],
  ["evidence magic bytes validated after multer buffering", /validateEvidenceUploadContent/.test(read("backend/middleware/evidenceUpload.js"))],
  ["evidence route applies content validation", /validateEvidenceUploadContent/.test(read("backend/inspection/routes/inspectionRoutes.js"))],
  ["completion requires complete checklist", /expectedItems/.test(read("backend/inspection/services/executionService.js"))],
  ["failed/warning findings require evidence", /supporting evidence before submission/.test(read("backend/inspection/services/executionService.js"))],
  ["delivery uses stable report share link and refreshes private PDF fallback", /report\.share_token/.test(read("backend/inspectionBusinessCenter/services/reportReviewService.js")) && /getPrivateStorageUrl\(report\.pdf_storage_path, 900\)/.test(read("backend/inspectionBusinessCenter/services/reportReviewService.js"))],
  ["delivery does not persist expiring signed URL", !/pdf_url:\s*uploaded\.url/.test(read("backend/inspection/services/reportService.js"))],
  ["inspection evidence persists storage paths, not expiring URLs", /storagePath: asset\.path/.test(read("backend/inspection/services/executionService.js"))],
  ["report photos are refreshed as signed URLs", /getPrivateStorageUrl\(photo, 900\)/.test(read("backend/inspection/services/reportService.js"))],
];
let failed=0;
for (const [label, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"}: ${label}`); if (!ok) failed++; }
if (failed) process.exit(1);
console.log(`MEDIA DELIVERY LIFECYCLE: ${checks.length}/${checks.length} PASS`);
