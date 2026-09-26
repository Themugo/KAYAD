# KAYAD Inventory UI — Certification Alignment

Date: 2026-09-26

## Purpose

Align the inventory regression tests with the current premium full-width inventory implementation without changing product behavior.

## Corrections

- Inventory heading assertions now target the semantic heading element, so the vehicle-count badge is included in the assertion.
- Sort assertions now verify the real accessible `<select>` by role and its `newest` value rather than relying on exact visible-option capitalization.
- Escrow Live Mode assertions now verify the state on the actual toggle control, avoiding a global text lookup.

## Scope

No vehicle data model, API contract, filtering behavior, pagination, escrow rules, payment behavior, or new product feature was introduced or changed.
