// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href === '#') return;
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            const navMenu = document.querySelector('.nav-menu');
            if (navMenu && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
            }
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Mobile menu toggle
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navMenu = document.querySelector('.nav-menu');

if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        const icon = this.querySelector('i');
        if (!icon) return;
        if (navMenu.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(e) {
    if (!navMenu || !mobileMenuToggle) return;
    if (!e.target.closest('.navbar') && !e.target.closest('.mobile-menu-toggle')) {
        if (navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            const icon = mobileMenuToggle.querySelector('i');
            if (!icon) return;
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    }
});

// Navbar shadow on scroll
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    if (window.scrollY > 50) {
        navbar.style.boxShadow = '0 4px 6px rgba(0,0,0,0.2)';
    } else {
        navbar.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    }
});

// Back to top button functionality
const backToTopButton = document.getElementById('backToTop');

if (backToTopButton) {
    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            backToTopButton.classList.add('visible');
        } else {
            backToTopButton.classList.remove('visible');
        }
    });

    backToTopButton.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Add animation on scroll for sections
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
});

// Highlight active nav link on scroll
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');

function highlightNavigation() {
    const scrollY = window.scrollY;
    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 110;
        const sectionId = section.getAttribute('id');
        
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                if (!link.getAttribute('href')) return;
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.style.color = '#3498db';
                } else {
                    link.style.color = '';
                }
            });
        }
    });
}

window.addEventListener('scroll', highlightNavigation);

// Handle profile photo error (hide if missing)
const profilePhoto = document.querySelector('.profile-photo');
if (profilePhoto) {
    profilePhoto.addEventListener('error', function() {
        this.style.display = 'none';
    });
}

// Add hover effect to cards (transition already in CSS)
const cards = document.querySelectorAll(
    '.research-card, .education-item, .presentation-item, .blog-card, .contact-item'
);
cards.forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transition = 'all 0.3s ease';
    });
});

// Lazy load images if attribute present
if ('loading' in HTMLImageElement.prototype) {
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
        if (img.dataset.src) {
            img.src = img.dataset.src;
        }
    });
} else {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.3.2/lazysizes.min.js';
    document.body.appendChild(script);
}

// Update footer year automatically
const currentYear = new Date().getFullYear();
const footerText = document.querySelector('.footer p');
if (footerText && footerText.textContent.includes('2025')) {
    footerText.textContent = footerText.textContent.replace('2025', currentYear);
}

// Subtle parallax effect on hero (desktop only)
window.addEventListener('scroll', function() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    if (window.innerWidth < 768) return;
    const scrolled = window.scrollY;
    hero.style.transform = `translateY(${scrolled * 0.15}px)`;
});

// Ensure profile photo does not show as broken
window.addEventListener('DOMContentLoaded', function() {
    const profileImg = document.querySelector('.profile-photo');
    if (profileImg) {
        profileImg.onerror = function() {
            this.style.display = 'none';
        };
    }
});

// Keyboard navigation support
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && navMenu && navMenu.classList.contains('active') && mobileMenuToggle) {
        navMenu.classList.remove('active');
        const icon = mobileMenuToggle.querySelector('i');
        if (!icon) return;
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
    if (e.key === 'Home' && e.ctrlKey) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

// Debounce utility for scroll handlers
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const debouncedHighlight = debounce(highlightNavigation, 15);
window.addEventListener('scroll', debouncedHighlight);

// Dark mode toggle with localStorage
(function () {
    const body = document.body;
    const toggle = document.getElementById('themeToggle');
    const storedTheme = localStorage.getItem('theme');

    if (storedTheme === 'dark') {
        body.classList.add('dark-mode');
    }

    function updateIcon() {
        if (!toggle) return;
        const icon = toggle.querySelector('i');
        if (!icon) return;
        if (body.classList.contains('dark-mode')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

    updateIcon();

    if (toggle) {
        toggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            localStorage.setItem(
                'theme',
                body.classList.contains('dark-mode') ? 'dark' : 'light'
            );
            updateIcon();
        });
    }
})();

// Console signature
console.log('%cLila Ballav Bhusal', 'color: #3498db; font-size: 22px; font-weight: bold;');
console.log('%cEconomist | Research Fellow', 'color: #2c3e50; font-size: 13px;');
console.log('%cSite: HTML, CSS, JavaScript, MRIO-driven research focus.', 'color: #95a5a6; font-size: 11px;');
