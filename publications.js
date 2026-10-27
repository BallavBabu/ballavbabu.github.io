(() => {
  'use strict';
  const list = document.querySelector('#publication-list');
  const model = window.PublicationModel;
  if (!list || !model) return;
  const base = JSON.parse(document.querySelector('#publication-snapshot').textContent);
  const endpoint = 'https://pub.orcid.org/v3.0/0000-0002-8934-8841/';
  const cacheKey = 'lbb-publications-2026-10-26-v1';
  const cacheLifetime = 24 * 60 * 60 * 1000;
  const status = document.querySelector('#publication-status');
  function element(tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value) el.textContent = value;
    return el;
  }
  function externalLink(label, href, className) {
    const link = element('a', className, label); link.href = href; link.target = '_blank'; link.rel = 'noopener';
    return link;
  }
  function render(works) {
    const fragment = document.createDocumentFragment();
    for (const work of works) {
      const row = element('div', 'publication');
      const heading = element('h4');
      heading.append(externalLink(work.title, model.linkOf(work))); row.append(heading);
      row.append(element('p', 'pub-authors', (work.authors?.length ? work.authors.join(' · ') + ' ' : '') + '(' + work.year + ').'));
      const journal = element('p', 'pub-journal');
      journal.append(element('em', '', work.journal));
      if (work.citation) journal.append(document.createTextNode(', ' + work.citation));
      journal.append(document.createTextNode('.')); row.append(journal);
      const note = work.note || (Number(work.year) > new Date().getFullYear() ? work.year + ' issue' : '');
      if (note) row.append(element('p', 'pub-abstract', note));
      const link = externalLink(work.doi ? 'DOI: ' + work.doi : 'ORCID record ↗', model.linkOf(work), 'pub-link');
      row.append(link); fragment.append(row);
    }
    list.replaceChildren(fragment);
  }
  function readCache() {
    try {
      const cache = JSON.parse(localStorage.getItem(cacheKey));
      if (!cache || !Number.isFinite(cache.savedAt) || !Array.isArray(cache.works)) return null;
      if (!cache.works.every(w => typeof w.title === 'string' && /^\d{4}$/.test(String(w.year)) && Array.isArray(w.authors) && w.authors.every(a => typeof a === 'string'))) return null;
      return cache;
    } catch { return null; }
  }
  async function fetchJSON(path) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(endpoint + path, {headers: {Accept: 'application/json'}, signal: controller.signal, credentials: 'omit'});
      if (!response.ok) throw new Error('ORCID unavailable');
      return await response.json();
    } finally { clearTimeout(timeout); }
  }
  async function update() {
    const cache = readCache();
    if (cache) render(model.mergeWorks(base, cache.works));
    if (cache && Date.now() - cache.savedAt >= 0 && Date.now() - cache.savedAt < cacheLifetime) {
      status.textContent = 'Showing saved publications from your recent ORCID check.';
      return;
    }
    try {
      const incoming = model.parseWorks(await fetchJSON('works'));
      const known = new Map([...base, ...(cache?.works || [])].map(w => [model.normalizeDOI(w.doi) || w.title.toLowerCase(), w]));
      for (const work of incoming) {
        const prior = known.get(work.doi || work.title.toLowerCase());
        if (prior?.authors?.length) { work.authors = prior.authors; continue; }
        // Fetch author credits only for newly discovered works; never guess coauthors.
        try { work.authors = model.authorsOf(await fetchJSON('work/' + work.putCode)); } catch { work.authors = []; }
      }
      const works = model.mergeWorks(base, incoming);
      render(works);
      status.textContent = 'Public journal articles checked against ORCID.';
      // Retry missing author credits next visit, while retaining the readable list.
      if (incoming.every(w => w.authors.length)) {
        try { localStorage.setItem(cacheKey, JSON.stringify({savedAt: Date.now(), works})); } catch { /* Storage may be unavailable in private browsing. */ }
      }
    } catch {
      status.textContent = 'Showing the saved publication list. The ORCID profile is also linked below.';
    }
  }
  update();
})();
