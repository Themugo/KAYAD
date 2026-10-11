#!/usr/bin/env python3
"""Classify route-schema crawl 500s by root cause (docs/audits/21). Usage: classify-route-crawl.py before.json after.json out.json
Deterministic rules from the recorded database errors and server-log messages; production-presence of a missing table comes
from the read-only production catalog check of 2026-10-11 (docs/audits/evidence/hosted-readonly-20261011)."""
import json, re, sys, collections
before = {x["route"]: x for x in json.load(open(sys.argv[1]))["results"]}
after = {x["route"]: x for x in json.load(open(sys.argv[2]))["results"]}
PROD_ONLY = set("auction_integrity_flags auction_risk_profiles bid_logs contacts conversion_funnels dealer_analytics dealer_health_scores escrow_anomalies escrow_risk_scores job_failures market_data marketplace_health ntsa_verification_requests sms_bidders transactions".split())

def classify(x):
    tabs = set()
    for e in x["dbErrors"]:
        m = re.search(r'relation "(?:public\.)?(\w+)" does not exist', e["message"])
        if m: tabs.add(m.group(1))
    cols = sorted({re.sub(r'column "?([\w.]+)"? does not exist.*', r"\1", e["message"]) for e in x["dbErrors"] if e["code"] == "42703"})
    log = " ".join(x.get("serverLog") or []) + " " + str(x.get("message") or "")
    if re.search(r"is not defined|is not a function", log) and not tabs:
        m = re.search(r"(\w+(?:\.\w+)?) is not (?:defined|a function)", log)
        return "D", f"incomplete Mongo->Supabase port: {m.group(0) if m else 'undefined model/static'}"
    if tabs:
        missing_nowhere = sorted(tabs - PROD_ONLY)
        if not missing_nowhere: return "A", "table(s) only in production (DDL in hosted-only migrations): " + ", ".join(sorted(tabs))
        return "B", "table(s) in no migration and not in production: " + ", ".join(missing_nowhere)
    if cols: return "C", "column(s) absent in repository and production: " + ", ".join(cols)
    if x["status"] == 503: return "E", "dependency unavailable"
    return "F", "other: " + (x.get("message") or "")[:80]

LABEL = {"A": "Missing table — exists only in production (export hosted DDL)", "B": "Missing table — exists nowhere (unimplemented subsystem)",
         "C": "Missing column — absent in repository and production (contract unresolved)", "D": "Genuine application defect — incomplete Mongo→Supabase port",
         "E": "Dependency unavailable", "F": "Other"}
remaining = []; fixed = []; groups = collections.Counter()
for r, x in after.items():
    b = before[r]
    if x["status"] >= 500:
        g, why = classify(x); groups[g] += 1; remaining.append({"route": r, "status": x["status"], "group": g, "cause": why})
    if b["status"] >= 500 and x["status"] < 500:
        fixed.append({"route": r, "before": b["status"], "after": x["status"], "beforeCause": (b.get("message") or "")[:100]})
newly = [r for r, x in after.items() if x["status"] >= 500 and before[r]["status"] < 500]
out = {"before": collections.Counter(str(x["status"]) for x in before.values()), "after": collections.Counter(str(x["status"]) for x in after.values()),
       "remaining500ByGroup": {f"{g} {LABEL[g]}": n for g, n in sorted(groups.items())}, "newFailures": newly, "fixed": fixed, "remaining": remaining}
json.dump(out, open(sys.argv[3], "w"), indent=1)
print(json.dumps({k: out[k] for k in ("before", "after", "remaining500ByGroup", "newFailures")}, indent=1)); print("fixed:", len(fixed))
