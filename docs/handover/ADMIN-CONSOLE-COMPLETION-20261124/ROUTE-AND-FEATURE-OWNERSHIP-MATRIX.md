# Route and feature ownership matrix (2026-11-24)

Static scan of the source tree. **Authoritative workspace** = the page that owns the business operation; dashboard panels and department hubs only link to it. **UI gate** is a display mirror; the server is the authority.

| # | Route | Page component | Business domain (sidebar group) | API calls found in page source | UI gate (mirror) | Server guard proven |
|---|---|---|---|---|---|---|
| 1 | `/admin` | AdminView | Command Centre | `adminAPI.stats`, `adminAPI.users`, `adminAPI.cars`, `adminAPI.getAuditLog`, `adminAPI.getStaff`, `adminAPI.toggleBan` | any platform staff | see 53-ROUTE-AUDIT-MATRIX.md |
| 2 | `/admin/users` | AdminUsers | Accounts & Onboarding | `adminAPI.users`, `adminAPI.toggleBan`, `adminAPI.dealerOnboardingReadiness`, `adminAPI.approveDealer` | MANAGE_USERS | see 53-ROUTE-AUDIT-MATRIX.md |
| 3 | `/admin/sellers` | AdminSellers | Accounts & Onboarding | `adminAPI.users`, `adminAPI.approveDealer`, `adminAPI.toggleBan`, `adminAPI.updateSellerSettings` | MANAGE_STAFF | see 53-ROUTE-AUDIT-MATRIX.md |
| 4 | `/admin/private-seller-applications` | AdminPrivateSellerApplications | Accounts & Onboarding | not found by scan | MANAGE_USERS | see 53-ROUTE-AUDIT-MATRIX.md |
| 5 | `/admin/cars` | AdminCars | Marketplace | `adminAPI.cars`, `adminAPI.moderateCar` | MANAGE_CARS | see 53-ROUTE-AUDIT-MATRIX.md |
| 6 | `/admin/moderation` | AdminCarModeration | Marketplace | `adminAPI.cars`, `adminAPI.moderateCar` | MANAGE_CARS | see 53-ROUTE-AUDIT-MATRIX.md |
| 7 | `/admin/auctions` | AdminAuctions | Marketplace | not found by scan | MANAGE_AUCTIONS | see 53-ROUTE-AUDIT-MATRIX.md |
| 8 | `/admin/bids` | AdminBids | Marketplace | not found by scan | MANAGE_AUCTIONS | see 53-ROUTE-AUDIT-MATRIX.md |
| 9 | `/admin/escrows` | AdminEscrows | Finance | not found by scan | VIEW_ESCROW | see 53-ROUTE-AUDIT-MATRIX.md |
| 10 | `/admin/reviews` | AdminReviews | Customer Care | `adminAPI.reviews`, `adminAPI.reviewStatus`, `adminAPI.deleteReview` | MANAGE_MODERATION | see 53-ROUTE-AUDIT-MATRIX.md |
| 11 | `/admin/referrals` | AdminReferrals | Growth & Insight | `adminAPI.referralStats`, `adminAPI.userReferrals`, `adminAPI.referrals`, `adminAPI.creditReferral`, `adminAPI.expireReferral` | VIEW_ANALYTICS | see 53-ROUTE-AUDIT-MATRIX.md |
| 12 | `/admin/chats` | AdminChatModeration | Customer Care | `adminAPI.chats`, `adminAPI.chatMessages`, `adminAPI.deleteChatMessage`, `adminAPI.blockChat`, `adminAPI.unblockChat` | MANAGE_MODERATION | see 53-ROUTE-AUDIT-MATRIX.md |
| 13 | `/admin/reports` | AdminReports | Customer Care | not found by scan | any platform staff | /api/reports/admin/all (admin, superadmin, moderator) |
| 14 | `/admin/support-tickets` | AdminSupportWorkspace | Customer Care | not found by scan | any of SUPPORT_AGENT, SUPPORT_OVERSIGHT | /api/support/staff/* (support agent or oversight) |
| 15 | `/admin/feedback` | AdminFeedback | Customer Care | not found by scan | role admin / superadmin | /api/feedback/admin/all (admin, superadmin) |
| 16 | `/admin/market-data` | AdminMarketData | Growth & Insight | `adminAPI.marketData`, `adminAPI.updateMarketData`, `adminAPI.createMarketData`, `adminAPI.deleteMarketData`, `adminAPI.bulkMarketData` | VIEW_ANALYTICS | see 53-ROUTE-AUDIT-MATRIX.md |
| 17 | `/admin/transactions` | AdminTransactions | Finance | not found by scan | MANAGE_FINANCE | see 53-ROUTE-AUDIT-MATRIX.md |
| 18 | `/admin/ntsa-queue` | AdminNtsaQueue | Marketplace | not found by scan | MANAGE_INSPECTIONS | see 53-ROUTE-AUDIT-MATRIX.md |
| 19 | `/admin/inspections` | AdminInspections | Marketplace | not found by scan | MANAGE_INSPECTIONS | see 53-ROUTE-AUDIT-MATRIX.md |
| 20 | `/admin/dealer-verifications` | AdminDealerVerifications | Accounts & Onboarding | not found by scan | role admin / superadmin | see 53-ROUTE-AUDIT-MATRIX.md |
| 21 | `/admin/inspector-applications` | AdminInspectorApplications | Accounts & Onboarding | `adminAPI.inspectorApplications`, `adminAPI.reviewInspector` | MANAGE_INSPECTIONS | see 53-ROUTE-AUDIT-MATRIX.md |
| 22 | `/admin/security-log` | AdminSecurityLog | Platform & Security | `adminAPI.getSecurityLogs`, `adminAPI.getSecurityLogSummary` | VIEW_LOGS | /api/security-logs (VIEW_LOGS) |
| 23 | `/admin/ads` | AdManager | Growth & Insight | not found by scan | MANAGE_ADS | see 53-ROUTE-AUDIT-MATRIX.md |
| 24 | `/admin/broadcast` | AdminBroadcast | Growth & Insight | not found by scan | role admin / superadmin | /api/announcements (admin, superadmin) |
| 25 | `/admin/settings` | AdminSettings | Platform & Security | `adminAPI.getConfig`, `adminAPI.getAuditLog`, `adminAPI.updateConfig`, `adminAPI.testMpesa` | MANAGE_PLATFORM | see 53-ROUTE-AUDIT-MATRIX.md |
| 26 | `/admin/control-room` | OperationsControlRoom | Platform & Security | `adminAPI.stats`, `adminAPI.alerts`, `adminAPI.getAuditLog`, `adminAPI.getInfrastructureHealth` | Super Admin only | see 53-ROUTE-AUDIT-MATRIX.md |
| 27 | `/admin/staff` | AdminStaff | Platform & Security | `adminAPI.getStaff`, `adminAPI.getStaffLevels`, `adminAPI.getStaffRoleCatalog`, `adminAPI.getPermCatalog`, `adminAPI.createStaff`, `adminAPI.updateStaff` | Super Admin only | /api/admin/staff (superadmin + owner) |
| 28 | `/admin/staff-permissions` | AdminStaffPermissions | Platform & Security | `adminAPI.getStaff`, `adminAPI.getPermCatalog`, `adminAPI.setStaffPerms` | Super Admin only | see 53-ROUTE-AUDIT-MATRIX.md |
| 29 | `/admin/traffic-analytics` | AdminTrafficAnalytics | Command Centre | `adminAPI.trafficSummary`, `adminAPI.trafficLive`, `adminAPI.trafficExport` | Super Admin only | see 53-ROUTE-AUDIT-MATRIX.md |
| 30 | `/admin/site-designs` | AdminSiteDesigns | Platform & Security | `adminAPI.siteDesigns`, `adminAPI.siteDesignHistory`, `adminAPI.siteDesign`, `adminAPI.siteDesignSave`, `adminAPI.siteDesignCreate`, `adminAPI.siteDesignDuplicate` | MANAGE_PLATFORM | see 53-ROUTE-AUDIT-MATRIX.md |
| 31 | `/admin/featured-vehicles` | AdminFeaturedVehicles | Marketplace | `adminAPI.featuredCampaigns`, `adminAPI.featuredCampaignHistory`, `adminAPI.featuredCampaignVehicles`, `adminAPI.featuredCampaignUpdate`, `adminAPI.featuredCampaignCreate`, `adminAPI.featuredCampaignResume` | MANAGE_ADS | see 53-ROUTE-AUDIT-MATRIX.md |
| 32 | `/admin/panic-room` | PanicRoom | Platform & Security | `adminAPI.systemHealth`, `adminAPI.maintenanceStatus`, `adminAPI.systemKillSwitch`, `adminAPI.systemRecover` | Super Admin only | see 53-ROUTE-AUDIT-MATRIX.md |
| 33 | `/admin/platform-recovery` | PlatformRecovery | Platform & Security | not found by scan | PLATFORM_RECOVERY | see 53-ROUTE-AUDIT-MATRIX.md |
| 34 | `/admin/webhoist` | WebhoistOverview | Platform & Security | `adminAPI.stats`, `adminAPI.getAuditLog` | Super Admin only | see 53-ROUTE-AUDIT-MATRIX.md |
| 35 | `/admin/cms` | ContentStudio | Specialist / hub-linked (no sidebar entry) | not found by scan | any platform staff | /api/cms/* management (any staff since 2026-11-24; public reads unchanged) |
| 36 | `/admin/automation` | AutomationStudio | Specialist / hub-linked (no sidebar entry) | not found by scan | any platform staff | /api/automation/* (any staff; 503 not provisioned) |
| 37 | `/admin/config` | ConfigurationCenter | Specialist / hub-linked (no sidebar entry) | not found by scan | any platform staff | /api/config/stats (admin, superadmin) |
| 38 | `/admin/lowcode` | BusinessObjectStudio | Specialist / hub-linked (no sidebar entry) | not found by scan | any platform staff | see 53-ROUTE-AUDIT-MATRIX.md |
| 39 | `/admin/vxp` | VisualExperienceStudio | Specialist / hub-linked (no sidebar entry) | not found by scan | any platform staff | see 53-ROUTE-AUDIT-MATRIX.md |
| 40 | `/admin/xos` | ExperienceStudio | Specialist / hub-linked (no sidebar entry) | not found by scan | any platform staff | see 53-ROUTE-AUDIT-MATRIX.md |
| 41 | `/admin/ai` | AIPlatformBuilder | Specialist / hub-linked (no sidebar entry) | not found by scan | any platform staff | see 53-ROUTE-AUDIT-MATRIX.md |
| 42 | `/admin/digital-twin` | DigitalTwinCenter | Specialist / hub-linked (no sidebar entry) | not found by scan | any platform staff | see 53-ROUTE-AUDIT-MATRIX.md |
| 43 | `/admin/control-center` | EnterpriseControlCenter | Specialist / hub-linked (no sidebar entry) | not found by scan | any platform staff | see 53-ROUTE-AUDIT-MATRIX.md |
| 44 | `/admin/integration` | IntegrationStudio | Specialist / hub-linked (no sidebar entry) | not found by scan | any platform staff | see 53-ROUTE-AUDIT-MATRIX.md |
| 45 | `/admin/governance` | GovernanceStudio | Specialist / hub-linked (no sidebar entry) | not found by scan | any platform staff | see 53-ROUTE-AUDIT-MATRIX.md |
| 46 | `/admin/intelligence` | ExecutiveIntelligenceCenter | Specialist / hub-linked (no sidebar entry) | not found by scan | any platform staff | see 53-ROUTE-AUDIT-MATRIX.md |
| 47 | `/admin/command-center` | EnterpriseCommandCenter | Specialist / hub-linked (no sidebar entry) | not found by scan | any platform staff | see 53-ROUTE-AUDIT-MATRIX.md |
| 48 | `/admin/improvement` | ContinuousImprovementCenter | Specialist / hub-linked (no sidebar entry) | not found by scan | any platform staff | see 53-ROUTE-AUDIT-MATRIX.md |
| 49 | `/admin/platform-factory` | PlatformFactory | Specialist / hub-linked (no sidebar entry) | not found by scan | any platform staff | see 53-ROUTE-AUDIT-MATRIX.md |
| 50 | `/admin/owners` | AdminOwnerManagement | Specialist / hub-linked (no sidebar entry) | not found by scan | any platform staff | see 53-ROUTE-AUDIT-MATRIX.md |
| 51 | `/admin/communications` | AdminCommunications | Specialist / hub-linked (no sidebar entry) | `adminAPI.communicationTemplates`, `adminAPI.communicationAnalytics`, `adminAPI.communicationProviderHealth`, `adminAPI.communicationHistory`, `adminAPI.communicationRollout`, `adminAPI.updateCommunicationChannelControl` | any platform staff | see 53-ROUTE-AUDIT-MATRIX.md |
| 52 | `/admin/provider-governance` | AdminProviderGovernance | Specialist / hub-linked (no sidebar entry) | not found by scan | any platform staff | see 53-ROUTE-AUDIT-MATRIX.md |
| 53 | `/admin/support` | AdminSupportWorkspace | Specialist / hub-linked (no sidebar entry) | not found by scan | any of SUPPORT_AGENT, SUPPORT_OVERSIGHT | see 53-ROUTE-AUDIT-MATRIX.md |

## Endpoints used by more than one page (review for competing implementations)

| Endpoint / client method | Pages |
|---|---|
| `adminAPI.stats` | `/admin`, `/admin/control-room`, `/admin/webhoist` |
| `adminAPI.users` | `/admin`, `/admin/users`, `/admin/sellers` |
| `adminAPI.cars` | `/admin`, `/admin/cars`, `/admin/moderation` |
| `adminAPI.getAuditLog` | `/admin`, `/admin/settings`, `/admin/control-room`, `/admin/webhoist` |
| `adminAPI.getStaff` | `/admin`, `/admin/staff`, `/admin/staff-permissions` |
| `adminAPI.toggleBan` | `/admin`, `/admin/users`, `/admin/sellers` |
| `adminAPI.approveDealer` | `/admin/users`, `/admin/sellers` |
| `adminAPI.moderateCar` | `/admin/cars`, `/admin/moderation` |
| `adminAPI.getPermCatalog` | `/admin/staff`, `/admin/staff-permissions` |

Reading: a shared read endpoint (for example the vehicle or user list) used by a dashboard panel AND a specialist page is expected; the specialist page is the authoritative workspace for actions. No competing write path for the same business action was found in this scan (writes are owned by one specialist page each). This is a static scan, not proof of runtime behaviour.

