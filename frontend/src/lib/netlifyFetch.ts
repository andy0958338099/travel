/**
 * 以 node:https 實作的 fetch
 *
 * 為什麼不用 global fetch：
 *   Next.js 會 patch global fetch（做自己的 request 快取/去重），
 *   在 server runtime 讀取數 MB 的 Netlify Blobs 內容時會卡住不返回。
 *   node:https 不受 patch 影響，行為可預測。
 *
 * 傳給 @netlify/blobs SDK 的 `fetch` option 使用。
 */

import https from "https";

export function nodeFetch(url: string | URL, init?: RequestInit): Promise<Response> {
  const u = new URL(url.toString());
  const method = (init?.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {};

  const rawHeaders = init?.headers;
  if (rawHeaders) {
    if (Array.isArray(rawHeaders)) {
      for (const [k, v] of rawHeaders) headers[k] = v;
    } else {
      Object.assign(headers, rawHeaders as Record<string, string>);
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.from(c)));
        res.on("error", reject);
        res.on("end", () => {
          const body = Buffer.concat(chunks);
          resolve(
            new Response(body as unknown as BodyInit, {
              status: res.statusCode ?? 500,
              headers: res.headers as unknown as HeadersInit,
            }),
          );
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(60000, () => req.destroy(new Error("request timeout")));
    if (init?.body) {
      req.write(init.body as any);
    }
    req.end();
  });
}
