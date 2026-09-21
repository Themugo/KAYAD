# KAYAD V14.3 — Controlled Certification Gate

## Purpose

V14.3 is the controlled certification layer between static/domain correctness and real production activation. It reuses the canonical validators and API/provider certification harnesses already present in KAYAD.

No parallel domain implementations are introduced.

## Included

- Consolidated `scripts/validate-v14-next-phase.mjs` gate.
- `npm run validate:v14:next-phase` command.
- Existing production activation, finance, subscription, inspection/chat/realtime and admin control-plane validators executed as the authoritative preflight set.
- Existing authenticated live API certification harness retained as the production API gate.
- Existing Resend/Africa's Talking/Twilio provider certification retained as the provider gate.

## Safety boundary

The consolidated gate never fabricates production records and never treats local mocks as live certification.

If live API credentials are absent, the live API gate is reported as **BLOCKED**.
If provider credentials/recipients are absent, provider certification is reported as **BLOCKED**.
Static/domain gates can still pass independently.

## Current certification truth

The source-level V14 activation, finance, subscription, inspection/chat/realtime and admin control-plane gates pass in the available environment. Live API and provider certification require real deployment credentials and recipients and therefore must be executed in the appropriate certification environment.

The available Linux runtime is Node 22.16.0 while the project contract requires Node >=22.22.2. Do not lower the engine requirement to make an older runtime appear certified.

## Next production action

Run `npm run validate:v14:next-phase` on the certified Node 22.22.2 environment with the real KAYAD certification account and provider credentials. Only after those gates pass should controlled state-changing E2E be enabled.
