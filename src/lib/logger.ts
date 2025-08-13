type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

function log(level: LogLevel, message: string, context?: LogContext) {
  const payload = {
    level,
    message,
    ...(context ? { context } : {}),
    timestamp: new Date().toISOString(),
  }
  if (level === 'error') {
    console.error(JSON.stringify(payload))
  } else if (level === 'warn') {
    console.warn(JSON.stringify(payload))
  } else if (level === 'info') {
    console.info(JSON.stringify(payload))
  } else {
    console.debug(JSON.stringify(payload))
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
}


