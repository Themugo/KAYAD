// Minimal cookie-jar API client with CSRF double-submit (mirrors the SPA's httpClient).
export const BASE = process.env.API || "http://127.0.0.1:5050";
export class Client {
  constructor() { this.jar = {}; this.token = null; }
  cookieHeader() { return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; "); }
  absorb(r) { for (const sc of r.headers.getSetCookie?.() || []) { const [kv] = sc.split(";"); const i = kv.indexOf("="); const k = kv.slice(0, i), v = kv.slice(i + 1); if (/Max-Age=0|expires=Thu, 01 Jan 1970/i.test(sc)) delete this.jar[k]; else this.jar[k] = v; } }
  async csrf() { if (!this.jar["XSRF-TOKEN"]) { const r = await fetch(BASE + "/api/v1/auth/csrf", { headers: { cookie: this.cookieHeader() } }); this.absorb(r); } return this.jar["XSRF-TOKEN"]; }
  async call(method, path, body, extra = {}) {
    const unsafe = !["GET", "HEAD", "OPTIONS"].includes(method);
    const headers = { "content-type": "application/json", cookie: this.cookieHeader(), ...(this.token ? { authorization: `Bearer ${this.token}` } : {}), ...extra };
    if (unsafe) headers["x-csrf-token"] = await this.csrf(), headers.cookie = this.cookieHeader();
    const r = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    this.absorb(r);
    const text = await r.text(); let json; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 300) }; }
    return { status: r.status, body: json };
  }
  async login(email, password) { const r = await this.call("POST", "/api/v1/auth/login", { email, password }); this.token = r.body?.token || r.body?.accessToken || r.body?.data?.token || null; return r; }
}
