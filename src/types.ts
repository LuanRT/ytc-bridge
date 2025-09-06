export type Rule = Omit<chrome.declarativeNetRequest.Rule, 'id'>;

export interface FetchRequest {
  action: string;
  url: string;
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string | Uint8Array<any>;
    [key: string]: any;
  };
}

export interface FetchResponse {
  success: boolean;
  data?: any;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  url?: string;
  error?: string;
  stack?: string;
}

export interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

export interface ProxyResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  url: string;
  json: () => Promise<any>;
  text: () => Promise<string>;
  arrayBuffer: () => Promise<ArrayBuffer>;
  blob?: () => Promise<Blob>;
}

export interface ProxyFetchRequest {
  type: string;
  requestId: number;
  url: string;
  options?: Record<string, any>;
}

export interface ProxyResponseData {
  type: string;
  requestId: number;
  success: boolean;
  data?: any;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  url?: string;
  error?: string;
}