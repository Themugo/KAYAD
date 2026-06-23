// backend/chaos/generateScorecard.js
// Generate resilience scorecard from chaos experiment results

import { runAllChaosExperiments } from './runChaosExperiment.js';
import { logInfo, logError } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

export async function generateResilienceScorecard() {
  logInfo('Generating resilience scorecard');

  try {
    // Run all chaos experiments
    const results = await runAllChaosExperiments({
      duration: 30000,
      severity: 'partial',
    });

    // Calculate resilience scores
    const scorecard = {
      database: {
        retry: results.database?.validation?.retry || false,
        circuitBreaker: results.database?.validation?.circuitBreaker || false,
        failover: results.database?.validation?.failover || false,
        overall: results.database?.validation?.overall || false,
      },
      cache: {
        retry: results.cache?.validation?.retry || false,
        circuitBreaker: results.cache?.validation?.circuitBreaker || false,
        fallback: results.cache?.validation?.fallback || false,
        overall: results.cache?.validation?.overall || false,
      },
      queue: {
        retry: results.queue?.validation?.retry || false,
        circuitBreaker: results.queue?.validation?.circuitBreaker || false,
        deadLetterQueue: results.queue?.validation?.deadLetterQueue || false,
        overall: results.queue?.validation?.overall || false,
      },
      payment: {
        retry: results.payment?.validation?.retry || false,
        circuitBreaker: results.payment?.validation?.circuitBreaker || false,
        fallback: results.payment?.validation?.fallback || false,
        escrow: results.payment?.validation?.escrow || false,
        overall: results.payment?.validation?.overall || false,
      },
      notification: {
        retry: results.notification?.validation?.retry || false,
        circuitBreaker: results.notification?.validation?.circuitBreaker || false,
        fallback: results.notification?.validation?.fallback || false,
        queue: results.notification?.validation?.queue || false,
        overall: results.notification?.validation?.overall || false,
      },
      overall: {
        score: 0,
        grade: 'F',
      },
    };

    // Calculate overall score
    let totalChecks = 0;
    let passedChecks = 0;

    for (const component of Object.values(scorecard)) {
      if (component.overall !== undefined) {
        totalChecks++;
        if (component.overall) passedChecks++;
      }
    }

    scorecard.overall.score = Math.round((passedChecks / totalChecks) * 100);

    // Assign grade
    if (scorecard.overall.score >= 90) {
      scorecard.overall.grade = 'A';
    } else if (scorecard.overall.score >= 80) {
      scorecard.overall.grade = 'B';
    } else if (scorecard.overall.score >= 70) {
      scorecard.overall.grade = 'C';
    } else if (scorecard.overall.score >= 60) {
      scorecard.overall.grade = 'D';
    } else {
      scorecard.overall.grade = 'F';
    }

    // Write scorecard to file
    const scorecardPath = path.join(process.cwd(), 'resilience-scorecard.json');
    fs.writeFileSync(scorecardPath, JSON.stringify(scorecard, null, 2));

    logInfo('Resilience scorecard generated', scorecard);

    return scorecard;
  } catch (error) {
    logError('Failed to generate resilience scorecard', { error: error.message });
    throw error;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  generateResilienceScorecard()
    .then(() => {
      console.log('Resilience scorecard generated successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to generate resilience scorecard:', error);
      process.exit(1);
    });
}
