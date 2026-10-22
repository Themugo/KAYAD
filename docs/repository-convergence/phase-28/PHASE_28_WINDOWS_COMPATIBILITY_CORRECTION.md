# Phase 28 Windows Filename Compatibility Correction

## Finding

The original Phase 28 ZIP passed ZIP integrity validation but contained 29 historical evidence filenames with colon characters. Windows does not allow colons in ordinary filenames, which can cause extraction/copy failures.

## Correction

For this Windows-compatible repack only, each colon in an archive path was replaced with a hyphen. The file contents were copied byte-for-byte. No application source, configuration, business logic, database, credentials, or runtime settings were edited. Original archive remains unchanged. See `PHASE_28_WINDOWS_FILENAME_COMPATIBILITY_MAP.csv` for every mapping.

## Scope and limits

- This is a packaging/path compatibility correction, not application certification.
- Text inside historical files was preserved; references in historical text may retain original names as provenance.
- The current-state manifest and full path inventory were regenerated to describe the repacked paths.
- The resulting archive was checked for Windows-invalid filename characters, case-insensitive collisions, reserved device names, trailing spaces/dots, path length risk, and ZIP integrity.
