// ============================================================
// GARAGE ORGANIZATION API (Stage 5F.16): organization -> branches -> staff memberships, routing, assignment, reporting.
// Thin typed client over /api/inspection/org/*. The server decides every permission from the signed-in session; nothing
// here sends or trusts an actor, role-authority or organization claim other than the organization id in the URL.
// ============================================================
import { api as http } from '../../../api/api';

const unwrap = <T,>(r: { data?: any }): T => (r?.data?.data ?? r?.data) as T;
const base = '/inspection/org';

export type AccessRole = 'org_admin' | 'operations_manager' | 'branch_manager' | 'inspector' | 'technician' | 'finance' | 'report_reviewer';
export type YourRole = AccessRole | 'owner';
export type TechTitle = 'lead_engineer' | 'senior_inspector' | 'junior_inspector' | 'field_technician' | 'workshop_technician' | 'quality_reviewer';
export type BranchStatus = 'active' | 'suspended' | 'closed';
export type MemberStatus = 'pending' | 'confirmed' | 'suspended' | 'ended';
export type TransitionAction = 'confirm' | 'cancel' | 'travel' | 'start' | 'complete' | 'no_show';

export interface OrgSummary { id: string; name: string; status: string; verificationStatus: string; lifecycleStage: string; you: { role: YourRole; branchId: string | null; staffId: string | null; isOwner: boolean } }
export interface Branch { id: string; name: string; county?: string | null; town?: string | null; address?: string | null; phone?: string | null; status: BranchStatus; is_head_office: boolean; status_reason?: string | null }
export interface Member { id: string; name: string | null; title: TechTitle; accessRole: AccessRole; branchId: string | null; status: MemberStatus; isActive: boolean; isAvailable: boolean; invitationExpiresAt?: string | null; reason?: string | null; awaiting?: 'member' | 'business' | null }
export interface OrgBooking { id: string; booking_reference: string; provider_id: string; branch_id: string | null; status: string; scheduled_date: string; scheduled_time?: string | null; assigned_staff_id: string | null; vehicle_make?: string | null; vehicle_model?: string | null; vehicle_year?: number | null; inspection_town?: string | null; payment_status?: string; total_price?: number; currency?: string }
export interface MyMembership { id: string; organizationId: string; organizationName: string | null; accessRole: AccessRole; title: TechTitle; branchId: string | null; branchName: string | null; status: MemberStatus; isActive: boolean; reason?: string | null; invitationExpired: boolean; invitationExpiresAt?: string | null }
export interface OrgReport {
  period: { from: string; to: string };
  bookings_by_branch_status?: Array<{ branch_id: string | null; status: string; count: number }>;
  inspections?: { completed: number; outstanding: number; cancelled_or_no_show: number };
  report_quality?: { reports: number; with_amendment: number; correction_rate: number | string | null; avg_turnaround_hours: number | string | null; turnaround_samples: number };
  staff_workload?: Array<{ staff_id: string; name: string; access_role: AccessRole; branch_id: string | null; open_assigned: number; completed_in_period: number }>;
  earnings_by_branch?: Array<{ branch_id: string | null; currency: string; transaction_type: string; status: string; count: number; amount: number | string }>;
  unattributed_transactions?: Array<{ currency: string; transaction_type: string; status: string; count: number; amount: number | string }>;
  settlements?: Array<{ status: string; count: number; gross: number | string; net: number | string }>;
}

export const organizationApi = {
  get: async (orgId: string) => unwrap<OrgSummary>(await http.get(`${base}/${orgId}`)),
  listBranches: async (orgId: string) => unwrap<{ branches: Branch[] }>(await http.get(`${base}/${orgId}/branches`)),
  createBranch: async (orgId: string, body: { name: string; town?: string; county?: string; address?: string; phone?: string; isHeadOffice?: boolean }) => unwrap<Branch>(await http.post(`${base}/${orgId}/branches`, body)),
  updateBranch: async (orgId: string, branchId: string, body: Partial<{ name: string; town: string; county: string; address: string; phone: string }>) => unwrap<Branch>(await http.patch(`${base}/${orgId}/branches/${branchId}`, body)),
  setBranchStatus: async (orgId: string, branchId: string, status: BranchStatus, reason?: string) => unwrap<Branch>(await http.post(`${base}/${orgId}/branches/${branchId}/status`, { status, reason })),

  listMembers: async (orgId: string) => unwrap<{ members: Member[] }>(await http.get(`${base}/${orgId}/members`)),
  invite: async (orgId: string, body: { email: string; accessRole: AccessRole; title?: TechTitle; branchId?: string | null }) => unwrap<any>(await http.post(`${base}/${orgId}/members/invite`, body)),
  confirm: async (orgId: string, staffId: string) => unwrap<any>(await http.post(`${base}/${orgId}/members/${staffId}/confirm`, {})),
  change: async (orgId: string, staffId: string, body: Partial<{ accessRole: AccessRole; title: TechTitle; branchId: string | null }>) => unwrap<any>(await http.patch(`${base}/${orgId}/members/${staffId}`, body)),
  setMemberStatus: async (orgId: string, staffId: string, action: 'suspend' | 'reactivate' | 'revoke', reason?: string) => unwrap<any>(await http.post(`${base}/${orgId}/members/${staffId}/status`, { action, reason })),

  listBookings: async (orgId: string, q: { status?: string; branchId?: string; date?: string; page?: number; limit?: number } = {}) => unwrap<{ items: OrgBooking[]; total: number; page: number; limit: number }>(await http.get(`${base}/${orgId}/bookings`, { params: q })),
  routeBooking: async (orgId: string, bookingId: string, branchId: string | null) => unwrap<any>(await http.post(`${base}/${orgId}/bookings/${bookingId}/route`, { branchId })),
  assignBooking: async (orgId: string, bookingId: string, staffId: string) => unwrap<any>(await http.post(`${base}/${orgId}/bookings/${bookingId}/assign`, { staffId })),
  transition: async (orgId: string, bookingId: string, action: TransitionAction, notes?: string) => unwrap<any>(await http.post(`${base}/${orgId}/bookings/${bookingId}/transition`, { action, notes })),
  report: async (orgId: string, q: { from?: string; to?: string; branchId?: string } = {}) => unwrap<OrgReport>(await http.get(`${base}/${orgId}/report`, { params: q })),

  myMemberships: async () => unwrap<{ memberships: MyMembership[] }>(await http.get(`${base}/me/memberships`)),
  myWorklist: async () => unwrap<{ items: OrgBooking[]; memberships: number }>(await http.get(`${base}/me/worklist`)),
  acceptInvitation: async (staffId: string) => unwrap<any>(await http.post(`${base}/me/memberships/${staffId}/accept`, {})),
  leave: async (staffId: string, reason?: string) => unwrap<any>(await http.post(`${base}/me/memberships/${staffId}/leave`, { reason })),
  publicBranches: async (providerId: string) => unwrap<{ branches: Array<{ id: string; name: string; town?: string | null; county?: string | null; is_head_office: boolean }> }>(await http.get(`/inspection/providers/${providerId}/branches`)),
};

export default organizationApi;
