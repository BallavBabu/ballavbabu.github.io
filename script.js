(() => {
    const nav = document.querySelector('.navbar');
    if (!nav) return;

    const toggle = nav.querySelector('.mobile-menu-toggle');
    const menu = nav.querySelector('#nav-menu');
    if (toggle && menu) {
        nav.classList.add('menu-ready');
        const setOpen = open => {
            menu.classList.toggle('active', open);
            toggle.setAttribute('aria-expanded', String(open));
        };

        toggle.addEventListener('click', () => setOpen(!menu.classList.contains('active')));
        menu.addEventListener('click', event => {
            if (event.target.closest('a')) setOpen(false);
        });
        document.addEventListener('click', event => {
            if (!nav.contains(event.target)) setOpen(false);
        });
        nav.addEventListener('keydown', event => {
            if (event.key === 'Escape' && menu.classList.contains('active')) {
                setOpen(false);
                toggle.focus();
            }
        });
        nav.addEventListener('focusout', event => {
            if (!nav.contains(event.relatedTarget)) setOpen(false);
        });
        window.matchMedia('(max-width: 43rem)').addEventListener('change', () => setOpen(false));
    }

    const theme = nav.querySelector('#themeToggle');
    if (theme) {
        const preferred = window.matchMedia('(prefers-color-scheme: dark)');
        let choice = null;
        try { choice = localStorage.getItem('theme'); } catch { /* Use the system preference. */ }
        const applyTheme = () => {
            const dark = choice === 'dark' || (choice !== 'light' && preferred.matches);
            document.documentElement.dataset.theme = dark ? 'dark' : 'light';
            theme.checked = dark;
        };
        applyTheme();
        nav.classList.add('theme-ready');
        preferred.addEventListener('change', applyTheme);
        theme.addEventListener('change', () => {
            choice = theme.checked ? 'dark' : 'light';
            applyTheme();
            try { localStorage.setItem('theme', choice); } catch { /* Keep this page's choice. */ }
        });
    }
})();
