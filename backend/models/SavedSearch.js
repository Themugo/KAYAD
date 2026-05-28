import mongoose from "mongoose";

const savedSearchSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  name: { type: String, required: true, trim: true },
  filters: { type: mongoose.Schema.Types.Mixed, default: {} },
  notify: { type: Boolean, default: true },
  lastNotifiedAt: { type: Date },
}, { timestamps: true });

savedSearchSchema.index({ user: 1, createdAt: -1 });

const SavedSearch = mongoose.models.SavedSearch || mongoose.model("SavedSearch", savedSearchSchema);
export default SavedSearch;
