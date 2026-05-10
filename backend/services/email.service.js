// backend/services/email.service.js
// ─────────────────────────────────────────────────────────────
// Transactional email service. Env-driven — disabled gracefully
// if EMAIL_HOST is not set. All email types have HTML templates.
// ─────────────────────────────────────────────────────────────

import nodemailer from "nodemailer";

const APP_NAME = process.env.APP_NAME || "Gari Motors";
const APP_URL  = process.env.FRONTEND_URL || "https://garimotors.co.ke";
const FROM     = process.env.EMAIL_FROM || `noreply@garimotors.co.ke`;
const ENABLED  = !!process.env.EMAIL_HOST;

// ── TRANSPORTER ───────────────────────────────────────────────
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  if (!ENABLED) return null;

  transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    pool: true,
    maxConnections: 5,
  });

  return transporter;
};

// ── BASE LAYOUT ───────────────────────────────────────────────
const layout = (content, title = APP_NAME) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#07090C;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07090C;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Logo -->
        <tr>
          <td style="padding:0 0 24px;text-align:center;">
            <span style="font-size:28px;font-weight:700;color:#E8B84B;letter-spacing:-0.5px;">
              🚗 ${APP_NAME}
            </span>
            <div style="font-size:11px;color:#4A5568;letter-spacing:0.1em;text-transform:uppercase;margin-top:4px;">
              Kenya's Premium Car Marketplace
            </div>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#0F1318;border:1px solid #1E2530;border-radius:16px;padding:40px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 0 0;text-align:center;color:#4A5568;font-size:12px;">
            <div>© ${new Date().getFullYear()} ${APP_NAME} · Kenya</div>
            <div style="margin-top:6px;">
              <a href="${APP_URL}" style="color:#C8962A;text-decoration:none;">Visit Marketplace</a>
              &nbsp;·&nbsp;
              <a href="${APP_URL}/privacy" style="color:#4A5568;text-decoration:none;">Privacy</a>
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

const heading = (text) =>
  `<h2 style="margin:0 0 20px;font-size:24px;color:#E2DDD5;font-weight:600;">${text}</h2>`;

const para = (text) =>
  `<p style="margin:0 0 16px;color:#7A8599;font-size:15px;line-height:1.7;">${text}</p>`;

const highlight = (label, value, gold = false) => `
  <div style="background:#0a0d12;border:1px solid #252E3D;border-radius:10px;padding:16px 20px;margin:16px 0;">
    <div style="font-size:11px;color:#7A8599;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${label}</div>
    <div style="font-size:${gold ? "22px" : "16px"};font-weight:700;color:${gold ? "#E8B84B" : "#E2DDD5"};">${value}</div>
  </div>`;

const btn = (text, url) => `
  <div style="text-align:center;margin:28px 0 12px;">
    <a href="${url}" style="display:inline-block;background:#C8962A;color:#07090C;text-decoration:none;
      padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.02em;">
      ${text}
    </a>
  </div>`;

const divider = () => `<hr style="border:none;border-top:1px solid #1E2530;margin:24px 0;">`;

// ── SEND WRAPPER ──────────────────────────────────────────────
export const sendEmail = async ({ to, subject, html, text }) => {
  const t = getTransporter();
  if (!t) {
    console.log(`📧 [Email disabled] Would send "${subject}" to ${to}`);
    return { success: true, disabled: true };
  }
  try {
    const info = await t.sendMail({
      from: `"${APP_NAME}" <${FROM}>`,
      to, subject,
      text: text || subject,
      html,
    });
    console.log(`📧 Email sent: ${subject} → ${to} (${info.messageId})`);
    return { success: true, id: info.messageId };
  } catch (err) {
    console.error(`❌ Email failed: ${err.message}`);
    return { success: false, error: err.message };
  }
};

// ─────────────────────────────────────────────────────────────
//  EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────

// 1. Welcome / account registered
export const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: `Welcome to ${APP_NAME} 🚗`,
    html: layout(`
      ${heading(`Welcome, ${user.name}!`)}
      ${para("Your account has been created. You can now browse cars, place bids, and buy with M-Pesa escrow protection.")}
      ${user.role === "dealer" ? para("<strong style='color:#E8B84B'>Your dealer account is pending approval.</strong> Our team will review and approve your account within 24 hours.") : ""}
      ${btn("Browse Cars Now", `${APP_URL}/cars`)}
      ${divider()}
      ${para(`Need help? Reply to this email or visit <a href="${APP_URL}" style="color:#C8962A;">${APP_URL}</a>`)}
    `, `Welcome to ${APP_NAME}`),
  });

// 2. Dealer approved
export const sendDealerApprovedEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: `✅ Your dealer account is approved — ${APP_NAME}`,
    html: layout(`
      ${heading("You're approved!")}
      ${para(`Congratulations ${user.name}, your dealer account has been verified. You can now list cars, run live auctions, and accept M-Pesa payments.`)}
      ${btn("Start Listing →", `${APP_URL}/dealer/add-car`)}
      ${divider()}
      ${para("Questions? Contact us at <a href='mailto:dealers@garimotors.co.ke' style='color:#C8962A;'>dealers@garimotors.co.ke</a>")}
    `, "Dealer Approved"),
  });

// 3. Bid placed confirmation (to bidder)
export const sendBidConfirmationEmail = (user, bid, car) =>
  sendEmail({
    to: user.email,
    subject: `⚡ Bid placed — ${car.title}`,
    html: layout(`
      ${heading("Your bid is in!")}
      ${para(`You've successfully placed a bid on <strong style="color:#E2DDD5">${car.title}</strong>.`)}
      ${highlight("Your Bid Amount", `KES ${Number(bid.amount).toLocaleString("en-KE")}`, true)}
      ${highlight("M-Pesa Commitment", `KES ${Number(bid.commitmentAmount || bid.amount * 0.05).toLocaleString("en-KE")}`)}
      ${highlight("Auction Ends", car.auctionEnd ? new Date(car.auctionEnd).toLocaleString("en-KE") : "TBD")}
      ${para("You'll be notified immediately if you're outbid or when the auction ends.")}
      ${btn("Watch Live Auction →", `${APP_URL}/auction/${car._id}`)}
      ${divider()}
      ${para("<em style='color:#4A5568;font-size:13px;'>If you win, the 5% commitment is credited toward your payment. If you don't win, you'll be refunded.</em>")}
    `, "Bid Placed"),
  });

// 4. Outbid notification
export const sendOutbidEmail = (user, newBid, car) =>
  sendEmail({
    to: user.email,
    subject: `⚠️ You've been outbid — ${car.title}`,
    html: layout(`
      ${heading("Someone outbid you!")}
      ${para(`A higher bid has been placed on <strong style="color:#E2DDD5">${car.title}</strong>.`)}
      ${highlight("New Highest Bid", `KES ${Number(newBid).toLocaleString("en-KE")}`, true)}
      ${para("Act fast — place a higher bid to stay in the running.")}
      ${btn("Bid Again →", `${APP_URL}/auction/${car._id}`)}
    `, "Outbid Alert"),
  });

// 5. Auction won
export const sendAuctionWonEmail = (user, car, amount) =>
  sendEmail({
    to: user.email,
    subject: `🏆 You won the auction — ${car.title}`,
    html: layout(`
      ${heading("Congratulations, you won!")}
      ${para(`You are the highest bidder on <strong style="color:#E2DDD5">${car.title}</strong>. Complete your payment to secure the car.`)}
      ${highlight("Winning Bid", `KES ${Number(amount).toLocaleString("en-KE")}`, true)}
      ${para("Your 5% commitment has been applied. Complete the remaining balance via M-Pesa escrow to finalise the deal.")}
      ${btn("Complete Payment →", `${APP_URL}/escrow`)}
      ${divider()}
      ${para("<em style='color:#4A5568;font-size:13px;'>Payment is held in escrow until you confirm receipt of the vehicle. Your money is safe.</em>")}
    `, "Auction Won"),
  });

// 6. Payment confirmed (M-Pesa)
export const sendPaymentConfirmedEmail = (user, payment, car) =>
  sendEmail({
    to: user.email,
    subject: `✅ Payment confirmed — ${car?.title || "Gari Motors"}`,
    html: layout(`
      ${heading("M-Pesa Payment Confirmed")}
      ${para("Your payment has been received and is now held in secure escrow.")}
      ${highlight("Amount Paid", `KES ${Number(payment.amount).toLocaleString("en-KE")}`, true)}
      ${highlight("M-Pesa Receipt", payment.mpesaReceiptNumber || "—")}
      ${highlight("Status", "🔒 In Escrow")}
      ${para("Funds will be released to the seller after you confirm receipt of the vehicle. Contact admin if you have any issues.")}
      ${btn("View Escrow →", `${APP_URL}/escrow`)}
    `, "Payment Confirmed"),
  });

// 7. Escrow released (to seller)
export const sendEscrowReleasedEmail = (seller, escrow, car) =>
  sendEmail({
    to: seller.email,
    subject: `💰 Payment released — ${car?.title || "Vehicle sale"}`,
    html: layout(`
      ${heading("Funds Released to You!")}
      ${para("The escrow for your vehicle sale has been released. Funds should reflect in your M-Pesa within minutes.")}
      ${highlight("Amount Released", `KES ${Number(escrow.amount).toLocaleString("en-KE")}`, true)}
      ${car?.title ? highlight("Vehicle", car.title) : ""}
      ${para("Thank you for selling on Gari Motors. List more vehicles to keep growing your business.")}
      ${btn("List Another Car →", `${APP_URL}/dealer/add-car`)}
    `, "Funds Released"),
  });

// 8. Escrow refunded (to buyer)
export const sendEscrowRefundedEmail = (buyer, escrow, car) =>
  sendEmail({
    to: buyer.email,
    subject: `↩️ Refund processed — ${car?.title || "Vehicle purchase"}`,
    html: layout(`
      ${heading("Your Refund Is Processed")}
      ${para("The escrow for your purchase has been refunded. Funds should reflect in your M-Pesa within minutes.")}
      ${highlight("Amount Refunded", `KES ${Number(escrow.amount).toLocaleString("en-KE")}`, true)}
      ${para("We're sorry the deal didn't go through. Browse our marketplace for other great cars.")}
      ${btn("Browse Cars →", `${APP_URL}/cars`)}
    `, "Refund Processed"),
  });

// 9. Password reset
export const sendPasswordResetEmail = (user, resetToken) =>
  sendEmail({
    to: user.email,
    subject: `🔑 Password reset — ${APP_NAME}`,
    html: layout(`
      ${heading("Reset Your Password")}
      ${para("We received a request to reset your password. Click the button below. This link expires in 1 hour.")}
      ${btn("Reset Password →", `${APP_URL}/reset-password?token=${resetToken}`)}
      ${divider()}
      ${para("<em style='color:#4A5568;font-size:13px;'>If you didn't request this, ignore this email. Your password won't change.</em>")}
    `, "Password Reset"),
  });

// 10. New message (chat)
export const sendNewMessageEmail = (user, fromName, carTitle) =>
  sendEmail({
    to: user.email,
    subject: `💬 New message from ${fromName} — ${APP_NAME}`,
    html: layout(`
      ${heading(`Message from ${fromName}`)}
      ${para(`You have a new message about <strong style="color:#E2DDD5">${carTitle || "a vehicle"}</strong>.`)}
      ${btn("View Message →", `${APP_URL}/chat`)}
      ${divider()}
      ${para("<em style='color:#4A5568;font-size:13px;'>Reply within 24 hours to keep the conversation going.</em>")}
    `, "New Message"),
  });

// 11. Auction ending soon (to all active bidders)
export const sendAuctionEndingSoonEmail = (user, car, minutesLeft) =>
  sendEmail({
    to: user.email,
    subject: `⏰ Auction ending in ${minutesLeft} minutes — ${car.title}`,
    html: layout(`
      ${heading("Auction Ending Soon!")}
      ${para(`The auction for <strong style="color:#E2DDD5">${car.title}</strong> is ending in <strong style="color:#E8B84B">${minutesLeft} minutes</strong>.`)}
      ${highlight("Current Bid", `KES ${Number(car.currentBid || car.price).toLocaleString("en-KE")}`, true)}
      ${btn("Bid Now →", `${APP_URL}/auction/${car._id}`)}
    `, "Auction Ending Soon"),
  });
