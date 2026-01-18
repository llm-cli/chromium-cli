// Background service worker - main entry point
import Connection from './lib/connection.js';
import * as tabs from './api/tabs.js';
import * as windows from './api/windows.js';
import * as dom from './api/dom.js';
import * as storage from './api/storage.js';
import * as screenshot from './api/screenshot.js';
import * as network from './api/network.js';
import * as consoleApi from './api/console.js';

// Initialize connection
const connection = new Connection({
  serverUrl: 'ws://127.0.0.1:8765/ws'
});

// Store connection status for popup
let connectionStatus = 'disconnected';

connection.onStatusChange = (status, info) => {
  connectionStatus = status;
  // Notify popup if open
  chrome.runtime.sendMessage({ type: 'status', status, info }).catch(() => {});
};

// Register all handlers

// Tabs API
connection.registerHandler('tabs.list', tabs.list);
connection.registerHandler('tabs.get', tabs.get);
connection.registerHandler('tabs.create', tabs.create);
connection.registerHandler('tabs.close', tabs.close);
connection.registerHandler('tabs.reload', tabs.reload);
connection.registerHandler('tabs.navigate', tabs.navigate);
connection.registerHandler('tabs.activate', tabs.activate);
connection.registerHandler('tabs.pin', tabs.pin);
connection.registerHandler('tabs.mute', tabs.mute);
connection.registerHandler('tabs.move', tabs.move);
connection.registerHandler('tabs.duplicate', tabs.duplicate);
connection.registerHandler('tabs.goBack', tabs.goBack);
connection.registerHandler('tabs.goForward', tabs.goForward);
connection.registerHandler('tabs.group', tabs.group);
connection.registerHandler('tabs.ungroup', tabs.ungroup);
connection.registerHandler('tabs.listGroups', tabs.listGroups);
connection.registerHandler('tabs.updateGroup', tabs.updateGroup);
connection.registerHandler('tabs.find', tabs.find);
connection.registerHandler('tabs.waitForLoad', tabs.waitForLoad);

// Windows API
connection.registerHandler('windows.list', windows.list);
connection.registerHandler('windows.get', windows.get);
connection.registerHandler('windows.create', windows.create);
connection.registerHandler('windows.close', windows.close);
connection.registerHandler('windows.focus', windows.focus);
connection.registerHandler('windows.update', windows.update);
connection.registerHandler('windows.getCurrent', windows.getCurrent);
connection.registerHandler('windows.minimize', windows.minimize);
connection.registerHandler('windows.maximize', windows.maximize);
connection.registerHandler('windows.fullscreen', windows.fullscreen);
connection.registerHandler('windows.restore', windows.restore);

// DOM API
connection.registerHandler('dom.query', dom.query);
connection.registerHandler('dom.getText', dom.getText);
connection.registerHandler('dom.getHtml', dom.getHtml);
connection.registerHandler('dom.getAttribute', dom.getAttribute);
connection.registerHandler('dom.getAttributes', dom.getAttributes);
connection.registerHandler('dom.click', dom.click);
connection.registerHandler('dom.fill', dom.fill);
connection.registerHandler('dom.type', dom.type);
connection.registerHandler('dom.clear', dom.clear);
connection.registerHandler('dom.scroll', dom.scroll);
connection.registerHandler('dom.scrollTo', dom.scrollTo);
connection.registerHandler('dom.focus', dom.focus);
connection.registerHandler('dom.hover', dom.hover);
connection.registerHandler('dom.select', dom.select);
connection.registerHandler('dom.execute', dom.execute);
connection.registerHandler('dom.getPageInfo', dom.getPageInfo);
connection.registerHandler('dom.waitFor', dom.waitFor);
connection.registerHandler('dom.exists', dom.exists);
connection.registerHandler('dom.count', dom.count);
connection.registerHandler('dom.visible', dom.visible);
connection.registerHandler('dom.drag', dom.drag);
connection.registerHandler('dom.upload', dom.upload);
connection.registerHandler('dom.listFrames', dom.listFrames);

// Storage API
connection.registerHandler('storage.getCookies', storage.getCookies);
connection.registerHandler('storage.getCookie', storage.getCookie);
connection.registerHandler('storage.setCookie', storage.setCookie);
connection.registerHandler('storage.deleteCookie', storage.deleteCookie);
connection.registerHandler('storage.clearCookies', storage.clearCookies);
connection.registerHandler('storage.getLocalStorage', storage.getLocalStorage);
connection.registerHandler('storage.setLocalStorage', storage.setLocalStorage);
connection.registerHandler('storage.deleteLocalStorage', storage.deleteLocalStorage);
connection.registerHandler('storage.clearLocalStorage', storage.clearLocalStorage);
connection.registerHandler('storage.getSessionStorage', storage.getSessionStorage);
connection.registerHandler('storage.setSessionStorage', storage.setSessionStorage);
connection.registerHandler('storage.deleteSessionStorage', storage.deleteSessionStorage);
connection.registerHandler('storage.clearSessionStorage', storage.clearSessionStorage);

// Screenshot API
connection.registerHandler('screenshot.visible', screenshot.visible);
connection.registerHandler('screenshot.fullPage', screenshot.fullPage);
connection.registerHandler('screenshot.element', screenshot.element);
connection.registerHandler('screenshot.capture', screenshot.capture);

// Network API
connection.registerHandler('network.startLogging', network.startLogging);
connection.registerHandler('network.stopLogging', network.stopLogging);
connection.registerHandler('network.isLogging', network.isLogging);
connection.registerHandler('network.getLog', network.getLog);
connection.registerHandler('network.getRequest', network.getRequest);
connection.registerHandler('network.clearLog', network.clearLog);
connection.registerHandler('network.getStats', network.getStats);

// Console API
connection.registerHandler('console.getLogs', consoleApi.getLogs);
connection.registerHandler('console.clear', consoleApi.clear);

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getStatus') {
    sendResponse({
      status: connectionStatus,
      info: connection.getStatus()
    });
    return true;
  }

  if (message.type === 'reconnect') {
    connection.disconnect();
    connection.reconnectAttempts = 0;
    connection.connect();
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'setServerUrl') {
    connection.serverUrl = message.url;
    connection.disconnect();
    connection.reconnectAttempts = 0;
    connection.connect();
    sendResponse({ ok: true });
    return true;
  }
});

// Keepalive - prevent service worker from going idle
// Manifest V3 service workers sleep after 30s of inactivity
chrome.alarms.create('keepalive', { periodInMinutes: 0.4 }); // Every 24 seconds

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepalive') {
    // Just checking connection status keeps the worker alive
    if (!connection.connected) {
      connection.connect();
    }
  }
});

// Start connection
connection.connect();

console.log('[chromium-cli] Extension loaded');
