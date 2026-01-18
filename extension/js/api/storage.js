// Storage API (cookies, localStorage, sessionStorage)

async function getTargetTabId(params) {
  if (params.tabId || params.id) {
    return parseInt(params.tabId || params.id, 10);
  }
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab) throw new Error('No active tab');
  return activeTab.id;
}

async function getTabUrl(tabId) {
  const tab = await chrome.tabs.get(tabId);
  return new URL(tab.url);
}

async function executeScript(tabId, func, args = []) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args
  });
  if (results && results[0]) {
    if (results[0].error) throw new Error(results[0].error.message);
    return results[0].result;
  }
  return null;
}

// --- Cookies ---

export async function getCookies(params) {
  const url = params.url;
  const domain = params.domain;
  const name = params.name;

  const query = {};
  if (url) query.url = url;
  if (domain) query.domain = domain;
  if (name) query.name = name;

  if (!url && !domain) {
    const tabId = await getTargetTabId(params);
    const tabUrl = await getTabUrl(tabId);
    query.url = tabUrl.origin;
  }

  const cookies = await chrome.cookies.getAll(query);

  return cookies.map(c => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
    secure: c.secure,
    httpOnly: c.httpOnly,
    sameSite: c.sameSite,
    expirationDate: c.expirationDate
  }));
}

export async function getCookie(params) {
  const name = params.name;
  if (!name) throw new Error('Cookie name required');

  let url = params.url;
  if (!url) {
    const tabId = await getTargetTabId(params);
    const tabUrl = await getTabUrl(tabId);
    url = tabUrl.href;
  }

  const cookie = await chrome.cookies.get({ url, name });
  if (!cookie) return null;

  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    expirationDate: cookie.expirationDate
  };
}

export async function setCookie(params) {
  const name = params.name;
  const value = params.value;

  if (!name) throw new Error('Cookie name required');
  if (value === undefined) throw new Error('Cookie value required');

  let url = params.url;
  if (!url) {
    const tabId = await getTargetTabId(params);
    const tabUrl = await getTabUrl(tabId);
    url = tabUrl.href;
  }

  const cookieDetails = { url, name, value };

  if (params.domain) cookieDetails.domain = params.domain;
  if (params.path) cookieDetails.path = params.path;
  if (params.secure !== undefined) cookieDetails.secure = params.secure === 'true' || params.secure === true;
  if (params.httpOnly !== undefined) cookieDetails.httpOnly = params.httpOnly === 'true' || params.httpOnly === true;
  if (params.sameSite) cookieDetails.sameSite = params.sameSite;
  if (params.expirationDate) cookieDetails.expirationDate = parseFloat(params.expirationDate);

  const cookie = await chrome.cookies.set(cookieDetails);
  return { set: true, name: cookie?.name };
}

export async function deleteCookie(params) {
  const name = params.name;
  if (!name) throw new Error('Cookie name required');

  let url = params.url;
  if (!url) {
    const tabId = await getTargetTabId(params);
    const tabUrl = await getTabUrl(tabId);
    url = tabUrl.href;
  }

  await chrome.cookies.remove({ url, name });
  return { deleted: name };
}

export async function clearCookies(params) {
  let url = params.url;
  const domain = params.domain;

  const query = {};
  if (url) query.url = url;
  if (domain) query.domain = domain;

  if (!url && !domain) {
    const tabId = await getTargetTabId(params);
    const tabUrl = await getTabUrl(tabId);
    query.url = tabUrl.origin;
  }

  const cookies = await chrome.cookies.getAll(query);
  const targetUrl = url || `https://${domain}`;

  for (const cookie of cookies) {
    const cookieUrl = `${cookie.secure ? 'https' : 'http'}://${cookie.domain}${cookie.path}`;
    await chrome.cookies.remove({ url: cookieUrl, name: cookie.name });
  }

  return { cleared: cookies.length };
}

// --- localStorage ---

export async function getLocalStorage(params) {
  const tabId = await getTargetTabId(params);
  const key = params.key;

  return executeScript(tabId, (key) => {
    if (key) {
      return localStorage.getItem(key);
    }
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      data[k] = localStorage.getItem(k);
    }
    return data;
  }, [key]);
}

export async function setLocalStorage(params) {
  const tabId = await getTargetTabId(params);
  const key = params.key;
  const value = params.value;

  if (!key) throw new Error('Key required');
  if (value === undefined) throw new Error('Value required');

  return executeScript(tabId, (key, value) => {
    localStorage.setItem(key, value);
    return { set: true, key };
  }, [key, value]);
}

export async function deleteLocalStorage(params) {
  const tabId = await getTargetTabId(params);
  const key = params.key;

  if (!key) throw new Error('Key required');

  return executeScript(tabId, (key) => {
    localStorage.removeItem(key);
    return { deleted: key };
  }, [key]);
}

export async function clearLocalStorage(params) {
  const tabId = await getTargetTabId(params);

  return executeScript(tabId, () => {
    const count = localStorage.length;
    localStorage.clear();
    return { cleared: count };
  });
}

// --- sessionStorage ---

export async function getSessionStorage(params) {
  const tabId = await getTargetTabId(params);
  const key = params.key;

  return executeScript(tabId, (key) => {
    if (key) {
      return sessionStorage.getItem(key);
    }
    const data = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      data[k] = sessionStorage.getItem(k);
    }
    return data;
  }, [key]);
}

export async function setSessionStorage(params) {
  const tabId = await getTargetTabId(params);
  const key = params.key;
  const value = params.value;

  if (!key) throw new Error('Key required');
  if (value === undefined) throw new Error('Value required');

  return executeScript(tabId, (key, value) => {
    sessionStorage.setItem(key, value);
    return { set: true, key };
  }, [key, value]);
}

export async function deleteSessionStorage(params) {
  const tabId = await getTargetTabId(params);
  const key = params.key;

  if (!key) throw new Error('Key required');

  return executeScript(tabId, (key) => {
    sessionStorage.removeItem(key);
    return { deleted: key };
  }, [key]);
}

export async function clearSessionStorage(params) {
  const tabId = await getTargetTabId(params);

  return executeScript(tabId, () => {
    const count = sessionStorage.length;
    sessionStorage.clear();
    return { cleared: count };
  });
}
