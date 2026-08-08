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
// 🅒 8-9 聖上拍板: 「一組圖文對上一組圖文」 — 每個 LOCK 是獨立單位, 不再切 sub blocks
//   - 修前 (8-6): LOCK 內 run parseRawToBlocks 拆 image/quote/h1/h2/p → render 時「圖+接續 P 群」配對 wrap 成 editorial row
//   - 修後 (8-9): LOCK 整個視為 1 個 block, type 由內容判斷:
//       - LOCK 內只有 ![](url) → type:image
//       - LOCK 內只有 > 引言 → type:quote
//       - LOCK 內只有 # / ## → type:h1/h2
//       - 其他 (含混合) → type:p (raw 內含原始 markdown)
//   render: 每個 LOCK 獨立 push, 不 wrap editorial row
export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
    // 🅒 8-6 聖上拍板: LOCK id 允許包含 `-` (date.now() base36 可能含 `-`)
  //   修前: `([a-z0-9]+)` 限制只 alphanumeric → 遇到 `llmshfaiwv7bj3-1` 這種 id 整段 regex fail
  //   → 整個 LOCK 段被當 text, parseRawToBlocks 把 `<!--LOCK:...-->` 當 P 段
  //   → editingText 內含 LOCK marker (污染聖上 textarea)
  //   修後: 允許 `[a-z0-9-]+`
  const lockedRe = /<!--LOCK:([a-z0-9-]+)-->([\s\S]*?)<!--\/LOCK-->/g;
  let cursor = 0;
  let m: RegExpExecArray | null;
  let autoId = 0;

  while ((m = lockedRe.exec(text)) !== null) {
    // 收集前面未鎖的 editing 段
    const beforeRaw = text.slice(cursor, m.index);
    const beforeBlocks = parseRawToBlocks(beforeRaw, "editing", () => `e${++autoId}`);
    blocks.push(...beforeBlocks);

    // 🅒 8-9 聖上拍板改心意: LOCK 改回拆 sub blocks (圖 + 接續 P 配對)
    //   之前 8-9 (我改的): LOCK 整體視為 1 個 block, 不切 sub blocks
    //   現在 (聖上要的): LOCK 內 run parseRawToBlocks 拆 image/quote/h1/h2/p
    //                    render 時把「圖 + 接續 P」wrap 成 vd-editorial-row, 圖左文右
    const lockedId = m[1];
    const innerRaw = m[2].trim();
    const lockedSubBlocks = parseRawToBlocks(innerRaw, "locked", () => `l${lockedId}-${++autoId}`);
    blocks.push(...lockedSubBlocks);

    cursor = m.index + m[0].length;
  }

  // 收尾 — 剩餘未鎖
  const restRaw = text.slice(cursor);
  const restBlocks = parseRawToBlocks(restRaw, "editing", () => `e${++autoId}`);
  blocks.push(...restBlocks);

  return blocks;
}

// 🅒 8-9 聖上拍板: parseSingleBlock — LOCK 整個視為 1 個 block
//   優先順序: image (含 ![](url)) > quote (> 開頭) > h1 (#) > h2 (##) > p (其他含混合)
//   raw 保留原始 markdown (render 端自行處理)
function parseSingleBlock(raw: string, status: BlockStatus, genId: () => string): Block {
  const trimmed = raw.trim();
  const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
  if (imgMatch) {
    return {
      id: genId(),
      type: "image",
      raw: trimmed,
      status,
      caption: imgMatch[1],
      url: imgMatch[2],
    };
  }
  if (/^>\s*/.test(trimmed)) {
    return { id: genId(), type: "quote", raw: trimmed, status };
  }
  if (/^#\s+(.+)$/.test(trimmed)) {
    return { id: genId(), type: "h1", raw: trimmed, status };
  }
  if (/^##\s+(.+)$/.test(trimmed)) {
    return { id: genId(), type: "h2", raw: trimmed, status };
  }
  return { id: genId(), type: "p", raw: trimmed, status };
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
  // 🅒 8-9 聖上拍板: 拿掉 Vogue 殼 — 不再自動加 kicker + rule
  //   之前: 自動加 "Day One · Departure" + H1 + hr 當雜誌頭版
  //   聖上: 「每次都加了這個是什麼意思」→ 刪掉, 只剩聖上寫的內容
  const firstH1 = blocks.find((b) => b.type === "h1");
  if (firstH1) {
    const text = firstH1.raw.replace(/^#\s+/, "");
    const en = text.replace(/[\u4e00-\u9fa5]/g, "").trim() || "The Long Goodbye";
    const cn = text.replace(/[A-Za-z\s]/g, "").trim() || "桃 園 啟 程";
    out.push(`<h1 class="vd-h1">${escapeHtml(en)}<span class="vd-h1-cn">${escapeHtml(cn)}</span></h1>`);
  }
  // 沒有 H1 不預設標題 — 聖上原文有啥就 render 啥

  // 跳過第一個 h1
  let skipFirstH1 = !!firstH1;

  // 🅒 8-9 聖上拍板改心意: 「圖左文右」統一格式
  //   render: 圖 + 接續 P 群包成 vd-editorial-row (Monocle Pattern 3 圖文配對)
  //   所有圖統一 figureSide = "left" (圖左文右), 不交替
  //   之前 8-9 改的「每個 block 獨立」撤回
  type Buffer = { kind: "image" | "p" | "quote"; html: string; figureSide?: "left" | "right" };
  let buffer: Buffer[] = [];

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    // 🅒 8-9 修法: 圖 + P 群配對 wrap 成 editorial row
    //   聖上: 「圖左文右統一格式」 — 即使只有 1 個 image (沒接續文字), 也要 wrap
    //   (右側空白, 但仍是 vd-editorial-row 統一格式)
    if (buffer[0].kind !== "image") {
      // 第一個元素不是圖 → 直接 push (不 wrap)
      for (const item of buffer) out.push(item.html);
      buffer = [];
      return;
    }
    const imageItem = buffer[0];
    let pItems = buffer.slice(1);
    if (pItems.length > 4) pItems = pItems.slice(0, 4);
    // 🅒 8-9: 統一左 (圖左文右), 不交替
    const sideClass = "vd-editorial-row--left";
    out.push(
      `<div class="vd-editorial-row ${sideClass}">` +
        imageItem.html +
        `<div class="vd-editorial-row__body">` +
        pItems.map((p) => p.html).join("") +
        `</div>` +
      `</div>`
    );
    buffer = [];
  };

  for (const b of blocks) {
    // 🅒 8-6 修: skipFirstH1 邏輯 — 第一個 H1 已被 Vogue 殼頭用, 跳過渲染
    //   注意: 不能用「if (skipFirstH1 && h1) continue; skipFirstH1 = false;」
    //   因為後者在 if 區塊外無條件執行, 會把 skipFirstH1 在 image 等非 h1 block 也變 false
    //   → 後續 H1 失去 skip 機會
    //   正解: if (skipFirstH1 && b.type === "h1") continue; 然後 else 才設 false
    if (skipFirstH1 && b.type === "h1") {
      skipFirstH1 = false;
      continue;
    } else if (b.type === "h1") {
      // 第一個 H1 已被 Vogue 殼頭用, 不再渲染 (skipFirstH1 已變 false)
      skipFirstH1 = false;
    }

    const blockWrap = (inner: string) => {
      if (b.status === "locked") {
        return `<div class="vd-block vd-block-locked" data-block-id="${b.id}" data-status="locked">${inner}</div>`;
      }
      return `<div class="vd-block vd-block-editing" data-block-id="${b.id}" data-status="editing">${inner}</div>`;
    };

    switch (b.type) {
      case "h1":
        flushBuffer(); // 任何 h1/h2/quote 都結束 buffer
        // skipFirstH1 邏輯在 for-loop 開頭處理 (continue 跳過)
        // switch case 內不再重複檢查
        out.push(blockWrap(`<h1 class="vd-h1">${escapeHtml(b.raw.replace(/^#\s+/, ""))}</h1>`));
        break;
      case "h2":
        flushBuffer();
        out.push(blockWrap(`<h2 class="vd-h2">${escapeHtml(b.raw.replace(/^##\s+/, ""))}</h2>`));
        break;
      case "quote":
        // 🅒 8-8 聖上拍板: 潤稿後文字放在照片的左側或右側 (圖文並排)
        //   - 之前 quote 會 flushBuffer (中斷 wrap), 改為 push 到 buffer 像 P 一樣
        //   - 聖上看 read page 看到 image + quote 一起 wrap 成 vd-editorial-row
        buffer.push({
          kind: "quote",
          html: blockWrap(
            `<blockquote class="vd-quote">${escapeHtml(b.raw.replace(/^>\s*/, ""))}</blockquote>`
          ),
        });
        // 🅒 8-9: 取消 editorial row wrap (改為每 block 獨立)
        break;
      case "image":
        flushBuffer(); // 新 image 結束前一個 buffer
        figureIndex++; // 🅒 8-6: 計數器累加, 用 1-based 順序給 CSS 用
        // 🅒 8-9 聖上拍板改心意: 「圖左文右」統一格式 (不交替)
        const figureSide = "left"; // 統一左, 不交替 (撤掉 8-6 的 % 2 交替)
        const imageHtml = blockWrap(
          `<figure class="vd-figure" data-photo-url="${escapeHtml(b.url || "")}" data-fig-pos="${figureIndex}" data-fig-side="${figureSide}">` +
            `<img src="${escapeHtml(b.url || "")}" alt="${escapeHtml(b.caption || "")}" loading="lazy" />` +
            `<figcaption class="vd-caption">${escapeHtml(b.caption || "")}</figcaption>` +
            `<div class="vd-exif-slot" data-pending="true"><span class="vd-exif-loading">載入 EXIF…</span></div>` +
            `</figure>`
        );
        buffer.push({ kind: "image", html: imageHtml, figureSide });
        break;
      case "p":
        buffer.push({ kind: "p", html: blockWrap(`<p class="vd-p">${escapeHtml(b.raw)}</p>`) });
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
