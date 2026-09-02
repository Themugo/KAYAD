# Phase 31 — Enterprise Control Surface Truth Enforcement

## Objective
Remove the last fabricated enterprise control-plane outputs from production-facing API and admin surfaces.

## Changes
- Governance API no longer returns invented policies, risks, compliance scores, releases, decisions, standards, country rules, or partner requirements. Unsupported governance storage now fails closed with `GOVERNANCE_NOT_CONFIGURED`.
- Governance audit reads the canonical `audit_logs` table only.
- Enterprise Command Center no longer reports invented KPIs, activity, alerts, health, operational queues, dealers, auctions, or executive briefings. It fails closed with `COMMAND_CENTER_NOT_CONFIGURED`.
- Executive Intelligence no longer reports fabricated business intelligence, forecasts, benchmarks, reports, or AI insights. It fails closed with `INTELLIGENCE_NOT_CONFIGURED`.
- Enterprise Integration Platform no longer exposes synthetic registries, credentials, sandbox users, gateway telemetry, certification status, or integration activity. It fails closed with `INTEGRATION_NOT_CONFIGURED`.
- Enterprise Control Plane no longer reports fabricated health, security, performance, deployment, disaster-recovery, capacity, incident, or compliance telemetry. It fails closed with `CONTROL_PLANE_NOT_CONFIGURED`.
- Active admin Governance, Command Center, Intelligence, and Integration pages no longer contain hard-coded enterprise records or claims.
- Removed a remaining fabricated intelligence metric from the workflow-orchestration dashboard.

## Truth rule
A production endpoint may return only persisted/observed data from an authoritative source or a real configured external service. If that source does not exist, the endpoint explicitly reports that it is not configured.
