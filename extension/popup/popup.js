// Popup script

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const browserName = document.getElementById('browserName');
const serverUrl = document.getElementById('serverUrl');
const browserId = document.getElementById('browserId');
const reconnectBtn = document.getElementById('reconnectBtn');

function updateUI(status, info) {
  // Update status dot
  statusDot.className = 'status-dot ' + status;

  // Update status text
  const statusLabels = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    error: 'Connection Error'
  };
  statusText.textContent = statusLabels[status] || status;

  // Update info
  if (info) {
    browserName.textContent = info.browserName || '-';
    serverUrl.textContent = info.serverUrl || '-';
    browserId.textContent = info.browserId ? info.browserId.slice(0, 20) + '...' : '-';
  }

  // Update button
  reconnectBtn.disabled = status === 'connected';
  reconnectBtn.textContent = status === 'connected' ? 'Connected' : 'Reconnect';
}

// Get initial status
chrome.runtime.sendMessage({ type: 'getStatus' }, (response) => {
  if (response) {
    updateUI(response.status, response.info);
  }
});

// Listen for status updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'status') {
    updateUI(message.status, message.info);
  }
});

// Reconnect button
reconnectBtn.addEventListener('click', () => {
  reconnectBtn.disabled = true;
  reconnectBtn.textContent = 'Reconnecting...';

  chrome.runtime.sendMessage({ type: 'reconnect' }, () => {
    // Status will be updated via message listener
  });
});
