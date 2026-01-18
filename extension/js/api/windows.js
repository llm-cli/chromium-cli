// Window management API

export async function list(params = {}) {
  const queryInfo = {};

  if (params.populate !== undefined) queryInfo.populate = params.populate === 'true' || params.populate === true;
  if (params.windowTypes) queryInfo.windowTypes = params.windowTypes.split(',');

  const windows = await chrome.windows.getAll(queryInfo);

  return windows.map(win => ({
    id: win.id,
    type: win.type,
    state: win.state,
    focused: win.focused,
    incognito: win.incognito,
    left: win.left,
    top: win.top,
    width: win.width,
    height: win.height,
    tabCount: win.tabs ? win.tabs.length : undefined
  }));
}

export async function get(params) {
  const windowId = parseInt(params.id || params.windowId, 10);
  const populate = params.populate === 'true' || params.populate === true;

  if (!windowId) throw new Error('Window ID required');

  const win = await chrome.windows.get(windowId, { populate });

  return {
    id: win.id,
    type: win.type,
    state: win.state,
    focused: win.focused,
    incognito: win.incognito,
    left: win.left,
    top: win.top,
    width: win.width,
    height: win.height,
    tabs: win.tabs?.map(t => ({ id: t.id, url: t.url, title: t.title, active: t.active }))
  };
}

export async function create(params) {
  const createData = {};

  if (params.url) createData.url = params.url;
  if (params.tabId) createData.tabId = parseInt(params.tabId, 10);
  if (params.left !== undefined) createData.left = parseInt(params.left, 10);
  if (params.top !== undefined) createData.top = parseInt(params.top, 10);
  if (params.width !== undefined) createData.width = parseInt(params.width, 10);
  if (params.height !== undefined) createData.height = parseInt(params.height, 10);
  if (params.focused !== undefined) createData.focused = params.focused === 'true' || params.focused === true;
  if (params.incognito !== undefined) createData.incognito = params.incognito === 'true' || params.incognito === true;
  if (params.type) createData.type = params.type;
  if (params.state) createData.state = params.state;

  const win = await chrome.windows.create(createData);

  return {
    id: win.id,
    type: win.type,
    state: win.state
  };
}

export async function close(params) {
  const windowId = parseInt(params.id || params.windowId, 10);
  if (!windowId) throw new Error('Window ID required');

  await chrome.windows.remove(windowId);
  return { closed: windowId };
}

export async function focus(params) {
  const windowId = parseInt(params.id || params.windowId, 10);
  if (!windowId) throw new Error('Window ID required');

  await chrome.windows.update(windowId, { focused: true });
  return { focused: windowId };
}

export async function update(params) {
  const windowId = parseInt(params.id || params.windowId, 10);
  if (!windowId) throw new Error('Window ID required');

  const updateInfo = {};
  if (params.left !== undefined) updateInfo.left = parseInt(params.left, 10);
  if (params.top !== undefined) updateInfo.top = parseInt(params.top, 10);
  if (params.width !== undefined) updateInfo.width = parseInt(params.width, 10);
  if (params.height !== undefined) updateInfo.height = parseInt(params.height, 10);
  if (params.focused !== undefined) updateInfo.focused = params.focused === 'true' || params.focused === true;
  if (params.state) updateInfo.state = params.state;

  await chrome.windows.update(windowId, updateInfo);
  return { updated: windowId, changes: Object.keys(updateInfo) };
}

export async function getCurrent(params = {}) {
  const populate = params.populate === 'true' || params.populate === true;
  const win = await chrome.windows.getCurrent({ populate });

  return {
    id: win.id,
    type: win.type,
    state: win.state,
    focused: win.focused,
    left: win.left,
    top: win.top,
    width: win.width,
    height: win.height,
    tabs: win.tabs?.map(t => ({ id: t.id, url: t.url, title: t.title, active: t.active }))
  };
}

export async function minimize(params) {
  const windowId = parseInt(params.id || params.windowId, 10);
  if (!windowId) throw new Error('Window ID required');

  await chrome.windows.update(windowId, { state: 'minimized' });
  return { minimized: windowId };
}

export async function maximize(params) {
  const windowId = parseInt(params.id || params.windowId, 10);
  if (!windowId) throw new Error('Window ID required');

  await chrome.windows.update(windowId, { state: 'maximized' });
  return { maximized: windowId };
}

export async function fullscreen(params) {
  const windowId = parseInt(params.id || params.windowId, 10);
  if (!windowId) throw new Error('Window ID required');

  await chrome.windows.update(windowId, { state: 'fullscreen' });
  return { fullscreen: windowId };
}

export async function restore(params) {
  const windowId = parseInt(params.id || params.windowId, 10);
  if (!windowId) throw new Error('Window ID required');

  await chrome.windows.update(windowId, { state: 'normal' });
  return { restored: windowId };
}
