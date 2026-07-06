---
title: NODE_VERSION_SETUP
owner: @devops-lead
team: devops
last-reviewed: 2026-06-23
review-frequency: monthly
status: active
tags: [deployment]
---
# Node Version Setup Instructions

## Current Issue
The project targets Node.js v20, but the current system is running Node.js v26.1.0, which causes compatibility issues with Jest and some dependencies.

## Solution: Install Node v20 on Windows

### Option 1: Using nvm-windows (Recommended)
1. Download nvm-windows from: https://github.com/coreybutler/nvm-windows/releases
2. Install nvm-windows
3. Run the following commands in PowerShell:
   ```powershell
   nvm install 20.11.0
   nvm use 20.11.0
   ```

### Option 2: Manual Installation
1. Download Node.js v20.11.0 LTS from: https://nodejs.org/dist/v20.11.0/
2. Choose the Windows installer (node-v20.11.0-x64.msi)
3. Run the installer and follow the prompts
4. Restart your terminal/command prompt

### Option 3: Using Chocolatey
```powershell
choco install nodejs-lts -y
```

## Verification
After installation, verify the Node version:
```bash
node --version
# Should output: v20.11.0
```

## Reinstall Dependencies
After switching to Node v20, reinstall dependencies:
```bash
cd backend
npm install
cd ..
npm install
```

## Run Tests
```bash
cd backend
npm test
```

## Notes
- The project's .nvmrc file specifies Node v20
- Jest and other test dependencies are compatible with Node v20
- MongoDB memory server works better with Node v20 on Windows
