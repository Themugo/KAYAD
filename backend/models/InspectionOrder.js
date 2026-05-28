import mongoose from "mongoose";

const checklistItemSchema = new mongoose.Schema({
  category: { type: String, required: true },
  item: { type: String, required: true },
  passed: { type: Boolean },
  notes: { type: String },
}, { _id: false });

const inspectionOrderSchema = new mongoose.Schema({
  car: { type: mongoose.Schema.Types.ObjectId, ref: "Car", required: true, index: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  inspector: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: {
    type: String,
    enum: ["pending_payment", "paid", "assigned", "in_progress", "completed", "cancelled"],
    default: "pending_payment",
    index: true,
  },
  fee: { type: Number, default: 2500 },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },

  checklist: [checklistItemSchema],
  overallScore: { type: Number, min: 0, max: 100 },
  conditionRating: { type: String, enum: ["excellent", "good", "fair", "poor"] },
  inspectorNotes: { type: String },

  images: [{
    url: String,
    caption: String,
  }],

  scheduledAt: { type: Date },
  completedAt: { type: Date },
  location: { type: String },
}, { timestamps: true });

inspectionOrderSchema.index({ buyer: 1, createdAt: -1 });
inspectionOrderSchema.index({ inspector: 1, status: 1 });
inspectionOrderSchema.index({ car: 1, status: 1 });

const InspectionOrder = mongoose.models.InspectionOrder
  || mongoose.model("InspectionOrder", inspectionOrderSchema);

export default InspectionOrder;
