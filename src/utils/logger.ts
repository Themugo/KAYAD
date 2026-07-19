// Mock logger for development
export const logInfo = (msg: string, data?: any) => {
  if (import.meta.env.DEV) console.log("[INFO]", msg, data);
};
export const logError = (msg: string, err?: any) => {
  if (import.meta.env.DEV) console.error("[ERROR]", msg, err);
};
export const logWarn = (msg: string, data?: any) => {
  if (import.meta.env.DEV) console.warn("[WARN]", msg, data);
};
