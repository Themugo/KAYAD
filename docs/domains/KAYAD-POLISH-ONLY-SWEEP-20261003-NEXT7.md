# KAYAD Polish-Only Sweep — NEXT7

## Scope

Accessibility and interaction polish only. No new product features or business-domain changes.

## Change

The canonical mobile marketplace Search action now respects `prefers-reduced-motion`: it uses instant scrolling for users who request reduced motion and retains smooth scrolling otherwise.

## Validation

- NEXT7 polish contract: 4/4 PASS
- Existing NEXT6 contracts retained unchanged.

## Certification note

Full `npm ci`, typecheck, build and test certification must be run under the project's required Node `>=22.22.2` environment.
