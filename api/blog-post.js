// /api/blog-post.js
// 개별 블로그 글 페이지를 SEO 친화적 HTML로 렌더링.
// vercel.json: /blog/:slug → /api/blog-post?slug=:slug

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kwhrwbnfwoybdmdzmmko.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHJ3Ym5md295YmRtZHptbWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODUwODgsImV4cCI6MjA5MTE2MTA4OH0.CTOKTzCN2__PUa89pKDn5z9xU1kAlJCAxVRXEmjM0lA';
const SITE_URL = 'https://www.artryangle.kr';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

const inlineFormat = (text) => {
  let s = escapeHtml(text);
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
};

const renderContent = (raw) => {
  if (!raw) return '';
  const looksLikeHtml = /<\/?(p|h[1-6]|ul|ol|li|blockquote|img|figure|div|br|strong|em|a|code|pre)[\s>]/i.test(raw);
  if (looksLikeHtml) return raw;

  const lines = raw.split('\n');
  let html = '';
  let inList = false;
  let inCode = false;

  const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };
  const closeCode = () => { if (inCode) { html += '</code></pre>'; inCode = false; } };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      closeList();
      if (inCode) { closeCode(); } else { html += '<pre><code>'; inCode = true; }
      continue;
    }
    if (inCode) { html += escapeHtml(line) + '\n'; continue; }
    if (trimmed === '') { closeList(); continue; }
    if (/^#{1,6}\s/.test(trimmed)) {
      closeList();
      const level = trimmed.match(/^(#{1,6})/)[1].length;
      const text = trimmed.replace(/^#{1,6}\s/, '');
      html += `<h${level}>${inlineFormat(text)}</h${level}>`;
      continue;
    }
    if (trimmed.startsWith('> ')) {
      closeList();
      html += `<blockquote>${inlineFormat(trimmed.slice(2))}</blockquote>`;
      continue;
    }
    if (/^[-*]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      if (!inList) { html += '<ul>'; inList = true; }
      const text = trimmed.replace(/^[-*]\s|^\d+\.\s/, '');
      html += `<li>${inlineFormat(text)}</li>`;
      continue;
    }
    closeList();
    html += `<p>${inlineFormat(trimmed)}</p>`;
  }
  closeList(); closeCode();
  return html;
};

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

const stripText = (s) => String(s || '').replace(/[#*`>\[\]()_~]/g, '').replace(/\s+/g, ' ').trim();

const renderPage = (post) => {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const title = escapeHtml(post.title || '');
  const summary = escapeHtml(post.excerpt || stripText(post.content || '').slice(0, 160));
  const cover = post.cover_url ? escapeHtml(post.cover_url) : '';
  const category = escapeHtml(post.category || '예술경영');
  const dateStr = formatDate(post.created_at);
  const isoDate = post.created_at ? new Date(post.created_at).toISOString() : '';
  const tagsArr = Array.isArray(post.tags) ? post.tags : [];

  const ldJson = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || undefined,
    image: cover || undefined,
    datePublished: isoDate || undefined,
    dateModified: post.updated_at ? new Date(post.updated_at).toISOString() : isoDate,
    author: { '@type': 'Person', name: '송예슬', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: '아트라이앵글',
      logo: { '@type': 'ImageObject', url: SITE_URL + '/favicon.ico' }
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    articleSection: category,
    keywords: tagsArr.join(', ')
  };

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>${title} | 아트라이앵글</title>
<meta name="description" content="${summary}">
<meta name="author" content="송예슬">
${tagsArr.length ? `<meta name="keywords" content="${escapeHtml(tagsArr.join(', '))}">` : ''}
<link rel="canonical" href="${url}">

<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${summary}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="아트라이앵글">
<meta property="og:locale" content="ko_KR">
${cover ? `<meta property="og:image" content="${cover}">` : ''}
${isoDate ? `<meta property="article:published_time" content="${isoDate}">` : ''}
<meta property="article:section" content="${category}">
${tagsArr.map(t => `<meta property="article:tag" content="${escapeHtml(t)}">`).join('')}

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${summary}">
${cover ? `<meta name="twitter:image" content="${cover}">` : ''}

<link rel="icon" href="/favicon.ico">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap">

<script type="application/ld+json">${JSON.stringify(ldJson)}</script>

<style>
  :root {
    --ink: #1a1a1a; --ink-soft: #4a4a4a; --paper: #fafaf7;
    --line: #e5e3dc; --accent: #8b6f47;
    --serif: 'Cormorant Garamond', 'Pretendard', serif;
    --sans: 'Pretendard', -apple-system, sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: var(--sans); color: var(--ink); background: var(--paper); line-height: 1.7; font-size: 17px; -webkit-font-smoothing: antialiased; }
  .topnav { position: sticky; top: 0; z-index: 50; background: rgba(250, 250, 247, 0.85); backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); padding: 16px 32px; display: flex; align-items: center; justify-content: space-between; }
  .topnav a.logo { font-family: var(--serif); font-size: 22px; font-weight: 500; letter-spacing: 0.02em; color: var(--ink); text-decoration: none; }
  .topnav .back { font-size: 14px; color: var(--ink-soft); text-decoration: none; transition: color .2s; }
  .topnav .back:hover { color: var(--accent); }
  article { max-width: 720px; margin: 0 auto; padding: 80px 32px 120px; }
  .meta { display: flex; align-items: center; gap: 16px; font-size: 13px; color: var(--ink-soft); margin-bottom: 24px; letter-spacing: 0.05em; text-transform: uppercase; }
  .meta .category { color: var(--accent); font-weight: 500; }
  .meta .dot { width: 3px; height: 3px; border-radius: 50%; background: var(--ink-soft); }
  h1.title { font-family: var(--serif); font-size: clamp(32px, 5vw, 52px); font-weight: 500; line-height: 1.2; letter-spacing: -0.01em; margin-bottom: 32px; }
  .excerpt { font-size: 19px; color: var(--ink-soft); line-height: 1.6; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid var(--line); font-weight: 300; }
  .cover { width: 100%; margin: 32px 0 56px; border-radius: 4px; overflow: hidden; }
  .cover img { width: 100%; height: auto; display: block; }
  .content { font-size: 17px; }
  .content h2 { font-family: var(--serif); font-size: 30px; font-weight: 500; margin: 56px 0 20px; line-height: 1.3; }
  .content h3 { font-size: 22px; font-weight: 600; margin: 40px 0 16px; }
  .content p { margin-bottom: 24px; }
  .content ul, .content ol { margin: 0 0 24px 24px; }
  .content li { margin-bottom: 8px; }
  .content blockquote { border-left: 3px solid var(--accent); padding: 4px 24px; margin: 32px 0; color: var(--ink-soft); font-style: italic; }
  .content a { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
  .content img { max-width: 100%; height: auto; border-radius: 4px; margin: 32px 0; }
  .content code { background: #efece4; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
  .content pre { background: #1a1a1a; color: #e5e3dc; padding: 24px; border-radius: 6px; overflow-x: auto; margin: 32px 0; }
  .content pre code { background: none; padding: 0; color: inherit; }
  .tags { margin-top: 64px; padding-top: 32px; border-top: 1px solid var(--line); }
  .tag { display: inline-block; font-size: 12px; color: var(--ink-soft); padding: 4px 12px; border: 1px solid var(--line); border-radius: 100px; margin-right: 8px; margin-bottom: 8px; }
  .footer-back { max-width: 720px; margin: 0 auto; padding: 0 32px 80px; text-align: center; }
  .footer-back a { display: inline-block; padding: 14px 32px; border: 1px solid var(--ink); color: var(--ink); text-decoration: none; font-size: 14px; letter-spacing: 0.05em; transition: all .2s; }
  .footer-back a:hover { background: var(--ink); color: var(--paper); }
  @media (max-width: 640px) { .topnav { padding: 14px 20px; } article { padding: 48px 20px 80px; } .excerpt { font-size: 17px; } }
</style>
</head>
<body>

<nav class="topnav">
  <a href="/" class="logo">아트라이앵글</a>
  <a href="/#blog" class="back">← 모든 아티클</a>
</nav>

<article>
  <div class="meta">
    <span class="category">${category}</span>
    ${dateStr ? `<span class="dot"></span><time datetime="${isoDate}">${dateStr}</time>` : ''}
  </div>

  <h1 class="title">${title}</h1>

  ${post.excerpt ? `<p class="excerpt">${escapeHtml(post.excerpt)}</p>` : ''}

  ${cover ? `<figure class="cover"><img src="${cover}" alt="${title}"></figure>` : ''}

  <div class="content">${renderContent(post.content || '')}</div>

  ${tagsArr.length ? `
  <div class="tags">
    ${tagsArr.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}
  </div>` : ''}
</article>

<div class="footer-back">
  <a href="/#blog">다른 아티클 보기</a>
</div>

</body>
</html>`;
};

const renderNotFound = (slug) => `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8">
<title>찾을 수 없는 글 | 아트라이앵글</title>
<meta name="robots" content="noindex">
<style>
  body { font-family: 'Pretendard', sans-serif; background: #fafaf7; color: #1a1a1a; min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
  .box { text-align: center; padding: 40px; }
  h1 { font-size: 48px; font-weight: 500; margin: 0 0 16px; }
  p { color: #4a4a4a; margin: 0 0 32px; }
  a { padding: 12px 24px; border: 1px solid #1a1a1a; text-decoration: none; color: #1a1a1a; }
  a:hover { background: #1a1a1a; color: #fafaf7; }
</style>
</head><body>
<div class="box">
  <h1>404</h1>
  <p>찾으시는 글을 찾을 수 없어요${slug ? ` (${escapeHtml(slug)})` : ''}.</p>
  <a href="/">메인으로 돌아가기</a>
</div>
</body></html>`;

module.exports = async (req, res) => {
  const slug = (req.query && req.query.slug) || '';

  if (!slug) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(404).send(renderNotFound(''));
    return;
  }

  try {
    let { data: post } = await supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle();

    if (!post) {
      const fallback = await supabase
        .from('posts')
        .select('*')
        .or(`id.eq.${slug},notion_id.eq.${slug}`)
        .eq('published', true)
        .maybeSingle();
      post = fallback.data;
    }

    if (!post) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(404).send(renderNotFound(slug));
      return;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.status(200).send(renderPage(post));
  } catch (err) {
    console.error('[blog-post] error:', err);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(500).send(renderNotFound(slug));
  }
};
