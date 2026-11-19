export function logInfo(message: string, ...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.log(`[KAYARD KE] ${message}`, ...args);
  }
}

export function logError(message: string, ...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.error(`[KAYARD KE] ${message}`, ...args);
  }
}

export function logWarn(message: string, ...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.warn(`[KAYARD KE] ${message}`, ...args);
  }
}
