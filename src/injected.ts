import { PendingRequest, ProxyResponse, ProxyResponseData } from './types';

Object.assign(window, { ytcBridge: { installed: true } });

let requestId = 0;
const pendingRequests = new Map<number, PendingRequest>();

function uint8ArrayToBase64(array: Uint8Array<any>): string {
  let binary = '';
  const len = array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary);
}

(window as any).proxyFetch = function (url: string, options: RequestInit = {}): Promise<ProxyResponse> {
  return new Promise((resolve, reject) => {
    const currentRequestId = ++requestId;

    pendingRequests.set(currentRequestId, { resolve, reject });

    if (options.body instanceof ArrayBuffer) {
      options.body = new Uint8Array(options.body);
    }

    if (options.body instanceof Uint8Array) {
      options.body = uint8ArrayToBase64(options.body as any);
    }

    if (options.headers && options.headers instanceof Headers) {
      const headersObj: Record<string, string> = {};
      options.headers.forEach((value, key) => headersObj[key.trim()] = value);
      options.headers = headersObj;
    }

    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        pendingRequests.delete(currentRequestId);
        window.postMessage({
          type: 'PROXY_FETCH_RESPONSE',
          requestId: currentRequestId,
          success: false,
          error: 'Request aborted'
        }, '*');
      });
    }

    const optionsMod = {
      ...options,
      signal: undefined // Throws an error if left in...
    };

    window.postMessage({
      type: 'PROXY_FETCH_REQUEST',
      requestId: currentRequestId,
      url: url,
      options: optionsMod
    }, '*');
  });
};

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window || !event.data)
    return;

  if (event.data.type === 'PROXY_FETCH_RESPONSE') {
    const responseData = event.data as ProxyResponseData;
    const { requestId, success, ...otherData } = responseData;
    const request = pendingRequests.get(requestId);

    if (!request)
      return;

    pendingRequests.delete(requestId);

    if (success) {
      const response: ProxyResponse = {
        ok: otherData.status !== undefined && otherData.status >= 200 && otherData.status < 300,
        status: otherData.status ?? 200,
        statusText: otherData.statusText ?? '',
        headers: new Headers(otherData.headers ?? {}),
        url: otherData.url ?? '',
        json: () => Promise.resolve(otherData.data).then(data =>
          typeof data === 'string' ? JSON.parse(data) : data
        ),
        text: () => Promise.resolve(otherData.data).then(data =>
          typeof data === 'string' ? data : new TextDecoder().decode(data)
        ),
        arrayBuffer: () => Promise.resolve(otherData.data).then(data => {
          if (typeof data === 'string') {
            const binaryString = atob(data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
          } else if (typeof data === 'object') {
            return new TextEncoder().encode(JSON.stringify(data)).buffer;
          }
          throw new Error('Cannot convert data to ArrayBuffer');
        })
      };
      request.resolve(response);
    } else {
      request.reject(new Error(otherData.error));
    }
  }
});