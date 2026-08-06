// 🅒 2026-08-05 聖上拍板: 抽 renderVogueMarkdown + D1_PLACEHOLDER 成 shared module
//   給 editor (編輯區 preview) 跟 read page (完稿閱讀) 共用
//   8-5 加 block system: 用 <!--LOCK:id-->...<!--/LOCK--> 標記段落鎖定狀態
//   locked = 完稿區 (不會被覆寫), editing = 編輯區 (可繼續寫/潤稿)

export const D1_PLACEHOLDER = `# The Long Goodbye
## 桃 園 啟 程

凌晨四點, Brian 拿著點名板在大宇家樓下唱名。

> 「這不是旅行, 是一次策展。」

(把左邊照片拖進來會自動插入圖片)
`;

export type BlockType = "h1" | "h2" | "p" | "quote" | "image";
export type BlockStatus = "editing" | "locked";

export interface Block {
  id: string;          // 唯一 id (auto-gen 或 LOCK marker 內的)
  type: BlockType;
  raw: string;         // Markdown source
  status: BlockStatus;
  caption?: string;    // 圖片 caption
  url?: string;        // 圖片 url
  en?: string;         // H1 拆中英
  cn?: string;
}

// 解析 locked markers → 拆 blocks
//   格式: `<!--LOCK:abc123-->\n<p>...</p>\n<!--/LOCK-->\n` 或無 marker = editing
// 🅒 8-6 聖上拍板: LOCK 內的 innerRaw 也要跑 parseRawToBlocks 拆 sub blocks (image/quote/h1/h2/p)
//   - 修前: 整個 LOCK 段當 type:p → 內部 ![](url) 不會被認成 image, read page 看不到照片
//   - 修後: LOCK 內多個 sub blocks (圖片/quote/h1/h2/p 各自獨立)
//   - status 全部標 locked (雖然內部已 locked, 但 explicit 標記讓 render 一致)
export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lockedRe = /<!--LOCK:([a-z0-9]+)-->([\s\S]*?)<!--\/LOCK-->/g;
  let cursor = 0;
  let m: RegExpExecArray | null;
  let autoId = 0;

  while ((m = lockedRe.exec(text)) !== null) {
    // 收集前面未鎖的 editing 段
    const beforeRaw = text.slice(cursor, m.index);
    const beforeBlocks = parseRawToBlocks(beforeRaw, "editing", () => `e${++autoId}`);
    blocks.push(...beforeBlocks);

    // 收集 locked 段 — 把 LOCK 內部當成完整的 raw text, parse 成多個 sub blocks
    //   全部 status = locked, 但保留各自的 type (image/quote/h1/h2/p)
    const lockedId = m[1];
    const innerRaw = m[2].trim();
    const lockedSubBlocks = parseRawToBlocks(innerRaw, "locked", () => `l${lockedId}-${++autoId}`);
    // 統一標 locked (parseRawToBlocks 已標, 二次保險)
    blocks.push(...lockedSubBlocks);

    cursor = m.index + m[0].length;
  }

  // 收尾 — 剩餘未鎖
  const restRaw = text.slice(cursor);
  const restBlocks = parseRawToBlocks(restRaw, "editing", () => `e${++autoId}`);
  blocks.push(...restBlocks);

  return blocks;
}

// 把 raw text 切成單個 markdown block
function parseRawToBlocks(raw: string, status: BlockStatus, genId: () => string): Block[] {
  const lines = raw.split("\n");
  const blocks: Block[] = [];
  let buf: string[] = [];

  const flush = () => {
    if (!buf.length) return;
    const joined = buf.join("\n").trim();
    if (!joined) {
      buf = [];
      return;
    }
    const trimmed = joined.trim();
    if (/^#\s+(.+)$/.test(trimmed)) {
      blocks.push({ id: genId(), type: "h1", raw: trimmed, status });
    } else if (/^##\s+(.+)$/.test(trimmed)) {
      blocks.push({ id: genId(), type: "h2", raw: trimmed, status });
    } else if (/^>\s*(.+)$/.test(trimmed)) {
      blocks.push({ id: genId(), type: "quote", raw: trimmed, status });
    } else if (/^!\[([^\]]*)\]\(([^)]+)\)/.test(trimmed)) {
      // 🅒 8-6 聖上拍板: 寬鬆 image regex — 允許 `![](url)` 後接 caption (同一行) 或純 image
      //   - 修前: `^!\[...$` 要求行尾結束 → image 後接 caption 會被當 paragraph
      //   - 修後: 行以 `![](...)` 開頭即視為 image, caption 從 image 後面擷取
      const mm = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)(.*)$/);
      if (mm) {
        const inlineCaption = (mm[3] || "").trim();
        const url = mm[2];
        const markdownCaption = mm[1] || "";
        // 優先用 markdown alt (e.g. `![caption](url)`) → 沒有再用 inline caption (e.g. `![](url)inline`)
        const finalCaption = markdownCaption || inlineCaption;
        blocks.push({
          id: genId(),
          type: "image",
          raw: trimmed,
          status,
          caption: finalCaption,
          url: url,
        });
      }
    } else {
      blocks.push({ id: genId(), type: "p", raw: trimmed, status });
    }
    buf = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    // H1 / H2 / quote / image 各自獨立 (single-line)
    if (/^#\s+/.test(trimmed) || /^##\s+/.test(trimmed) || /^>\s*/.test(trimmed) || /^!\[.*\]\(.*\)/.test(trimmed)) {
      flush();
      buf.push(line);
      flush();
    } else {
      buf.push(line);
    }
  }
  flush();
  return blocks;
}

// 把 blocks serialize 回 raw text (含 LOCK markers)
export function serializeBlocks(blocks: Block[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.status === "locked") {
      out.push(`<!--LOCK:${b.id}-->`);
      out.push(b.raw);
      out.push(`<!--/LOCK-->`);
    } else {
      out.push(b.raw);
    }
    out.push("");
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// 過濾只留 editing blocks (給 LLM 潤稿用, 不送 locked 進去)
export function editingBlocksOnly(blocks: Block[]): Block[] {
  return blocks.filter((b) => b.status === "editing");
}

// 把 editing blocks 重組回 raw text
export function editingBlocksToText(blocks: Block[]): string {
  return blocks.map((b) => b.raw).join("\n\n");
}

// 渲染 Vogue HTML — 接受 blocks 而非 raw text
// 🅒 8-6 聖上拍板: 為每個 image block 加 data-fig-pos="N" 屬性 (1-based, 圖在 polished_text 內的順序)
//   - CSS 用 [data-fig-pos] selector 做「左文右圖 / 左圖右文 / 全寬置中」交替
//   - JS-side counting 比 nth-of-type 精準, 不會被其他 block 干擾順序
export function renderBlocksHtml(blocks: Block[]): string {
  const out: string[] = [];
  let figureIndex = 0; // 🅒 8-6: 計數器, image block 出現時 +1
  // Vogue 殼頭 (用第一個 h1)
  const firstH1 = blocks.find((b) => b.type === "h1");
  if (firstH1) {
    const text = firstH1.raw.replace(/^#\s+/, "");
    const en = text.replace(/[\u4e00-\u9fa5]/g, "").trim() || "The Long Goodbye";
    const cn = text.replace(/[A-Za-z\s]/g, "").trim() || "桃 園 啟 程";
    out.push(`<div class="vd-kicker">Day One · Departure</div>`);
    out.push(`<h1 class="vd-h1">${escapeHtml(en)}<span class="vd-h1-cn">${escapeHtml(cn)}</span></h1>`);
    out.push(`<div class="vd-deck">聖上口述 · 臣潤稿</div>`);
    out.push(`<hr class="vd-rule" />`);
  } else {
    out.push(`<div class="vd-kicker">Day One · Departure</div>`);
    out.push(`<h1 class="vd-h1">The Long Goodbye<span class="vd-h1-cn">桃 園 啟 程</span></h1>`);
    out.push(`<div class="vd-deck">聖上口述 · 臣潤稿</div>`);
    out.push(`<hr class="vd-rule" />`);
  }

  // 跳過第一個 h1
  let skipFirstH1 = !!firstH1;

  // 🅒 8-6 聖上拍板: Editorial layout — 圖片 + 後續 P 群自動包成 flex row
  //   設計: 偵測「image block → 接續 P 群 (到下一個 h1/h2/quote/image)」
  //   把「image + 全部接續 P」wrap 在 <div class="vd-editorial-row"> 內,
  //   用 CSS flex 讓圖左/右、文自適應 (Monocle Pattern 3)
  //   聖上 polished_text 不用改, 渲染端自動做 editorial layout
  type Buffer = { kind: "image" | "p"; html: string; figureSide?: "left" | "right" };
  let buffer: Buffer[] = [];
  let bufferAnchor: "image" | "p" | null = null; // buffer 開頭是哪種

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    if (buffer.length === 1 || bufferAnchor !== "image") {
      // 單元素或沒 image anchor → 直接 push (保留原 .vd-block wrapper)
      for (const item of buffer) out.push(item.html);
      buffer = [];
      bufferAnchor = null;
      return;
    }
    // Image + P 群 → 包成 editorial flex row
    const imageItem = buffer[0];
    const pItems = buffer.slice(1);
    const side = imageItem.figureSide || "right"; // 預設圖右文左
    const sideClass = side === "left" ? "vd-editorial-row--reverse" : "";
    out.push(
      `<div class="vd-editorial-row ${sideClass}">` +
        imageItem.html +
        `<div class="vd-editorial-row__body">` +
        pItems.map((p) => p.html).join("") +
        `</div>` +
      `</div>`
    );
    buffer = [];
    bufferAnchor = null;
  };

  for (const b of blocks) {
    if (skipFirstH1 && b.type === "h1") {
      skipFirstH1 = false;
      continue;
    }
    skipFirstH1 = false;

    const blockWrap = (inner: string) => {
      if (b.status === "locked") {
        return `<div class="vd-block vd-block-locked" data-block-id="${b.id}" data-status="locked">${inner}</div>`;
      }
      return `<div class="vd-block vd-block-editing" data-block-id="${b.id}" data-status="editing">${inner}</div>`;
    };

    switch (b.type) {
      case "h1":
        flushBuffer(); // 任何 h1/h2/quote 都結束 buffer
        // 🅒 8-6 修: skipFirstH1 邏輯 — 第一個 H1 已被 Vogue 殼頭用, 不再渲染
        if (skipFirstH1) {
          skipFirstH1 = false;
          break;
        }
        skipFirstH1 = false;
        out.push(blockWrap(`<h1 class="vd-h1">${escapeHtml(b.raw.replace(/^#\s+/, ""))}</h1>`));
        break;
      case "h2":
        flushBuffer();
        out.push(blockWrap(`<h2 class="vd-h2">${escapeHtml(b.raw.replace(/^##\s+/, ""))}</h2>`));
        break;
      case "quote":
        flushBuffer();
        out.push(blockWrap(`<blockquote class="vd-quote">${escapeHtml(b.raw.replace(/^>\s*/, ""))}</blockquote>`));
        break;
      case "image":
        flushBuffer(); // 新 image 開始新 buffer
        figureIndex++; // 🅒 8-6: 計數器累加, 用 1-based 順序給 CSS 用
        // 🅒 8-6: 圖片左右交替 (figureIndex 奇數→右, 偶數→左)
        const figureSide = figureIndex % 2 === 1 ? "right" : "left";
        const imageHtml = blockWrap(
          `<figure class="vd-figure" data-photo-url="${escapeHtml(b.url || "")}" data-fig-pos="${figureIndex}" data-fig-side="${figureSide}">` +
            `<img src="${escapeHtml(b.url || "")}" alt="${escapeHtml(b.caption || "")}" loading="lazy" />` +
            `<figcaption class="vd-caption">${escapeHtml(b.caption || "")}</figcaption>` +
            `<div class="vd-exif-slot" data-pending="true"><span class="vd-exif-loading">載入 EXIF…</span></div>` +
            `</figure>`
        );
        buffer.push({ kind: "image", html: imageHtml, figureSide });
        bufferAnchor = "image";
        break;
      case "p":
        buffer.push({ kind: "p", html: blockWrap(`<p class="vd-p">${escapeHtml(b.raw)}</p>`) });
        if (bufferAnchor === null) bufferAnchor = "p";
        break;
    }
  }
  flushBuffer(); // 🅒 8-6: flush 結尾剩餘 buffer (避免最後一組圖 + 文沒 wrap)
  return out.join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 簡單 Markdown → HTML (Vogue 風預覽用) — 保留舊 API 給 editor preview
// 不用 marked/remark 等 lib (避免多裝 dep), 手寫只支援 4 種: H1, H2, P, IMG
export function renderVogueMarkdown(text: string): string {
  const blocks = parseBlocks(text);
  return renderBlocksHtml(blocks);
}
