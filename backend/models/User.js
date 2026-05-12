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
      enum: ["user", "dealer", "broker", "admin", "superadmin"],
      default: "user",
      index: true,
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