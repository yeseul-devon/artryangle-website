export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'artryangle2025';

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase 환경변수 미설정' });
  }

  // GET: 모든 콘텐츠 불러오기
  if (req.method === 'GET') {
    try {
      const r = await fetch(SUPABASE_URL + '/rest/v1/site_content?select=*', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      const data = await r.json();
      const content = {};
      (data || []).forEach(row => { content[row.key] = row.value; });
      return res.status(200).json({ content });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST: 콘텐츠 저장 (비밀번호 필요)
  if (req.method === 'POST') {
    const { password, content } = req.body || {};
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: '비밀번호가 틀렸습니다.' });
    }
    if (!content || typeof content !== 'object') {
      return res.status(400).json({ error: '콘텐츠가 없습니다.' });
    }

    try {
      // upsert each key-value pair
      const entries = Object.entries(content);
      for (const [key, value] of entries) {
        await fetch(SUPABASE_URL + '/rest/v1/site_content', {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify({ key, value }),
        });
      }
      return res.status(200).json({ ok: true, saved: entries.length });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
