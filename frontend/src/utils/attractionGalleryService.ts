/**
 * Attraction Gallery Service
 *
 * Two suppression lists:
 *  - attraction_gallery_hidden   → individual image URLs hidden
 *  - attraction_gallery_attractions → entire attraction cards hidden
 *
 * 2026-06-11: 共用圖修補
 *   - 圖片隱藏改用複合 key: `${attractionName}::${imageUrl}`
 *   - 解決「外灘夜景」跟「南京東路步行街」共用 sh05-1.jpg，
 *     刪除「外灘夜景」的這張不會污染「南京東路步行街」的同一張
 *   - 表格 image_url 欄位現在存的是複合 key 本身
 *   - 現有表是空, 不需 migration; 舊資料若有可選擇清空
 */

import { createClient } from '@/utils/supabase/client';

// ── Composite key helper ─────────────────────────────────────
/**
 * 將 attraction 名稱 + 圖片 URL 組合成唯一 key。
 * - 有 attractionName: 回傳 `${name}::${url}` (scoped 隱藏)
 * - 沒 attractionName: 回傳 url 本身 (向後相容)
 */
export function composeKey(
  attractionName: string | undefined,
  imageUrl: string
): string {
  return attractionName ? `${attractionName}::${imageUrl}` : imageUrl;
}

/**
 * 從複合 key 拆出 imageUrl 部分。
 */
export function extractImageUrl(key: string): string {
  const idx = key.indexOf('::');
  return idx >= 0 ? key.slice(idx + 2) : key;
}

// ── Individual image suppression ────────────────────────────
export async function getHiddenImages(): Promise<Set<string>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('attraction_gallery_hidden')
    .select('image_url');

  if (error) {
    console.error('[getHiddenImages] select error:', error);
    return new Set();
  }

  const hidden = new Set<string>();
  if (data) {
    data.forEach((row: { image_url: string }) => hidden.add(row.image_url));
  }
  return hidden;
}

export async function hideImage(
  imageUrl: string,
  attractionName?: string
): Promise<void> {
  const supabase = createClient();
  const key = composeKey(attractionName, imageUrl);
  const { error } = await supabase
    .from('attraction_gallery_hidden')
    .upsert({ image_url: key }, { onConflict: 'image_url' });
  if (error) {
    console.error('[hideImage] upsert error:', error);
  }
}

export async function unhideImage(
  imageUrl: string,
  attractionName?: string
): Promise<void> {
  const supabase = createClient();
  const key = composeKey(attractionName, imageUrl);
  const { error } = await supabase
    .from('attraction_gallery_hidden')
    .delete()
    .eq('image_url', key);
  if (error) {
    console.error('[unhideImage] delete error:', error);
  }
}

// ── Whole-attraction suppression ───────────────────────────
export async function getHiddenAttractions(): Promise<Set<string>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('attraction_gallery_attractions')
    .select('attraction_name');

  if (error) {
    console.error('[getHiddenAttractions] select error:', error);
    return new Set();
  }

  const hidden = new Set<string>();
  if (data) {
    data.forEach((row: { attraction_name: string }) => hidden.add(row.attraction_name));
  }
  return hidden;
}

export async function hideAttraction(name: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('attraction_gallery_attractions')
    .upsert({ attraction_name: name }, { onConflict: 'attraction_name' });
  if (error) {
    console.error('[hideAttraction] upsert error:', error);
  }
}

export async function unhideAttraction(name: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('attraction_gallery_attractions')
    .delete()
    .eq('attraction_name', name);
  if (error) {
    console.error('[unhideAttraction] delete error:', error);
  }
}
