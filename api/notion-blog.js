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
          property: 'published',
          checkbox: { equals: true }
        },
        sorts: [
          { property: 'date', direction: 'descending' }
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
        title: props.title?.title?.[0]?.plain_text || props.Name?.title?.[0]?.plain_text || '',
        date: props.date?.date?.start || '',
        tag: props.tag?.select?.name || props.category?.select?.name || '',
        excerpt: props.excerpt?.rich_text?.[0]?.plain_text || props.description?.rich_text?.[0]?.plain_text || '',
        slug: props.slug?.rich_text?.[0]?.plain_text || page.id
      };
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ posts });
  } catch (err) {
    res.status(500).json({ error: err.message, posts: [] });
  }
}
