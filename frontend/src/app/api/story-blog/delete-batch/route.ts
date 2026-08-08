/**
 * 🅒 2026-08-08 聖上拍板: 整體刪除批次 API
 *   POST /api/story-blog/delete-batch
 *   Body: { groupKey: string }  (前 8 字 LOCK id, 識別同次送出的所有 LOCK)
 *   Response: { ok: true, removedRanges: number }
 *
 *   行為:
 *   - 讀 d1 row 的 text 欄位
 *   - regex 找出所有 <!--LOCK:id-->...<!--/LOCK--> 範圍
 *   - 移除 LOCK id 前 8 字 == groupKey 的所有範圍
 *   - 寫回 Supabase
 *
 *   🅒 8-8 (二改): 改用 anon key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
 *     - Supabase RLS 已允許 anon key UPDATE (204 驗證過)
 *     - 之前用 service_role 是「安全 defensive」, 但需要 Netlify env 額外設
 *     - 改用 anon key 跟 polish-d1 API 一致, Netlify 不用額外 env
 *     - 缺點: 任何能拿到 publishable key 的人都能刪 (但這 key 已在前端公開, 風險已存在)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupKey } = body;

    if (!groupKey || typeof groupKey !== "string" || groupKey.length < 4) {
      return NextResponse.json(
        { error: "groupKey required (min 4 chars)" },
        { status: 400 }
      );
    }

    // 🅒 8-8 改: 用 anon key (跟 polish-d1 一致), RLS 已允許 UPDATE
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    if (!key) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not configured" },
        { status: 500 }
      );
    }
    const supabase = createClient(url, key, {
      auth: { persistSession: false },
    });

    // 讀 d1 row
    const { data: row, error: readErr } = await supabase
      .from("story_blog_drafts")
      .select("text")
      .eq("id", "d1")
      .maybeSingle();

    if (readErr) {
      return NextResponse.json(
        { error: `Read failed: ${readErr.message}` },
        { status: 500 }
      );
    }

    const text = row?.text ?? "";
    if (!text) {
      return NextResponse.json({ ok: true, removedRanges: 0 });
    }

    // regex: 移除所有 LOCK id 前 8 字 == groupKey 的範圍
    // LOCK id 格式: l{date.now base36}{i base36}{random}{可能 -N-N-N 污染}
    // 先抽取所有 LOCK 範圍, 判斷前 8 字
    const lockRe = /<!--LOCK:([a-z0-9-]+)-->([\s\S]*?)<!--\/LOCK-->/g;
    let modifiedText = text;
    let removedCount = 0;
    const matches: Array<{ full: string; id: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = lockRe.exec(text)) !== null) {
      matches.push({ full: m[0], id: m[1] });
    }

    // 反向迭代 (避免 index 漂移), 移除匹配 groupKey 的範圍
    for (let i = matches.length - 1; i >= 0; i--) {
      const cleanedId = matches[i].id.replace(/-/g, "");
      const key8 = cleanedId.slice(0, 8);
      if (key8 === groupKey) {
        // 移除整個範圍 (含前後空行)
        const fullMatch = matches[i].full;
        // 找範圍前後的空行
        const beforeText = modifiedText.split(fullMatch)[0];
        const afterText = modifiedText.split(fullMatch).slice(1).join(fullMatch);
        // trim trailing 換行
        modifiedText =
          beforeText.replace(/\n+$/, "") + "\n\n" + afterText.replace(/^\n+/, "");
        removedCount += 1;
      }
    }

    if (removedCount === 0) {
      return NextResponse.json(
        { ok: true, removedRanges: 0, warning: "No LOCK range matched groupKey" }
      );
    }

    // 寫回 Supabase
    const { error: writeErr } = await supabase
      .from("story_blog_drafts")
      .update({
        text: modifiedText,
        updated_at: new Date().toISOString(),
        updated_by: "🗑 delete-batch",
      })
      .eq("id", "d1");

    if (writeErr) {
      return NextResponse.json(
        { error: `Write failed: ${writeErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, removedRanges: removedCount });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("[delete-batch] error:", e);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}