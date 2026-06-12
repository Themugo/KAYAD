import Notification from "../models/Notification.js";
import User from "../models/User.js";

// =============================
// 📢 SEND NOTIFICATION
// =============================

export const sendNotification = async ({
  userId,
  title,
  message,
  type = "info",
  data = {},
  channels = ["push", "email"],
}) => {
  try {
    // Create in-app notification
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type,
      data,
    });

    // Get user preferences
    const user = await User.findById(userId);
    if (!user) return notification;

    // Send via configured channels
    if (channels.includes("push") && user.pushEnabled !== false) {
      await sendPushNotification(userId, title, message, data);
    }

    if (channels.includes("email") && user.emailEnabled !== false && user.email) {
      await sendEmailNotification(user.email, title, message, data);
    }

    if (channels.includes("sms") && user.smsEnabled !== false && user.phone) {
      await sendSMSNotification(user.phone, title, message, data);
    }

    if (channels.includes("whatsapp") && user.whatsappEnabled !== false && user.phone) {
      await sendWhatsAppNotification(user.phone, title, message, data);
    }

    return notification;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
};

// =============================
// 📱 PUSH NOTIFICATION
// =============================

const sendPushNotification = async (userId, title, message, data) => {
  try {
    // This would integrate with a push notification service like Firebase Cloud Messaging (FCM)
    // or OneSignal. For now, it's a placeholder.
    
    // Example implementation with FCM:
    // const user = await User.findById(userId);
    // if (user.pushTokens && user.pushTokens.length > 0) {
    //   await admin.messaging().sendMulticast({
    //     tokens: user.pushTokens,
    //     notification: { title, body: message },
    //     data,
    //   });
    // }
    
    console.log(`Push notification sent to user ${userId}: ${title}`);
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
};

// =============================
// 📧 EMAIL NOTIFICATION
// =============================

const sendEmailNotification = async (email, title, message, data) => {
  try {
    // This would integrate with an email service like SendGrid, Mailgun, or AWS SES
    // For now, it's a placeholder.
    
    // Example implementation with SendGrid:
    // await sgMail.send({
    //   to: email,
    //   from: 'noreply@kayad.co.ke',
    //   subject: title,
    //   text: message,
    //   html: generateEmailTemplate(title, message, data),
    // });
    
    console.log(`Email notification sent to ${email}: ${title}`);
  } catch (error) {
    console.error("Error sending email notification:", error);
  }
};

// =============================
// 📱 SMS NOTIFICATION
// =============================

const sendSMSNotification = async (phone, title, message, data) => {
  try {
    // This would integrate with an SMS service like Twilio, Africa's Talking, or SMSGateway
    // For now, it's a placeholder.
    
    // Example implementation with Twilio:
    // await client.messages.create({
    //   body: `${title}: ${message}`,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phone,
    // });
    
    console.log(`SMS notification sent to ${phone}: ${title}`);
  } catch (error) {
    console.error("Error sending SMS notification:", error);
  }
};

// =============================
// 💬 WHATSAPP NOTIFICATION
// =============================

const sendWhatsAppNotification = async (phone, title, message, data) => {
  try {
    // This would integrate with WhatsApp Business API
    // For now, it's a placeholder.
    
    // Example implementation with Twilio WhatsApp:
    // await client.messages.create({
    //   from: 'whatsapp:+14155238886',
    //   body: `${title}: ${message}`,
    //   to: `whatsapp:${phone}`,
    // });
    
    console.log(`WhatsApp notification sent to ${phone}: ${title}`);
  } catch (error) {
    console.error("Error sending WhatsApp notification:", error);
  }
};

// =============================
// 🎯 SPECIFIC NOTIFICATION TYPES
// =============================

export const notifyNewBid = async (dealerId, carTitle, bidAmount, bidderName) => {
  return await sendNotification({
    userId: dealerId,
    title: "New Bid Received",
    message: `${bidderName} bid KES ${bidAmount.toLocaleString()} on ${carTitle}`,
    type: "bid",
    data: { carTitle, bidAmount, bidderName },
    channels: ["push", "email", "sms"],
  });
};

export const notifyOutbid = async (userId, carTitle, currentBid) => {
  return await sendNotification({
    userId,
    title: "You've Been Outbid!",
    message: `Someone bid KES ${currentBid.toLocaleString()} on ${carTitle}. Place a higher bid to win!`,
    type: "auction",
    data: { carTitle, currentBid },
    channels: ["push", "email", "sms"],
  });
};

export const notifyAuctionEnding = async (userId, carTitle, endTime) => {
  return await sendNotification({
    userId,
    title: "Auction Ending Soon",
    message: `${carTitle} auction ends in ${new Date(endTime).toLocaleString()}`,
    type: "auction",
    data: { carTitle, endTime },
    channels: ["push", "email"],
  });
};

export const notifyEscrowUpdated = async (userId, escrowId, status, amount) => {
  return await sendNotification({
    userId,
    title: "Escrow Status Updated",
    message: `Your escrow of KES ${amount.toLocaleString()} is now ${status}`,
    type: "escrow",
    data: { escrowId, status, amount },
    channels: ["push", "email"],
  });
};

export const notifyInspectionScheduled = async (userId, carTitle, scheduledDate) => {
  return await sendNotification({
    userId,
    title: "Inspection Scheduled",
    message: `Vehicle inspection for ${carTitle} scheduled for ${new Date(scheduledDate).toLocaleString()}`,
    type: "escrow",
    data: { carTitle, scheduledDate },
    channels: ["push", "email", "sms"],
  });
};

export const notifyDealerReply = async (userId, dealerName, carTitle) => {
  return await sendNotification({
    userId,
    title: "New Message from Dealer",
    message: `${dealerName} replied about ${carTitle}`,
    type: "chat",
    data: { dealerName, carTitle },
    channels: ["push", "email"],
  });
};

export const notifyPaymentReceived = async (userId, amount, carTitle) => {
  return await sendNotification({
    userId,
    title: "Payment Received",
    message: `Payment of KES ${amount.toLocaleString()} received for ${carTitle}`,
    type: "payment",
    data: { amount, carTitle },
    channels: ["push", "email"],
  });
};

export const notifyEscrowReleased = async (userId, amount, carTitle) => {
  return await sendNotification({
    userId,
    title: "Funds Released",
    message: `KES ${amount.toLocaleString()} has been released to your account for ${carTitle}`,
    type: "escrow",
    data: { amount, carTitle },
    channels: ["push", "email"],
  });
};

export const notifyDisputeOpened = async (userId, disputeTitle) => {
  return await sendNotification({
    userId,
    title: "Dispute Opened",
    message: `A dispute has been opened: ${disputeTitle}`,
    type: "escrow",
    data: { disputeTitle },
    channels: ["push", "email", "sms"],
  });
};

export const notifyDisputeResolved = async (userId, disputeTitle, resolution) => {
  return await sendNotification({
    userId,
    title: "Dispute Resolved",
    message: `Dispute "${disputeTitle}" has been resolved: ${resolution}`,
    type: "escrow",
    data: { disputeTitle, resolution },
    channels: ["push", "email"],
  });
};
