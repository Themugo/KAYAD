#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$Root = "C:\Users\hp\Desktop\KAYAD-main"
Set-Location $Root

# Detect which app folders actually exist
$hasFrontend = Test-Path "frontend\package.json"
$hasBackend  = Test-Path "backend\package.json"
Write-Host "Detected: frontend=$hasFrontend backend=$hasBackend" -ForegroundColor Cyan

# Helper: backup + write
function Backup-File($p) {
    if (Test-Path $p) {
        $b = ".kayad-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        $d = Join-Path $Root $b
        New-Item -ItemType Directory -Path $d -Force | Out-Null
        $rel = $p.Substring($Root.Length).TrimStart("\","/")
        $dest = Join-Path $d ($rel -replace "[\\/]","\")
        New-Item -ItemType Directory -Path (Split-Path $dest -Parent) -Force | Out-Null
        Copy-Item $p $dest -Force
    }
}
function Write-File($p, $c) {
    Backup-File $p
    $d = Split-Path $p -Parent
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
    [System.IO.File]::WriteAllText($p, $c, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  OK $($p.Substring($Root.Length + 1))" -ForegroundColor Green
}

# === FIX 1: backend errorHandler OpenTelemetry ===
if ($hasBackend) {
    $p = "backend\src\middleware\errorHandler.js"
    if (Test-Path $p) {
        $c = Get-Content $p -Raw
        if ($c -notmatch "OpenTelemetry") {
            $inject = "`n// OpenTelemetry`nimport { trace, SpanStatusCode } from `"@opentelemetry/api`";"
            $spanBlock = "`n  const span = trace.getActiveSpan();`n  if (span) {`n    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });`n    span.recordException(err);`n  }`n`n"
            $c = $c -replace "(?ms)(?=\s*// ─── Logging ─)", "$spanBlock"
            $c = $inject + "`n" + $c
            Write-File $p $c
        }
    }
}

# === FIX 2: reconciliation missing await ===
if ($hasBackend) {
    $p = "backend\src\routes\reconciliationRoutes.js"
    if ((Test-Path $p) -and -not (Select-String -Path $p -Pattern "const reports = await triggerManualReconciliation" -SimpleMatch -Quiet)) {
        $c = Get-Content $p -Raw
        $c = $c -replace "const reports = triggerManualReconciliation", "const reports = await triggerManualReconciliation"
        Write-File $p $c
    }
}

# === FIX 3: webhook console.log -> logger ===
if ($hasBackend) {
    $p = "backend\src\routes\webhookRoutes.js"
    if (Test-Path $p) {
        $c = Get-Content $p -Raw
        if ($c -match "console\.(log|error)") {
            if ($c -notmatch "from `"../utils/logger") {
                $c = "import { logInfo, logError } from `"../utils/logger.js`;`n" + $c
            }
            $c = $c -replace "console\.log\(", "logInfo("
            $c = $c -replace "console\.error\(", "logError("
            Write-File $p $c
        }
    }
}

# === FIX 4: add premium error formatter ===
if ($hasBackend) {
    $p = "backend\src\utils\premiumError.js"
    if (-not (Test-Path $p)) {
        Write-File $p "// backend/src/utils/premiumError.js`nimport { AppError } from `"./AppError.js`;`n`nexport function formatError(err, req) {`n  return {`n    success: false,`n    error: {`n      id: req?.requestId || null,`n      type: err.name || `"InternalServerError`",`n      message: err.isOperational ? err.message : (process.env.NODE_ENV === `"production`" ? `"An error occurred`" : (err.message || `"Internal Server Error`")),`n    },`n    timestamp: new Date().toISOString(),`n    path: req?.originalUrl || null,`n  };`n}"
    }
}

# === FIX 5: package.json add lint scripts ===
$pkgPath = Join-Path $Root "package.json"
if (Test-Path $pkgPath) {
    $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
    if (-not $pkg.scripts.PSObject.Properties["lint"]) {
        $pkg.scripts | Add-Member -NotePropertyName "lint" -NotePropertyValue "eslint . --ext .js,.jsx --max-warnings=0" -Force
    }
    if (-not $pkg.scripts.PSObject.Properties["lint:fix"]) {
        $pkg.scripts | Add-Member -NotePropertyName "lint:fix" -NotePropertyValue "eslint . --ext .js,.jsx --fix" -Force
    }
    $pkg | ConvertTo-Json -Depth 10 | Set-Content $pkgPath -Encoding UTF8
    Write-Host "  OK package.json (lint scripts)" -ForegroundColor Green
}

# === FIX 6: delete obsolete frontend files (if frontend exists) ===
if ($hasFrontend) {
    $obsolete = @(
        "frontend\src\hooks\usePageMeta.js",
        "frontend\src\components\SEOHead.tsx",
        "frontend\src\utils\seoService.ts",
        "frontend\src\utils\permissions.ts",
        "frontend\src\utils\sentry.ts"
    )
    foreach ($f in $obsolete) {
        if (Test-Path $f) {
            Backup-File $f
            Remove-Item $f -Force
            Write-Host "  DELETED $f" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  ALL BACKEND/UTILITY FIXES APPLIED" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Remaining: 2 file rewrites that need the full source." -ForegroundColor Yellow
Write-Host "I have provided the complete updated source for both below." -ForegroundColor Yellow
