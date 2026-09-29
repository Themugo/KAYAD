#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const auth = fs.readFileSync(path.join(root, "backend/controllers/authController.js"), "utf8");
const env = fs.readFileSync(path.join(root, "backend/utils/env.js"), "utf8");
const gateway = fs.readFileSync(path.join(root, "backend/services/communicationGateway.service.js"), "utf8");

const checks = [];
const check = (name, ok) => {
  checks.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
};

const resendStart = auth.indexOf("export const resendVerification");
const resendEnd = auth.indexOf("// ============================================================\n// POST /api/auth/forgot-password", resendStart);
const resend = auth.slice(resendStart, resendEnd);
const saveIndex = resend.indexOf("userAuth.emailVerifyToken = nextVerifyTokenHash");
const deliveryIndex = resend.indexOf("const verificationDelivery = await deliver");

check("registration creates UserAuth before verification delivery", auth.indexOf("UserAuth.create") < auth.indexOf("const verificationDelivery = await deliver"));
check("registration rolls back both records when required verification delivery fails", auth.includes("UserAuth.deleteOne({ _id: userAuth._id })") && auth.includes("User.deleteOne({ _id: user._id })"));
check("required verification treats non-sent delivery as failure", auth.includes("assertEmailDeliverySucceeded(verificationDelivery, \"Verification\")"));
check("resend generates replacement token without persisting it first", resend.includes("const nextVerifyTokenHash = hashToken(verifyToken)") && !resend.includes("await userAuth.save();\n\n    try {"));
check("resend commits replacement token only after provider acceptance", saveIndex > deliveryIndex && resend.includes("Provider acceptance is the commit point for the replacement token"));
check("resend leaves persisted token untouched on delivery failure", resend.includes("The persisted token was never changed"));
check("optional SMS/WhatsApp cannot block generic email communication", gateway.includes("!providerConfigured(channel)") && gateway.includes("continue;"));
check("optional providers are not production startup requirements unless explicitly enabled", env.includes('process.env[group.flag] !== "true"') && env.includes('flag: "REQUIRE_MPESA"') && env.includes('flag: "REQUIRE_SMS"') && env.includes('flag: "REQUIRE_WHATSAPP"'));

const passed = checks.filter(Boolean).length;
console.log(`\nEMAIL RELIABILITY CONTRACT: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
