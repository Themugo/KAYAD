import Car from "../models/Car.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { sendNotification } from "../services/notification.service.js";
import { logInfo, logError } from "../utils/logger.js";

export const bulkModerateCars = async (req, res) => {
  try {
    const { carIds, action, adminNote } = req.body;

    if (!carIds || !Array.isArray(carIds) || carIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "carIds array is required",
      });
    }

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'approve' or 'reject'",
      });
    }

    const newStatus = action === "approve" ? "active" : "rejected";

    const cars = await Car.find({ _id: { $in: carIds } }).populate("dealer", "_id email name");

    if (cars.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No cars found",
      });
    }

    await Car.updateMany(
      { _id: { $in: carIds } },
      { $set: { status: newStatus } },
    );

    const dealerNotified = new Set();
    for (const car of cars) {
      if (car.dealer && !dealerNotified.has(car.dealer._id.toString())) {
        dealerNotified.add(car.dealer._id.toString());
        const listingTitle = car.title || `${car.brand || ""} ${car.model || ""}`.trim();

        if (action === "approve") {
          await sendNotification({
            userId: car.dealer._id,
            title: "Listing Approved",
            message: `Your listing "${listingTitle}" has been approved and is now live.`,
            type: "info",
            email: car.dealer.email,
          });
        } else {
          await sendNotification({
            userId: car.dealer._id,
            title: "Listing Rejected",
            message: `Your listing "${listingTitle}" was not approved.${adminNote ? ` Reason: ${adminNote}` : ""}`,
            type: "system",
            email: car.dealer.email,
          });
        }
      }
    }

    logInfo("Bulk car moderation", { carIds, action, adminId: req.user.id, count: cars.length });

    await AuditLog.create({
      action: `bulk_car_${action}`,
      actor: req.user.id,
      actorRole: req.user.role,
      actorName: req.user.name,
      details: { carIds, action, adminNote, count: cars.length },
    });

    res.json({
      success: true,
      message: `${cars.length} car(s) ${action}d`,
      count: cars.length,
    });
  } catch (err) {
    logError("Bulk moderate cars error", err);
    res.status(500).json({
      success: false,
      message: "Failed to moderate cars",
    });
  }
};

export const bulkDeleteCars = async (req, res) => {
  try {
    const { carIds } = req.body;

    if (!carIds || !Array.isArray(carIds) || carIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "carIds array is required",
      });
    }

    const cars = await Car.find({ _id: { $in: carIds } });

    if (cars.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No cars found",
      });
    }

    await Car.updateMany(
      { _id: { $in: carIds } },
      { $set: { status: "deleted" } },
    );

    logInfo("Bulk car delete", { carIds, adminId: req.user.id, count: cars.length });

    await AuditLog.create({
      action: "bulk_car_delete",
      actor: req.user.id,
      actorRole: req.user.role,
      actorName: req.user.name,
      details: { carIds, count: cars.length },
    });

    res.json({
      success: true,
      message: `${cars.length} car(s) deleted`,
      count: cars.length,
    });
  } catch (err) {
    logError("Bulk delete cars error", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete cars",
    });
  }
};

export const exportCarsCSV = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.brand) filter.brand = req.query.brand;
    if (req.query.sold === "true") filter.sold = true;

    const cars = await Car.find(filter)
      .populate("dealer", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const headers = ["_id", "title", "brand", "model", "year", "price", "status", "createdAt", "sellerName", "sellerEmail"];

    const rows = cars.map((car) =>
      headers
        .map((h) => {
          let val;
          if (h === "sellerName") val = car.dealer?.name || "";
          else if (h === "sellerEmail") val = car.dealer?.email || "";
          else val = car[h];
          return `"${String(val || "").replace(/"/g, '""')}"`;
        })
        .join(","),
    );

    const csv = `${headers.join(",")}\n${rows.join("\n")}`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=cars_export.csv");
    res.send(csv);
  } catch (err) {
    logError("Export cars CSV error", err);
    res.status(500).json({
      success: false,
      message: "Failed to export cars",
    });
  }
};

export const exportUsersCSV = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.banned === "true") filter.isBanned = true;

    const users = await User.find(filter)
      .select("_id name email role status isBanned phoneVerified createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const headers = ["_id", "name", "email", "role", "status", "isBanned", "phoneVerified", "createdAt"];

    const rows = users.map((user) =>
      headers
        .map((h) => `"${String(user[h] || "").replace(/"/g, '""')}"`)
        .join(","),
    );

    const csv = `${headers.join(",")}\n${rows.join("\n")}`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=users_export.csv");
    res.send(csv);
  } catch (err) {
    logError("Export users CSV error", err);
    res.status(500).json({
      success: false,
      message: "Failed to export users",
    });
  }
};
