/**
 * OmniQ Website — Shared JavaScript
 * Handles: navbar scroll, mobile nav, scroll animations, back-to-top
 */
(function () {
  'use strict';

  /* ---- Clean URL canonicalization (remove /index.html from address bar) ---- */
  if (window.location.pathname.endsWith('/index.html') || window.location.pathname === '/index.html') {
    const cleanPath = window.location.pathname.replace(/\/index\.html$/, '') || '/';
    window.history.replaceState(null, '', cleanPath + window.location.search + window.location.hash);
  }

  /* ---- Navbar scroll effect ---- */
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    const onScroll = () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- Mobile navigation ---- */
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  const overlay = document.querySelector('.nav-overlay');
  const closeBtn = document.querySelector('.nav-close');

  function openNav() {
    navLinks?.classList.add('open');
    overlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeNav() {
    navLinks?.classList.remove('open');
    overlay?.classList.remove('open');
    document.body.style.overflow = '';
  }

  toggle?.addEventListener('click', openNav);
  overlay?.addEventListener('click', closeNav);
  closeBtn?.addEventListener('click', closeNav);
  navLinks?.querySelectorAll('a').forEach(link =>
    link.addEventListener('click', closeNav)
  );

  /* ---- Scroll-reveal (fade-up) ---- */
  const faders = document.querySelectorAll('.fade-up');
  if (faders.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    faders.forEach((el) => io.observe(el));
  } else {
    faders.forEach((el) => el.classList.add('visible'));
  }

  /* ---- Back-to-top button ---- */
  const topBtn = document.querySelector('.back-to-top');
  if (topBtn) {
    window.addEventListener('scroll', () => {
      topBtn.classList.toggle('visible', window.scrollY > 600);
    }, { passive: true });
    topBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---- Current year in footer ---- */
  document.querySelectorAll('.current-year').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
})();
