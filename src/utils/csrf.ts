/**
 * KAYAD browser CSRF helper.
 *
 * The backend issues the readable XSRF-TOKEN cookie from its session
 * middleware. Cookie-authenticated state-changing requests must echo that
 * value in X-CSRF-Token. Keep the lookup in one place so every API client
 * follows the same contract.
 */
let bootstrapToken: string | null = null;

export function setCSRFToken(token: string | null): void {
  bootstrapToken = token || null;
}

export function clearCSRFToken(): void {
  bootstrapToken = null;
}

export function getCSRFToken(): string | null {
  if (bootstrapToken) return bootstrapToken;
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function getCsrfHeaders(method?: string): Record<string, string> {
  const normalized = String(method || 'GET').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalized)) return {};
  const token = getCSRFToken();
  return token ? { 'X-CSRF-Token': token } : {};
}
