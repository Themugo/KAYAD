// backend/tests/organization.test.js
// ─────────────────────────────────────────────────────────────
// Organization tests
// Tests organization model and service
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import Organization from "../models/Organization.js";
import Branch from "../models/Branch.js";
import Department from "../models/Department.js";
import Team from "../models/Team.js";
import Role from "../models/Role.js";
import { startTestDB, stopTestDB, describeWithDb } from "./setup.js";

await startTestDB();
await stopTestDB();

describeWithDb("Organization Model", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a new organization", async () => {
    const ownerId = mongoose.Types.ObjectId();

    const organization = await Organization.create({
      name: "Test Organization",
      type: "dealership",
      owner: ownerId,
    });

    expect(organization).toHaveProperty("name", "Test Organization");
    expect(organization).toHaveProperty("type", "dealership");
    expect(organization).toHaveProperty("owner", ownerId);
    expect(organization.totalBranches).toBe(0);
    expect(organization.totalUsers).toBe(0);
  });

  it("should enforce type enum", async () => {
    const ownerId = mongoose.Types.ObjectId();

    await expect(
      Organization.create({
        name: "Test Organization",
        type: "invalid_type",
        owner: ownerId,
      }),
    ).rejects.toThrow();
  });

  it("should add admin", async () => {
    const ownerId = mongoose.Types.ObjectId();
    const adminId = mongoose.Types.ObjectId();

    const organization = await Organization.create({
      name: "Test Organization",
      type: "dealership",
      owner: ownerId,
    });

    await organization.addAdmin(adminId);
    await organization.reload();

    expect(organization.admins).toContain(adminId);
  });

  it("should remove admin", async () => {
    const ownerId = mongoose.Types.ObjectId();
    const adminId = mongoose.Types.ObjectId();

    const organization = await Organization.create({
      name: "Test Organization",
      type: "dealership",
      owner: ownerId,
      admins: [adminId],
    });

    await organization.removeAdmin(adminId);
    await organization.reload();

    expect(organization.admins).not.toContain(adminId);
  });

  it("should check if user is admin", async () => {
    const ownerId = mongoose.Types.ObjectId();
    const adminId = mongoose.Types.ObjectId();

    const organization = await Organization.create({
      name: "Test Organization",
      type: "dealership",
      owner: ownerId,
      admins: [adminId],
    });

    expect(organization.isAdmin(ownerId)).toBe(true);
    expect(organization.isAdmin(adminId)).toBe(true);
    expect(organization.isAdmin(mongoose.Types.ObjectId())).toBe(false);
  });

  it("should check subscription limit", async () => {
    const ownerId = mongoose.Types.ObjectId();

    const organization = await Organization.create({
      name: "Test Organization",
      type: "dealership",
      owner: ownerId,
      subscription: {
        maxBranches: 5,
        maxUsers: 10,
      },
      totalBranches: 3,
      totalUsers: 5,
    });

    expect(organization.checkSubscriptionLimit("branches")).toBe(true);
    expect(organization.checkSubscriptionLimit("users")).toBe(true);

    organization.totalBranches = 5;
    expect(organization.checkSubscriptionLimit("branches")).toBe(false);
  });

  it("should increment branch count", async () => {
    const ownerId = mongoose.Types.ObjectId();

    const organization = await Organization.create({
      name: "Test Organization",
      type: "dealership",
      owner: ownerId,
    });

    await organization.incrementBranchCount();
    await organization.reload();

    expect(organization.totalBranches).toBe(1);
  });

  it("should get organizations by owner", async () => {
    const ownerId = mongoose.Types.ObjectId();

    await Organization.create({
      name: "Test Organization 1",
      type: "dealership",
      owner: ownerId,
    });

    await Organization.create({
      name: "Test Organization 2",
      type: "dealership",
      owner: ownerId,
    });

    const organizations = await Organization.getByOwner(ownerId);

    expect(organizations.length).toBe(2);
  });

  it("should get organizations by type", async () => {
    const ownerId = mongoose.Types.ObjectId();

    await Organization.create({
      name: "Test Organization 1",
      type: "dealership",
      owner: ownerId,
    });

    await Organization.create({
      name: "Test Organization 2",
      type: "fleet_company",
      owner: ownerId,
    });

    const dealerships = await Organization.getByType("dealership");
    const fleetCompanies = await Organization.getByType("fleet_company");

    expect(dealerships.length).toBe(1);
    expect(fleetCompanies.length).toBe(1);
  });
});

describeWithDb("Branch Model", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a new branch", async () => {
    const organizationId = mongoose.Types.ObjectId();
    const managerId = mongoose.Types.ObjectId();

    const branch = await Branch.create({
      organization: organizationId,
      name: "Main Branch",
      type: "main",
      manager: managerId,
    });

    expect(branch).toHaveProperty("name", "Main Branch");
    expect(branch).toHaveProperty("type", "main");
    expect(branch).toHaveProperty("organization", organizationId);
    expect(branch.totalDepartments).toBe(0);
    expect(branch.totalTeams).toBe(0);
  });

  it("should enforce type enum", async () => {
    const organizationId = mongoose.Types.ObjectId();

    await expect(
      Branch.create({
        organization: organizationId,
        name: "Test Branch",
        type: "invalid_type",
      }),
    ).rejects.toThrow();
  });

  it("should add staff", async () => {
    const organizationId = mongoose.Types.ObjectId();
    const staffId = mongoose.Types.ObjectId();

    const branch = await Branch.create({
      organization: organizationId,
      name: "Test Branch",
    });

    await branch.addStaff(staffId);
    await branch.reload();

    expect(branch.staff).toContain(staffId);
  });

  it("should remove staff", async () => {
    const organizationId = mongoose.Types.ObjectId();
    const staffId = mongoose.Types.ObjectId();

    const branch = await Branch.create({
      organization: organizationId,
      name: "Test Branch",
      staff: [staffId],
    });

    await branch.removeStaff(staffId);
    await branch.reload();

    expect(branch.staff).not.toContain(staffId);
  });

  it("should check if user is staff", async () => {
    const organizationId = mongoose.Types.ObjectId();
    const staffId = mongoose.Types.ObjectId();

    const branch = await Branch.create({
      organization: organizationId,
      name: "Test Branch",
      staff: [staffId],
    });

    expect(branch.isStaff(staffId)).toBe(true);
    expect(branch.isStaff(mongoose.Types.ObjectId())).toBe(false);
  });

  it("should get branches by organization", async () => {
    const organizationId = mongoose.Types.ObjectId();

    await Branch.create({
      organization: organizationId,
      name: "Branch 1",
      type: "main",
    });

    await Branch.create({
      organization: organizationId,
      name: "Branch 2",
      type: "branch",
    });

    const branches = await Branch.getByOrganization(organizationId);

    expect(branches.length).toBe(2);
  });
});

describeWithDb("Team Model", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a new team", async () => {
    const organizationId = mongoose.Types.ObjectId();
    const leadId = mongoose.Types.ObjectId();

    const team = await Team.create({
      organization: organizationId,
      name: "Sales Team",
      type: "sales",
      lead: leadId,
    });

    expect(team).toHaveProperty("name", "Sales Team");
    expect(team).toHaveProperty("type", "sales");
    expect(team).toHaveProperty("organization", organizationId);
    expect(team.totalMembers).toBe(0);
  });

  it("should enforce type enum", async () => {
    const organizationId = mongoose.Types.ObjectId();

    await expect(
      Team.create({
        organization: organizationId,
        name: "Test Team",
        type: "invalid_type",
      }),
    ).rejects.toThrow();
  });

  it("should add member", async () => {
    const organizationId = mongoose.Types.ObjectId();
    const memberId = mongoose.Types.ObjectId();

    const team = await Team.create({
      organization: organizationId,
      name: "Test Team",
    });

    await team.addMember(memberId);
    await team.reload();

    expect(team.members).toContain(memberId);
    expect(team.totalMembers).toBe(1);
  });

  it("should remove member", async () => {
    const organizationId = mongoose.Types.ObjectId();
    const memberId = mongoose.Types.ObjectId();

    const team = await Team.create({
      organization: organizationId,
      name: "Test Team",
      members: [memberId],
    });

    await team.removeMember(memberId);
    await team.reload();

    expect(team.members).not.toContain(memberId);
    expect(team.totalMembers).toBe(0);
  });

  it("should check permission", async () => {
    const organizationId = mongoose.Types.ObjectId();

    const team = await Team.create({
      organization: organizationId,
      name: "Test Team",
      permissions: {
        canListCars: true,
        canEditCars: true,
        canDeleteCars: false,
      },
    });

    expect(team.hasPermission("canListCars")).toBe(true);
    expect(team.hasPermission("canDeleteCars")).toBe(false);
  });

  it("should get teams by organization", async () => {
    const organizationId = mongoose.Types.ObjectId();

    await Team.create({
      organization: organizationId,
      name: "Team 1",
      type: "sales",
    });

    await Team.create({
      organization: organizationId,
      name: "Team 2",
      type: "finance",
    });

    const teams = await Team.getByOrganization(organizationId);

    expect(teams.length).toBe(2);
  });
});

describeWithDb("Role Model", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a new role", async () => {
    const organizationId = mongoose.Types.ObjectId();

    const role = await Role.create({
      organization: organizationId,
      name: "Sales Manager",
      type: "custom",
      permissions: [
        {
          resource: "listing",
          actions: ["read", "write", "delete"],
        },
      ],
    });

    expect(role).toHaveProperty("name", "Sales Manager");
    expect(role).toHaveProperty("type", "custom");
    expect(role).toHaveProperty("organization", organizationId);
    expect(role.permissions).toHaveLength(1);
  });

  it("should add permission", async () => {
    const organizationId = mongoose.Types.ObjectId();

    const role = await Role.create({
      organization: organizationId,
      name: "Test Role",
    });

    await role.addPermission("listing", ["read", "write"]);
    await role.reload();

    expect(role.permissions).toHaveLength(1);
    expect(role.permissions[0].resource).toBe("listing");
    expect(role.permissions[0].actions).toContain("read");
  });

  it("should remove permission", async () => {
    const organizationId = mongoose.Types.ObjectId();

    const role = await Role.create({
      organization: organizationId,
      name: "Test Role",
      permissions: [
        {
          resource: "listing",
          actions: ["read", "write", "delete"],
        },
      ],
    });

    await role.removePermission("listing", ["delete"]);
    await role.reload();

    expect(role.permissions[0].actions).not.toContain("delete");
    expect(role.permissions[0].actions).toContain("read");
  });

  it("should check permission", async () => {
    const organizationId = mongoose.Types.ObjectId();

    const role = await Role.create({
      organization: organizationId,
      name: "Test Role",
      permissions: [
        {
          resource: "listing",
          actions: ["read", "write"],
        },
      ],
    });

    expect(role.hasPermission("listing", "read")).toBe(true);
    expect(role.hasPermission("listing", "delete")).toBe(false);
  });

  it("should get roles by organization", async () => {
    const organizationId = mongoose.Types.ObjectId();

    await Role.create({
      organization: organizationId,
      name: "Role 1",
      type: "custom",
    });

    await Role.create({
      organization: organizationId,
      name: "Role 2",
      type: "custom",
    });

    const roles = await Role.getByOrganization(organizationId);

    expect(roles.length).toBe(2);
  });
});
