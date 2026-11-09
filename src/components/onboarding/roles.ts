import type { AuthIntent } from '../../utils/authIntent';

/**
 * Canonical public role matrix for registration.
 *
 * Every entry maps to a flow the backend genuinely supports. Staff roles and
 * `broker` are intentionally absent: staff are provisioned by administrators,
 * and a broker journey is not supported end to end. The role a person picks
 * here is a request - the backend (schema, RPC and approval workflow) decides
 * what they actually become.
 */
export type PublicRoleId = 'buyer' | 'dealer' | 'garage_business' | 'inspection_company' | 'professional';

/** How the person enters the system. */
export type RegistrationRoute =
  | 'account'                // POST /api/v1/auth/register
  | 'account_then_provider'  // account first, then the provider application (needs a verified, signed-in account)
  | 'account_then_affiliation' // account first, then ask a business to confirm them as staff
  | 'application';           // POST /api/inspector-applications/apply (no account until KAYAD approves)

export interface PublicRole {
  id: PublicRoleId;
  title: string;
  summary: string;
  /** What happens to access, in one honest line. */
  outcome: string;
  intent: AuthIntent;
  /** Role string sent to /auth/register; null when the route is not an account registration. */
  backendRole: 'user' | 'dealer' | null;
  route: RegistrationRoute;
  /** Where a person should land after verifying and signing in, when it is not their default home. */
  afterSignIn: string | null;
  steps: Array<{ title: string; body: string }>;
}

export const PROVIDER_APPLICATION_PATH = '/?nav=inspections&action=apply-provider';
export const providerApplicationPath = (providerType: string) => `${PROVIDER_APPLICATION_PATH}&providerType=${encodeURIComponent(providerType)}`;
export const AFFILIATION_PATH = '/?nav=inspections&action=manage-business';

export const PUBLIC_ROLES: PublicRole[] = [
  {
    id: 'buyer', title: 'Personal account', summary: 'Buy, save and compare vehicles, and sell your own vehicle from the same account.',
    outcome: 'Ready once you verify your email', intent: 'buyer', backendRole: 'user', route: 'account', afterSignIn: null,
    steps: [
      { title: 'Create your account', body: 'Name, email and a password. No documents needed.' },
      { title: 'Verify your email', body: 'We email you a link. You cannot sign in until it is confirmed.' },
      { title: 'Sign in and start', body: 'Browse vehicles, save favourites, join auctions.' },
    ],
  },
  {
    id: 'dealer', title: 'Dealer', summary: 'Run a dealership with inventory and auctions.',
    outcome: 'Business verification before you can list', intent: 'dealer', backendRole: 'dealer', route: 'account', afterSignIn: '/dealer/onboarding',
    steps: [
      { title: 'Create your dealer account', body: 'Your dealership name and location. The account starts pending.' },
      { title: 'Verify your email', body: 'Required before you can sign in.' },
      { title: 'Complete business verification', body: 'After signing in you add payment details, an ID and your KRA PIN. KAYAD reviews them; dealer tools unlock only when approved.' },
    ],
  },
  {
    id: 'garage_business', title: 'Garage / workshop', summary: 'Offer vehicle servicing, repairs, diagnostics and workshop services.',
    outcome: 'Business and each service reviewed separately', intent: 'provider', backendRole: 'user', route: 'account_then_provider', afterSignIn: providerApplicationPath('garage_business'),
    steps: [
      { title: 'Create your personal account', body: 'The owner signs up with their own name and email; the business is registered separately.' },
      { title: 'Verify your email', body: 'Required before you can sign in.' },
      { title: 'Register your garage', body: 'Add the business identity, branches, service coverage and services offered.' },
      { title: 'KAYAD review', body: 'Business approval and service verification are separate. Only verified services become bookable.' },
    ],
  },
  {
    id: 'inspection_company', title: 'Inspection company', summary: 'Register an organization offering vehicle inspections and condition reports.',
    outcome: 'Company and inspection services reviewed separately', intent: 'provider', backendRole: 'user', route: 'account_then_provider', afterSignIn: providerApplicationPath('inspection_company'),
    steps: [
      { title: 'Create your personal account', body: 'The company owner signs up with their own name and email.' },
      { title: 'Verify your email', body: 'Required before you can sign in.' },
      { title: 'Register your inspection company', body: 'Add company details, inspection coverage, branches and professional staff.' },
      { title: 'KAYAD review', body: 'Company verification, inspector credentials and inspection services are reviewed separately.' },
    ],
  },
  {
    id: 'professional', title: 'Inspector or mechanic', summary: 'Apply as an individual professional or join an approved business.',
    outcome: 'Your personal account is verified first; professional access requires approval.', intent: 'professional', backendRole: 'user', route: 'account_then_provider', afterSignIn: providerApplicationPath('individual_inspector'),
    steps: [
      { title: 'Choose how you work', body: 'On your own, or as staff of a garage or inspection company already on KAYAD.' },
      { title: 'Independent', body: 'Create your personal account first, then submit professional credentials for KAYAD review. Approval adds professional access to that same account.' },
      { title: 'Employed by a business', body: 'You create an account, then ask the business to confirm you. The business must accept, and KAYAD verifies qualifications separately.' },
    ],
  },
];

export const roleById = (id: PublicRoleId): PublicRole => PUBLIC_ROLES.find((r) => r.id === id)!;

export const roleForIntent = (intent: AuthIntent | null | undefined): PublicRoleId | null => {
  switch (intent) {
    case 'buyer': return 'buyer';
    case 'seller': return 'buyer';
    case 'dealer': return 'dealer';
    case 'provider': return 'garage_business';
    case 'professional': return 'professional';
    default: return null;
  }
};

/** Roles a visitor may never choose for themselves. Used by tests and as a guard. */
export const NON_SELF_REGISTRABLE = ['admin', 'superadmin', 'moderator', 'marketing', 'technical_support', 'hr', 'accounts', 'escrow_officer', 'ad_manager', 'ghost_checker', 'broker'] as const;
