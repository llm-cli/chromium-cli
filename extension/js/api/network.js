// Network API - Request logging

// In-memory request log (limited size)
const MAX_LOG_SIZE = 1000;
const requestLog = [];
let loggingEnabled = false;

// Initialize network logging
export function initNetworkLogging() {
  if (loggingEnabled) return;

  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (!loggingEnabled) return;
      addLogEntry({
        type: 'request',
        requestId: details.requestId,
        url: details.url,
        method: details.method,
        tabId: details.tabId,
        type: details.type,
        timeStamp: details.timeStamp,
        initiator: details.initiator
      });
    },
    { urls: ['<all_urls>'] },
    ['requestBody']
  );

  chrome.webRequest.onSendHeaders.addListener(
    (details) => {
      if (!loggingEnabled) return;
      updateLogEntry(details.requestId, {
        requestHeaders: details.requestHeaders
      });
    },
    { urls: ['<all_urls>'] },
    ['requestHeaders']
  );

  chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
      if (!loggingEnabled) return;
      updateLogEntry(details.requestId, {
        statusCode: details.statusCode,
        statusLine: details.statusLine,
        responseHeaders: details.responseHeaders
      });
    },
    { urls: ['<all_urls>'] },
    ['responseHeaders']
  );

  chrome.webRequest.onCompleted.addListener(
    (details) => {
      if (!loggingEnabled) return;
      updateLogEntry(details.requestId, {
        completed: true,
        completedAt: details.timeStamp,
        fromCache: details.fromCache
      });
    },
    { urls: ['<all_urls>'] }
  );

  chrome.webRequest.onErrorOccurred.addListener(
    (details) => {
      if (!loggingEnabled) return;
      updateLogEntry(details.requestId, {
        error: details.error,
        errorAt: details.timeStamp
      });
    },
    { urls: ['<all_urls>'] }
  );

  loggingEnabled = true;
}

function addLogEntry(entry) {
  requestLog.push(entry);
  if (requestLog.length > MAX_LOG_SIZE) {
    requestLog.shift();
  }
}

function updateLogEntry(requestId, updates) {
  const entry = requestLog.find(e => e.requestId === requestId);
  if (entry) {
    Object.assign(entry, updates);
  }
}

// API handlers

export async function startLogging(params) {
  initNetworkLogging();
  return { logging: true };
}

export async function stopLogging(params) {
  loggingEnabled = false;
  return { logging: false };
}

export async function isLogging(params) {
  return { logging: loggingEnabled };
}

export async function getLog(params) {
  const tabId = params.tabId ? parseInt(params.tabId, 10) : undefined;
  const url = params.url;
  const method = params.method;
  const type = params.type;
  const limit = params.limit ? parseInt(params.limit, 10) : 100;
  const since = params.since ? parseFloat(params.since) : undefined;

  let filtered = [...requestLog];

  if (tabId !== undefined) {
    filtered = filtered.filter(e => e.tabId === tabId);
  }

  if (url) {
    const pattern = url.replace(/\*/g, '.*').replace(/\?/g, '.');
    const regex = new RegExp(pattern, 'i');
    filtered = filtered.filter(e => regex.test(e.url));
  }

  if (method) {
    const m = method.toUpperCase();
    filtered = filtered.filter(e => e.method === m);
  }

  if (type) {
    filtered = filtered.filter(e => e.type === type);
  }

  if (since !== undefined) {
    filtered = filtered.filter(e => e.timeStamp >= since);
  }

  // Return most recent first, limited
  return filtered.slice(-limit).reverse().map(e => ({
    requestId: e.requestId,
    url: e.url,
    method: e.method,
    tabId: e.tabId,
    type: e.type,
    statusCode: e.statusCode,
    completed: e.completed,
    error: e.error,
    fromCache: e.fromCache,
    timeStamp: e.timeStamp,
    duration: e.completedAt ? e.completedAt - e.timeStamp : undefined
  }));
}

export async function getRequest(params) {
  const requestId = params.requestId || params.id;
  if (!requestId) throw new Error('Request ID required');

  const entry = requestLog.find(e => e.requestId === requestId);
  if (!entry) throw new Error('Request not found');

  return {
    requestId: entry.requestId,
    url: entry.url,
    method: entry.method,
    tabId: entry.tabId,
    type: entry.type,
    initiator: entry.initiator,
    statusCode: entry.statusCode,
    statusLine: entry.statusLine,
    requestHeaders: entry.requestHeaders,
    responseHeaders: entry.responseHeaders,
    completed: entry.completed,
    error: entry.error,
    fromCache: entry.fromCache,
    timeStamp: entry.timeStamp,
    completedAt: entry.completedAt,
    duration: entry.completedAt ? entry.completedAt - entry.timeStamp : undefined
  };
}

export async function clearLog(params) {
  const count = requestLog.length;
  requestLog.length = 0;
  return { cleared: count };
}

export async function getStats(params) {
  const tabId = params.tabId ? parseInt(params.tabId, 10) : undefined;

  let filtered = [...requestLog];
  if (tabId !== undefined) {
    filtered = filtered.filter(e => e.tabId === tabId);
  }

  const stats = {
    total: filtered.length,
    completed: 0,
    failed: 0,
    byMethod: {},
    byType: {},
    byStatus: {}
  };

  for (const entry of filtered) {
    if (entry.completed) stats.completed++;
    if (entry.error) stats.failed++;

    stats.byMethod[entry.method] = (stats.byMethod[entry.method] || 0) + 1;
    stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;

    if (entry.statusCode) {
      const statusGroup = Math.floor(entry.statusCode / 100) + 'xx';
      stats.byStatus[statusGroup] = (stats.byStatus[statusGroup] || 0) + 1;
    }
  }

  return stats;
}
