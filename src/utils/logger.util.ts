type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const stamp = () => new Date().toISOString();

const log = (level: LogLevel, msg: string, meta?: unknown) => {
  const line = `[${stamp()}] [${level.toUpperCase()}] ${msg}`;
  if (meta !== undefined) {
    console[level === 'debug' ? 'log' : level](line, meta);
  } else {
    console[level === 'debug' ? 'log' : level](line);
  }
};

export const logger = {
  info: (msg: string, meta?: unknown) => log('info', msg, meta),
  warn: (msg: string, meta?: unknown) => log('warn', msg, meta),
  error: (msg: string, meta?: unknown) => log('error', msg, meta),
  debug: (msg: string, meta?: unknown) => log('debug', msg, meta),
};
