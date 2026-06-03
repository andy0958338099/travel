/**
 * POST /api/postcard/music
 * Body: { prompt: string, lyrics: string }
 * Server-side proxy for MiniMax music generation.
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

const MINIMAX_BASE = "https://api.minimax.io/v1";

function getApiKey(): string {
  const k = process.env.MINIMAX_API_KEY;
  if (!k) throw new Error("MINIMAX_API_KEY not configured");
  return k;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, lyrics } = (await req.json()) as { prompt: string; lyrics: string };
    if (!prompt || !lyrics) {
      return NextResponse.json({ error: "prompt and lyrics required" }, { status: 400 });
    }

    const res = await fetch(`${MINIMAX_BASE}/music_generation`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "music-2.6",
        prompt,
        lyrics,
        audio_setting: { sample_rate: 44100, bitrate: 256000, format: "mp3" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `music api ${res.status}: ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    const audioHex = data.data?.audio ?? null;
    return NextResponse.json({ audio: audioHex });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "music generate failed" }, { status: 500 });
  }
}
