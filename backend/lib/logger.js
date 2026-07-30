export function logger(scope) {
  const fmt = (level, msg, extra) =>
    console[level](
      `[${new Date().toISOString()}] [${scope}] ${msg}`,
      extra ?? ""
    );
  return {
    info: (msg, extra) => fmt("log", msg, extra),
    warn: (msg, extra) => fmt("warn", msg, extra),
    error: (msg, extra) => fmt("error", msg, extra)
  };
}