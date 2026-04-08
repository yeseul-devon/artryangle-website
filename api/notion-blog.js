export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const NOTION_TOKEN = process.env.NOTION_TOKEN || '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';
  const NOTION_DB_ID = process.env.NOTION_DB_ID || '33ce6b4eecd880619e4fdbfb00855312';

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
    const data = await notionRes.json();
    if (data.object === 'error') {
      return res.status(500).json({ error: data.message });
    }
    const posts = (data.results || []).map((page) => ({
      id: page.id,
      title: page.properties['이름']?.title?.[0]?.plain_text || '',
      summary: page.properties['요약']?.rich_text?.[0]?.plain_text || '',
      category: page.properties['카테고리']?.select?.name || '',
      date: page.properties['작성일']?.date?.start || '',
      url: page.url,
    }));
    return res.status(200).json({ posts });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
