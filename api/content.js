export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const SU = process.env.SUPABASE_URL, SK = process.env.SUPABASE_KEY, AP = process.env.ADMIN_PASSWORD || 'artryangle2025';
  if (!SU || !SK) return res.status(500).json({ error: 'Supabase 환경변수 미설정' });

  if (req.method === 'GET') {
    try {
      const r = await fetch(SU + '/rest/v1/site_content?select=*', { headers: { 'apikey': SK, 'Authorization': 'Bearer ' + SK } });
      const data = await r.json();
      const content = {};
      (data || []).forEach(row => { content[row.key] = row.value; });
      return res.status(200).json({ content });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  if (req.method === 'POST') {
    const { password, content } = req.body || {};
    if (password !== AP) return res.status(401).json({ error: '비밀번호 오류' });
    if (!content) return res.status(400).json({ error: '콘텐츠 없음' });
    try {
      for (const [key, value] of Object.entries(content)) {
        await fetch(SU + '/rest/v1/site_content', {
          method: 'POST',
          headers: { 'apikey': SK, 'Authorization': 'Bearer ' + SK, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({ key, value }),
        });
      }
      return res.status(200).json({ ok: true });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }
  res.status(405).end();
}
