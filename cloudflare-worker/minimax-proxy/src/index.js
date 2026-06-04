// Cloudflare Worker: MiniMax proxy + fire-and-forget manga panel regen
// Bypasses Netlify's 26-30s function timeout by:
//   1) Forwarding MiniMax API calls (image_generation, chat, music) — synchronous
//   2) Running manga/panel pipeline in background (event.waitUntil) — Worker
//      returns 202 immediately, background handles MiniMax + Supabase upload
//      + DB update without being capped by Netlify's request lifecycle.
//
// Free tier: 100k req/day, 10ms CPU per request (wall time up to 30s for I/O).
// MiniMax calls are mostly I/O wait, so free tier is fine.

const ALLOWED_ENDPOINTS = new Set([
  "image_generation",
  "chat/completions",
  "music_generation",
  "manga/panel",   // fire-and-forget — single panel regenerate
  "manga/generate", // fire-and-forget — full 4-panel manga generation
]);

const SUPABASE_BUCKET = "travel-manga";
const SUPABASE_PUBLIC_URL_TTL_SECONDS = 3600; // signed URL expiry (1h) — actually we use public bucket, no signing needed

export default {
  async fetch(request, env, ctx) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { endpoint, payload } = body;
    if (!endpoint || !payload) {
      return new Response(
        JSON.stringify({ error: "Missing 'endpoint' or 'payload' in body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!ALLOWED_ENDPOINTS.has(endpoint)) {
      return new Response(
        JSON.stringify({ error: `Endpoint '${endpoint}' not allowed` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Manga panel / generate: fire-and-forget ──
    if (endpoint === "manga/panel") {
      const { mangaId, panel } = payload;
      if (!mangaId || ![1, 2, 3, 4].includes(panel)) {
        return new Response(
          JSON.stringify({ error: "manga/panel needs mangaId + panel(1-4)" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      // Schedule background pipeline (does NOT block response)
      ctx.waitUntil(runMangaPanelPipeline(payload, env));
      // Return 202 Accepted immediately
      return new Response(
        JSON.stringify({
          accepted: true,
          status: "regenerating",
          mangaId,
          panel,
        }),
        {
          status: 202,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    if (endpoint === "manga/generate") {
      const { mangaId } = payload;
      if (!mangaId) {
        return new Response(
          JSON.stringify({ error: "manga/generate needs mangaId" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      // Schedule background pipeline (does NOT block response)
      // 4 panel sequential: ~120s, but waitUntil doesn't count toward wall time
      ctx.waitUntil(runMangaGeneratePipeline(payload, env));
      return new Response(
        JSON.stringify({
          accepted: true,
          status: "regenerating",
          mangaId,
          totalPanels: 4,
        }),
        {
          status: 202,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // ── Other endpoints: forward to MiniMax (synchronous) ──
    const apiKey = env.MINIMAX_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "MINIMAX_API_KEY not set in worker secret" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const upstream = await fetch(`https://api.minimax.io/v1/${endpoint}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: {
          "Content-Type":
            upstream.headers.get("Content-Type") || "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (e) {
      return new Response(
        JSON.stringify({ error: `Worker upstream fetch failed: ${e.message}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};

// ────────────────────────────────────────────────────────────
// Background pipeline for manga panel regeneration
// ────────────────────────────────────────────────────────────
// Runs in event.waitUntil — Worker wall time NOT counted (already returned 202).
// CPU time still capped at 10ms (free) but MiniMax is I/O wait so no problem.

// Single-panel helper — generates one image, uploads, updates row.
// Used by both runMangaPanelPipeline (single regen) and runMangaGeneratePipeline (4-panel).
async function runSinglePanel({ mangaId, panel, prompt, refImageUrl, aspectRatio = "3:4" }, env) {
  const apiKey = env.MINIMAX_API_KEY;
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;
  const bucket = SUPABASE_BUCKET;

  if (!apiKey || !supabaseUrl || !supabaseKey) {
    throw new Error(
      `Worker secrets missing (apiKey=${!!apiKey}, supabaseUrl=${!!supabaseUrl}, supabaseKey=${!!supabaseKey})`
    );
  }

  // 1) MiniMax image_generation
  const mmBody = {
    model: "image-01",
    prompt,
    aspect_ratio: aspectRatio,
    n: 1,
    response_format: "base64",
    prompt_optimizer: true,
  };
  if (refImageUrl) {
    mmBody.subject_reference = [{ type: "character", image_file: refImageUrl }];
  }

  const mmStart = Date.now();
  const mmRes = await fetch("https://api.minimax.io/v1/image_generation", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mmBody),
  });
  const mmData = await mmRes.json();
  const mmElapsed = ((Date.now() - mmStart) / 1000).toFixed(1);

  if (mmData.base_resp?.status_code !== 0) {
    throw new Error(
      `MiniMax error: ${mmData.base_resp?.status_msg || JSON.stringify(mmData.base_resp)}`
    );
  }
  const base64 = mmData.data?.image_base64?.[0];
  if (!base64) {
    throw new Error(
      `MiniMax returned 0 images (failed=${mmData.metadata?.failed_count || "?"})`
    );
  }
  console.log(
    `manga/panel ${mangaId}/${panel}: MiniMax ok (${mmElapsed}s, ${(base64.length / 1024).toFixed(0)}KB b64)`
  );

  // 2) Supabase storage upload
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const objectPath = `${mangaId}/panel_${panel}.jpg`;
  const uploadStart = Date.now();
  const uploadRes = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
        "Content-Type": "image/jpeg",
        "x-upsert": "true",
      },
      body: bytes,
    }
  );
  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Supabase upload ${uploadRes.status}: ${errText.slice(0, 200)}`);
  }
  const uploadElapsed = ((Date.now() - uploadStart) / 1000).toFixed(1);
  console.log(
    `manga/panel ${mangaId}/${panel}: upload ok (${uploadElapsed}s, ${(bytes.length / 1024).toFixed(0)}KB)`
  );

  // 3) Update DB row
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
  const updateRes = await fetch(
    `${supabaseUrl}/rest/v1/travel_mangas?id=eq.${mangaId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        [`panel_${panel}_url`]: publicUrl,
        updated_at: new Date().toISOString(),
      }),
    }
  );
  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Supabase update ${updateRes.status}: ${errText.slice(0, 200)}`);
  }
  console.log(`manga/panel ${mangaId}/${panel}: DONE — ${publicUrl.slice(0, 80)}…`);
  return publicUrl;
}

async function runMangaPanelPipeline(payload, env) {
  const { mangaId, panel } = payload;
  console.log(`manga/panel ${mangaId}/${panel}: starting pipeline`);

  try {
    await runSinglePanel(payload, env);
  } catch (e) {
    console.error(`manga/panel ${mangaId}/${panel} FAILED: ${e.message}`);
    // Best-effort: mark as failed so UI can show error
    try {
      const supabaseUrl = env.SUPABASE_URL;
      const supabaseKey = env.SUPABASE_ANON_KEY;
      await fetch(`${supabaseUrl}/rest/v1/travel_mangas?id=eq.${mangaId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          status: "failed",
          updated_at: new Date().toISOString(),
        }),
      });
    } catch {
      // ignore
    }
  }
}

// ────────────────────────────────────────────────────────────
// Background pipeline for full 4-panel manga generation
// ────────────────────────────────────────────────────────────
// 4 panels sequential (~30s each) + descriptions (~10s chat) ≈ 130s total
// waitUntil doesn't count toward Worker 30s wall time cap.
async function runMangaGeneratePipeline(payload, env) {
  const { mangaId } = payload;
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;

  console.log(`manga/generate ${mangaId}: starting 4-panel pipeline`);

  try {
    // 1) 撈 manga + character
    const mangaRes = await fetch(
      `${supabaseUrl}/rest/v1/travel_mangas?id=eq.${mangaId}&select=*`,
      {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      }
    );
    const mangaArr = await mangaRes.json();
    const manga = mangaArr[0];
    if (!manga) throw new Error(`manga ${mangaId} not found`);

    const charRes = await fetch(
      `${supabaseUrl}/rest/v1/ai_characters?id=eq.${manga.character_id}&select=*`,
      {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      }
    );
    const charArr = await charRes.json();
    const char = charArr[0];
    if (!char?.reference_image_url) {
      throw new Error(`character ${manga.character_id} has no ref image`);
    }

    // 2) Resolve ref image (data: URL or http(s) URL — both MiniMax accepts)
    // Note: in generate pipeline Netlify has already resolved the local public/ file,
    // so we expect refImageUrl to be passed in. If not, fetch the column as-is.
    const refImageUrl = payload.refImageUrl || char.reference_image_url;
    if (refImageUrl.startsWith("/")) {
      throw new Error(
        `refImageUrl is a local path (${refImageUrl}) — Netlify must resolve & pass data: URL`
      );
    }

    // 3) Build prompts (we replicate Next.js buildPanelPrompt here, no captions per v3.0 NO-TEXT rule)
    const PANEL_TITLES = {
      1: "歡迎光臨",
      2: "歷史文化",
      3: "必吃美食",
      4: "打卡 tips",
    };
    const sourceName = manga.source_name;
    const stylePrompt = char.style_prompt || "";

    const buildPrompt = (panel) => {
      // Simplified: no character regional hint in worker (Next.js already handles region matching)
      const title = PANEL_TITLES[panel];
      const base = `${stylePrompt}, featuring ${sourceName} in ${title} scene.`;
      return `${base} Highly detailed, anime style, vibrant colors, no text, no words, no letters, no logos, no signage, no writing, no captions, no speech bubbles, no banners, no posters, no subtitles. Empty areas for future text overlay. Aspect ratio 3:4 vertical portrait.`;
    };

    // 4) Run 4 panels sequentially
    const PANEL_TITLES_ORDER = [
      { panel: 1, title: "歡迎光臨" },
      { panel: 2, title: "歷史文化" },
      { panel: 3, title: "必吃美食" },
      { panel: 4, title: "打卡 tips" },
    ];

    let successCount = 0;
    const panelErrors = [];
    for (const { panel } of PANEL_TITLES_ORDER) {
      try {
        await runSinglePanel(
          {
            mangaId,
            panel,
            prompt: buildPrompt(panel),
            refImageUrl,
            aspectRatio: "3:4",
          },
          env
        );
        successCount++;
      } catch (e) {
        console.error(`manga/generate ${mangaId}/${panel} failed: ${e.message}`);
        panelErrors.push({ panel, error: e.message.slice(0, 100) });
      }
    }

    // 5) Generate descriptions via chat (only if at least 1 panel succeeded)
    let shortDesc = "",
      mediumDesc = "",
      longDesc = "",
      captions = { 1: "", 2: "", 3: "", 4: "" };
    if (successCount > 0) {
      const descPrompt = `Generate travel description for ${manga.source_name} (${manga.source_type}). Reply ONLY in JSON: {"short_100": "...", "medium_300": "...", "long_800": "..."}. Language: 繁體中文. Style: friendly guide.`;
      try {
        const descRes = await fetch(
          "https://api.minimax.io/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.MINIMAX_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "MiniMax-M2.7",
              max_tokens: 2048,
              temperature: 0.8,
              messages: [
                { role: "system", content: "You are a friendly travel guide. Reply in 繁體中文. Output JSON only." },
                { role: "user", content: descPrompt },
              ],
            }),
          }
        );
        const descData = await descRes.json();
        const text = descData.choices?.[0]?.message?.content || "";
        const m = text.match(/\{[\s\S]*\}/);
        if (m) {
          const parsed = JSON.parse(m[0]);
          shortDesc = parsed.short_100 || "";
          mediumDesc = parsed.medium_300 || "";
          longDesc = parsed.long_800 || "";
        }
      } catch (e) {
        console.error(`manga/generate ${mangaId} description failed: ${e.message}`);
      }

      // 5b) Generate 4 panel captions
      if (shortDesc) {
        const capPrompt = `Based on: "${shortDesc.slice(0, 200)}", write 4 short caption lines (max 25 chars each) for panels 歡迎光臨/歷史文化/必吃美食/打卡 tips of ${manga.source_name}. Reply ONLY in JSON: {"panel_1":"...","panel_2":"...","panel_3":"...","panel_4":"..."}. Language: 繁體中文.`;
        try {
          const capRes = await fetch(
            "https://api.minimax.io/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${env.MINIMAX_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "MiniMax-M2.7",
                max_tokens: 600,
                temperature: 0.7,
                messages: [
                  { role: "system", content: "Output JSON only. 繁體中文." },
                  { role: "user", content: capPrompt },
                ],
              }),
            }
          );
          const capData = await capRes.json();
          const capText = capData.choices?.[0]?.message?.content || "";
          const m2 = capText.match(/\{[\s\S]*\}/);
          if (m2) {
            const parsed = JSON.parse(m2[0]);
            captions[1] = parsed.panel_1 || captions[1];
            captions[2] = parsed.panel_2 || captions[2];
            captions[3] = parsed.panel_3 || captions[3];
            captions[4] = parsed.panel_4 || captions[4];
          }
        } catch (e) {
          console.error(`manga/generate ${mangaId} caption failed: ${e.message}`);
        }
      }
    }

    // Fallbacks
    if (!captions[1]) captions[1] = "歡迎光臨！";
    if (!captions[2]) captions[2] = "歷史人文薈萃";
    if (!captions[3]) captions[3] = "必吃必拍";
    if (!captions[4]) captions[4] = "打卡攻略";

    // 6) Final DB update — write descriptions + captions + status
    const finalStatus =
      successCount === 4 ? "ready" : successCount > 0 ? "partial" : "failed";
    await fetch(`${supabaseUrl}/rest/v1/travel_mangas?id=eq.${mangaId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        short_desc: shortDesc,
        medium_desc: mediumDesc,
        long_desc: longDesc,
        panel_1_title: "歡迎光臨",
        panel_1_caption: captions[1],
        panel_2_title: "歷史文化",
        panel_2_caption: captions[2],
        panel_3_title: "必吃美食",
        panel_3_caption: captions[3],
        panel_4_title: "打卡 tips",
        panel_4_caption: captions[4],
        status: finalStatus,
        updated_at: new Date().toISOString(),
      }),
    });
    console.log(
      `manga/generate ${mangaId}: DONE — ${successCount}/4 panels, status=${finalStatus}`
    );
  } catch (e) {
    console.error(`manga/generate ${mangaId} FAILED: ${e.message}`);
    // Best-effort: mark row as failed
    try {
      await fetch(`${supabaseUrl}/rest/v1/travel_mangas?id=eq.${mangaId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          status: "failed",
          updated_at: new Date().toISOString(),
        }),
      });
    } catch {
      // ignore
    }
  }
}
