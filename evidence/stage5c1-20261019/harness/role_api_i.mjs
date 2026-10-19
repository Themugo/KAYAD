/* eslint-disable no-undef -- Node-run acceptance harness */
// STAGE 5C.1 — Part I: PRIVATE SELLER session & revocation journey. Local stack + disposable PG; no external providers.
import { provisionOwners, Client, rec, eq, summary, registerVerified, approvedDealer, rawUser, sql, CAR, form, PNG } from "./lib.mjs";
import { sessionJourney } from "./session_common.mjs";
const T = Date.now(); const em = (n) => `${n}-${T}@kayad-test.example`; const PW = "Sess!Pass#2026i";
const { owners } = await provisionOwners("OwnerOne!Pass#2026", "OwnerTwo!Pass#2026"); const owner = owners[0].client;
const admE = em("admin-i"); rawUser(admE, "admin", PW); const adm = new Client(); await adm.login(admE, PW);
console.log("== I0 seller before verification ==");
const since = (await import("./lib.mjs")).capCount(); const raw = new Client();
const rg = await raw.call("POST", "/api/v1/auth/register", { name: "Unverified Seller", email: em("seller-unv"), password: PW, role: "individual_seller", phone: "0712345678" });
const lg = await new Client().login(em("seller-unv"), PW);
rec("I0.1 unverified seller cannot obtain a session (login refused)", rg.status === 201 && lg.status >= 400, `register=${rg.status} login=${lg.status}`);
// Another seller's private resources
console.log("== I1 cross-seller isolation ==");
const A = await registerVerified(em("seller-a"), PW, "individual_seller"), B = await registerVerified(em("seller-b"), PW, "individual_seller");
const cr = await form(A.client, "POST", "/api/v1/cars", CAR("A's private car"), [{ name: "images", data: PNG, type: "image/png", filename: "a.png" }]);
const carId = cr.body?.data?.id || cr.body?.car?.id || cr.body?.id;
rec("I1.1 seller A owns a listing", cr.status === 201 && !!carId, `${cr.status}`);
const bl = await B.client.call("GET", "/api/v1/cars/my-listings"); const bl_s = JSON.stringify(bl.body);
rec("I1.2 seller B's my-listings does not include A's listing", bl.status === 200 && !bl_s.includes("A's private car"), `${bl.status}`);
const bu = await B.client.call("PUT", `/api/v1/cars/${carId}`, { price: 1 }); rec("I1.3 seller B cannot modify A's listing (403/404)", [403, 404].includes(bu.status), `${bu.status}`);
const bd = await B.client.call("DELETE", `/api/v1/cars/${carId}`); rec("I1.4 seller B cannot delete A's listing (403/404)", [403, 404].includes(bd.status), `${bd.status}`);
eq("I1.5 A's listing is untouched", sql(`select price::bigint from cars where id='${carId}'`), "3500000");
const bs = await B.client.call("GET", "/api/v1/auth/sessions"); const aTok = A.client.token; // B's session list must not leak A's
rec("I1.6 seller B's session list contains only B's sessions", bs.status === 200 && !JSON.stringify(bs.body).includes(A.id), `${bs.status}`);
const bi = await B.client.call("DELETE", `/api/v1/auth/sessions/${(await A.client.call("GET", "/api/v1/auth/sessions")).body?.sessions?.[0]?.id}`);
rec("I1.7 seller B cannot revoke seller A's session", bi.status >= 400, `${bi.status}`);
eq("I1.8 seller A's session still valid after B's attempt", (await A.client.call("GET", "/api/v1/cars/my-listings")).status, 200);
// DOCUMENTED POLICY (O5C1-01): dealerOnly admits SELLER_ROLES (dealer + individual_seller), so a private seller may call dealer-platform endpoints; they are scoped to the caller.
const sd = await A.client.call("GET", "/api/dealer-platform/dashboard"); const bd2 = await B.client.call("GET", "/api/dealer-platform/dashboard");
rec("I1.9 dealer-platform dashboard for a private seller is scoped to the caller only (A sees 1 own listing, B sees 0; policy O5C1-01, not a denial)", sd.status === 200 && sd.body?.data?.overview?.totalListings === 1 && bd2.body?.data?.overview?.totalListings === 0, `A=${sd.status}/${sd.body?.data?.overview?.totalListings} B=${bd2.status}/${bd2.body?.data?.overview?.totalListings}`);
const sinv = await B.client.call("GET", "/api/dealer-platform/inventory"); rec("I1.9b seller B's dealer-platform inventory does not contain A's listing", sinv.status === 200 && !JSON.stringify(sinv.body).includes("A's private car"), `${sinv.status}`);
await sessionJourney({ tag: "I", label: "Seller", em, PW, owner, adm,
  make: (E) => registerVerified(E, PW, "individual_seller"),
  dashPaths: ["/api/v1/cars/my-listings"],
  deniedPaths: ["/api/admin/users", "/api/owner/overview" ],
  extra: async ({ E, NEW }) => {
    const s = new Client(); await s.login(E, NEW);
    eq("I.42 after the whole lifecycle the seller still reaches seller APIs", (await s.call("GET", "/api/v1/cars/my-listings")).status, 200);
    eq("I.43 and is still denied owner governance and admin APIs", [401, 403].includes((await s.call("GET", "/api/admin/users")).status) && [401, 403].includes((await s.call("GET", "/api/owner/overview")).status), true);
  } });
summary("role_api_i");
