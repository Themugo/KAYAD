import mongoose from "mongoose";

const inspectorApplicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  // Applicant info (stored directly for non-logged-in applicants)
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  idNumber: { type: String, required: true },
  location: { type: String, required: true },
  // Professional details
  yearsOfExperience: { type: Number, required: true, min: 0 },
  specialties: [String],
  certifications: [String],
  toolsAvailable: { type: String },
  preferredRegions: [String],
  // Docs
  cvUrl: String,
  certificationDocs: [String],
  // Status
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
    index: true,
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewedAt: Date,
  reviewNotes: String,
  // On approval, maps to User ghost_checker fields
  assignedSpecialty: String,
  assignedRegion: String,
}, { timestamps: true });

inspectorApplicationSchema.index({ email: 1 });
inspectorApplicationSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("InspectorApplication", inspectorApplicationSchema);
