type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function safeStringify(value: unknown): string {
  try {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.stack || value.message || String(value);
    return JSON.stringify(value);
  } catch {
    try {
      return String(value);
    } catch {
      return '[Unserializable]';
    }
  }
}

function formatArgs(args: unknown[]): string {
  return args.map(safeStringify).join(' ');
}

function write(level: LogLevel, ...args: unknown[]) {
  const msg = formatArgs(args);
  // Always write logs to STDERR to avoid interfering with STDIO JSON-RPC
  process.stderr.write(`[${level}] ${msg}\n`);
}

export const logger = {
  debug: (...args: unknown[]) => write('debug', ...args),
  info: (...args: unknown[]) => write('info', ...args),
  warn: (...args: unknown[]) => write('warn', ...args),
  error: (...args: unknown[]) => write('error', ...args),
};
