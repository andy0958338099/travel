/**
 * Attraction Gallery Service
 *
 * Two suppression lists:
 *  - attraction_gallery_hidden   → individual image URLs hidden
 *  - attraction_gallery_attractions → entire attraction cards hidden
 */

import { createClient } from '@/utils/supabase/client';

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

export async function hideImage(imageUrl: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('attraction_gallery_hidden')
    .upsert({ image_url: imageUrl }, { onConflict: 'image_url' });
  if (error) {
    console.error('[hideImage] upsert error:', error);
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
