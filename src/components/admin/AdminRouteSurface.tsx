import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { RequireAdmin, RequireAdminPage, useAuth } from '../../context/AuthContext';
import { SUPERADMIN_ONLY } from '../../utils/permissions';
import AdminLayout from './AdminLayout';
import { getCars, mapBackendCarToVehicle } from '../../services/vehicleApi';
import type { Vehicle } from '../../types';

const AdminView = lazy(() => import('../../features/AdminView').then((module) => ({ default: module.AdminView })));
const AdminUsers = lazy(() => import('../../pages/admin/AdminUsers'));
const AdminSellers = lazy(() => import('../../pages/admin/AdminSellers'));
const AdminPrivateSellerApplications = lazy(() => import('../../pages/admin/AdminPrivateSellerApplications'));
const AdminCars = lazy(() => import('../../pages/admin/AdminCars'));
const AdminCarModeration = lazy(() => import('../../pages/admin/AdminCarModeration'));
const AdminAuctions = lazy(() => import('../../pages/admin/AdminAuctions'));
const AdminBids = lazy(() => import('../../pages/admin/AdminBids'));
const AdminEscrows = lazy(() => import('../../pages/admin/AdminEscrows'));
const AdminReviews = lazy(() => import('../../pages/admin/AdminReviews'));
const AdminReferrals = lazy(() => import('../../pages/admin/AdminReferrals'));
const AdminChatModeration = lazy(() => import('../../pages/admin/AdminChatModeration'));
const AdminReports = lazy(() => import('../../pages/admin/AdminReports'));
const AdminFeedback = lazy(() => import('../../pages/admin/AdminFeedback'));
const AdminMarketData = lazy(() => import('../../pages/admin/AdminMarketData'));
const AdminTransactions = lazy(() => import('../../pages/admin/AdminTransactions'));
const AdminNtsaQueue = lazy(() => import('../../pages/admin/AdminNtsaQueue'));
const AdminInspections = lazy(() => import('../../pages/admin/AdminInspections'));
const AdminDealerVerifications = lazy(() => import('../../pages/admin/AdminDealerVerifications'));
const AdminInspectorApplications = lazy(() => import('../../pages/admin/AdminInspectorApplications'));
const AdminSecurityLog = lazy(() => import('../../pages/admin/AdminSecurityLog'));
const AdManager = lazy(() => import('../../pages/admin/AdManager'));
const AdminBroadcast = lazy(() => import('../../pages/admin/AdminBroadcast'));
const AdminSettings = lazy(() => import('../../pages/admin/AdminSettings'));
const OperationsControlRoom = lazy(() => import('../../pages/admin/OperationsControlRoom'));
const AdminStaff = lazy(() => import('../../pages/admin/AdminStaff'));
const AdminStaffPermissions = lazy(() => import('../../pages/admin/AdminStaffPermissions'));
const PanicRoom = lazy(() => import('../../pages/admin/PanicRoom'));
const PlatformRecovery = lazy(() => import('../../pages/admin/PlatformRecovery'));
const WebhoistOverview = lazy(() => import('../../pages/admin/WebhoistOverview'));
const ContentStudio = lazy(() => import('../../pages/admin/cms/ContentStudio'));
const AutomationStudio = lazy(() => import('../../pages/admin/automation/AutomationStudio'));
const ConfigurationCenter = lazy(() => import('../../pages/admin/config/ConfigurationCenter'));
const BusinessObjectStudio = lazy(() => import('../../pages/admin/lowcode/BusinessObjectStudio'));
const VisualExperienceStudio = lazy(() => import('../../pages/admin/vxp/VisualExperienceStudio'));
const ExperienceStudio = lazy(() => import('../../pages/admin/xos/ExperienceStudio'));
const AIPlatformBuilder = lazy(() => import('../../pages/admin/ai/AIPlatformBuilder'));
const DigitalTwinCenter = lazy(() => import('../../pages/admin/digital-twin/DigitalTwinCenter'));
const EnterpriseControlCenter = lazy(() => import('../../pages/admin/control-center/EnterpriseControlCenter'));
const IntegrationStudio = lazy(() => import('../../pages/admin/integration/IntegrationStudio'));
const GovernanceStudio = lazy(() => import('../../pages/admin/governance/GovernanceStudio'));
const ExecutiveIntelligenceCenter = lazy(() => import('../../pages/admin/intelligence/ExecutiveIntelligenceCenter'));
const EnterpriseCommandCenter = lazy(() => import('../../pages/admin/command-center/EnterpriseCommandCenter'));
const ContinuousImprovementCenter = lazy(() => import('../../pages/admin/improvement/ContinuousImprovementCenter'));
const PlatformFactory = lazy(() => import('../../pages/admin/platform-factory/PlatformFactory'));
const AdminOwnerManagement = lazy(() => import('../../pages/admin/AdminOwnerManagement'));
const AdminCommunications = lazy(() => import('../../pages/admin/AdminCommunications'));
const AdminProviderGovernance = lazy(() => import('../../features/AdminProviderGovernance'));
const AdminSupportWorkspace = lazy(() => import('../../features/AdminSupportWorkspace').then((module) => ({ default: module.AdminSupportWorkspace })));

interface AdminRouteDefinition {
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  superadminOnly?: boolean;
}

/**
 * Canonical map for the existing standalone admin URLs. The command centre
 * remains AdminView at /admin; specialist pages keep their existing paths and
 * are rendered inside the same admin shell/sidebar.
 */
export const ADMIN_ROUTE_COMPONENTS: Record<string, AdminRouteDefinition> = {
  '/admin/users': { component: AdminUsers },
  '/admin/sellers': { component: AdminSellers },
  '/admin/private-seller-applications': { component: AdminPrivateSellerApplications },
  '/admin/cars': { component: AdminCars },
  '/admin/moderation': { component: AdminCarModeration },
  '/admin/auctions': { component: AdminAuctions },
  '/admin/bids': { component: AdminBids },
  '/admin/escrows': { component: AdminEscrows },
  '/admin/reviews': { component: AdminReviews },
  '/admin/referrals': { component: AdminReferrals },
  '/admin/chats': { component: AdminChatModeration },
  '/admin/reports': { component: AdminReports },
  '/admin/support-tickets': { component: AdminSupportWorkspace },
  '/admin/feedback': { component: AdminFeedback },
  '/admin/market-data': { component: AdminMarketData },
  '/admin/transactions': { component: AdminTransactions },
  '/admin/ntsa-queue': { component: AdminNtsaQueue },
  '/admin/inspections': { component: AdminInspections },
  '/admin/dealer-verifications': { component: AdminDealerVerifications },
  '/admin/inspector-applications': { component: AdminInspectorApplications },
  '/admin/security-log': { component: AdminSecurityLog },
  '/admin/ads': { component: AdManager },
  '/admin/broadcast': { component: AdminBroadcast },
  '/admin/settings': { component: AdminSettings },
  '/admin/control-room': { component: OperationsControlRoom, superadminOnly: true },
  '/admin/staff': { component: AdminStaff, superadminOnly: true },
  '/admin/staff-permissions': { component: AdminStaffPermissions, superadminOnly: true },
  '/admin/panic-room': { component: PanicRoom, superadminOnly: true },
  '/admin/platform-recovery': { component: PlatformRecovery }, // permission-gated (platform_recovery); never role-gated
  '/admin/webhoist': { component: WebhoistOverview, superadminOnly: true },
  '/admin/cms': { component: ContentStudio },
  '/admin/automation': { component: AutomationStudio },
  '/admin/config': { component: ConfigurationCenter },
  '/admin/lowcode': { component: BusinessObjectStudio, superadminOnly: true },
  '/admin/vxp': { component: VisualExperienceStudio, superadminOnly: true },
  '/admin/xos': { component: ExperienceStudio, superadminOnly: true },
  '/admin/ai': { component: AIPlatformBuilder, superadminOnly: true },
  '/admin/digital-twin': { component: DigitalTwinCenter, superadminOnly: true },
  '/admin/control-center': { component: EnterpriseControlCenter, superadminOnly: true },
  '/admin/integration': { component: IntegrationStudio, superadminOnly: true },
  '/admin/governance': { component: GovernanceStudio, superadminOnly: true },
  '/admin/intelligence': { component: ExecutiveIntelligenceCenter, superadminOnly: true },
  '/admin/command-center': { component: EnterpriseCommandCenter, superadminOnly: true },
  '/admin/improvement': { component: ContinuousImprovementCenter, superadminOnly: true },
  '/admin/platform-factory': { component: PlatformFactory, superadminOnly: true },
  // Existing specialist surfaces that were not all represented in the sidebars.
  '/admin/owners': { component: AdminOwnerManagement, superadminOnly: true },
  '/admin/communications': { component: AdminCommunications },
  '/admin/provider-governance': { component: AdminProviderGovernance },
  '/admin/support': { component: AdminSupportWorkspace },
};

function AdminCommandCentre() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    getCars({ limit: 50 }).then((response) => {
      if (!active) return;
      setVehicles((response.data || response.cars || []).map(mapBackendCarToVehicle));
    }).catch(() => {
      // AdminView owns its own explicit API/error states. The optional quick
      // view catalogue stays empty on failure; no mock inventory is inserted.
      if (active) setVehicles([]);
    });
    return () => { active = false; };
  }, []);

  return <AdminView vehicles={vehicles} onQuickViewVehicle={(vehicle) => {
    navigate(`/?nav=marketplace&vehicleId=${encodeURIComponent(vehicle.id)}`);
  }} />;
}

function AdminLoading() {
  return (
    <div className="min-h-[280px] flex items-center justify-center p-6" role="status" aria-live="polite">
      <div className="text-center">
        <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#BDE5DE] border-t-[#13B8A6]" aria-hidden="true" />
        <p className="text-sm text-[#64748B]">Loading administration workspace…</p>
      </div>
    </div>
  );
}

function AdminNotFound() {
  return (
    <section className="mx-auto max-w-3xl p-8" aria-labelledby="admin-route-not-found">
      <h1 id="admin-route-not-found" className="text-xl font-semibold text-[#0A3340]">Admin page not found</h1>
      <p className="mt-2 text-sm text-[#64748B]">This admin destination is not registered. No action was taken.</p>
      <Link className="mt-4 inline-flex rounded-lg bg-[#0A3340] px-4 py-2 text-sm font-semibold text-white" to="/admin">Return to Command Centre</Link>
    </section>
  );
}

function RouteAccess({ superadminOnly, children }: { superadminOnly?: boolean; children: React.ReactNode }) {
  const { user } = useAuth();
  if (superadminOnly && user?.role !== 'superadmin') {
    return <RequireAdminPage>{<div className="m-6 rounded-xl border border-[#D7E7E4] bg-white p-6 text-sm text-[#0A3340]" role="alert">This administration page is restricted to Super Admin.</div>}</RequireAdminPage>;
  }
  // The shared guard applies the existing role allowlist and permission mirror
  // for the current pathname. Backend route guards remain authoritative.
  return <RequireAdminPage>{children}</RequireAdminPage>;
}

export default function AdminRouteSurface() {
  const location = useLocation();
  const path = location.pathname.replace(/\/$/, '') || '/';

  return (
    <RequireAdmin>
      <AdminLayout>
        <Suspense fallback={<AdminLoading />}>
          {path === '/admin' || path === '/admin/dashboard' ? (
            <AdminCommandCentre />
          ) : (() => {
            const definition = ADMIN_ROUTE_COMPONENTS[path];
            if (!definition) return <AdminNotFound />;
            const Page = definition.component;
            // SUPERADMIN_ONLY is a second, shared source-of-truth check so a
            // route cannot become accessible by omitting local metadata.
            const superadminOnly = definition.superadminOnly || SUPERADMIN_ONLY.has(path);
            return <RouteAccess superadminOnly={superadminOnly}>
              <Page />
            </RouteAccess>;
          })()}
        </Suspense>
      </AdminLayout>
    </RequireAdmin>
  );
}
