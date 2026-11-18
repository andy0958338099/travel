import fs from "node:fs";
import { getStore } from "@netlify/blobs";

const key = process.argv[2] ?? "content/site-content.json";
const out = process.argv[3] ?? "/tmp/blob-site-content.json";

const store = getStore({
  name: "blog-images",
  siteID: process.env.NETLIFY_SITE_ID,
  token: process.env.NETLIFY_AUTH_TOKEN,
  apiURL: "https://api.netlify.com/api/v1",
});
const data = await store.get(key, { type: "text" });
if (!data) {
  console.error("key not found:", key);
  process.exit(1);
}
fs.writeFileSync(out, data, "utf8");
console.log(`${key} → ${out} (${data.length} chars)`);
