// Reads the Working Papers Google Sheet and refreshes the two lists on the page.
// The page already contains a copy written by the GitHub Action, so if the
// sheet cannot be reached nothing changes. Output matches
// scripts/sync_working_papers.py exactly.
(function (root) {
  'use strict';
  const OWN = new Set(['lila ballav bhusal', 'bhusal lila ballav', 'l b bhusal',
    'bhusal l b', 'lila bhusal', 'bhusal lila']);
  const SECTIONS = {'working paper': 'working-papers', 'work in progress': 'work-in-progress'};
  const LINK = /^(https:\/\/[^\s"'<>]+|files\/[\w./-]+)$/;

  function parseCSV(text) {
    const rows = []; let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') quoted = false;
        else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }
  const esc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  const isOwn = n => OWN.has(n.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim());
  const safeLink = v => { v = (v || '').trim(); return LINK.test(v) ? v : ''; };
  const splitAuthors = v => (v || '').split(',').map(a => a.trim()).filter(Boolean);
  const joinAnd = n => n.length <= 1 ? n.join('') : n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
  const paragraphs = t => t.trim().split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    .map(p => '<p>' + esc(p) + '</p>').join('');

  function parseRows(text) {
    text = text.replace(/^﻿/, '');
    if (/^\s*</.test(text)) throw new Error('Not CSV');
    const table = parseCSV(text);
    const head = (table.shift() || []).map(h => h.trim().toLowerCase());
    for (const need of ['show', 'section', 'title', 'authors'])
      if (!head.includes(need)) throw new Error('Missing column ' + need);
    const rows = [];
    for (const cells of table) {
      const row = {};
      head.forEach((h, i) => { row[h] = (cells[i] || '').trim(); });
      if (!['yes', 'true', 'y', '1'].includes((row.show || '').toLowerCase())) continue;
      const section = SECTIONS[(row.section || '').toLowerCase()];
      if (!section || !row.title) continue;
      const order = parseFloat(row.order);
      row._section = section; row._order = Number.isFinite(order) ? order : 999;
      rows.push(row);
    }
    // Same ordering as Python: order, then title (case-insensitive, code-point order).
    return rows.sort((a, b) => a._order - b._order ||
      (a.title.toLowerCase() < b.title.toLowerCase() ? -1 : a.title.toLowerCase() > b.title.toLowerCase() ? 1 : 0));
  }

  function renderItem(row, wip) {
    const title = esc(row.title), paper = safeLink(row.paper_url);
    const head = paper ? '<a href="' + esc(paper) + '">' + title + '</a>' : title;
    const out = ['<article class="paper' + (wip ? ' paper-wip' : '') + '">',
      '<h4 class="paper-title">' + head + '</h4>'];
    const authors = splitAuthors(row.authors);
    if (wip) {
      const others = authors.filter(a => !isOwn(a));
      if (others.length) out.push('<p class="paper-byline">with ' + esc(joinAnd(others)) + '</p>');
    } else if (authors.length) {
      const names = authors.map(a => isOwn(a) ? '<strong>' + esc(a) + '</strong>' : esc(a)).join(', ');
      out.push('<p class="paper-byline">' + names + (row.year ? ' (' + esc(row.year) + ')' : '') + '</p>');
    }
    if (row.status || row.venue) {
      const bits = row.status ? [esc(row.status)] : [];
      if (row.venue) bits.push('<em>' + esc(row.venue) + '</em>');
      out.push('<p class="paper-status">' + bits.join(', ') + '</p>');
    }
    const links = [[paper, 'Paper'], [safeLink(row.code_url), 'Code'], [safeLink(row.slides_url), 'Slides']]
      .filter(([u]) => u).map(([u, l]) => '<a href="' + esc(u) + '">' + l + '</a>');
    if (links.length) out.push('<p class="paper-links">' + links.join(' ') + '</p>');
    if (row.abstract) out.push('<details class="paper-abstract"><summary>Abstract</summary>' + paragraphs(row.abstract) + '</details>');
    out.push('</article>');
    return out.join('');
  }

  function renderSection(rows, section) {
    const items = rows.filter(r => r._section === section).map(r => renderItem(r, section === 'work-in-progress'));
    return items.length ? items.join('\n') : '<p class="empty-note">No entries at present.</p>';
  }

  root.WorkingPapers = {parseCSV, parseRows, renderSection};
  if (typeof document === 'undefined') return;

  const config = root.SITE_CONFIG || {};
  const targets = Object.values(SECTIONS).map(id => [id, document.getElementById(id)]).filter(([, el]) => el);
  if (!config.sheetId || !targets.length) return;
  const url = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(config.sheetId) +
    '/gviz/tq?tqx=out:csv&headers=1&sheet=' + encodeURIComponent(config.sheetName || 'WorkingPapers');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  fetch(url, {credentials: 'omit', signal: controller.signal})
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
    .then(text => {
      const rows = parseRows(text);
      for (const [id, el] of targets) el.innerHTML = renderSection(rows, id);
    })
    .catch(() => { /* Keep the copy already in the page. */ })
    .finally(() => clearTimeout(timer));
})(typeof window === 'undefined' ? globalThis : window);
