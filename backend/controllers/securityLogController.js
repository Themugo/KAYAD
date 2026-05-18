import SecurityLog from "../models/SecurityLog.js";

export const getSecurityLogs = async (req, res) => {
  try {
    const { action, severity, actor, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (action) filter.action = { $regex: action, $options: "i" };
    if (severity) filter.severity = severity;
    if (actor) filter.actor = actor;

    const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 200);

    const [logs, total] = await Promise.all([
      SecurityLog.find(filter)
        .populate("actor", "name email role")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Math.min(Number(limit), 200))
        .lean(),
      SecurityLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page: Number(page),
        limit: Math.min(Number(limit), 200),
        total,
        pages: Math.ceil(total / Math.min(Number(limit), 200)),
      },
    });
  } catch (err) {
    console.error("❌ GET SECURITY LOGS ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to fetch logs" });
  }
};

export const getSecurityLogSummary = async (req, res) => {
  try {
    const [total, criticalCount, recentActions] = await Promise.all([
      SecurityLog.countDocuments({}),
      SecurityLog.countDocuments({ severity: "critical" }),
      SecurityLog.aggregate([
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
    ]);
    res.json({ success: true, summary: { total, criticalCount, recentActions } });
  } catch (err) {
    console.error("❌ SECURITY LOG SUMMARY ERROR:", err);
    res.status(500).json({ success: false, message: "Failed" });
  }
};
