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

  // POST: 문의 저장
  if (req.method === 'POST') {
    const { name, email, message } = req.body || {};
    if (!name || !message) return res.status(400).json({ error: '이름과 문의 내용을 입력해주세요.' });

    try {
      const r = await fetch(SUPABASE_URL + '/rest/v1/contact_inquiries', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          name,
          email: email || '',
          message,
          created_at: new Date().toISOString(),
          is_read: false,
        }),
      });

      if (!r.ok) {
        const errText = await r.text();
        return res.status(500).json({ error: 'DB 저장 실패', detail: errText });
      }

      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // GET: 문의 목록 (관리자용 — 비밀번호 필요)
  if (req.method === 'GET') {
    const pw = req.query.pw;
    if (pw !== ADMIN_PASSWORD) return res.status(401).json({ error: '권한 없음' });

    try {
      const r = await fetch(SUPABASE_URL + '/rest/v1/contact_inquiries?select=*&order=created_at.desc&limit=50', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      const data = await r.json();
      return res.status(200).json({ inquiries: data || [] });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
