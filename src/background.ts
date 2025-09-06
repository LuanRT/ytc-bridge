import { FetchRequest, FetchResponse, Rule } from './types';

// FIXME: Rarely, a request fails because a rule ID is already in use.
let ruleIdCounter = 4;

/**
 * Adds temporary network request rules.
 * @param addRules - The rules to add.
 */
async function addNetRequestRules(addRules: Rule[]): Promise<number[]> {
  const rulesWithIds = addRules.map(rule => {
    // Very, very, very unlikely... but just in case.
    if (ruleIdCounter > Number.MAX_SAFE_INTEGER) {
      ruleIdCounter = 4;
    }
    return { ...rule, id: ruleIdCounter++ };
  });

  await chrome.declarativeNetRequest.updateSessionRules({
    addRules: rulesWithIds
  });

  return rulesWithIds.map(rule => rule.id);
}

/**
 * Removes temporary network request rules by their IDs.
 * @param ruleIds - The IDs of the rules to remove.
 */
async function removeNetRequestRules(ruleIds: number[]): Promise<void> {
  if (ruleIds && ruleIds.length > 0) {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ruleIds });
  }
}

async function handleFetchRequest(request: FetchRequest, sendResponse: (response: FetchResponse) => void): Promise<void> {
  let addedRuleIds: number[] = [];

  try {
    const { url, options = {} } = request;

    const headers = options.headers || {};
    const requestHeaders: chrome.declarativeNetRequest.ModifyHeaderInfo[] = [];

    // Some endpoints return 403 Forbidden if the origin is not set to YouTube.
    headers['origin'] = 'https://www.youtube.com';

    for (const key in headers) {
      requestHeaders.push({ header: key, operation: 'set', value: headers[key] });
    }

    if (requestHeaders.length > 0) {
      const rulesToAdd: Rule[] = [ {
        action: { type: 'modifyHeaders', requestHeaders },
        condition: { urlFilter: url, resourceTypes: [ 'xmlhttprequest', 'main_frame' ] },
        priority: 1
      } ];
      addedRuleIds = await addNetRequestRules(rulesToAdd);
    }

    // Try to convert the body to a Uint8Array if it's base64d binary data.
    if (options.body && typeof options.body === 'string') {
      try {
        options.method = options.method || 'POST';
        options.body = Uint8Array.from(atob(options.body), c => c.charCodeAt(0));
      } catch (e) { }
    }

    const response = await fetch(url, {
      ...options,
      headers: {},
      credentials: 'omit'
    });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let data: unknown;

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // ProtoJSON makes this fail sometimes, so we have to wrap it inside a try-catch...
      data = await response.text();
      try {
        data = JSON.parse(<string>data);
      } catch (e) { /** no-op */ }
    } else if (contentType.includes('text/')) {
      data = await response.text();
    } else {
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      data = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
    }

    sendResponse({
      success: true,
      data: data,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      url: response.url
    });
  } catch (error: any) {
    sendResponse({
      success: false,
      error: error.message,
      stack: error.stack
    });
  } finally {
    await removeNetRequestRules(addedRuleIds);
  }
}

chrome.runtime.onInstalled.addListener(() => console.log('ytc-bridge background script installed.'));

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetch') {
    handleFetchRequest(request, sendResponse);
    return true;
  }
});