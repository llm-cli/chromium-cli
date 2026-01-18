// Tab management API

export async function list(params = {}) {
  const queryInfo = {};

  if (params.active !== undefined) queryInfo.active = params.active === 'true' || params.active === true;
  if (params.currentWindow !== undefined) queryInfo.currentWindow = params.currentWindow === 'true' || params.currentWindow === true;
  if (params.url) queryInfo.url = params.url;
  if (params.title) queryInfo.title = params.title;
  if (params.pinned !== undefined) queryInfo.pinned = params.pinned === 'true' || params.pinned === true;
  if (params.muted !== undefined) queryInfo.muted = params.muted === 'true' || params.muted === true;
  if (params.windowId) queryInfo.windowId = parseInt(params.windowId, 10);
  if (params.groupId) queryInfo.groupId = parseInt(params.groupId, 10);

  const tabs = await chrome.tabs.query(queryInfo);

  return tabs.map(tab => ({
    id: tab.id,
    windowId: tab.windowId,
    index: tab.index,
    url: tab.url,
    title: tab.title,
    active: tab.active,
    pinned: tab.pinned,
    muted: tab.mutedInfo?.muted || false,
    groupId: tab.groupId,
    favIconUrl: tab.favIconUrl
  }));
}

export async function get(params) {
  const tabId = parseInt(params.id || params.tabId, 10);
  if (!tabId) throw new Error('Tab ID required');

  const tab = await chrome.tabs.get(tabId);
  return {
    id: tab.id,
    windowId: tab.windowId,
    index: tab.index,
    url: tab.url,
    title: tab.title,
    active: tab.active,
    pinned: tab.pinned,
    muted: tab.mutedInfo?.muted || false,
    groupId: tab.groupId,
    favIconUrl: tab.favIconUrl
  };
}

export async function create(params) {
  const createProps = {};

  if (params.url) createProps.url = params.url;
  if (params.active !== undefined) createProps.active = params.active === 'true' || params.active === true;
  if (params.pinned !== undefined) createProps.pinned = params.pinned === 'true' || params.pinned === true;
  if (params.windowId) createProps.windowId = parseInt(params.windowId, 10);
  if (params.index !== undefined) createProps.index = parseInt(params.index, 10);

  const tab = await chrome.tabs.create(createProps);
  return { id: tab.id, url: tab.url, windowId: tab.windowId };
}

export async function close(params) {
  let tabIds = params.id || params.tabId || params.ids;

  if (typeof tabIds === 'string') {
    tabIds = tabIds.split(',').map(id => parseInt(id.trim(), 10));
  } else if (typeof tabIds === 'number') {
    tabIds = [tabIds];
  }

  if (!tabIds || tabIds.length === 0) throw new Error('Tab ID(s) required');

  await chrome.tabs.remove(tabIds);
  return { closed: tabIds };
}

export async function reload(params) {
  const tabId = parseInt(params.id || params.tabId, 10);
  const bypassCache = params.bypassCache === 'true' || params.bypassCache === true;

  if (tabId) {
    await chrome.tabs.reload(tabId, { bypassCache });
    return { reloaded: tabId };
  } else {
    // Reload active tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
      await chrome.tabs.reload(activeTab.id, { bypassCache });
      return { reloaded: activeTab.id };
    }
    throw new Error('No active tab');
  }
}

export async function navigate(params) {
  const tabId = parseInt(params.id || params.tabId, 10);
  const url = params.url;

  if (!url) throw new Error('URL required');

  if (tabId) {
    await chrome.tabs.update(tabId, { url });
    return { navigated: tabId, url };
  } else {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
      await chrome.tabs.update(activeTab.id, { url });
      return { navigated: activeTab.id, url };
    }
    throw new Error('No active tab');
  }
}

export async function activate(params) {
  const tabId = parseInt(params.id || params.tabId, 10);
  if (!tabId) throw new Error('Tab ID required');

  await chrome.tabs.update(tabId, { active: true });
  const tab = await chrome.tabs.get(tabId);
  await chrome.windows.update(tab.windowId, { focused: true });

  return { activated: tabId };
}

export async function pin(params) {
  const tabId = parseInt(params.id || params.tabId, 10);
  const pinned = params.pinned !== 'false' && params.pinned !== false;

  if (!tabId) throw new Error('Tab ID required');

  await chrome.tabs.update(tabId, { pinned });
  return { tabId, pinned };
}

export async function mute(params) {
  const tabId = parseInt(params.id || params.tabId, 10);
  const muted = params.muted !== 'false' && params.muted !== false;

  if (!tabId) throw new Error('Tab ID required');

  await chrome.tabs.update(tabId, { muted });
  return { tabId, muted };
}

export async function move(params) {
  const tabId = parseInt(params.id || params.tabId, 10);
  const index = parseInt(params.index, 10);
  const windowId = params.windowId ? parseInt(params.windowId, 10) : undefined;

  if (!tabId) throw new Error('Tab ID required');
  if (isNaN(index)) throw new Error('Index required');

  const moveProps = { index };
  if (windowId) moveProps.windowId = windowId;

  await chrome.tabs.move(tabId, moveProps);
  return { moved: tabId, index, windowId };
}

export async function duplicate(params) {
  const tabId = parseInt(params.id || params.tabId, 10);
  if (!tabId) throw new Error('Tab ID required');

  const newTab = await chrome.tabs.duplicate(tabId);
  return { originalId: tabId, newId: newTab.id };
}

export async function goBack(params) {
  const tabId = parseInt(params.id || params.tabId, 10);

  if (tabId) {
    await chrome.tabs.goBack(tabId);
    return { tabId, action: 'back' };
  } else {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
      await chrome.tabs.goBack(activeTab.id);
      return { tabId: activeTab.id, action: 'back' };
    }
    throw new Error('No active tab');
  }
}

export async function goForward(params) {
  const tabId = parseInt(params.id || params.tabId, 10);

  if (tabId) {
    await chrome.tabs.goForward(tabId);
    return { tabId, action: 'forward' };
  } else {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
      await chrome.tabs.goForward(activeTab.id);
      return { tabId: activeTab.id, action: 'forward' };
    }
    throw new Error('No active tab');
  }
}

// Tab groups
export async function group(params) {
  let tabIds = params.id || params.tabId || params.ids;

  if (typeof tabIds === 'string') {
    tabIds = tabIds.split(',').map(id => parseInt(id.trim(), 10));
  } else if (typeof tabIds === 'number') {
    tabIds = [tabIds];
  }

  if (!tabIds || tabIds.length === 0) throw new Error('Tab ID(s) required');

  const groupId = await chrome.tabs.group({ tabIds });

  if (params.title || params.color) {
    const updateProps = {};
    if (params.title) updateProps.title = params.title;
    if (params.color) updateProps.color = params.color;
    await chrome.tabGroups.update(groupId, updateProps);
  }

  return { groupId, tabIds };
}

export async function ungroup(params) {
  let tabIds = params.id || params.tabId || params.ids;

  if (typeof tabIds === 'string') {
    tabIds = tabIds.split(',').map(id => parseInt(id.trim(), 10));
  } else if (typeof tabIds === 'number') {
    tabIds = [tabIds];
  }

  if (!tabIds || tabIds.length === 0) throw new Error('Tab ID(s) required');

  await chrome.tabs.ungroup(tabIds);
  return { ungrouped: tabIds };
}

export async function listGroups(params) {
  const windowId = params.windowId ? parseInt(params.windowId, 10) : undefined;

  const queryInfo = {};
  if (windowId) queryInfo.windowId = windowId;

  const groups = await chrome.tabGroups.query(queryInfo);
  return groups.map(g => ({
    id: g.id,
    windowId: g.windowId,
    title: g.title,
    color: g.color,
    collapsed: g.collapsed
  }));
}

export async function updateGroup(params) {
  const groupId = parseInt(params.id || params.groupId, 10);
  if (!groupId) throw new Error('Group ID required');

  const updateProps = {};
  if (params.title !== undefined) updateProps.title = params.title;
  if (params.color) updateProps.color = params.color;
  if (params.collapsed !== undefined) updateProps.collapsed = params.collapsed === 'true' || params.collapsed === true;

  await chrome.tabGroups.update(groupId, updateProps);
  return { groupId, updated: Object.keys(updateProps) };
}

// Wait for tab to finish loading
export async function waitForLoad(params) {
  const tabId = params.id ? parseInt(params.id, 10) : null;
  const timeout = params.timeout ? parseInt(params.timeout, 10) : 30000;

  let targetTabId = tabId;
  if (!targetTabId) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) throw new Error('No active tab');
    targetTabId = activeTab.id;
  }

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkTab = async () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for page load'));
        return;
      }

      try {
        const tab = await chrome.tabs.get(targetTabId);
        if (tab.status === 'complete') {
          resolve({ loaded: true, tabId: targetTabId, url: tab.url, title: tab.title });
        } else {
          setTimeout(checkTab, 100);
        }
      } catch (e) {
        reject(new Error(`Tab not found: ${targetTabId}`));
      }
    };

    checkTab();
  });
}

// Find tabs by various criteria
export async function find(params) {
  const tabs = await chrome.tabs.query({});
  let results = tabs;

  // Filter by URL pattern (glob-like)
  if (params.url) {
    const pattern = params.url.replace(/\*/g, '.*').replace(/\?/g, '.');
    const regex = new RegExp(pattern, 'i');
    results = results.filter(t => regex.test(t.url));
  }

  // Filter by title pattern
  if (params.title) {
    const pattern = params.title.replace(/\*/g, '.*').replace(/\?/g, '.');
    const regex = new RegExp(pattern, 'i');
    results = results.filter(t => regex.test(t.title));
  }

  // Filter by index
  if (params.index !== undefined) {
    const idx = parseInt(params.index, 10);
    results = results.filter(t => t.index === idx);
  }

  return results.map(tab => ({
    id: tab.id,
    windowId: tab.windowId,
    index: tab.index,
    url: tab.url,
    title: tab.title,
    active: tab.active
  }));
}
