/**
 * Manga Hide Service
 *
 * 2026-07-02 聖上拍板: 隱藏/還原整張生成漫畫, 雲端同步給所有裝置共用。
 *
 * Pattern 抄自 attractionGalleryService:
 * - 客戶端先讀 /api/manga/hidden-list 拿到雲端 sourceIds
 * - 客戶端讀 localStorage (STORAGE_KEY) 拿到本地隱藏清單, 兩者合併
 * - 點 × → POST /api/manga/hide + 寫 localStorage
 * - 點「還原」 → POST /api/manga/unhide + 寫 localStorage
 *
 * 不 hard delete travel_mangas row / 不刪 storage 圖,
 * 只是 feed/UI 不秀出來, 給聖上後悔的機會。
 */

const STORAGE_KEY = "manga-studio-hidden-v1";
const SOURCE_TYPE = "attraction"; // 預設, 未來擴充 food

// ── Cloud API helpers ─────────────────────────────────────────

async function fetchHiddenListFromCloud(): Promise<Set<string>> {
  try {
    const res = await fetch(`/api/manga/hidden-list?sourceType=${SOURCE_TYPE}`);
    if (!res.ok) return new Set();
    const json = await res.json();
    return new Set<string>(json.hiddenIds || []);
  } catch (e) {
    console.warn("[manga-hide] fetchHiddenList failed:", e);
    return new Set();
  }
}

async function hideCloud(sourceId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/manga/hide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, sourceType: SOURCE_TYPE }),
    });
    return res.ok;
  } catch (e) {
    console.warn("[manga-hide] hide cloud failed:", e);
    return false;
  }
}

async function unhideCloud(sourceId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/manga/unhide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId }),
    });
    return res.ok;
  } catch (e) {
    console.warn("[manga-hide] unhide cloud failed:", e);
    return false;
  }
}

// ── Local storage cache ───────────────────────────────────────

function readLocalHidden(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set<string>(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function writeLocalHidden(set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // quota
  }
}

// ── Public API ────────────────────────────────────────────────

/**
 * 啟動時拿完整隱藏清單, 雲端 + 本地合併 (雲端優先)
 */
export async function getHiddenMangas(): Promise<Set<string>> {
  const cloud = await fetchHiddenListFromCloud();
  const local = readLocalHidden();
  // 合併: 所有都列為 hidden (本地的可能雲端還沒同步到, 反正本地先標記)
  const merged = new Set<string>(cloud);
  for (const id of local) merged.add(id);
  return merged;
}

/**
 * 隱藏某 sourceId (雲端 + 本地都更新)
 */
export async function hideManga(sourceId: string): Promise<void> {
  await hideCloud(sourceId);
  const local = readLocalHidden();
  local.add(sourceId);
  writeLocalHidden(local);
}

/**
 * 還原 (雲端 + 本地都移除)
 */
export async function unhideManga(sourceId: string): Promise<void> {
  await unhideCloud(sourceId);
  const local = readLocalHidden();
  local.delete(sourceId);
  writeLocalHidden(local);
}

/**
 * 強制重新從雲端拉 (UI 動完後用, 確保 localStorage 不漂)
 */
export async function refreshHiddenMangas(): Promise<Set<string>> {
  const cloud = await fetchHiddenListFromCloud();
  writeLocalHidden(cloud);
  return cloud;
}
