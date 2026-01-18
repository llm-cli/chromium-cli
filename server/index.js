const http = require('http');
const { WebSocketServer } = require('ws');

const BASE_PORT = parseInt(process.env.CHROMIUM_CLI_PORT || '8765', 10);
const HOST = '127.0.0.1';

// Connected browser extensions (browser_id -> ws)
const browsers = new Map();

// Pending requests waiting for response (request_id -> {resolve, reject, timeout})
const pendingRequests = new Map();

let requestIdCounter = 0;

// WebSocket server for extensions
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
  const browserId = req.headers['x-browser-id'] || `browser-${Date.now()}`;
  const browserName = req.headers['x-browser-name'] || 'unknown';

  console.log(`[+] Browser connected: ${browserName} (${browserId})`);
  browsers.set(browserId, { ws, name: browserName, connectedAt: Date.now() });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleBrowserMessage(browserId, msg);
    } catch (e) {
      console.error(`[!] Invalid message from ${browserId}:`, e.message);
    }
  });

  ws.on('close', () => {
    console.log(`[-] Browser disconnected: ${browserName} (${browserId})`);
    browsers.delete(browserId);
  });

  ws.on('error', (err) => {
    console.error(`[!] WebSocket error from ${browserId}:`, err.message);
  });
});

function handleBrowserMessage(browserId, msg) {
  const { requestId, success, data, error } = msg;

  if (!requestId) return;

  const pending = pendingRequests.get(requestId);
  if (!pending) return;

  clearTimeout(pending.timeout);
  pendingRequests.delete(requestId);

  if (success) {
    pending.resolve(data);
  } else {
    pending.reject(new Error(error || 'Unknown error'));
  }
}

function sendToBrowser(browserId, action, params, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const browser = browsers.get(browserId);
    if (!browser) {
      return reject(new Error(`Browser not found: ${browserId}`));
    }

    const requestId = `req-${++requestIdCounter}`;
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('Request timeout'));
    }, timeoutMs);

    pendingRequests.set(requestId, { resolve, reject, timeout });

    browser.ws.send(JSON.stringify({ requestId, action, params }));
  });
}

function sendToAllBrowsers(action, params, timeoutMs = 30000) {
  const promises = [];
  for (const [browserId] of browsers) {
    promises.push(
      sendToBrowser(browserId, action, params, timeoutMs)
        .then(data => ({ browserId, success: true, data }))
        .catch(error => ({ browserId, success: false, error: error.message }))
    );
  }
  return Promise.all(promises);
}

// HTTP server for CLI
const httpServer = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  // CORS for local testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const url = new URL(req.url, `http://${HOST}:${BASE_PORT}`);
  const path = url.pathname;

  try {
    // Parse body for POST requests
    let body = {};
    if (req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const rawBody = Buffer.concat(chunks).toString();
      if (rawBody) body = JSON.parse(rawBody);
    }

    // Route handling
    const result = await handleRoute(path, url.searchParams, body);
    res.writeHead(200);
    res.end(JSON.stringify(result));

  } catch (err) {
    res.writeHead(err.statusCode || 500);
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
});

async function handleRoute(path, params, body) {
  // Server status
  if (path === '/status' || path === '/') {
    return {
      success: true,
      data: {
        server: 'chromium-cli',
        version: '1.0.0',
        browsers: Array.from(browsers.entries()).map(([id, b]) => ({
          id,
          name: b.name,
          connectedAt: b.connectedAt
        }))
      }
    };
  }

  // List connected browsers
  if (path === '/browsers') {
    return {
      success: true,
      data: Array.from(browsers.entries()).map(([id, b]) => ({
        id,
        name: b.name,
        connectedAt: b.connectedAt
      }))
    };
  }

  // Get target browser(s)
  const browserId = params.get('browser') || body.browser;
  const targetAll = !browserId || browserId === 'all';

  // Action-based routing
  const action = path.slice(1).replace(/\//g, '.');  // /tabs/list -> tabs.list
  const actionParams = { ...body };
  delete actionParams.browser;

  // Add query params to action params
  for (const [key, value] of params) {
    if (key !== 'browser') actionParams[key] = value;
  }

  if (targetAll) {
    const results = await sendToAllBrowsers(action, actionParams);

    // If only one browser, flatten response
    if (results.length === 1) {
      const r = results[0];
      if (r.success) return { success: true, data: r.data };
      throw new Error(r.error);
    }

    return { success: true, data: results };
  } else {
    const data = await sendToBrowser(browserId, action, actionParams);
    return { success: true, data };
  }
}

// Handle WebSocket upgrade
httpServer.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

httpServer.listen(BASE_PORT, HOST, () => {
  console.log(`chromium-cli server listening on http://${HOST}:${BASE_PORT}`);
  console.log(`WebSocket endpoint: ws://${HOST}:${BASE_PORT}/ws`);
  console.log('Waiting for browser extensions to connect...');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  wss.close();
  httpServer.close();
  process.exit(0);
});
