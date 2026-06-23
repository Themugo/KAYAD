// backend/migrations/Migration.js - Migration Tracking Model
// ─────────────────────────────────────────────────────────────
// Tracks which migrations have been run
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const migrationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  executedAt: {
    type: Date,
    default: Date.now,
  },
  duration: {
    type: Number, // in milliseconds
  },
});

export default mongoose.model("Migration", migrationSchema);
