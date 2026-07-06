import mongoose from "mongoose";

const errorBudgetSnapshotSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  consumedPercent: { type: Number, required: true },
  remainingPercent: { type: Number, required: true },
  sliValue: { type: mongoose.Schema.Types.Mixed },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
}, { _id: false });

const alertEventSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  policyId: { type: String, required: true },
  severity: { type: String, required: true },
  message: { type: String, required: true },
  burnRate: { type: Number },
  acknowledged: { type: Boolean, default: false },
  acknowledgedAt: Date,
  acknowledgedBy: String,
}, { _id: false });

const errorBudgetSchema = new mongoose.Schema({
  sloId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  sloName: { type: String, required: true },
  totalBudget: { type: Number, required: true },
  unit: { type: String, default: "percentage" },
  consumedBudget: { type: Number, default: 0 },
  remainingBudget: { type: Number, default: 0 },
  consumedPercent: { type: Number, default: 0 },
  remainingPercent: { type: Number, default: 100 },
  status: {
    type: String,
    enum: ["healthy", "warning", "critical", "exhausted"],
    default: "healthy",
  },
  currentSliValue: { type: mongoose.Schema.Types.Mixed },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  history: [errorBudgetSnapshotSchema],
  alertEvents: [alertEventSchema],
  lastUpdated: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

errorBudgetSchema.methods.consume = function (amount, sliValue) {
  this.consumedBudget += amount;
  this.remainingBudget = Math.max(0, this.totalBudget - this.consumedBudget);
  this.consumedPercent = this.totalBudget > 0
    ? Math.min(100, (this.consumedBudget / this.totalBudget) * 100)
    : 100;
  this.remainingPercent = Math.max(0, 100 - this.consumedPercent);
  this.currentSliValue = sliValue;

  if (this.consumedPercent >= 100) this.status = "exhausted";
  else if (this.consumedPercent >= 80) this.status = "critical";
  else if (this.consumedPercent >= 50) this.status = "warning";
  else this.status = "healthy";

  this.lastUpdated = new Date();
};

errorBudgetSchema.methods.addSnapshot = function () {
  if (this.history.length >= 10080) {
    this.history.shift();
  }
  this.history.push({
    timestamp: new Date(),
    consumedPercent: this.consumedPercent,
    remainingPercent: this.remainingPercent,
    sliValue: this.currentSliValue,
    periodStart: this.periodStart,
    periodEnd: this.periodEnd,
  });
};

const ErrorBudget = mongoose.model("ErrorBudget", errorBudgetSchema);

export default ErrorBudget;
