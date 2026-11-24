REM Windows CMD - run in your repository folder. Claude did NOT commit or push.
git branch --show-current
git status
git diff --stat
git diff -- src backend ci scripts public docs
npx tsc --noEmit -p .
npx vitest run
npm run build
cd backend && node --max-old-space-size=3072 --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit --maxWorkers=2 && cd ..
git add src backend ci scripts public docs reports
git status
git commit -m "Admin console: automotive command-centre hero, shell polish, page audit, journeys" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01EjE5Xyjb3pT2FDebvziRkS"
git push origin HEAD
