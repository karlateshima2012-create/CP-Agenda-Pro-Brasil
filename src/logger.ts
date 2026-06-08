/**
 * ✅ SECURITY [M-8]: Conditional logger — only prints in development.
 * Use this instead of console.log throughout the application.
 */
const isDev = import.meta.env.DEV;

export const log = {
  info: (...args: unknown[]) => { if (isDev) console.log(...args); },
  warn: (...args: unknown[]) => { if (isDev) console.warn(...args); },
  error: (...args: unknown[]) => { if (isDev) console.error(...args); },
  debug: (...args: unknown[]) => { if (isDev) console.debug(...args); },
};
