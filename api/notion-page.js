export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const pageId = req.query.id;

  if (!NOTION_TOKEN) return res.status(500).json({ error: 'NOTION_TOKEN not set' });
  if (!pageId) return res.status(400).json({ error: 'Page ID required (?id=xxx)' });

  try {
    // Fetch all blocks (handle pagination)
    let allBlocks = [];
    let cursor = undefined;
    let hasMore = true;

    while (hasMore) {
      const url = 'https://api.notion.com/v1/blocks/' + pageId + '/children?page_size=100' + (cursor ? '&start_cursor=' + cursor : '');
      const r = await fetch(url, {
        headers: {
          'Authorization': 'Bearer ' + NOTION_TOKEN,
          'Notion-Version': '2022-06-28',
        },
      });

      if (!r.ok) {
        const errText = await r.text();
        return res.status(500).json({ error: 'Notion API ' + r.status, detail: errText });
      }

      const data = await r.json();
      allBlocks = allBlocks.concat(data.results || []);
      hasMore = data.has_more;
      cursor = data.next_cursor;
    }

    // Convert blocks to HTML
    const html = blocksToHtml(allBlocks);

    res.status(200).json({ html, blockCount: allBlocks.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

function richTextToHtml(richTexts) {
  if (!richTexts || !richTexts.length) return '';
  return richTexts.map(rt => {
    let text = escapeHtml(rt.plain_text || '');
    if (!text) return '';
    const a = rt.annotations || {};
    if (a.bold) text = '<strong>' + text + '</strong>';
    if (a.italic) text = '<em>' + text + '</em>';
    if (a.strikethrough) text = '<s>' + text + '</s>';
    if (a.underline) text = '<u>' + text + '</u>';
    if (a.code) text = '<code>' + text + '</code>';
    if (rt.href) text = '<a href="' + escapeHtml(rt.href) + '" target="_blank" rel="noopener">' + text + '</a>';
    return text;
  }).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function blocksToHtml(blocks) {
  let html = '';
  let inList = null; // 'bulleted' or 'numbered'

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const type = block.type;
    const content = block[type];

    // Close list if type changed
    if (inList && type !== inList + '_list_item') {
      html += inList === 'bulleted' ? '</ul>' : '</ol>';
      inList = null;
    }

    switch (type) {
      case 'paragraph':
        const pText = richTextToHtml(content?.rich_text);
        html += pText ? '<p>' + pText + '</p>' : '<br>';
        break;

      case 'heading_1':
        html += '<h2>' + richTextToHtml(content?.rich_text) + '</h2>';
        break;

      case 'heading_2':
        html += '<h3>' + richTextToHtml(content?.rich_text) + '</h3>';
        break;

      case 'heading_3':
        html += '<h4>' + richTextToHtml(content?.rich_text) + '</h4>';
        break;

      case 'bulleted_list_item':
        if (inList !== 'bulleted') { html += '<ul>'; inList = 'bulleted'; }
        html += '<li>' + richTextToHtml(content?.rich_text) + '</li>';
        break;

      case 'numbered_list_item':
        if (inList !== 'numbered') { html += '<ol>'; inList = 'numbered'; }
        html += '<li>' + richTextToHtml(content?.rich_text) + '</li>';
        break;

      case 'to_do':
        const checked = content?.checked ? '☑' : '☐';
        html += '<p>' + checked + ' ' + richTextToHtml(content?.rich_text) + '</p>';
        break;

      case 'toggle':
        html += '<details><summary>' + richTextToHtml(content?.rich_text) + '</summary></details>';
        break;

      case 'quote':
        html += '<blockquote>' + richTextToHtml(content?.rich_text) + '</blockquote>';
        break;

      case 'callout':
        const icon = content?.icon?.emoji || '💡';
        html += '<div class="callout">' + icon + ' ' + richTextToHtml(content?.rich_text) + '</div>';
        break;

      case 'code':
        html += '<pre><code>' + richTextToHtml(content?.rich_text) + '</code></pre>';
        break;

      case 'divider':
        html += '<hr>';
        break;

      case 'image':
        const imgUrl = content?.file?.url || content?.external?.url || '';
        const caption = richTextToHtml(content?.caption);
        if (imgUrl) {
          html += '<figure><img src="' + escapeHtml(imgUrl) + '" alt="' + (caption || 'image') + '" loading="lazy"><figcaption>' + caption + '</figcaption></figure>';
        }
        break;

      case 'video':
        const vidUrl = content?.external?.url || content?.file?.url || '';
        if (vidUrl && vidUrl.includes('youtu')) {
          const ytId = vidUrl.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1];
          if (ytId) html += '<div class="video-wrap"><iframe src="https://www.youtube.com/embed/' + ytId + '" allowfullscreen></iframe></div>';
        }
        break;

      case 'bookmark':
        const bmUrl = content?.url || '';
        if (bmUrl) html += '<p><a href="' + escapeHtml(bmUrl) + '" target="_blank" rel="noopener">🔗 ' + escapeHtml(bmUrl) + '</a></p>';
        break;

      case 'embed':
        const emUrl = content?.url || '';
        if (emUrl) html += '<p><a href="' + escapeHtml(emUrl) + '" target="_blank" rel="noopener">🔗 ' + escapeHtml(emUrl) + '</a></p>';
        break;

      default:
        // Skip unsupported block types silently
        break;
    }
  }

  // Close any remaining list
  if (inList === 'bulleted') html += '</ul>';
  if (inList === 'numbered') html += '</ol>';

  return html;
}
