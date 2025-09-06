import { ProxyFetchRequest } from './types';

function injectScript(): void {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('dist/injected.bundle.js');

    script.addEventListener('load', function() {
      console.log(
        '%cytc-bridge%c Initialized successfully.',
        'background-color: #28a745; color: white; padding: 2px 4px; border-radius: 3px; font-weight: bold;',
        'background-color: transparent; color: inherit;'
      );
      this.remove();
    });

    (document.head || document.documentElement).appendChild(script);

    window.addEventListener('message', (event: MessageEvent) => {
      if (event.source !== window || !event.data || event.data.type !== 'PROXY_FETCH_REQUEST')
        return;

      const request = event.data as ProxyFetchRequest;

      // Hand it over to the bg script.
      chrome.runtime.sendMessage({
        action: 'fetch',
        url: request.url,
        options: request.options
      }, (response) => {
        window.postMessage({
          type: 'PROXY_FETCH_RESPONSE',
          requestId: request.requestId,
          ...response
        }, '*');
      });
    });
  } catch (e) {
    console.error(
      '%cytc-bridge%c Script injection failed.',
      'background-color: #dc3545; color: white; padding: 2px 4px; border-radius: 3px; font-weight: bold;',
      'background-color: transparent; color: inherit;',
      e
    );
  }
}

injectScript();