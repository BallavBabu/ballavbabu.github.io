(() => {
  'use strict';
  const list = document.querySelector('#publication-list');
  const snapshot = document.querySelector('#publication-snapshot');
  const status = document.querySelector('#publication-status');
  const model = window.PublicationModel;
  if (!list || !snapshot || !model) return;
  const base = JSON.parse(snapshot.textContent);
  const endpoint = 'https://pub.orcid.org/v3.0/0000-0002-8934-8841/';
  const cacheKey = 'lbb-orcid-journal-articles-v2';
  const hour = 60 * 60 * 1000;
  let cached = readCache();
  let refreshing = false, lastAttempt = 0;

  // ORCID credit names come from each journal deposit. Some list the family
  // name first. Map those to the order the person uses.
  const normalized = name => name.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
  const OWN = ['lila ballav bhusal', 'bhusal lila ballav', 'l b bhusal', 'bhusal l b', 'lila bhusal', 'bhusal lila'];
  const DISPLAY = {
    'rahman mohammad sayedur': 'Mohammad Sayedur Rahman',
    'sayedur rahman mohammad': 'Mohammad Sayedur Rahman',
    'sayedur r m': 'Mohammad Sayedur Rahman',
    'bhusal lila ballav': 'Lila Ballav Bhusal',
    'ishiro taku': 'Taku Ishiro',
    'masum md': 'Md Masum'
  };
  const displayName = name => DISPLAY[normalized(name)] || name;

  function element(tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value) el.textContent = value;
    return el;
  }
  function render(works) {
    const fragment = document.createDocumentFragment();
    for (const work of works) {
      const row = element('article', 'publication');
      const heading = element('h4');
      const link = element('a', '', work.title);
      link.href = model.linkOf(work);
      heading.append(link); row.append(heading);
      const authors = element('p', 'pub-authors');
      (work.authors || []).forEach((name, i) => {
        if (i) authors.append(', ');
        const shown = displayName(name);
        authors.append(OWN.includes(normalized(name)) ? element('strong', '', shown) : shown);
      });
      if (work.year) authors.append((work.authors?.length ? ' ' : '') + '(' + work.year + ')');
      if (authors.hasChildNodes()) row.append(authors);
      const journal = element('p', 'pub-journal');
      if (work.journal) journal.append(element('em', '', work.journal));
      if (work.citation) journal.append((work.journal ? ', ' : '') + work.citation);
      if (journal.hasChildNodes()) row.append(journal);
      if (work.note) row.append(element('p', 'pub-note', work.note));
      fragment.append(row);
    }
    if (!works.length) fragment.append(element('p', '', 'No public journal articles are currently listed on ORCID.'));
    list.replaceChildren(fragment);
  }
  function readCache() {
    try {
      let cache = JSON.parse(localStorage.getItem(cacheKey));
      if (!cache) {
        // The previous cache combined hand-edited and public records. Only the latter
        // have an ORCID put-code and can stand as evidence of a public journal entry.
        const old = JSON.parse(localStorage.getItem('lbb-publications-2026-10-26-v1'));
        if (Array.isArray(old?.works)) {
          const works = old.works.filter(w => /^\d+$/.test(w?.putCode));
          if (works.length) cache = {savedAt: 0, works};
        }
      }
      if (!Number.isFinite(cache?.savedAt) || !Array.isArray(cache.works)) return null;
      if (!cache.works.every(w => typeof w?.title === 'string' && typeof w.year === 'string' &&
        (!w.year || /^\d{4}$/.test(w.year)) && Array.isArray(w.authors) && w.authors.every(a => typeof a === 'string'))) return null;
      return cache;
    } catch { return null; }
  }
  function note(value) { if (status) status.textContent = value; }
  function cacheList(savedAt, works) {
    cached = {savedAt, works};
    try { localStorage.setItem(cacheKey, JSON.stringify(cached)); } catch { /* In-memory fallback. */ }
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
  async function refresh() {
    const now = Date.now(), age = now - (cached?.savedAt || 0);
    if (refreshing || document.hidden || (cached && age >= 0 && age < hour) || (now - lastAttempt < 60000)) return;
    lastAttempt = now; refreshing = true;
    try {
      const incoming = model.parseWorks(await fetchJSON('works'));
      const pending = [];
      for (const work of incoming) {
        const prior = model.matchWork(cached?.works || [], work);
        if (prior) {
          work.authors = prior.authors;
          work.authorsCheckedAt = prior.authorsCheckedAt || 0;
          work.authorsRevision = prior.authorsRevision;
          if (work.putCode === prior.putCode && work.revision === work.authorsRevision &&
            (work.authors.length || now - work.authorsCheckedAt < 24 * hour)) continue;
        }
        pending.push(work);
      }
      // Keep newly discovered titles even if the tab closes before credit requests finish.
      cacheList(now, incoming);
      render(model.mergeWorks(base, incoming));
      // Fetch contributor detail for up to three articles at once.
      async function fetchCredits() {
        while (pending.length) {
          const work = pending.shift();
          try {
            const names = model.authorsOf(await fetchJSON('work/' + work.putCode));
            work.authors = names;
            work.authorsCheckedAt = now;
            work.authorsRevision = work.revision;
          } catch { /* Retain the last known byline. Retry on a later refresh. */ }
        }
      }
      await Promise.all(Array.from({length: Math.min(3, pending.length)}, fetchCredits));
      cacheList(now, incoming);
      render(model.mergeWorks(base, incoming));
      note('Public journal articles checked against ORCID.');
    } catch {
      note('Showing saved publications. The ORCID profile is linked below.');
    } finally { refreshing = false; }
  }
  if (cached) render(model.mergeWorks(base, cached.works));
  refresh();
  window.setInterval(refresh, hour);
  document.addEventListener('visibilitychange', refresh);
})();
