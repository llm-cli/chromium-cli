// WebSocket connection manager
class Connection {
  constructor(config = {}) {
    this.serverUrl = config.serverUrl || 'ws://127.0.0.1:8765/ws';
    this.browserName = config.browserName || this.detectBrowserName();
    this.browserId = null; // Will be set async
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = Infinity;
    this.reconnectDelay = 2000;
    this.handlers = new Map();
    this.onStatusChange = null;
    this._initialized = false;
  }

  detectBrowserName() {
    const ua = navigator.userAgent;
    if (ua.includes('Edg/')) return 'edge';
    if (ua.includes('Brave')) return 'brave';
    if (ua.includes('OPR/') || ua.includes('Opera')) return 'opera';
    if (ua.includes('Vivaldi')) return 'vivaldi';
    if (ua.includes('Chrome')) return 'chrome';
    return 'chromium';
  }

  async init() {
    if (this._initialized) return;

    // Get or create browser ID using chrome.storage.local
    const result = await chrome.storage.local.get('chromium-cli-browser-id');
    if (result['chromium-cli-browser-id']) {
      this.browserId = result['chromium-cli-browser-id'];
    } else {
      this.browserId = `${this.browserName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await chrome.storage.local.set({ 'chromium-cli-browser-id': this.browserId });
    }

    this._initialized = true;
  }

  async connect() {
    // Ensure initialized
    await this.init();

    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        console.log('[chromium-cli] Connected to server');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.notifyStatus('connected');

        // Send browser identification
        this.ws.send(JSON.stringify({
          type: 'identify',
          browserId: this.browserId,
          browserName: this.browserName
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.error('[chromium-cli] Invalid message:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[chromium-cli] Disconnected from server');
        this.connected = false;
        this.notifyStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[chromium-cli] WebSocket error:', err);
        this.notifyStatus('error');
      };

    } catch (e) {
      console.error('[chromium-cli] Connection error:', e);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[chromium-cli] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 30000);
    console.log(`[chromium-cli] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => this.connect(), delay);
  }

  async handleMessage(msg) {
    const { requestId, action, params } = msg;

    if (!requestId || !action) return;

    try {
      const handler = this.handlers.get(action);
      if (!handler) {
        throw new Error(`Unknown action: ${action}`);
      }

      const result = await handler(params || {});
      this.send({ requestId, success: true, data: result });

    } catch (e) {
      console.error(`[chromium-cli] Action error (${action}):`, e);
      this.send({ requestId, success: false, error: e.message });
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  registerHandler(action, handler) {
    this.handlers.set(action, handler);
  }

  notifyStatus(status) {
    if (this.onStatusChange) {
      this.onStatusChange(status, {
        browserId: this.browserId,
        browserName: this.browserName,
        serverUrl: this.serverUrl
      });
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getStatus() {
    return {
      connected: this.connected,
      browserId: this.browserId,
      browserName: this.browserName,
      serverUrl: this.serverUrl,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

export default Connection;
