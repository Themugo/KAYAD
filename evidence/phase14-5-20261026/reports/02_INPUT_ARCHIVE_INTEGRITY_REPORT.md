# Input Archive Integrity Report
| Item | Result |
|---|---|
| Expected foundation SHA-256 | f380db6737eadf2b09bcbb78878fc1675663433c1a571628954bb54b8bbfb037 |
| `KAYAD-PHASE14.4-DEALER-WORKFLOW-COMPLETION-20261026.zip` actual SHA-256 | f380db6737eadf2b09bcbb78878fc1675663433c1a571628954bb54b8bbfb037 — **MATCH** |
| `KAYAD-PHASE14.4-DEALER-WORKFLOW-COMPLETION-20261026-WINDOWS.zip` actual SHA-256 | d1c6106ea8ba1201ed180c9ef48789eaf0eb6ca14be88ce43d21e89b8a3244a4 — **does NOT match the expected value** |
| `unzip -t` both | No errors detected |
| Manifest check both | exit 0 |

**Provenance discrepancy (resolved, documented):** the 14.5 prompt names the `-WINDOWS` file but quotes the hash of the original (non-Windows) 14.4 archive. The two archives were compared file by file (9,237 files): contents are identical except (a) 434 validation-log files whose names differ only by `:`→`_`, (b) the regenerated manifest and (c) an added `WINDOWS_EXTRACTION_NOTE.txt`. The hash-matching original was used as the foundation; no other archive was mixed in. Scan: no `.env`, keys, `node_modules` or `dist`; regex hits for "PRIVATE KEY" are validator source patterns, not key material.
Source verification: listing form (`DealerListingForm.tsx`), multipart `createCar`, Settings panel and Team panel confirmed present and tested.
