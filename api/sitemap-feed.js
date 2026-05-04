// /api/sitemap-feed.js
// 동적 sitemap.xml 생성 - 외부 라이브러리 없이 fetch만 사용
// 정적 파일과 이름 충돌을 피하려고 sitemap-feed로 명명

const SUPABASE_URL = 'https://kwhrwbnfwoybdmdzmmko.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHJ3Ym5md295YmRtZHptbWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODUwODgsImV4cCI6MjA5MTE2MTA4OH0.CTOKTzCN2__PUa89pKDn5z9xU1kAlJCAxVRXEmjM0lA';
const SITE_URL = 'https://www.artryangle.kr';

const escapeXml = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

module.exports = async (req, res) => {
  try {
    const url = `${SUPABASE_URL}/rest/v1/posts?published=eq.true&select=slug,updated_at,created_at&order=updated_at.desc`;
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    const posts = response.ok ? await response.json() : [];
    const today = new Date().toISOString().split('T')[0];

    const staticPages = [
      { loc: SITE_URL + '/',           priority: '1.0', changefreq: 'weekly',  lastmod: today },
      { loc: SITE_URL + '/#about',     priority: '0.8', changefreq: 'monthly', lastmod: today },
      { loc: SITE_URL + '/#services',  priority: '0.8', changefreq: 'monthly', lastmod: today },
      { loc: SITE_URL + '/#portfolio', priority: '0.8', changefreq: 'monthly', lastmod: today },
      { loc: SITE_URL + '/#blog',      priority: '0.9', changefreq: 'weekly',  lastmod: today },
      { loc: SITE_URL + '/#contact',   priority: '0.7', changefreq: 'monthly', lastmod: today }
    ];

    const postUrls = (posts || []).map(p => ({
      loc: `${SITE_URL}/blog/${escapeXml(p.slug)}`,
      lastmod: (p.updated_at || p.created_at || today).split('T')[0],
      changefreq: 'monthly',
      priority: '0.7'
    }));

    const all = [...staticPages, ...postUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(xml);
  } catch (err) {
    console.error('[sitemap-feed] error:', err);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
};
