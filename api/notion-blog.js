export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    const NOTION_DB_ID = process.env.NOTION_DB_ID || '33ce6b4eecd880619e4fdbfb00855312';
    if (!NOTION_TOKEN) return res.status(500).json({ error: 'NOTION_TOKEN not set' });
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
          if (!data.results) return res.status(500).json({ error: data.message });
          const posts = data.results.map(p => {
                  const titleProp = p.properties['이름'] || p.properties['제목'] || p.properties['Name'];
                  const title = (titleProp && titleProp.title && titleProp.title[0]) ? (titleProp.title[0].plain_text || titleProp.title[0].text.content) : '제목 없음';
                  const excerptProp = p.properties['요약'];
                  const excerpt = (excerptProp && excerptProp.rich_text && excerptProp.rich_text[0]) ? (excerptProp.rich_text[0].plain_text || '') : '';
                  const catProp = p.properties['카테고리'] || p.properties['태그'];
                  const category = (catProp && catProp.select) ? catProp.select.name : ((catProp && catProp.multi_select && catProp.multi_select[0]) ? catProp.multi_select[0].name : '예술경영');
                  const dateProp = p.properties['작성일'];
                  const created_at = (dateProp && dateProp.date) ? dateProp.date.start : p.created_time;
                  return { id: p.id, title, excerpt, category, created_at, notion_url: p.url, source: 'notion' };
          }).filter(p => p.title && p.title !== '제목 없음');
          res.status(200).json({ posts });
    } catch (e) {
          res.status(500).json({ error: e.message });
    }
}
