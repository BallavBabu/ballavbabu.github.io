(() => {
  'use strict';
  // Mobile menu.
  const nav = document.querySelector('.site-header');
  const toggle = nav && nav.querySelector('.menu-toggle');
  const menu = nav && nav.querySelector('#site-menu');
  if (toggle && menu) {
    nav.classList.add('menu-ready');
    const setOpen = open => {
      menu.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(!menu.classList.contains('open')));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('click', e => { if (!nav.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menu.classList.contains('open')) { setOpen(false); toggle.focus(); }
    });
  }

  // CV download links appear only once a PDF path is set in site-config.js.
  const cv = (window.SITE_CONFIG || {}).cvPdf;
  if (cv && /^(https:\/\/|files\/)[\w./%-]+\.pdf$/i.test(cv)) {
    const prefix = document.documentElement.dataset.root || '';
    const href = /^https:/.test(cv) ? cv : prefix + cv;
    document.querySelectorAll('[data-cv-pdf]').forEach(el => {
      el.href = href;
      el.hidden = false;
    });
  }
})();
