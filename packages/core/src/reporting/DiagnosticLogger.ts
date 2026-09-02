import pino from 'pino';

export class DiagnosticLogger {
  private static instance = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    // Pretty-print only outside CI — avoids spinning up a worker-thread transport
    // (and its dependency on pino-pretty being installed/resolvable) where nobody reads it.
    ...(process.env.CI
      ? {}
      : {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true },
          },
        }),
  });

  static info(msg: string, meta?: Record<string, unknown>): void {
    this.instance.info(meta ?? {}, msg);
  }

  static warn(msg: string, meta?: Record<string, unknown>): void {
    this.instance.warn(meta ?? {}, msg);
  }

  static error(msg: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    this.instance.error({ err: error, ...(meta ?? {}) }, msg);
  }

  static debug(msg: string, meta?: Record<string, unknown>): void {
    this.instance.debug(meta ?? {}, msg);
  }
}
