import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    // =============================
    // 💬 CHAT RELATION
    // =============================
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },

    // =============================
    // 👤 SENDER
    // =============================
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // =============================
    // 👤 RECEIVER (OPTIONAL - 1:1)
    // =============================
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // =============================
    // 💬 CONTENT
    // =============================
    text: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000, // 🔥 prevent abuse
    },

    // =============================
    // 📎 ATTACHMENTS
    // =============================
    attachments: [
      {
        url: String,
        type: {
          type: String,
          enum: ["image", "video", "file"],
        },
        size: Number, // 🔥 useful for limits later
      },
    ],

    // =============================
    // 📊 STATUS
    // =============================
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
      index: true,
    },

    // =============================
    // 👀 READ TRACKING
    // =============================
    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // =============================
    // ⚠️ MODERATION / SAFETY
    // =============================
    isDeleted: {
      type: Boolean,
      default: false,
    },

    isEdited: {
      type: Boolean,
      default: false,
    },

    editedAt: Date,
  },
  {
    timestamps: true,
  }
);

// =============================
// 🔥 INDEXES (CRITICAL)
// =============================

// fast chat loading
messageSchema.index({ chatId: 1, createdAt: 1 });

// unread messages per user
messageSchema.index({ receiver: 1, status: 1 });

// sender history
messageSchema.index({ sender: 1, createdAt: -1 });

// =============================
// ⚡ METHOD: MARK AS SEEN
// =============================
messageSchema.methods.markAsSeen = function (userId) {
  const alreadySeen = this.seenBy.some(
    (id) => id.toString() === userId.toString()
  );

  if (!alreadySeen) {
    this.seenBy.push(userId);
  }

  this.status = "seen";

  return this.save();
};

// =============================
// ⚡ METHOD: EDIT MESSAGE
// =============================
messageSchema.methods.editMessage = function (newText) {
  this.text = newText;
  this.isEdited = true;
  this.editedAt = new Date();

  return this.save();
};

// =============================
// ⚡ METHOD: SOFT DELETE
// =============================
messageSchema.methods.softDelete = function () {
  this.text = "";
  this.attachments = [];
  this.isDeleted = true;

  return this.save();
};

// =============================
// ⚡ STATIC: GET CHAT MESSAGES
// =============================
messageSchema.statics.getChatMessages = function (chatId) {
  return this.find({ chatId, isDeleted: false })
    .sort({ createdAt: 1 })
    .populate("sender", "name email");
};

// =============================
// ⚡ STATIC: GET UNREAD COUNT
// =============================
messageSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    receiver: userId,
    status: { $ne: "seen" },
  });
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const Message =
  mongoose.models.Message ||
  mongoose.model("Message", messageSchema);

export default Message;