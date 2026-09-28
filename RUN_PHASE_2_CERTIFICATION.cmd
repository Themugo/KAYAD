@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo KAYAD PHASE 2 - BUILD / TEST / CERTIFICATION
 echo ============================================================
node -v
if errorlevel 1 goto FAIL

node -e "const [a,b,c]=process.versions.node.split('.').map(Number); if(a<22 || (a===22 && (b<22 || (b===22 && c<2)))) process.exit(1)"
if errorlevel 1 (
  echo ERROR: Node 22.22.2 or newer is required.
  goto FAIL
)

call npm ci
if errorlevel 1 goto FAIL
call npm run typecheck
if errorlevel 1 goto FAIL
call npm test
if errorlevel 1 goto FAIL
call npm run build
if errorlevel 1 goto FAIL

cd /d "%~dp0backend"
call npm ci
if errorlevel 1 goto FAIL
call npm audit --audit-level=high
if errorlevel 1 goto FAIL
call npm test
if errorlevel 1 goto FAIL
cd /d "%~dp0"

call npm run validate:canonical-architecture
if errorlevel 1 goto FAIL
call npm run validate:deployment-readiness
if errorlevel 1 goto FAIL
call npm run validate:backend-runtime-contracts
if errorlevel 1 goto FAIL
call npm run validate:production-backend
if errorlevel 1 goto FAIL
call npm run validate:runtime-integrity
if errorlevel 1 goto FAIL
call npm run validate:communications
if errorlevel 1 goto FAIL
call npm run validate:frontend-runtime-contracts
if errorlevel 1 goto FAIL
call npm run validate:dependency-security
if errorlevel 1 goto FAIL
call npm run validate:supabase-migrations
if errorlevel 1 goto FAIL
call npm run validate:transaction-integrity
if errorlevel 1 goto FAIL
call npm run validate:inspection-marketplace
if errorlevel 1 goto FAIL
call npm run validate:dispute-integrity
if errorlevel 1 goto FAIL
call npm run validate:marketplace-core
if errorlevel 1 goto FAIL
call npm run validate:code-splitting
if errorlevel 1 goto FAIL
call npm run validate:auction-transport-convergence
if errorlevel 1 goto FAIL
call npm run validate:startup-convergence
if errorlevel 1 goto FAIL
call npm run validate:wave2-invariants
if errorlevel 1 goto FAIL
call npm run validate:wave3-convergence
if errorlevel 1 goto FAIL
call npm run validate:v14:production-activation
if errorlevel 1 goto FAIL
call npm run validate:v14:runtime-preflight
if errorlevel 1 goto FAIL
call npm run validate:v14:release-candidate
if errorlevel 1 goto FAIL

echo.
echo PHASE 2 BUILD / TEST / CERTIFICATION PASSED.
exit /b 0

:FAIL
echo.
echo PHASE 2 CERTIFICATION FAILED.
exit /b 1
