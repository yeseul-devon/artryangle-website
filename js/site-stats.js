/**
 * data/site-stats.js 값을 [data-stat] 요소에 넣습니다.
 * 카운트업 전에 목표 숫자를 먼저 적어 두므로, 애니메이션이 없어도 0으로 남지 않습니다.
 */
(function (root) {
  function formatSiteStat(stat, format) {
    if (!stat) return '';
    if (format === 'raw') return String(stat.value);
    if (format === 'number') return Number(stat.value).toLocaleString('ko-KR');
    if (format === 'counter') {
      var n = Number(stat.value);
      var body = Number.isFinite(n) ? n.toLocaleString('ko-KR') : String(stat.text || '');
      return body + (stat.suffix || '');
    }
    if (format === 'unit') return String(stat.text || '');
    return '';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderSiteStatInner(stat, format) {
    if (!stat) return '';
    if (format === 'unit') {
      return esc(stat.text) + '<span style="font-size:0.55em">' + esc(stat.unit) + '</span>';
    }
    if (format === 'label') {
      return String(stat.labelHtml || '')
        .split(/<br\s*\/?>/i)
        .map(esc)
        .join('<br>');
    }
    return esc(formatSiteStat(stat, format));
  }

  function applySiteStats(scope) {
    var stats = root.SITE_STATS;
    if (!stats || !scope || !scope.querySelectorAll) return;
    scope.querySelectorAll('[data-stat]').forEach(function (el) {
      var stat = stats[el.getAttribute('data-stat')];
      if (!stat) return;
      var format = el.getAttribute('data-stat-format') || 'counter';
      if (format === 'unit') {
        el.textContent = '';
        el.appendChild(scope.createTextNode ? scope.createTextNode(stat.text || '') : document.createTextNode(stat.text || ''));
        var span = document.createElement('span');
        span.style.fontSize = '0.55em';
        span.textContent = stat.unit || '';
        el.appendChild(span);
      } else if (format === 'label') {
        el.innerHTML = renderSiteStatInner(stat, 'label');
      } else {
        el.textContent = formatSiteStat(stat, format);
      }
      if (el.hasAttribute('data-count') && typeof stat.value === 'number') {
        el.setAttribute('data-count', String(stat.value));
        if (el.hasAttribute('data-count-suffix')) {
          el.setAttribute('data-count-suffix', format === 'counter' ? (stat.suffix || '') : '');
        }
      }
    });
  }

  root.formatSiteStat = formatSiteStat;
  root.renderSiteStatInner = renderSiteStatInner;
  root.applySiteStats = applySiteStats;

  // 이 스크립트는 본문 숫자들 뒤에 둡니다. 바로 채워 두고,
  // 그 다음 카운트업 스크립트가 같은 값에서 애니메이션을 시작합니다.
  if (root.document && root.SITE_STATS) applySiteStats(root.document);
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatSiteStat: globalThis.formatSiteStat,
    renderSiteStatInner: globalThis.renderSiteStatInner
  };
}
