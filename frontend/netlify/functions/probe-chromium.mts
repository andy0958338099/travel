/**
 * 探測 function: 驗證 Chromium 能否在 Netlify function 環境啟動並渲染 PDF。
 * ⚠️ 這是臨時探測,驗證完會刪除。
 *
 * ⚠️ 2026-11-16: Netlify 把 standalone function 打包成 CJS(.cjs),
 *    而 @sparticuz/chromium 是 ESM → 靜態 import 會在載入時爆
 *    "require() of ES Module ... not supported"。
 *    解法:用 dynamic import()。
 */
import type { Config } from "@netlify/functions";
import fs from "node:fs";
import path from "node:path";

/**
 * 最小 tar 解壓器(只處理 regular file)。
 *
 * 為什麼不用系統 tar:AL2023 AWS Lambda(Netlify function 的執行環境)
 * 沒有 tar 指令,spawnSync("tar") 會 ENOENT。
 * al2023.tar.br 內含 libnss3.so / libnssutil3.so / libnspr4.so 等
 * Chromium 在 AL2023 上必須的系統函式庫。
 */
function extractTar(buf: Buffer, dest: string): void {
  let off = 0;
  while (off + 512 <= buf.length) {
    const header = buf.subarray(off, off + 512);
    // 兩個全零 block = 結束
    if (header.every((b) => b === 0)) break;
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const sizeStr = header
      .subarray(124, 136)
      .toString("utf8")
      .replace(/\0.*$/, "")
      .trim();
    const size = parseInt(sizeStr, 8) || 0;
    const typeFlag = String.fromCharCode(header[156]);
    off += 512;
    if (typeFlag === "0" || typeFlag === "\0") {
      const outPath = path.join(dest, name);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, buf.subarray(off, off + size));
    }
    off += Math.ceil(size / 512) * 512;
  }
}

export default async (req: Request): Promise<Response> => {
  const t0 = Date.now();
  const log: string[] = [];
  try {
    const chromiumMod = await import("@sparticuz/chromium");
    const chromium: any = (chromiumMod as any).default ?? chromiumMod;
    const puppeteerMod = await import("puppeteer-core");
    const puppeteer: any = (puppeteerMod as any).default ?? puppeteerMod;
    log.push("chromium pkg loaded");

    // ⚠️ 2026-11-16: Netlify function 跑在 AWS Lambda,但 @sparticuz/chromium
    //    的環境偵測是靠 AWS_EXECUTION_ENV 判斷,Netlify 沒設這個變數 →
    //    不會自動解壓 al2023.tar.br(內含 libnss3.so 等 AL2023 系統函式庫)
    //    → Chromium 啟動時報 "error while loading shared libraries: libnss3.so"。
    //
    //    解法:自己手動做環境設定。
    //      1. 把 al2023.tar.br 解到 /tmp/al2023/lib
    //      2. LD_LIBRARY_PATH 加上它
    //      3. chromium.setGraphicsMode = false(不需要 GPU)
    //
    // ⚠️ /tmp 在 Lambda 只有 512MB,al2023 解壓約 3.5MB,安全。
    const zlib = await import("node:zlib");

    // ESM 沒有 require.resolve → 從 import.meta.url 推導套件路徑
    // (netlify/functions/ 往上兩層 = 專案根, node_modules 在那裡)
    const here = path.dirname(new URL(import.meta.url).pathname);
    const projectRoot = path.resolve(here, "..", "..");
    // ⚠️ 2026-11-16: Netlify function 實際跑在 Amazon Linux 2 (glibc 2.26),
    //    不是 AL2023 → 必須用 al2.tar.br,否則 libnspr4.so 會要求
    //    GLIBC_2.33/2.34 而啟動失敗。
    //    用 Node 報告的 runtime glibc 版本自動選對的函式庫。
    const glibcVer = (
      (process.report?.getReport() as any)?.header?.glibcVersionRuntime ?? ""
    );
    const glibcMinor = parseInt(glibcVer.split(".")[1] ?? "0", 10);
    const useAl2023 = glibcMinor >= 33;
    const tarName = useAl2023 ? "al2023.tar.br" : "al2.tar.br";
    const libRoot = useAl2023 ? "/tmp/al2023" : "/tmp/al2";
    const libDir = path.join(libRoot, "lib");
    const tarPath = path.join(
      projectRoot,
      "node_modules",
      "@sparticuz",
      "chromium",
      "bin",
      tarName,
    );
    log.push(`glibc=${glibcVer || "unknown"} → ${tarName}`);
    if (!fs.existsSync(path.join(libDir, "libnss3.so"))) {
      fs.mkdirSync(libDir, { recursive: true });
      // ⚠️ Lambda 沒有 tar 指令 → 用 Node 內建 zlib 解 brotli,
      //    再自己解析 tar 格式(只處理 regular file,足夠)。
      const tarBuf = zlib.brotliDecompressSync(fs.readFileSync(tarPath));
      extractTar(tarBuf, libRoot);
      log.push(`${tarName} libs extracted`);
    }
    process.env.LD_LIBRARY_PATH = [
      libDir,
      process.env.LD_LIBRARY_PATH,
    ]
      .filter(Boolean)
      .join(":");
    (chromium as any).setGraphicsMode = false;
    log.push(`LD_LIBRARY_PATH=${process.env.LD_LIBRARY_PATH}`);

    const executablePath = await chromium.executablePath();
    log.push(`executablePath=${executablePath}`);

    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
      ],
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
    const siteBody = await siteRes.text();
    log.push(
      `site fetch status=${siteRes.status} bytes=${siteBody.length} hasPrintPage=${siteBody.includes("print-book-page")}`,
    );

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
