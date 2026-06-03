// Cloudflare Worker: MiniMax proxy
// Receives a MiniMax API request, forwards to api.minimax.io with the secret key,
// returns the result. Bypasses Netlify's 26-30s function timeout.
//
// Free tier: 100k req/day, 10ms CPU per request (wall time up to 30s for I/O).
// MiniMax calls are mostly I/O wait, so free tier is fine.

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

    const apiKey = env.MINIMAX_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "MINIMAX_API_KEY not set in worker secret" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
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

    // Whitelist allowed endpoints (security: don't let anyone call any API)
    const ALLOWED = new Set([
      "v1/image_generation",
      "v1/chat/completions",
      "v1/music_generation",
    ]);
    if (!ALLOWED.has(endpoint)) {
      return new Response(
        JSON.stringify({ error: `Endpoint '${endpoint}' not allowed` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const upstream = await fetch(`https://api.minimax.io/${endpoint}`, {
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
          "Content-Type": upstream.headers.get("Content-Type") || "application/json",
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
