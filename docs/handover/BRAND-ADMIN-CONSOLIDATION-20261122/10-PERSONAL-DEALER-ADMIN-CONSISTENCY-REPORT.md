# 10 - Personal / Dealer / Admin / Staff consistency report

Evidence: state probes (doc 03), axe and keyboard probes (doc 12), screenshots (screenshots/), staff role evidence (doc 11). Statuses: CONSISTENT / DIFFERS (intentional) / INCONSISTENT (defect or decision).

| Dimension | Personal | Dealer | Admin / staff | Verdict |
|---|---|---|---|---|
| Brand name | KAYARD KE (BrandMark) | KAYARD KE | KAYARD KE; dark logo variant added for navy surfaces | CONSISTENT (dark logo needs owner approval) |
| Navigation model | State-based sidebar buttons; mobile `<details>` drawer | State-based sidebar; mobile drawer | Route-based sidebar with 7 groups; collapsible | DIFFERS (known; personal/dealer have no URL per section) |
| Skip link | Present, first stop | Present, first stop | Added this phase, first stop | CONSISTENT after fix |
| Section error + retry | All read sections: alert + Retry that makes a real request | Same for all 15 sections (Settings verification card fixed) | Reports fixed; other admin pages vary; not exhaustively probed | Personal/dealer CONSISTENT; admin PARTIAL |
| 403 handling | Permission message on 5 sections; generic on others | Generic failure for all (A-09) | Route guards and server denial (doc 11) | INCONSISTENT (decision A-09) |
| Empty states | Honest empty copy; anti-false-empty wording on error | Honest empty copy | Honest "No ... returned" panels | CONSISTENT |
| Partial data | Activity shows per-source "Unavailable" | Not systematic | Panels flag the loaded sample | DIFFERS |
| Focus indicator | Global dark-teal ring + halo | Same | Admin command-centre has its own rules (teal-200 on navy, brand on light) | CONSISTENT in intent; not unified in code |
| Contrast | 0 axe violations (26 views) | 0 (30 views) | Admin axe clean in earlier segment; contrast fixes applied | CONSISTENT (axe-level only) |
| Responsive (9 widths) | no overflow | no overflow | no overflow | CONSISTENT |
| Dark mode | Not supported | Not supported | Not supported | CONSISTENT (absent; proposal doc 14) |
| Listing numbering | per owner counter, shown as #n | same table | admin sees ids | see D-17 |
| Banking | no personal payout details (D-19) | `/api/dealer/settlement` | none | INCONSISTENT by design pending D-18/D-19 |
| Status wording | personal labels mapped | dealer status labels mapped (Overview fixed) | Recent Vehicle Submissions shows raw lowercase | INCONSISTENT (copy, open) |

## Staff workspace vs shared design system
Staff navigation uses the same shell and BrandMark as the rest of the console and was re-captured per role (20 screenshots, doc 11). No staff role was given added authority: server enforcement was tested by direct API calls (api-permission-matrix.json) and the UI mismatches found are over-listing (nav shows items the API denies), not under-protection.
