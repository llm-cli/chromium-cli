// DOM interaction API

async function getTargetTabId(params) {
  if (params.tabId || params.id) {
    return parseInt(params.tabId || params.id, 10);
  }
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab) throw new Error('No active tab');
  return activeTab.id;
}

function buildSelector(params, key = 'selector') {
  if (params.xpath) {
    return { type: 'xpath', value: params.xpath };
  }
  const selectorValue = params[key] || params.selector || params.css;
  if (selectorValue) {
    return { type: 'css', value: selectorValue };
  }
  throw new Error('Selector required (selector, css, or xpath)');
}

function getFrameSelector(params) {
  if (params.frame) {
    return { type: 'css', value: params.frame };
  }
  return null;
}

async function executeScript(tabId, func, args = []) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args
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

// Helper: get document (handles iframe)
function _getDoc(frameSel) {
  if (!frameSel) return document;
  const iframe = document.querySelector(frameSel.value);
  if (!iframe) return { __error: 'Frame not found: ' + frameSel.value };
  if (iframe.tagName !== 'IFRAME') return { __error: 'Element is not an iframe' };
  try {
    return iframe.contentDocument || iframe.contentWindow.document;
  } catch (e) {
    return { __error: 'Cannot access iframe (cross-origin)' };
  }
}

// Helper: find single element
function _findEl(doc, sel) {
  if (sel.type === 'xpath') {
    const result = doc.evaluate(sel.value, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return result.singleNodeValue;
  }
  return doc.querySelector(sel.value);
}

// Helper: find multiple elements
function _findEls(doc, sel, limit) {
  if (sel.type === 'xpath') {
    const result = doc.evaluate(sel.value, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    const els = [];
    for (let i = 0; i < Math.min(result.snapshotLength, limit); i++) {
      els.push(result.snapshotItem(i));
    }
    return els;
  }
  return Array.from(doc.querySelectorAll(sel.value)).slice(0, limit);
}

// Query elements
export async function query(params) {
  const tabId = await getTargetTabId(params);
  const sel = buildSelector(params);
  const frameSel = getFrameSelector(params);
  const limit = params.limit ? parseInt(params.limit, 10) : 100;

  return executeScript(tabId, (sel, frameSel, limit) => {
    try {
      let doc = document;
      if (frameSel) {
        const iframe = document.querySelector(frameSel.value);
        if (!iframe) return { __error: 'Frame not found' };
        try { doc = iframe.contentDocument || iframe.contentWindow.document; }
        catch (e) { return { __error: 'Cannot access iframe (cross-origin)' }; }
      }

      let elements;
      if (sel.type === 'xpath') {
        const result = doc.evaluate(sel.value, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        elements = [];
        for (let i = 0; i < Math.min(result.snapshotLength, limit); i++) {
          elements.push(result.snapshotItem(i));
        }
      } else {
        elements = Array.from(doc.querySelectorAll(sel.value)).slice(0, limit);
      }

      return elements.map((el, i) => ({
        index: i,
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        classes: Array.from(el.classList),
        text: el.textContent?.slice(0, 200),
        visible: el.offsetParent !== null,
        rect: el.getBoundingClientRect().toJSON()
      }));
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [sel, frameSel, limit]);
}

// Get element text
export async function getText(params) {
  const tabId = await getTargetTabId(params);
  const sel = buildSelector(params);
  const frameSel = getFrameSelector(params);

  return executeScript(tabId, (sel, frameSel) => {
    try {
      let doc = document;
      if (frameSel) {
        const iframe = document.querySelector(frameSel.value);
        if (!iframe) return { __error: 'Frame not found' };
        try { doc = iframe.contentDocument || iframe.contentWindow.document; }
        catch (e) { return { __error: 'Cannot access iframe (cross-origin)' }; }
      }
      let el;
      if (sel.type === 'xpath') {
        const result = doc.evaluate(sel.value, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        el = result.singleNodeValue;
      } else {
        el = doc.querySelector(sel.value);
      }
      if (!el) return { __error: 'Element not found' };
      return el.textContent;
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [sel, frameSel]);
}

// Get element HTML
export async function getHtml(params) {
  const tabId = await getTargetTabId(params);
  const sel = buildSelector(params);
  const frameSel = getFrameSelector(params);
  const outer = params.outer === 'true' || params.outer === true;

  return executeScript(tabId, (sel, frameSel, outer) => {
    try {
      let doc = document;
      if (frameSel) {
        const iframe = document.querySelector(frameSel.value);
        if (!iframe) return { __error: 'Frame not found' };
        try { doc = iframe.contentDocument || iframe.contentWindow.document; }
        catch (e) { return { __error: 'Cannot access iframe (cross-origin)' }; }
      }
      let el;
      if (sel.type === 'xpath') {
        const result = doc.evaluate(sel.value, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        el = result.singleNodeValue;
      } else {
        el = doc.querySelector(sel.value);
      }
      if (!el) return { __error: 'Element not found' };
      return outer ? el.outerHTML : el.innerHTML;
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [sel, frameSel, outer]);
}

// Get element attribute
export async function getAttribute(params) {
  const tabId = await getTargetTabId(params);
  const sel = buildSelector(params);
  const attr = params.attr || params.attribute;

  if (!attr) throw new Error('Attribute name required');

  return executeScript(tabId, (sel, attr) => {
    try {
      let el;
      if (sel.type === 'xpath') {
        const result = document.evaluate(sel.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        el = result.singleNodeValue;
      } else {
        el = document.querySelector(sel.value);
      }
      if (!el) return { __error: 'Element not found' };
      return el.getAttribute(attr);
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [sel, attr]);
}

// Get all attributes
export async function getAttributes(params) {
  const tabId = await getTargetTabId(params);
  const sel = buildSelector(params);

  return executeScript(tabId, (sel) => {
    try {
      let el;
      if (sel.type === 'xpath') {
        const result = document.evaluate(sel.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        el = result.singleNodeValue;
      } else {
        el = document.querySelector(sel.value);
      }
      if (!el) return { __error: 'Element not found' };
      const attrs = {};
      for (const attr of el.attributes) {
        attrs[attr.name] = attr.value;
      }
      return attrs;
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [sel]);
}

// Click element
export async function click(params) {
  const tabId = await getTargetTabId(params);
  const sel = buildSelector(params);
  const frameSel = getFrameSelector(params);

  return executeScript(tabId, (sel, frameSel) => {
    try {
      let doc = document;
      if (frameSel) {
        const iframe = document.querySelector(frameSel.value);
        if (!iframe) return { __error: 'Frame not found' };
        try { doc = iframe.contentDocument || iframe.contentWindow.document; }
        catch (e) { return { __error: 'Cannot access iframe (cross-origin)' }; }
      }
      let el;
      if (sel.type === 'xpath') {
        const result = doc.evaluate(sel.value, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        el = result.singleNodeValue;
      } else {
        el = doc.querySelector(sel.value);
      }
      if (!el) return { __error: 'Element not found' };
      el.click();
      return { clicked: true, tag: el.tagName.toLowerCase() };
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [sel, frameSel]);
}

// Fill input
export async function fill(params) {
  const tabId = await getTargetTabId(params);
  const sel = buildSelector(params);
  const frameSel = getFrameSelector(params);
  const value = params.value;

  if (value === undefined) throw new Error('Value required');

  return executeScript(tabId, (sel, frameSel, value) => {
    try {
      let doc = document;
      if (frameSel) {
        const iframe = document.querySelector(frameSel.value);
        if (!iframe) return { __error: 'Frame not found' };
        try { doc = iframe.contentDocument || iframe.contentWindow.document; }
        catch (e) { return { __error: 'Cannot access iframe (cross-origin)' }; }
      }
      let el;
      if (sel.type === 'xpath') {
        const result = doc.evaluate(sel.value, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        el = result.singleNodeValue;
      } else {
        el = doc.querySelector(sel.value);
      }
      if (!el) return { __error: 'Element not found' };

      el.focus();
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      return { filled: true, value };
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [sel, frameSel, value]);
}

// Type text (simulating keystrokes)
export async function type(params) {
  const tabId = await getTargetTabId(params);
  const sel = buildSelector(params);
  const frameSel = getFrameSelector(params);
  const text = params.text || params.value;

  if (!text) throw new Error('Text required');

  return executeScript(tabId, (sel, frameSel, text) => {
    try {
      let doc = document;
      if (frameSel) {
        const iframe = document.querySelector(frameSel.value);
        if (!iframe) return { __error: 'Frame not found' };
        try { doc = iframe.contentDocument || iframe.contentWindow.document; }
        catch (e) { return { __error: 'Cannot access iframe (cross-origin)' }; }
      }
      let el;
      if (sel.type === 'xpath') {
        const result = doc.evaluate(sel.value, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        el = result.singleNodeValue;
      } else {
        el = doc.querySelector(sel.value);
      }
      if (!el) return { __error: 'Element not found' };

      el.focus();
      for (const char of text) {
        el.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
        if (el.value !== undefined) el.value += char;
        el.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      return { typed: true, text };
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [sel, frameSel, text]);
}

// Clear input
export async function clear(params) {
  const tabId = await getTargetTabId(params);
  const sel = buildSelector(params);

  return executeScript(tabId, (sel) => {
    try {
      let el;
      if (sel.type === 'xpath') {
        const result = document.evaluate(sel.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        el = result.singleNodeValue;
      } else {
        el = document.querySelector(sel.value);
      }
      if (!el) return { __error: 'Element not found' };

      el.focus();
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      return { cleared: true };
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [sel]);
}

// Scroll
export async function scroll(params) {
  const tabId = await getTargetTabId(params);
  const x = parseInt(params.x || '0', 10);
  const y = parseInt(params.y || '0', 10);
  const behavior = params.behavior || 'smooth';

  if (params.selector || params.css || params.xpath) {
    const sel = buildSelector(params);
    return executeScript(tabId, (sel, behavior) => {
      try {
        let el;
        if (sel.type === 'xpath') {
          const result = document.evaluate(sel.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          el = result.singleNodeValue;
        } else {
          el = document.querySelector(sel.value);
        }
        if (!el) return { __error: 'Element not found' };
        el.scrollIntoView({ behavior, block: 'center' });
        return { scrolledTo: 'element' };
      } catch (e) {
        return { __error: e.message || String(e) };
      }
    }, [sel, behavior]);
  }

  return executeScript(tabId, (x, y, behavior) => {
    try {
      window.scrollBy({ left: x, top: y, behavior });
      return { scrolled: { x, y } };
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [x, y, behavior]);
}

// Scroll to position
export async function scrollTo(params) {
  const tabId = await getTargetTabId(params);
  const x = parseInt(params.x || '0', 10);
  const y = parseInt(params.y || '0', 10);
  const behavior = params.behavior || 'smooth';

  return executeScript(tabId, (x, y, behavior) => {
    try {
      window.scrollTo({ left: x, top: y, behavior });
      return { scrolledTo: { x, y } };
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [x, y, behavior]);
}

// Focus element
export async function focus(params) {
  const tabId = await getTargetTabId(params);
  const sel = buildSelector(params);

  return executeScript(tabId, (sel) => {
    try {
      let el;
      if (sel.type === 'xpath') {
        const result = document.evaluate(sel.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        el = result.singleNodeValue;
      } else {
        el = document.querySelector(sel.value);
      }
      if (!el) return { __error: 'Element not found' };
      el.focus();
      return { focused: true };
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [sel]);
}

// Hover element
export async function hover(params) {
  const tabId = await getTargetTabId(params);
  const sel = buildSelector(params);

  return executeScript(tabId, (sel) => {
    try {
      let el;
      if (sel.type === 'xpath') {
        const result = document.evaluate(sel.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        el = result.singleNodeValue;
      } else {
        el = document.querySelector(sel.value);
      }
      if (!el) return { __error: 'Element not found' };

      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      return { hovered: true };
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [sel]);
}

// Select option in <select>
export async function select(params) {
  const tabId = await getTargetTabId(params);
  const sel = buildSelector(params);
  const value = params.value;
  const text = params.text;
  const index = params.index !== undefined ? parseInt(params.index, 10) : undefined;

  return executeScript(tabId, (sel, value, text, index) => {
    try {
      let el;
      if (sel.type === 'xpath') {
        const result = document.evaluate(sel.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        el = result.singleNodeValue;
      } else {
        el = document.querySelector(sel.value);
      }
      if (!el) return { __error: 'Element not found' };
      if (el.tagName !== 'SELECT') return { __error: 'Element is not a select' };

      if (index !== undefined) {
        el.selectedIndex = index;
      } else if (value !== undefined) {
        el.value = value;
      } else if (text !== undefined) {
        const option = Array.from(el.options).find(o => o.text === text);
        if (option) el.value = option.value;
        else return { __error: 'Option not found' };
      }

      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { selected: el.value };
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [sel, value, text, index]);
}

// Execute arbitrary JavaScript
export async function execute(params) {
  const tabId = await getTargetTabId(params);
  const code = params.code || params.script || params.js;

  if (!code) throw new Error('Code required');

  return executeScript(tabId, (code) => {
    try {
      return eval(code);
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [code]);
}

// Get page info
export async function getPageInfo(params) {
  const tabId = await getTargetTabId(params);

  return executeScript(tabId, () => {
    try {
      return {
        url: window.location.href,
        title: document.title,
        domain: window.location.hostname,
        protocol: window.location.protocol,
        path: window.location.pathname,
        hash: window.location.hash,
        search: window.location.search,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        documentHeight: document.documentElement.scrollHeight,
        documentWidth: document.documentElement.scrollWidth
      };
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  });
}

// Wait for element
export async function waitFor(params) {
  const tabId = await getTargetTabId(params);
  const sel = buildSelector(params);
  const timeout = parseInt(params.timeout || '10000', 10);
  const interval = parseInt(params.interval || '100', 10);

  return executeScript(tabId, (sel, timeout, interval) => {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const check = () => {
        try {
          let el;
          if (sel.type === 'xpath') {
            const result = document.evaluate(sel.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            el = result.singleNodeValue;
          } else {
            el = document.querySelector(sel.value);
          }

          if (el) {
            resolve({
              found: true,
              elapsed: Date.now() - startTime,
              tag: el.tagName.toLowerCase()
            });
            return;
          }

          if (Date.now() - startTime >= timeout) {
            resolve({ __error: 'Timeout waiting for element' });
            return;
          }

          setTimeout(check, interval);
        } catch (e) {
          resolve({ __error: e.message || String(e) });
        }
      };

      check();
    });
  }, [sel, timeout, interval]);
}

// Check if element exists
export async function exists(params) {
  const tabId = await getTargetTabId(params);
  const sel = buildSelector(params);

  return executeScript(tabId, (sel) => {
    try {
      let el;
      if (sel.type === 'xpath') {
        const result = document.evaluate(sel.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        el = result.singleNodeValue;
      } else {
        el = document.querySelector(sel.value);
      }
      return el !== null;
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [sel]);
}

// Count elements matching selector
export async function count(params) {
  const tabId = await getTargetTabId(params);
  const sel = buildSelector(params);

  return executeScript(tabId, (sel) => {
    try {
      if (sel.type === 'xpath') {
        const result = document.evaluate(sel.value, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        return result.snapshotLength;
      } else {
        return document.querySelectorAll(sel.value).length;
      }
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [sel]);
}

// Check if element is visible
export async function visible(params) {
  const tabId = await getTargetTabId(params);
  const sel = buildSelector(params);

  return executeScript(tabId, (sel) => {
    try {
      let el;
      if (sel.type === 'xpath') {
        const result = document.evaluate(sel.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        el = result.singleNodeValue;
      } else {
        el = document.querySelector(sel.value);
      }

      if (!el) return false;

      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return false;
      }

      const inViewport = (
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
      );

      return inViewport;
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [sel]);
}

// Drag and drop element
export async function drag(params) {
  const tabId = await getTargetTabId(params);
  const fromSel = buildSelector({ selector: params.from || params.source });
  const toSel = buildSelector({ selector: params.to || params.target || params.destination });
  const frameSel = getFrameSelector(params);

  return executeScript(tabId, (fromSel, toSel, frameSel) => {
    try {
      let doc = document;
      if (frameSel) {
        const iframe = document.querySelector(frameSel.value);
        if (!iframe) return { __error: 'Frame not found' };
        try { doc = iframe.contentDocument || iframe.contentWindow.document; }
        catch (e) { return { __error: 'Cannot access iframe (cross-origin)' }; }
      }

      let fromEl;
      if (fromSel.type === 'xpath') {
        const result = doc.evaluate(fromSel.value, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        fromEl = result.singleNodeValue;
      } else {
        fromEl = doc.querySelector(fromSel.value);
      }
      if (!fromEl) return { __error: 'Source element not found' };

      let toEl;
      if (toSel.type === 'xpath') {
        const result = doc.evaluate(toSel.value, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        toEl = result.singleNodeValue;
      } else {
        toEl = doc.querySelector(toSel.value);
      }
      if (!toEl) return { __error: 'Target element not found' };

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      const fromX = fromRect.left + fromRect.width / 2;
      const fromY = fromRect.top + fromRect.height / 2;
      const toX = toRect.left + toRect.width / 2;
      const toY = toRect.top + toRect.height / 2;

      const dataTransfer = new DataTransfer();

      fromEl.dispatchEvent(new DragEvent('dragstart', {
        bubbles: true, cancelable: true, dataTransfer, clientX: fromX, clientY: fromY
      }));
      fromEl.dispatchEvent(new DragEvent('drag', {
        bubbles: true, cancelable: true, dataTransfer, clientX: fromX, clientY: fromY
      }));
      toEl.dispatchEvent(new DragEvent('dragenter', {
        bubbles: true, cancelable: true, dataTransfer, clientX: toX, clientY: toY
      }));
      toEl.dispatchEvent(new DragEvent('dragover', {
        bubbles: true, cancelable: true, dataTransfer, clientX: toX, clientY: toY
      }));
      toEl.dispatchEvent(new DragEvent('drop', {
        bubbles: true, cancelable: true, dataTransfer, clientX: toX, clientY: toY
      }));
      fromEl.dispatchEvent(new DragEvent('dragend', {
        bubbles: true, cancelable: true, dataTransfer, clientX: toX, clientY: toY
      }));

      return {
        dragged: true,
        from: { selector: fromSel.value, tag: fromEl.tagName.toLowerCase() },
        to: { selector: toSel.value, tag: toEl.tagName.toLowerCase() }
      };
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [fromSel, toSel, frameSel]);
}

// Upload file to input[type=file]
export async function upload(params) {
  const tabId = await getTargetTabId(params);
  const sel = buildSelector(params);
  const frameSel = getFrameSelector(params);
  const fileData = params.fileData;
  const fileName = params.fileName || 'file';
  const mimeType = params.mimeType || 'application/octet-stream';

  if (!fileData) throw new Error('File data required (base64 encoded)');

  return executeScript(tabId, (sel, frameSel, fileData, fileName, mimeType) => {
    try {
      let doc = document;
      if (frameSel) {
        const iframe = document.querySelector(frameSel.value);
        if (!iframe) return { __error: 'Frame not found' };
        try { doc = iframe.contentDocument || iframe.contentWindow.document; }
        catch (e) { return { __error: 'Cannot access iframe (cross-origin)' }; }
      }

      let el;
      if (sel.type === 'xpath') {
        const result = doc.evaluate(sel.value, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        el = result.singleNodeValue;
      } else {
        el = doc.querySelector(sel.value);
      }
      if (!el) return { __error: 'Element not found' };
      if (el.tagName !== 'INPUT' || el.type !== 'file') {
        return { __error: 'Element is not a file input' };
      }

      const binaryString = atob(fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const file = new File([bytes], fileName, { type: mimeType });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      el.files = dataTransfer.files;

      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('input', { bubbles: true }));

      return { uploaded: true, fileName, size: bytes.length, mimeType };
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  }, [sel, frameSel, fileData, fileName, mimeType]);
}

// List iframes on page
export async function listFrames(params) {
  const tabId = await getTargetTabId(params);

  return executeScript(tabId, () => {
    try {
      const iframes = document.querySelectorAll('iframe');
      return Array.from(iframes).map((iframe, i) => {
        let accessible = false;
        let url = null;
        try {
          url = iframe.contentWindow?.location?.href;
          accessible = true;
        } catch (e) {
          url = iframe.src || null;
        }
        return {
          index: i,
          id: iframe.id || null,
          name: iframe.name || null,
          src: iframe.src || null,
          url: url,
          accessible: accessible,
          selector: iframe.id ? `#${iframe.id}` : (iframe.name ? `iframe[name="${iframe.name}"]` : `iframe:nth-of-type(${i + 1})`)
        };
      });
    } catch (e) {
      return { __error: e.message || String(e) };
    }
  });
}
