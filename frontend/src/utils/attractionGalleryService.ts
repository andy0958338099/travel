/**
 * Attraction Gallery Service
 *
 * Strategy:
 *  - Track deleted image URLs in Supabase table `attraction_gallery_hidden`
 *  - On load, filter out any images in the hidden list
 *  - All mutations write to Supabase so all users see the same data
 */

import { createClient } from '@/utils/supabase/client';

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

export async function unhideImage(imageUrl: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from('attraction_gallery_hidden')
    .delete()
    .eq('image_url', imageUrl);
}
