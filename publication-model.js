(function (root) {
  'use strict';
  const text = value => typeof value === 'string' ? value.trim().slice(0, 1200) : '';
  const titleKey = value => text(value).normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');
  function normalizeDOI(value) {
    const doi = text(value).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').toLowerCase();
    return /^10\.\d{4,9}\/[^\s<>"']+$/.test(doi) ? doi : '';
  }
  function doiOf(work) {
    const ids = work?.['external-ids']?.['external-id'] || [];
    const id = ids.find(id => id['external-id-type'] === 'doi' &&
      (!id['external-id-relationship'] || id['external-id-relationship'] === 'self'));
    return normalizeDOI(id?.['external-id-value']);
  }
  function matchWork(works, work) {
    const doi = normalizeDOI(work.doi);
    if (doi) {
      const exact = works.find(w => normalizeDOI(w.doi) === doi);
      if (exact) return exact;
    }
    const possible = works.filter(w => !doi || !normalizeDOI(w.doi));
    if (work.putCode) {
      const sameRecord = possible.find(w => w.putCode === work.putCode);
      if (sameRecord) return sameRecord;
    }
    const title = titleKey(work.title);
    const candidates = possible.filter(w => title && titleKey(w.title) === title);
    return candidates.length === 1 ? candidates[0] : undefined;
  }
  function dateOf(summary) {
    const date = summary?.['publication-date'];
    const year = text(date?.year?.value);
    if (!/^(19|20|21)\d{2}$/.test(year)) return '';
    const month = Number(date?.month?.value), day = Number(date?.day?.value);
    if (!(month >= 1 && month <= 12)) return year;
    const ym = year + '-' + String(month).padStart(2, '0');
    return day >= 1 && day <= 31 ? ym + '-' + String(day).padStart(2, '0') : ym;
  }
  function parseWorks(payload) {
    if (!Array.isArray(payload?.group)) throw new Error('Unexpected ORCID response');
    const works = [];
    for (const group of payload.group) {
      const summaries = group?.['work-summary'] || [];
      // Some indexes describe the same CRAN software release as a journal article.
      if (summaries.some(w => w.type === 'software' || doiOf(w).startsWith('10.32614/cran.'))) continue;
      const eligible = summaries.filter(w => w.type === 'journal-article')
        .sort((a, b) => Number(b['display-index'] || 0) - Number(a['display-index'] || 0));
      const first = eligible.find(w => text(w.title?.title?.value) && /^\d+$/.test(String(w['put-code'])));
      if (!first) continue;
      // ORCID groups alternate deposits for the same work. Use the preferred deposit,
      // filling missing bibliographic fields from the other deposits within that group.
      const ordered = [first, ...eligible.filter(w => w !== first)];
      const sortDate = ordered.map(dateOf).find(Boolean) || '';
      const work = {
        title: text(first.title.title.value), year: sortDate.slice(0, 4), sortDate,
        doi: ordered.map(doiOf).find(Boolean) || doiOf(group),
        journal: ordered.map(w => text(w['journal-title']?.value)).find(Boolean) || '',
        putCode: String(first['put-code']), revision: Number(first['last-modified-date']?.value) || 0, authors: []
      };
      const prior = matchWork(works, work);
      if (!prior) works.push(work);
      else {
        prior.doi ||= work.doi;
        prior.journal ||= work.journal;
        prior.year ||= work.year;
        prior.sortDate ||= work.sortDate;
      }
    }
    return works;
  }
  function mergeWorks(curated, incoming) {
    // A snapshot supplements citations for records still public on ORCID.
    // An article removed from the public list must disappear from the website.
    const works = incoming.map(live => {
      const saved = matchWork(curated, live);
      if (!saved) return live;
      return {...live,
        authors: live.authors?.length ? live.authors : saved.authors,
        doi: live.doi || saved.doi, journal: live.journal || saved.journal,
        year: live.year || saved.year, sortDate: live.sortDate || saved.sortDate,
        citation: saved.citation, note: saved.note
      };
    });
    return works.sort((a, b) => Number(b.year) - Number(a.year)
      || (b.sortDate || '').localeCompare(a.sortDate || '') || a.title.localeCompare(b.title));
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
  root.PublicationModel = {normalizeDOI, matchWork, parseWorks, mergeWorks, authorsOf, linkOf};
})(typeof window === 'undefined' ? globalThis : window);
