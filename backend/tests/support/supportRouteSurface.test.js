// Release-gate audit: every HTTP route that can reach support case content is gated by the canonical capability
// middleware, and nothing else in the backend reads support_tickets.messages / resolution_notes.
import { describe, test, expect } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const backend = path.resolve(here, "../..");
const supportRoutes = (await import("../../routes/supportRoutes.js")).default;
const adminFacade = (await import("../../routes/supportTicketAdminRoutes.js")).default;
const analytics = (await import("../../routes/supportDashboardRoutes.js")).default;

const flatten = (router) => router.stack.flatMap((layer) => {
  if (layer.route) {
    const names = layer.route.stack.map((l) => l.handle.name || "anonymous");
    return Object.keys(layer.route.methods).map((m) => ({ method: m.toUpperCase(), path: layer.route.path, names, scope: "route" }));
  }
  return [{ method: "USE", path: "*", names: [layer.handle.name || "anonymous"], scope: "router" }];
});
const WRITE = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const CUSTOMER_PATHS = new Set(["/config", "/", "/my-tickets", "/:id", "/:id/messages", "/:id/rate"]);

describe("canonical /api/support routes", () => {
  const routes = flatten(supportRoutes);
  test("every non-customer route requires a support capability; every write requires the agent", () => {
    for (const r of routes) {
      if (r.method === "GET" && CUSTOMER_PATHS.has(r.path)) continue;
      if (r.method === "POST" && ["/", "/:id/messages", "/:id/rate"].includes(r.path)) continue;
      const gated = r.names.includes("requireSupportViewer") || r.names.includes("requireSupportAgent");
      expect({ r: `${r.method} ${r.path}`, gated }).toEqual({ r: `${r.method} ${r.path}`, gated: true });
      if (WRITE.has(r.method)) expect(r.names).toContain("requireSupportAgent");
    }
  });
  test("customer routes authenticate and never carry a staff capability", () => {
    for (const r of routes.filter((x) => CUSTOMER_PATHS.has(x.path) && !(x.method === "PUT"))) {
      expect(r.names[0]).toBe("protect");
      expect(r.names).not.toContain("requireSupportViewer");
      expect(r.names).not.toContain("requireSupportAgent");
    }
  });
  test("`PUT /:id/status` (legacy alias) is agent-only", () => {
    const r = routes.find((x) => x.method === "PUT" && x.path === "/:id/status");
    expect(r.names).toContain("requireSupportAgent");
  });
  test("no route uses a broad role gate or the generic permission helper", () => {
    for (const r of [...routes, ...flatten(adminFacade), ...flatten(analytics)]) {
      for (const n of r.names) expect(["adminOnly", "requirePermission", "authorize", "restrictTo", "requireRole"]).not.toContain(n);
    }
  });
});

describe("legacy facades share the canonical gates", () => {
  test("admin facade: router-level viewer gate and agent gate on every write", () => {
    const rs = flatten(adminFacade);
    expect(rs[0]).toMatchObject({ method: "USE" });
    expect(rs.slice(0, 2).flatMap((r) => r.names)).toEqual(expect.arrayContaining(["protect", "requireSupportViewer"]));
    for (const r of rs.filter((x) => x.scope === "route" && WRITE.has(x.method))) expect(r.names).toContain("requireSupportAgent");
  });
  test("analytics mount is viewer-gated and exposes only aggregated metrics", () => {
    for (const r of flatten(analytics)) { expect(r.names).toContain("requireSupportViewer"); expect(r.method).toBe("GET"); }
  });
});

describe("no other code path reads support content", () => {
  const SKIP = new Set(["node_modules", "tests", "uploads", "coverage"]);
  const files = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (SKIP.has(e.name)) continue; const p = path.join(d, e.name); e.isDirectory() ? walk(p) : e.name.endsWith(".js") && files.push(p); } })(backend);
  const touching = files.filter((f) => /support_tickets|SupportTicket|kayad_support_/.test(fs.readFileSync(f, "utf8")));
  const rel = (f) => path.relative(backend, f).replaceAll(path.sep, "/");
  test("the only readers of support_tickets are the support service, aggregate-count dashboards and the model map", () => {
    expect(touching.map(rel).sort()).toEqual([
      "controllers/commandCenterController.js", "controllers/operationsDashboardController.js", "models/SupportTicket.js",
      "models/_base.js", "operations/services/operationsService.js", "routes/adminRoutes.js", "services/support/supportCase.service.js",
      "utils/fieldMap.js",
    ].sort());
  });
  test("dashboards only COUNT — none selects messages or resolution notes", () => {
    for (const f of ["controllers/commandCenterController.js", "controllers/operationsDashboardController.js", "routes/adminRoutes.js"]) {
      const src = fs.readFileSync(path.join(backend, f), "utf8");
      const lines = src.split("\n").filter((l) => /support_tickets|SupportTicket/.test(l) && !/^\s*import /.test(l));
      // operationsDashboardController wraps count() as `c(table, filters)`; verify that alias is a pure count helper.
      if (f.includes("operationsDashboard")) expect(src).toMatch(/const c *= *\(table, *filters *= *\{\}\) *=> *count\(/);
      for (const l of lines) { if (!f.includes("operationsDashboard")) expect(l).toMatch(/count/i); expect(l).not.toMatch(/messages|resolution_?notes|resolutionNotes|\.find\(/); }
    }
  });
  test("the support service reads staff data only through the redacting loaders", () => {
    const src = fs.readFileSync(path.join(backend, "services/support/supportCase.service.js"), "utf8");
    expect(src).toContain("redactInternal: true");
    expect(src).not.toMatch(/\.select\(\s*["'`]\*["'`]/);
  });
});
