import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    // =============================
    // 👤 BASIC INFO
    // =============================
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // 🔥 IMPORTANT
    },

    role: {
      type: String,
      enum: ["user", "dealer", "broker", "admin", "superadmin", "escrow_officer", "ad_manager", "moderator", "ghost_checker", "individual_seller"],
      default: "user",
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected"],
      default: "unverified",
    },
    dealerDocuments: {
      businessLicenseUrl: { type: String, default: "" },
      showroomPhotoUrl: { type: String, default: "" },
      kraPinUrl: { type: String, default: "" },
    },

    isBanned: {
      type: Boolean,
      default: false,
      index: true,
    },

    // =============================
    // 📞 CONTACT
    // =============================
    phone: {
      type: String,
      trim: true,
      index: true,
    },

    avatar: {
      type: String,
      default: "",
    },

    // =============================
    // 🏪 DEALER PROFILE
    // =============================
    businessName: {
      type: String,
      trim: true,
    },

    location: {
      type: String,
      trim: true,
    },

    bio: {
      type: String,
      trim: true,
      default: "",
    },

    // =============================
    // 💳 PAYMENT SETTINGS
    // =============================
    mpesaBusiness: { type: String, trim: true, default: "" },
    mpesaBusinessName: { type: String, trim: true, default: "" },
    bankName: { type: String, trim: true, default: "" },
    bankAccount: { type: String, trim: true, default: "" },
    bankBranch: { type: String, trim: true, default: "" },

    approved: {
      type: Boolean,
      default: false,
      index: true,
    },

    dealerRating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5,
    },

    // =============================
    // 💼 PAYMENT DETAILS (DEALER ONBOARDING)
    // =============================
    paymentDetails: {
      bankName: { type: String, default: "" },
      accountName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      paybillNumber: { type: String, default: "" },
      mpesaPhone: { type: String, default: "" },
    },
    onboardingComplete: { type: Boolean, default: false },
    subscriptionStatus: { type: String, enum: ["active", "past_due", "none"], default: "none" },

    // =============================
    // 💼 SELLER FINANCIAL SETTINGS
    // =============================
    commission: { type: Number, default: 5, min: 0, max: 50 },
    waiver: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },

    totalSales: { type: Number, default: 0 },
    listingCount: { type: Number, default: 0 },

    // =============================
    // 👁 DEALER VISIBILITY
    // =============================
    visibility: {
      showPhone: { type: Boolean, default: true },
      showEmail: { type: Boolean, default: true },
      showLocation: { type: Boolean, default: true },
      chatEnabled: { type: Boolean, default: true },
      autoApproveReviews: { type: Boolean, default: false },
    },

    // =============================
    // 🧠 PERSONALIZATION (FUTURE AI)
    // =============================
    preferences: {
      brands: [String],
      priceRange: {
        min: Number,
        max: Number,
      },
      bodyType: [String],
    },

    // =============================
    // 🔍 GHOST CHECKER PROFILE
    // =============================
    isInspector: { type: Boolean, default: false },
    inspectionSpecialty: [String],
    locationCity: String,
    averageRating: { type: Number, default: 5 },
    completedChecks: { type: Number, default: 0 },

    // =============================
    // 🔐 SECURITY
    // =============================
    lastLogin: Date,

    resetToken: String,
    resetTokenExpire: Date,
  },
  { timestamps: true }
);

// =============================
// 🔐 PRE-SAVE (SAFE HASH)
// =============================
userSchema.pre("save", async function (next) {
  try {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }

    // 🔥 ONLY hash if changed
    if (!this.isModified("password")) return next();

    // 🔥 prevent double hash
    if (this.password.startsWith("$2")) return next();

    this.password = await bcrypt.hash(this.password, 10);

    next();
  } catch (err) {
    next(err);
  }
});

// =============================
// 🔐 MATCH PASSWORD (FIXED)
// =============================
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// =============================
// 🔑 SAFE JSON OUTPUT
// =============================
userSchema.methods.toJSON = function () {
  const obj = this.toObject();

  delete obj.password;
  delete obj.resetToken;
  delete obj.resetTokenExpire;

  return obj;
};

// =============================
// ⚡ STATIC LOGIN HELPER (IMPORTANT FIX)
// =============================
userSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email }).select("+password");

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  return user;
};

// =============================
const User =
  mongoose.models.User || mongoose.model("User", userSchema);

export default User;