export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_DB_ID = process.env.NOTION_DB_ID || '33ce6b4eecd880619e4fdbfb00855312';

  if (!NOTION_TOKEN) {
    return res.status(500).json({ error: 'NOTION_TOKEN not set', posts: [] });
  }

  try {
    const notionRes = await fetch(
      'https://api.notion.com/v1/databases/' + NOTION_DB_ID + '/query',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + NOTION_TOKEN,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: { property: '공개', checkbox: { equals: true } },
          sorts: [{ property: '작성일', direction: 'descending' }],
          page_size: 50,
        }),
      }
    );

    if (!notionRes.ok) {
      const errText = await notionRes.text();
      return res.status(500).json({ error: 'Notion API error: ' + notionRes.status, detail: errText, posts: [] });
    }

    const data = await notionRes.json();

    if (data.object === 'error') {
      return res.status(500).json({ error: data.message, posts: [] });
    }

    const posts = (data.results || []).map(page => ({
      id: page.id,
      title: page.properties['이름']?.title?.[0]?.plain_text || page.properties['Name']?.title?.[0]?.plain_text || '',
      excerpt: page.properties['요약']?.rich_text?.[0]?.plain_text || '',
      tag: page.properties['카테고리']?.select?.name || '',
      date: page.properties['작성일']?.date?.start || page.created_time?.slice(0, 10) || '',
      notion_url: page.url,
    }));

    res.status(200).json({ posts });
  } catch (e) {
    res.status(500).json({ error: e.message, posts: [] });
  }
}
