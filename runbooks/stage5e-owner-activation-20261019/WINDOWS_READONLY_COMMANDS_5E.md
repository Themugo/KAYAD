# Windows working-tree evidence — read-only commands (cmd.exe)

None of these modifies files, the index or the working tree. `git fetch` only updates remote-tracking refs; if you prefer, skip it and use `git ls-remote`.

```cmd
cd /d C:\Users\hp\Desktop\kayad-fresh
git status --short --branch
git rev-parse HEAD
git log --oneline -3
git ls-remote origin refs/heads/main
git stash list
git branch -vv
git ls-files -o --exclude-standard
git diff --stat
git diff --cached --stat
dir /b backend\.env 2>nul
dir /b backend\uploads 2>nul | find /c /v ""
type backend\data\uploads.json
```
Paste the output (do **not** paste the contents of any `.env`; the `dir /b backend\.env` line only reveals whether the file exists). Expected if everything is as reported: `HEAD` = `552aa5a5…`, `main` = `origin/main`, no stash, empty `git diff`, and `uploads.json` = `[]`.
