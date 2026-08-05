// 🅒 2026-08-05 聖上拍板: 抽 renderVogueMarkdown + D1_PLACEHOLDER 成 shared module
//   給 editor (編輯區 preview) 跟 read page (完稿閱讀) 共用

export const D1_PLACEHOLDER = `# The Long Goodbye
## 桃 園 啟 程

凌晨四點, Brian 拿著點名板在大宇家樓下唱名。

> 「這不是旅行, 是一次策展。」

(把左邊照片拖進來會自動插入圖片)
`;

// 簡單 Markdown → HTML (Vogue 風預覽用)
// 不用 marked/remark 等 lib (避免多裝 dep), 手寫只支援 4 種: H1, H2, P, IMG
export function renderVogueMarkdown(text: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const lines = text.split("\n");
  const out: string[] = [];
  let firstH1: string | null = null;
  let firstH2: string | null = null;

  // 先找第一個 H1 / H2
  for (const line of lines) {
    const trimmed = line.trim();
    if (!firstH1 && /^#\s+(.+)$/.test(trimmed)) {
      firstH1 = trimmed.replace(/^#\s+/, "");
    }
    if (!firstH2 && /^##\s+(.+)$/.test(trimmed)) {
      firstH2 = trimmed.replace(/^##\s+/, "");
    }
    if (firstH1 && firstH2) break;
  }

  // Vogue 殼頭: kicker + H1 中英 + deck
  if (firstH1) {
    const en = firstH1.replace(/[\u4e00-\u9fa5]/g, "").trim() || "The Long Goodbye";
    const cn = firstH1.replace(/[A-Za-z\s]/g, "").trim() || "桃 園 啟 程";
    out.push(`<div class="vd-kicker">Day One · Departure</div>`);
    out.push(`<h1 class="vd-h1">${escape(en)}<span class="vd-h1-cn">${escape(cn)}</span></h1>`);
    out.push(`<div class="vd-deck">聖上口述 · 臣潤稿</div>`);
    out.push(`<hr class="vd-rule" />`);
  } else {
    out.push(`<div class="vd-kicker">Day One · Departure</div>`);
    out.push(`<h1 class="vd-h1">The Long Goodbye<span class="vd-h1-cn">桃 園 啟 程</span></h1>`);
    out.push(`<div class="vd-deck">聖上口述 · 臣潤稿</div>`);
    out.push(`<hr class="vd-rule" />`);
  }

  let skipFirstH1 = !!firstH1;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push("");
      continue;
    }
    // 跳過第一個 H1 (避免重複)
    if (skipFirstH1 && /^#\s+(.+)$/.test(trimmed)) {
      skipFirstH1 = false;
      continue;
    }
    // H2
    if (/^##\s+(.+)$/.test(trimmed)) {
      const t = trimmed.replace(/^##\s+/, "");
      out.push(`<h2 class="vd-h2">${escape(t)}</h2>`);
      continue;
    }
    // Blockquote
    if (/^>\s*(.+)$/.test(trimmed)) {
      const t = trimmed.replace(/^>\s*/, "");
      out.push(`<blockquote class="vd-quote">${escape(t)}</blockquote>`);
      continue;
    }
    // Image: ![caption](url)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      const [, alt, url] = imgMatch;
      out.push(`<figure class="vd-figure"><img src="${escape(url)}" alt="${escape(alt)}" /><figcaption>${escape(alt)}</figcaption></figure>`);
      continue;
    }
    // 段落
    out.push(`<p class="vd-p">${escape(trimmed)}</p>`);
  }

  return out.join("\n");
}
