#!/usr/bin/env node
/**
 * google-drive-oauth.mjs
 *
 * 🆕 2026-11-14: 取得 Google Drive 的 refresh_token，讓部落格照片可以直接存放在
 *   Google Drive 的指定資料夾（而不是全部塞進 Supabase Storage）。
 *
 * 用法:
 *   node scripts/google-drive-oauth.mjs
 *
 * 前置:
 *   - .env.local 已有 GOOGLE_PHOTOS_CLIENT_ID / GOOGLE_PHOTOS_CLIENT_SECRET
 *     （跟 Google Photos OAuth 共用同一組憑證）
 *   - Google Cloud Console 已啟用 Drive API
 *     https://console.cloud.google.com/apis/library → 搜 "Google Drive API" → Enable
 *
 * 流程:
 *   1. 用現有 Client ID 組 auth URL（含 drive.readonly scope）
 *   2. 自動開瀏覽器 → 聖上登入並同意
 *   3. 本地 http server 收 callback → 拿 code
 *   4. 換 token → 存 refresh_token 到 .env.local 的 GOOGLE_DRIVE_REFRESH_TOKEN
 *
 * 注意: refresh_token 會寫進 .env.local，該檔已在 .gitignore 內，不會被 commit。
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { URL } from "node:url";

const execp = promisify(exec);

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
];

const REDIRECT_URI = "http://localhost:8766/callback";

/** 從 .env.local 讀變數（不覆蓋已存在的環境變數） */
function readEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

function base64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function main() {
  const envFile = ".env.local";
  const fileEnv = readEnvFile(envFile);

  const clientId =
    process.env.GOOGLE_DRIVE_CLIENT_ID || fileEnv.GOOGLE_DRIVE_CLIENT_ID || "";
  const clientSecret =
    process.env.GOOGLE_DRIVE_CLIENT_SECRET || fileEnv.GOOGLE_DRIVE_CLIENT_SECRET || "";

  if (!clientId) {
    console.error(
      "\n❌ 找不到 GOOGLE_DRIVE_CLIENT_ID\n" +
        "   請在 frontend/.env.local 設定（Desktop app 型別的 client ID）。\n"
    );
    process.exit(1);
  }

  // PKCE —— Google 對已備案的 Desktop app client 回 "code_verifier is not needed"，
  // 保留 code_challenge 反而會讓 token 交換失敗，所以不送 PKCE。
  console.log(`📌 Client ID: ${clientId.slice(0, 24)}...`);
  console.log(`📌 Secret: ${clientSecret ? "有（會帶上）" : "無（PKCE 流程）"}`);
  console.log(`📌 Scopes: ${SCOPES.join(", ")}`);
  console.log(`📌 Redirect: ${REDIRECT_URI}\n`);

  // Step 1: auth URL
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES.join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent"); // 強制拿 refresh_token

  console.log("🌐 開瀏覽器到 Google 登入頁...");
  try {
    await execp(`open "${authUrl.toString()}"`);
  } catch {
    console.log("⚠️  無法自動開瀏覽器，請手動開啟：\n" + authUrl.toString());
  }

  // Step 2: 收 callback
  const code = await waitForCallback();
  console.log(`\n✅ 收到 authorization code: ${code.slice(0, 20)}...`);

  // Step 3: 換 token
  const tokenBody = new URLSearchParams({
    code,
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });
  if (clientSecret) tokenBody.set("client_secret", clientSecret);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody,
  });
  const tokenData = await tokenRes.json();
  if (tokenData.error) {
    console.error(
      `❌ Token 交換失敗: ${tokenData.error} - ${tokenData.description || tokenData.error_description}`
    );
    process.exit(1);
  }

  const { access_token, refresh_token, expires_in } = tokenData;
  console.log(`\n✅ 拿到 access_token (${expires_in}s 過期)`);

  if (!refresh_token) {
    console.error(
      "\n⚠️  這次沒有拿到 refresh_token。\n" +
        "   通常是因為這個 Client ID 之前已授權過（Google 不再重發）。\n" +
        "   解法: 到 https://myaccount.google.com/permissions 移除該 App 的權限，再跑一次本腳本。\n"
    );
    process.exit(1);
  }
  console.log("✅ 拿到 refresh_token");

  // Step 4: 寫回 .env.local
  writeEnvVar(envFile, "GOOGLE_DRIVE_REFRESH_TOKEN", refresh_token);
  console.log(`\n💾 已寫入 ${envFile}: GOOGLE_DRIVE_REFRESH_TOKEN=...`);

  // Step 5: 驗證 Drive API 可用
  const verify = await fetch(
    "https://www.googleapis.com/drive/v3/files?pageSize=1&fields=files(id,name)&supportsAllDrives=true",
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  if (verify.ok) {
    console.log("✅ Drive API 驗證通過，可以列檔案了");
  } else {
    console.log(`⚠️  Drive API 回 ${verify.status}（可能是 Drive API 沒啟用）`);
  }

  console.log("\n🎉 完成！接下來:");
  console.log("   1. 重啟 dev server（讓 .env.local 的新變數生效）");
  console.log("   2. curl 'http://localhost:3000/api/gdrive/files?folderId=<你的資料夾ID>'");
  console.log("   3. 從 Google Drive 網址取得資料夾 ID：https://drive.google.com/drive/folders/<ID>");
}

/** 更新 .env.local 的某個變數（不存在就附加） */
function writeEnvVar(path, key, value) {
  let content = existsSync(path) ? readFileSync(path, "utf-8") : "";
  const re = new RegExp(`^${key}\\s*=.*$`, "m");
  if (re.test(content)) {
    content = content.replace(re, `${key}=${value}`);
  } else {
    if (content && !content.endsWith("\n")) content += "\n";
    content += `${key}=${value}\n`;
  }
  writeFileSync(path, content, "utf-8");
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
            res.end(
              "<h1>✅ 授權成功!</h1><p>請回 terminal 看下一步</p><script>window.close()</script>"
            );
            resolve(code);
          }
          setTimeout(() => server.close(), 1000);
        } else {
          res.writeHead(404);
          res.end("Not Found");
        }
      } catch (e) {
        res.writeHead(500);
        res.end("Error");
        reject(e);
      }
    });
    server.listen(8766, () => {
      console.log("🛰️  Local server 啟動在 port 8766, 等 Google 授權 callback...");
    });
  });
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
