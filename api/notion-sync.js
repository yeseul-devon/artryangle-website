// /api/notion-sync.js
// 노션 블로그 DB(공개=true)를 Supabase public.posts 로 동기화.
// Vercel Cron(매시간)이 GET 호출, 수동 호출도 가능(?secret= 또는 Authorization: Bearer).

const NOTION_DB_ID_DEFAULT = '33ce6b4eecd880619e4fdbfb00855312';
const NOTION_VERSION = '2022-06-28';

// 노션 카테고리(select) → Supabase 카테고리 값 매핑
const CATEGORY_MAP = {
  'insight blog': 'insight',
  'weekly issue & trend': 'issue and trend',
};
function mapCategory(raw) {
  if (!raw) return null;
  const v = String(raw).toLowerCase().trim();
  return CATEGORY_MAP[v] || raw;
}

async function notionFetch(path, token, init) {
  const r = await fetch('https://api.notion.com/v1' + path, {
    ...init,
    headers: {
      Authorization: 'Bearer ' + token,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(init && init.headers ? init.headers : {}),
    },
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error('Notion ' + r.status + ' ' + path + ' :: ' + t.slice(0, 300));
  }
  return r.json();
}

function rtToMd(richText) {
  return (richText || []).map(t => {
    let s = t.plain_text || '';
    if (!s) return '';
    const a = t.annotations || {};
    if (a.code) s = '`' + s + '`';
    if (a.bold) s = '**' + s + '**';
    if (a.italic) s = '*' + s + '*';
    if (a.strikethrough) s = '~~' + s + '~~';
    if (t.href) s = '[' + s + '](' + t.href + ')';
    return s;
  }).join('');
}

async function fetchChildren(blockId, token) {
  const blocks = [];
  let cursor;
  do {
    const qs = cursor ? '?start_cursor=' + cursor + '&page_size=100' : '?page_size=100';
    const d = await notionFetch('/blocks/' + blockId + '/children' + qs, token);
    blocks.push(...(d.results || []));
    cursor = d.has_more ? d.next_cursor : null;
  } while (cursor);
  return blocks;
}

async function blocksToMarkdown(blocks, token, depth) {
  depth = depth || 0;
  const out = [];
  let listType = null; // 'ul' | 'ol'
  const flushList = () => { if (listType) { out.push(''); listType = null; } };
  const indent = '  '.repeat(depth);

  let olCount = 0;

  for (const b of blocks) {
    const t = b.type;
    const d = b[t] || {};
    if (t !== 'numbered_list_item') olCount = 0;

    switch (t) {
      case 'paragraph': {
        flushList();
        const txt = rtToMd(d.rich_text);
        out.push(indent + txt);
        out.push('');
        break;
      }
      case 'heading_1': {
        flushList();
        out.push('# ' + rtToMd(d.rich_text));
        out.push('');
        break;
      }
      case 'heading_2': {
        flushList();
        out.push('## ' + rtToMd(d.rich_text));
        out.push('');
        break;
      }
      case 'heading_3': {
        flushList();
        out.push('### ' + rtToMd(d.rich_text));
        out.push('');
        break;
      }
      case 'bulleted_list_item': {
        if (listType !== 'ul') { listType = 'ul'; }
        out.push(indent + '- ' + rtToMd(d.rich_text));
        if (b.has_children) {
          const kids = await fetchChildren(b.id, token);
          const sub = await blocksToMarkdown(kids, token, depth + 1);
          if (sub) out.push(sub);
        }
        break;
      }
      case 'numbered_list_item': {
        if (listType !== 'ol') { listType = 'ol'; olCount = 0; }
        olCount += 1;
        out.push(indent + olCount + '. ' + rtToMd(d.rich_text));
        if (b.has_children) {
          const kids = await fetchChildren(b.id, token);
          const sub = await blocksToMarkdown(kids, token, depth + 1);
          if (sub) out.push(sub);
        }
        break;
      }
      case 'quote': {
        flushList();
        out.push('> ' + rtToMd(d.rich_text));
        out.push('');
        break;
      }
      case 'callout': {
        flushList();
        const icon = d.icon && d.icon.emoji ? d.icon.emoji + ' ' : '';
        out.push('> ' + icon + rtToMd(d.rich_text));
        out.push('');
        break;
      }
      case 'divider': {
        flushList();
        out.push('---');
        out.push('');
        break;
      }
      case 'image': {
        flushList();
        const url = (d.file && d.file.url) || (d.external && d.external.url) || '';
        const cap = rtToMd(d.caption || []);
        if (url) {
          out.push('![' + cap + '](' + url + ')');
          out.push('');
        }
        break;
      }
      case 'code': {
        flushList();
        const lang = d.language || '';
        out.push('```' + lang);
        out.push((d.rich_text || []).map(x => x.plain_text || '').join(''));
        out.push('```');
        out.push('');
        break;
      }
      case 'bookmark':
      case 'embed':
      case 'video':
      case 'link_preview': {
        flushList();
        const url = d.url || '';
        if (url) out.push(url);
        out.push('');
        break;
      }
      case 'toggle': {
        flushList();
        out.push(rtToMd(d.rich_text));
        if (b.has_children) {
          const kids = await fetchChildren(b.id, token);
          const sub = await blocksToMarkdown(kids, token, depth);
          if (sub) out.push(sub);
        }
        out.push('');
        break;
      }
      default:
        // 미지원 블록은 가능한 텍스트만 출력
        if (Array.isArray(d.rich_text)) {
          const txt = rtToMd(d.rich_text);
          if (txt) { flushList(); out.push(txt); out.push(''); }
        }
        break;
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function getTitle(properties) {
  for (const k of Object.keys(properties)) {
    if (properties[k].type === 'title') {
      return (properties[k].title || []).map(t => t.plain_text || '').join('').trim();
    }
  }
  return '';
}
function getRichText(properties, names) {
  for (const n of names) {
    const p = properties[n];
    if (p && p.type === 'rich_text') {
      return (p.rich_text || []).map(t => t.plain_text || '').join('').trim();
    }
  }
  return '';
}
function getSelect(properties, names) {
  for (const n of names) {
    const p = properties[n];
    if (p && p.type === 'select') return p.select ? p.select.name : '';
    if (p && p.type === 'multi_select') {
      return (p.multi_select || []).map(o => o.name).join(',');
    }
  }
  return '';
}
function getDate(properties, names) {
  for (const n of names) {
    const p = properties[n];
    if (p && p.type === 'date' && p.date) return p.date.start || '';
  }
  return '';
}
function getCheckbox(properties, names) {
  for (const n of names) {
    const p = properties[n];
    if (p && p.type === 'checkbox') return p.checkbox === true;
  }
  return false;
}

function getCoverUrl(page) {
  if (!page.cover) return null;
  if (page.cover.type === 'external') return page.cover.external.url;
  if (page.cover.type === 'file') return page.cover.file.url;
  return null;
}

function stripPlain(md) {
  return String(md || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/[#*`>~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function makeExcerpt(md) {
  const t = stripPlain(md);
  return t.length > 160 ? t.slice(0, 160) + '…' : t;
}
function makeSlug(notionId) {
  const clean = String(notionId || '').replace(/-/g, '').slice(0, 12);
  return 'post-' + clean;
}

async function supabaseSelectByNotionId(SUPABASE_URL, SUPABASE_KEY, notionId) {
  const url = SUPABASE_URL + '/rest/v1/posts?notion_id=eq.' + encodeURIComponent(notionId) + '&select=id,slug';
  const r = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
  });
  if (!r.ok) throw new Error('Supabase select ' + r.status + ' ' + (await r.text().catch(() => '')));
  const d = await r.json();
  return d && d.length ? d[0] : null;
}

async function supabaseInsert(SUPABASE_URL, SUPABASE_KEY, row) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/posts', {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error('Supabase insert ' + r.status + ' ' + (await r.text().catch(() => '')));
  return r.json();
}

async function supabaseUpdate(SUPABASE_URL, SUPABASE_KEY, notionId, patch) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/posts?notion_id=eq.' + encodeURIComponent(notionId), {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error('Supabase update ' + r.status + ' ' + (await r.text().catch(() => '')));
}

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // 시크릿 미설정 시 누구나 호출 가능
  const auth = req.headers && req.headers.authorization;
  if (auth === 'Bearer ' + secret) return true;
  if (req.query && req.query.secret === secret) return true;
  return false;
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!isAuthorized(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_DB_ID = process.env.NOTION_DB_ID || NOTION_DB_ID_DEFAULT;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  // posts 테이블 INSERT/UPDATE 는 service_role 권한 필요. 별도 env 가 없으면 SUPABASE_KEY fallback.
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  if (!NOTION_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
    res.status(500).json({
      error: 'env not set',
      hint: 'NOTION_TOKEN / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY(또는 SUPABASE_KEY) 환경변수를 확인하세요.',
    });
    return;
  }

  const dryRun = (req.query && req.query.dryRun === '1');

  try {
    // 1) 노션 DB에서 공개=true 페이지 모두 가져오기 (페이지네이션)
    const allPages = [];
    let cursor;
    do {
      const body = {
        filter: { property: '공개', checkbox: { equals: true } },
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        page_size: 100,
      };
      if (cursor) body.start_cursor = cursor;
      const d = await notionFetch('/databases/' + NOTION_DB_ID + '/query', NOTION_TOKEN, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      allPages.push(...(d.results || []));
      cursor = d.has_more ? d.next_cursor : null;
    } while (cursor);

    const report = { total: allPages.length, inserted: 0, updated: 0, skipped: 0, errors: [] };

    for (const page of allPages) {
      try {
        const props = page.properties || {};
        const title = getTitle(props);
        if (!title) { report.skipped += 1; continue; }

        const notionId = page.id.replace(/-/g, '');
        const isPublished = getCheckbox(props, ['공개']); // 필터로 이미 true만 옴
        const dateStart = getDate(props, ['작성일']) || (page.created_time ? page.created_time.slice(0, 10) : '');
        const summary = getRichText(props, ['요약']);
        const categoryRaw = getSelect(props, ['카테고리']);
        const category = mapCategory(categoryRaw);

        // 본문 블록 → 마크다운
        const blocks = await fetchChildren(page.id, NOTION_TOKEN);
        const content = await blocksToMarkdown(blocks, NOTION_TOKEN);

        const excerpt = (summary && summary.trim()) || makeExcerpt(content);
        const coverUrl = getCoverUrl(page);

        const existing = await supabaseSelectByNotionId(SUPABASE_URL, SUPABASE_KEY, notionId);

        if (existing) {
          // 업데이트: slug 는 보존(관리자가 수동 변경했을 수 있음)
          const patch = {
            title,
            content,
            excerpt,
            category,
            published: isPublished,
            updated_at: new Date().toISOString(),
          };
          if (coverUrl) patch.cover_url = coverUrl;
          if (dateStart) patch.created_at = dateStart;
          if (!dryRun) await supabaseUpdate(SUPABASE_URL, SUPABASE_KEY, notionId, patch);
          report.updated += 1;
        } else {
          const row = {
            title,
            slug: makeSlug(notionId),
            content,
            excerpt,
            category,
            cover_url: coverUrl,
            published: isPublished,
            created_at: dateStart || new Date().toISOString(),
            notion_id: notionId,
          };
          if (!dryRun) await supabaseInsert(SUPABASE_URL, SUPABASE_KEY, row);
          report.inserted += 1;
        }
      } catch (e) {
        report.errors.push({ id: page.id, msg: String(e.message || e) });
      }
    }

    res.status(200).json({ ok: true, dryRun, report });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err.message || err) });
  }
};
