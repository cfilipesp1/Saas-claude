type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  error?: unknown;
  data?: Record<string, unknown>;
  timestamp: string;
}

function formatError(err: unknown): string | undefined {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  if (typeof err === "string") return err;
  return undefined;
}

function log(entry: LogEntry) {
  const payload = {
    ...entry,
    error: entry.error ? formatError(entry.error) : undefined,
  };

  switch (entry.level) {
    case "error":
      console.error(JSON.stringify(payload));
      break;
    case "warn":
      console.warn(JSON.stringify(payload));
      break;
    default:
      console.log(JSON.stringify(payload));
  }
}

export const logger = {
  info(message: string, context?: string, data?: Record<string, unknown>) {
    log({ level: "info", message, context, data, timestamp: new Date().toISOString() });
  },
  warn(message: string, context?: string, data?: Record<string, unknown>) {
    log({ level: "warn", message, context, data, timestamp: new Date().toISOString() });
  },
  error(message: string, error?: unknown, context?: string, data?: Record<string, unknown>) {
    log({ level: "error", message, error, context, data, timestamp: new Date().toISOString() });
  },
};
