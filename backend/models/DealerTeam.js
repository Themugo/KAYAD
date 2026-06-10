import mongoose from "mongoose";

// Each member of a dealer's team
const dealerTeamMemberSchema = new mongoose.Schema(
  {
    dealer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["manager", "sales_agent", "lot_agent", "finance_officer", "viewer"],
      default: "sales_agent",
    },
    permissions: {
      canListCars: { type: Boolean, default: true },
      canEditCars: { type: Boolean, default: true },
      canDeleteCars: { type: Boolean, default: false },
      canViewEarnings: { type: Boolean, default: false },
      canManageTeam: { type: Boolean, default: false }, // only managers
      canApproveDeals: { type: Boolean, default: false },
      canChatBuyers: { type: Boolean, default: true },
      canEditSettings: { type: Boolean, default: false },
    },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["active", "suspended", "invited"], default: "invited" },
    inviteEmail: { type: String }, // for pending invites
    inviteToken: { type: String, select: false },
    joinedAt: { type: Date },
  },
  { timestamps: true },
);

dealerTeamMemberSchema.index({ dealer: 1, member: 1 }, { unique: true, sparse: true });

const DealerTeam = mongoose.models.DealerTeam || mongoose.model("DealerTeam", dealerTeamMemberSchema);
export default DealerTeam;
