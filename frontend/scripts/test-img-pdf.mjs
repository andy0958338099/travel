import puppeteer from "puppeteer";
const browser = await puppeteer.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 600 });
const html = `<!doctype html><html><body style="margin:0">
<img src="https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-01-t1-airport.jpg" style="display:block;width:200px;height:200px;object-fit:contain">
</body></html>`;
const t0 = Date.now();
await page.setContent(html, { waitUntil: "load", timeout: 30000 });
await page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise(r => {
    const img = document.querySelector("img");
    if (img.complete) r();
    else { img.addEventListener("load", r); img.addEventListener("error", r); }
  });
});
const buf = await page.pdf({ format: "A4", printBackground: true, margin: 0 });
console.log("PDF bytes:", buf.length, "elapsed:", Date.now()-t0, "ms");
const fs = await import("node:fs");
fs.writeFileSync("/tmp/test-img.pdf", buf);
await browser.close();
