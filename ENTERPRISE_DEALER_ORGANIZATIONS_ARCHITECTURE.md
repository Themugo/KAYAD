# Enterprise Dealer Organizations Architecture Plan

**Date:** June 15, 2026  
**Architect:** Multi-Tenant SaaS Architect  
**Project:** KAYAD Enterprise Dealer Organizations  
**Version:** 1.0.0

---

## Executive Summary

The Enterprise Dealer Organizations system provides multi-tenant organizational structure for large dealerships, fleet companies, banks, leasing firms, and corporate sellers. It enables hierarchical organization management with branches, departments, teams, roles, and granular permissions while maintaining full compatibility with existing dealer accounts.

**Key Objectives:**
- Support multi-location dealer operations
- Enable hierarchical organizational structure
- Provide granular role-based permissions
- Maintain compatibility with existing dealer accounts
- Support enterprise use cases (dealerships, fleets, banks, leasing)
- Enable team collaboration and management

---

## Audit Findings

### Current Dealer Structure
**Model:** Dealer.js
- Simple dealer profile linked to User
- Basic business info: businessName, location, phone, logo
- Verification status: approved, verifiedAt
- Trust metrics: rating, totalReviews
- Performance metrics: totalSales, totalRevenue, totalListings
- Account control: isSuspended, suspensionReason
- No organizational hierarchy
- No branch/location management
- No team structure beyond simple DealerTeam

**Integration Points:**
- Can be extended with organization reference
- Can link to Organization model
- Can maintain backward compatibility with existing dealers

### Current User Structure
**Model:** User.js
- Basic user profile with role enum
- Roles: user, dealer, broker, admin, superadmin, escrow_officer, ad_manager, moderator, ghost_checker, individual_seller, marketing, technical_support, hr, accounts
- Granted/revoked permissions system
- No organizational context
- No team membership
- No department assignment

**Integration Points:**
- Can be extended with organization, branch, team references
- Can maintain existing role system
- Can add organizational permissions

### Current Team Structure
**Model:** DealerTeam.js
- Simple team member structure
- Roles: manager, sales_agent, lot_agent, finance_officer, viewer
- Basic permissions: canListCars, canEditCars, canDeleteCars, etc.
- No organizational hierarchy
- No department structure
- No branch assignment

**Integration Points:**
- Can be extended with organization, branch, department references
- Can maintain existing permissions
- Can migrate to new Team model

---

## Architecture Design

### Organizational Hierarchy

```
Organization (Enterprise)
├── Branch (Location/Office)
│   ├── Department (Sales, Finance, etc.)
│   │   └── Team (Sales Team A)
│   │       └── Member (User with Role)
│   └── Team (Branch Operations)
│       └── Member (User with Role)
└── Team (Organization-wide)
    └── Member (User with Role)
```

### Use Cases

**Large Dealerships:**
- Multiple locations/branches
- Sales teams per branch
- Finance departments
- Service departments
- Regional management

**Fleet Companies:**
- Central fleet management
- Regional fleet managers
- Driver teams
- Maintenance teams
- Corporate buyers

**Banks:**
- Repo departments
- Regional branches
- Asset management teams
- Auction coordination
- Compliance teams

**Leasing Firms:**
- Portfolio management
- Regional offices
- Sales teams
- Credit teams
- Asset recovery teams

**Corporate Sellers:**
- Corporate accounts
- Multiple departments
- Approval workflows
- Budget management
- Reporting requirements

### Data Models

#### Organization Model
```javascript
{
  // =============================
  // 🏢 ORGANIZATION INFO
  // =============================
  name: {
    type: String,
    required: true,
    index: true,
  },
  
  type: {
    type: String,
    enum: ["dealership", "fleet_company", "bank", "leasing_firm", "corporate_seller", "individual"],
    default: "individual",
    index: true,
  },
  
  // =============================
  // 📍 CONTACT INFO
  // =============================
  email: String,
  phone: String,
  website: String,
  
  address: {
    street: String,
    city: String,
    county: String,
    country: String,
    postalCode: String,
    coordinates: {
      type: { type: String },
      coordinates: [Number],
    },
  },
  
  // =============================
  // 🏷️ BRANDING
  // =============================
  logo: String,
  primaryColor: String,
  secondaryColor: String,
  
  // =============================
  // 👥 OWNERSHIP
  // =============================
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  
  // =============================
  // ⚙️ SETTINGS
  // =============================
  settings: {
    allowBranchCreation: {
      type: Boolean,
      default: true,
    },
    requireBranchApproval: {
      type: Boolean,
      default: false,
    },
    maxBranches: {
      type: Number,
      default: 10,
    },
    allowTeamCreation: {
      type: Boolean,
      default: true,
    },
    requireTeamApproval: {
      type: Boolean,
      default: false,
    },
    customRolesEnabled: {
      type: Boolean,
      default: false,
    },
  },
  
  // =============================
  // 💰 BILLING
  // =============================
  subscription: {
    plan: {
      type: String,
      enum: ["free", "starter", "professional", "enterprise"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "past_due", "cancelled", "trial"],
      default: "active",
    },
    maxUsers: {
      type: Number,
      default: 5,
    },
    maxBranches: {
      type: Number,
      default: 3,
    },
    expiresAt: Date,
  },
  
  // =============================
  // 📊 METADATA
  // =============================
  totalBranches: {
    type: Number,
    default: 0,
  },
  
  totalUsers: {
    type: Number,
    default: 0,
  },
  
  totalListings: {
    type: Number,
    default: 0,
  },
  
  // =============================
  // 🔗 LEGACY COMPATIBILITY
  // =============================
  legacyDealerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Dealer",
    index: true,
  },
  
  timestamps: true,
}
```

#### Branch Model
```javascript
{
  // =============================
  // 🔗 ORGANIZATION
  // =============================
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  },
  
  // =============================
  // 📍 BRANCH INFO
  // =============================
  name: {
    type: String,
    required: true,
    index: true,
  },
  
  code: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  
  type: {
    type: String,
    enum: ["main", "branch", "satellite", "warehouse", "service_center"],
    default: "branch",
  },
  
  // =============================
  // 📍 LOCATION
  // =============================
  address: {
    street: String,
    city: String,
    county: String,
    country: String,
    postalCode: String,
    coordinates: {
      type: { type: String },
      coordinates: [Number],
    },
  },
  
  // =============================
  // 📞 CONTACT
  // =============================
  phone: String,
  email: String,
  
  // =============================
  // 👥 MANAGEMENT
  // =============================
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  
  staff: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  
  // =============================
  // ⚙️ SETTINGS
  // =============================
  settings: {
    allowDepartmentCreation: {
      type: Boolean,
      default: true,
    },
    allowTeamCreation: {
      type: Boolean,
      default: true,
    },
    inventoryLimit: {
      type: Number,
      default: 100,
    },
  },
  
  // =============================
  // 📊 METADATA
  // =============================
  totalDepartments: {
    type: Number,
    default: 0,
  },
  
  totalTeams: {
    type: Number,
    default: 0,
  },
  
  totalListings: {
    type: Number,
    default: 0,
  },
  
  // =============================
  // 🚫 STATUS
  // =============================
  status: {
    type: String,
    enum: ["active", "inactive", "suspended"],
    default: "active",
    index: true,
  },
  
  timestamps: true,
}
```

#### Department Model
```javascript
{
  // =============================
  // 🔗 ORGANIZATION & BRANCH
  // =============================
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  },
  
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    index: true,
  },
  
  // =============================
  // 📋 DEPARTMENT INFO
  // =============================
  name: {
    type: String,
    required: true,
    index: true,
  },
  
  type: {
    type: String,
    enum: ["sales", "finance", "service", "marketing", "admin", "it", "hr", "operations"],
    default: "sales",
  },
  
  description: String,
  
  // =============================
  // 👥 MANAGEMENT
  // =============================
  head: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  
  // =============================
  // 📊 METADATA
  // =============================
  totalTeams: {
    type: Number,
    default: 0,
  },
  
  totalMembers: {
    type: Number,
    default: 0,
  },
  
  // =============================
  // 🚫 STATUS
  // =============================
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  
  timestamps: true,
}
```

#### Team Model
```javascript
{
  // =============================
  // 🔗 ORGANIZATION, BRANCH, DEPARTMENT
  // =============================
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  },
  
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    index: true,
  },
  
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    index: true,
  },
  
  // =============================
  // 👥 TEAM INFO
  // =============================
  name: {
    type: String,
    required: true,
    index: true,
  },
  
  type: {
    type: String,
    enum: ["sales", "finance", "service", "admin", "operations", "custom"],
    default: "sales",
  },
  
  description: String,
  
  // =============================
  // 👥 MANAGEMENT
  // =============================
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  
  // =============================
  // 🔐 PERMISSIONS
  // =============================
  permissions: {
    canListCars: { type: Boolean, default: true },
    canEditCars: { type: Boolean, default: true },
    canDeleteCars: { type: Boolean, default: false },
    canViewEarnings: { type: Boolean, default: false },
    canManageTeam: { type: Boolean, default: false },
    canApproveDeals: { type: Boolean, default: false },
    canChatBuyers: { type: Boolean, default: true },
    canEditSettings: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: false },
    canManageInventory: { type: Boolean, default: true },
  },
  
  // =============================
  // 📊 METADATA
  // =============================
  totalMembers: {
    type: Number,
    default: 0,
  },
  
  totalListings: {
    type: Number,
    default: 0,
  },
  
  // =============================
  // 🚫 STATUS
  // =============================
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  
  timestamps: true,
}
```

#### Role Model
```javascript
{
  // =============================
  // 🔗 ORGANIZATION
  // =============================
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  },
  
  // =============================
  // 👤 ROLE INFO
  // =============================
  name: {
    type: String,
    required: true,
    index: true,
  },
  
  type: {
    type: String,
    enum: ["system", "custom"],
    default: "custom",
  },
  
  description: String,
  
  // =============================
  // 🔐 PERMISSIONS
  // =============================
  permissions: [{
    resource: String,
    actions: [String],
  }],
  
  // =============================
  // 📊 METADATA
  // =============================
  totalUsers: {
    type: Number,
    default: 0,
  },
  
  // =============================
  // 🚫 STATUS
  // =============================
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  
  timestamps: true,
}
```

---

## File-by-File Implementation Plan

### 1. Database Models

#### 1.1 Create Organization Model
**File:** `backend/models/Organization.js`

**Schema:** As defined above

**Indexes:**
- name
- type
- owner
- legacyDealerId

**Methods:**
- `addAdmin(userId)` - Add organization admin
- `removeAdmin(userId)` - Remove organization admin
- `createBranch(branchData)` - Create branch
- `getBranches()` - Get all branches
- `getUsers()` - Get all users
- `updateSubscription(subscriptionData)` - Update subscription
- `checkSubscriptionLimit()` - Check subscription limits

#### 1.2 Create Branch Model
**File:** `backend/models/Branch.js`

**Schema:** As defined above

**Indexes:**
- organization
- name
- code
- status

**Methods:**
- `addStaff(userId)` - Add staff member
- `removeStaff(userId)` - Remove staff member
- `createDepartment(departmentData)` - Create department
- `getDepartments()` - Get all departments
- `getTeams()` - Get all teams
- `updateSettings(settings)` - Update branch settings

#### 1.3 Create Department Model
**File:** `backend/models/Department.js`

**Schema:** As defined above

**Indexes:**
- organization
- branch
- name
- status

**Methods:**
- `addMember(userId)` - Add department member
- `removeMember(userId)` - Remove department member
- `createTeam(teamData)` - Create team
- `getTeams()` - Get all teams

#### 1.4 Create Team Model
**File:** `backend/models/Team.js`

**Schema:** As defined above

**Indexes:**
- organization
- branch
- department
- name
- status

**Methods:**
- `addMember(userId)` - Add team member
- `removeMember(userId)` - Remove team member
- `updatePermissions(permissions)` - Update team permissions
- `getMembers()` - Get all members

#### 1.5 Create Role Model
**File:** `backend/models/Role.js`

**Schema:** As defined above

**Indexes:**
- organization
- name
- status

**Methods:**
- `addPermission(resource, actions)` - Add permission
- `removePermission(resource, actions)` - Remove permission
- `assignToUser(userId)` - Assign role to user
- `revokeFromUser(userId)` - Revoke role from user

### 2. Services

#### 2.1 Create Organization Service
**File:** `backend/services/organizationService.js`

**Functions:**
- `createOrganization(organizationData)` - Create organization
- `getOrganization(organizationId)` - Get organization
- `updateOrganization(organizationId, updateData)` - Update organization
- `deleteOrganization(organizationId)` - Delete organization
- `getOrganizationUsers(organizationId)` - Get organization users
- `addOrganizationAdmin(organizationId, userId)` - Add admin
- `removeOrganizationAdmin(organizationId, userId)` - Remove admin
- `createBranch(organizationId, branchData)` - Create branch
- `getOrganizationBranches(organizationId)` - Get branches
- `getOrganizationStats(organizationId)` - Get organization stats

#### 2.2 Create Branch Service
**File:** `backend/services/branchService.js`

**Functions:**
- `createBranch(branchData)` - Create branch
- `getBranch(branchId)` - Get branch
- `updateBranch(branchId, updateData)` - Update branch
- `deleteBranch(branchId)` - Delete branch
- `addBranchStaff(branchId, userId)` - Add staff
- `removeBranchStaff(branchId, userId)` - Remove staff
- `createDepartment(branchId, departmentData)` - Create department
- `getBranchDepartments(branchId)` - Get departments
- `getBranchTeams(branchId)` - Get teams
- `getBranchStats(branchId)` - Get branch stats

#### 2.3 Create Team Service
**File:** `backend/services/teamService.js`

**Functions:**
- `createTeam(teamData)` - Create team
- `getTeam(teamId)` - Get team
- `updateTeam(teamId, updateData)` - Update team
- `deleteTeam(teamId)` - Delete team
- `addTeamMember(teamId, userId)` - Add member
- `removeTeamMember(teamId, userId)` - Remove member
- `updateTeamPermissions(teamId, permissions)` - Update permissions
- `getTeamMembers(teamId)` - Get members
- `getUserTeams(userId)` - Get user teams

#### 2.4 Create Role Service
**File:** `backend/services/roleService.js`

**Functions:**
- `createRole(roleData)` - Create role
- `getRole(roleId)` - Get role
- `updateRole(roleId, updateData)` - Update role
- `deleteRole(roleId)` - Delete role
- `assignRole(roleId, userId)` - Assign role to user
- `revokeRole(roleId, userId)` - Revoke role from user
- `getUserRoles(userId)` - Get user roles
- `getOrganizationRoles(organizationId)` - Get organization roles

### 3. Controllers

#### 3.1 Create Organization Controller
**File:** `backend/controllers/organizationController.js`

**Endpoints:**
- `POST /api/organizations` - Create organization
- `GET /api/organizations/:id` - Get organization
- `PUT /api/organizations/:id` - Update organization
- `DELETE /api/organizations/:id` - Delete organization
- `GET /api/organizations/:id/users` - Get organization users
- `POST /api/organizations/:id/admins` - Add admin
- `DELETE /api/organizations/:id/admins/:userId` - Remove admin
- `POST /api/organizations/:id/branches` - Create branch
- `GET /api/organizations/:id/branches` - Get branches
- `GET /api/organizations/:id/stats` - Get stats

#### 3.2 Create Branch Controller
**File:** `backend/controllers/branchController.js`

**Endpoints:**
- `POST /api/branches` - Create branch
- `GET /api/branches/:id` - Get branch
- `PUT /api/branches/:id` - Update branch
- `DELETE /api/branches/:id` - Delete branch
- `POST /api/branches/:id/staff` - Add staff
- `DELETE /api/branches/:id/staff/:userId` - Remove staff
- `POST /api/branches/:id/departments` - Create department
- `GET /api/branches/:id/departments` - Get departments
- `GET /api/branches/:id/teams` - Get teams
- `GET /api/branches/:id/stats` - Get stats

#### 3.3 Create Team Controller
**File:** `backend/controllers/teamController.js`

**Endpoints:**
- `POST /api/teams` - Create team
- `GET /api/teams/:id` - Get team
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team
- `POST /api/teams/:id/members` - Add member
- `DELETE /api/teams/:id/members/:userId` - Remove member
- `PUT /api/teams/:id/permissions` - Update permissions
- `GET /api/teams/:id/members` - Get members

#### 3.4 Create Role Controller
**File:** `backend/controllers/roleController.js`

**Endpoints:**
- `POST /api/roles` - Create role
- `GET /api/roles/:id` - Get role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role
- `POST /api/roles/:id/assign` - Assign role
- `DELETE /api/roles/:id/revoke/:userId` - Revoke role
- `GET /api/roles/organization/:organizationId` - Get organization roles

### 4. Routes

#### 4.1 Create Organization Routes
**File:** `backend/routes/organizationRoutes.js`

**Routes:**
- Admin routes for organization management
- Organization owner routes for self-management

#### 4.2 Create Branch Routes
**File:** `backend/routes/branchRoutes.js`

**Routes:**
- Organization admin routes for branch management
- Branch manager routes for self-management

#### 4.3 Create Team Routes
**File:** `backend/routes/teamRoutes.js`

**Routes:**
- Organization admin routes for team management
- Team lead routes for self-management

#### 4.4 Create Role Routes
**File:** `backend/routes/roleRoutes.js`

**Routes:**
- Organization admin routes for role management

### 5. Database Migrations

#### 5.1 Create Migration Script
**File:** `backend/migrations/migrate_enterprise_organizations.js`

**Steps:**
1. Create Organization, Branch, Department, Team, Role collections
2. Add indexes
3. Migrate existing dealers to organizations
4. Migrate existing DealerTeam to new Team model
5. Update User model with organization references
6. Update Car model with organization references

### 6. Dashboard Components

#### 6.1 Create Organization Dashboard
**File:** `src/components/admin/OrganizationDashboard.jsx`

**Components:**
- `OrganizationList` - List of all organizations
- `OrganizationDetails` - Organization details and settings
- `OrganizationStats` - Organization statistics
- `SubscriptionManagement` - Subscription management

#### 6.2 Create Branch Management
**File:** `src/components/dealer/BranchManagement.jsx`

**Components:**
- `BranchList` - List of branches
- `BranchDetails` - Branch details and settings
- `BranchStaff` - Branch staff management
- `BranchDepartments` - Department management

#### 6.3 Create Role Management
**File:** `src/components/dealer/RoleManagement.jsx`

**Components:**
- `RoleList` - List of roles
- `RoleDetails` - Role details and permissions
- `RolePermissions` - Permission management
- `UserRoleAssignment` - User role assignment

---

## Migration Strategy

### Phase 1: Foundation (Week 1)
- Create Organization, Branch, Department, Team, Role models
- Create organization, branch, team, role services
- Test model validation and relationships
- Ensure backward compatibility

### Phase 2: Migration (Week 2)
- Create migration script
- Migrate existing dealers to organizations
- Migrate existing DealerTeam to new Team model
- Update User model with organization references
- Test migration accuracy

### Phase 3: Integration (Week 3)
- Integrate organization context into existing features
- Update Car model with organization references
- Implement organization-based permissions
- Test integration with existing workflows

### Phase 4: Rollout (Week 4)
- Deploy to production
- Enable organization features for new users
- Gradually migrate existing users
- Monitor system stability

---

## Backwards Compatibility Strategy

### Default Behavior
- All existing dealer accounts remain unchanged
- Organization features are opt-in for existing users
- Existing DealerTeam model remains functional
- No changes to existing user roles
- No changes to existing permissions

### Migration Path
1. **Phase 1:** Deploy new models without affecting existing data
2. **Phase 2:** Migrate existing dealers to organizations (background)
3. **Phase 3:** Enable organization features for migrated users
4. **Phase 4:** Deprecate old models after full migration

### Rollback Plan
- If migration fails, disable organization features via environment variable
- Emergency disable of organization system
- Database rollback to pre-migration state
- Revert User and Car model changes

---

## Compatibility with Current Dealer Accounts

### Existing Dealer Flow
- Existing dealers continue to work as before
- No changes to dealer creation workflow
- No changes to dealer verification
- No changes to dealer listings
- No changes to dealer permissions

### Organization Transition
- Existing dealers can opt-in to organization features
- Automatic organization creation on opt-in
- Seamless transition from dealer to organization
- Preservation of all existing data

### Data Preservation
- All existing dealer data preserved
- All existing team data preserved
- All existing user data preserved
- All existing listing data preserved

---

## Security Considerations

### Access Control
- Organization owners have full control
- Branch managers have branch-level control
- Team leads have team-level control
- Role-based access to organization features
- Audit logging for all organization actions

### Data Isolation
- Organization data isolated by organization
- Branch data isolated by branch
- Team data isolated by team
- No cross-organization data access
- Role-based data access

### Permission System
- Granular permissions at team level
- Role-based permissions at organization level
- Inheritance of permissions from parent
- Custom roles for enterprise needs

---

## Testing Strategy

### Unit Tests
- Test model validation and relationships
- Test service layer functions
- Test permission logic
- Test migration functions

### Integration Tests
- Test organization creation and management
- Test branch creation and management
- Test team creation and management
- Test role assignment and permissions

### E2E Tests
- Test complete organization workflow
- Test migration from dealer to organization
- Test permission enforcement
- Test dashboard functionality

---

## Success Metrics

### Platform Level
- Migration success rate > 99.9%
- Organization creation success rate > 99.9%
- Permission enforcement accuracy > 99.9%
- Zero impact on existing dealer accounts

### Business Level
- Organization adoption rate > 30%
- Enterprise customer acquisition > 20%
- Multi-location dealer satisfaction > 85%
- Team collaboration improvement > 40%

---

## Next Steps

1. Review and approve architecture plan
2. Create Organization model
3. Create Branch model
4. Create Department model
5. Create Team model
6. Create Role model
7. Create organization service
8. Create branch service
9. Create team service
10. Create role service
11. Create controllers and routes
12. Create migration script
13. Create dashboard components
14. Test thoroughly
15. Deploy to production
16. Monitor and iterate

---

**Architecture Plan Completed:** June 15, 2026  
**Next Phase:** Implementation  
**Estimated Timeline:** 4 weeks
