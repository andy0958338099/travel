"use client";
import { useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { ATTRACTIONS, HOTELS, TRANSPORT, TIPS, ITINERARY } from "./data";

export default function PdfExporter({ plannedAttractions = [] }: { plannedAttractions?: string[] }) {
  const [generating, setGenerating] = useState(false);

  async function generatePdf() {
    setGenerating(true);
    try {
      window.__pdfLog = [];

      const pages = buildAllPages();
      const pageCanvases: HTMLCanvasElement[] = [];

      for (let i = 0; i < pages.length; i++) {
        const html = pages[i];
        // Replace __IMG_BASE64__ placeholders with actual base64 data
        const htmlWithImages = await preloadImages(html);
        const canvas = await renderHtmlPage(htmlWithImages, `page-${i}`);
        pageCanvases.push(canvas);
      }

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const PW = pdf.internal.pageSize.getWidth();   // 210mm
      const PH = pdf.internal.pageSize.getHeight();  // 297mm

      for (const canvas of pageCanvases) {
        if (canvas.width === 0 || canvas.height === 0) {
          console.warn("[PDF] Empty canvas skipped");
          continue;
        }

        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const scale = PW / canvas.width;
        const scaledH = canvas.height * scale;

        if (scaledH <= PH) {
          // Content fits in one page
          pdf.addImage(imgData, "JPEG", 0, 0, PW, scaledH);
          pdf.addPage();
        } else {
          // Slice content across multiple pages
          let yOffset = 0;
          let pageIdx = 0;
          while (yOffset < canvas.height) {
            const remaining = canvas.height - yOffset;
            const sliceH = Math.min(PH / scale, remaining);
            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sliceH;
            const ctx = sliceCanvas.getContext("2d")!;
            ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
            const sliceImg = sliceCanvas.toDataURL("image/jpeg", 0.92);
            pdf.addImage(sliceImg, "JPEG", 0, 0, PW, sliceH * scale);
            yOffset += sliceH;
            pageIdx++;
            if (yOffset < canvas.height) pdf.addPage();
          }
        }
      }

      // Remove trailing blank page (if > 6 pages and last is small)
      const count = pdf.getNumberOfPages();
      if (count > 6) {
        try { pdf.deletePage(count); } catch {}
      }

      pdf.save("江南水鄉八日之旅行程.pdf");
      window.__pdfErr = null;
    } catch (err) {
      console.error("[PDF] Generation error:", err);
      window.__pdfErr = String(err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <button
        onClick={generatePdf}
        disabled={generating}
        className="w-full bg-gradient-to-r from-teal-500 to-blue-500 text-white py-3 rounded-lg font-medium hover:from-teal-600 hover:to-blue-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {generating ? (
          <>
            <span className="animate-spin">⏳</span>
            生成 PDF 中（請稍候）...
          </>
        ) : (
          <>📄 匯出 PDF 行程表</>
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Build all page HTML structures
// ─────────────────────────────────────────────
function buildAllPages(): string[] {
  return [
    buildCoverPage(),
    buildItineraryPage(),
    buildAttractionsPage(),
    buildPhotoGalleryPage(),
    buildPackingListPage(),
    buildPracticalPage(),
  ];
}

// ─── Helper: wrap page in fixed-size container ───
function wrapPage(html: string): string {
  return `<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "PingFang TC", "Heiti TC", "Microsoft JhengHei", "Noto Sans CJK TC", sans-serif; background: #fff; color: #222; }
  .page { width: 794px; min-height: 1123px; padding: 48px 56px; background: #fff; page-break-after: always; page-break-inside: avoid; }
  .page:last-child { page-break-after: auto; }
</style>
</head><body>${html}</body></html>`;
}

function buildAttrImgTag(filename: string): string {
  return `__IMG_BASE64__:${filename}__`;
}

// ─────────────────────────────────────────────
// PAGE 1: Cover
// ─────────────────────────────────────────────
function buildCoverPage(): string {
  const html = `
<div class="page">
  <div style="height:1123px; display:flex; flex-direction:column; justify-content:space-between; background:linear-gradient(160deg,#0d5c63 0%,#14887c 40%,#1a9ab0 100%);">

    <div style="height:8px; background:linear-gradient(90deg,#f6d365,#fda085);"></div>

    <div style="text-align:center; padding: 0 40px;">
      <div style="font-size:13px; letter-spacing:6px; color:rgba(255,255,255,0.7); margin-bottom:20px;">HANGZHOU DEEP DIVE</div>
      <div style="font-size:72px; font-weight:900; color:#fff; line-height:1.1; letter-spacing:-2px;">
        杭州<br>深度之旅
      </div>
      <div style="font-size:20px; color:rgba(255,255,255,0.85); margin-top:16px; letter-spacing:4px;">
        8天7夜 · 7月17日 — 7月24日
      </div>
      <div style="width:60px; height:3px; background:#f6d365; margin:32px auto;"></div>
      <div style="font-size:16px; color:rgba(255,255,255,0.75);">2人 · 中華航空 CI 581/582</div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:2px; margin: 0 40px;">
      ${[
        ["✈️", "去程", "CI 581", "08:30 TPE→HGH"],
        ["🏨", "住宿", "7晚", "西湖/烏鎮"],
        ["💰", "預算區間", "NT$40-60K", "含2人來回"],
        ["🗓️", "出發日期", "2025/7/17", "7天後返程"],
      ].map(([emoji, label, val, sub]) => `
      <div style="background:rgba(255,255,255,0.12); padding:20px 12px; text-align:center;">
        <div style="font-size:24px; margin-bottom:8px;">${emoji}</div>
        <div style="font-size:11px; color:rgba(255,255,255,0.6); letter-spacing:2px;">${label}</div>
        <div style="font-size:18px; font-weight:700; color:#fff; margin-top:4px;">${val}</div>
        <div style="font-size:11px; color:rgba(255,255,255,0.7); margin-top:2px;">${sub}</div>
      </div>`).join("")}
    </div>

    <div style="margin: 0 40px 32px; background:rgba(0,0,0,0.15); border-radius:16px; padding:24px 28px;">
      <div style="font-size:12px; letter-spacing:3px; color:rgba(255,255,255,0.5); margin-bottom:16px;">行程一覽</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        ${ITINERARY.map(d => `
        <div style="display:flex; align-items:center; gap:10px; padding:8px 12px; background:rgba(255,255,255,0.08); border-radius:8px;">
          <span style="background:#f6d365; color:#0d5c63; font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px; flex-shrink:0;">${d.day}</span>
          <span style="font-size:13px; color:#fff; font-weight:500;">${d.title}</span>
        </div>`).join("")}
      </div>
    </div>

    <div style="height:6px; background:linear-gradient(90deg,#f6d365,#fda085);"></div>
  </div>
</div>`;
  return wrapPage(html);
}

// ─────────────────────────────────────────────
// PAGE 2: Itinerary (8 days) - DETAILED
// ─────────────────────────────────────────────
function buildItineraryPage(): string {
  const dayBlocks = ITINERARY.map((day, i) => {
    const attrMap: Record<string, string> = {
      "D1": "wl01-1", "D2": "wz01-1", "D3": "wz02-1",
      "D4": "wl04-3", "D5": "wl01-1", "D6": "wl06-1",
      "D7": "wl09-1", "D8": "wl01-1",
    };
    const imgFile = attrMap[day.day] || "wl01-1";
    const imgTag = buildAttrImgTag(imgFile + ".jpg");

    return `
    <div style="page-break-inside:avoid; margin-bottom:18px; border:1px solid #e0efe8; border-radius:12px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.06);">
      <div style="display:flex; height:128px;">
        <div style="width:160px; flex-shrink:0; background:#e8f0ee; overflow:hidden; position:relative;">
          <img src="${imgTag}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.parentElement.style.background='#14887c'"/>
        </div>
        <div style="flex:1; padding:12px 16px; display:flex; flex-direction:column; justify-content:space-between; background:#fff;">
          <div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
              <span style="background:#14887c; color:#fff; font-size:11px; font-weight:700; padding:2px 10px; border-radius:5px;">${day.day}</span>
              <span style="font-size:16px; font-weight:700; color:#1a1a1a;">${day.title}</span>
            </div>
            <div style="font-size:11px; color:#14887c; font-weight:600; margin-bottom:3px;">✨ ${day.highlight}</div>
            <div style="font-size:11px; color:#555; line-height:1.6; max-height:36px; overflow:hidden;">${day.content}</div>
          </div>
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:4px;">
            <span style="background:#f0faf8; color:#14887c; font-size:10px; padding:2px 7px; border-radius:3px; white-space:nowrap;">🍳 ${day.meals.breakfast}</span>
            <span style="background:#fff8f0; color:#b47800; font-size:10px; padding:2px 7px; border-radius:3px; white-space:nowrap;">🍜 ${day.meals.lunch}</span>
            <span style="background:#f8f0ff; color:#7a3ab0; font-size:10px; padding:2px 7px; border-radius:3px; white-space:nowrap;">🥢 ${day.meals.dinner}</span>
            <span style="background:#f5f5f5; color:#555; font-size:10px; padding:2px 7px; border-radius:3px; white-space:nowrap;">🚗 ${day.transport}</span>
            <span style="background:#f0faf8; color:#14887c; font-size:10px; padding:2px 7px; border-radius:3px; white-space:nowrap;">💰 ${day.budget}</span>
          </div>
        </div>
      </div>
    </div>`;
  }).join("");

  return wrapPage(`
<div class="page">
  <div style="font-size:22px; font-weight:800; color:#1a1a1a; margin-bottom:18px; padding-bottom:10px; border-bottom:3px solid #14887c;">
    📅 八日行程總覽
  </div>
  ${dayBlocks}
  <div style="text-align:center; padding:12px 0; color:#bbb; font-size:11px; border-top:1px solid #eee; margin-top:8px;">
    江南水鄉八日之旅 · 7月17日-24日 · 2人 · 行程僅供參考，實際安排請依當日狀況調整
  </div>
</div>`);
}

// ─────────────────────────────────────────────
// PAGE 3: Attractions - DETAILED with images
// ─────────────────────────────────────────────
function buildAttractionsPage(): string {
  const section = (title: string, color: string, items: typeof ATTRACTIONS.westLake) => {
    const cards = items.map(a => {
      const imgFile = a.images?.[0] || null;
      const imgTag = imgFile ? buildAttrImgTag(imgFile.replace("/attractions/", "")) : "";
      return `
      <div style="page-break-inside:avoid; border:1px solid #eee; border-radius:10px; overflow:hidden; display:flex; height:88px; margin-bottom:8px; background:#fff;">
        ${imgTag ? `<div style="width:88px; flex-shrink:0; background:#f0f0f0; overflow:hidden;"><img src="${imgTag}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.style.display='none';this.parentElement.style.background='${color}20'"/></div>` : ""}
        <div style="flex:1; padding:10px 12px; display:flex; flex-direction:column; justify-content:center;">
          <div style="font-size:13px; font-weight:700; color:#1a1a1a;">${a.name}</div>
          <div style="font-size:11px; color:${color}; font-weight:600; margin-top:2px;">${a.ticket}</div>
          <div style="font-size:10px; color:#888; margin-top:1px;">⏰ ${a.hours}</div>
          <div style="font-size:10px; color:#666; margin-top:2px; line-height:1.4; overflow:hidden; max-height:22px;">${a.highlight}</div>
        </div>
      </div>`;
    }).join("");
    return `
    <div style="margin-bottom:20px;">
      <div style="font-size:14px; font-weight:700; color:${color}; margin-bottom:8px; padding-bottom:5px; border-bottom:2px solid ${color};">${title}</div>
      <div>${cards}</div>
    </div>`;
  };

  return wrapPage(`
<div class="page">
  <div style="font-size:22px; font-weight:800; color:#1a1a1a; margin-bottom:18px; padding-bottom:10px; border-bottom:3px solid #14887c;">
    🏛️ 景點門票總覽
  </div>
  ${section("🌊 西湖風景區（10處）", "#14887c", ATTRACTIONS.westLake)}
  ${section("🌉 烏鎮水鄉（4處）", "#b47800", ATTRACTIONS.wuzhen)}
  ${section("🎯 杭州其他景點（4處）", "#1a4ab0", ATTRACTIONS.other)}
</div>`);
}

// ─────────────────────────────────────────────
// PAGE 4: Photo Gallery - BIG PHOTOS
// ─────────────────────────────────────────────
function buildPhotoGalleryPage(): string {
  const allAttractions = [
    ...ATTRACTIONS.westLake.filter(a => (a.images?.length ?? 0) > 0),
    ...ATTRACTIONS.wuzhen.filter(a => (a.images?.length ?? 0) > 0),
    ...ATTRACTIONS.other.filter(a => (a.images?.length ?? 0) > 0),
  ];

  const photos = allAttractions.map(a => ({
    name: a.name,
    nameEn: a.nameEn || "",
    ticket: a.ticket,
    imgTag: buildAttrImgTag((a.images?.[0] || "").replace("/attractions/", "")),
  }));

  // Build rows of 3 photos each
  const rows: typeof photos[] = [];
  for (let i = 0; i < photos.length; i += 3) {
    rows.push(photos.slice(i, i + 3));
  }

  const rowsHtml = rows.map((row, ri) => `
    <div style="margin-bottom:18px;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        ${row.map(p => `
        <div style="page-break-inside:avoid; border-radius:14px; overflow:hidden; background:#f5f5f5; box-shadow:0 2px 12px rgba(0,0,0,0.10);">
          <div style="height:260px; background:#e8e8e8; overflow:hidden; position:relative;">
            <img src="${p.imgTag}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.style.display='none';this.parentElement.style.background='#c0d8dc'"/>
            <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.55));height:60px;display:flex;align-items:flex-end;padding:8px 12px;">
              <span style="color:#fff;font-size:12px;font-weight:700;text-shadow:0 1px 3px rgba(0,0,0,0.5);">${p.name}</span>
            </div>
          </div>
          <div style="padding:10px 14px;background:#fff;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:11px;color:#888;">${p.nameEn}</span>
              <span style="font-size:11px;color:#14887c;font-weight:600;">${p.ticket}</span>
            </div>
          </div>
        </div>`).join("")}
      </div>
    </div>`).join("");

  return wrapPage(`
<div class="page">
  <div style="font-size:22px; font-weight:800; color:#1a1a1a; margin-bottom:18px; padding-bottom:10px; border-bottom:3px solid #14887c;">
    📷 景點寫真（${photos.length}張照片）
  </div>
  ${rowsHtml}
  <div style="text-align:center; padding:10px 0; color:#bbb; font-size:11px; border-top:1px solid #eee; margin-top:8px;">
    江南水鄉八日之旅 · 景點照片 · 實際景色可能因季節天氣有所不同
  </div>
</div>`);
}

// ─────────────────────────────────────────────
// PAGE 5: Packing List - DETAILED
// ─────────────────────────────────────────────
function buildPackingListPage(): string {
  const categories = [
    {
      emoji: "📋", title: "證件文件", color: "#14887c",
      items: ["護照（有效期6個月以上）", "台胞證", "機票確認信", "飯店預訂確認", "旅平險保單", "緊急聯絡卡", "身分證"],
    },
    {
      emoji: "💳", title: "金錢", color: "#b47800",
      items: ["信用卡（Visa/Mastercard）", "金融卡（開通國外提款）", "新台幣現金", "人民幣現金（兌換¥2000）"],
    },
    {
      emoji: "📱", title: "電子設備", color: "#1a4ab0",
      items: ["手機+充電器", "行動電源（10000mAh）", "相機/GoPro", "各國萬用轉接頭", "耳機"],
    },
    {
      emoji: "👔", title: "穿搭建議", color: "#7a3ab0",
      items: ["薄外套/防曬衫（防曬+室內冷氣）", "涼鞋/拖鞋", "折疊傘（6月梅雨）", "太陽眼鏡", "帽子/陽傘", "輕便背包"],
    },
    {
      emoji: "🛁", title: "盥洗用品", color: "#c0392b",
      items: ["牙刷/牙膏", "防曬乳 SPF50+", "曬後舒緩乳", "個人藥品", "濕紙巾/衛生紙", "口罩"],
    },
    {
      emoji: "🎒", title: "旅遊必備", color: "#14887c",
      items: ["小腰包（證件金錢）", "行李束帶", "頸枕/眼罩", "保溫水壺", "零食/泡麵（長途行車）"],
    },
  ];

  // Left column: 3 categories, Right column: 3 categories
  const leftCats = categories.slice(0, 3);
  const rightCats = categories.slice(3, 6);

  const col = (cats: typeof categories) => cats.map(cat => `
    <div style="page-break-inside:avoid; margin-bottom:14px; border:1px solid #e8e8e8; border-radius:10px; overflow:hidden;">
      <div style="background:${cat.color}; color:#fff; padding:7px 12px; font-size:12px; font-weight:700;">
        ${cat.emoji} ${cat.title}
      </div>
      <div style="padding:8px 12px;">
        ${cat.items.map(item => `
        <div style="display:flex; align-items:center; padding:4px 0; border-bottom:1px solid #f0f0f0; gap:8px;">
          <div style="width:12px; height:12px; border:2px solid ${cat.color}; border-radius:2px; flex-shrink:0;"></div>
          <span style="font-size:11px; color:#333;">${item}</span>
        </div>`).join("")}
      </div>
    </div>`).join("");

  return wrapPage(`
<div class="page">
  <div style="font-size:22px; font-weight:800; color:#1a1a1a; margin-bottom:18px; padding-bottom:10px; border-bottom:3px solid #14887c;">
    📦 行李打包清單
  </div>
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
    <div>${col(leftCats)}</div>
    <div>${col(rightCats)}</div>
  </div>
  <div style="margin-top:16px; background:#fff8f0; border:1px solid #f0d090; border-radius:10px; padding:14px;">
    <div style="font-size:13px; font-weight:700; color:#b47800; margin-bottom:8px;">💡 出發前確認</div>
    <div style="font-size:12px; color:#666; line-height:2;">
      ☐ 護照/台胞證有效期限確認 &nbsp;&nbsp; ☐ 手機開通國際漫遊<br>
      ☐ 預刷國際信用卡 &nbsp;&nbsp; ☐ 航班座位選位完成<br>
      ☐ 飯店預訂列印 &nbsp;&nbsp; ☐ 當地緊急聯絡電話<br>
      ☐ 天氣查詢（杭州/烏鎮） &nbsp;&nbsp; ☐ 行李重量確認（&lt;23kg/人）
    </div>
  </div>
</div>`);
}

// ─────────────────────────────────────────────
// PAGE 6: Practical Info - Transport + Hotels + Budget + Tips
// ─────────────────────────────────────────────
function buildPracticalPage(): string {
  const tipsHtml = TIPS.map(t => `<li style="margin-bottom:7px; font-size:11px; line-height:1.7; color:#444;">✓ ${t}</li>`).join("");

  const transportAirport = TRANSPORT.airport.map(t => `
    <div style="background:#f0faf8; padding:8px 12px; border-radius:7px; margin-bottom:5px; border-left:3px solid #14887c;">
      <div style="font-size:12px; font-weight:700; color:#1a1a1a;">${t.method}</div>
      <div style="font-size:10px; color:#555; margin-top:1px;">${t.duration} · ${t.price}</div>
    </div>`).join("");

  const transportWuzhen = TRANSPORT.toWuzhen.map(t => `
    <div style="background:#fff8f0; padding:8px 12px; border-radius:7px; margin-bottom:5px; border-left:3px solid #b47800;">
      <div style="font-size:12px; font-weight:700; color:#1a1a1a;">${t.method}</div>
      <div style="font-size:10px; color:#555; margin-top:1px;">${t.duration} · ${t.price}</div>
      ${t.frequency ? `<div style="font-size:10px; color:#888; margin-top:1px;">${t.frequency}</div>` : ""}
    </div>`).join("");

  const hotels = [...HOTELS.hangzhouLuxury, ...HOTELS.hangzhouMid, ...HOTELS.wuzhen];
  const hotelCards = hotels.map(h => {
    const loc = (h as {location?: string}).location;
    return `
    <div style="background:#f9f9f9; padding:7px 12px; border-radius:6px; margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-size:12px; font-weight:700; color:#1a1a1a;">${h.name}</div>
        ${loc ? `<div style="font-size:10px; color:#888;">${loc}</div>` : ""}
      </div>
      <div style="font-size:11px; font-weight:700; color:#14887c;">${h.price}</div>
    </div>`;
  }).join("");

  const budgetRows = [
    ["✈️ 來回機票（2人）", "NT$16,000-44,000"],
    ["🏨 住宿（7晚）", "NT$8,000-20,000"],
    ["🎫 門票+活動", "NT$3,000-6,000"],
    ["🍜 餐食（8天）", "NT$4,000-8,000"],
    ["🚗 市區交通", "NT$2,000-3,000"],
    ["🛍️ 購物/其他", "NT$2,000-4,000"],
    ["💰 合計（2人）", "NT$35,000-85,000"],
  ];
  const budgetHtml = budgetRows.map(([label, val], i) => {
    const isTotal = i === budgetRows.length - 1;
    return `<div style="display:flex; justify-content:space-between; padding:${isTotal ? "9px 14px" : "6px 14px"}; ${isTotal ? "background:#14887c; border-radius:0 0 10px 10px; color:#fff;" : "border-bottom:1px solid #f0f0f0;"} font-size:${isTotal ? "13px" : "11px"};">
      <span style="${isTotal ? "font-weight:700;" : ""}">${label}</span>
      <span style="${isTotal ? "font-weight:700;" : "font-weight:600;"}">${val}</span>
    </div>`;
  }).join("");

  return wrapPage(`
<div class="page">
  <div style="font-size:22px; font-weight:800; color:#1a1a1a; margin-bottom:14px; padding-bottom:10px; border-bottom:3px solid #14887c;">
    🚗 交通 · 住宿 · 費用
  </div>

  <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
    <div>
      <div style="font-size:12px; font-weight:700; color:#14887c; margin-bottom:7px;">✈️ 機場 ↔ 市區</div>
      ${transportAirport}
    </div>
    <div>
      <div style="font-size:12px; font-weight:700; color:#b47800; margin-bottom:7px;">🚗 杭州 ↔ 烏鎮</div>
      ${transportWuzhen}
    </div>
  </div>

  <div style="margin-bottom:14px;">
    <div style="font-size:12px; font-weight:700; color:#1a1a1a; margin-bottom:7px;">💰 費用預估（2人）</div>
    <div style="border:1px solid #e5e7eb; border-radius:10px; overflow:hidden;">
      ${budgetHtml}
    </div>
  </div>

  <div style="margin-bottom:14px;">
    <div style="font-size:12px; font-weight:700; color:#1a1a1a; margin-bottom:7px;">🏨 住宿推薦</div>
    <div style="background:#f9f9f9; border-radius:10px; padding:10px;">${hotelCards}</div>
  </div>

  <div>
    <div style="font-size:12px; font-weight:700; color:#1a1a1a; margin-bottom:7px;">💡 旅遊 tips</div>
    <div style="background:#f0faf8; border-radius:10px; padding:12px 14px; border:1px solid #d0efe8;">
      <ul style="padding-left:16px; color:#444; line-height:1.9;">${tipsHtml}</ul>
    </div>
  </div>

  <div style="text-align:center; padding:16px 0 0; color:#ccc; font-size:11px; border-top:1px solid #eee; margin-top:14px;">
    江南水鄉八日之旅 · 2人 · 7月17日-24日 · 行程僅供參考，實際安排請依當日狀況調整
  </div>
</div>`);
}

// ─────────────────────────────────────────────
// Preload images and replace __IMG_BASE64__ tags with base64
// ─────────────────────────────────────────────
async function preloadImages(html: string): Promise<string> {
  const matches = Array.from(html.matchAll(/__IMG_BASE64__:(.+?)__/g));
  const replaces = await Promise.all(matches.map(async (m) => {
    const filename = m[1];
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const resp = await fetch(`${origin}/attractions/${filename}`);
      if (!resp.ok) return { placeholder: m[0], base64: "" };
      const blob = await resp.blob();
      const base64 = await blobToBase64(blob);
      return { placeholder: m[0], base64 };
    } catch {
      return { placeholder: m[0], base64: "" };
    }
  }));

  let result = html;
  for (const { placeholder, base64 } of replaces) {
    if (base64) result = result.replace(placeholder, base64);
  }
  return result;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─────────────────────────────────────────────
// Render HTML string to canvas (single page)
// Uses a hidden div + html2canvas (more reliable than iframe)
// ─────────────────────────────────────────────
async function renderHtmlPage(html: string, label: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    // Use a hidden div approach — more reliable than iframe
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-2000px;top:0;width:794px;background:#fff;";
    container.innerHTML = html;
    document.body.appendChild(container);

    // Wait for fonts + images to load
    const imgs = container.querySelectorAll("img");
    let pending = imgs.length;
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      // Give a little extra time for fonts to render
      setTimeout(() => {
        const opts: Parameters<typeof html2canvas>[1] = {
          scale: 2,           // Higher scale = better quality
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          width: 794,
          logging: false,
        };
        html2canvas(container, opts).then((canvas) => {
          document.body.removeChild(container);
          console.log(`[PDF] Captured ${label}: ${canvas.width}x${canvas.height}px`);
          resolve(canvas);
        }).catch((err) => {
          document.body.removeChild(container);
          console.error(`[PDF] html2canvas error on ${label}:`, err);
          const c = document.createElement("canvas");
          c.width = 794;
          c.height = 1123;
          resolve(c);
        });
      }, 400);
    };

    if (pending === 0) {
      done();
    } else {
      imgs.forEach((img) => {
        const el = img as HTMLImageElement;
        if (el.complete && el.naturalWidth > 0) {
          pending--;
        } else {
          el.addEventListener("load", () => { pending--; if (pending <= 0) done(); });
          el.addEventListener("error", () => { pending--; if (pending <= 0) done(); });
        }
      });
      // Safety timeout (extended for base64 images)
      setTimeout(() => {
        pending = 0;
        done();
      }, 4000);
    }
  });
}

// Extend Window for logging
declare global {
  interface Window {
    __pdfErr: string | null;
    __pdfLog: string[];
  }
}
window.__pdfLog = window.__pdfLog || [];
