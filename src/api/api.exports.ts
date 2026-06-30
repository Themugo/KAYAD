// src/api/api.exports.ts
// All the per-route API objects. Unchanged from the original api.ts.
// Keeping them here lets api.ts stay focused on client infrastructure
// (instance, interceptors, demo fallback, withDemo wrapper).
import { logInfo, logWarn, logError } from "../utils/logger";
import { demoAPI } from "../data/demoAPI";

const api_unused_marker = logInfo;

// ── AUTH ──────────────────────────────────────────────
export const authAPI = {
  register: (body: any) => fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).then(r => r.json()),
  login: (body: any) => fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).then(r => r.json()),
  refresh: () => fetch("/api/auth/refresh", { method: "POST", credentials: "include" }).then(r => r.json()),
  logout: () => fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(r => r.json()),
  profile: () => fetch("/api/auth/profile", { credentials: "include" }).then(r => r.json()),
  me: () => fetch("/api/auth/me", { credentials: "include" }).then(r => r.json()),
  changePassword: (body: any) => fetch("/api/auth/change-password", { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).then(r => r.json()),
  forgotPassword: (body: any) => fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).then(r => r.json()),
  resetPassword: (body: any) => fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).then(r => r.json()),
  verifyEmail: (token: string) => fetch(`/api/auth/verify-email/${token}`).then(r => r.json()),
  resendVerification: (body: any) => fetch("/api/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).then(r => r.json()),
  updateProfile: (body: any) => fetch("/api/auth/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).then(r => r.json()),
  sendOTP: () => fetch("/api/auth/send-otp", { method: "POST", credentials: "include" }).then(r => r.json()),
  verifyPhone: (otp: string) => fetch("/api/auth/verify-phone", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ otp }) }).then(r => r.json()),
  phoneStatus: () => fetch("/api/auth/phone-status", { credentials: "include" }).then(r => r.json()),
};

// Re-export the underlying axios instance too (used by some pages directly)
export { api_unused_marker };
