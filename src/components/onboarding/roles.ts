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
export type PublicRoleId = 'buyer' | 'seller' | 'dealer' | 'service_business' | 'professional';

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
  backendRole: 'user' | 'individual_seller' | 'dealer' | null;
  route: RegistrationRoute;
  /** Where a person should land after verifying and signing in, when it is not their default home. */
  afterSignIn: string | null;
  steps: Array<{ title: string; body: string }>;
}

export const PROVIDER_APPLICATION_PATH = '/?nav=inspections&action=apply-provider';
export const AFFILIATION_PATH = '/?nav=inspections&action=manage-business';

export const PUBLIC_ROLES: PublicRole[] = [
  {
    id: 'buyer', title: 'Buyer', summary: 'Browse, save, compare, bid and buy.',
    outcome: 'Ready once you verify your email', intent: 'buyer', backendRole: 'user', route: 'account', afterSignIn: null,
    steps: [
      { title: 'Create your account', body: 'Name, email and a password. No documents needed.' },
      { title: 'Verify your email', body: 'We email you a link. You cannot sign in until it is confirmed.' },
      { title: 'Sign in and start', body: 'Browse vehicles, save favourites, join auctions.' },
    ],
  },
  {
    id: 'seller', title: 'Private seller', summary: 'Sell your own vehicle.',
    outcome: 'Listing needs KAYAD approval', intent: 'seller', backendRole: 'individual_seller', route: 'account', afterSignIn: null,
    steps: [
      { title: 'Create your seller account', body: 'Your account is created in a pending state.' },
      { title: 'Verify your email', body: 'Required before you can sign in.' },
      { title: 'KAYAD approval', body: 'You can sign in while pending, but you cannot list a vehicle until KAYAD approves your seller account.' },
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
    id: 'service_business', title: 'Garage or inspection business', summary: 'List your workshop, inspection company or specialist services.',
    outcome: 'Application reviewed by KAYAD; services verified separately', intent: 'provider', backendRole: 'user', route: 'account_then_provider', afterSignIn: PROVIDER_APPLICATION_PATH,
    steps: [
      { title: 'Create an account for the business owner', body: 'This is a normal KAYAD account in your name.' },
      { title: 'Verify your email', body: 'Required before you can sign in.' },
      { title: 'Apply as a provider', body: 'After signing in you go straight to the provider application: business details and the services you offer. Declared services are shown as “declared”, not “verified”.' },
      { title: 'KAYAD review', body: 'KAYAD verifies the business and each service from evidence. You become publicly bookable only for what is verified.' },
    ],
  },
  {
    id: 'professional', title: 'Inspector or mechanic', summary: 'Work as an individual professional.',
    outcome: 'Independent: KAYAD reviews your application. Employed: your business confirms you.', intent: 'professional', backendRole: null, route: 'application', afterSignIn: null,
    steps: [
      { title: 'Choose how you work', body: 'On your own, or as staff of a garage or inspection company already on KAYAD.' },
      { title: 'Independent', body: 'You send an application with your ID and experience. It is not an account yet; if KAYAD approves it you get an email with a link to set your password.' },
      { title: 'Employed by a business', body: 'You create an account, then ask the business to confirm you. The business must accept, and KAYAD verifies qualifications separately.' },
    ],
  },
];

export const roleById = (id: PublicRoleId): PublicRole => PUBLIC_ROLES.find((r) => r.id === id)!;

export const roleForIntent = (intent: AuthIntent | null | undefined): PublicRoleId | null => {
  switch (intent) {
    case 'buyer': return 'buyer';
    case 'seller': return 'seller';
    case 'dealer': return 'dealer';
    case 'provider': return 'service_business';
    case 'professional': return 'professional';
    default: return null;
  }
};

/** Roles a visitor may never choose for themselves. Used by tests and as a guard. */
export const NON_SELF_REGISTRABLE = ['admin', 'superadmin', 'moderator', 'marketing', 'technical_support', 'hr', 'accounts', 'escrow_officer', 'ad_manager', 'ghost_checker', 'broker'] as const;
