import InspectorApplication from "../models/InspectorApplication.js";
import User from "../models/User.js";
import UserAuth from "../models/UserAuth.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendNotification } from "../services/notification.service.js";
import { logError } from "../utils/logger.js";
import { submitApplicationSchema } from "../validation/inspectorApplication.schema.js";
import { getSupabase } from "../utils/supabase.js";

const INSPECTOR_REVIEW_ROLES = ["admin", "superadmin", "hr", "technical_support"];

// =============================
// 📝 SUBMIT APPLICATION
// =============================
export const submitApplication = async (req, res) => {
  try {
    const parsed = submitApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = Object.entries(parsed.error.flatten().fieldErrors)
        .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
        .join("; ");
      return res.status(400).json({ success: false, message: messages || "Invalid inspector application" });
    }

    const {
      fullName, email, phone, idNumber, location, yearsOfExperience,
      specialties, certifications, toolsAvailable, preferredRegions, cvUrl, certificationDocs,
    } = parsed.data;

    const existing = await InspectorApplication.findOne({ email: email.toLowerCase().trim(), status: "pending" });
    if (existing) {
      return res.status(400).json({ success: false, message: "You already have a pending application" });
    }

    const application = await InspectorApplication.create({
      user: req.user?.id || null,
      fullName,
      email: email.toLowerCase().trim(),
      phone,
      idNumber,
      location,
      yearsOfExperience,
      specialties: specialties || [],
      certifications: certifications || [],
      toolsAvailable,
      preferredRegions: preferredRegions || [],
      cvUrl,
      certificationDocs: certificationDocs || [],
    });

    // The application row is the durable onboarding result. Reviewer
    // notifications are deliberately asynchronous so a slow/misconfigured
    // notification provider cannot make a successful application appear to
    // hang or return a 500 after the database write has committed.
    void (async () => {
      try {
        const reviewers = await User.find({ role: { $in: INSPECTOR_REVIEW_ROLES } })
          .select("_id email")
          .lean();
        await Promise.all(
          reviewers.map((reviewer) =>
            sendNotification({
              userId: reviewer._id,
              type: "system",
              title: "New Inspector Application",
              message: `${fullName} (${email}) has applied as an inspector. ${yearsOfExperience} years, ${location}.`,
              email: reviewer.email,
            }),
          ),
        );
      } catch (notificationError) {
        console.warn("Inspector reviewer notification failed:", notificationError?.message || notificationError);
      }
    })();

    res.status(201).json({ success: true, application });
  } catch (err) {
    logError("❌ INSPECTOR APPLY ERROR:", err);
    res.status(500).json({ success: false, message: "Application failed" });
  }
};

// =============================
// 👥 LIST ACTIVE INSPECTORS (public)
// =============================
export const listActiveInspectors = async (req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from("inspection_providers")
      .select("id,user_id,company_name,trading_name,email,phone,county,town,description,inspection_types,status,verification_status,average_rating,reviews_count")
      .eq("status", "active")
      .eq("verification_status", "verified")
      .order("average_rating", { ascending: false })
      .order("reviews_count", { ascending: false });

    if (error) throw error;

    const inspectors = (data || []).map((provider) => ({
      id: provider.id,
      userId: provider.user_id,
      name: provider.trading_name || provider.company_name,
      companyName: provider.company_name,
      email: provider.email,
      phone: provider.phone,
      location: provider.town || provider.county,
      bio: provider.description,
      inspectionSpecialty: provider.inspection_types || [],
      rating: Number(provider.average_rating || 0),
      inspectionsCompleted: Number(provider.reviews_count || 0),
    }));

    res.json({ success: true, inspectors });
  } catch (err) {
    logError("LIST ACTIVE INSPECTORS ERROR", { error: err.message });
    res.status(500).json({ success: false, message: "Failed to load inspectors" });
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

    if (application.user?.toString() === req.user.id) {
      return res.status(403).json({ success: false, message: "Cannot approve your own application" });
    }

    const approvalPatch = {
      status: "approved",
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      reviewNotes,
      assignedSpecialty: assignedSpecialty || application.specialties?.[0] || "general",
      assignedRegion: assignedRegion || application.location,
    };

    // Find or create the real platform identity. Inspector capability is
    // represented by the canonical inspection_providers domain, not by
    // ad-hoc users.isInspector/inspectionSpecialty/locationCity fields (those
    // columns do not exist in the current users table).
    let user = await User.findOne({ email: application.email });
    // The apply endpoint is public and takes any email address, so approval must
    // never rewrite the role of an existing dealer, private seller or staff
    // account that merely shares that email. Only buyers (and existing
    // inspectors) are converted.
    if (user && !["user", "ghost_checker"].includes(user.role)) {
      return res.status(409).json({
        success: false,
        message: `An existing ${user.role} account already uses ${application.email}. Resolve the account conflict before approving this application.`,
      });
    }
    let setPasswordLink = null;
    if (!user) {
      const inspectorPw = await bcrypt.hash(
        process.env.SEED_INSPECTOR_PW || (await import("crypto")).randomBytes(16).toString("base64url") + "!A1",
        12
      );
      user = await User.create({
        name: application.fullName,
        email: application.email,
        phone: application.phone,
        role: "ghost_checker",
        status: "approved",
        emailVerified: true,
      });
      // The password above is random and never shown to anyone, so give the new
      // inspector a way in: a single-use set-password link (hashed at rest).
      const setupToken = crypto.randomBytes(32).toString("hex");
      await UserAuth.create({
        user: user.id,
        password: inspectorPw,
        resetToken: crypto.createHash("sha256").update(setupToken).digest("hex"),
        resetTokenExpire: new Date(Date.now() + 72 * 60 * 60 * 1000),
      });
      setPasswordLink = `${process.env.FRONTEND_URL || "https://kayad.space"}/reset-password?token=${setupToken}`;
    } else {
      user.role = "ghost_checker";
      user.status = "approved";
      user.emailVerified = true;
      await user.save();
    }

    const sb = getSupabase();
    const { data: existingProvider, error: providerLookupError } = await sb
      .from("inspection_providers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (providerLookupError) throw providerLookupError;

    const providerPayload = {
      user_id: user.id,
      company_name: application.fullName,
      trading_name: application.fullName,
      email: application.email,
      phone: application.phone,
      county: application.location,
      town: application.location,
      inspection_types: application.specialties || [],
      description: application.toolsAvailable || null,
      status: "active",
      verification_status: "verified",
      lifecycle_stage: "ACTIVE",
      reviewed_by: req.user.id,
      reviewed_at: new Date().toISOString(),
    };
    const providerQuery = existingProvider
      ? sb.from("inspection_providers").update(providerPayload).eq("id", existingProvider.id).select().single()
      : sb.from("inspection_providers").insert(providerPayload).select().single();
    const { data: provider, error: providerWriteError } = await providerQuery;
    if (providerWriteError) throw providerWriteError;

    Object.assign(application, approvalPatch);
    await application.save();

    // Approval is already durably committed at this point. Notification delivery
    // must never turn a successful approval into a false 500 or force an admin to
    // repeat an approval that already created the provider identity.
    void sendNotification({
      userId: user._id,
      title: "✅ Inspector Application Approved",
      message: setPasswordLink
        ? `Welcome to the KAYAD Inspector Network! Set your password here (valid 72 hours): ${setPasswordLink} then log in to receive inspection assignments.`
        : `Welcome to the KAYAD Inspector Network! Your account is now active. Log in to receive inspection assignments.`,
      type: "system",
      email: application.email,
      phone: application.phone,
    }).catch((notificationError) => {
      console.warn("Inspector approval notification failed:", notificationError?.message || notificationError);
    });

    res.json({ success: true, application, provider, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    logError("❌ APPROVE INSPECTOR ERROR:", err);
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

    void sendNotification({
      userId: application.user,
      title: "Inspector Application Update",
      message: `Your KAYAD Inspector application has been reviewed. ${reviewNotes ? `Notes: ${reviewNotes}` : "Please contact support for details."}`,
      type: "system",
      email: application.email,
    }).catch((notificationError) => {
      console.warn("Inspector rejection notification failed:", notificationError?.message || notificationError);
    });

    res.json({ success: true, application });
  } catch (err) {
    logError("❌ REJECT INSPECTOR ERROR:", err);
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
      pagination: {
        page: Number(page),
        limit: Math.min(Number(limit), 50),
        total,
        pages: Math.ceil(total / Math.min(Number(limit), 50)),
      },
    });
  } catch (err) {
    logError("❌ LIST INSPECTOR APPS ERROR:", err);
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
    logError("❌ GET APP ERROR:", err);
    res.status(500).json({ success: false, message: "Failed" });
  }
};
