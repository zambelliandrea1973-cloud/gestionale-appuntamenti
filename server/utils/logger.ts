const isProduction = process.env.NODE_ENV === 'production';

const LOG_LEVEL = process.env.LOG_LEVEL || (isProduction ? 'warn' : 'debug');

const levels: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = levels[LOG_LEVEL] ?? levels.info;

function shouldLog(level: string): boolean {
  return (levels[level] ?? 0) >= currentLevel;
}

export const logger = {
  debug: (...args: any[]) => {
    if (shouldLog('debug')) console.log(...args);
  },
  info: (...args: any[]) => {
    if (shouldLog('info')) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (shouldLog('warn')) console.warn(...args);
  },
  error: (...args: any[]) => {
    console.error(...args);
  },
};
