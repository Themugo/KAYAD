import InspectorApplication from "../models/InspectorApplication.js";
import User from "../models/User.js";
import { sendNotification } from "../services/notification.service.js";

// =============================
// 📝 SUBMIT APPLICATION
// =============================
export const submitApplication = async (req, res) => {
  try {
    const {
      fullName, email, phone, idNumber, location,
      yearsOfExperience, specialties, certifications,
      toolsAvailable, preferredRegions, cvUrl, certificationDocs,
    } = req.body;

    if (!fullName || !email || !phone || !idNumber || !location || yearsOfExperience === undefined) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const existing = await InspectorApplication.findOne({ email: email.toLowerCase().trim(), status: "pending" });
    if (existing) {
      return res.status(400).json({ success: false, message: "You already have a pending application" });
    }

    const application = await InspectorApplication.create({
      user: req.user?.id || null,
      fullName, email: email.toLowerCase().trim(), phone, idNumber, location,
      yearsOfExperience, specialties: specialties || [], certifications: certifications || [],
      toolsAvailable, preferredRegions: preferredRegions || [], cvUrl, certificationDocs: certificationDocs || [],
    });

    await sendNotification({
      userId: null, type: "system",
      title: "New Inspector Application",
      message: `${fullName} (${email}) has applied as an inspector. ${yearsOfExperience} years, ${location}.`,
    });

    res.json({ success: true, application });
  } catch (err) {
    console.error("❌ INSPECTOR APPLY ERROR:", err);
    res.status(500).json({ success: false, message: "Application failed" });
  }
};

// =============================
// ✅ APPROVE APPLICATION
// =============================
export const approveApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedSpecialty, assignedRegion, reviewNotes } = req.body;

    const application = await InspectorApplication.findById(id);
    if (!application) return res.status(404).json({ success: false, message: "Application not found" });

    if (application.status !== "pending") {
      return res.status(400).json({ success: false, message: `Already ${application.status}` });
    }

    application.status = "approved";
    application.reviewedBy = req.user.id;
    application.reviewedAt = new Date();
    application.reviewNotes = reviewNotes;
    application.assignedSpecialty = assignedSpecialty || application.specialties?.[0] || "general";
    application.assignedRegion = assignedRegion || application.location;
    await application.save();

    // Find or create user with ghost_checker role
    let user = await User.findOne({ email: application.email });
    if (!user) {
      user = await User.create({
        name: application.fullName,
        email: application.email,
        phone: application.phone,
        password: process.env.SEED_INSPECTOR_PW || (await import("crypto")).randomBytes(16).toString("base64url") + "!A1",
        role: "ghost_checker",
      });
    } else {
      user.role = "ghost_checker";
    }
    user.isInspector = true;
    user.inspectionSpecialty = application.assignedSpecialty;
    user.locationCity = application.assignedRegion;
    user.verificationStatus = "verified";
    await user.save();

    await sendNotification({
      userId: user._id,
      title: "✅ Inspector Application Approved",
      message: `Welcome to the KAYAD Inspector Network! Your account is now active. Log in to receive inspection assignments.`,
      type: "system",
      email: application.email,
      phone: application.phone,
    });

    res.json({ success: true, application, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    console.error("❌ APPROVE INSPECTOR ERROR:", err);
    res.status(500).json({ success: false, message: "Approval failed" });
  }
};

// =============================
// ❌ REJECT APPLICATION
// =============================
export const rejectApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body;

    const application = await InspectorApplication.findById(id);
    if (!application) return res.status(404).json({ success: false, message: "Application not found" });

    application.status = "rejected";
    application.reviewedBy = req.user.id;
    application.reviewedAt = new Date();
    application.reviewNotes = reviewNotes;
    await application.save();

    await sendNotification({
      userId: application.user,
      title: "Inspector Application Update",
      message: `Your KAYAD Inspector application has been reviewed. ${reviewNotes ? `Notes: ${reviewNotes}` : "Please contact support for details."}`,
      type: "system",
      email: application.email,
    });

    res.json({ success: true, application });
  } catch (err) {
    console.error("❌ REJECT INSPECTOR ERROR:", err);
    res.status(500).json({ success: false, message: "Rejection failed" });
  }
};

// =============================
// 📋 LIST APPLICATIONS (ADMIN)
// =============================
export const listApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 50);

    const [applications, total] = await Promise.all([
      InspectorApplication.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(Number(limit), 50))
        .lean(),
      InspectorApplication.countDocuments(filter),
    ]);

    res.json({
      success: true,
      applications,
      pagination: { page: Number(page), limit: Math.min(Number(limit), 50), total, pages: Math.ceil(total / Math.min(Number(limit), 50)) },
    });
  } catch (err) {
    console.error("❌ LIST INSPECTOR APPS ERROR:", err);
    res.status(500).json({ success: false, message: "Failed" });
  }
};

// =============================
// 🔍 GET APPLICATION BY ID
// =============================
export const getApplication = async (req, res) => {
  try {
    const application = await InspectorApplication.findById(req.params.id).lean();
    if (!application) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, application });
  } catch (err) {
    console.error("❌ GET APP ERROR:", err);
    res.status(500).json({ success: false, message: "Failed" });
  }
};
