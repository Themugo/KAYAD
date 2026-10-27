# 14 ZIP integrity, checksum and manifest
Package: KAYAD-PHASE14.6-DEALER-DASHBOARD-DESIGN-CONVERGENCE-20261026.zip (single top folder KAYAD/).
The archive cannot contain its own hash. The checksum, test and clean-extraction results are in the files delivered next to it:
- KAYAD-PHASE14.6-DEALER-DASHBOARD-DESIGN-CONVERGENCE-20261026.zip.sha256
- KAYAD-PHASE14.6-DEALER-DASHBOARD-DESIGN-CONVERGENCE-20261026.integrity.log
Inside the archive: KAYAD_PHASE14_6_SOURCE_MANIFEST.sha256 lists every file except itself (sha256sum format); verify with `sha256sum -c KAYAD_PHASE14_6_SOURCE_MANIFEST.sha256`.
Procedure run before delivery: build tree without node_modules, dist, caches, .env, keys, nested archives or temp files; no symlinks; manifest generated and checked (exit 0); naming/path validator with --base (14.5) and --manifest: 10/10 PASS (no Windows-illegal names, no path over 200 characters, no case duplicates); zip created; SHA-256 recorded; unzip -t; clean extraction to an empty directory; manifest re-checked there; essential checks run from the extraction.
Windows: names contain no colon or other illegal characters; the evidence logs use underscores.
