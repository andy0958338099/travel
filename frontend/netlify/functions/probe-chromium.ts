/**
 * 探測 function: 驗證 Chromium 能否在 Netlify function 環境啟動並渲染 PDF。
 * ⚠️ 這是臨時探測,驗證完會刪除。
 */
import type { Config } from "@netlify/functions";
import chromiumPkg from "@sparticuz/chromium";

const chromium = chromiumPkg as any;
import puppeteer from "puppeteer-core";

export default async (req: Request): Promise<Response> => {
  const t0 = Date.now();
  const log: string[] = [];
  try {
    log.push(`chromium pkg loaded`);
    const executablePath = await chromium.executablePath();
    log.push(`executablePath=${executablePath}`);

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 800, height: 1200 },
      executablePath,
      headless: true,
    });
    log.push(`browser launched (${Date.now() - t0}ms)`);

    const page = await browser.newPage();
    await page.setContent(
      `<html><head><style>@page{size:A5;margin:0}body{font-family:sans-serif}</style></head>
       <body><h1>中文測試 江南 A5</h1><p>繁體中文排版測試</p></body></html>`,
      { waitUntil: "domcontentloaded" },
    );
    const pdf = await page.pdf({
      format: "A5",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    log.push(`pdf ${pdf.length} bytes`);

    // 測試能不能連出去 + 讀正式站
    const siteRes = await fetch(
      "https://travel-china.netlify.app/story-blog-custom/preview/843ta5hr?print=1",
      { headers: { "User-Agent": "probe" } },
    );
    log.push(`site fetch status=${siteRes.status} len=${siteRes.headers.get("content-length")}`);

    await browser.close();
    return Response.json({ ok: true, log, ms: Date.now() - t0 });
  } catch (e) {
    return Response.json(
      { ok: false, error: (e as Error).message, log, ms: Date.now() - t0 },
      { status: 500 },
    );
  }
};

export const config: Config = {
  path: "/probe-chromium",
};
