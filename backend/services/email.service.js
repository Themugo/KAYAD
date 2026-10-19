import { recordMetric, setGauge, incrementCounter } from "../config/metrics.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";

const APP_NAME = process.env.APP_NAME || "Kayad";
const APP_URL = process.env.FRONTEND_URL || "https://www.kayad.space";
const FROM = process.env.BREVO_FROM_EMAIL || process.env.EMAIL_FROM || `noreply@kayad.space`;

// Escape untrusted text before interpolating into HTML email bodies.
export const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const redactEmail = (value) => {
  const address = String(value || "");
  const at = address.indexOf("@");
  if (at <= 2) return address ? "***" : "";
  return `${address.slice(0, 2)}***${address.slice(at)}`;
};

const layout = (content, title = APP_NAME) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0A3340;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A3340;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="padding:0 0 24px;text-align:center;">
            <span style="font-size:28px;font-weight:700;color:#13B8A6;letter-spacing:-0.5px;">
              🚗 ${APP_NAME}
            </span>
            <div style="font-size:11px;color:#94A3B8;letter-spacing:0.1em;text-transform:uppercase;margin-top:4px;">
              Kenya's Premium Car Marketplace
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#0A3340;border:1px solid #12576D;border-radius:16px;padding:40px;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 0 0;text-align:center;color:#94A3B8;font-size:12px;">
            <div>© ${new Date().getFullYear()} ${APP_NAME} · Kenya</div>
            <div style="margin-top:6px;">
              <a href="${APP_URL}" style="color:#176B87;text-decoration:none;">Visit Marketplace</a>
              &nbsp;·&nbsp;
              <a href="${APP_URL}/privacy" style="color:#94A3B8;text-decoration:none;">Privacy</a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const heading = (text) => `<h2 style="margin:0 0 20px;font-size:24px;color:#F6FAF9;font-weight:600;">${text}</h2>`;

const para = (text) => `<p style="margin:0 0 16px;color:#BDE5DE;font-size:15px;line-height:1.7;">${text}</p>`;

const highlight = (label, value, emphasize = false) => `
  <div style="background:#12576D;border:1px solid #176B87;border-radius:10px;padding:16px 20px;margin:16px 0;">
    <div style="font-size:11px;color:#BDE5DE;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${label}</div>
    <div style="font-size:${emphasize ? "22px" : "16px"};font-weight:700;color:${emphasize ? "#13B8A6" : "#F6FAF9"};">${value}</div>
  </div>`;

const btn = (text, url) => `
  <div style="text-align:center;margin:28px 0 12px;">
    <a href="${url}" style="display:inline-block;background:#176B87;color:#FFFFFF;text-decoration:none;
      padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.02em;">
      ${text}
    </a>
  </div>`;

const divider = () => `<hr style="border:none;border-top:1px solid #12576D;margin:24px 0;">`;

// Export raw email function for queue worker
export const sendRawEmail = async ({ to, subject, html, text, from = FROM, replyTo = process.env.BREVO_REPLY_TO || undefined }) => {
  const startTime = Date.now();
  if (!process.env.BREVO_API_KEY) {
    incrementCounter("email_disabled");
    logWarn("Brevo provider is not configured", { subject, to: redactEmail(to) });
    return { success: false, disabled: true, error: "Brevo provider is not configured" };
  }

  try {
    const { sendBrevoEmail } = await import("./emailProvider.service.js");
    const info = await sendBrevoEmail({ to, subject, html, text: text || subject, from, replyTo });
    const duration = Date.now() - startTime;
    recordMetric("email_send_duration", duration);
    incrementCounter("email_send_success");
    logInfo("Email sent successfully", { subject, to: redactEmail(to), messageId: info.id });
    return { success: true, id: info.id, provider: "brevo" };
  } catch (err) {
    recordMetric("email_send_duration", Date.now() - startTime, { status: "error" });
    incrementCounter("email_send_failure", 1, { error_type: err.code || "unknown" });
    logError("Email failed after retries", err, { to: redactEmail(to), subject, error: err.message });
    // Queue/retry ownership lives above the provider adapter. Do not enqueue
    // from this function: registration-critical verification could otherwise
    // roll back an account while a queued retry later sends an orphaned link.
    // The communication delivery ledger / worker owns retry scheduling.
    return { success: false, error: err.message };
  }
};

export const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: `Welcome to ${APP_NAME} — Drive Your Dream Today`,
    html: layout(
      `
      ${heading(`Welcome, ${esc(user.name)}!`)}
      ${para("Your account is ready. You can now browse premium cars, place live bids, and buy with M-Pesa escrow protection — your dream car is waiting.")}
      ${user.role === "dealer" ? para("<strong style='color:#13B8A6'>Your dealer account is pending approval.</strong> Our team will review your dealership within 24 hours. You'll receive an email once approved.") : ""}
      ${btn("Start Browsing →", `${APP_URL}/showroom`)}
      ${divider()}
      ${para(`<strong style='color:#F6FAF9'>What you can do now:</strong><br/>
        • Browse ${user.role === "dealer" ? "and list " : ""}verified vehicles<br/>
        • Join live auctions with real-time bidding<br/>
        • Chat directly with sellers<br/>
        • Secure payments with M-Pesa escrow`)}
      ${para(`Questions? Visit <a href="${APP_URL}" style="color:#176B87;">${APP_URL}</a>`)}
    `,
      `Welcome to ${APP_NAME}`,
    ),
  });

export const sendDealerApprovedEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: `You're Approved — Start Selling on ${APP_NAME}`,
    html: layout(
      `
      ${heading("You're Approved!")}
      ${para(`Congratulations ${esc(user.name)}, your dealership has been verified. You can now list cars, run live auctions, and accept M-Pesa payments securely.`)}
      ${highlight("Account Status", "Verified Dealer", true)}
      ${btn("List Your First Car →", `${APP_URL}/dealer/add-car`)}
      ${divider()}
      ${para(`<strong style='color:#F6FAF9'>Your dealer benefits:</strong><br/>
        • Unlimited listing uploads (based on plan)<br/>
        • Live auction hosting<br/>
        • Direct buyer messaging<br/>
        • M-Pesa escrow payouts<br/>
        • Analytics dashboard`)}
      ${para("Questions? Contact us at <a href='mailto:dealers@kayad.space' style='color:#176B87;'>dealers@kayad.space</a>")}
    `,
      "Dealer Approved",
    ),
  });

export const sendBidConfirmationEmail = (user, bid, car) =>
  sendEmail({
    to: user.email,
    subject: `⚡ Bid placed — ${car.title}`,
    html: layout(
      `
      ${heading("Your bid is in!")}
      ${para(`You've successfully placed a bid on <strong style="color:#F6FAF9">${esc(car.title)}</strong>.`)}
      ${highlight("Your Bid Amount", `KES ${Number(bid.amount).toLocaleString("en-KE")}`, true)}
      ${highlight("M-Pesa Commitment", `KES ${Number(bid.commitmentAmount || bid.amount * 0.05).toLocaleString("en-KE")}`)}
      ${highlight("Auction Ends", car.auctionEnd ? new Date(car.auctionEnd).toLocaleString("en-KE") : "TBD")}
      ${para("You'll be notified immediately if you're outbid or when the auction ends.")}
      ${btn("Watch Live Auction →", `${APP_URL}/auction/${encodeURIComponent(car._id)}`)}
      ${divider()}
      ${para("<em style='color:#94A3B8;font-size:13px;'>If you win, the 5% commitment is credited toward your payment. If you don't win, you'll be refunded.</em>")}
    `,
      "Bid Placed",
    ),
  });

export const sendOutbidEmail = (user, newBid, car) =>
  sendEmail({
    to: user.email,
    subject: `⚠️ You've been outbid — ${car.title}`,
    html: layout(
      `
      ${heading("Someone outbid you!")}
      ${para(`A higher bid has been placed on <strong style="color:#F6FAF9">${esc(car.title)}</strong>.`)}
      ${highlight("New Highest Bid", `KES ${Number(newBid).toLocaleString("en-KE")}`, true)}
      ${para("Act fast — place a higher bid to stay in the running.")}
      ${btn("Bid Again →", `${APP_URL}/auction/${encodeURIComponent(car._id)}`)}
    `,
      "Outbid Alert",
    ),
  });

export const sendAuctionWonEmail = (user, car, amount) =>
  sendEmail({
    to: user.email,
    subject: `You Won! — ${car.title} is yours`,
    html: layout(
      `
      ${heading("Congratulations, You Won!")}
      ${para(`You are the highest bidder on <strong style="color:#F6FAF9">${esc(car.title)}</strong>. Complete your payment to take ownership of your new vehicle.`)}
      ${highlight("Your Winning Bid", `KES ${Number(amount).toLocaleString("en-KE")}`, true)}
      ${para("Your 5% commitment has been applied. Complete the remaining balance via M-Pesa escrow to finalize the deal and arrange delivery.")}
      ${btn("Complete Payment →", `${APP_URL}/escrow`)}
      ${divider()}
      ${para(`<strong style='color:#F6FAF9'>Next steps:</strong><br/>
        1. Complete payment via M-Pesa escrow<br/>
        2. Coordinate pickup with the seller<br/>
        3. Confirm receipt to release funds<br/><br/>
        <em style='color:#94A3B8;font-size:13px;'>Your payment is protected until you confirm receipt.</em>`)}
    `,
      "Auction Won",
    ),
  });

export const sendPaymentConfirmedEmail = (user, payment, car) =>
  sendEmail({
    to: user.email,
    subject: `✅ Payment confirmed — ${car?.title || "Kayad"}`,
    html: layout(
      `
      ${heading("M-Pesa Payment Confirmed")}
      ${para("Your payment has been received and is now held in secure escrow.")}
      ${highlight("Amount Paid", `KES ${Number(payment.amount).toLocaleString("en-KE")}`, true)}
      ${highlight("M-Pesa Receipt", esc(payment.mpesaReceiptNumber || "—"))}
      ${highlight("Status", "🔒 In Escrow")}
      ${para("Funds will be released to the seller after you confirm receipt of the vehicle. Contact admin if you have any issues.")}
      ${btn("View Escrow →", `${APP_URL}/escrow`)}
    `,
      "Payment Confirmed",
    ),
  });

export const sendEscrowReleasedEmail = (seller, escrow, car) =>
  sendEmail({
    to: seller.email,
    subject: `💰 Payment released — ${car?.title || "Vehicle sale"}`,
    html: layout(
      `
      ${heading("Funds Released to You!")}
      ${para("The escrow for your vehicle sale has been released. Funds should reflect in your M-Pesa within minutes.")}
      ${highlight("Amount Released", `KES ${Number(escrow.amount).toLocaleString("en-KE")}`, true)}
      ${car?.title ? highlight("Vehicle", esc(car.title)) : ""}
      ${para("Thank you for selling on Kayad. List more vehicles to keep growing your business.")}
      ${btn("List Another Car →", `${APP_URL}/dealer/add-car`)}
    `,
      "Funds Released",
    ),
  });

export const sendEscrowRefundedEmail = (buyer, escrow, car) =>
  sendEmail({
    to: buyer.email,
    subject: `↩️ Refund processed — ${car?.title || "Vehicle purchase"}`,
    html: layout(
      `
      ${heading("Your Refund Is Processed")}
      ${para("The escrow for your purchase has been refunded. Funds should reflect in your M-Pesa within minutes.")}
      ${highlight("Amount Refunded", `KES ${Number(escrow.amount).toLocaleString("en-KE")}`, true)}
      ${para("We're sorry the deal didn't go through. Browse our marketplace for other great cars.")}
      ${btn("Browse Cars →", `${APP_URL}/cars`)}
    `,
      "Refund Processed",
    ),
  });

export const sendPasswordResetEmail = (user, resetToken) =>
  sendEmail({
    to: user.email,
    subject: `🔑 Password reset — ${APP_NAME}`,
    html: layout(
      `
      ${heading("Reset Your Password")}
      ${para("We received a request to reset your password. Click the button below. This link expires in 1 hour.")}
      ${btn("Reset Password →", `${APP_URL}/reset-password?token=${encodeURIComponent(resetToken)}`)}
      ${divider()}
      ${para("<em style='color:#94A3B8;font-size:13px;'>If you didn't request this, ignore this email. Your password won't change.</em>")}
    `,
      "Password Reset",
    ),
  });

export const sendNewMessageEmail = (user, fromName, carTitle) =>
  sendEmail({
    to: user.email,
    subject: `💬 New message from ${fromName} — ${APP_NAME}`,
    html: layout(
      `
      ${heading(`Message from ${esc(fromName)}`)}
      ${para(`You have a new message about <strong style="color:#F6FAF9">${esc(carTitle || "a vehicle")}</strong>.`)}
      ${btn("View Message →", `${APP_URL}/chat`)}
      ${divider()}
      ${para("<em style='color:#94A3B8;font-size:13px;'>Reply within 24 hours to keep the conversation going.</em>")}
    `,
      "New Message",
    ),
  });

export const sendAuctionEndingSoonEmail = (user, car, minutesLeft) =>
  sendEmail({
    to: user.email,
    subject: `⏰ Auction ending in ${minutesLeft} minutes — ${car.title}`,
    html: layout(
      `
      ${heading("Auction Ending Soon!")}
      ${para(`The auction for <strong style="color:#F6FAF9">${esc(car.title)}</strong> is ending in <strong style="color:#13B8A6">${minutesLeft} minutes</strong>.`)}
      ${highlight("Current Bid", `KES ${Number(car.currentBid || car.price).toLocaleString("en-KE")}`, true)}
      ${btn("Bid Now →", `${APP_URL}/auction/${encodeURIComponent(car._id)}`)}
    `,
      "Auction Ending Soon",
    ),
  });

export const sendVerificationEmail = (email, name, token) => {
  const verifyUrl = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to: email,
    subject: `Verify Your Email — ${APP_NAME}`,
    html: layout(
      `
      ${heading("Verify Your Email Address")}
      ${para(`Hi <strong style="color:#F6FAF9">${esc(name || "there")}</strong>, welcome to Kayad!`)}
      ${para("Verify your email to unlock bidding, messaging, and secure M-Pesa escrow payments. Your dream car is waiting.")}
      ${btn("Verify My Email →", verifyUrl)}
      ${divider()}
      ${para("<em style='color:#94A3B8;font-size:13px;'>This link expires in 24 hours. If you didn't create a Kayad account, you can safely ignore this email.</em>")}
    `,
      "Email Verification",
    ),
  });
};

export const sendTeamInviteEmail = (inviteeEmail, dealerName, role, token) =>
  sendEmail({
    to: inviteeEmail,
    subject: `🤝 You've been invited to join ${dealerName}'s team — ${APP_NAME}`,
    html: layout(
      `
      ${heading(`Team Invitation from ${esc(dealerName)}`)}
      ${para(`You've been invited to join <strong style="color:#F6FAF9">${esc(dealerName)}</strong>'s dealership team as a <strong style="color:#13B8A6">${esc(String(role).replace(/_/g, " "))}</strong>.`)}
      ${para("Click below to accept the invitation and set up your account.")}
      ${btn("Accept Invitation →", `${APP_URL}/dealer/setup?invite=${encodeURIComponent(token)}`)}
      ${divider()}
      ${para("<em style='color:#94A3B8;font-size:13px;'>This invitation expires in 7 days. If you don't have a Kayad account yet, you'll create one when accepting.</em>")}
    `,
      "Team Invitation",
    ),
  });

export const sendVerificationReminderEmail = (email, name, token) => {
  const verifyUrl = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to: email,
    subject: "📧 New verification link — Kayad",
    html: layout(
      `
      ${heading("New Verification Link")}
      ${para(`Hi <strong style="color:#F6FAF9">${esc(name || "there")}</strong>,`)}
      ${para("Here is your new email verification link. The previous one has been invalidated.")}
      ${btn("Verify Email →", verifyUrl)}
      ${divider()}
      ${para("<em style='color:#94A3B8;font-size:13px;'>This link expires in 24 hours.</em>")}
    `,
      "Email Verification",
    ),
  });
};

export const sendSavedSearchAlertEmail = (user, search, matchedCars, totalCount) => {
  const carList = matchedCars
    .slice(0, 5)
    .map((c) => {
      const title = c.title || `${c.brand || ""} ${c.year || ""}`.trim() || "Vehicle";
      const price = c.price ? `KES ${Number(c.price).toLocaleString("en-KE")}` : "";
      return `<a href="${APP_URL}/cars/${encodeURIComponent(c._id)}" style="display:block;padding:10px 14px;margin:6px 0;background:#12576D;border:1px solid #176B87;border-radius:10px;color:#F6FAF9;text-decoration:none;">
      <strong>${esc(title)}</strong>${price ? `<span style="float:right;color:#13B8A6;font-weight:600;">${price}</span>` : ""}
    </a>`;
    })
    .join("");
  const rest =
    totalCount > 5
      ? `<p style="color:#94A3B8;font-size:13px;margin:8px 0 0;">+ ${totalCount - 5} more vehicle${totalCount - 5 > 1 ? "s" : ""}</p>`
      : "";

  return sendEmail({
    to: user.email,
    subject: `📢 ${totalCount} new vehicle${totalCount > 1 ? "s" : ""} matching "${search.name}" — ${APP_NAME}`,
    html: layout(
      `
      ${heading(`New Vehicles: "${esc(search.name)}"`)}
      ${para(`Hi <strong style="color:#F6FAF9">${esc(user.name || "there")}</strong>,`)}
      ${para(`${totalCount} new vehicle${totalCount > 1 ? "s" : ""} matching your saved search <strong style="color:#13B8A6">"${esc(search.name)}"</strong> ${totalCount > 1 ? "have" : "has"} been listed on ${APP_NAME}.`)}
      ${carList}
      ${rest}
      ${btn("View All Results →", `${APP_URL}/saved-searches`)}
      ${divider()}
      ${para(`<em style="color:#94A3B8;font-size:13px;">You're receiving this because saved search alerts are enabled. <a href="${APP_URL}/settings" style="color:#13B8A6;">Manage preferences</a></em>`)}
    `,
      "Saved Search Alert",
    ),
  });
};

// ── Onboarding payload builders (used by the communication gateway) ──────────
// Branded, escaped, and URL-safe. Return { subject, text, html }.
export const buildVerificationEmail = ({ name, verifyUrl, resend = false }) => ({
  subject: `Verify Your Email — ${APP_NAME}`,
  text: `Hi ${name || "there"}, ${resend ? "here is your new" : "verify your"} ${APP_NAME} email link: ${verifyUrl} (expires in 24 hours). If you did not create an account, ignore this email.`,
  html: layout(`
      ${heading(resend ? "New Verification Link" : "Verify Your Email Address")}
      ${para(`Hi <strong style="color:#F6FAF9">${esc(name || "there")}</strong>,`)}
      ${para(resend ? "Here is your new verification link. Previous links no longer work." : "Verify your email to unlock your account, bidding, messaging and secure escrow payments.")}
      ${btn("Verify My Email →", verifyUrl)}
      ${para(`If the button does not work, copy this link into your browser:<br/><span style="word-break:break-all;color:#13B8A6;">${esc(verifyUrl)}</span>`)}
      ${divider()}
      ${para("<em style='color:#94A3B8;font-size:13px;'>This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</em>")}
    `, `Verify Your Email — ${APP_NAME}`),
});

// STAGE 5B: owner governance emails. The invitation carries a one-time, hashed-at-rest, expiring acceptance link; the notice carries NO link or secret.
export const buildOwnerInvitationEmail = ({ acceptUrl, kind = "invitation", expiresInHours = 24, invitedBy = "a KAYAD owner", resend = false }) => {
  const what = kind === "recovery" ? "restore your KAYAD platform-owner access" : "become a KAYAD platform owner";
  return {
    subject: `${resend ? "New link: " : ""}${kind === "recovery" ? "Restore your owner access" : "Owner invitation"} — ${APP_NAME}`,
    text: `You have been asked by ${invitedBy} to ${what}. Open this one-time link, ${kind === "recovery" ? "set a new password and " : ""}confirm that this mailbox is yours: ${acceptUrl} (expires in ${expiresInHours} hours). Owner access is granted only after you complete this step and sign in. If you did not expect this, do not open the link and tell the person who runs your KAYAD platform.`,
    html: layout(`
      ${heading(kind === "recovery" ? "Restore Owner Access" : "Platform Owner Invitation")}
      ${para(`You have been asked by <strong style="color:#F6FAF9">${esc(invitedBy)}</strong> to ${esc(what)}.`)}
      ${para("Open the one-time link below and confirm that this mailbox is yours. Owner access is granted only after you complete this step and sign in.")}
      ${btn("Accept Owner Invitation →", acceptUrl)}
      ${para(`If the button does not work, copy this link into your browser:<br/><span style="word-break:break-all;color:#13B8A6;">${esc(acceptUrl)}</span>`)}
      ${divider()}
      ${para(`<em style='color:#94A3B8;font-size:13px;'>This link works once and expires in ${esc(String(expiresInHours))} hours. If you did not expect it, do not open it.</em>`)}
    `, `Owner invitation — ${APP_NAME}`),
  };
};

export const buildOwnerNoticeEmail = ({ headline, detail }) => ({
  subject: `Security notice: ${headline} — ${APP_NAME}`,
  text: `${headline}. ${detail} If this was not expected, contact the other platform owners immediately.`,
  html: layout(`
      ${heading("Security Notice")}
      ${para(`<strong style="color:#F6FAF9">${esc(headline)}</strong>`)}
      ${para(esc(detail))}
      ${divider()}
      ${para("<em style='color:#94A3B8;font-size:13px;'>This message contains no links or secrets. If this was not expected, contact the other platform owners immediately.</em>")}
    `, `Security notice — ${APP_NAME}`),
});

// STAGE 5: the welcome email must never tell a dealer or seller they are "ready"/approved when they are not.
// Application received ≠ email verified ≠ approved. Buyers keep the original wording.
const WELCOME_COPY = {
  dealer: {
    text: (n) => `Hi ${n}, we have received your ${APP_NAME} dealer application. Your email must be verified and your application reviewed before your dealer account is approved. We will email you when a decision is made.`,
    html: "We have received your dealer application. It is <strong>not approved yet</strong>: please verify your email, then wait for our review. We will email you when a decision is made.",
    cta: null,
  },
  individual_seller: {
    text: (n) => `Hi ${n}, your ${APP_NAME} seller account has been created. Verify your email to use seller features. New listings are reviewed before they are published.`,
    html: "Your seller account has been created. Verify your email to use seller features. New listings are reviewed before they are published.",
    cta: null,
  },
};

export const buildWelcomeEmail = ({ name, role }) => {
  const sellerCopy = WELCOME_COPY[role];
  if (sellerCopy) {
    return {
      subject: `Welcome to ${APP_NAME}`,
      text: sellerCopy.text(name || "there"),
      html: layout(`
      ${heading(`Welcome, ${esc(name || "there")}!`)}
      ${para(sellerCopy.html)}
    `, `Welcome to ${APP_NAME}`),
    };
  }
  return {
  subject: `Welcome to ${APP_NAME} — Drive Your Dream Today`,
  text: `Welcome to ${APP_NAME}, ${name || "there"}. Your account is ready. Browse vehicles: ${APP_URL}/showroom`,
  html: layout(`
      ${heading(`Welcome, ${esc(name || "there")}!`)}
      ${para("Your account is ready. Browse vehicles, join auctions and use secure transaction workflows.")}
      ${btn("Start Browsing →", `${APP_URL}/showroom`)}
    `, `Welcome to ${APP_NAME}`),
  };
};

export const buildPasswordResetEmail = ({ resetUrl }) => ({
  subject: `Reset Your ${APP_NAME} Password`,
  text: `Reset your ${APP_NAME} password: ${resetUrl} . This link expires in 1 hour. If you did not request this, ignore this email.`,
  html: layout(`
      ${heading("Reset Your Password")}
      ${para("We received a request to reset your password. This link expires in 1 hour.")}
      ${btn("Reset Password →", resetUrl)}
      ${para(`If the button does not work, copy this link into your browser:<br/><span style="word-break:break-all;color:#13B8A6;">${esc(resetUrl)}</span>`)}
      ${divider()}
      ${para("<em style='color:#94A3B8;font-size:13px;'>If you didn't request this, ignore this email. Your password won't change.</em>")}
    `, `Reset Your Password — ${APP_NAME}`),
});

export const sendEmail = sendRawEmail;
