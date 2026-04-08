export default async function handler(req, res) {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_DB_ID = process.env.NOTION_DB_ID;

  if (!NOTION_TOKEN || !NOTION_DB_ID) {
    return res.status(500).json({ error: 'Missing environment variables', posts: [] });
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          property: '공개',
          checkbox: { equals: true }
        },
        sorts: [
          { property: '작성일', direction: 'descending' }
        ]
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      return res.status(response.status).json({ error: errData.message, posts: [] });
    }

    const data = await response.json();

    const posts = data.results.map(page => {
      const props = page.properties;
      return {
        id: page.id,
        title: props['이름']?.title?.[0]?.plain_text || '',
        date: props['작성일']?.date?.start || '',
        tag: props['카테고리']?.select?.name || '',
        excerpt: props['요약']?.rich_text?.[0]?.plain_text || '',
        slug: page.id
      };
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ posts });
  } catch (err) {
    res.status(500).json({ error: err.message, posts: [] });
  }
}
