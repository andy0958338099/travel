/**
 * 🆕 2026-10-20 聖上指示: 個人化客製書 CRUD
 *
 * Endpoints:
 *   POST   /api/story-books                  建立新書 (or 上傳現有書草稿)
 *                                          body: { book_id?, title, layout_mode, selected_post_ids[] }
 *                                          → 回 { book_id, share_slug, author_token, ... }
 *
 *   GET    /api/story-books?book_id=<uuid>   讀一本書
 *                                          → 回 { book_id, share_slug, title, ..., posts[] }
 *
 *   GET    /api/story-books?slug=<8碼>       用 share_slug 讀 (公開預覽入口)
 *                                          → 同上 + 額外 increment view_count
 *
 *   PATCH  /api/story-books?book_id=<uuid>   更新 (要 header x-author-token 比對)
 *
 *   DELETE /api/story-books?book_id=<uuid>   刪除 (要 x-author-token)
 *
 * 設計原則 (10-20 聖上拍板):
 *   - 完全 anon,RLS 全開
 *   - 作者「擁有權」靠 author_token (URL hash 帶,不進 DB query)
 *   - 沒有帳號系統,token 在第一次建立時回給 client,client 存 localStorage
 *   - view_count 用 RPC 安全遞增
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSiteContent, refreshBooksSnapshot } from "@/lib/siteContent";
import { toDisplayImageUrl } from "@/lib/imageSource"; // 🆕 2026-11-14: gdrive:<fileId> → Google 圖片網址
import { IMAGE_VERSION } from "@/lib/imageVersion"; // 🆕 2026-11-15: 圖片網址版本參數（快取失效）

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================
// Supabase Service Client (RLS anon-safe 但能跑 RPC + view_count)
// ============================================================
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // 注意:這裡用 anon key 不是 service_role — 因為 RLS 是全公開的
  // 如果未來要嚴格管 author_token 校驗,改成 service_role + 自家比對
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ============================================================
// 短碼產生 (同步 DB 那隻)
// ============================================================
function genShareSlug(): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

// 估算頁數 (簡化版,跟前端 live preview 同步用)
// 規則:封面 + 扉頁 + 目錄 + 每 Day (intro + N posts)
//   - post < 100 字 + 同 orientation 可共頁(模式 C 啟用)
//   - 模式 A 每篇獨立 → post 數 +1
//   - 模式 B 同 A 但圖文 50:50
//   - 模式 C 高密度,共頁估算
function estimatePageCount(
  selectedPostIds: string[],
  layoutMode: "A" | "B" | "C",
): number {
  if (selectedPostIds.length === 0) return 4; // 封面+扉頁+目錄+空章
  // 簡化估算:每 1.5 篇佔 1 頁 (C 模式更緊)
  const PER_PAGE =
    layoutMode === "C" ? 2.2 : layoutMode === "B" ? 1.0 : 1.0;
  // Day 章節 = 8 天 + 序章 + 後記 ≈ 10 章,每章 intro = 1 頁
  // 為不依賴 actual post day 分布,先估算 unique days ≈ post count / 8 (平均)
  const estUniqueDays = Math.min(10, Math.ceil(selectedPostIds.length / 30));
  const postPages = Math.ceil(selectedPostIds.length / PER_PAGE);
  return 3 /* cover + front + toc */ + estUniqueDays + postPages;
}

// ============================================================
// POST — 建立 or 更新(同一 book_id)
// ============================================================
async function handlePost(req: NextRequest) {
  const supabase = getSupabase();
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    book_id,        // 可選 — 有 = 更新,無 = 新建
    trip_id = "00000000-0000-0000-0000-000000000001",
    title = "我的江南之旅",
    layout_mode = "A",
    selected_post_ids = [],
    author_name = "匿名旅人",
    author_token,    // 更新既有書時必帶
    share_slug,      // 更新既有書時可帶 (或不帶讓 server 重生)
    is_public = true,
  } = body;

  // 驗證
  if (!Array.isArray(selected_post_ids)) {
    return NextResponse.json(
      { error: "selected_post_ids must be array of UUID" },
      { status: 400 },
    );
  }
  if (!["A", "B", "C"].includes(layout_mode)) {
    return NextResponse.json({ error: "layout_mode must be A/B/C" }, { status: 400 });
  }

  const page_count_estimate = estimatePageCount(selected_post_ids, layout_mode);

  // === 更新現有 ===
  if (book_id) {
    // 校驗 author_token
    // 🆕 2026-11-14: Supabase 被 402 限制時,讀取與更新都要走 pooler。
    //   寫入的是同一份雲端 Postgres,不是本機資料。
    let existing: any = null;
    let readErr: { message: string } | null = null;
    try {
      const res = await supabase
        .from("custom_story_books")
        .select("author_token")
        .eq("book_id", book_id)
        .maybeSingle();
      existing = res.data;
      readErr = res.error;
    } catch (e) {
      readErr = { message: (e as Error).message };
    }

    if (readErr || !existing) {
      // fallback:pooler 直連讀
      try {
        const { localQuery } = await import("@/lib/localFallback");
        const rows = await localQuery<Record<string, unknown>>(
          "select author_token from custom_story_books where book_id = $1 limit 1",
          [book_id]
        );
        if (rows.length > 0) {
          existing = rows[0];
          readErr = null;
        }
      } catch (e) {
        console.error("[story-books] 更新時 pooler 讀取失敗:", e);
      }
    }

    if (readErr && !existing) {
      return NextResponse.json({ error: readErr.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }
    if (!author_token || existing.author_token !== author_token) {
      return NextResponse.json(
        { error: "Forbidden — author_token mismatch" },
        { status: 403 },
      );
    }

    // PATCH (保留 share_slug,除非 client 沒給就沿用)
    let updated: any = null;
    let updErr: { message: string } | null = null;
    try {
      const res = await supabase
        .from("custom_story_books")
        .update({
          title,
          layout_mode,
          selected_post_ids,
          page_count_estimate,
          is_public,
          author_name,
        })
        .eq("book_id", book_id)
        .select()
        .single();
      updated = res.data;
      updErr = res.error;
    } catch (e) {
      updErr = { message: (e as Error).message };
    }

    // fallback:pooler 直連更新
    if (updErr || !updated) {
      try {
        const { localExec } = await import("@/lib/localFallback");
        const rows = await localExec<Record<string, unknown>>(
          `update custom_story_books
             set title = $1, layout_mode = $2, selected_post_ids = $3,
                 page_count_estimate = $4, is_public = $5, author_name = $6,
                 updated_at = now()
           where book_id = $7
           returning *`,
          [
            title,
            layout_mode,
            selected_post_ids,
            page_count_estimate,
            is_public,
            author_name,
            book_id,
          ]
        );
        if (rows.length > 0) {
          updated = rows[0];
          updErr = null;
        }
      } catch (e) {
        console.error("[story-books] 更新時 pooler 寫入失敗:", e);
        if (updErr) {
          return NextResponse.json({ error: updErr.message }, { status: 500 });
        }
      }
    }

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
    // 🆕 2026-11-15: 同步公開快照（作者存檔 → 公開頁立即可見）
    await refreshBooksSnapshot();
    return NextResponse.json(updated);
  }

  // === 新建 ===
  // 重試 share_slug 直到 unique
  let slug: string | null = null;
  for (let i = 0; i < 5; i++) {
    const trySlug = genShareSlug();
    let exists: any = null;
    try {
      const res = await supabase
        .from("custom_story_books")
        .select("book_id")
        .eq("share_slug", trySlug)
        .maybeSingle();
      exists = res.data;
    } catch {
      // 402 等情況 → 改用 pooler 檢查
      try {
        const { localQuery } = await import("@/lib/localFallback");
        const rows = await localQuery<Record<string, unknown>>(
          "select book_id from custom_story_books where share_slug = $1 limit 1",
          [trySlug]
        );
        exists = rows.length > 0 ? rows[0] : null;
      } catch (e) {
        console.error("[story-books] slug 唯一性檢查失敗:", e);
        return NextResponse.json(
          { error: "Supabase 不可用且 pooler 也失敗" },
          { status: 500 },
        );
      }
    }
    if (!exists) {
      slug = trySlug;
      break;
    }
  }
  if (!slug) {
    return NextResponse.json(
      { error: "Failed to generate unique slug — retry" },
      { status: 500 },
    );
  }

  let created: any = null;
  let insErr: { message: string } | null = null;
  try {
    const res = await supabase
      .from("custom_story_books")
      .insert({
        trip_id,
        author_name,
        // author_token 讓 DB default gen_random_uuid()
        share_slug: slug,
        is_public,
        title,
        layout_mode,
        selected_post_ids,
        page_count_estimate,
      })
      .select()
      .single();
    created = res.data;
    insErr = res.error;
  } catch (e) {
    insErr = { message: (e as Error).message };
  }

  // fallback:pooler 直連新增（寫進同一份雲端 Postgres）
  if (insErr || !created) {
    try {
      const { localExec } = await import("@/lib/localFallback");
      const rows = await localExec<Record<string, unknown>>(
        `insert into custom_story_books
           (trip_id, author_name, share_slug, is_public, title, layout_mode,
            selected_post_ids, page_count_estimate)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning *`,
        [
          trip_id,
          author_name,
          slug,
          is_public,
          title,
          layout_mode,
          selected_post_ids,
          page_count_estimate,
        ]
      );
      if (rows.length > 0) {
        created = rows[0];
        insErr = null;
      }
    } catch (e) {
      console.error("[story-books] 新增時 pooler 寫入失敗:", e);
      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }
    }
  }

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }
  // 🆕 2026-11-15: 同步公開快照（新書立刻能透過 share_slug 公開分享）
  await refreshBooksSnapshot();
  return NextResponse.json(created, { status: 201 });
}

// ============================================================
// GET — 讀一本書
//   /api/story-books?book_id=<uuid>  帶 token 才能看 view_count 細節
//   /api/story-books?slug=<8碼>      公開預覽 + 自動 +1 view
// ============================================================
async function handleGet(req: NextRequest) {
  const supabase = getSupabase();
  const sp = req.nextUrl.searchParams;
  const bookId = sp.get("book_id");
  const slug = sp.get("slug");
  const token = req.headers.get("x-author-token") || sp.get("token");

  if (!bookId && !slug) {
    return NextResponse.json(
      { error: "Provide book_id or slug" },
      { status: 400 },
    );
  }

  let book: any = null;
  let error: { message: string } | null = null;

  // 🆕 2026-11-15: 站內快照優先（Blobs / repo 靜態檔）—— 完全脫離 Supabase。
  //   快照含 author_token（Blobs 版），所以作者判定仍可正常運作。
  const snapshot = await getSiteContent();
  if (snapshot) {
    const found = bookId
      ? snapshot.books.find((b) => b.book_id === bookId)
      : snapshot.books.find((b) => b.share_slug === slug);
    if (found) {
      book = { ...found };
      if (!book.author_token) book.author_token = null;
    }
  }

  // 快照沒有 → 走 Supabase REST（再退 pooler）
  if (!book) {
    let query = supabase.from("custom_story_books").select("*").limit(1);
    if (bookId) {
      query = query.eq("book_id", bookId);
    } else {
      query = query.eq("share_slug", slug);
    }
    // 🆕 2026-11-14: Supabase 掛掉時改走本地 pooler fallback
    //   注意: Supabase 遇到 402 限制時 maybeSingle() 可能直接 throw 而非回 error，
    //   所以整段要包 try/catch，fallback 才跑得到。
    try {
      const res = await query.maybeSingle();
      book = res.data;
      error = res.error;
    } catch (e) {
      error = { message: (e as Error).message };
    }

    if (error || !book) {
      try {
        const { localQuery } = await import("@/lib/localFallback");
        const rows = await localQuery<Record<string, unknown>>(
          bookId
            ? "select * from custom_story_books where book_id = $1 limit 1"
            : "select * from custom_story_books where share_slug = $1 limit 1",
          bookId ? [bookId] : [slug]
        );
        if (rows.length > 0) {
          book = rows[0];
          error = null;
        }
      } catch (e) {
        console.error("[story-books] 本地 fallback 失敗:", e);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  // 公開 slug 預覽 → 讀取瀏覽次數
  if (slug) {
    // 🆕 2026-11-17: 原本用 Supabase RPC `increment_book_view_count`。
    //   但 Supabase 專案被 spend cap 限制（402 exceed_cached_egress_quota），
    //   正式站每個預覽請求都會噴錯並拖慢回應 —— 而公開路徑本就不該
    //   依賴 Supabase。改用 Netlify Blobs 計數器。
    //
    //   讀寫分工：
    //   - 這裡（GET 路徑）只「讀」計數 → 顯示用。
    //     讀取走 blobPdf.getBlobText（REST + node:https），
    //     因為 SDK 的 store.get() 在 Next.js runtime 會卡住。
    //   - 「寫入」交給 standalone background function `story-view-count`，
    //     由 preview 頁面載入時 fire-and-forget 觸發。
    //     同步做 CAS 會讓每次預覽多花約 1 秒（Blob 讀寫各 500ms），
    //     且併發時重試可能撞 function 時間上限。
    try {
      const { readViewCount } = await import("@/lib/viewCounter");
      const stored = await readViewCount(slug);
      if (stored !== null) {
        book.view_count = stored;
      }
    } catch (e) {
      console.error("[story-books] 讀取 view_count 失敗:", e);
    }
  }

  // 載入被選的 posts
  const ids = book.selected_post_ids || [];
  let posts: any[] = [];
  if (ids.length) {
    // 🆕 2026-11-15: 站內快照優先 —— 完全脫離 Supabase
    let postsData: any[] | null = null;
    let postsErr: string | null = null;
    let usedFallback = false;

    if (snapshot) {
      const byIdSnapshot = new Map(snapshot.posts.map((p) => [p.id, p]));
      postsData = ids
        .map((id: string) => byIdSnapshot.get(id))
        .filter(Boolean) as any[];
      usedFallback = true; // 快照圖片一律走 /api/local-image
    } else {
      // 🆕 2026-11-14: Supabase 掛掉時改走本地 pooler fallback
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("trip_id", book.trip_id)
          .in("id", ids)
          .order("sort_order", { ascending: true });
        if (error) {
          postsErr = error.message;
        } else {
          postsData = data || [];
        }
      } catch (e) {
        postsErr = (e as Error).message;
      }

      // fallback：改走 pooler 直連（server route 不能用相對網址 fetch /api/...）
      if (postsErr || !postsData) {
        try {
          const { localQuery } = await import("@/lib/localFallback");
          const all = await localQuery<Record<string, unknown>>(
            "select * from posts where trip_id = $1 order by sort_order asc",
            [book.trip_id]
          );
          postsData = all as any[];
          usedFallback = true;
        } catch (e) {
          console.error("[story-books] posts 本地 fallback 失敗:", e);
        }
      }
    }

    if (postsErr && (!postsData || postsData.length === 0)) {
      return NextResponse.json({ error: postsErr }, { status: 500 });
    }
    // 確保順序依 selected_post_ids (DB order by sort_order 是另一回事)
    const byId = new Map((postsData || []).map((p: any) => [p.id, p]));
    posts = ids.map((id: string) => byId.get(id)).filter(Boolean);

    // 🆕 2026-11-14: Supabase Storage 也被限制時，圖片改走本地代理
    //   （只在走 fallback 時改寫；Supabase 正常時保持原始 Storage 網址不變）
    if (usedFallback) {
      posts = posts.map((p: any) => {
        if (!p.image_url) return p;
        return {
          ...p,
          image_url: `/api/local-image?postId=${encodeURIComponent(p.id)}&w=1200&v=${IMAGE_VERSION}`,
          original_image_url: p.image_url,
        };
      });
    }
  }

  // 是否作者本人 (= token 對得上)
  // 🆕 2026-11-15: repo 靜態快照刻意不含 author_token（版控是公開的）。
  //   快照是靜態版時 book.author_token 會是 null → 作者判定會失效。
  //   這時改從 pooler 讀真正的 token 來比對（只在帶了 token 時才查）。
  let authorTokenForCompare: string | null = book.author_token ?? null;
  if (!authorTokenForCompare && token) {
    try {
      const { localQuery } = await import("@/lib/localFallback");
      const rows = await localQuery<Record<string, unknown>>(
        "select author_token from custom_story_books where book_id = $1 limit 1",
        [book.book_id]
      );
      authorTokenForCompare = (rows[0]?.author_token as string) ?? null;
    } catch (e) {
      console.error("[story-books] owner token pooler 讀取失敗:", e);
    }
  }
  const isOwner = !!(token && token && token === authorTokenForCompare);

  // 🆕 2026-11-14: 安全修正 — 非作者不得拿到 author_token。
  //   之前 GET 一律回傳整包 book(含 author_token),任何拿到 share_slug 的人
  //   都能讀到作者 token → 可改 mode / 刪書 / 竄改選篇。
  //   現在只有 token 對得上(isOwner)才回傳,否則整個欄位移除。
  const bookOut = { ...book };
  if (!isOwner) {
    delete (bookOut as Record<string, unknown>).author_token;
  }

  // 🆕 2026-11-14: gdrive:<fileId> token 解析成 Google 圖片網址 (顯示層, DB 不動)
  posts = posts.map((p) => ({
    ...p,
    image_url: toDisplayImageUrl(p.image_url),
  }));

  return NextResponse.json({
    book: bookOut,
    posts,
    is_owner: isOwner,
  });
}

// ============================================================
// DELETE — 作者本人刪書
// ============================================================
async function handleDelete(req: NextRequest) {
  const supabase = getSupabase();
  const sp = req.nextUrl.searchParams;
  const bookId = sp.get("book_id");
  const token = req.headers.get("x-author-token") || sp.get("token");
  if (!bookId) {
    return NextResponse.json({ error: "Provide book_id" }, { status: 400 });
  }
  if (!token) {
    return NextResponse.json({ error: "Provide x-author-token" }, { status: 401 });
  }

  // 先校驗
  let existing: any = null;
  let readErr: { message: string } | null = null;
  try {
    const res = await supabase
      .from("custom_story_books")
      .select("author_token")
      .eq("book_id", bookId)
      .maybeSingle();
    existing = res.data;
    readErr = res.error;
  } catch (e) {
    readErr = { message: (e as Error).message };
  }

  // 🆕 2026-11-14: fallback → pooler 直連
  if (readErr || !existing) {
    try {
      const { localQuery } = await import("@/lib/localFallback");
      const rows = await localQuery<Record<string, unknown>>(
        "select author_token from custom_story_books where book_id = $1 limit 1",
        [bookId]
      );
      if (rows.length > 0) {
        existing = rows[0];
        readErr = null;
      }
    } catch (e) {
      console.error("[story-books] 刪除前 pooler 讀取失敗:", e);
    }
  }

  if (readErr && !existing) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
  if (existing.author_token !== token) {
    return NextResponse.json(
      { error: "Forbidden — author_token mismatch" },
      { status: 403 },
    );
  }

  let delErr: { message: string } | null = null;
  try {
    const { error } = await supabase
      .from("custom_story_books")
      .delete()
      .eq("book_id", bookId);
    delErr = error;
  } catch (e) {
    delErr = { message: (e as Error).message };
  }

  // fallback:pooler 直連刪除
  if (delErr) {
    try {
      const { localExec } = await import("@/lib/localFallback");
      await localExec(
        "delete from custom_story_books where book_id = $1",
        [bookId]
      );
      delErr = null;
    } catch (e) {
      console.error("[story-books] pooler 刪除失敗:", e);
    }
  }

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }
  // 🆕 2026-11-15: 同步公開快照（刪書後公開頁不再出現）
  await refreshBooksSnapshot();
  return NextResponse.json({ ok: true });
}

// ============================================================
// Dispatch
// ============================================================
export async function POST(req: NextRequest) {
  return handlePost(req);
}
export async function GET(req: NextRequest) {
  return handleGet(req);
}
export async function DELETE(req: NextRequest) {
  return handleDelete(req);
}
