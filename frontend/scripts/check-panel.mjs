// Pure REST fetch — no Supabase client, no WebSocket needed
const SUPABASE_URL = 'https://bphhksbzedadaoscjctz.supabase.co';
const ANON_KEY = 'sb_publishable_p9okAW11Ss8f9dlGru4vag_YkO8u9-g';
const MANGA_ID = '618780ce-c68e-42b0-8554-fdc415557dc2';

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/travel_mangas?id=eq.${MANGA_ID}&select=id,source_name,status,panel_1_url,panel_1_caption,updated_at`,
  {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  }
);
const arr = await res.json();
const data = arr[0];
if (!data) { console.log('not found'); process.exit(1); }
console.log('source_name:', data.source_name);
console.log('status:', data.status);
console.log('updated_at:', data.updated_at);
console.log('panel_1_url:', data.panel_1_url);
console.log('panel_1_caption:', data.panel_1_caption?.slice(0, 100));
