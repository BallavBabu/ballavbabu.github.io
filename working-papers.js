(() => {
  'use strict';
  const sheet = 'https://docs.google.com/spreadsheets/d/1OSeIO3w1AOb0M-2p6pozApKrCRnOkRHOk3WHqws-wYM';
  const list = document.querySelector('#working-list');
  const status = document.querySelector('#paper-status');
  const interval = 30000;
  let pending = false;
  let sequence = 0;
  let previous;
  function node(tag, text, className) {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function render(table) {
    if (!Array.isArray(table?.rows) || !Array.isArray(table.cols)) throw Error('Invalid feed');
    const rows = table.rows.map(row => table.cols.map((_, i) => {
      const cell = row.c?.[i];
      return String(cell?.f ?? cell?.v ?? '').trim();
    })).filter(row => row[0]);
    const fingerprint = JSON.stringify(rows);
    if (fingerprint !== previous) {
      const items = document.createDocumentFragment();
      for (const [title, authors, date, stage, url] of rows) {
        const article = node('article', '', 'working-paper');
        article.append(node('h2', title));
        if (authors) article.append(node('p', authors));
        const metadata = [stage, date].filter(Boolean).join(' · ');
        if (metadata) article.append(node('p', metadata, 'stage'));
        if (url) {
          try {
            const address = new URL(url);
            if (['https:', 'http:'].includes(address.protocol)) {
              const link = node('a', 'Read paper');
              link.href = address.href;
              article.append(link);
            }
          } catch { /* The title remains readable without a valid URL. */ }
        }
        items.append(article);
      }
      list.replaceChildren(items);
      previous = fingerprint;
    }
    status.textContent = rows.length ? '' : 'No working papers are listed yet.';
  }
  function failed() {
    status.textContent = previous
      ? 'Showing the last list received. Checking again shortly.'
      : 'Working papers are temporarily unavailable. Checking again shortly.';
  }
  function refresh() {
    if (pending || document.hidden) return;
    pending = true;
    const callback = 'workingPapersResponse' + (++sequence);
    const script = document.createElement('script');
    const url = new URL(sheet + '/gviz/tq');
    url.search = new URLSearchParams({gid:'0', headers:'1', range:'A:E',
      tqx:'out:json;responseHandler:' + callback, _:String(Date.now())});
    const finish = () => {
      clearTimeout(timer);
      delete window[callback];
      script.remove();
      pending = false;
    };
    window[callback] = response => {
      try {
        if (response.status !== 'ok') throw Error('Sheet unavailable');
        render(response.table);
      } catch { failed(); }
      finally { finish(); }
    };
    script.onerror = () => { failed(); finish(); };
    const timer = setTimeout(script.onerror, 12000);
    script.src = url.href;
    script.referrerPolicy = 'no-referrer';
    document.head.append(script);
  }
  refresh();
  window.setInterval(refresh, interval);
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('pageshow', e => { if (e.persisted) refresh(); });
})();
