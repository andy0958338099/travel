#!/usr/bin/env node
/**
 * google-photos-oauth.mjs
 *
 * 2026-07-26 聖上拍板: 走 Google Photos Library API + OAuth, 拿 317 個 media items
 *
 * 流程:
 *   1. 聖上到 https://console.cloud.google.com/ 建 OAuth Client ID (Desktop app)
 *   2. 把 CLIENT_ID + CLIENT_SECRET 填到 .env (或直接傳環境變數)
 *   3. 跑這個 script: 自動開瀏覽器 -> 聖上登入 -> 同意 -> 拿 refresh_token
 *   4. 跑 fetch-google-photos-album.mjs: 用 refresh_token 抓 317 個 media items + baseUrl
 *   5. 上傳到 Supabase 對應到 116 個沒 thumb 的
 *
 * 第一次跑需要 Google Cloud Console 的 Client ID
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { URL } from "node:url";

const execp = promisify(exec);

const SCOPES = [
  "https://www.googleapis.com/auth/photoslibrary.readonly",
];

const REDIRECT_URI = "http://localhost:8765/callback";

async function main() {
  let clientId = process.env.GOOGLE_PHOTOS_CLIENT_ID;
  let clientSecret = process.env.GOOGLE_PHOTOS_CLIENT_SECRET;

  // 從 .env 讀
  if (!clientId && existsSync(".env")) {
    const env = readFileSync(".env", "utf-8");
    for (const line of env.split("\n")) {
      const m = line.match(/^(\w+)\s*=\s*(.*)$/);
      if (m) {
        if (m[1] === "GOOGLE_PHOTOS_CLIENT_ID") clientId = m[2].replace(/['"]/g, "");
        if (m[1] === "GOOGLE_PHOTOS_CLIENT_SECRET") clientSecret = m[2].replace(/['"]/g, "");
      }
    }
  }

  if (!clientId || !clientSecret) {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  請先到 Google Cloud Console 建 OAuth Client ID           ║
╚════════════════════════════════════════════════════════════╝

步驟:
1. 開 https://console.cloud.google.com/
2. 建/選一個專案 (e.g. "travel-album")
3. APIs & Services → Library → 搜 "Photos Library API" → Enable
4. APIs & Services → Credentials → Create Credentials
   → OAuth 2.0 Client IDs → Application type: Desktop app
5. 拿到 Client ID + Client Secret
6. 設環境變數:
   export GOOGLE_PHOTOS_CLIENT_ID="xxx.apps.googleusercontent.com"
   export GOOGLE_PHOTOS_CLIENT_SECRET="GOCSPX-xxx"
7. 再跑一次這個 script

`);
    process.exit(1);
  }

  console.log("📌 設定:");
  console.log(`   CLIENT_ID: ${clientId.slice(0, 20)}...`);
  console.log(`   REDIRECT: ${REDIRECT_URI}`);
  console.log(`   SCOPES: ${SCOPES.join(", ")}\n`);

  // Step 1: 建 auth URL
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES.join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");  // 強制拿 refresh_token

  console.log("🌐 開瀏覽器到 Google 登入頁...");
  await execp(`open "${authUrl.toString()}"`);

  // Step 2: 啟 local server 收 callback
  const code = await waitForCallback();
  console.log(`\n✅ 收到 authorization code: ${code.slice(0, 20)}...`);

  // Step 3: 換 token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const tokenData = await tokenRes.json();
  if (tokenData.error) {
    console.error(`❌ Token 交換失敗: ${tokenData.error} - ${tokenData.error_description}`);
    process.exit(1);
  }

  const { access_token, refresh_token, expires_in } = tokenData;
  console.log(`\n✅ 拿到 access_token (${expires_in}s 過期)`);
  if (refresh_token) {
    console.log(`✅ 拿到 refresh_token (永久有效, 存到 .google-token.json)`);
    writeFileSync(".google-token.json", JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token,
      access_token,
      expires_at: Date.now() + expires_in * 1000,
    }, null, 2));
  } else {
    console.log("⚠️  沒拿到 refresh_token (可能之前已授權過, 用既有 access_token)");
    writeFileSync(".google-token.json", JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      access_token,
      expires_at: Date.now() + expires_in * 1000,
    }, null, 2));
  }

  console.log("\n🎉 完成! 現在跑:");
  console.log("   node scripts/fetch-google-photos-album.mjs");
}

function waitForCallback() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      try {
        const u = new URL(req.url, REDIRECT_URI);
        if (u.pathname === "/callback") {
          const code = u.searchParams.get("code");
          const error = u.searchParams.get("error");
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          if (error) {
            res.end(`<h1>❌ ${error}</h1><p>請回 terminal 看 error</p>`);
            reject(new Error(error));
          } else {
            res.end(`<h1>✅ 授權成功!</h1><p>請回 terminal 看下一步</p><script>window.close()</script>`);
            resolve(code);
          }
          setTimeout(() => server.close(), 1000);
        } else {
          res.writeHead(404);
          res.end("Not Found");
        }
      } catch (e) {
        reject(e);
      }
    });
    server.listen(8765, () => {
      console.log("🛰️  Local server 啟動在 port 8765, 等 Google 授權 callback...");
    });
  });
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
