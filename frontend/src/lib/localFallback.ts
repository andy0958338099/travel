/**
 * 🆕 2026-11-14: 本地 Supabase fallback 資料層
 *
 * 背景：Supabase 專案被 spend cap / egress quota 限制時，REST API 與 Storage
 * 全部回 402（"Service for this project is restricted... exceed_cached_egress_quota"），
 * 連正式站也一樣顯示「0 個故事」。但 **Postgres 本身仍可透過 pooler 直連**，
 * 而部落格 371 張照片有本地存檔（data/archive/2026-10-06-story-blog/images/）。
 *
 * 所以這支模組提供兩件事：
 *   1. `localQuery()` —— 走 pooler 直連 Postgres 查資料
 *   2. `localImagePath()` —— 把 Storage 網址對應到本地存檔的檔案路徑
 *
 * 只在 Supabase API 不可用時啟用（見 lib/supabaseFallback.ts 的健康檢查）。
 * 資料以 Postgres 為準，與線上同一份 DB，不會產生分叉。
 */

import { Client } from "pg";
import fs from "fs";
import path from "path";

/** 本地部落格圖片存檔（檔名 = <post_id 前 8 碼>-<原檔名>） */
const LOCAL_IMAGE_DIR = path.join(
  process.cwd(),
  "data",
  "archive",
  "2026-10-06-story-blog",
  "images"
);

let clientPromise: Promise<Client> | null = null;

/** 取得（或建立）pooler 直連的 Postgres client */
async function getClient(): Promise<Client> {
  if (clientPromise) return clientPromise;

  const rawUrl = process.env.DATABASE_URL || "";
  const pwMatch = rawUrl.match(/:([^:@]+)@/);
  if (!pwMatch) {
    throw new Error("DATABASE_URL 缺少密碼，無法建立 pooler 連線");
  }
  const password = decodeURIComponent(pwMatch[1]);

  // Supabase 直連 DNS 在本地不通（SKILL 已記錄），必走 pooler
  const region = process.env.SUPABASE_DB_REGION || "aws-0-ap-northeast-2";
  const projectRef =
    process.env.SUPABASE_PROJECT_REF || "wydftkqwhebwlmdbosap";

  // ⚠️ 2026-11-14 修正: port 5432 = Supavisor「session mode」,
  //   該模式的 pool_size 上限 15,本機多個 Next worker + dev server
  //   長期持有連線 → 很快撞滿,回
  //   "EMAXCONNSESSION max clients reached in session mode - max clients
  //    are limited to pool_size: 15",
  //   讓 fallback 整條失效 (preview 頁直接報「載入失敗: restricted」)。
  //   port 6543 = 「transaction mode」,每次查詢借用連線、隨即归还,
  //   不受 pool_size 限制 → 改用 6543。
  const port = process.env.SUPABASE_DB_PORT || "6543";

  const connectionString = `postgres://postgres.${projectRef}:${encodeURIComponent(
    password
  )}@${region}.pooler.supabase.com:${port}/postgres`;

  clientPromise = (async () => {
    const c = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 20000,
    });
    // ⚠️ 2026-11-14: pooler 會回收 idle 連線，Client 會 emit 'error'。
    //   沒有 error listener 時 Node 會視為 uncaughtException 直接讓
    //   Next.js worker 崩掉（log 實測出現
    //   "⨯ uncaughtException: Error: Connection terminated unexpectedly"）。
    //   這裡吞掉 error 事件，並清掉 cache 讓下次重新連。
    c.on("error", (err: Error) => {
      console.error("[localFallback] pooler 連線錯誤:", err.message);
      if (clientPromise) {
        clientPromise = null;
      }
    });
    await c.connect();
    return c;
  })();

  // 連線失敗時清掉 cache，讓下次可以重試
  clientPromise.catch(() => {
    clientPromise = null;
  });

  return clientPromise;
}

/**
 * 用 pooler 直連 Postgres 查資料。
 *
 * @param sql       查詢語句
 * @param params    參數陣列
 */
export async function localQuery<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = await getClient();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } catch (e) {
    // ⚠️ 2026-11-14: 連線若已被 server 關閉 (idle timeout / pooler 回收),
    //   第一次 query 會報 "Client has encountered a connection error"。
    //   丟掉 cache 後重試一次,避免整條 fallback 死掉。
    const msg = (e as Error).message || "";
    if (/connection|terminated|ECONNRESET|client has encountered/i.test(msg)) {
      console.error("[localFallback] 連線失效,重建後重試:", msg);
      clientPromise = null;
      try {
        await client.end().catch(() => {});
      } catch {
        /* ignore */
      }
      const fresh = await getClient();
      const result = await fresh.query(sql, params);
      return result.rows as T[];
    }
    throw e;
  }
}

/**
 * 用 pooler 直連 Postgres 執行寫入語句（INSERT / UPDATE / DELETE）。
 *
 * 🆕 2026-11-14: 補上「寫入」fallback。
 *   背景：專案被 spend cap 限制時，REST API 全回 402，
 *   但 **Postgres 透過 pooler 直連仍可寫入** —— 寫進的是同一份雲端
 *   資料庫，不是本機假資料，所以線上與本機看到的仍是同一筆。
 *
 * @param sql    寫入語句（必須含 RETURNING * 以便回傳結果）
 * @param params 參數陣列
 */
export async function localExec<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = await getClient();
  const run = async () => {
    const result = await client.query(sql, params);
    return result.rows as T[];
  };
  try {
    return await run();
  } catch (e) {
    const msg = (e as Error).message || "";
    if (/connection|terminated|ECONNRESET|client has encountered/i.test(msg)) {
      console.error("[localFallback] 寫入時連線失效,重建後重試:", msg);
      clientPromise = null;
      try {
        await client.end().catch(() => {});
      } catch {
        /* ignore */
      }
      return await run();
    }
    throw e;
  }
}

/**
 * 把 Supabase Storage 網址對應到本地存檔路徑。
 *
 * 本地檔名格式：`<post_id 前 8 碼>-<原始檔名>`
 * 但 Storage 網址只有原始檔名，所以需要 posts 的 id 一起判斷。
 *
 * @param storageUrl  Storage 公開網址或原始檔名
 * @param postId     post 的 uuid
 * @returns          絕對路徑；找不到回 null
 */
export function localImagePath(storageUrl: string, postId?: string): string | null {
  if (!storageUrl) return null;

  const fileName = storageUrl.split("/").pop() || "";
  if (!fileName) return null;

  // 1) 直接命中（檔名完全相同）
  const direct = path.join(LOCAL_IMAGE_DIR, fileName);
  if (fs.existsSync(direct)) return direct;

  // 2) 用 post id 前綴比對
  if (postId) {
    const prefix = postId.slice(0, 8);
    try {
      const candidates = fs
        .readdirSync(LOCAL_IMAGE_DIR)
        .filter((f) => f.startsWith(prefix));
      if (candidates.length === 1) {
        return path.join(LOCAL_IMAGE_DIR, candidates[0]);
      }
    } catch {
      // 讀不到目錄就當作沒命中
    }
  }

  return null;
}

/** 本地圖片目錄是否存在（健康檢查用） */
export function localImageDirExists(): boolean {
  try {
    return fs.existsSync(LOCAL_IMAGE_DIR);
  } catch {
    return false;
  }
}
