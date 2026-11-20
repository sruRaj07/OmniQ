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

  /* ============================================================
     Customer Stories & Video Feedback Controller
     ============================================================ */
  // 1. Platform Filter Tabs
  const filterTabs = document.querySelector('.video-filter-tabs');
  if (filterTabs) {
    filterTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;

      const filter = btn.dataset.filter;
      filterTabs.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const cards = document.querySelectorAll('.video-grid .video-card');
      cards.forEach(card => {
        if (filter === 'all' || card.dataset.platform === filter) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  }

  // 2. Video Lightbox Modal
  const videoModal = document.getElementById('videoModal');
  const videoModalClose = document.getElementById('videoModalClose');
  const videoModalBackdrop = document.getElementById('videoModalBackdrop');
  const playerContainer = document.getElementById('videoPlayerContainer');
  const modalName = document.getElementById('modalCustomerName');
  const modalLocation = document.getElementById('modalCustomerLocation');
  const modalQuote = document.getElementById('modalCustomerQuote');

  function openVideoModal(card) {
    if (!videoModal || !playerContainer) return;

    const platform = card.dataset.platform;
    const customer = card.dataset.customer || 'OmniQ Verified Customer';
    const location = card.dataset.location || 'India';
    const quote = card.dataset.quote || '';

    // Set metadata
    if (modalName) modalName.textContent = customer;
    if (modalLocation) modalLocation.textContent = location;
    if (modalQuote) modalQuote.textContent = quote ? `"${quote}"` : '';

    // Build player depending on platform
    playerContainer.innerHTML = '';

    if (platform === 'youtube') {
      const videoId = card.dataset.videoId || 'dQw4w9WgXcQ';
      playerContainer.innerHTML = `
        <iframe 
          src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1" 
          title="${customer} Review" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      `;
    } else if (platform === 'whatsapp') {
      const videoSrc = card.dataset.videoSrc || '';
      playerContainer.innerHTML = `
        <video src="${videoSrc}" autoplay controls playsinline style="width:100%;height:100%;object-fit:cover;">
          Your browser does not support HTML5 video.
        </video>
      `;
    } else if (platform === 'instagram') {
      const reelId = card.dataset.reelId;
      if (reelId && reelId !== 'sample') {
        playerContainer.innerHTML = `
          <iframe 
            src="https://www.instagram.com/reel/${reelId}/embed" 
            title="${customer} Instagram Reel" 
            allowtransparency="true" 
            frameborder="0" 
            scrolling="no" 
            allowfullscreen>
          </iframe>
        `;
      } else {
        // Fallback demo reel video
        playerContainer.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:30px;color:#fff;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">📱</div>
            <h3 style="font-size:20px;margin-bottom:8px;">Instagram Reel</h3>
            <p style="font-size:14px;color:#94a3b8;max-width:280px;line-height:1.4;">Paste your Instagram Reel link in <code>data-reel-id="..."</code> to play directly.</p>
          </div>
        `;
      }
    } else if (platform === 'facebook') {
      const videoUrl = card.dataset.videoUrl;
      if (videoUrl && videoUrl !== 'https://www.facebook.com') {
        playerContainer.innerHTML = `
          <iframe 
            src="https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoUrl)}&show_text=false&autoplay=1" 
            title="${customer} Facebook Video" 
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" 
            allowfullscreen>
          </iframe>
        `;
      } else {
        // Fallback demo facebook video
        playerContainer.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:30px;color:#fff;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">👥</div>
            <h3 style="font-size:20px;margin-bottom:8px;">Facebook Video</h3>
            <p style="font-size:14px;color:#94a3b8;max-width:280px;line-height:1.4;">Paste your Facebook Watch link in <code>data-video-url="..."</code> to stream directly.</p>
          </div>
        `;
      }
    }

    videoModal.classList.add('open');
    videoModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeVideoModal() {
    if (!videoModal) return;
    videoModal.classList.remove('open');
    videoModal.setAttribute('aria-hidden', 'true');
    // Clear innerHTML so audio/video stops immediately
    if (playerContainer) playerContainer.innerHTML = '';
    document.body.style.overflow = '';
  }

  // Attach card click handlers via event delegation on #videoGrid
  const videoGrid = document.getElementById('videoGrid');
  if (videoGrid) {
    videoGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.video-card');
      if (card) {
        openVideoModal(card);
      }
    });
  }

  // Modal close triggers
  videoModalClose?.addEventListener('click', closeVideoModal);
  videoModalBackdrop?.addEventListener('click', closeVideoModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && videoModal?.classList.contains('open')) {
      closeVideoModal();
    }
  });
})();
