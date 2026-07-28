// backend/migrations/migrate_enterprise_organizations.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Database migration for Enterprise Dealer Organizations system
// Creates Organization, Branch, Department, Team, Role collections
// Migrates existing dealers to organizations
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import Organization from "../models/Organization.js";
import Branch from "../models/Branch.js";
import Department from "../models/Department.js";
import Team from "../models/Team.js";
import Role from "../models/Role.js";
import Dealer from "../models/Dealer.js";
import DealerTeam from "../models/DealerTeam.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";

// =============================
// 🚀 RUN MIGRATION
// =============================

export const up = async () => {
  try {
    logInfo("Starting Enterprise Dealer Organizations migration");

    // Check if collections already exist
    const collections = await mongoose.connection.db.listCollections().toArray();
    const organizationExists = collections.some((c) => c.name === "organizations");

    if (organizationExists) {
      logWarn("Organization collection already exists, skipping creation");
      return { success: true, message: "Collections already exist" };
    }

    // Create indexes for all models
    await Organization.init();
    await Branch.init();
    await Department.init();
    await Team.init();
    await Role.init();

    logInfo("Organization indexes created");

    // Migrate existing dealers to organizations
    let migrationCount = 0;
    try {
      const dealers = await Dealer.find({}).populate("user").sort({ createdAt: -1 }).limit(500);

      for (const dealer of dealers) {
        try {
          // Check if organization already exists for this dealer
          const existingOrganization = await Organization.findOne({ legacyDealerId: dealer._id });
          if (existingOrganization) {
            logWarn("Organization already exists for dealer", { dealerId: dealer._id });
            continue;
          }

          // Create organization from dealer
          const organization = await Organization.createFromDealer(dealer, dealer.user);

          // Create default branch for the organization
          const branch = await Branch.create({
            organization: organization._id,
            name: `${dealer.businessName} - Main Branch`,
            type: "main",
            address: {
              city: dealer.location,
            },
            phone: dealer.phone,
            manager: dealer.user._id,
            staff: [dealer.user._id],
          });

          // Update organization branch count
          await organization.incrementBranchCount();

          // Migrate existing dealer team to new team structure
          const dealerTeams = await DealerTeam.find({ dealer: dealer.user._id });

          for (const dealerTeam of dealerTeams) {
            try {
              const team = await Team.create({
                organization: organization._id,
                branch: branch._id,
                name: `${dealerTeam.role} Team`,
                type: "sales",
                lead: dealerTeam.member,
                members: [dealerTeam.member],
                permissions: {
                  canListCars: dealerTeam.permissions.canListCars,
                  canEditCars: dealerTeam.permissions.canEditCars,
                  canDeleteCars: dealerTeam.permissions.canDeleteCars,
                  canViewEarnings: dealerTeam.permissions.canViewEarnings,
                  canManageTeam: dealerTeam.permissions.canManageTeam,
                  canApproveDeals: dealerTeam.permissions.canApproveDeals,
                  canChatBuyers: dealerTeam.permissions.canChatBuyers,
                  canEditSettings: dealerTeam.permissions.canEditSettings,
                },
              });

              await branch.incrementTeamCount();
            } catch (err) {
              logWarn("Failed to migrate dealer team", { dealerTeamId: dealerTeam._id, error: err.message });
            }
          }

          migrationCount++;

          // Log progress every 50 migrations
          if (migrationCount % 50 === 0) {
            logInfo("Migration progress", { count: migrationCount });
          }
        } catch (err) {
          logWarn("Failed to migrate dealer to organization", { dealerId: dealer._id, error: err.message });
        }
      }

      logInfo("Dealer migration completed", {
        total: dealers.length,
        success: migrationCount,
      });
    } catch (err) {
      logError("Failed to migrate dealers", err);
    }

    // Create default system roles for organizations
    try {
      const systemRoles = [
        {
          name: "Organization Owner",
          type: "system",
          description: "Full access to organization resources",
          permissions: [
            { resource: "organization", actions: ["read", "write", "delete", "manage"] },
            { resource: "branch", actions: ["read", "write", "delete", "manage"] },
            { resource: "team", actions: ["read", "write", "delete", "manage"] },
            { resource: "role", actions: ["read", "write", "delete", "manage"] },
            { resource: "listing", actions: ["read", "write", "delete", "manage"] },
            { resource: "user", actions: ["read", "write", "delete", "manage"] },
          ],
        },
        {
          name: "Branch Manager",
          type: "system",
          description: "Full access to branch resources",
          permissions: [
            { resource: "branch", actions: ["read", "write", "manage"] },
            { resource: "team", actions: ["read", "write", "manage"] },
            { resource: "listing", actions: ["read", "write", "delete", "manage"] },
            { resource: "user", actions: ["read", "write"] },
          ],
        },
        {
          name: "Sales Agent",
          type: "system",
          description: "Sales team member with limited access",
          permissions: [
            { resource: "listing", actions: ["read", "write"] },
            { resource: "team", actions: ["read"] },
          ],
        },
        {
          name: "Finance Officer",
          type: "system",
          description: "Finance team member with financial access",
          permissions: [
            { resource: "listing", actions: ["read"] },
            { resource: "finance", actions: ["read", "write", "manage"] },
            { resource: "team", actions: ["read"] },
          ],
        },
        {
          name: "Viewer",
          type: "system",
          description: "Read-only access to all resources",
          permissions: [
            { resource: "organization", actions: ["read"] },
            { resource: "branch", actions: ["read"] },
            { resource: "team", actions: ["read"] },
            { resource: "listing", actions: ["read"] },
          ],
        },
      ];

      // Create system roles for each organization
      const organizations = await Organization.find({});
      for (const organization of organizations) {
        for (const roleData of systemRoles) {
          try {
            await Role.create({
              ...roleData,
              organization: organization._id,
            });
          } catch (err) {
            logWarn("Failed to create system role", {
              organizationId: organization._id,
              roleName: roleData.name,
              error: err.message,
            });
          }
        }
      }

      logInfo("System roles created for organizations");
    } catch (err) {
      logError("Failed to create system roles", err);
    }

    logInfo("Enterprise Dealer Organizations migration completed", { migrationCount });

    return {
      success: true,
      message: "Migration completed successfully",
      stats: { migrationCount },
    };
  } catch (err) {
    logError("Enterprise Dealer Organizations migration failed", err);
    throw err;
  }
};

// =============================
// 🔄 ROLLBACK MIGRATION
// =============================

export const down = async () => {
  try {
    logInfo("Starting Enterprise Dealer Organizations rollback");

    // Drop the collections
    await mongoose.connection.db.dropCollection("organizations");
    await mongoose.connection.db.dropCollection("branches");
    await mongoose.connection.db.dropCollection("departments");
    await mongoose.connection.db.dropCollection("teams");
    await mongoose.connection.db.dropCollection("roles");

    logInfo("Organization collections dropped");

    return { success: true, message: "Rollback completed successfully" };
  } catch (err) {
    logError("Enterprise Dealer Organizations rollback failed", err);
    throw err;
  }
};

// =============================
// 🚀 RUN MIGRATION (STANDALONE)
// =============================

if (import.meta.url === `file://${process.argv[1]}`) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log("Connected to MongoDB");

      const operation = process.argv[2];

      if (operation === "down") {
        await down();
        console.log("Migration rolled back");
      } else {
        await up();
        console.log("Migration completed");
      }

      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

export default { up, down };
