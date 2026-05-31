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
  const { data } = await supabase
    .from('attraction_gallery_hidden')
    .select('image_url');

  const hidden = new Set<string>();
  if (data) {
    data.forEach((row: { image_url: string }) => hidden.add(row.image_url));
  }
  return hidden;
}

export async function hideImage(imageUrl: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from('attraction_gallery_hidden')
    .upsert({ image_url: imageUrl }, { onConflict: 'image_url' });
}

// ── Whole-attraction suppression ───────────────────────────
export async function getHiddenAttractions(): Promise<Set<string>> {
  const supabase = createClient();
  const { data } = await supabase
    .from('attraction_gallery_attractions')
    .select('attraction_name');

  const hidden = new Set<string>();
  if (data) {
    data.forEach((row: { attraction_name: string }) => hidden.add(row.attraction_name));
  }
  return hidden;
}

export async function hideAttraction(name: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from('attraction_gallery_attractions')
    .upsert({ attraction_name: name }, { onConflict: 'attraction_name' });
}
