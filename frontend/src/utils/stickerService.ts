/**
 * Sticker Service for Travel LINE Sticker Generator
 * 移植自貼圖大亨 sticker-styles.js，適配 MiniMax 圖片生成
 * 成員資料：讀寫統一走 plannerService（Supabase），所有頁面一致
 * 照片上傳：Supabase Storage（bucket: member-photos）
 * LINE 貼圖尺寸：生成 1024x1024 + 白邊過渡（canvas 後處理）
 */

import { createClient } from '@/utils/supabase/client';

// ── Supabase client ───────────────────────────────────────────────────────────

const supabase = createClient();

// ── STICKER_STYLES ────────────────────────────────────────────────────────────

export const STICKER_STYLES = {
  realistic: {
    id: 'realistic', name: '美顏真實', emoji: '📸',
    description: '美顏相機風、細緻柔膚、自然美感',
    promptCore: 'photorealistic beauty portrait, soft airbrushed skin, natural enhancement, flawless youthful glow, transparent background, centered character, no text',
    negativePrompt: 'cartoon, anime, chibi, harsh shadows, rough skin, blurry, low quality, watermark, text'
  },
  cute: {
    id: 'cute', name: '可愛風', emoji: '🥰',
    description: '圓潤可愛、大眼睛、療癒系',
    promptCore: 'kawaii chibi style, rounded forms, big sparkling eyes, pastel colors, glossy, thick outline, transparent background, centered character, no text',
    negativePrompt: 'realistic, scary, dark, horror, violent, cluttered background, text, watermark'
  },
  cool: {
    id: 'cool', name: '酷炫風', emoji: '😎',
    description: '帥氣、動感、潮流感',
    promptCore: 'cool urban street style illustration, bold neon colors, dramatic rim light with neon glow edges (cyan/pink), high contrast, dynamic pose, sharp outline, transparent background, centered character, no text',
    negativePrompt: 'cute, childish, boring, static, dull colors, low contrast, text, watermark'
  },
  funny: {
    id: 'funny', name: '搞笑風', emoji: '🤣',
    description: '誇張表情、幽默感、搞怪',
    promptCore: 'comedy cartoon style, exaggerated expressions, comedic pose, playful, meme-style, bold lines, bright colors, transparent background, centered character, no text',
    negativePrompt: 'serious, realistic anatomy, elegant, low energy, distorted face, warped, deformed, text, watermark'
  },
  simple: {
    id: 'simple', name: '簡約風', emoji: '✨',
    description: '線條簡潔、極簡設計、清新',
    promptCore: 'minimalist flat design, clean geometric shapes, soft clean lines, simple shapes, limited colors (2-4 colors), modern graphic design, transparent background, centered character, no text',
    negativePrompt: 'detailed, textured, realistic shading, busy, gradients-heavy, complex shading, text, watermark'
  },
  anime: {
    id: 'anime', name: '動漫風', emoji: '🎌',
    description: '日系動漫、漫畫風格',
    promptCore: 'Japanese anime manga style, vivid cel shading, expressive anime eyes, dynamic outlines, saturated colors, anime highlight, transparent background, centered character, no text',
    negativePrompt: '3D render, western cartoon, realism, grainy, muddy colors, text, watermark'
  },
  pixel: {
    id: 'pixel', name: '像素風', emoji: '👾',
    description: '復古像素、8-bit 風格',
    promptCore: '8-bit pixel art style, retro gaming aesthetic, clean pixel clusters, nostalgic game palette, simple shapes, crisp edges, no anti-aliasing, transparent background, centered character, no text',
    negativePrompt: 'smooth gradient, high resolution, anti-aliased, realistic textures, text, watermark'
  },
  sketch: {
    id: 'sketch', name: '素描風', emoji: '✏️',
    description: '逼真鉛筆素描、藝術質感',
    promptCore: 'hyperrealistic graphite pencil portrait, fine art sketch, cross-hatching, smooth gradient shading, visible pencil strokes, paper texture, deep black to subtle gray, dramatic lighting, monochromatic grayscale, transparent background, centered character, no text',
    negativePrompt: 'colored, vibrant, digital art, cartoon, anime, watercolor, oil painting, 3D, blurry, messy, text, watermark'
  }
};

// ── EXPRESSION_SETS ──────────────────────────────────────────────────────────

export const EXPRESSION_SETS = {
  basic: { id: 'basic', name: '基本日常', emoji: '😊', expressions: ['早安', 'Hi', 'OK', '讚讚', '加油', '謝謝', '晚安', '掰掰'] },
  cute: { id: 'cute', name: '可愛撒嬌', emoji: '🥺', expressions: ['撒嬌', '害羞', '噓', '啾啾', '抱抱', '好可愛', '愛你', '比心'] },
  emotion: { id: 'emotion', name: '情緒表達', emoji: '🎭', expressions: ['開心', '大笑', '哭哭', '生氣', '驚訝', '傻眼', '緊張', '期待'] },
  social: { id: 'social', name: '社交常用', emoji: '💬', expressions: ['你好', '謝謝', '對不起', '沒關係', '再見', '好久不見', '加油', '好喔'] },
  office: { id: 'office', name: '辦公室', emoji: '💼', expressions: ['加班中', '下班', '喝咖啡', '開會中', '忙碌', '週五了', '辛苦了', '沒問題'] },
  travel: { id: 'travel', name: '旅遊打卡', emoji: '✈️', expressions: ['出發', '到了', '好餓', '好美', '好累', '我來了', '等我', '衝啊'] },
  special: { id: 'special', name: '特殊場合', emoji: '🎉', expressions: ['生日快樂', '恭喜', '新年快樂', '聖誕快樂', '情人節', '中秋快樂', '畢業', '萬事如意'] },
  funny: { id: 'funny', name: '搞笑趣圖', emoji: '😜', expressions: ['傻眼', '崩潰', '無奈', '翻白眼', '放空', '爆炸', '不爽', '心碎'] }
};

export const EXPRESSION_DESCRIPTIONS: Record<string, string> = {
  '早安': 'bright morning smile, stretching arms up, energetic wake-up pose',
  'Hi': 'cheerful waving hand, bright smile, friendly greeting pose',
  'OK': 'confident OK hand gesture near face, winking, assured smile',
  '讚讚': 'double thumbs up high, big approving smile, encouraging pose',
  '加油': 'fist pump with both hands, determined fierce expression, fighting pose',
  '謝謝': 'hands together bow, grateful warm smile, appreciative pose',
  '晚安': 'sleepy yawning, hands together by cheek, peaceful drowsy expression',
  '掰掰': 'waving goodbye, sweet smile, farewell hand gesture',
  '撒嬌': 'hands clasped pleading, puppy dog eyes, cute head tilt',
  '害羞': 'covering blushing cheeks, shy side glance, fidgeting pose',
  '噓': 'finger on lips, winking, secretive quiet gesture',
  '啾啾': 'blowing kiss with hand, puckered lips, sending love pose',
  '抱抱': 'arms wide open, warm inviting smile, ready for hug pose',
  '好可愛': 'hands on cheeks, sparkling eyes, adoring expression',
  '愛你': 'blowing kiss, heart hands, loving expression',
  '比心': 'finger heart gesture, sweet smile, loving pose',
  '開心': 'arms raised in celebration, jumping pose, radiating joy expression',
  '大笑': 'holding stomach laughing, tears of joy, body shaking with laughter',
  '哭哭': 'covering face with hands, tears streaming down, sobbing pose',
  '生氣': 'fists clenched, angry red cheeks, stomping pose',
  '驚訝': 'hands on open mouth, wide starry eyes, jumped back pose',
  '傻眼': 'deadpan half-lidded eyes, flat mouth, resigned shrug',
  '緊張': 'hands gripping shirt, worried brow, pacing pose',
  '期待': 'clasped hands with sparkle eyes, hopping excitement pose',
  '你好': 'hand wave with bright smile, welcoming greeting pose',
  '對不起': 'hands together in apology,诚恳的低头, sincere apology pose',
  '沒關係': 'both hands open palm up, gentle reassuring smile',
  '再見': 'wave with soft smile, friendly farewell pose',
  '好久不見': 'hand on heart with warm smile, joyful reunion pose',
  '好喔': 'casual shrug with slight smile, easy-going pose',
  '加班中': 'head down on desk with coffee cup, tired but working pose',
  '下班': 'fist pump with bag on shoulder, freed from work pose',
  '喝咖啡': 'holding large coffee mug, relaxed satisfied smile',
  '開會中': 'serious expression with clipboard, formal meeting pose',
  '忙碌': 'arms spinning with multiple tasks, hurried busy pose',
  '週五了': 'arms in air celebration, TGIF dance pose',
  '辛苦了': 'thumbs up with tired but satisfied smile, hard work acknowledged',
  '沒問題': 'OK hand with confident grin, assured pose',
  '出發': 'pointing forward with determined smile, adventure begins pose',
  '到了': "standing with arms wide at destination, we've arrived pose",
  '好餓': 'hand on stomach with hungry eyes, drooling anticipation pose',
  '好美': 'hands on cheeks in awe, breathtaking beauty reaction pose',
  '好累': 'leaning on bag with exhausted sigh, weary traveler pose',
  '我來了': 'running forward with excitement, arrival energy pose',
  '等我': 'waving for attention, wait for me pose',
  '衝啊': 'running with fist pump, rushing forward excitement pose',
  '生日快樂': 'holding birthday cake with sparkler, celebration pose',
  '恭喜': 'bowing with fan, congratulatory respectful pose',
  '新年快樂': 'new year celebration with firework, festive pose',
  '聖誕快樂': 'wearing santa hat, holiday greeting pose',
  '情人節': 'heart eyes with love gesture, romantic pose',
  '中秋快樂': 'holding mooncake with family, reunion pose',
  '畢業': 'holding diploma with graduation cap, achievement pose',
  '萬事如意': 'hands in prayer with blessing smile, wishes granted pose',
  '崩潰': 'hands on head with exasperated face, breakdown pose',
  '無奈': 'arms spread wide with flat expression, whatever pose',
  '翻白眼': 'looking up with eye roll, exasperated with hands on hips',
  '放空': 'blank staring into distance, zoning out pose',
  '爆炸': 'explosion behind with shocked expression, mind blown pose',
  '不爽': 'scowl with arms crossed, disgruntled pose',
  '心碎': 'hands over broken heart, heartbreak pose'
};

// ── Prompt builder ────────────────────────────────────────────────────────────

export function buildStickerPrompt(characterName: string, styleId: string, expression: string): string {
  const style = STICKER_STYLES[styleId as keyof typeof STICKER_STYLES];
  const expressionDesc = EXPRESSION_DESCRIPTIONS[expression] || `happy ${expression} expression`;
  const characterBase = `cute cartoon character named ${characterName}, wearing white T-shirt, round friendly face, ${style.promptCore}`;
  return `${characterBase}, ${expressionDesc}, transparent background PNG format, centered, no text or watermark`;
}

// ── Member types ──────────────────────────────────────────────────────────────

export interface MemberPhoto {
  url: string;
  filename: string;
}

export interface TripMember {
  name: string;
  photo?: MemberPhoto;
}

// ── Member persistence ────────────────────────────────────────────────────────
// 成員資料統一走 plannerService（Supabase）。
// stickerService 僅提供給不需要 async 的情境（如元件初始化）。
// stickers/page.tsx 應直接使用 plannerService.loadMembers() / syncMembers()。

const LS_MEMBERS = 'hangzhou-trip-members';

export function loadTripMembers(): TripMember[] {
  // 同步读取 localStorage 作为快速回退；实际成员从 plannerService 异步加载
  try {
    const raw = localStorage.getItem(LS_MEMBERS);
    if (!raw) return defaultMembers();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((m: string | TripMember) =>
        typeof m === 'string' ? { name: m } : m
      );
    }
  } catch {}
  return defaultMembers();
}

function defaultMembers(): TripMember[] {
  return [
    { name: '阿國' }, { name: '小珍' }, { name: '大雄' },
    { name: '阿美' }, { name: '老王' }, { name: '小李' }, { name: '阿婷' }
  ];
}

export function saveTripMembers(members: TripMember[]): void {
  localStorage.setItem(LS_MEMBERS, JSON.stringify(members));
}

// ── Supabase Storage ─────────────────────────────────────────────────────────

const BUCKET = 'member-photos';

export async function uploadMemberPhoto(memberName: string, file: File): Promise<MemberPhoto> {
  const ext = file.name.split('.').pop() || 'jpg';
  const safeName = memberName.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_');
  const filename = `${safeName}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file, { contentType: file.type, upsert: true });

  if (error) throw new Error(`上傳失敗：${error.message}`);

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return { url: urlData.publicUrl, filename };
}

export async function deleteMemberPhoto(filename: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([filename]);
  if (error) console.warn('刪除照片失敗:', error.message);
}

// ── Sticker image generation ──────────────────────────────────────────────────
// MiniMax image-01 native resolution is 1024×1024 → 直接滿足 LINE 貼圖尺寸需求。

export async function generateStickerImage(
  prompt: string,
  referencePhotoUrl?: string
): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_MINIMAX_API_KEY;
  if (!apiKey) throw new Error('缺少 MiniMax API Key');

  const body: Record<string, unknown> = {
    model: 'image-01',
    prompt,
    // 1:1 → 1024×1024，LINE 官方尺寸，剛好
    aspect_ratio: '1:1',
    num_images: 1
  };

  if (referencePhotoUrl) {
    try {
      const res = await fetch(referencePhotoUrl);
      const blob = await res.blob();
      const base64 = await blobToBase64(blob);
      body.image_base64 = base64;
    } catch {
      // Proceed without reference photo
    }
  }

  const response = await fetch('https://api.minimax.io/v1/image_generation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`MiniMax error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const base64 = data.data?.image_base64?.[0];
  if (!base64) throw new Error('生成失敗：無圖片資料');
  return `data:image/png;base64,${base64}`;
}

// ── LINE Sticker post-processing ─────────────────────────────────────────────
// LINE 官方要求：1024×1024px，白邊過渡（白色邊框由邊緣向內 30px），
// 四角圓弧半徑約 160px。
// 我們用 canvas 讀取 AI 生成的圖，裁切後疊上白色圓角矩形當邊框，
// 然後回傳 base64 PNG。

export async function applyLineStickerFormat(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const SIZE = 1024;
      const BORDER = 30;       // 白邊寬度
      const RADIUS = 160;      // LINE 官方角落半徑

      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d')!;

      // 白色背景（邊框底色）
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, 0, 0, SIZE, SIZE, RADIUS);
      ctx.fill();

      // 裁切主圖區域（白邊內側）
      const innerSize = SIZE - BORDER * 2;
      // 繪製透明裁切區（作為遮罩）
      ctx.save();
      roundRect(ctx, BORDER, BORDER, innerSize, innerSize, Math.max(0, RADIUS - BORDER));
      ctx.clip();
      // 將原圖縮放fit進inner區域（置中）
      const scale = Math.max(innerSize / img.width, innerSize / img.height);
      const scaledW = img.width * scale;
      const scaledH = img.height * scale;
      const dx = BORDER + (innerSize - scaledW) / 2;
      const dy = BORDER + (innerSize - scaledH) / 2;
      ctx.drawImage(img, dx, dy, scaledW, scaledH);
      ctx.restore();

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('圖片載入失敗'));
    img.src = imageUrl;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (r < 0) r = 0;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Generated stickers (localStorage) ─────────────────────────────────────────

export interface GeneratedSticker {
  id: string;
  memberName: string;
  styleId: string;
  expression: string;
  imageUrl: string;     // 已處理成 LINE 格式（白邊）
  rawImageUrl?: string;  // 原始 AI 圖（可選）
  createdAt: number;
}

const LS_STICKERS = 'hangzhou-trip-stickers';

export function loadGeneratedStickers(): GeneratedSticker[] {
  try {
    const raw = localStorage.getItem(LS_STICKERS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveGeneratedStickers(stickers: GeneratedSticker[]): void {
  localStorage.setItem(LS_STICKERS, JSON.stringify(stickers));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}