(function (root) {
  'use strict';
  const text = value => typeof value === 'string' ? value.trim().slice(0, 1200) : '';
  function normalizeDOI(value) {
    const doi = text(value).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').toLowerCase();
    return /^10\.\d{4,9}\/[^\s<>"']+$/.test(doi) ? doi : '';
  }
  function doiOf(work) {
    const ids = work?.['external-ids']?.['external-id'] || [];
    const id = ids.find(id => id['external-id-type'] === 'doi' && (!id['external-id-relationship'] || id['external-id-relationship'] === 'self'));
    return normalizeDOI(id?.['external-id-value']);
  }
  function key(work) { return normalizeDOI(work.doi) || text(work.title).toLowerCase().replace(/\s+/g, ' '); }
  function parseWorks(payload) {
    if (!payload || !Array.isArray(payload.group)) throw new Error('Unexpected ORCID response');
    const works = new Map();
    for (const group of payload.group) {
      const summaries = group['work-summary'] || [];
      // CRAN can be imported as a journal article by another index. It remains software.
      if (summaries.some(w => w.type === 'software' || doiOf(w).startsWith('10.32614/cran.'))) continue;
      const eligible = summaries.filter(w => w.type === 'journal-article').sort((a, b) => Number(b['display-index'] || 0) - Number(a['display-index'] || 0));
      for (const w of eligible) {
        const title = text(w.title?.title?.value), year = text(w['publication-date']?.year?.value);
        const putCode = String(w['put-code'] || '');
        if (!title || !/^\d+$/.test(putCode) || !/^(19|20|21)\d{2}$/.test(year)) continue;
        const publication = {title, year, doi: doiOf(w), journal: text(w['journal-title']?.value), putCode, authors: [], citation: '', note: ''};
        const id = key(publication);
        if (!works.has(id)) works.set(id, publication);
      }
    }
    return [...works.values()];
  }
  function mergeWorks(saved, incoming) {
    const works = new Map(saved.map(w => [key(w), {...w}]));
    for (const work of incoming) {
      const id = key(work), verified = works.get(id);
      // Keep verified author order, citation year and issue details for known papers.
      works.set(id, verified ? {...work, ...verified, putCode: work.putCode || verified.putCode} : {...work});
    }
    return [...works.values()].sort((a, b) => Number(b.year) - Number(a.year) || (b.sortDate || '').localeCompare(a.sortDate || '') || a.title.localeCompare(b.title));
  }
  function authorsOf(work) {
    return (work?.contributors?.contributor || [])
      .filter(c => !c['contributor-attributes']?.['contributor-role'] || c['contributor-attributes']['contributor-role'] === 'author')
      .map(c => text(c['credit-name']?.value)).filter(Boolean);
  }
  function linkOf(work) {
    const doi = normalizeDOI(work.doi);
    if (doi) return 'https://doi.org/' + encodeURIComponent(doi).replace(/%2F/gi, '/');
    return 'https://orcid.org/0000-0002-8934-8841';
  }
  root.PublicationModel = {normalizeDOI, parseWorks, mergeWorks, authorsOf, linkOf};
})(typeof window === 'undefined' ? globalThis : window);
