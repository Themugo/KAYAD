// utils/alert.js

import AdminAlert from "../models/AdminAlert.js";
import { sendRawEmail } from "../services/email.service.js";
import { sendSMS } from "../utils/sms.js";
import { getIO } from "./io.js";

// =============================
// ⚙️ CONFIG
// =============================
const CRITICAL_TYPES = ["fraud", "payment_failure"];

// =============================
// 🚨 GENERIC ALERT EMITTER
// =============================
export const triggerAdminAlert = async (type, data = {}, options = {}) => {
  try {
    const payload = {
      type,
      data,
      severity: options.severity || "info", // info | warning | critical
      time: new Date(),
    };

    // =============================
    // 💾 SAVE TO DB
    // =============================
    const alert = await AdminAlert.create({
      type,
      data,
      severity: payload.severity,
    });

    // =============================
    // ⚡ REAL-TIME (SOCKET)
    // =============================
    if (getIO()) {
      getIO()
        .to("admins")
        .emit("adminAlert", {
          id: alert._id,
          ...payload,
        });
    }

    // =============================
    // 🚨 ESCALATION (CRITICAL)
    // =============================
    if (payload.severity === "critical" || CRITICAL_TYPES.includes(type)) {
      await escalateAlert(type, data);
    }

    console.log("🚨 Admin Alert:", payload);

    return alert;
  } catch (err) {
    console.error("❌ ALERT ERROR:", err.message);
    return null;
  }
};

// =============================
// 🚨 ESCALATION HANDLER
// =============================
const escalateAlert = async (type, data) => {
  try {
    const message = `🚨 ${type.toUpperCase()} ALERT: ${JSON.stringify(data)}`;

    // 📧 Email admin
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `Critical Alert: ${type}`,
      html: `<pre>${message}</pre>`,
    });

    // 📱 SMS admin (optional)
    if (process.env.ADMIN_PHONE) {
      await sendSMS(process.env.ADMIN_PHONE, message);
    }
  } catch (err) {
    console.error("❌ ESCALATION ERROR:", err.message);
  }
};
