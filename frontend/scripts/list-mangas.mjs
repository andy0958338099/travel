// Pure REST fetch
const SUPABASE_URL = 'https://bphhksbzedadaoscjctz.supabase.co';
const ANON_KEY = 'sb_publishable_p9okAW11Ss8f9dlGru4vag_YkO8u9-g';

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/travel_mangas?select=id,source_name,status,panel_1_url,panel_2_url,panel_3_url,panel_4_url,updated_at&order=updated_at.desc&limit=20`,
  {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  }
);
const arr = await res.json();
console.log('Total rows:', arr.length);
console.log('---');
for (const r of arr) {
  const panels = [r.panel_1_url, r.panel_2_url, r.panel_3_url, r.panel_4_url].filter(Boolean).length;
  console.log(`[${r.status.padEnd(8)}] ${r.source_name.padEnd(8)} ${panels}/4 panels  ${r.updated_at}`);
}
