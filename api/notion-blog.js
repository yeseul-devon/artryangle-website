export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_DB_ID = process.env.NOTION_DB_ID || '33ce6b4eecd880619e4fdbfb00855312';
  if (!NOTION_TOKEN) return res.status(500).json({ error: 'NOTION_TOKEN 미설정', posts: [] });

  const debug = req.query.debug === '1';

  try {
    const notionRes = await fetch(
      'https://api.notion.com/v1/databases/' + NOTION_DB_ID + '/query',
      {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + NOTION_TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
        body: JSON.stringify({ sorts: [{ timestamp: 'created_time', direction: 'descending' }], page_size: 50 }),
      }
    );
    if (!notionRes.ok) {
      const errText = await notionRes.text();
      return res.status(500).json({
        error: 'Notion API ' + notionRes.status,
        hint: notionRes.status === 401 ? '토큰 만료 — 노션에서 재발급 필요' : notionRes.status === 404 ? 'DB ID 오류 또는 Integration 미연결' : errText,
        posts: []
      });
    }
    const data = await notionRes.json();
    if (data.object === 'error') return res.status(500).json({ error: data.message, posts: [] });
    const results = data.results || [];

    if (debug && results.length > 0) {
      const p = results[0].properties;
      const info = {};
      for (const k of Object.keys(p)) info[k] = { type: p[k].type, value: gv(p[k]) };
      return res.json({ debug: true, total: results.length, props: info });
    }

    const posts = results.map(pg => {
      const p = pg.properties;
      const pub = findProp(p, ['공개','Published','published','공개여부']);
      const isPublished = pub ? (pub.checkbox === true) : true;
      return {
        id: pg.id, published: isPublished,
        title: getTitle(p),
        excerpt: rt(p, ['요약','Summary','summary','Excerpt','설명']),
        tag: sel(p, ['카테고리','Category','category','태그','Tag']),
        date: dt(p, ['작성일','Date','date','날짜']) || pg.created_time?.slice(0,10) || '',
        notion_url: pg.url,
      };
    }).filter(x => x.published && x.title);

    res.status(200).json({ posts, total: results.length });
  } catch (e) { res.status(500).json({ error: e.message, posts: [] }); }
}
function findProp(p, names) { for (const n of names) if (p[n]) return p[n]; return null; }
function getTitle(p) { for (const k of Object.keys(p)) if (p[k].type === 'title') return p[k].title?.[0]?.plain_text || ''; return ''; }
function rt(p, ns) { for (const n of ns) if (p[n]?.type === 'rich_text') return p[n].rich_text?.[0]?.plain_text || ''; return ''; }
function sel(p, ns) { for (const n of ns) { if (p[n]?.type === 'select') return p[n].select?.name || ''; if (p[n]?.type === 'multi_select') return p[n].multi_select?.[0]?.name || ''; } return ''; }
function dt(p, ns) { for (const n of ns) if (p[n]?.type === 'date') return p[n].date?.start || ''; return ''; }
function gv(prop) { switch(prop.type) { case 'title': return prop.title?.[0]?.plain_text||''; case 'rich_text': return prop.rich_text?.[0]?.plain_text||''; case 'select': return prop.select?.name||''; case 'checkbox': return prop.checkbox; case 'date': return prop.date?.start||''; default: return '('+prop.type+')'; } }
