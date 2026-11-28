(() => {
  const button = document.querySelector('#themeToggle');
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let preference;
  try { preference = localStorage.getItem('theme'); } catch {}
  function apply() {
    const dark = preference ? preference === 'dark' : media.matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    button.setAttribute('aria-pressed', String(dark));
  }
  button.addEventListener('click', () => {
    preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', preference); } catch {}
    apply();
  });
  media.addEventListener('change', apply);
  apply();
})();
