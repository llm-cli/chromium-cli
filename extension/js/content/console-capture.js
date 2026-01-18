// Content script - Auto-capture console logs
// Injected on all pages automatically

(function() {
  // Avoid double injection
  if (window.__chromiumCliConsoleLogs) return;

  // Initialize log storage
  window.__chromiumCliConsoleLogs = [];
  const MAX_LOGS = 500;

  // Store original console methods
  const original = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console)
  };

  // Serialize argument for storage
  const serialize = (arg) => {
    if (arg === undefined) return 'undefined';
    if (arg === null) return 'null';
    if (typeof arg === 'function') return `[Function: ${arg.name || 'anonymous'}]`;
    if (typeof arg === 'symbol') return arg.toString();
    if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch (e) {
        return '[Object]';
      }
    }
    return String(arg);
  };

  // Create interceptor
  const intercept = (level) => {
    return function(...args) {
      window.__chromiumCliConsoleLogs.push({
        level,
        timestamp: Date.now(),
        message: args.map(serialize).join(' ')
      });

      // Trim old logs
      if (window.__chromiumCliConsoleLogs.length > MAX_LOGS) {
        window.__chromiumCliConsoleLogs.shift();
      }

      // Call original
      original[level](...args);
    };
  };

  // Override console methods
  console.log = intercept('log');
  console.warn = intercept('warn');
  console.error = intercept('error');
  console.info = intercept('info');
  console.debug = intercept('debug');
})();
