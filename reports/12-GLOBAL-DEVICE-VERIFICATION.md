# 12 — Global device verification

## What was executed (local rehearsal, no production access)
`ci/browser/release-switch.mjs` serves two real builds (A and B, different commit ids), registers a worker, switches the host from A to B **without clearing the browser**, and checks what a returning visitor runs.

| Check | Original worker | Fixed worker |
|---|---|---|
| Returning visitor gets B on plain reload at `/` | pass | pass |
| Deep link `/dealer` is not stale after host moves to B | **FAIL (6/6 runs: still ran A)** | pass |
| Open tab running A shows a non-disruptive banner when B is live | n/a (no banner) | pass |
| Typed form input survives (no auto-reload) | n/a | pass |
| Refresh button lands on B | n/a | pass |
| Deleted chunk → exactly one recovery reload, lands on B | n/a | pass |
| Second chunk failure within 60 s does not loop | n/a | pass |
| No page errors | | pass |
Fixed worker, new→new: **8/8 + 3/3 complete runs, 10/10 checks each.** Evidence: `reports/evidence/release-switch/` (banner screenshot, results, run output).

## Honest limitation: browser stall on worker *upgrade*
When a browser replaces an *existing* worker with a changed one, headless Chromium occasionally leaves **one** navigation hanging (legacy→current, single deploy: 1/30, 8/30, 5/30 by timing; original worker → changed copy of itself: 4/12). It never happened on new→new updates (0/50) or without a worker replacement (0/20). Diagnosis and classification (existing Chromium race, not an app/server defect): `SERVICE-WORKER-REHEARSAL.md` §1. Real-device frequency is unknown — that is what the device table below measures.

## Not verified (BLOCKED – production access needed)
Custom vs canonical domain parity, DNS/CDN, multi-region and multi-network release ids, real PWA installs, API compatibility on production. Run from any unrestricted machine, and attach the output:
```
for h in https://www.kayad.space https://kayad.space https://<vercel-project>.vercel.app; do
  echo "== $h"; curl -sSI "$h/" | egrep -i "^(HTTP|cache-control|etag|age|x-vercel|server|last-modified)";
  curl -sS "$h/release.json"; echo; curl -sS "$h/" | egrep -o 'kayad-release" content="[^"]+|assets/index-[^"]+\.js'; done
dig +short www.kayad.space A; dig +short www.kayad.space CNAME; dig +short kayad.space A
```
Expected after deploy: identical `releaseId`/`commit` on every host; `/` with `max-age=0, must-revalidate`; `/release.json` `no-store`.
In a browser on an affected device: DevTools → Application → Service Workers (look for an old worker) and `fetch('/release.json',{cache:'no-store'}).then(r=>r.json())`.

**The release is NOT globally verified.**

---
## Owner procedure for Windows (CMD and PowerShell) — added 2026-11-22
Step 0 — get the **real** expected release (do not guess it). In the Vercel dashboard open project `kayad-space` → Deployments → the one marked **Production** and note its commit SHA, and which domains it lists (www.kayad.space, kayad.space). Also note the latest "Deploy to Production" run on `main` in GitHub → Actions (green or red).

Step 1 — what each address serves (CMD; `curl.exe` ships with Windows 10/11):
```
curl.exe -sS -I https://www.kayad.space/
curl.exe -sS -I https://kayad.space/
curl.exe -sS -H "Cache-Control: no-cache" https://www.kayad.space/release.json
curl.exe -sS -H "Cache-Control: no-cache" https://kayad.space/release.json
curl.exe -sS -I https://www.kayad.space/sw.js
curl.exe -sS -I https://www.kayad.space/dealer
curl.exe -sS https://www.kayad.space/ | findstr /i "kayad-release assets/index-"
```
Look at: `HTTP` status/redirects, `cache-control` (`/` must say `max-age=0, must-revalidate`; `release.json` and `sw.js` `no-store`), `x-vercel-cache` / `age` (a large `age` on `/` is a red flag), `etag`. The `commit` in `release.json` must equal the Vercel production commit, and the `kayad-release` meta in the HTML must equal `releaseId`.

Step 2 — DNS and TLS (CMD, no `dig` needed):
```
nslookup www.kayad.space
nslookup kayad.space
nslookup -type=CNAME www.kayad.space
```
PowerShell alternative: `Resolve-DnsName www.kayad.space -Type A` and `Resolve-DnsName kayad.space -Type A`.
Certificate: `curl.exe -vI https://www.kayad.space/ 2>&1 | findstr /i "subject issuer expire SSL"`.
Red flags: `www` and apex resolving to different providers/addresses than Vercel instructs; an old A record next to the Vercel record; a certificate that does not list both names.

Step 3 — compare devices. On each device open `https://www.kayad.space/release.json` (add `?x=1` to bypass nothing; the file is no-store) and write down `releaseId` and `commit`:
| Device / condition | releaseId | commit | Matches Vercel Production? |
|---|---|---|---|
| Owner phone (Wi-Fi) | | | |
| Owner phone (mobile data) | | | |
| Owner computer | | | |
| Friend phone | | | |
| Friend computer | | | |
| Private/incognito window | | | |
| Installed PWA (open it, then visit /release.json in a normal tab) | | | |
If every row matches, all devices receive the same release. If a row differs, on that device open DevTools (computer) → Application → Service Workers and Storage → "Clear site data", reload, and re-check; if the id then matches, a stale local worker/cache caused it (the fixed worker removes that class of problem once deployed). If it still differs, the difference is on the delivery side (alias, DNS or CDN) — send me the Step 1 and Step 2 output for the failing network.

**Status: owner action required. Not independently verified. The stale-version problem is NOT confirmed fixed.**


---
## Update 2026-11-22 — PowerShell compare script and concise evidence request
The CMD steps above work as written (`curl.exe` ships with Windows 10/11; `nslookup` is built in). The block below does the comparison automatically in **PowerShell**. It was reviewed but **not executed on Windows** by me (the sandbox has no PowerShell and cannot reach the domain); if it errors, send the error text.

What it compares: (a) the Vercel Production commit you type in (Step 0), (b) `release.json` identity on each host (commit, releaseId), (c) the service-worker file headers and size, (d) cache headers of `/`, `/release.json`, `/sw.js` and a hashed asset, (e) the entry asset ids referenced by the HTML on each host.
```powershell
$expected = Read-Host "Vercel Production commit SHA (first 12+ chars)"
$hosts = @("https://www.kayad.space","https://kayad.space")
$hosts += Read-Host "Vercel production URL (https://....vercel.app), or press Enter to skip" | Where-Object { $_ }
foreach ($h in $hosts) {
  Write-Host "=== $h"
  try {
    $rel = Invoke-RestMethod -Uri "$h/release.json" -Headers @{ "Cache-Control" = "no-cache" } -TimeoutSec 20
    Write-Host ("release.json: commit={0} releaseId={1}" -f $rel.commit, $rel.releaseId)
    if ($rel.commit -and $rel.commit.StartsWith($expected.Substring(0,[Math]::Min(12,$expected.Length)))) { Write-Host "  MATCHES Vercel Production" -ForegroundColor Green } else { Write-Host "  DOES NOT MATCH Vercel Production" -ForegroundColor Red }
  } catch { Write-Host "  release.json FAILED: $($_.Exception.Message)" -ForegroundColor Red }
  foreach ($path in "/","/release.json","/sw.js") {
    try { $r = Invoke-WebRequest -Uri "$h$path" -Method Head -UseBasicParsing -TimeoutSec 20
      Write-Host ("  {0,-14} {1}  cache-control={2}  age={3}  x-vercel-cache={4}" -f $path, $r.StatusCode, $r.Headers["Cache-Control"], $r.Headers["Age"], $r.Headers["X-Vercel-Cache"])
    } catch { Write-Host "  $path FAILED: $($_.Exception.Message)" -ForegroundColor Red }
  }
  try {
    $html = (Invoke-WebRequest -Uri "$h/" -UseBasicParsing -TimeoutSec 20).Content
    $meta = [regex]::Match($html, 'name="kayad-release" content="([^"]+)"').Groups[1].Value
    $assets = [regex]::Matches($html, '/assets/[^"''\s]+\.(js|css)') | ForEach-Object { $_.Value } | Select-Object -Unique
    Write-Host "  html meta kayad-release = $meta"
    Write-Host "  entry assets: $($assets -join ', ')"
  } catch { Write-Host "  HTML FAILED: $($_.Exception.Message)" -ForegroundColor Red }
}
```
Pass condition: every host prints **MATCHES**, the same `releaseId`, the same html meta value and the same entry assets; `/` shows `max-age=0, must-revalidate`; `/release.json` and `/sw.js` show `no-store`. Service-worker version: `/sw.js` is intentionally identical across releases (it is release-independent by design); compare its size (`curl.exe -sI https://www.kayad.space/sw.js` → `content-length`) between hosts, and in a browser DevTools → Application → Service Workers check there is a single worker and that it is the current one (cache names `kayad-shell-v3`, `kayad-assets-v3`, `kayad-images-v3` in Application → Cache Storage; names like `kayad-static-v2`/`kayad-mobile-v2` mean the old worker is still installed).

### Evidence request to the owner (send these, nothing else)
1. Screenshot or text of Vercel → project → Deployments: the **Production** row (commit SHA, status, domains list).
2. GitHub → Actions → last `Deploy to Production` run on `main`: success or failure, and the failing step if any.
3. The full PowerShell output above, from a normal home network and, if possible, once from mobile data.
4. The CMD Step 2 output (`nslookup`) for `www.kayad.space` and `kayad.space`.
5. For ≥3 devices (include one friend who sees the old version): the Step 3 table, and a screenshot of DevTools → Application → Service Workers/Cache Storage on the affected computer (on a phone: just the `/release.json` text and whether the app looked old).
No production result is recorded in this repository until you send it.
