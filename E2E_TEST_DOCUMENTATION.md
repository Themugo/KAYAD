# KAYAD E2E Test Documentation

**Phase:** QA Automation Architecture  
**Date:** June 16, 2026  
**Architect:** QA Automation Architect  
**Scope:** Test Execution and CI/CD Integration

---

## Table of Contents

1. [Test Execution](#test-execution)
2. [Environment Setup](#environment-setup)
3. [Test Data Management](#test-data-management)
4. [CI/CD Integration](#cicd-integration)
5. [Reporting and Results](#reporting-and-results)
6. [Troubleshooting](#troubleshooting)

---

## Test Execution

### Local Development

**Prerequisites:**
- Node.js 18+ installed
- npm or yarn package manager
- Backend server running on port 3000
- MongoDB and Redis services running

**Installation:**
```bash
cd e2e
npm install
```

**Run all tests:**
```bash
npx playwright test
```

**Run specific test suite:**
```bash
npx playwright test dealer-onboarding
npx playwright test auction-bidding
npx playwright test mpesa-payment
```

**Run tests in headed mode (watch browser):**
```bash
npx playwright test --headed
```

**Run tests in debug mode:**
```bash
npx playwright test --debug
```

**Run tests with specific browser:**
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

**Run tests on mobile viewport:**
```bash
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

### Test Categories

**Happy Path Tests:**
- Verify complete workflow execution
- No errors or failures expected
- Primary validation of business logic

**Edge Case Tests:**
- Boundary conditions
- Unusual but valid inputs
- Maximum/minimum values
- Special characters and formats

**Failure Case Tests:**
- Error handling validation
- Network timeouts
- Service failures
- Database errors
- API failures

### Test Organization

```
e2e/
├── playwright.config.ts          # Playwright configuration
├── tests/
│   ├── helpers/
│   │   ├── auth.helper.ts        # Authentication helpers
│   │   └── api.helper.ts         # API interaction helpers
│   ├── dealer-onboarding/
│   │   └── dealer-onboarding.spec.ts
│   ├── vehicle-listing/
│   │   └── vehicle-listing.spec.ts
│   ├── buyer-inquiry/
│   │   └── buyer-inquiry.spec.ts
│   ├── chat/
│   │   └── chat.spec.ts
│   ├── auction-bidding/
│   │   └── auction-bidding.spec.ts
│   ├── escrow-creation/
│   │   └── escrow-creation.spec.ts
│   ├── mpesa-payment/
│   │   └── mpesa-payment.spec.ts
│   ├── escrow-release/
│   │   └── escrow-release.spec.ts
│   ├── reviews/
│   │   └── reviews.spec.ts
│   └── disputes/
│       └── disputes.spec.ts
├── test-results/                 # Test execution results
└── test-report/                 # HTML test reports
```

---

## Environment Setup

### Environment Variables

Create a `.env` file in the `e2e` directory:

```bash
# Base URL for testing
BASE_URL=http://localhost:3000

# Test User Credentials
E2E_BUYER_EMAIL=buyer@kayad.test
E2E_BUYER_PASSWORD=TestPassword123!

E2E_DEALER_EMAIL=dealer@kayad.test
E2E_DEALER_PASSWORD=TestPassword123!

E2E_ADMIN_EMAIL=admin@kayad.test
E2E_ADMIN_PASSWORD=TestPassword123!

# API Configuration
API_BASE_URL=http://localhost:3000/api

# External Services (mock in development)
MPESA_API_URL=https://sandbox.safaricom.co.ke
NTSA_API_URL=https://test.ntsa.go.ke

# CI/CD Configuration
CI=false
NODE_ENV=test
```

### Docker Setup (Optional)

**Docker Compose for test environment:**
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: test
      MONGO_INITDB_ROOT_PASSWORD: test

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    depends_on:
      - mongodb
      - redis
    environment:
      NODE_ENV: test
      MONGODB_URI: mongodb://test:test@mongodb:27017/kayad-test
      REDIS_URL: redis://redis:6379
```

**Run with Docker:**
```bash
docker-compose up -d
npx playwright test
```

---

## Test Data Management

### Test Data Fixtures

**Location:** `e2e/tests/fixtures/`

**Required fixtures:**
- `car1.jpg` - Sample vehicle image
- `car2.jpg` - Sample vehicle image
- `car3.jpg` - Sample vehicle image
- `document.pdf` - Sample business document
- `evidence1.jpg` - Sample dispute evidence
- `evidence2.jpg` - Sample dispute evidence
- `evidence3.jpg` - Sample dispute evidence
- `vehicles.csv` - Sample bulk upload file

### Database Seeding

**Seed script:** `e2e/scripts/seed-test-data.js`

```javascript
import mongoose from 'mongoose';
import { User, Vehicle, Auction, Escrow } from '../backend/models';

async function seedTestData() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Create test users
  const buyer = await User.create({
    email: process.env.E2E_BUYER_EMAIL,
    password: process.env.E2E_BUYER_PASSWORD,
    role: 'buyer',
    verified: true,
  });

  const dealer = await User.create({
    email: process.env.E2E_DEALER_EMAIL,
    password: process.env.E2E_DEALER_PASSWORD,
    role: 'dealer',
    verified: true,
  });

  const admin = await User.create({
    email: process.env.E2E_ADMIN_EMAIL,
    password: process.env.E2E_ADMIN_PASSWORD,
    role: 'admin',
    verified: true,
  });

  console.log('Test data seeded successfully');
  process.exit(0);
}

seedTestData().catch(console.error);
```

**Run seed script:**
```bash
node e2e/scripts/seed-test-data.js
```

### Data Cleanup

**Cleanup script:** `e2e/scripts/cleanup-test-data.js`

```javascript
import mongoose from 'mongoose';
import { User, Vehicle, Auction, Escrow, Dispute } from '../backend/models';

async function cleanupTestData() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Delete test data
  await User.deleteMany({ email: /@kayad\.test$/ });
  await Vehicle.deleteMany({});
  await Auction.deleteMany({});
  await Escrow.deleteMany({});
  await Dispute.deleteMany({});

  console.log('Test data cleaned successfully');
  process.exit(0);
}

cleanupTestData().catch(console.error);
```

**Run cleanup script:**
```bash
node e2e/scripts/cleanup-test-data.js
```

---

## CI/CD Integration

### GitHub Actions

**Workflow file:** `.github/workflows/e2e-tests.yml`

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM UTC

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6.0
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.runCommand({ping: 1})'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install backend dependencies
        run: |
          cd backend
          npm ci

      - name: Install E2E dependencies
        run: |
          cd e2e
          npm ci

      - name: Seed test data
        run: |
          cd backend
          npm run seed:test
        env:
          MONGODB_URI: mongodb://localhost:27017/kayad-test
          NODE_ENV: test

      - name: Start backend server
        run: |
          cd backend
          npm run dev &
          sleep 10
        env:
          MONGODB_URI: mongodb://localhost:27017/kayad-test
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test
          PORT: 3000

      - name: Run E2E tests
        run: |
          cd e2e
          npx playwright test
        env:
          BASE_URL: http://localhost:3000
          CI: true

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: e2e/playwright-report/
          retention-days: 30

      - name: Upload test screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-screenshots
          path: e2e/test-results/screenshots/
          retention-days: 7

      - name: Upload test videos
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-videos
          path: e2e/test-results/videos/
          retention-days: 7

      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('e2e/test-results/results.json', 'utf8'));
            const passed = report.stats.expected - report.stats.failed;
            const failed = report.stats.failed;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## E2E Test Results\n\n✅ Passed: ${passed}\n❌ Failed: ${failed}\n\n[View Full Report](https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})`
            });
```

### Jenkins Pipeline

**Jenkinsfile:**

```groovy
pipeline {
    agent any
    
    environment {
        NODE_ENV = 'test'
        MONGODB_URI = 'mongodb://localhost:27017/kayad-test'
        REDIS_URL = 'redis://localhost:6379'
        BASE_URL = 'http://localhost:3000'
    }
    
    stages {
        stage('Setup') {
            steps {
                sh 'cd backend && npm ci'
                sh 'cd e2e && npm ci'
            }
        }
        
        stage('Seed Data') {
            steps {
                sh 'cd backend && npm run seed:test'
            }
        }
        
        stage('Start Services') {
            steps {
                sh 'docker-compose up -d mongodb redis'
                sh 'cd backend && npm run dev &'
                sleep 10
            }
        }
        
        stage('Run E2E Tests') {
            steps {
                sh 'cd e2e && npx playwright test'
            }
            post {
                always {
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'e2e/playwright-report',
                        reportFiles: 'index.html',
                        reportName: 'E2E Test Report'
                    ])
                }
            }
        }
        
        stage('Cleanup') {
            steps {
                sh 'cd backend && npm run cleanup:test'
                sh 'docker-compose down'
            }
        }
    }
    
    post {
        always {
            archiveArtifacts artifacts: 'e2e/test-results/**/*', fingerprint: true
            junit 'e2e/test-results/junit.xml'
        }
        failure {
            emailext (
                subject: "E2E Tests Failed - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "Check the Jenkins console output for details.",
                to: "qa-team@kayad.com"
            )
        }
    }
}
```

### GitLab CI

**.gitlab-ci.yml:**

```yaml
stages:
  - setup
  - test
  - report

variables:
  NODE_ENV: test
  MONGODB_URI: mongodb://mongodb:27017/kayad-test
  REDIS_URL: redis://redis:6379
  BASE_URL: http://localhost:3000

setup:
  stage: setup
  services:
    - mongo:6.0
    - redis:7-alpine
  script:
    - cd backend && npm ci
    - cd e2e && npm ci
    - cd backend && npm run seed:test

e2e-tests:
  stage: test
  services:
    - mongo:6.0
    - redis:7-alpine
  script:
    - cd backend && npm run dev &
    - sleep 10
    - cd e2e && npx playwright test
  artifacts:
    when: always
    paths:
      - e2e/playwright-report/
      - e2e/test-results/
    reports:
      junit: e2e/test-results/junit.xml

publish-report:
  stage: report
  dependencies:
    - e2e-tests
  script:
    - mv e2e/playwright-report public/
  artifacts:
    paths:
      - public
  only:
    - main
```

---

## Reporting and Results

### HTML Report

**Generate HTML report:**
```bash
npx playwright test --reporter=html
```

**View report:**
```bash
npx playwright show-report
```

**Report location:** `e2e/playwright-report/index.html`

### JUnit Report

**Generate JUnit report:**
```bash
npx playwright test --reporter=junit
```

**Report location:** `e2e/test-results/junit.xml`

### JSON Report

**Generate JSON report:**
```bash
npx playwright test --reporter=json
```

**Report location:** `e2e/test-results/results.json`

### Test Metrics

**Key metrics tracked:**
- Total tests executed
- Passed/Failed/Skipped
- Execution time per test
- Flaky test detection
- Coverage by workflow
- Browser compatibility matrix

**Metrics dashboard integration:**
- GitHub Actions summary
- Jenkins test trends
- GitLab test analytics
- Custom Grafana dashboard

---

## Troubleshooting

### Common Issues

**Issue: Tests timeout**
- Solution: Increase timeout in `playwright.config.ts`
- Check: Backend server is running and responsive

**Issue: Authentication failures**
- Solution: Verify test user credentials in `.env`
- Check: User seeding script ran successfully

**Issue: Database connection errors**
- Solution: Verify MongoDB is running
- Check: Connection string in environment variables

**Issue: Redis connection errors**
- Solution: Verify Redis is running
- Check: Redis URL in environment variables

**Issue: Flaky tests**
- Solution: Add retries in `playwright.config.ts`
- Check: Test isolation and cleanup

**Issue: WebSocket connection failures**
- Solution: Verify Socket.IO server is running
- Check: WebSocket configuration

### Debug Mode

**Run specific test in debug mode:**
```bash
npx playwright test --debug dealer-onboarding.spec.ts
```

**Run with inspector:**
```bash
npx playwright test --inspector
```

**Trace viewer:**
```bash
npx playwright test --trace on
npx playwright show-trace trace.zip
```

### Test Isolation

**Each test should:**
- Use unique test data
- Clean up after execution
- Not depend on other tests
- Run independently

**Isolation best practices:**
- Use unique identifiers (timestamps, random strings)
- Clean up database after each test
- Reset application state
- Use test-specific environment variables

---

## Best Practices

### Test Writing

**DO:**
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests focused and single-purpose
- Use page object pattern for complex flows
- Add comments for complex logic
- Use data-driven tests for similar scenarios

**DON'T:**
- Hardcode values that should be configurable
- Mix concerns in single test
- Skip tests without good reason
- Use sleep() for timing (use waitFor instead)
- Test implementation details
- Create brittle selectors

### Maintenance

**Regular maintenance tasks:**
- Update test data fixtures
- Review and update flaky tests
- Refactor duplicated test code
- Update test documentation
- Review test coverage metrics
- Optimize slow tests

### Performance

**Optimization tips:**
- Run tests in parallel when possible
- Use test fixtures for common setup
- Mock external API calls
- Use efficient selectors (data-testid)
- Avoid unnecessary waits
- Cache test data where appropriate

---

## Next Steps

**Immediate actions:**
1. Set up test environment
2. Install dependencies
3. Configure environment variables
4. Seed test data
5. Run initial test suite
6. Review and fix any failures

**Ongoing improvements:**
1. Add more test scenarios
2. Improve test coverage
3. Optimize test execution time
4. Enhance reporting
5. Integrate with monitoring
6. Add performance tests

---

**Contact:** QA Team  
**Last Updated:** June 16, 2026
