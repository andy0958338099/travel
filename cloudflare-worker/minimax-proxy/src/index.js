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
  "manga/panel", // NEW: fire-and-forget — see runMangaPanelPipeline
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

    // ── Manga panel: fire-and-forget ──
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
// Background pipeline for manga/panel regeneration
// ────────────────────────────────────────────────────────────
// Runs in event.waitUntil — Worker wall time NOT counted (already returned 202).
// CPU time still capped at 10ms (free) but MiniMax is I/O wait so no problem.
async function runMangaPanelPipeline(payload, env) {
  const { mangaId, panel, prompt, refImageUrl, aspectRatio = "3:4" } = payload;
  const apiKey = env.MINIMAX_API_KEY;
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;

  if (!apiKey || !supabaseUrl || !supabaseKey) {
    console.error(
      `manga/panel ${mangaId}/${panel}: missing secrets (apiKey=${!!apiKey}, supabaseUrl=${!!supabaseUrl}, supabaseKey=${!!supabaseKey})`
    );
    return;
  }

  console.log(`manga/panel ${mangaId}/${panel}: starting pipeline`);

  try {
    // 1) MiniMax image_generation (with subject_reference for character consistency)
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

    // 2) Supabase storage upload (bytes from base64)
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const objectPath = `${mangaId}/panel_${panel}.jpg`;
    const uploadStart = Date.now();
    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/${SUPABASE_BUCKET}/${objectPath}`,
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
      throw new Error(
        `Supabase upload ${uploadRes.status}: ${errText.slice(0, 200)}`
      );
    }
    const uploadElapsed = ((Date.now() - uploadStart) / 1000).toFixed(1);
    console.log(
      `manga/panel ${mangaId}/${panel}: upload ok (${uploadElapsed}s, ${(bytes.length / 1024).toFixed(0)}KB)`
    );

    // 3) Update DB row with new panel URL + status=ready
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${SUPABASE_BUCKET}/${objectPath}`;
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
          status: "ready",
          updated_at: new Date().toISOString(),
        }),
      }
    );
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(
        `Supabase update ${updateRes.status}: ${errText.slice(0, 200)}`
      );
    }
    console.log(
      `manga/panel ${mangaId}/${panel}: DONE — ${publicUrl.slice(0, 80)}…`
    );
  } catch (e) {
    console.error(`manga/panel ${mangaId}/${panel} FAILED: ${e.message}`);
    // Best-effort: mark panel as failed so UI can show error
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
      // ignore — already failed
    }
  }
}
