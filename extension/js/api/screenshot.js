// Screenshot API

async function getTargetTabId(params) {
  if (params.tabId || params.id) {
    return parseInt(params.tabId || params.id, 10);
  }
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab) throw new Error('No active tab');
  return activeTab.id;
}

async function getWindowIdForTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  return tab.windowId;
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

// Capture visible area
export async function visible(params) {
  const tabId = await getTargetTabId(params);
  const windowId = await getWindowIdForTab(tabId);
  const format = params.format || 'png';
  const quality = params.quality ? parseInt(params.quality, 10) : undefined;

  // Make sure the tab is active
  await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update(windowId, { focused: true });

  // Small delay to ensure rendering
  await new Promise(r => setTimeout(r, 100));

  const options = { format };
  if (format === 'jpeg' && quality) options.quality = quality;

  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, options);

  return {
    dataUrl,
    format,
    type: 'visible'
  };
}

// Capture full page (with scrolling)
export async function fullPage(params) {
  const tabId = await getTargetTabId(params);
  const windowId = await getWindowIdForTab(tabId);
  const format = params.format || 'png';
  const quality = params.quality ? parseInt(params.quality, 10) : undefined;

  // Make sure the tab is active
  await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update(windowId, { focused: true });

  // Get page dimensions
  const dimensions = await executeScript(tabId, () => {
    return {
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      originalScrollX: window.scrollX,
      originalScrollY: window.scrollY
    };
  });

  const { scrollHeight, viewportHeight, originalScrollX, originalScrollY } = dimensions;

  // If page fits in viewport, just capture visible
  if (scrollHeight <= viewportHeight) {
    return visible(params);
  }

  // Capture multiple screenshots and stitch
  const screenshots = [];
  const numCaptures = Math.ceil(scrollHeight / viewportHeight);

  const options = { format };
  if (format === 'jpeg' && quality) options.quality = quality;

  for (let i = 0; i < numCaptures; i++) {
    const scrollY = i * viewportHeight;

    await executeScript(tabId, (y) => {
      window.scrollTo(0, y);
    }, [scrollY]);

    // Wait for scroll and render
    await new Promise(r => setTimeout(r, 150));

    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, options);
    screenshots.push({
      dataUrl,
      scrollY,
      index: i
    });
  }

  // Restore original scroll position
  await executeScript(tabId, (x, y) => {
    window.scrollTo(x, y);
  }, [originalScrollX, originalScrollY]);

  // For full page, we return all the parts
  // The CLI or caller will need to stitch them together
  return {
    parts: screenshots,
    totalHeight: scrollHeight,
    viewportHeight,
    format,
    type: 'fullPage'
  };
}

// Capture specific element
export async function element(params) {
  const tabId = await getTargetTabId(params);
  const windowId = await getWindowIdForTab(tabId);
  const selector = params.selector || params.css;
  const xpath = params.xpath;
  const format = params.format || 'png';
  const quality = params.quality ? parseInt(params.quality, 10) : undefined;

  if (!selector && !xpath) {
    throw new Error('Selector required (selector, css, or xpath)');
  }

  // Make sure the tab is active
  await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update(windowId, { focused: true });

  // Scroll element into view and get its position
  const elementRect = await executeScript(tabId, (selector, xpath) => {
    let el;
    if (xpath) {
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      el = result.singleNodeValue;
    } else {
      el = document.querySelector(selector);
    }

    if (!el) throw new Error('Element not found');

    // Scroll into view
    el.scrollIntoView({ block: 'center', inline: 'center' });

    const rect = el.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };
  }, [selector, xpath]);

  // Wait for scroll and render
  await new Promise(r => setTimeout(r, 150));

  const options = { format };
  if (format === 'jpeg' && quality) options.quality = quality;

  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, options);

  // Return the full screenshot with crop info
  // The CLI will need to crop the image
  return {
    dataUrl,
    crop: {
      x: Math.round(elementRect.x),
      y: Math.round(elementRect.y),
      width: Math.round(elementRect.width),
      height: Math.round(elementRect.height)
    },
    format,
    type: 'element',
    selector: selector || xpath
  };
}

// Simple alias
export async function capture(params) {
  if (params.fullPage === 'true' || params.fullPage === true) {
    return fullPage(params);
  }
  if (params.selector || params.css || params.xpath) {
    return element(params);
  }
  return visible(params);
}
