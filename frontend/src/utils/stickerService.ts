/**
 * Sticker Service for Travel LINE Sticker Generator
 * 移植自貼圖大亨 sticker-styles.js，適配 MiniMax 圖片生成
 * 成員照片上傳至 Supabase Storage（bucket: member-photos）
 */

import { createClient } from '@/utils/supabase/client';

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
  '生氣': 'stomping foot, clenched fists, angry red face, steam from ears',
  '驚訝': 'hands on cheeks, wide open mouth, shocked jump back pose',
  '傻眼': 'rolling eyes up, exasperated expression, done with it pose',
  '緊張': 'fidgeting hands, nervous expression, anxious pose',
  '期待': 'sparkling eyes, excited expression, anticipation pose',
  '你好': 'friendly wave, warm smile, welcoming gesture',
  '對不起': 'apologetic deep bow, regretful puppy eyes, hands pressed together',
  '沒關係': 'gentle wave off, understanding smile, forgiving pose',
  '再見': 'waving goodbye, bittersweet smile, farewell hand gesture',
  '好久不見': 'excited wave, surprised happy expression, reunion pose',
  '好喔': 'casual thumbs up, relaxed smile, agreeable pose',
  '加班中': 'exhausted at desk, coffee cup, late night working expression',
  '下班': 'stretching arms, relieved smile, freedom pose',
  '喝咖啡': 'holding coffee cup, satisfied sip, relaxed pose',
  '開會中': 'serious expression, holding documents, professional pose',
  '忙碌': 'multitasking pose, stressed expression, busy hands',
  '週五了': 'excited celebration, arms up, weekend joy pose',
  '辛苦了': 'gentle bow, appreciative smile, respectful gesture',
  '沒問題': 'confident thumbs up, reassuring smile, reliable pose',
  '出發': 'pointing forward, determined expression, adventure pose',
  '到了': 'arms spread wide, relieved smile, arrival pose',
  '好餓': 'drooling expression, hands on cheeks, craving food pose',
  '好美': 'hands on cheeks, sparkling eyes, amazed expression',
  '好累': 'drooping shoulders, tired eyes, exhausted slumped pose',
  '我來了': 'running pose, excited expression, arriving gesture',
  '等我': 'running with hand up, urgent expression, rushing pose',
  '衝啊': 'fist pump forward, determined fierce expression, running pose',
  '生日快樂': 'holding birthday cake, party hat, celebration pose',
  '恭喜': 'clapping hands, excited congratulating smile, celebration pose',
  '新年快樂': 'festive celebration, red envelope, new year pose',
  '聖誕快樂': 'santa hat, gift giving, christmas joy pose',
  '情人節': 'holding heart, romantic expression, love pose',
  '中秋快樂': 'holding mooncake, moon gazing, festival pose',
  '畢業': 'throwing graduation cap, proud expression, achievement pose',
  '萬事如意': 'blessing gesture, peaceful expression, wishing pose',
  '崩潰': 'hands on head, screaming expression, breakdown pose',
  '無奈': 'shrugging shoulders, helpless expression, resigned pose',
  '翻白眼': 'rolling eyes hard, exasperated expression, done with it pose',
  '放空': 'blank stare, zoned out expression, empty mind pose',
  '爆炸': 'steam from ears, furious expression, explosive anger pose',
  '不爽': 'crossed arms, annoyed expression, displeased pose',
  '心碎': 'clutching chest, heartbroken expression, devastated pose'
};

export function buildStickerPrompt(characterName: string, styleId: string, expression: string): string {
  const style = STICKER_STYLES[styleId as keyof typeof STICKER_STYLES];
  const expressionDesc = EXPRESSION_DESCRIPTIONS[expression] || `happy ${expression} expression`;
  const characterBase = `cute cartoon character named ${characterName}, wearing white T-shirt, round friendly face, ${style.promptCore}`;
  return `${characterBase}, ${expressionDesc}, transparent background PNG format, centered, no text or watermark`;
}

// ── Member types ────────────────────────────────────────────────────────────────

export interface MemberPhoto {
  url: string;       // Supabase Storage public URL
  filename: string;  // stored filename in bucket
}

export interface TripMember {
  name: string;
  photo?: MemberPhoto;
}

// ── Member persistence (localStorage + Supabase Storage) ───────────────────────

const LS_MEMBERS = 'hangzhou-trip-members';

export function loadTripMembers(): TripMember[] {
  try {
    const raw = localStorage.getItem(LS_MEMBERS);
    if (!raw) return defaultMembers();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Support both old string[] and new TripMember[]
      return parsed.map((m: string | TripMember) =>
        typeof m === 'string' ? { name: m } : m
      );
    }
  } catch {}
  return defaultMembers();
}

function defaultMembers(): TripMember[] {
  return [
    { name: '小明' }, { name: '小美' }, { name: '小華' },
    { name: '阿呆' }, { name: '阿瓜' }, { name: '小琳' }, { name: '阿強' }
  ];
}

export function saveTripMembers(members: TripMember[]): void {
  localStorage.setItem(LS_MEMBERS, JSON.stringify(members));
}

// ── Supabase Storage ────────────────────────────────────────────────────────────

const BUCKET = 'member-photos';
const supabase = createClient();

export async function uploadMemberPhoto(memberName: string, file: File): Promise<MemberPhoto> {
  const ext = file.name.split('.').pop() || 'jpg';
  const safeName = memberName.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_');
  const filename = `${safeName}_${Date.now()}.${ext}`;

  const { data: _uploadData, error } = await supabase.storage
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

// ── Sticker image generation with reference photo ─────────────────────────────

export async function generateStickerImage(
  prompt: string,
  referencePhotoUrl?: string
): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_MINIMAX_API_KEY;
  if (!apiKey) throw new Error('缺少 MiniMax API Key');

  // Build request — MiniMax image-01 supports reference image via base64
  const body: Record<string, unknown> = {
    model: 'image-01',
    prompt,
    aspect_ratio: '1:1',
    num_images: 1
  };

  // If we have a reference photo URL, fetch it and convert to base64
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
  // image-01 returns base64 directly in data.data[0].image_base64
  const base64 = data.data?.image_base64?.[0];
  if (!base64) throw new Error('生成失敗：無圖片資料');
  return `data:image/png;base64,${base64}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Generated stickers (localStorage) ────────────────────────────────────────

export interface GeneratedSticker {
  id: string;
  memberName: string;
  styleId: string;
  expression: string;
  imageUrl: string;
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