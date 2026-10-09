import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const checks = [];

const expect = (name, ok, detail) => {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

const authSchema = read("backend/validation/auth.schema.js");
const authController = read("backend/controllers/authController.js");
const notification = read("backend/services/notification.service.js");
const gateway = read("backend/services/communicationGateway.service.js");
const emailProvider = read("backend/services/emailProvider.service.js");
const authRoutes = read("backend/routes/authRoutes.js");

expect(
  "C1 registration role contract",
  authSchema.includes('z.enum(["dealer", "individual_seller", "user"])'),
  "schema matches controller-supported seller roles",
);

expect(
  "C2 password special-character contract",
  authSchema.includes('/[^A-Za-z0-9]/') && authController.includes('/[^A-Za-z0-9]/.test(newPassword)'),
  "change-password accepts the same special-character class as the canonical schema",
);

expect(
  "C2 password reset token hashing",
  authController.includes("resetToken: hashToken(token)") &&
    /resetTokenExpire: \{ \$gt: (Date\.now\(\)|new Date\(\)) \}/.test(authController),
  "reset token is hashed at rest and expiry is enforced",
);

expect(
  "C1 email verification token hashing",
  authController.includes("emailVerifyToken: hashToken(token)") &&
    /emailVerifyExpire: \{ \$gt: (Date\.now\(\)|new Date\(\)) \}/.test(authController),
  "verification token is hashed at rest and expiry is enforced",
);

expect(
  "C3 canonical Brevo adapter",
  emailProvider.includes('https://api.brevo.com/v3/smtp/email') &&
    emailProvider.includes('process.env.BREVO_API_KEY'),
  "email provider is Brevo-backed",
);

expect(
  "C5 canonical preference control plane",
  gateway.includes('findOne("communication_preferences", { userId })') &&
    gateway.includes("isCommunicationEnabled"),
  "gateway owns preference and rollout decisions",
);

expect(
  "C5 notification service does not maintain a second preference store",
  !notification.includes('findOne("user_preferences"'),
  "notification service delegates channel policy to the gateway",
);

expect(
  "C3 provider delivery audit",
  gateway.includes("communication_deliveries") &&
    gateway.includes("providerMessageId") &&
    gateway.includes("handleProviderStatus"),
  "delivery state and provider status are persisted",
);

expect(
  "C2 verification route is rate-limited",
  authRoutes.includes('router.get("/verify-email/:token", verificationLimiter, authLimiter') &&
    authRoutes.includes('router.post("/resend-verification", verificationLimiter, authLimiter'),
  "verification endpoints use auth rate limiting",
);

const failed = checks.filter((x) => !x.ok);
console.log(`\nC1-C5 convergence validation: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
