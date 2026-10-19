/* eslint-disable no-undef -- Node-run acceptance harness */
// STAGE 5C.1 — Part G: listing-image journeys, run SEPARATELY for a dealer (G1) and a private seller (G2). Stub-backed Cloudinary (NOT real Cloudinary).
import fs from "node:fs";
import { provisionOwners, Client, sql, sleep, rec, eq, summary, form, registerVerified, approvedDealer, rawUser, PNG, JPG, CAR, stubUploads, stubCalls, stubFail, BE } from "./lib.mjs";
const T = Date.now(); const em = (n) => `${n}-${T}@kayad-test.example`; const PW = "Imgs!Pass#2026g"; const J = (r) => JSON.stringify(r.body).slice(0, 220);
stubFail(false);
const { owners } = await provisionOwners("OwnerOne!Pass#2026", "OwnerTwo!Pass#2026"); const owner = owners[0].client;
const anon = new Client();
const files = (n = 1, type = "image/png", data = PNG) => Array.from({ length: n }, (_, i) => ({ name: "images", data, type, filename: `p${i}.${type === "image/png" ? "png" : "jpg"}` }));
const diskCount = () => { try { return fs.readdirSync(`${BE}/uploads`).length; } catch { return 0; } };
const imgs = (id) => JSON.parse(sql(`select coalesce(images,'[]'::jsonb)::text from cars where id='${id}'`));
const carsOf = (uid) => Number(sql(`select count(*) from cars where dealer_id='${uid}'`));
async function waitCloud(id, n, ms = 30000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const a = imgs(id); if (a.length >= n && a.every((x) => !x._pending && x.public_id)) return a; await sleep(500); } return imgs(id); }
const ghost = em("inspector-img"); rawUser(ghost, "ghost_checker", PW); const gh = new Client(); await gh.login(ghost, PW);
const admE = em("admin-img"); rawUser(admE, "admin", PW); const adm = new Client(); await adm.login(admE, PW);
const BUY = await registerVerified(em("buyer-img"), PW, "user");

async function journey(tag, label, mine, mk, mkOther, mkCrossRole) {
  console.log(`== ${tag} ${label} ==`);
  const U = await mk(); const O = await mkOther(); const X = await mkCrossRole(); const c = U.client;
  let s0 = stubCalls().length, d0 = diskCount();
  const cr = await form(c, "POST", "/api/v1/cars", CAR(`${label} Prado`), files(2));
  const id = cr.body?.data?.id || cr.body?.car?.id || cr.body?.id;
  rec(`${tag}.1 owner creates a listing with 2 images through the real multipart API (201)`, cr.status === 201 && !!id, `${cr.status} ${J(cr)}`);
  eq(`${tag}.2 listing is moderated: pending, owned by the caller`, sql(`select status||'/'||(dealer_id='${U.id}')::text from cars where id='${id}'`), "pending/true");
  const first = imgs(id); rec(`${tag}.3 images are recorded immediately as pending (no false "complete")`, first.length === 2, JSON.stringify(first).slice(0, 180));
  const done = await waitCloud(id, 2);
  rec(`${tag}.4 background upload completes: both images now carry a provider public_id and URL`, done.length === 2 && done.every((x) => x.public_id && /127\.0\.0\.1:9099/.test(x.url) && !x._pending), JSON.stringify(done).slice(0, 220));
  const su = stubUploads(s0);
  rec(`${tag}.5 the storage provider (stub) received exactly 2 file parts, as PUBLIC listing media under kayad/cars`, su.length === 2 && su.every((x) => x.hasFilePart && x.deliveryType === "upload" && /kayad\/cars/.test(x.folder || "")), JSON.stringify(su.map((x) => [x.hasFilePart, x.deliveryType, x.folder])));
  eq(`${tag}.6 media job ledger: both jobs completed`, sql(`select string_agg(status,',' order by status) from media_upload_jobs where listing_id='${id}'`), "completed,completed");
  eq(`${tag}.7 local temp files were cleaned after upload (no orphans)`, diskCount(), d0);
  const own = await c.call("GET", mine);
  const ownRow = (own.body?.data || own.body?.cars || own.body?.items || []).find?.((x) => (x.id || x._id) === id || x.title === `${label} Prado`);
  rec(`${tag}.8 owner sees the listing, with its provider-hosted images, through the role's own listing view (${mine})`, own.status === 200 && !!ownRow && JSON.stringify(ownRow).includes("127.0.0.1:9099"), `${own.status} ${J(own)}`);
  const oth = await O.client.call("GET", mine); rec(`${tag}.8b another ${label.toLowerCase()}'s listing view does not include it`, !JSON.stringify(oth.body).includes(`${label} Prado`), `${oth.status}`);
  const pub = await anon.call("GET", "/api/v1/cars?limit=100"); eq(`${tag}.9 moderation holds: listing with finished images is still NOT in the public marketplace`, JSON.stringify(pub.body).includes(id), false);
  const pr = await c.call("PUT", `/api/v1/cars/${id}`, { status: "available", approved: true, price: 3400000 });
  eq(`${tag}.10 owner cannot self-publish by editing (status stays pending)`, sql(`select status from cars where id='${id}'`), "pending");
  // add images
  s0 = stubCalls().length;
  const ad = await form(c, "POST", `/api/v1/cars/${id}/images`, {}, files(1));
  rec(`${tag}.11 owner adds an image to the existing listing (200, 3 images)`, ad.status === 200 && imgs(id).length === 3 && imgs(id).every((x) => x.public_id), `${ad.status} ${J(ad)}`);
  eq(`${tag}.12 provider received exactly that one file`, stubUploads(s0).length, 1);
  // ownership
  console.log(`-- ${tag} ownership --`);
  const before = JSON.stringify(imgs(id)); s0 = stubCalls().length; d0 = diskCount();
  for (const [who, cl, want] of [["another " + label.toLowerCase(), O.client, [403]], ["user of the other seller role", X.client, [403]], ["buyer", BUY.client, [403]], ["inspector (ghost_checker)", gh, [403]], ["anonymous", anon, [401]]]) {
    const r = await form(cl, "POST", `/api/v1/cars/${id}/images`, {}, files(1)); rec(`${tag}.13 ${who} cannot attach an image to this listing`, want.includes(r.status), `${r.status} ${J(r)}`);
    const rd = await cl.call("DELETE", `/api/v1/cars/${id}/images/0`); rec(`${tag}.14 ${who} cannot delete an image of this listing`, [401, 403].includes(rd.status), `${rd.status}`);
    const re = await cl.call("PUT", `/api/v1/cars/${id}`, { price: 1 }); rec(`${tag}.15 ${who} cannot edit this listing`, [401, 403].includes(re.status), `${re.status}`);
  }
  eq(`${tag}.16 images unchanged, provider received nothing, no temp-file orphans after all rejected attempts`, `${JSON.stringify(imgs(id)) === before}/${stubUploads(s0).length}/${diskCount() - d0}`, "true/0/0");
  const ar = await form(adm, "POST", `/api/v1/cars/${id}/images`, {}, files(1));
  rec(`${tag}.17 ordinary admin may manage listings per existing MANAGE_CARS staff policy (observed ${ar.status})`, [200, 403].includes(ar.status), `${ar.status}`);
  // validation
  console.log(`-- ${tag} validation --`);
  s0 = stubCalls().length; d0 = diskCount(); const n0 = carsOf(U.id); const cnt = imgs(id).length;
  const inv = async (idn, r) => rec(idn, r.status === 400, `${r.status} ${J(r)}`);
  await inv(`${tag}.18 text bytes declared as PNG → 400`, await form(c, "POST", `/api/v1/cars/${id}/images`, {}, [{ name: "images", data: Buffer.from("plain text, not an image"), type: "image/png", filename: "x.png" }]));
  await inv(`${tag}.19 JPEG bytes declared as PNG → 400`, await form(c, "POST", `/api/v1/cars/${id}/images`, {}, [{ name: "images", data: JPG, type: "image/png", filename: "x.png" }]));
  await inv(`${tag}.20 SVG → 400`, await form(c, "POST", `/api/v1/cars/${id}/images`, {}, [{ name: "images", data: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>1</script></svg>"), type: "image/svg+xml", filename: "x.svg" }]));
  await inv(`${tag}.21 > 5 MB image → 400`, await form(c, "POST", `/api/v1/cars/${id}/images`, {}, [{ name: "images", data: Buffer.concat([PNG.subarray(0, 8), Buffer.alloc(5.5 * 1024 * 1024, 7)]), type: "image/png", filename: "big.png" }]));
  await inv(`${tag}.22 no files on add → 400`, await form(c, "POST", `/api/v1/cars/${id}/images`, {}, []));
  await inv(`${tag}.23 11 files in one request → 400 (multer limit)`, await form(c, "POST", `/api/v1/cars/${id}/images`, {}, files(11)));
  await inv(`${tag}.24 create with no image → 400`, await form(c, "POST", "/api/v1/cars", CAR("No Image Car"), []));
  await inv(`${tag}.25 create with malformed metadata (year/price not numeric) → 400`, await form(c, "POST", "/api/v1/cars", { ...CAR("Bad Meta"), year: "abc", price: "free" }, files(1)));
  await inv(`${tag}.26 create with a bad image type → 400`, await form(c, "POST", "/api/v1/cars", CAR("Bad Img"), [{ name: "images", data: Buffer.from("zzzz"), type: "image/png", filename: "z.png" }]));
  eq(`${tag}.27 rejected requests created no listing, attached no image, reached no storage and left no temp files`, `${carsOf(U.id) - n0}/${imgs(id).length - cnt}/${stubUploads(s0).length}/${diskCount() - d0}`, "0/0/0/0");
  // cap
  const cap = []; for (let k = 0; k < 4; k++) { const r = await form(c, "POST", `/api/v1/cars/${id}/images`, {}, files(5)); cap.push(r.status); }
  rec(`${tag}.28 per-listing cap of 20 is enforced (later adds refused with 400)`, cap.includes(400) && imgs(id).length <= 20, `${cap.join(",")} total=${imgs(id).length}`);
  // storage failure on add
  console.log(`-- ${tag} storage failure and retry --`);
  const base = JSON.stringify(imgs(id)); d0 = diskCount(); s0 = stubCalls().length; stubFail(true);
  const f1 = await form(c, "POST", `/api/v1/cars/${id}/images`, {}, files(1)); stubFail(false);
  rec(`${tag}.29 storage failure on add → error response, not success`, f1.status >= 400 && f1.body?.success !== true, `${f1.status} ${J(f1)}`);
  eq(`${tag}.30 failed add did not change the listing's images`, JSON.stringify(imgs(id)) === base, true);
  eq(`${tag}.31 failed add left no orphaned temp file on disk`, diskCount() - d0, 0);
  const pre = imgs(id).length; const r2 = await form(c, "POST", `/api/v1/cars/${id}/images`, {}, files(1));
  rec(`${tag}.32 retry after recovery attaches exactly one image`, (r2.status === 200 && imgs(id).length === pre + 1) || (pre >= 20 && r2.status === 400), `${r2.status} pre=${pre} now=${imgs(id).length}`);
  // storage failure on create
  const U2 = U; d0 = diskCount(); stubFail(true);
  const c2 = await form(c, "POST", "/api/v1/cars", CAR(`${label} FailUpload`), files(1)); const id2 = c2.body?.data?.id || c2.body?.id;
  rec(`${tag}.33 create is accepted (async upload) but the listing is pending moderation`, c2.status === 201 && !!id2 && sql(`select status from cars where id='${id2}'`) === "pending", `${c2.status} ${J(c2)}`);
  await sleep(9000); stubFail(false);
  const after = imgs(id2);
  rec(`${tag}.34 after provider failure the image stays flagged pending — never marked as uploaded`, after.length === 1 && after[0]._pending === true && !after[0].public_id, JSON.stringify(after).slice(0, 200));
  const job = sql(`select status||'/'||attempts||'/'||(coalesce(last_error,'')<>'')::text from media_upload_jobs where listing_id='${id2}'`);
  rec(`${tag}.35 failure is durably recorded for recovery (job not 'completed', attempts>0, error stored)`, !!job && !job.startsWith("completed") && /\/true$/.test(job), job);
  rec(`${tag}.36 source file retained for recovery (not deleted by the failed upload)`, diskCount() - d0 >= 1, `${diskCount() - d0}`);
  eq(`${tag}.37 listing remains non-public after the failure`, JSON.stringify((await anon.call("GET", "/api/v1/cars?limit=100")).body).includes(id2), false);
  const rr = await form(c, "POST", `/api/v1/cars/${id2}/images`, {}, files(1));
  rec(`${tag}.38 owner can still add a fresh image to that listing once storage is healthy`, rr.status === 200 && imgs(id2).some((x) => x.public_id), `${rr.status} ${J(rr)}`);
  eq(`${tag}.39 no duplicate listing was created by the retry`, sql(`select count(*) from cars where dealer_id='${U.id}' and title='${label} FailUpload'`), "1");
}
await journey("G1", "Dealer", "/api/v1/cars/dealer/my-cars",
  () => approvedDealer(owner, em("dealer-img"), PW, "Img Motors"),
  () => approvedDealer(owner, em("dealer-img-other"), PW, "Other Img Motors"),
  () => registerVerified(em("seller-img-x"), PW, "individual_seller"));
await journey("G2", "Seller", "/api/v1/cars/my-listings",
  () => registerVerified(em("seller-img"), PW, "individual_seller"),
  () => registerVerified(em("seller-img-other"), PW, "individual_seller"),
  () => approvedDealer(owner, em("dealer-img-x"), PW, "Cross Motors"));
summary("role_api_g");
