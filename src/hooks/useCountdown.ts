import { useState, useEffect, useMemo } from 'react';

export interface CountdownResult {
  /** Milliseconds remaining, clamped to 0 once the deadline has passed. */
  msRemaining: number;
  /** Short display string - "2h 14m", "23m", "0:45", or "Ended". */
  label: string;
  /** True once under the urgency threshold (default 30 min) - meant to
   * drive visual urgency (e.g. switching a badge from a calm "LIVE" to
   * an active countdown with warmer styling). */
  isEndingSoon: boolean;
  /** True once msRemaining has reached 0. */
  hasEnded: boolean;
}

/**
 * Tracks time remaining until a target ISO date/time string, updating on
 * an interval whose frequency scales with urgency rather than a fixed
 * 1-second tick everywhere - a grid can render many of these
 * simultaneously (an auction card grid, potentially dozens of vehicles),
 * so a naive 1s interval per instance would mean dozens of concurrent
 * timers and re-renders for something that usually doesn't need
 * second-level precision. Ticks once a minute while there's more than
 * an urgencyThresholdMs remaining, then switches to a real 1-second tick
 * only once inside that final window, where a live countdown actually
 * matters.
 */
export function useCountdown(targetIso: string | null | undefined, urgencyThresholdMs = 30 * 60 * 1000): CountdownResult {
  const targetMs = useMemo(() => (targetIso ? new Date(targetIso).getTime() : null), [targetIso]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetMs) return;
    const msLeft = targetMs - Date.now();
    // Inside the urgency window (or already past it) - tick every
    // second for a live countdown. Otherwise, a full minute is fine;
    // nothing meaningfully changes for the user between minute ticks
    // this far out, and it's far cheaper across a whole grid.
    const intervalMs = msLeft <= urgencyThresholdMs ? 1000 : 60_000;
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [targetMs, urgencyThresholdMs, now]);

  return useMemo(() => {
    if (!targetMs) {
      return { msRemaining: 0, label: '', isEndingSoon: false, hasEnded: false };
    }
    const msRemaining = Math.max(0, targetMs - now);
    const hasEnded = msRemaining === 0;
    const isEndingSoon = msRemaining > 0 && msRemaining <= urgencyThresholdMs;

    let label: string;
    if (hasEnded) {
      label = 'Ended';
    } else {
      const totalSeconds = Math.floor(msRemaining / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      if (hours > 0) {
        label = `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        label = isEndingSoon ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${minutes}m`;
      } else {
        label = `0:${String(seconds).padStart(2, '0')}`;
      }
    }

    return { msRemaining, label, isEndingSoon, hasEnded };
  }, [targetMs, now, urgencyThresholdMs]);
}
