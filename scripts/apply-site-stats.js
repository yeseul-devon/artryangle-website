#!/usr/bin/env node
/**
 * data/site-stats.js 의 숫자를 index.html / about.html 의 [data-stat] 글자에 반영합니다.
 * JS 없는 화면이 이 파일과 어긋나지 않게, 숫자를 바꾼 뒤 실행하세요.
 *
 *   node scripts/apply-site-stats.js
 *   node scripts/apply-site-stats.js --check
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { renderSiteStatInner } = require('../js/site-stats.js');

const root = path.join(__dirname, '..');
const check = process.argv.includes('--check');
const files = ['index.html', 'about.html'];

const sandbox = { window: {}, globalThis: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(root, 'data', 'site-stats.js'), 'utf8'),
  sandbox
);
const SITE_STATS = sandbox.window.SITE_STATS;
if (!SITE_STATS) {
  console.error('data/site-stats.js 에서 SITE_STATS 를 읽지 못했습니다.');
  process.exit(1);
}

function updateHtml(html) {
  let next = html.replace(
    /<([a-zA-Z][\w:-]*)(\s[^>]*?\bdata-stat="([A-Za-z0-9_]+)"[^>]*)>([\s\S]*?)<\/\1>/g,
    function (full, tag, attrs, key) {
      const stat = SITE_STATS[key];
      if (!stat) return full;
      const format = (attrs.match(/\bdata-stat-format="([^"]+)"/) || [])[1] || 'counter';
      let newAttrs = attrs;
      if (format === 'counter' && typeof stat.value === 'number') {
        if (/\bdata-count="/.test(newAttrs)) {
          newAttrs = newAttrs.replace(/\bdata-count="[^"]*"/, 'data-count="' + stat.value + '"');
        }
        if (/\bdata-count-suffix="/.test(newAttrs)) {
          newAttrs = newAttrs.replace(
            /\bdata-count-suffix="[^"]*"/,
            'data-count-suffix="' + (stat.suffix || '') + '"'
          );
        }
      }
      return '<' + tag + newAttrs + '>' + renderSiteStatInner(stat, format) + '</' + tag + '>';
    }
  );

  next = next.replace(/<meta\b[^>]*\bdata-stat-inline="([^"]+)"[^>]*>/g, function (tag, key) {
    const stat = SITE_STATS[key];
    if (!stat || typeof stat.value !== 'number') return tag;
    return tag.replace(/(\d+)(년)/, String(stat.value) + '$2');
  });

  return next;
}

let dirty = 0;
for (const file of files) {
  const abs = path.join(root, file);
  const before = fs.readFileSync(abs, 'utf8');
  const after = updateHtml(before);
  if (before === after) {
    console.log(file + ' 이미 반영됨');
    continue;
  }
  dirty += 1;
  if (check) {
    console.error(file + ' 이 data/site-stats.js 와 다릅니다. node scripts/apply-site-stats.js 를 실행하세요.');
  } else {
    fs.writeFileSync(abs, after);
    console.log(file + ' 갱신');
  }
}

if (check && dirty) process.exit(1);
