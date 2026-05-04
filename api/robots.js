// /api/robots.js
// 검색엔진 크롤러 가이드

const SITE_URL = 'https://www.artryangle.kr';

module.exports = (req, res) => {
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin

User-agent: Yeti
Allow: /
Disallow: /admin

User-agent: NaverBot
Allow: /
Disallow: /admin

User-agent: Daumoa
Allow: /
Disallow: /admin

Sitemap: ${SITE_URL}/sitemap.xml
`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).send(body);
};
