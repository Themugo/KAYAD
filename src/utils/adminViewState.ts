/** Session-scoped admin view state (dashboard place-keeping). Cleared on confirmed sign-out. */
export const COMMAND_VIEW_KEY = 'kayad.admin.command-centre.view.v1';
export const ADMIN_VIEW_STATE_KEYS: readonly string[] = [COMMAND_VIEW_KEY];

export function clearAdminViewState(): void {
  for (const key of ADMIN_VIEW_STATE_KEYS) {
    try { window.sessionStorage.removeItem(key); } catch { /* storage unavailable */ }
  }
}
