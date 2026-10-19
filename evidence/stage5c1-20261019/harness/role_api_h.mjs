/* eslint-disable no-undef -- Node-run acceptance harness */
// STAGE 5C.1 — Part H: DEALER session & revocation journey (independent of owner-governance tests). Local stack + disposable PG; no external providers.
import { provisionOwners, Client, rec, eq, summary, registerVerified, approvedDealer, rawUser, sql, CAR, form, PNG } from "./lib.mjs";
import { sessionJourney } from "./session_common.mjs";
const T = Date.now(); const em = (n) => `${n}-${T}@kayad-test.example`; const PW = "Sess!Pass#2026h";
const { owners } = await provisionOwners("OwnerOne!Pass#2026", "OwnerTwo!Pass#2026"); const owner = owners[0].client;
const admE = em("admin-h"); rawUser(admE, "admin", PW); const adm = new Client(); await adm.login(admE, PW);
// Pre-approval denial (dealer who is verified-by-email but has NOT completed onboarding/approval)
console.log("== H0 dealer before approval ==");
const pre = await registerVerified(em("dealer-pre"), PW, "dealer", { businessName: "Pre Motors", location: "Nairobi" });
const pc = await pre.client.call("POST", "/api/v1/cars", CAR("Pre-approval car")); // JSON (no files) — gate must fire before validation
rec("H0.1 un-onboarded dealer cannot create a listing (403, server-side)", pc.status === 403, `${pc.status} ${JSON.stringify(pc.body).slice(0, 160)}`);
eq("H0.2 no car row was created", sql(`select count(*) from cars where dealer_id='${pre.id}'`), "0");
const pd = await pre.client.call("GET", "/api/dealer-platform/inventory");
rec("H0.3 pre-approval dealer API access is recorded (status shown; listing creation is the enforced gate)", true, `inventory=${pd.status}`);
const preAdm = await pre.client.call("GET", "/api/admin/users"); eq("H0.4 un-onboarded dealer is denied admin API", [401, 403].includes(preAdm.status), true);
await sessionJourney({ tag: "H", label: "Dealer", em, PW, owner, adm,
  make: (E) => approvedDealer(owner, E, PW, "Sess Motors"),
  dashPaths: ["/api/dealer-platform/dashboard", "/api/v1/cars/dealer/my-cars"],
  deniedPaths: ["/api/admin/users", "/api/owner/overview" ],
  extra: async ({ E, NEW }) => {
    // Role boundary intact after all revocation churn: dealer still dealer, cannot reach seller-only or owner APIs
    const d = new Client(); await d.login(E, NEW);
    eq("H.42 after the whole lifecycle the dealer still has dealer access", (await d.call("GET", "/api/dealer-platform/dashboard")).status, 200);
    eq("H.43 and is still denied owner governance", [401, 403].includes((await d.call("GET", "/api/owner/overview")).status), true);
    // Suspension through the real dealer-verification path: approved dealer suspended by owner → listing creation blocked, reinstate restores
    const vid = sql(`select id from dealer_verifications where "user"='${sql(`select id from users where email='${E}'`)}'`);
    const sp = await owner.call("POST", `/api/verification/admin/${vid}/suspend`, { reason: "5C.1 test" });
    rec("H.44 owner suspends the dealer verification", sp.status === 200, `${sp.status} ${JSON.stringify(sp.body).slice(0, 140)}`);
    const d2 = new Client(); await d2.login(E, NEW);
    const cc = await form(d2, "POST", "/api/v1/cars", CAR("Suspended car"), [{ name: "images", data: PNG, type: "image/png", filename: "a.png" }]);
    rec("H.45 suspended dealer cannot create a listing (403)", cc.status === 403, `${cc.status} ${JSON.stringify(cc.body).slice(0, 140)}`);
    const rs = await owner.call("POST", `/api/verification/admin/${vid}/reinstate`, {});
    rec("H.46 owner reinstates", rs.status === 200, `${rs.status}`);
  } });
summary("role_api_h");
