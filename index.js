const navToggle = document.querySelector('.site-nav__toggle');
const navMenu = document.querySelector('.site-nav__links');
const navLinks = document.querySelectorAll('.site-nav__links a');
const yearEl = document.getElementById('year');

if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
}

if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
        const isOpen = navMenu.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', String(isOpen));
    });
}

navLinks.forEach((link) => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
    });
});

const sections = document.querySelectorAll('section[id]');

function setActiveNavLink() {
    const scrollPos = window.scrollY + 120;

    sections.forEach((section) => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        const matchingLink = document.querySelector(`.site-nav__links a[href="#${id}"]`);

        if (!matchingLink) {
            return;
        }

        if (scrollPos >= top && scrollPos < top + height) {
            navLinks.forEach((link) => link.classList.remove('is-active'));
            matchingLink.classList.add('is-active');
        }
    });
}

window.addEventListener('scroll', setActiveNavLink, { passive: true });
setActiveNavLink();
