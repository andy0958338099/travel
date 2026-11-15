// 收集全站部落格文章的實際文字(只用於字型 subset,不輸出敏感內容)
const { Client } = require("pg");
const fs = require("fs");

const raw = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of raw.split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
const password = decodeURIComponent((env.DATABASE_URL || "").match(/:([^:@]+)@/)?.[1] || "");
const url = `postgres://postgres.wydftkqwhebwlmdbosap:${encodeURIComponent(
  password,
)}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`;
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
c.on("error", () => {});

(async () => {
  await c.connect();
  const tables = await c.query(
    `select table_name from information_schema.tables where table_schema='public' and (table_name ilike '%post%' or table_name ilike '%blog%' or table_name ilike '%story%')`,
  );
  console.log("TABLES:", tables.rows.map((r) => r.table_name).join(","));
  const cols = await c.query(
    `select table_name, column_name, data_type from information_schema.columns
     where table_schema='public' and table_name in ('posts','story_blog_drafts')
     and data_type in ('text','character varying')`,
  );
  console.log("COLS:", cols.rows.map((r) => `${r.table_name}.${r.column_name}`).join(","));
  const byTable = {};
  for (const r of cols.rows) {
    (byTable[r.table_name] ||= []).push(r.column_name);
  }
  const parts = [];
  for (const [t, cs] of Object.entries(byTable)) {
    const sel = cs.map((c) => `coalesce("${c}",'')`).join("||' '||");
    const rr = await c.query(`select ${sel} as txt from "${t}"`);
    for (const row of rr.rows) parts.push(row.txt || "");
  }
  const txt = parts.join(" ");
  const chars = new Set(txt);
  console.log("TEXT_LEN:", txt.length, "UNIQUE_CHARS:", chars.size);
  fs.writeFileSync(
    "/tmp/site_chars.txt",
    [...chars].filter((c) => c.codePointAt(0) > 0x2000).join(""),
    "utf8",
  );
  await c.end();
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
