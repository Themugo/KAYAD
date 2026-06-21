import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    attachments: [
      {
        url: String,
        type: { type: String, enum: ["image", "video", "file"] },
      },
    ],
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

const chatSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      default: null,
    },
    messages: [messageSchema],
    isBlocked: { type: Boolean, default: false },
    lastMessage: {
      text: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: Date,
    },
  },
  { timestamps: true },
);

chatSchema.index({ participants: 1 });
chatSchema.index({ updatedAt: -1 });
// Phase 1: Add compound index for user chat queries sorted by recent activity
chatSchema.index({ participants: 1, updatedAt: -1 });

chatSchema.methods.addMessage = function (messageData) {
  this.messages.push(messageData);
  this.lastMessage = {
    text: messageData.text,
    sender: messageData.sender,
    createdAt: new Date(),
  };
  return this.save();
};

chatSchema.methods.markAsSeen = function (userId) {
  const recentMessages = this.messages.slice(-50);
  for (const msg of recentMessages) {
    if (!msg.seenBy.some((id) => id.toString() === userId.toString())) {
      msg.seenBy.push(userId);
    }
  }
  return this.save();
};

const Chat = mongoose.models.Chat || mongoose.model("Chat", chatSchema);

export default Chat;
