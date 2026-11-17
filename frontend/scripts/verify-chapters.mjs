/**
 * 🆕 2026-11-17 驗證「章節結構」：每個 Day 扉頁後緊接本章文章
 *
 * 用法（在 frontend/ 底下執行，dev server 需在 localhost:3001 或 3000）:
 *   node scripts/verify-chapters.mjs
 *
 * 檢查項目:
 *   1. 每個 .print-book-chapter-intro 後緊接的頁面必須含本章文章
 *   2. 一頁最多只屬於一個 Day（不得跨章配對）
 *   3. 字級 >= 9pt
 *   4. 0 溢出 / 0 文字溢出 / 0 圖片裁切
 *   5. 章節篇數加總 == 全書篇數
 *
 * ⚠️ 這是「版面層」驗證，用 Puppeteer 量真實 DOM，
 *    不依賴估算 —— 與 scripts/check-text-integrity.mjs 的靜態檢查互補。
 */

import fs from "node:fs";
import path from "node:path";
import { existsSync } from "node:fs";

/** 找系統 Chrome（跟其它 scripts 一致） */
function fc() {
  for (const p of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"])
    if (existsSync(p)) return p;
}

const BASE = process.env.BASE_URL || "http://localhost:3001";
const SNAPSHOT = path.join(
  process.cwd(),
  "src",
  "data",
  "site-content.public.json",
);

async function main() {
  const raw = JSON.parse(fs.readFileSync(SNAPSHOT, "utf-8"));
  const books = (raw.books || []).filter((b) => b.share_slug);
  const postById = new Map((raw.posts || []).map((p) => [p.id, p]));

  console.log(`檢查 ${books.length} 本書 @ ${BASE}\n`);

  const puppeteerMod = await import("puppeteer-core");
  const puppeteer = puppeteerMod.default ?? puppeteerMod;
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: fc(),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  let fail = 0;
  let skipped = 0;
  const rows = [];

  for (const b of books) {
    const slug = b.share_slug;
    const ids = (b.selected_post_ids || []).filter((id) => postById.has(id));
    if (!ids.length) {
      // 空殼書：selected_post_ids 指向不存在的 post
      // （例如測試書用 00000000-0000-0000-0000-000000000002 這類佔位 ID）
      // → 沒有可驗證的內容,不算失敗,但要標出來避免被忽略。
      console.log(
        `⚠ ${slug}: 選了 ${(b.selected_post_ids || []).length} 篇但快照中都不存在` +
          `（空殼/測試書）→ 跳過`,
      );
      skipped++;
      continue;
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 1200 });
    try {
      await page.goto(
        `${BASE}/story-blog-custom/preview/${encodeURIComponent(
          slug,
        )}?book_slug=${encodeURIComponent(slug)}&print=1`,
        { waitUntil: "domcontentloaded", timeout: 90000 },
      );
      await page.waitForSelector(".print-book-page", { timeout: 60000 });
      // 等版面定稿（mode B 的量測完成）
      await page
        .waitForSelector('[data-layout-ready="1"]', { timeout: 60000 })
        .catch(() => {});
      await new Promise((r) => setTimeout(r, 2500));

      const res = await page.evaluate(() => {
        const pages = Array.from(document.querySelectorAll(".print-book-page"));
        const cells = Array.from(document.querySelectorAll(".print-book-b-cell"));

        // 1) 章節 → 本章文章的配對
        const chapters = [];
        let cur = null;
        let crossDay = 0;
        for (const p of pages) {
          const lbl = p.querySelector(".print-book-chapter-label");
          const meta = p.querySelector(".print-book-chapter-meta");
          const postEls = Array.from(p.querySelectorAll("[data-post-id]"));
          const dayHdr = p.querySelector(".print-book-pair-day-header");
          if (lbl) {
            cur = {
              intro: lbl.textContent.trim(),
              declared: meta ? parseInt(meta.textContent.replace(/\D+/g, ""), 10) : null,
              actual: 0,
              pages: 0,
              days: new Set(),
            };
            chapters.push(cur);
            continue;
          }
          if (!cur) continue;
          cur.pages++;
          for (const el of postEls) {
            cur.actual++;
            const id = el.getAttribute("data-post-id");
            const d = el.getAttribute("data-day-number");
            if (d) cur.days.add(Number(d));
          }
          // 頁內若出現 day header，其 day 必須跟本章一致
          if (dayHdr) {
            const d = dayHdr.getAttribute("data-day-number");
            if (d && cur.days.size && !cur.days.has(Number(d))) crossDay++;
          }
        }

        // 2) 字級 / 溢出 / 裁切
        const fs_ = [];
        let overflow = 0;
        let textOverflow = 0;
        let crop = 0;
        for (const c of cells) {
          const p = c.querySelector("p");
          if (p) {
            const v = parseFloat(getComputedStyle(p).fontSize);
            if (v) fs_.push(v * 0.75);
          }
          const rect = c.getBoundingClientRect();
          if (c.scrollHeight - rect.height > 1) overflow++;
          if (p && p.scrollHeight - p.clientHeight > 1) textOverflow++;
          const img = c.querySelector("img");
          if (img && img.naturalWidth && img.getBoundingClientRect().height > 0) {
            const r2 = img.getBoundingClientRect();
            const nat = img.naturalWidth / img.naturalHeight;
            const disp = r2.width / r2.height;
            if (Math.abs(nat - disp) / nat > 0.02) crop++;
          }
        }

        // 3) 章節之間不得共用同一頁（跨章配對）
        let mixed = 0;
        for (const p of pages) {
          const els = Array.from(p.querySelectorAll("[data-post-id]"));
          const days = new Set(
            els
              .map((e) => e.getAttribute("data-day-number"))
              .filter(Boolean)
              .map(Number),
          );
          if (days.size > 1) mixed++;
        }

        return {
          pages: pages.length,
          cells: cells.length,
          chapters: chapters.map((c) => ({
            intro: c.intro,
            declared: c.declared,
            actual: c.actual,
            pages: c.pages,
            dayCount: c.days.size,
          })),
          fsMin: fs_.length ? Math.min(...fs_) : null,
          fsMax: fs_.length ? Math.max(...fs_) : null,
          under9: fs_.filter((x) => x < 9).length,
          overflow,
          textOverflow,
          crop,
          mixed,
          crossDay,
        };
      });

      // 驗證
      const errs = [];
      const totalDeclared = res.chapters.reduce((s, c) => s + (c.declared || 0), 0);
      const totalActual = res.chapters.reduce((s, c) => s + c.actual, 0);
      if (totalDeclared !== ids.length) {
        errs.push(`章節宣告篇數 ${totalDeclared} != 全書 ${ids.length}`);
      }
      if (totalActual !== ids.length) {
        errs.push(`章節實際篇數 ${totalActual} != 全書 ${ids.length}`);
      }
      for (const c of res.chapters) {
        if (c.declared !== null && c.declared !== c.actual) {
          errs.push(`${c.intro}: 宣告 ${c.declared} 篇但實際 ${c.actual} 篇`);
        }
        if (c.pages === 0) errs.push(`${c.intro}: 扉頁後沒有任何本章文章`);
        if (c.dayCount > 1) errs.push(`${c.intro}: 混了 ${c.dayCount} 個 Day`);
      }
      if (res.mixed > 0) errs.push(`${res.mixed} 頁跨 Day 配對`);
      if (res.under9 > 0) errs.push(`${res.under9} 格字級 < 9pt`);
      if (res.overflow > 0) errs.push(`${res.overflow} 格溢出`);
      if (res.textOverflow > 0) errs.push(`${res.textOverflow} 格文字溢出`);
      if (res.crop > 0) errs.push(`${res.crop} 張照片被裁切`);

      const chs = res.chapters
        .map((c) => `${c.intro}(${c.actual}/${c.pages}p)`)
        .join(" ");
      const line =
        `${errs.length ? "✗" : "✓"} ${slug.padEnd(9)} ` +
        `mode=${b.layout_mode} 篇=${ids.length} 頁=${res.pages} ` +
        `字級 ${res.fsMin?.toFixed(2)}~${res.fsMax?.toFixed(2)}pt ` +
        `溢出${res.overflow}/文字${res.textOverflow}/裁切${res.crop} ` +
        `| ${chs}`;
      console.log(line);
      if (errs.length) {
        for (const e of errs) console.log(`    ⚠ ${e}`);
        fail++;
      }
      rows.push({ slug, ok: errs.length === 0, ...res });
    } catch (e) {
      console.log(`✗ ${slug}: ${e.message}`);
      fail++;
    } finally {
      await page.close();
    }
  }

  await browser.close();

  const okCount = rows.filter((r) => r.ok).length;
  console.log(
    `\n結果：${okCount}/${rows.length} 本通過` +
      (fail ? `，${fail} 本有問題` : "") +
      (skipped ? `，${skipped} 本跳過（空殼/測試書）` : ""),
  );
  console.log(
    "合計：溢出 " +
      rows.reduce((s, r) => s + r.overflow, 0) +
      " / 文字溢出 " +
      rows.reduce((s, r) => s + r.textOverflow, 0) +
      " / 裁切 " +
      rows.reduce((s, r) => s + r.crop, 0) +
      " / <9pt " +
      rows.reduce((s, r) => s + r.under9, 0),
  );
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("失敗:", e);
  process.exit(1);
});
