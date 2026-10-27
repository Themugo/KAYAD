# Payment callback and idempotency results (local deterministic, no live Daraja)
Real PostgreSQL 16 + PostgREST, backend started with local throwaway secrets. 73/73 passed on the final code (before 14.9: 45/73, 28 failures).
- H1 five concurrent identical success callbacks -> one success, one receipt, no duplicate events.
- H2 later replay with a different receipt cannot overwrite the receipt.
- H3 failure after success cannot downgrade (reordered delivery).
- H4 cancelled callback -> failed, no receipt; success after recorded failure ignored (documented).
- H5 amount mismatch -> failed, no success receipt.
- H6 unknown checkout id: no change, acknowledged.
- H7 non-JSON/invalid structure/old timestamp rejected, payment stays pending.
- H8 concurrent success+failure -> exactly one terminal state, no 5xx.
- H9 pending/failed payments do not fulfil the sale; success settles once and records the sale once.
- I1-I3 history ownership/visibility. G6 and log scan: no full customer phone in backend log.
Limits: this is sandbox/fixture evidence. It is NOT live payment certification.
