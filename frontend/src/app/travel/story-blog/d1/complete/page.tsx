// 🅒 2026-08-08 聖上拍板: 完成區另作一頁 — 不放在編輯後台
//   從原本 /travel/story-blog/d1/edit 的「🏆 完成區」panel 抽出來
//   獨立頁面 /travel/story-blog/d1/complete
//
// 🅒 8-8 第二次改: 聖上拍板「以小區塊為單位, 要刪要存一次處理, 不細分每一小行」
//   - 不再用 parseBlocks 拆成 sub blocks (一個 LOCK 內的多個段)
//   - 改用「LOCK marker 範圍」= 一個送出批次 (一個 LOCK id = 一次送出)
//   - 每張卡片 = 一個批次, 顯示「送出時間 + 段數 + 首段預覽」+ 「🗑 整體刪除」按鈕
//   - 不再細分每個 sub block (聖上說「無意義」)
//
// 設計選擇:
//   - Server Component (跟 read page 一致) → SSR 直接含送出批次內容
//   - 從 Supabase 讀 text 欄位 (locked 段含 LOCK markers)
//   - 用 regex 掃描 LOCK 範圍 → 組成「送出批次」清單
//   - 每批次顯示: # / 段數 / 第一段 preview (前 60 字) / 整體刪除按鈕
//   - 提供「← 回編輯區」連結 + 「📖 去看 read page」連結 + 「🗑 全部清除」總按鈕

import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import LockedBatchCard from "./LockedBatchCard";
import "../edit/editor.css";

export const dynamic = "force-dynamic"; // SSR 每次 fetch 最新 Supabase 內容

// 抽出所有 LOCK 範圍: 用 LOCK id **前 8 字** 分組 (timestamp base36 前段, 不同 i 仍同 group)
//   sendPolishedToLocked: `l${Date.now().toString(36)}${i.toString(36)}${random}`
//   Date.now().toString(36) 在同次送出固定, i 不同 → 前 8 字仍是 timestamp
//   例: 「msjft5h60bp1-1」「msjft5h61mdd-2」「msjft5h62b9f-3」前 8 字都是「msjft5h6」

// 🅒 8-8 聖上拍板: 「2段直接以圖文呈現」— 每個 sub block 用「圖+文」方式渲染
//   - 如果段內含 ![](url), 顯示圖 (URL) + 文字內容
//   - 如果只有文字, 就只顯示文字
//   - 不再用「首段預覽」方式 (太抽象), 直接渲染圖文
interface SubBlock {
  type: "h1" | "h2" | "p" | "quote" | "image" | "other";
  text: string;     // 純文字 (去掉 markdown 標記)
  imageUrl?: string; // 若有圖片, 圖片 URL
}

interface SentBatch {
  id: string;
  startLine: number;
  subBlocks: SubBlock[];  // 完整的 sub block 列表 (直接渲染)
  groupKey: string;       // 前 8 字 (送給 API 刪除時用)
}

// 把一段 LOCK 內的 raw 拆成 sub blocks (按空行分割), 每個 sub block 解析為 SubBlock
function parseSubBlocks(raw: string): SubBlock[] {
  const blocks = raw.split(/\n\s*\n/).filter((s) => s.trim().length > 0);
  return blocks.map((b) => {
    const trimmed = b.trim();
    // 抽圖片 URL
    const imgMatch = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch && /^!\[[^\]]*\]\([^)]+\)\s*$/.test(trimmed)) {
      // 純圖片段
      return { type: "image" as const, text: "", imageUrl: imgMatch[2] };
    }
    // 抽文字 (移除 markdown 標記)
    const text = trimmed
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "") // 去圖片語法
      .replace(/^#+\s*/, "")                    // 去 H1/H2 prefix
      .replace(/^>\s*/gm, "")                   // 去 > prefix
      .replace(/\n+/g, " ")
      .trim();
    // 判斷 type
    let type: SubBlock["type"] = "p";
    if (trimmed.startsWith("# ")) type = "h1";
    else if (trimmed.startsWith("## ")) type = "h2";
    else if (trimmed.startsWith("> ")) type = "quote";
    // 若同時有圖又有文 (混合段), 也保留 imageUrl
    const hasImg = imgMatch ? imgMatch[2] : undefined;
    return { type, text: text || "(空段)", imageUrl: hasImg };
  });
}

function extractSentBatches(text: string): SentBatch[] {
  const re = /<!--LOCK:([a-z0-9-]+)-->([\s\S]*?)<!--\/LOCK-->/g;
  const allLocks: Array<{ id: string; subBlocks: SubBlock[] }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const lockId = m[1];
    const innerRaw = m[2].trim();
    const subBlocks = parseSubBlocks(innerRaw);
    allLocks.push({ id: lockId, subBlocks });
  }

  // 用 LOCK id **前 8 字** 分組
  const GROUP_KEY_LEN = 8;
  const groupMap = new Map<string, SentBatch>();
  for (const lock of allLocks) {
    const cleanedId = lock.id.replace(/-/g, "");
    const groupKey = cleanedId.slice(0, GROUP_KEY_LEN);
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        id: lock.id,
        startLine: groupMap.size + 1,
        subBlocks: [],
        groupKey,
      });
    }
    const batch = groupMap.get(groupKey)!;
    batch.subBlocks.push(...lock.subBlocks);
  }

  return Array.from(groupMap.values());
}

export default async function D1CompletePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("story_blog_drafts")
    .select("text, updated_at, updated_by")
    .eq("id", "d1")
    .maybeSingle();

  const text = data?.text ?? "";
  const updatedBy = data?.updated_by ?? "";
  const updatedAt = data?.updated_at ?? "";

  const batches = extractSentBatches(text);
  const totalSubBlocks = batches.reduce((sum, b) => sum + b.subBlocks.length, 0);

  return (
    <main
      style={{
        padding: "40px 24px",
        maxWidth: 960,
        margin: "0 auto",
        fontFamily: "'Noto Serif TC', serif",
        background: "#fafaf9",
        minHeight: "100vh",
      }}
    >
      {/* ── 頁面 header ───────────────────────────── */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Link
            href="/travel/story-blog"
            style={{
              color: "#c41e3a",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            ← Story Blog
          </Link>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 36,
              fontStyle: "italic",
              margin: "8px 0 0",
              color: "#1e293b",
            }}
          >
            🏆 D1 完成區
          </h1>
          <p style={{ fontSize: 13, color: "#6a6a6a", margin: "4px 0 0" }}>
            {batches.length > 0
              ? `共 ${batches.length} 個送出批次 · ${totalSubBlocks} 段 · ${
                  updatedBy ? `更新者 ${updatedBy} · ` : ""
                }${updatedAt ? new Date(updatedAt).toLocaleString("zh-TW") : ""}`
              : "尚未送出任何段落"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href="/travel/story-blog/d1/edit"
            style={{
              padding: "8px 16px",
              background: "white",
              color: "#1e293b",
              border: "1px solid #1e293b",
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            ← 回編輯後台
          </Link>
          <Link
            href="/travel/story-blog/d1/read"
            style={{
              padding: "8px 16px",
              background: "#1e293b",
              color: "white",
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            📖 讀者頁面 →
          </Link>
        </div>
      </header>

      {/* ── 完成區 panel (以 LOCK 範圍為單元) ─── */}
      <div className="ed-locked-zone" style={{ maxWidth: "100%" }}>
        <div className="ed-locked-zone-header">
          <span className="ed-locked-zone-title">
            🏆 完成區 ({batches.length} 個批次)
          </span>
          <span className="ed-locked-zone-hint">
            {batches.length > 0
              ? `每張卡 = 一次 [✨ 潤稿]→[✅ Confirm] 送出的批次 · 點 🗑 整體刪除該批次`
              : "尚未送出任何批次 — 回編輯後台按 [✨ 潤稿] → [✅ Confirm 潤稿完成] 送出"}
          </span>
        </div>

        {batches.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#92400e",
              fontSize: 14,
            }}
          >
            🌱 還沒有送出的批次
            <br />
            <Link
              href="/travel/story-blog/d1/edit"
              style={{
                display: "inline-block",
                marginTop: 16,
                padding: "8px 16px",
                background: "#f59e0b",
                color: "white",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              ✏️ 去編輯後台送出
            </Link>
          </div>
        ) : (
          <div className="ed-locked-zone-list">
            {batches.map((b) => (
              <LockedBatchCard
                key={b.id}
                batchId={b.id}
                startLine={b.startLine}
                subBlocks={b.subBlocks}
                groupKey={b.groupKey}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── 頁腳說明 ───────────────────────────── */}
      <footer
        style={{
          marginTop: 32,
          padding: 16,
          background: "white",
          border: "1px solid #d4d4d4",
          borderRadius: 6,
          fontSize: 12,
          color: "#6a6a6a",
          textAlign: "center",
        }}
      >
        💡 每張卡 = 一次「潤稿 → Confirm」送出的整批段落 · 要修改內容請回{" "}
        <Link
          href="/travel/story-blog/d1/edit"
          style={{ color: "#c41e3a", fontWeight: 700 }}
        >
          編輯後台
        </Link>
        解鎖後重新編輯
      </footer>
    </main>
  );
}