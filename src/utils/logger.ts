export function logInfo(message: string, ...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.log(`[Kayad] ${message}`, ...args);
  }
}

export function logError(message: string, ...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.error(`[Kayad] ${message}`, ...args);
  }
}

export function logWarn(message: string, ...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.warn(`[Kayad] ${message}`, ...args);
  }
}
