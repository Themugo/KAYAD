import { Queue, Worker } from "bullmq";
import { sendNotification } from "./notificationService.js";
import { initRedis, getRedisClient } from "./redisCacheService.js";

// =============================
// 📦 QUEUE ARCHITECTURE
// =============================

let emailQueue = null;
let notificationQueue = null;
let reportQueue = null;
let auctionQueue = null;
let imageProcessingQueue = null;

export const initQueues = async () => {
  try {
    const redisClient = await initRedis();
    if (!redisClient) {
      console.error("Failed to initialize queues: Redis not available");
      return;
    }

    const connection = {
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
    };

    // =============================
    // 📧 EMAIL QUEUE
    // =============================
    emailQueue = new Queue("emails", { connection });
    console.log("Email queue initialized");

    // =============================
    // 🔔 NOTIFICATION QUEUE
    // =============================
    notificationQueue = new Queue("notifications", { connection });
    console.log("Notification queue initialized");

    // =============================
    // 📊 REPORT QUEUE
    // =============================
    reportQueue = new Queue("reports", { connection });
    console.log("Report queue initialized");

    // =============================
    // 🎯 AUCTION QUEUE
    // =============================
    auctionQueue = new Queue("auctions", { connection });
    console.log("Auction queue initialized");

    // =============================
    // 🖼️ IMAGE PROCESSING QUEUE
    // =============================
    imageProcessingQueue = new Queue("image-processing", { connection });
    console.log("Image processing queue initialized");

    // =============================
    // 👷 WORKERS
    // =============================
    startWorkers(connection);

    return {
      emailQueue,
      notificationQueue,
      reportQueue,
      auctionQueue,
      imageProcessingQueue,
    };
  } catch (error) {
    console.error("Error initializing queues:", error);
    return null;
  }
};

// =============================
// 👷 START WORKERS
// =============================

const startWorkers = (connection) => {
  // =============================
  // 📧 EMAIL WORKER
  // =============================
  const emailWorker = new Worker(
    "emails",
    async (job) => {
      const { to, subject, html, text } = job.data;
      console.log(`Sending email to ${to}: ${subject}`);
      // Integrate with email service (SendGrid, Mailgun, etc.)
      // await sgMail.send({ to, from: 'noreply@kayad.co.ke', subject, html, text });
      return { success: true };
    },
    { connection },
  );

  emailWorker.on("completed", (job) => {
    console.log(`Email job ${job.id} completed`);
  });

  emailWorker.on("failed", (job, err) => {
    console.error(`Email job ${job?.id} failed:`, err);
  });

  // =============================
  // 🔔 NOTIFICATION WORKER
  // =============================
  const notificationWorker = new Worker(
    "notifications",
    async (job) => {
      const { userId, title, message, type, data, channels } = job.data;
      console.log(`Sending notification to user ${userId}: ${title}`);
      await sendNotification({ userId, title, message, type, data, channels });
      return { success: true };
    },
    { connection },
  );

  notificationWorker.on("completed", (job) => {
    console.log(`Notification job ${job.id} completed`);
  });

  notificationWorker.on("failed", (job, err) => {
    console.error(`Notification job ${job?.id} failed:`, err);
  });

  // =============================
  // 📊 REPORT WORKER
  // =============================
  const reportWorker = new Worker(
    "reports",
    async (job) => {
      const { reportType, filters, userId } = job.data;
      console.log(`Generating ${reportType} report for user ${userId}`);
      // Generate report based on type
      // This would integrate with report generation logic
      return { success: true, reportUrl: "https://example.com/report.pdf" };
    },
    { connection },
  );

  reportWorker.on("completed", (job) => {
    console.log(`Report job ${job.id} completed`);
  });

  reportWorker.on("failed", (job, err) => {
    console.error(`Report job ${job?.id} failed:`, err);
  });

  // =============================
  // 🎯 AUCTION WORKER
  // =============================
  const auctionWorker = new Worker(
    "auctions",
    async (job) => {
      const { eventType, carId, data } = job.data;
      console.log(`Processing auction event ${eventType} for car ${carId}`);
      // Process auction events (end, extend, etc.)
      // This would integrate with auction logic
      return { success: true };
    },
    { connection },
  );

  auctionWorker.on("completed", (job) => {
    console.log(`Auction job ${job.id} completed`);
  });

  auctionWorker.on("failed", (job, err) => {
    console.error(`Auction job ${job?.id} failed:`, err);
  });

  // =============================
  // 🖼️ IMAGE PROCESSING WORKER
  // =============================
  const imageProcessingWorker = new Worker(
    "image-processing",
    async (job) => {
      const { imageUrl, carId, operations } = job.data;
      console.log(`Processing image for car ${carId}`);
      // Process images (resize, compress, watermark, etc.)
      // This would integrate with image processing service
      return { success: true, processedUrl: imageUrl };
    },
    { connection },
  );

  imageProcessingWorker.on("completed", (job) => {
    console.log(`Image processing job ${job.id} completed`);
  });

  imageProcessingWorker.on("failed", (job, err) => {
    console.error(`Image processing job ${job?.id} failed:`, err);
  });
};

// =============================
// 📧 EMAIL QUEUE FUNCTIONS
// =============================

export const queueEmail = async (to, subject, html, text, options = {}) => {
  try {
    if (!emailQueue) {
      console.error("Email queue not initialized");
      return null;
    }

    const job = await emailQueue.add(
      "send-email",
      { to, subject, html, text },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        ...options,
      },
    );

    return job;
  } catch (error) {
    console.error("Error queuing email:", error);
    return null;
  }
};

// =============================
// 🔔 NOTIFICATION QUEUE FUNCTIONS
// =============================

export const queueNotification = async (userId, title, message, type, data, channels, options = {}) => {
  try {
    if (!notificationQueue) {
      console.error("Notification queue not initialized");
      return null;
    }

    const job = await notificationQueue.add(
      "send-notification",
      { userId, title, message, type, data, channels },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        ...options,
      },
    );

    return job;
  } catch (error) {
    console.error("Error queuing notification:", error);
    return null;
  }
};

// =============================
// 📊 REPORT QUEUE FUNCTIONS
// =============================

export const queueReport = async (reportType, filters, userId, options = {}) => {
  try {
    if (!reportQueue) {
      console.error("Report queue not initialized");
      return null;
    }

    const job = await reportQueue.add(
      "generate-report",
      { reportType, filters, userId },
      {
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
        ...options,
      },
    );

    return job;
  } catch (error) {
    console.error("Error queuing report:", error);
    return null;
  }
};

// =============================
// 🎯 AUCTION QUEUE FUNCTIONS
// =============================

export const queueAuctionEvent = async (eventType, carId, data, options = {}) => {
  try {
    if (!auctionQueue) {
      console.error("Auction queue not initialized");
      return null;
    }

    const job = await auctionQueue.add(
      "process-auction-event",
      { eventType, carId, data },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        ...options,
      },
    );

    return job;
  } catch (error) {
    console.error("Error queuing auction event:", error);
    return null;
  }
};

// =============================
// 🖼️ IMAGE PROCESSING QUEUE FUNCTIONS
// =============================

export const queueImageProcessing = async (imageUrl, carId, operations, options = {}) => {
  try {
    if (!imageProcessingQueue) {
      console.error("Image processing queue not initialized");
      return null;
    }

    const job = await imageProcessingQueue.add(
      "process-image",
      { imageUrl, carId, operations },
      {
        attempts: 2,
        backoff: { type: "exponential", delay: 3000 },
        ...options,
      },
    );

    return job;
  } catch (error) {
    console.error("Error queuing image processing:", error);
    return null;
  }
};

// =============================
// 📊 QUEUE METRICS
// =============================

export const getQueueMetrics = async () => {
  try {
    const metrics = {};

    if (emailQueue) {
      const emailCounts = await emailQueue.getJobCounts();
      metrics.email = emailCounts;
    }

    if (notificationQueue) {
      const notificationCounts = await notificationQueue.getJobCounts();
      metrics.notifications = notificationCounts;
    }

    if (reportQueue) {
      const reportCounts = await reportQueue.getJobCounts();
      metrics.reports = reportCounts;
    }

    if (auctionQueue) {
      const auctionCounts = await auctionQueue.getJobCounts();
      metrics.auctions = auctionCounts;
    }

    if (imageProcessingQueue) {
      const imageCounts = await imageProcessingQueue.getJobCounts();
      metrics.imageProcessing = imageCounts;
    }

    return metrics;
  } catch (error) {
    console.error("Error getting queue metrics:", error);
    return null;
  }
};
