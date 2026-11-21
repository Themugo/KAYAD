// Client-side mirror of the server's capability map. UX ONLY: it decides what to SHOW. The server (and the database
// beneath it) decides what is ALLOWED, so a tampered client gains nothing.
import type { YourRole, AccessRole, TechTitle, TransitionAction } from '../services/organizationApi';

export const ROLE_LABEL: Record<YourRole, string> = {
  owner: 'Owner', org_admin: 'Organization admin', operations_manager: 'Operations manager', branch_manager: 'Branch manager',
  inspector: 'Inspector', technician: 'Technician', finance: 'Finance', report_reviewer: 'Report reviewer',
};
export const ROLE_HELP: Record<AccessRole, string> = {
  org_admin: 'Runs the whole organization: branches, team, bookings. Cannot manage other admins.',
  operations_manager: 'Routes and assigns bookings across every branch. No money, no team changes.',
  branch_manager: 'Runs one branch: its bookings, inspectors and technicians.',
  inspector: 'Performs inspections assigned to them.',
  technician: 'Supports inspections assigned to them.',
  finance: 'Sees earnings, commissions and settlements. No operational access.',
  report_reviewer: 'Reviews inspection reports. Read-only on bookings.',
};
export const TITLE_LABEL: Record<TechTitle, string> = {
  lead_engineer: 'Lead engineer', senior_inspector: 'Senior inspector', junior_inspector: 'Junior inspector',
  field_technician: 'Field technician', workshop_technician: 'Workshop technician', quality_reviewer: 'Quality reviewer',
};
export const TITLES_FOR: Partial<Record<AccessRole, TechTitle[]>> = {
  inspector: ['lead_engineer', 'senior_inspector', 'junior_inspector'],
  technician: ['field_technician', 'workshop_technician'],
};
const CAP: Record<string, YourRole[]> = {
  branches: ['owner', 'org_admin', 'operations_manager', 'branch_manager', 'finance', 'report_reviewer', 'inspector', 'technician'],
  branchManage: ['owner', 'org_admin'],
  team: ['owner', 'org_admin', 'operations_manager', 'branch_manager'],
  teamManage: ['owner', 'org_admin', 'branch_manager'],
  bookings: ['owner', 'org_admin', 'operations_manager', 'branch_manager', 'report_reviewer', 'inspector', 'technician'],
  bookingManage: ['owner', 'org_admin', 'operations_manager', 'branch_manager'],
  bookingExecute: ['owner', 'org_admin', 'operations_manager', 'branch_manager', 'inspector', 'technician'],
  report: ['owner', 'org_admin', 'operations_manager', 'branch_manager', 'finance'],
};
export const can = (role: YourRole | null | undefined, cap: keyof typeof CAP) => !!role && CAP[cap].includes(role);
export const orgWide = (role: YourRole | null | undefined) => role === 'owner' || role === 'org_admin' || role === 'operations_manager';

/** Roles the signed-in person may offer when inviting (the database re-checks every invitation). */
export const invitableRoles = (role: YourRole): AccessRole[] => {
  if (role === 'owner') return ['org_admin', 'operations_manager', 'branch_manager', 'inspector', 'technician', 'finance', 'report_reviewer'];
  if (role === 'org_admin') return ['operations_manager', 'branch_manager', 'inspector', 'technician', 'finance', 'report_reviewer'];
  if (role === 'branch_manager') return ['inspector', 'technician'];
  return [];
};
export const needsBranch = (r: AccessRole) => r === 'branch_manager';
export const mayHaveBranch = (r: AccessRole) => r === 'branch_manager' || r === 'inspector' || r === 'technician' || r === 'report_reviewer';

export const STATUS_LABEL: Record<string, string> = {
  booked: 'New', confirmed: 'Confirmed', inspector_assigned: 'Inspector assigned', travelling: 'On the way', inspection_started: 'Inspection started',
  inspection_complete: 'Inspection complete', report_generated: 'Report ready', customer_reviewed: 'Reviewed', closed: 'Closed', cancelled: 'Cancelled', no_show: 'No-show',
};
/** Which actions make sense for a booking in a given state (the database still decides whether this person may do them). */
export const nextActions = (status: string): TransitionAction[] => {
  switch (status) {
    case 'booked': return ['confirm', 'cancel'];
    case 'confirmed': return ['cancel'];
    case 'inspector_assigned': return ['travel', 'cancel'];
    case 'travelling': return ['start', 'no_show'];
    case 'inspection_started': return ['complete'];
    default: return [];
  }
};
export const ACTION_LABEL: Record<TransitionAction, string> = { confirm: 'Confirm', cancel: 'Cancel booking', travel: 'Start travelling', start: 'Start inspection', complete: 'Complete inspection', no_show: 'Mark no-show' };
export const MANAGER_ACTIONS: TransitionAction[] = ['confirm', 'cancel'];
