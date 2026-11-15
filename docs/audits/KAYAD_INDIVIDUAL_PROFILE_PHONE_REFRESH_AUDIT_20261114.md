# Individual account profile — phone verification refresh

Date: 2026-11-14

## Finding
The individual account profile mounts `PhoneVerification` once. That component fetches the signed-in account's phone verification status only on mount. When a member adds or changes their phone number in the same profile session, the account context updates but the verification component retains its earlier state. A profile that initially had no phone could therefore continue showing the no-phone message until a full page reload, preventing the member from starting verification immediately.

## Repair
The profile now keys `PhoneVerification` to the current account phone value. When the saved phone changes, React remounts the verification component and it fetches the authoritative status from `/api/v1/auth/phone-status` again. This does not mark a number verified locally and does not change backend authorization or OTP rules.

## Validation
- Added `validate:individual-profile-phone-refresh` source-contract validator.
- This validator checks that the component remount is tied to the current phone, that status is reloaded on mount, and that the canonical status API remains in use.
- Browser/device testing and live SMS delivery were not performed in this archive pass.
