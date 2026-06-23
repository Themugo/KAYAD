// src/hooks/useWorkflowTracking.ts
// Hook for tracking user workflows and detecting abandonment

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackWorkflowStep, trackWorkflowAbandonment } from '../utils/observability';

interface WorkflowTrackingOptions {
  workflowName: string;
  steps: string[];
  timeout?: number; // Timeout in ms to consider workflow abandoned
}

export function useWorkflowTracking({ workflowName, steps, timeout = 30000 }: WorkflowTrackingOptions) {
  const location = useLocation();
  const currentStepRef = useRef<string>(steps[0]);
  const startTimeRef = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Track initial step
    trackWorkflowStep(workflowName, steps[0], {
      timestamp: Date.now(),
    });

    // Set timeout for abandonment detection
    timeoutRef.current = setTimeout(() => {
      trackWorkflowAbandonment(workflowName, currentStepRef.current, {
        duration: Date.now() - startTimeRef.current,
        reason: 'timeout',
      });
    }, timeout);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [workflowName, timeout]);

  useEffect(() => {
    // Detect step changes based on URL
    const currentPath = location.pathname;
    let currentStep = steps[0];

    // Map URL patterns to steps (customize based on your routes)
    if (currentPath.includes('/login')) {
      currentStep = 'login';
    } else if (currentPath.includes('/register')) {
      currentStep = 'register';
    } else if (currentPath.includes('/showroom')) {
      currentStep = 'browse';
    } else if (currentPath.includes('/car/')) {
      currentStep = 'view_car';
    } else if (currentPath.includes('/bid')) {
      currentStep = 'place_bid';
    } else if (currentPath.includes('/payment')) {
      currentStep = 'payment';
    }

    if (currentStep !== currentStepRef.current && steps.includes(currentStep)) {
      currentStepRef.current = currentStep;
      trackWorkflowStep(workflowName, currentStep, {
        timestamp: Date.now(),
        duration: Date.now() - startTimeRef.current,
      });

      // Reset timeout on step change
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        trackWorkflowAbandonment(workflowName, currentStep, {
          duration: Date.now() - startTimeRef.current,
          reason: 'timeout',
        });
      }, timeout);
    }
  }, [location.pathname, workflowName, steps, timeout]);

  const completeWorkflow = (success: boolean, properties?: Record<string, any>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    trackWorkflowStep(workflowName, 'completed', {
      success,
      duration: Date.now() - startTimeRef.current,
      ...properties,
    });
  };

  return { completeWorkflow };
}

/**
 * Hook for tracking specific workflows
 */
export function useCarBrowsingWorkflow() {
  return useWorkflowTracking({
    workflowName: 'car_browsing',
    steps: ['browse', 'view_car', 'place_bid', 'payment', 'completed'],
    timeout: 60000, // 1 minute
  });
}

export function useRegistrationWorkflow() {
  return useWorkflowTracking({
    workflowName: 'registration',
    steps: ['start', 'enter_details', 'verify_email', 'completed'],
    timeout: 300000, // 5 minutes
  });
}

export function useListingWorkflow() {
  return useWorkflowTracking({
    workflowName: 'listing',
    steps: ['start', 'upload_images', 'enter_details', 'submit', 'completed'],
    timeout: 600000, // 10 minutes
  });
}
