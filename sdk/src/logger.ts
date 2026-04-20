export type LogLevel = "info" | "warn" | "error";

export interface LogEvent {
  ts: string;
  level: LogLevel;
  agent: string;
  event: string;
  [key: string]: unknown;
}

export function createLogger(agent: string) {
  function log(level: LogLevel, event: string, data?: Record<string, unknown>) {
    const entry: LogEvent = { ts: new Date().toISOString(), level, agent, event, ...data };
    const line = JSON.stringify(entry);
    if (level === "error") process.stderr.write(line + "\n");
    else process.stdout.write(line + "\n");
  }

  return {
    info: (event: string, data?: Record<string, unknown>) => log("info", event, data),
    warn: (event: string, data?: Record<string, unknown>) => log("warn", event, data),
    error: (event: string, data?: Record<string, unknown>) => log("error", event, data),
  };
}
