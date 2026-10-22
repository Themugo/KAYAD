# Phase 3 Root Clutter Analysis

## Observed root
- Immediate root files: **439**
- Immediate root directories: **23**
- Total immediate root items reviewed: **462**

The root mixes ecosystem configuration, operational scripts, source/subsystem directories, and phase/stage/evidence-looking artifacts. This affects discoverability and handover, but names alone do not prove that a file is safe to move.

## Root disposition counts

- `UNRESOLVED`: 46
- `KEEP_AT_ROOT`: 44
- `REQUIRES_REFERENCE_INVESTIGATION`: 226
- `MOVE_CANDIDATE`: 146

## Safety interpretation
- Preserve package manifests, lockfiles, build/test configuration, deployment configuration, environment templates, and runtime entry points until an authorized change proves a move is necessary and safe.
- Do not relocate a top-level subsystem directory wholesale.
- Treat historical-looking reports and `APPLY_*` scripts as review candidates, not confirmed obsolete artifacts.
- Do not consolidate files solely because hashes match.
- Phase 3 made no file moves.
