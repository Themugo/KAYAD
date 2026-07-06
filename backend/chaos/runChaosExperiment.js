// backend/chaos/runChaosExperiment.js
// Script to run chaos experiments

import { simulateDatabaseOutage, validateDatabaseResilience } from './databaseOutage.js';
import { simulateCacheOutage, validateCacheResilience } from './cacheOutage.js';
import { simulateQueueOutage, validateQueueResilience } from './queueOutage.js';
import { simulatePaymentOutage, validatePaymentResilience } from './paymentOutage.js';
import { simulateNotificationOutage, validateNotificationResilience } from './notificationOutage.js';
import { logInfo, logError } from '../utils/logger.js';

const experiments = {
  database: {
    simulate: simulateDatabaseOutage,
    validate: validateDatabaseResilience,
  },
  cache: {
    simulate: simulateCacheOutage,
    validate: validateCacheResilience,
  },
  queue: {
    simulate: simulateQueueOutage,
    validate: validateQueueResilience,
  },
  payment: {
    simulate: simulatePaymentOutage,
    validate: validatePaymentResilience,
  },
  notification: {
    simulate: simulateNotificationOutage,
    validate: validateNotificationResilience,
  },
};

export async function runChaosExperiment(type, options = {}) {
  logInfo(`Running chaos experiment: ${type}`, options);

  const experiment = experiments[type];
  if (!experiment) {
    throw new Error(`Unknown chaos experiment type: ${type}`);
  }

  try {
    // Run simulation
    const simulationResult = await experiment.simulate(options);
    logInfo(`Chaos simulation completed: ${type}`, simulationResult);

    // Validate resilience
    const validationResults = await experiment.validate();
    logInfo(`Resilience validation completed: ${type}`, validationResults);

    return {
      type,
      simulation: simulationResult,
      validation: validationResults,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logError(`Chaos experiment failed: ${type}`, { error: error.message });
    throw error;
  }
}

export async function runAllChaosExperiments(options = {}) {
  logInfo('Running all chaos experiments');

  const results = {};

  for (const [type, experiment] of Object.entries(experiments)) {
    try {
      results[type] = await runChaosExperiment(type, options);
    } catch (error) {
      results[type] = {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  logInfo('All chaos experiments completed', results);
  return results;
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const type = args[0];
  const duration = parseInt(args[1]) || 30000;
  const severity = args[2] || 'partial';

  if (type === 'all') {
    runAllChaosExperiments({ duration, severity })
      .then((results) => {
        console.log(JSON.stringify(results, null, 2));
        process.exit(0);
      })
      .catch((error) => {
        console.error('Chaos experiments failed:', error);
        process.exit(1);
      });
  } else {
    runChaosExperiment(type, { duration, severity })
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      })
      .catch((error) => {
        console.error('Chaos experiment failed:', error);
        process.exit(1);
      });
  }
}
