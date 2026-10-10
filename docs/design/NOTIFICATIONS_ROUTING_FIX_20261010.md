# KAYAD Notifications Routing Fix

**Date:** 10 October 2026
**Foundation:** `KAYAD-PROJECT-WIDE-SLATE-TEAL-ONE-SWEEP-FIXES-20261010.zip`

## Finding

The notification UI linked to `/notifications`, but the application's `AuthRouteSurface` did not define that route. Separately, the full-activity action in `NotificationPanel` navigated to `/dashboard`, which is protected and intentionally redirects unauthenticated sessions to sign-in. This made the notification entry point inconsistent and could appear to send a user from notifications to login.

## Changes

- Added a canonical `/notifications` route in `AuthRouteSurface`, protected by the existing `RequireAuth` guard.
- Added a full-page notifications view using the existing `NotificationContext` and its authoritative notification records.
- The page supports opening a notification's existing internal link, marking one/all as read, and deleting a notification using existing context methods.
- Changed the notification panel's â€œView All Activity in Dashboardâ€ action to open `/notifications` and relabeled it â€œView All Notifications.â€
- Existing notification links in the common notification centers and dealer layout now resolve to the canonical route.

## Security and scope

- Notification data remains account-specific and requires the existing authenticated session. The fix does not bypass `RequireAuth` or backend authorization.
- No API contracts, notification persistence, payment/auction behavior, role rules, or database migrations were changed.
- This patch was source-reviewed and structurally validated in the packaging environment. Full Vitest, TypeScript, build, and browser execution must be run in the project's Node 22.22.2+ Windows environment before deployment.
