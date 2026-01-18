// Console API - Retrieve captured console logs
// Logs are captured automatically by content script

// Get target tab ID (active tab if not specified)
async function getTargetTabId(params) {
  if (params?.tabId) {
    return parseInt(params.tabId, 10);
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error('No active tab');
  return tab.id;
}

// Execute script in tab with proper error handling
async function executeScript(tabId, func, args = []) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args,
    world: 'MAIN' // Run in page context to access captured logs
  });
  if (results && results[0]) {
    if (results[0].error) throw new Error(results[0].error.message);
    const result = results[0].result;
    if (result && typeof result === 'object' && result.__error) {
      throw new Error(result.__error);
    }
    return result;
  }
  return null;
}

// Get captured logs
export async function getLogs(params) {
  const tabId = await getTargetTabId(params);
  const level = params?.level || null;
  const limit = params?.limit || 100;

  return executeScript(tabId, (level, limit) => {
    try {
      let logs = window.__chromiumCliConsoleLogs || [];

      // Filter by level if specified
      if (level) {
        logs = logs.filter(l => l.level === level);
      }

      // Return last N logs
      return logs.slice(-limit);
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [level, limit]);
}

// Clear captured logs
export async function clear(params) {
  const tabId = await getTargetTabId(params);

  return executeScript(tabId, () => {
    try {
      if (window.__chromiumCliConsoleLogs) {
        const count = window.__chromiumCliConsoleLogs.length;
        window.__chromiumCliConsoleLogs = [];
        return { cleared: true, count };
      }
      return { cleared: true, count: 0 };
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  });
}
