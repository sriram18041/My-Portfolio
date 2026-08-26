(function () {
  'use strict';

  var root = document.documentElement;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     Scroll progress bar
     --------------------------------------------------------- */
  var progressBar = document.getElementById('scroll-progress');
  function updateProgress() {
    if (!progressBar) return;
    var h = document.documentElement;
    var scrollable = h.scrollHeight - h.clientHeight;
    var pct = scrollable > 0 ? (h.scrollTop / scrollable) * 100 : 0;
    progressBar.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  /* ---------------------------------------------------------
     Stagger index assignment — powers .reveal-stagger delays
     --------------------------------------------------------- */
  document.querySelectorAll('.reveal-stagger').forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) {
      child.style.setProperty('--i', i);
    });
  });

  /* ---------------------------------------------------------
     Typing effect for the hero role line
     --------------------------------------------------------- */
  var heroRole = document.getElementById('hero-role');
  if (heroRole) {
    var fullText = heroRole.textContent.trim();
    if (prefersReducedMotion) {
      heroRole.textContent = fullText;
    } else {
      heroRole.textContent = '';
      var caret = document.createElement('span');
      caret.className = 'caret';
      heroRole.appendChild(caret);
      var i = 0;
      (function typeNext() {
        if (i <= fullText.length) {
          heroRole.textContent = fullText.slice(0, i);
          heroRole.appendChild(caret);
          i++;
          setTimeout(typeNext, 22);
        } else {
          setTimeout(function () { caret.remove(); }, 1400);
        }
      })();
    }
  }

  /* ---------------------------------------------------------
     Theme toggle (light/dark) — persisted, falls back safely
     --------------------------------------------------------- */
  function getStoredTheme() {
    try {
      return localStorage.getItem('portfolio-theme');
    } catch (e) {
      return null;
    }
  }
  function storeTheme(value) {
    try {
      localStorage.setItem('portfolio-theme', value);
    } catch (e) {
      /* storage unavailable — theme just won't persist */
    }
  }

  var initialTheme = getStoredTheme() ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  root.setAttribute('data-theme', initialTheme);

  var themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      storeTheme(next);
    });
  }

  /* ---------------------------------------------------------
     Mobile nav toggle
     --------------------------------------------------------- */
  var navToggle = document.getElementById('nav-toggle');
  var navLinks = document.getElementById('nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { navLinks.classList.remove('open'); });
    });
  }

  /* ---------------------------------------------------------
     Scroll reveal animations (IntersectionObserver)
     --------------------------------------------------------- */
  var revealEls = document.querySelectorAll('.reveal');
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------------------------------------------------------
     Globe widget - revolving globe textured with real coastline
     data, plus an animated global hub network with data-transfer
     pulses (Natural Earth 110m land, downsampled to a dot grid)
     --------------------------------------------------------- */
  (function () {
    var canvas = document.getElementById('globe-canvas');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var wrap = canvas.parentElement;
    var DPR = Math.max(window.devicePixelRatio || 1, 1);
    var W = 0, H = 0, R = 0, CX = 0, CY = 0;
    var colors = {};
    var rafId = null;
    var hasStarted = false;

    function readColors() {
      var cs = getComputedStyle(document.documentElement);
      colors.accent = cs.getPropertyValue('--accent').trim() || '#1F6F52';
      colors.amber = cs.getPropertyValue('--amber').trim() || '#B8720A';
      colors.line = cs.getPropertyValue('--line').trim() || '#E1E4DE';
      colors.faint = cs.getPropertyValue('--ink-faint').trim() || '#8B948E';
      colors.night = cs.getPropertyValue('--ink-soft').trim() || '#5B6660';
    }
    readColors();
    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', function () { setTimeout(readColors, 60); });

    /* Land dots - flat [lat,lon,lat,lon,...] sampled from Natural Earth 110m coastlines */
    var LAND_FLAT = [-53.0,-71.5,-49.5,-75.0,-49.5,-71.5,-49.5,-68.0,-46.0,-71.5,-46.0,-68.0,-46.0,170.0,-42.5,-71.5,-42.5,-68.0,-42.5,-64.5,-42.5,145.5,-42.5,173.5,-39.0,-71.5,-39.0,-68.0,-39.0,-64.5,-39.0,177.0,-35.5,-71.5,-35.5,-68.0,-35.5,-64.5,-35.5,-61.0,-35.5,-57.5,-35.5,138.5,-35.5,142.0,-35.5,145.5,-35.5,149.0,-35.5,173.5,-32.0,-71.5,-32.0,-68.0,-32.0,-64.5,-32.0,-61.0,-32.0,-57.5,-32.0,-54.0,-32.0,19.5,-32.0,23.0,-32.0,26.5,-32.0,117.5,-32.0,121.0,-32.0,124.5,-32.0,128.0,-32.0,135.0,-32.0,138.5,-32.0,142.0,-32.0,145.5,-32.0,149.0,-32.0,152.5,-28.5,-68.0,-28.5,-64.5,-28.5,-61.0,-28.5,-57.5,-28.5,-54.0,-28.5,-50.5,-28.5,19.5,-28.5,23.0,-28.5,26.5,-28.5,30.0,-28.5,117.5,-28.5,121.0,-28.5,124.5,-28.5,128.0,-28.5,131.5,-28.5,135.0,-28.5,138.5,-28.5,142.0,-28.5,145.5,-28.5,149.0,-28.5,152.5,-25.0,-68.0,-25.0,-64.5,-25.0,-61.0,-25.0,-57.5,-25.0,-54.0,-25.0,-50.5,-25.0,16.0,-25.0,19.5,-25.0,23.0,-25.0,26.5,-25.0,30.0,-25.0,33.5,-25.0,114.0,-25.0,117.5,-25.0,121.0,-25.0,124.5,-25.0,128.0,-25.0,131.5,-25.0,135.0,-25.0,138.5,-25.0,142.0,-25.0,145.5,-25.0,149.0,-25.0,152.5,-21.5,-68.0,-21.5,-64.5,-21.5,-61.0,-21.5,-57.5,-21.5,-54.0,-21.5,-50.5,-21.5,-47.0,-21.5,-43.5,-21.5,16.0,-21.5,19.5,-21.5,23.0,-21.5,26.5,-21.5,30.0,-21.5,33.5,-21.5,44.0,-21.5,47.5,-21.5,117.5,-21.5,121.0,-21.5,124.5,-21.5,128.0,-21.5,131.5,-21.5,135.0,-21.5,138.5,-21.5,142.0,-21.5,145.5,-21.5,149.0,-18.0,-68.0,-18.0,-64.5,-18.0,-61.0,-18.0,-57.5,-18.0,-54.0,-18.0,-50.5,-18.0,-47.0,-18.0,-43.5,-18.0,-40.0,-18.0,12.5,-18.0,16.0,-18.0,19.5,-18.0,23.0,-18.0,26.5,-18.0,30.0,-18.0,33.5,-18.0,47.5,-18.0,124.5,-18.0,128.0,-18.0,131.5,-18.0,135.0,-18.0,138.5,-18.0,142.0,-18.0,145.5,-14.5,-75.0,-14.5,-71.5,-14.5,-68.0,-14.5,-64.5,-14.5,-61.0,-14.5,-57.5,-14.5,-54.0,-14.5,-50.5,-14.5,-47.0,-14.5,-43.5,-14.5,-40.0,-14.5,12.5,-14.5,16.0,-14.5,19.5,-14.5,23.0,-14.5,26.5,-14.5,30.0,-14.5,33.5,-14.5,37.0,-14.5,40.5,-14.5,128.0,-14.5,131.5,-14.5,135.0,-14.5,142.0,-11.0,-75.0,-11.0,-71.5,-11.0,-68.0,-11.0,-64.5,-11.0,-61.0,-11.0,-57.5,-11.0,-54.0,-11.0,-50.5,-11.0,-47.0,-11.0,-43.5,-11.0,-40.0,-11.0,16.0,-11.0,19.5,-11.0,23.0,-11.0,26.5,-11.0,30.0,-11.0,33.5,-11.0,37.0,-7.5,-78.5,-7.5,-75.0,-7.5,-71.5,-7.5,-68.0,-7.5,-64.5,-7.5,-61.0,-7.5,-57.5,-7.5,-54.0,-7.5,-50.5,-7.5,-47.0,-7.5,-43.5,-7.5,-40.0,-7.5,-36.5,-7.5,16.0,-7.5,19.5,-7.5,23.0,-7.5,26.5,-7.5,30.0,-7.5,33.5,-7.5,37.0,-7.5,110.5,-7.5,138.5,-7.5,142.0,-7.5,145.5,-4.0,-78.5,-4.0,-75.0,-4.0,-71.5,-4.0,-68.0,-4.0,-64.5,-4.0,-61.0,-4.0,-57.5,-4.0,-54.0,-4.0,-50.5,-4.0,-47.0,-4.0,-43.5,-4.0,-40.0,-4.0,12.5,-4.0,16.0,-4.0,19.5,-4.0,23.0,-4.0,26.5,-4.0,30.0,-4.0,33.5,-4.0,37.0,-4.0,103.5,-4.0,135.0,-4.0,138.5,-4.0,142.0,-0.5,-78.5,-0.5,-75.0,-0.5,-71.5,-0.5,-68.0,-0.5,-64.5,-0.5,-61.0,-0.5,-57.5,-0.5,-54.0,-0.5,-50.5,-0.5,12.5,-0.5,16.0,-0.5,19.5,-0.5,23.0,-0.5,26.5,-0.5,30.0,-0.5,33.5,-0.5,37.0,-0.5,40.5,-0.5,100.0,-0.5,103.5,-0.5,110.5,-0.5,114.0,-0.5,117.5,-0.5,128.0,3.0,-75.0,3.0,-71.5,3.0,-68.0,3.0,-64.5,3.0,-61.0,3.0,-57.5,3.0,-54.0,3.0,12.5,3.0,16.0,3.0,19.5,3.0,23.0,3.0,26.5,3.0,30.0,3.0,33.5,3.0,37.0,3.0,40.5,3.0,44.0,3.0,114.0,6.5,-75.0,6.5,-71.5,6.5,-68.0,6.5,-64.5,6.5,-61.0,6.5,-8.5,6.5,-5.0,6.5,-1.5,6.5,2.0,6.5,5.5,6.5,9.0,6.5,12.5,6.5,16.0,6.5,19.5,6.5,23.0,6.5,26.5,6.5,30.0,6.5,33.5,6.5,37.0,6.5,40.5,6.5,44.0,6.5,47.5,6.5,117.5,6.5,124.5,10.0,-85.5,10.0,-75.0,10.0,-68.0,10.0,-64.5,10.0,-12.0,10.0,-8.5,10.0,-5.0,10.0,-1.5,10.0,2.0,10.0,5.5,10.0,9.0,10.0,12.5,10.0,16.0,10.0,19.5,10.0,23.0,10.0,26.5,10.0,30.0,10.0,33.5,10.0,37.0,10.0,40.5,10.0,44.0,10.0,47.5,10.0,79.0,13.5,-89.0,13.5,-85.5,13.5,-15.5,13.5,-12.0,13.5,-8.5,13.5,-5.0,13.5,-1.5,13.5,2.0,13.5,5.5,13.5,9.0,13.5,12.5,13.5,16.0,13.5,19.5,13.5,23.0,13.5,26.5,13.5,30.0,13.5,33.5,13.5,37.0,13.5,40.5,13.5,44.0,13.5,75.5,13.5,79.0,13.5,100.0,13.5,103.5,13.5,107.0,17.0,-99.5,17.0,-96.0,17.0,-92.5,17.0,-89.0,17.0,-15.5,17.0,-12.0,17.0,-8.5,17.0,-5.0,17.0,-1.5,17.0,2.0,17.0,5.5,17.0,9.0,17.0,12.5,17.0,16.0,17.0,19.5,17.0,23.0,17.0,26.5,17.0,30.0,17.0,33.5,17.0,37.0,17.0,44.0,17.0,47.5,17.0,51.0,17.0,75.5,17.0,79.0,17.0,96.5,17.0,100.0,17.0,103.5,17.0,107.0,17.0,121.0,20.5,-103.0,20.5,-99.5,20.5,-89.0,20.5,-75.0,20.5,-15.5,20.5,-12.0,20.5,-8.5,20.5,-5.0,20.5,-1.5,20.5,2.0,20.5,5.5,20.5,9.0,20.5,12.5,20.5,16.0,20.5,19.5,20.5,23.0,20.5,26.5,20.5,30.0,20.5,33.5,20.5,37.0,20.5,40.5,20.5,44.0,20.5,47.5,20.5,51.0,20.5,54.5,20.5,58.0,20.5,75.5,20.5,79.0,20.5,82.5,20.5,86.0,20.5,93.0,20.5,96.5,20.5,100.0,20.5,103.5,24.0,-110.0,24.0,-106.5,24.0,-103.0,24.0,-99.5,24.0,-15.5,24.0,-12.0,24.0,-8.5,24.0,-5.0,24.0,-1.5,24.0,2.0,24.0,5.5,24.0,9.0,24.0,12.5,24.0,16.0,24.0,19.5,24.0,23.0,24.0,26.5,24.0,30.0,24.0,33.5,24.0,40.5,24.0,44.0,24.0,47.5,24.0,51.0,24.0,54.5,24.0,68.5,24.0,72.0,24.0,75.5,24.0,79.0,24.0,82.5,24.0,86.0,24.0,89.5,24.0,93.0,24.0,96.5,24.0,100.0,24.0,103.5,24.0,107.0,24.0,110.5,24.0,114.0,24.0,117.5,24.0,121.0,27.5,-113.5,27.5,-110.0,27.5,-106.5,27.5,-103.0,27.5,-99.5,27.5,-82.0,27.5,-12.0,27.5,-8.5,27.5,-5.0,27.5,-1.5,27.5,2.0,27.5,5.5,27.5,9.0,27.5,12.5,27.5,16.0,27.5,19.5,27.5,23.0,27.5,26.5,27.5,30.0,27.5,37.0,27.5,40.5,27.5,44.0,27.5,47.5,27.5,54.5,27.5,58.0,27.5,61.5,27.5,65.0,27.5,68.5,27.5,72.0,27.5,75.5,27.5,79.0,27.5,82.5,27.5,86.0,27.5,89.5,27.5,93.0,27.5,96.5,27.5,100.0,27.5,103.5,27.5,107.0,27.5,110.5,27.5,114.0,27.5,117.5,31.0,-110.0,31.0,-106.5,31.0,-103.0,31.0,-99.5,31.0,-96.0,31.0,-92.5,31.0,-89.0,31.0,-85.5,31.0,-82.0,31.0,-8.5,31.0,-5.0,31.0,-1.5,31.0,2.0,31.0,5.5,31.0,9.0,31.0,12.5,31.0,16.0,31.0,23.0,31.0,26.5,31.0,30.0,31.0,37.0,31.0,40.5,31.0,44.0,31.0,47.5,31.0,51.0,31.0,54.5,31.0,58.0,31.0,61.5,31.0,65.0,31.0,68.5,31.0,72.0,31.0,75.5,31.0,79.0,31.0,82.5,31.0,86.0,31.0,89.5,31.0,93.0,31.0,96.5,31.0,100.0,31.0,103.5,31.0,107.0,31.0,110.5,31.0,114.0,31.0,117.5,31.0,121.0,34.5,-117.0,34.5,-113.5,34.5,-110.0,34.5,-106.5,34.5,-103.0,34.5,-99.5,34.5,-96.0,34.5,-92.5,34.5,-89.0,34.5,-85.5,34.5,-82.0,34.5,-78.5,34.5,-5.0,34.5,-1.5,34.5,2.0,34.5,5.5,34.5,9.0,34.5,37.0,34.5,40.5,34.5,44.0,34.5,47.5,34.5,51.0,34.5,54.5,34.5,58.0,34.5,61.5,34.5,65.0,34.5,68.5,34.5,72.0,34.5,75.5,34.5,79.0,34.5,82.5,34.5,86.0,34.5,89.5,34.5,93.0,34.5,96.5,34.5,100.0,34.5,103.5,34.5,107.0,34.5,110.5,34.5,114.0,34.5,117.5,34.5,131.5,38.0,-120.5,38.0,-117.0,38.0,-113.5,38.0,-110.0,38.0,-106.5,38.0,-103.0,38.0,-99.5,38.0,-96.0,38.0,-92.5,38.0,-89.0,38.0,-85.5,38.0,-82.0,38.0,-78.5,38.0,-8.5,38.0,-5.0,38.0,-1.5,38.0,16.0,38.0,23.0,38.0,30.0,38.0,33.5,38.0,37.0,38.0,40.5,38.0,44.0,38.0,47.5,38.0,54.5,38.0,58.0,38.0,61.5,38.0,65.0,38.0,68.5,38.0,72.0,38.0,75.5,38.0,79.0,38.0,82.5,38.0,86.0,38.0,89.5,38.0,93.0,38.0,96.5,38.0,100.0,38.0,103.5,38.0,107.0,38.0,110.5,38.0,114.0,38.0,117.5,38.0,128.0,41.5,-124.0,41.5,-120.5,41.5,-117.0,41.5,-113.5,41.5,-110.0,41.5,-106.5,41.5,-103.0,41.5,-99.5,41.5,-96.0,41.5,-92.5,41.5,-89.0,41.5,-85.5,41.5,-82.0,41.5,-78.5,41.5,-75.0,41.5,-71.5,41.5,-8.5,41.5,-5.0,41.5,-1.5,41.5,2.0,41.5,9.0,41.5,12.5,41.5,19.5,41.5,23.0,41.5,26.5,41.5,33.5,41.5,44.0,41.5,47.5,41.5,54.5,41.5,58.0,41.5,61.5,41.5,65.0,41.5,68.5,41.5,72.0,41.5,75.5,41.5,79.0,41.5,82.5,41.5,86.0,41.5,89.5,41.5,93.0,41.5,96.5,41.5,100.0,41.5,103.5,41.5,107.0,41.5,110.5,41.5,114.0,41.5,117.5,41.5,121.0,41.5,124.5,41.5,128.0,45.0,-120.5,45.0,-117.0,45.0,-113.5,45.0,-110.0,45.0,-106.5,45.0,-103.0,45.0,-99.5,45.0,-96.0,45.0,-92.5,45.0,-89.0,45.0,-85.5,45.0,-82.0,45.0,-78.5,45.0,-75.0,45.0,-71.5,45.0,-68.0,45.0,-64.5,45.0,2.0,45.0,5.5,45.0,9.0,45.0,16.0,45.0,19.5,45.0,23.0,45.0,26.5,45.0,40.5,45.0,44.0,45.0,54.5,45.0,58.0,45.0,61.5,45.0,65.0,45.0,68.5,45.0,72.0,45.0,75.5,45.0,79.0,45.0,82.5,45.0,86.0,45.0,89.5,45.0,93.0,45.0,96.5,45.0,100.0,45.0,103.5,45.0,107.0,45.0,110.5,45.0,114.0,45.0,117.5,45.0,121.0,45.0,124.5,45.0,128.0,45.0,131.5,45.0,135.0,45.0,142.0,48.5,-124.0,48.5,-120.5,48.5,-117.0,48.5,-113.5,48.5,-110.0,48.5,-106.5,48.5,-103.0,48.5,-99.5,48.5,-96.0,48.5,-92.5,48.5,-89.0,48.5,-85.5,48.5,-82.0,48.5,-78.5,48.5,-75.0,48.5,-71.5,48.5,-68.0,48.5,-57.5,48.5,-54.0,48.5,-1.5,48.5,2.0,48.5,5.5,48.5,9.0,48.5,12.5,48.5,16.0,48.5,19.5,48.5,23.0,48.5,26.5,48.5,30.0,48.5,33.5,48.5,37.0,48.5,40.5,48.5,44.0,48.5,47.5,48.5,51.0,48.5,54.5,48.5,58.0,48.5,61.5,48.5,65.0,48.5,68.5,48.5,72.0,48.5,75.5,48.5,79.0,48.5,82.5,48.5,86.0,48.5,89.5,48.5,93.0,48.5,96.5,48.5,100.0,48.5,103.5,48.5,107.0,48.5,110.5,48.5,114.0,48.5,117.5,48.5,121.0,48.5,124.5,48.5,128.0,48.5,131.5,48.5,135.0,48.5,138.5,48.5,142.0,52.0,-127.5,52.0,-124.0,52.0,-120.5,52.0,-117.0,52.0,-113.5,52.0,-110.0,52.0,-106.5,52.0,-103.0,52.0,-99.5,52.0,-96.0,52.0,-92.5,52.0,-89.0,52.0,-85.5,52.0,-82.0,52.0,-78.5,52.0,-75.0,52.0,-71.5,52.0,-68.0,52.0,-64.5,52.0,-61.0,52.0,-57.5,52.0,-8.5,52.0,-5.0,52.0,-1.5,52.0,5.5,52.0,9.0,52.0,12.5,52.0,16.0,52.0,19.5,52.0,23.0,52.0,26.5,52.0,30.0,52.0,33.5,52.0,37.0,52.0,40.5,52.0,44.0,52.0,47.5,52.0,51.0,52.0,54.5,52.0,58.0,52.0,61.5,52.0,65.0,52.0,68.5,52.0,72.0,52.0,75.5,52.0,79.0,52.0,82.5,52.0,86.0,52.0,89.5,52.0,93.0,52.0,96.5,52.0,100.0,52.0,103.5,52.0,107.0,52.0,110.5,52.0,114.0,52.0,117.5,52.0,121.0,52.0,124.5,52.0,128.0,52.0,131.5,52.0,135.0,52.0,138.5,52.0,142.0,55.5,-162.5,55.5,-131.0,55.5,-127.5,55.5,-124.0,55.5,-120.5,55.5,-117.0,55.5,-113.5,55.5,-110.0,55.5,-106.5,55.5,-103.0,55.5,-99.5,55.5,-96.0,55.5,-92.5,55.5,-89.0,55.5,-75.0,55.5,-71.5,55.5,-68.0,55.5,-64.5,55.5,-61.0,55.5,9.0,55.5,12.5,55.5,23.0,55.5,26.5,55.5,30.0,55.5,33.5,55.5,37.0,55.5,40.5,55.5,44.0,55.5,47.5,55.5,51.0,55.5,54.5,55.5,58.0,55.5,61.5,55.5,65.0,55.5,68.5,55.5,72.0,55.5,75.5,55.5,79.0,55.5,82.5,55.5,86.0,55.5,89.5,55.5,93.0,55.5,96.5,55.5,100.0,55.5,103.5,55.5,107.0,55.5,110.5,55.5,114.0,55.5,117.5,55.5,121.0,55.5,124.5,55.5,128.0,55.5,131.5,55.5,135.0,55.5,156.0,55.5,159.5,59.0,-159.0,59.0,-155.5,59.0,-138.0,59.0,-134.5,59.0,-131.0,59.0,-127.5,59.0,-124.0,59.0,-120.5,59.0,-117.0,59.0,-113.5,59.0,-110.0,59.0,-106.5,59.0,-103.0,59.0,-99.5,59.0,-96.0,59.0,-75.0,59.0,-71.5,59.0,-64.5,59.0,9.0,59.0,12.5,59.0,16.0,59.0,26.5,59.0,30.0,59.0,33.5,59.0,37.0,59.0,40.5,59.0,44.0,59.0,47.5,59.0,51.0,59.0,54.5,59.0,58.0,59.0,61.5,59.0,65.0,59.0,68.5,59.0,72.0,59.0,75.5,59.0,79.0,59.0,82.5,59.0,86.0,59.0,89.5,59.0,93.0,59.0,96.5,59.0,100.0,59.0,103.5,59.0,107.0,59.0,110.5,59.0,114.0,59.0,117.5,59.0,121.0,59.0,124.5,59.0,128.0,59.0,131.5,59.0,135.0,59.0,138.5,59.0,142.0,59.0,152.5,62.5,-162.5,62.5,-159.0,62.5,-155.5,62.5,-152.0,62.5,-148.5,62.5,-145.0,62.5,-141.5,62.5,-138.0,62.5,-134.5,62.5,-131.0,62.5,-127.5,62.5,-124.0,62.5,-120.5,62.5,-117.0,62.5,-113.5,62.5,-110.0,62.5,-106.5,62.5,-103.0,62.5,-99.5,62.5,-96.0,62.5,-92.5,62.5,-68.0,62.5,-47.0,62.5,-43.5,62.5,9.0,62.5,12.5,62.5,16.0,62.5,23.0,62.5,26.5,62.5,30.0,62.5,33.5,62.5,37.0,62.5,40.5,62.5,44.0,62.5,47.5,62.5,51.0,62.5,54.5,62.5,58.0,62.5,61.5,62.5,65.0,62.5,68.5,62.5,72.0,62.5,75.5,62.5,79.0,62.5,82.5,62.5,86.0,62.5,89.5,62.5,93.0,62.5,96.5,62.5,100.0,62.5,103.5,62.5,107.0,62.5,110.5,62.5,114.0,62.5,117.5,62.5,121.0,62.5,124.5,62.5,128.0,62.5,131.5,62.5,135.0,62.5,138.5,62.5,142.0,62.5,145.5,62.5,149.0,62.5,152.5,62.5,156.0,62.5,159.5,62.5,163.0,62.5,166.5,62.5,170.0,62.5,173.5,62.5,177.0,66.0,-176.5,66.0,-173.0,66.0,-166.0,66.0,-162.5,66.0,-159.0,66.0,-155.5,66.0,-152.0,66.0,-148.5,66.0,-145.0,66.0,-141.5,66.0,-138.0,66.0,-134.5,66.0,-131.0,66.0,-127.5,66.0,-124.0,66.0,-120.5,66.0,-117.0,66.0,-113.5,66.0,-110.0,66.0,-106.5,66.0,-103.0,66.0,-99.5,66.0,-96.0,66.0,-92.5,66.0,-89.0,66.0,-71.5,66.0,-64.5,66.0,-50.5,66.0,-47.0,66.0,-43.5,66.0,-40.0,66.0,-36.5,66.0,-22.5,66.0,-19.0,66.0,-15.5,66.0,16.0,66.0,19.5,66.0,23.0,66.0,26.5,66.0,30.0,66.0,33.5,66.0,44.0,66.0,47.5,66.0,51.0,66.0,54.5,66.0,58.0,66.0,61.5,66.0,65.0,66.0,68.5,66.0,72.0,66.0,75.5,66.0,79.0,66.0,82.5,66.0,86.0,66.0,89.5,66.0,93.0,66.0,96.5,66.0,100.0,66.0,103.5,66.0,107.0,66.0,110.5,66.0,114.0,66.0,117.5,66.0,121.0,66.0,124.5,66.0,128.0,66.0,131.5,66.0,135.0,66.0,138.5,66.0,142.0,66.0,145.5,66.0,149.0,66.0,152.5,66.0,156.0,66.0,159.5,66.0,163.0,66.0,166.5,66.0,170.0,66.0,173.5,66.0,177.0,69.5,-162.5,69.5,-159.0,69.5,-155.5,69.5,-152.0,69.5,-148.5,69.5,-145.0,69.5,-141.5,69.5,-134.5,69.5,-131.0,69.5,-127.5,69.5,-120.5,69.5,-113.5,69.5,-110.0,69.5,-106.5,69.5,-103.0,69.5,-99.5,69.5,-92.5,69.5,-85.5,69.5,-75.0,69.5,-71.5,69.5,-68.0,69.5,-54.0,69.5,-50.5,69.5,-47.0,69.5,-43.5,69.5,-40.0,69.5,-36.5,69.5,-33.0,69.5,-29.5,69.5,-26.0,69.5,19.5,69.5,23.0,69.5,26.5,69.5,30.0,69.5,61.5,69.5,68.5,69.5,72.0,69.5,75.5,69.5,79.0,69.5,82.5,69.5,86.0,69.5,89.5,69.5,93.0,69.5,96.5,69.5,100.0,69.5,103.5,69.5,107.0,69.5,110.5,69.5,114.0,69.5,117.5,69.5,121.0,69.5,124.5,69.5,128.0,69.5,131.5,69.5,135.0,69.5,138.5,69.5,142.0,69.5,145.5,69.5,149.0,69.5,152.5,69.5,156.0,69.5,159.5,69.5,163.0,69.5,166.5,69.5,173.5,69.5,177.0,73.0,-124.0,73.0,-120.5,73.0,-106.5,73.0,-99.5,73.0,-96.0,73.0,-92.5,73.0,-89.0,73.0,-82.0,73.0,-78.5,73.0,-54.0,73.0,-50.5,73.0,-47.0,73.0,-43.5,73.0,-40.0,73.0,-36.5,73.0,-33.0,73.0,-29.5,73.0,-26.0,73.0,54.5,73.0,82.5,73.0,86.0,73.0,89.5,73.0,93.0,73.0,96.5,73.0,100.0,73.0,103.5,73.0,107.0,73.0,110.5,73.0,114.0,73.0,117.5,73.0,121.0,73.0,124.5,73.0,128.0,76.5,-120.5,76.5,-110.0,76.5,-99.5,76.5,-96.0,76.5,-92.5,76.5,-89.0,76.5,-85.5,76.5,-82.0,76.5,-68.0,76.5,-64.5,76.5,-61.0,76.5,-57.5,76.5,-54.0,76.5,-50.5,76.5,-47.0,76.5,-43.5,76.5,-40.0,76.5,-36.5,76.5,-33.0,76.5,-29.5,76.5,-26.0,76.5,-22.5,76.5,65.0,76.5,68.5,76.5,103.5,76.5,107.0,76.5,110.5];
    var LAND = [];
    for (var li = 0; li < LAND_FLAT.length; li += 2) LAND.push({ lat: LAND_FLAT[li], lon: LAND_FLAT[li + 1] });

    /* Global hub network */
    var HUBS = [
      { lat: 48.85, lon: 2.35, home: true },
      { lat: 49.44, lon: 1.09, home: true },
      { lat: 16.51, lon: 80.63, home: true },
      { lat: 49.61, lon: 6.13 },
      { lat: 51.51, lon: -0.13 },
      { lat: 52.52, lon: 13.40 },
      { lat: 40.71, lon: -74.01 },
      { lat: 37.77, lon: -122.42 },
      { lat: 1.35, lon: 103.82 },
      { lat: 35.68, lon: 139.65 },
      { lat: 25.20, lon: 55.27 },
      { lat: -33.87, lon: 151.21 },
      { lat: -23.55, lon: -46.63 },
      { lat: 43.65, lon: -79.38 }
    ];
    var ARC_PAIRS = [
      [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
      [2, 8], [2, 9], [6, 7], [6, 3], [9, 11],
      [10, 12], [13, 6], [4, 10], [7, 9], [11, 12], [3, 10]
    ];

    function project(latDeg, lonDeg, rotation) {
      var lat = (latDeg * Math.PI) / 180;
      var lon = (lonDeg * Math.PI) / 180 + rotation;
      var x = Math.cos(lat) * Math.sin(lon);
      var y = Math.sin(lat);
      var z = Math.cos(lat) * Math.cos(lon);
      return { x: CX + x * R, y: CY - y * R, z: z };
    }

    function resize() {
      var rect = wrap.getBoundingClientRect();
      W = rect.width; H = rect.width;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      CX = W / 2; CY = H / 2;
      R = Math.min(W, H) / 2 - 16;
    }

    function zAlpha(z, min, max) {
      return min + ((z + 1) / 2) * (max - min);
    }

    function drawGridLine(points) {
      for (var i = 0; i < points.length - 1; i++) {
        var a = points[i], b = points[i + 1];
        var avgZ = (a.z + b.z) / 2;
        ctx.globalAlpha = zAlpha(avgZ, 0.04, 0.22);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    function quadPoint(p0, pc, p2, t) {
      var mt = 1 - t;
      return {
        x: mt * mt * p0.x + 2 * mt * t * pc.x + t * t * p2.x,
        y: mt * mt * p0.y + 2 * mt * t * pc.y + t * t * p2.y
      };
    }

    var LAT_RINGS = [-60, -30, 0, 30, 60];
    var LON_COUNT = 8;
    var RING_SEGMENTS = 48;
    var MERIDIAN_SEGMENTS = 24;

    function draw(rotation, ts) {
      ctx.clearRect(0, 0, W, H);

      var now = new Date();
      var utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
      var sunLon = ((utcH - 12) / 24) * 360;

      ctx.globalAlpha = 0.05;
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = colors.faint;
      ctx.lineWidth = 1;
      LAT_RINGS.forEach(function (latDeg) {
        var pts = [];
        for (var i = 0; i <= RING_SEGMENTS; i++) pts.push(project(latDeg, (i / RING_SEGMENTS) * 360, rotation));
        drawGridLine(pts);
      });
      for (var m = 0; m < LON_COUNT; m++) {
        var lonDeg = (m / LON_COUNT) * 360;
        var pts2 = [];
        for (var j = 0; j <= MERIDIAN_SEGMENTS; j++) pts2.push(project(-90 + (j / MERIDIAN_SEGMENTS) * 180, lonDeg, rotation));
        drawGridLine(pts2);
      }

      for (var k = 0; k < LAND.length; k++) {
        var d = LAND[k];
        var p = project(d.lat, d.lon, rotation);
        if (p.z < -0.06) continue;
        var dayFactor = Math.cos(d.lat * Math.PI / 180) * Math.cos((d.lon - sunLon) * Math.PI / 180);
        var isDay = dayFactor > 0;
        ctx.fillStyle = isDay ? colors.accent : colors.night;
        ctx.globalAlpha = zAlpha(p.z, isDay ? 0.08 : 0.05, isDay ? 0.55 : 0.32);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.05, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      var hubPts = HUBS.map(function (h) { return project(h.lat, h.lon, rotation); });

      ARC_PAIRS.forEach(function (pair, idx) {
        var p0 = hubPts[pair[0]], p2 = hubPts[pair[1]];
        if (p0.z < -0.05 || p2.z < -0.05) return;
        var mx = (p0.x + p2.x) / 2, my = (p0.y + p2.y) / 2;
        var dx = p2.x - p0.x, dy = p2.y - p0.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var nx = -dy / (dist || 1), ny = dx / (dist || 1);
        var bulge = dist * 0.26;
        var away = (mx - CX) * nx + (my - CY) * ny < 0 ? -1 : 1;
        var pc = { x: mx + nx * bulge * away, y: my + ny * bulge * away };

        ctx.globalAlpha = Math.min(p0.z, p2.z, 1) * 0.45 + 0.1;
        ctx.strokeStyle = colors.amber;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.quadraticCurveTo(pc.x, pc.y, p2.x, p2.y);
        ctx.stroke();

        if (!prefersReducedMotion) {
          var t = ((ts / 1500 + idx * 0.27) % 1 + 1) % 1;
          var pkt = quadPoint(p0, pc, p2, t);
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = colors.amber;
          ctx.beginPath();
          ctx.arc(pkt.x, pkt.y, 2.3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      hubPts.forEach(function (p, i) {
        if (p.z < -0.35) return;
        var a = zAlpha(p.z, 0.3, 1);
        var home = HUBS[i].home;
        var pulse = prefersReducedMotion ? 0 : (Math.sin((ts || 0) / 480 + i) + 1) / 2;
        ctx.globalAlpha = a * 0.22;
        ctx.fillStyle = colors.accent;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (home ? 8 : 6) + pulse * 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = a;
        ctx.fillStyle = colors.accent;
        ctx.beginPath();
        ctx.arc(p.x, p.y, home ? 3.4 : 2.3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    var rotation = 0;
    var lastTs = null;
    var ROT_SPEED = 0.00016;

    function loop(ts) {
      if (document.hidden) { rafId = requestAnimationFrame(loop); return; }
      if (lastTs === null) lastTs = ts;
      var dt = ts - lastTs;
      lastTs = ts;
      if (!prefersReducedMotion) rotation += ROT_SPEED * dt;
      draw(rotation, ts);
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (hasStarted) return;
      hasStarted = true;
      resize();
      if (prefersReducedMotion) {
        draw(0.6, 0);
      } else {
        rafId = requestAnimationFrame(loop);
      }
    }

    if ('IntersectionObserver' in window) {
      var widgetObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) start();
        });
      }, { threshold: 0.15 });
      widgetObserver.observe(canvas);
    } else {
      start();
    }

    window.addEventListener('resize', function () {
      if (hasStarted) { resize(); draw(rotation, lastTs || 0); }
    });
  })();

  /* ---------------------------------------------------------
     "See more" expanders (certifications / projects)
     --------------------------------------------------------- */
  function wireExpander(btnId, panelId) {
    var btn = document.getElementById(btnId);
    var panel = document.getElementById(panelId);
    if (!btn || !panel) return;
    btn.addEventListener('click', function () {
      var isOpen = panel.classList.toggle('open');
      btn.classList.toggle('expanded', isOpen);
      btn.querySelector('.btn-label').textContent = isOpen ? 'See less' : 'See more';
      if (isOpen) {
        panel.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
      }
    });
  }
  wireExpander('see-more-certs-btn', 'more-certs');
  wireExpander('see-more-projects-btn', 'more-projects');

  /* ---------------------------------------------------------
     Scrollspy nav (highlights active section)
     --------------------------------------------------------- */
  var sections = document.querySelectorAll('main section[id]');
  var navA = document.querySelectorAll('#nav-links a');
  var navPill = document.getElementById('nav-pill');
  var navLinksEl = document.getElementById('nav-links');

  function movePill(link) {
    if (!navPill || !link || !navLinksEl || window.innerWidth <= 860) {
      if (navPill) navPill.style.opacity = 0;
      return;
    }
    var linkRect = link.getBoundingClientRect();
    var wrapRect = navLinksEl.getBoundingClientRect();
    navPill.style.opacity = 1;
    navPill.style.width = linkRect.width + 'px';
    navPill.style.transform = 'translateX(' + (linkRect.left - wrapRect.left) + 'px)';
  }

  function setActive(id) {
    var activeLink = null;
    navA.forEach(function (a) {
      var isMatch = a.getAttribute('href') === '#' + id;
      a.classList.toggle('active', isMatch);
      if (isMatch) activeLink = a;
    });
    if (activeLink) movePill(activeLink);
  }
  if (sections.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }
  window.addEventListener('resize', function () {
    var current = document.querySelector('#nav-links a.active');
    if (current) movePill(current);
  });

  /* ---------------------------------------------------------
     Footer year
     --------------------------------------------------------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     GitHub live activity feed
     --------------------------------------------------------- */
  (function () {
    var listEl = document.getElementById('gh-repos');
    if (!listEl) return;
    var GH_USER = 'sriram18041';

    function timeAgo(dateStr) {
      var diff = Date.now() - new Date(dateStr).getTime();
      var days = Math.floor(diff / 86400000);
      if (days < 1) return 'today';
      if (days < 30) return days + 'd ago';
      var months = Math.floor(days / 30);
      if (months < 12) return months + 'mo ago';
      return Math.floor(months / 12) + 'y ago';
    }

    fetch('https://api.github.com/users/' + GH_USER + '/repos?sort=updated&per_page=5')
      .then(function (res) { if (!res.ok) throw new Error('bad status'); return res.json(); })
      .then(function (repos) {
        if (!Array.isArray(repos) || repos.length === 0) {
          listEl.innerHTML = '<div class="activity-empty">No public repositories found.</div>';
          return;
        }
        listEl.innerHTML = repos.map(function (r) {
          var lang = r.language ? '<span><span class="lang-dot"></span>' + r.language + '</span>' : '';
          var stars = r.stargazers_count > 0 ? '<span><i class="fa-solid fa-star"></i> ' + r.stargazers_count + '</span>' : '';
          return '<a class="activity-item" href="' + r.html_url + '" target="_blank" rel="noopener">' +
            '<div class="activity-item-title">' + r.name + '</div>' +
            '<div class="activity-item-meta">' + lang + stars + '<span>updated ' + timeAgo(r.updated_at) + '</span></div>' +
            '</a>';
        }).join('');
      })
      .catch(function () {
        listEl.innerHTML = '<div class="activity-empty">Couldn\'t load repositories right now — <a href="https://github.com/' + GH_USER + '" target="_blank" rel="noopener">view on GitHub</a>.</div>';
      });
  })();

  /* ---------------------------------------------------------
     Medium articles feed (via rss2json)
     --------------------------------------------------------- */
  (function () {
    var listEl = document.getElementById('medium-posts');
    if (!listEl) return;
    var FEED_URL = 'https://medium.com/feed/@sriram.sarma042002';
    var API = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(FEED_URL);

    function formatDate(dateStr) {
      var d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    fetch(API)
      .then(function (res) { if (!res.ok) throw new Error('bad status'); return res.json(); })
      .then(function (data) {
        if (data.status !== 'ok' || !data.items || data.items.length === 0) throw new Error('no items');
        listEl.innerHTML = data.items.slice(0, 5).map(function (item) {
          return '<a class="activity-item" href="' + item.link + '" target="_blank" rel="noopener">' +
            '<div class="activity-item-title">' + item.title + '</div>' +
            '<div class="activity-item-meta"><span>' + formatDate(item.pubDate) + '</span></div>' +
            '</a>';
        }).join('');
      })
      .catch(function () {
        listEl.innerHTML = '<div class="activity-empty">Couldn\'t load articles right now — <a href="https://medium.com/@sriram.sarma042002" target="_blank" rel="noopener">read on Medium</a>.</div>';
      });
  })();

  /* ---------------------------------------------------------
     Particle constellation network — Capabilities background
     Drifting particles connect with lines when close together;
     cursor gently repels nearby particles and draws its own
     connections to them.
     --------------------------------------------------------- */
  (function () {
    var canvas = document.getElementById('constellation-canvas');
    if (!canvas || !canvas.getContext) return;
    var section = canvas.closest('section');
    var ctx = canvas.getContext('2d');
    var DPR = Math.max(window.devicePixelRatio || 1, 1);
    var W = 0, H = 0;
    var particles = [];
    var COUNT = 70;
    var LINK_DIST = 130;
    var MOUSE_DIST = 160;
    var colors = {};
    var rafId = null;
    var running = false;
    var mouse = { x: -9999, y: -9999, active: false };

    function readColors() {
      var cs = getComputedStyle(document.documentElement);
      colors.accent = cs.getPropertyValue('--accent').trim() || '#1F6F52';
      colors.faint = cs.getPropertyValue('--ink-faint').trim() || '#8B948E';
    }
    readColors();
    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', function () { setTimeout(readColors, 60); });

    function hexToRgb(hex) {
      var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 31, g: 111, b: 82 };
    }

    function resize() {
      var rect = section.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildParticles();
    }

    function buildParticles() {
      particles = [];
      for (var i = 0; i < COUNT; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25
        });
      }
    }

    function step() {
      particles.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        p.x = Math.min(Math.max(p.x, 0), W);
        p.y = Math.min(Math.max(p.y, 0), H);

        if (mouse.active) {
          var dx = p.x - mouse.x, dy = p.y - mouse.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MOUSE_DIST && dist > 0.01) {
            var force = (1 - dist / MOUSE_DIST) * 0.6;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
          }
        }
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var accentRgb = hexToRgb(colors.accent);

      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var a = particles[i], b = particles[j];
          var dx = a.x - b.x, dy = a.y - b.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            ctx.strokeStyle = 'rgba(' + accentRgb.r + ',' + accentRgb.g + ',' + accentRgb.b + ',' + ((1 - dist / LINK_DIST) * 0.22) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      if (mouse.active) {
        particles.forEach(function (p) {
          var dx = p.x - mouse.x, dy = p.y - mouse.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MOUSE_DIST) {
            ctx.strokeStyle = 'rgba(' + accentRgb.r + ',' + accentRgb.g + ',' + accentRgb.b + ',' + ((1 - dist / MOUSE_DIST) * 0.4) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        });
      }

      ctx.fillStyle = colors.accent;
      particles.forEach(function (p) {
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function loop() {
      if (document.hidden) { rafId = requestAnimationFrame(loop); return; }
      step();
      draw();
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (running) return;
      running = true;
      resize();
      if (prefersReducedMotion) {
        draw();
      } else {
        rafId = requestAnimationFrame(loop);
      }
    }
    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }

    if ('IntersectionObserver' in window) {
      var secObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) start(); else stop();
        });
      }, { threshold: 0.05 });
      secObserver.observe(section);
    } else {
      start();
    }

    canvas.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    });
    canvas.addEventListener('mouseleave', function () { mouse.active = false; });
    canvas.addEventListener('touchmove', function (e) {
      var rect = canvas.getBoundingClientRect();
      var t = e.touches[0];
      mouse.x = t.clientX - rect.left;
      mouse.y = t.clientY - rect.top;
      mouse.active = true;
    }, { passive: true });
    canvas.addEventListener('touchend', function () { mouse.active = false; });

    window.addEventListener('resize', function () { if (running) resize(); });
  })();

  /* ---------------------------------------------------------
     Sitewide EN / FR language toggle
     --------------------------------------------------------- */
  (function () {
    var buttons = document.querySelectorAll('.site-lang-btn');
    if (!buttons.length) return;

    var TRANSLATIONS = {
  "en": {
    "nav_about": "About",
    "nav_capabilities": "Capabilities",
    "nav_education": "Education",
    "nav_experience": "Experience",
    "nav_certifications": "Certifications",
    "nav_projects": "Projects",
    "nav_activity": "Activity",
    "nav_leadership": "Leadership",
    "nav_contact": "Contact",
    "hero_role": "Data Analytics Intern @ EssilorLuxottica · MSc Business Analytics",
    "hero_bio": "I turn messy operational data into decisions — building correction models, automating data pipelines, and translating analysis into a narrative leadership can act on.",
    "hero_cta_work": "View my work",
    "hero_cta_contact": "Get in touch",
    "hero_logos_label": "— Companies I've worked with",
    "globe_caption": "// data flowing worldwide",
    "about_h2": "Hi there — I'm Sriram.",
    "about_p": "I am passionate about solving complex business challenges by implementing robust analytical frameworks and translating data into a clear narrative for strategic action. My approach is built on a foundation of technical problem-solving, which I apply to drive operational efficiency and inform leadership decisions. Looking forward to contributing these skills to forward-thinking business initiatives.",
    "lang_chip_english": "<b>English</b> — C2, Bilingual",
    "lang_chip_hindi": "<b>Hindi</b> — C1, Fluent",
    "lang_chip_french": "<b>French</b> — A2, Actively learning",
    "lang_chip_telugu": "<b>Telugu</b> — Native",
    "cap_h2": "Things I bring to the table",
    "cap_cat_programming": "Programming",
    "cap_cat_database": "Database & Data Management",
    "cap_cat_analytics": "Data Analytics & Visualization",
    "cap_cat_msoffice": "MS Office",
    "cap_cat_devtools": "Development Tools",
    "cap_cat_softskills": "Soft Skills",
    "tag_webdev": "Web Development",
    "tag_mdm": "Master Data Management",
    "tag_azure": "Microsoft Azure",
    "tag_rootcause": "Root-Cause Analysis",
    "tag_pivot": "Pivot Tables",
    "tag_lookups": "Lookups",
    "tag_versioncontrol": "Version Control",
    "tag_analytical": "Analytical",
    "tag_detail": "Detail-Oriented",
    "tag_stakeholder": "Stakeholder Management",
    "tag_organizational": "Organizational",
    "tag_teamwork": "Teamwork",
    "tag_communication": "Communication",
    "tag_adaptability": "Adaptability",
    "edu_h2": "My Education",
    "edu1_title": "MSc Business Analytics (Master 2)",
    "edu1_coursework": "<b>Coursework:</b> Applied Business Analytics, Data Privacy Security & Ethics, Data Driven Business Strategy, Decision Models",
    "edu2_title": "Master's in Management (Master 1)",
    "edu2_coursework": "<b>Coursework:</b> HR Management, Data Analysis & Decision-Making, Innovation Management, Behavioural & Data Science for Finance, Supply Chain Management",
    "edu3_title": "Bachelor of Technology, Computer Science",
    "edu3_coursework": "<b>Coursework:</b> C, Python, Human Computer Interaction, Data Management, Operating Systems",
    "exp_h2": "My Experience",
    "exp1_role": "Database Automation & Data Analytics Intern",
    "exp1_proj1_title": "Optical Lens Defect Reduction using Statistical Modeling",
    "exp1_proj1_b1": "Designed and implemented a Python-based statistical correction model for optical lens manufacturing, reducing the production defect rate by 66% (1.87% to 0.63%) across a batch of over 9,000 pieces.",
    "exp1_proj1_b2": "Benchmarked multiple modeling approaches, including threshold-based rules and k-nearest neighbors, to identify the most accurate and scalable solution, then presented findings to senior management for production adoption.",
    "exp1_proj2_title": "Automated Manufacturing Data Reconciliation Pipeline",
    "exp1_proj2_b1": "Automated data reconciliation between enterprise master data and CAD systems, improving consistency of manufacturing parameters used by engineering teams.",
    "exp1_proj2_b2": "Built a parameterized design table to streamline configuration of laser engraving specifications across multiple product types, reducing manual data entry and cross-team back-and-forth.",
    "exp2_role": "Python Developer Intern",
    "exp2_b1": "Designed and implemented a Python-based payroll management system to automate salary calculations for over 100 employees, significantly reducing manual errors. Integrated robust data validation and processing workflows to enhance accuracy and streamline operations.",
    "exp2_b2": "Utilized data processing techniques to ensure accuracy and reliability in handling large datasets. Created a flexible, robust solution capable of scaling seamlessly to accommodate future growth.",
    "exp2_b3": "Facilitated collaborative meetings and delivered engaging presentations to foster idea-sharing and enhance analytical outcomes, strengthening team synergy and decision-making through clear communication.",
    "exp3_role": "Web Developer Intern",
    "exp3_b1": "Developed a stopwatch and a Tic-tac-toe web application using HTML, CSS, and JavaScript, delivering user-friendly, responsive interfaces.",
    "exp3_b2": "Wrote clean, modular code to ensure maintainability and cross-browser compatibility.",
    "exp3_b3": "Demonstrated strong problem-solving and attention to detail while collaborating to meet project goals efficiently.",
    "exp4_role": "Cloud Engineer Intern",
    "exp4_b1": "Architected secure, scalable, and cost-optimized cloud solutions by leveraging core AWS services (EC2, S3, RDS, DynamoDB) and adhering to the AWS Well-Architected Framework.",
    "exp4_b2": "Implemented robust infrastructure with fault tolerance and high availability to provide smooth performance on various workloads, adopting best practices for security and cost savings.",
    "exp4_b3": "Worked closely with diverse teams, delivered engaging presentations, and showcased strong interpersonal and problem-solving abilities to ensure cloud solutions aligned with business objectives.",
    "cert_h2": "My Certifications",
    "cert_p": "Getting certified is something I enjoy doing. Here are a few that I have already looked into.",
    "cert1_p": "Power BI Desktop Tool, Data Analysis, DAX Functions, BI components, Services, Dashboard, and Architecture",
    "cert2_h4": "AWS Cloud Computing",
    "cert2_p": "AWS Cloud Infrastructure, Elastic Block Storage, AWS Database services, DynamoDB, EC2 Elastic Load Balancing, S3",
    "cert3_h4": "Project Management",
    "cert3_p": "Complex project planning, execution, and closure; identifying and mitigating project risks; team collaboration",
    "cert4_h4": "Programming Essentials in C",
    "cert4_p": "Data Structures, Operators, Functions, Control Structures, Pointers",
    "cert5_h4": "Cyber Security Essentials",
    "cert5_p": "Cyber Attacks, Networking basics, Access Control, Firewalls, System Security",
    "cert6_h4": "Developer Job Simulation",
    "cert6_p": "Infrastructure to the Cloud, Unit Testing, Software Development Lifecycle, Data and Privacy",
    "cert7_h4": "Python Programming",
    "cert7_p": "Object-Oriented Programming, File Handling, Exception Handling, Data Structures, Control Flow",
    "cert8_h4": "Data Analytics with Python",
    "cert8_p": "Data Cleaning and Processing, Data Visualization Techniques, Basics of Machine Learning, Python",
    "cert9_h4": "Data Science",
    "cert9_p": "Fundamentals of Data Science, Big Data, Data Mining, Applications of Data Science",
    "cert10_h4": "Google Technical Support Fundamentals",
    "cert10_p": "Troubleshooting, Customer Support Service, Hardware/Software/Security Basics, Networking Basics",
    "cert11_h4": "Python Data Structures",
    "cert11_p": "Manipulating Strings and Lists, Exception Handling with Data Structures, Algorithms",
    "proj_h2": "My Projects",
    "proj_p": "Here are a few of the projects I've worked on.",
    "p1_title": "Crypto Portfolio Dashboard",
    "p1_desc": "Engineered a centralized data pipeline to automate the tracking of cryptocurrency investments and market sentiment, providing a single source of truth for portfolio performance.",
    "p2_title": "Financial & ESG Analysis of EV Industry Companies",
    "p2_desc": "Analyzed the financial health and ESG performance of leading EV companies. Forecasted trends via linear regression and evaluated ESG risks to provide actionable insights for investors.",
    "p3_title": "Predictive Analytics: Sales Forecasting & Heart Disease Classification",
    "p3_desc": "Applied predictive modeling on time-series and clinical data to forecast sales from TV advertising and diagnose heart disease with 90% accuracy.",
    "p4_title": "Warehouse Design Report — 3-Wheel Forklift System",
    "p4_desc": "Optimized storage capacity, operational efficiency, cost, sustainability, and safety using the Toyota Traigo 80 3-wheel electric forklift system.",
    "p5_title": "TechZone Global HR Business Policy & Plan",
    "p5_desc": "Designed a comprehensive HR framework integrating strategic human capital models, authority structures, and policy codification.",
    "p6_title": "Algorithmic Exploration of Passenger Satisfaction",
    "p6_desc": "Identified service-related variables affecting passenger experience through regression analysis and root-cause investigation.",
    "p7_title": "Business Innovation within La Ferme de Pierrelaye Shop",
    "p7_desc": "Collaborated with a team to identify operational inefficiencies — manual inventory tracking, stockouts, calculation errors — and proposed a cloud-based digital solution to automate processes.",
    "p8_title": "Forecasting Stock Prices using Machine Learning",
    "p8_desc": "Predicted future stock prices and delivered the results directly to investors through a website, without broker involvement.",
    "p9_title": "Sports Shop Management",
    "p9_desc": "An online e-commerce web application for browsing and buying sports products, with add/update/delete product features.",
    "view_github": "View on GitHub",
    "see_more": "See more",
    "activity_eyebrow": "Live",
    "activity_h2": "What I'm working on",
    "activity_p": "Pulled live from GitHub and Medium — updates automatically, no manual edits.",
    "activity_commits": "Recent commits",
    "activity_writing": "Latest writing",
    "loading_repos": "Loading repositories…",
    "loading_articles": "Loading articles…",
    "lead_h2": "Beyond the desk",
    "lead1": "Participated in the HCL Tech hiring process and got selected for the Hands-on specialized training program.",
    "lead2": "Received a letter of recommendation from Infotrixs for outstanding performance and contributions to the team and company.",
    "lead3": "Participated in technical events conducted by colleges and placed in the top 10.",
    "lead4": "Collaborated with Isha Foundation on the 'Cauvery Calling' campaign, planting trees to improve quality of life.",
    "lead5": "Competitive chess player on Chess.com — live rating below.",
    "contact_h2": "Let's talk",
    "contact_p": "If you would like to get in contact with me, or if you have a possible opportunity, please send me a message. I'm excited to network with other professionals in the field, exchange ideas, and explore new prospects.",
    "ph_name": "Name",
    "ph_email": "Email",
    "ph_subject": "Subject",
    "ph_message": "Message",
    "send_message": "Send message",
    "reset_form": "Reset form",
    "rights_reserved": "All rights reserved."
  },
  "fr": {
    "nav_about": "À propos",
    "nav_capabilities": "Compétences",
    "nav_education": "Formation",
    "nav_experience": "Expérience",
    "nav_certifications": "Certifications",
    "nav_projects": "Projets",
    "nav_activity": "Activité",
    "nav_leadership": "Leadership",
    "nav_contact": "Contact",
    "hero_role": "Stagiaire en analyse de données @ EssilorLuxottica · MSc Business Analytics",
    "hero_bio": "Je transforme des données opérationnelles complexes en décisions — en concevant des modèles de correction, en automatisant les pipelines de données, et en traduisant l'analyse en un récit sur lequel la direction peut agir.",
    "hero_cta_work": "Voir mes travaux",
    "hero_cta_contact": "Me contacter",
    "hero_logos_label": "— Entreprises avec lesquelles j'ai travaillé",
    "globe_caption": "// données circulant à travers le monde",
    "about_h2": "Bonjour — je suis Sriram.",
    "about_p": "Je suis passionné par la résolution de défis commerciaux complexes grâce à la mise en œuvre de cadres analytiques rigoureux et à la traduction des données en un récit clair pour l'action stratégique. Mon approche repose sur une base solide de résolution de problèmes techniques, que j'applique pour améliorer l'efficacité opérationnelle et éclairer les décisions de la direction. J'ai hâte de mettre ces compétences au service d'initiatives commerciales innovantes.",
    "lang_chip_english": "<b>Anglais</b> — C2, Bilingue",
    "lang_chip_hindi": "<b>Hindi</b> — C1, Courant",
    "lang_chip_french": "<b>Français</b> — A2, Apprentissage actif",
    "lang_chip_telugu": "<b>Télougou</b> — Langue maternelle",
    "cap_h2": "Ce que j'apporte",
    "cap_cat_programming": "Programmation",
    "cap_cat_database": "Base de données & gestion des données",
    "cap_cat_analytics": "Analyse de données & visualisation",
    "cap_cat_msoffice": "MS Office",
    "cap_cat_devtools": "Outils de développement",
    "cap_cat_softskills": "Compétences comportementales",
    "tag_webdev": "Développement Web",
    "tag_mdm": "Gestion des données de référence",
    "tag_azure": "Microsoft Azure",
    "tag_rootcause": "Analyse des causes profondes",
    "tag_pivot": "Tableaux croisés dynamiques",
    "tag_lookups": "Fonctions de recherche",
    "tag_versioncontrol": "Contrôle de version",
    "tag_analytical": "Esprit analytique",
    "tag_detail": "Rigueur",
    "tag_stakeholder": "Gestion des parties prenantes",
    "tag_organizational": "Sens de l'organisation",
    "tag_teamwork": "Travail d'équipe",
    "tag_communication": "Communication",
    "tag_adaptability": "Adaptabilité",
    "edu_h2": "Ma formation",
    "edu1_title": "MSc Business Analytics (Master 2)",
    "edu1_coursework": "<b>Cursus :</b> Business Analytics appliqué, Sécurité et éthique des données, Stratégie d'entreprise fondée sur les données, Modèles de décision",
    "edu2_title": "Master en Management (Master 1)",
    "edu2_coursework": "<b>Cursus :</b> Gestion des ressources humaines, Analyse de données et prise de décision, Management de l'innovation, Science comportementale et des données pour la finance, Gestion de la chaîne logistique",
    "edu3_title": "Licence en technologie, Informatique",
    "edu3_coursework": "<b>Cursus :</b> C, Python, Interaction homme-machine, Gestion des données, Systèmes d'exploitation",
    "exp_h2": "Mon expérience",
    "exp1_role": "Stagiaire — Automatisation de bases de données & analyse de données",
    "exp1_proj1_title": "Réduction des défauts optiques par modélisation statistique",
    "exp1_proj1_b1": "Conçu et mis en œuvre un modèle de correction statistique en Python pour la fabrication de verres optiques, réduisant le taux de défaut de production de 66 % (de 1,87 % à 0,63 %) sur un lot de plus de 9 000 pièces.",
    "exp1_proj1_b2": "Comparé plusieurs approches de modélisation, dont des règles à seuil et les k plus proches voisins, afin d'identifier la solution la plus précise et la plus évolutive, puis présenté les résultats à la direction pour adoption en production.",
    "exp1_proj2_title": "Pipeline automatisé de réconciliation des données de fabrication",
    "exp1_proj2_b1": "Automatisé la réconciliation des données entre les données de référence de l'entreprise et les systèmes CAO, améliorant la cohérence des paramètres de fabrication utilisés par les équipes d'ingénierie.",
    "exp1_proj2_b2": "Construit une table de conception paramétrée pour simplifier la configuration des spécifications de gravure laser sur plusieurs types de produits, réduisant la saisie manuelle et les allers-retours entre équipes.",
    "exp2_role": "Stagiaire développeur Python",
    "exp2_b1": "Conçu et mis en œuvre un système de gestion de la paie en Python pour automatiser le calcul des salaires de plus de 100 employés, réduisant significativement les erreurs manuelles. Intégré des workflows robustes de validation et de traitement des données pour améliorer la précision et fluidifier les opérations.",
    "exp2_b2": "Utilisé des techniques de traitement de données pour garantir la précision et la fiabilité du traitement de grands ensembles de données. Créé une solution flexible et robuste capable de s'adapter facilement à la croissance future.",
    "exp2_b3": "Animé des réunions collaboratives et présenté des exposés engageants pour favoriser le partage d'idées et améliorer les résultats analytiques, renforçant la synergie d'équipe et la prise de décision grâce à une communication claire.",
    "exp3_role": "Stagiaire développeur Web",
    "exp3_b1": "Développé un chronomètre et une application web de morpion avec HTML, CSS et JavaScript, offrant des interfaces conviviales et réactives.",
    "exp3_b2": "Rédigé un code propre et modulaire pour garantir la maintenabilité et la compatibilité entre navigateurs.",
    "exp3_b3": "Fait preuve d'une forte capacité de résolution de problèmes et d'un grand souci du détail en collaborant pour atteindre efficacement les objectifs du projet.",
    "exp4_role": "Stagiaire ingénieur cloud",
    "exp4_b1": "Conçu des solutions cloud sécurisées, évolutives et optimisées en termes de coûts en exploitant les principaux services AWS (EC2, S3, RDS, DynamoDB) et en respectant le AWS Well-Architected Framework.",
    "exp4_b2": "Mis en œuvre une infrastructure robuste, tolérante aux pannes et hautement disponible pour garantir des performances fluides sur diverses charges de travail, en adoptant les meilleures pratiques de sécurité et d'économie de coûts.",
    "exp4_b3": "Collaboré étroitement avec des équipes variées, présenté des exposés engageants, et démontré de solides capacités interpersonnelles et de résolution de problèmes pour garantir l'alignement des solutions cloud avec les objectifs métier.",
    "cert_h2": "Mes certifications",
    "cert_p": "Obtenir des certifications est quelque chose que j'apprécie particulièrement. En voici quelques-unes que j'ai déjà explorées.",
    "cert1_p": "Outil Power BI Desktop, analyse de données, fonctions DAX, composants BI, services, tableaux de bord et architecture",
    "cert2_h4": "AWS Cloud Computing",
    "cert2_p": "Infrastructure cloud AWS, stockage par blocs élastique, services de bases de données AWS, DynamoDB, équilibrage de charge élastique EC2, S3",
    "cert3_h4": "Gestion de projet",
    "cert3_p": "Planification, exécution et clôture de projets complexes ; identification et atténuation des risques projet ; collaboration en équipe",
    "cert4_h4": "Fondamentaux de la programmation en C",
    "cert4_p": "Structures de données, opérateurs, fonctions, structures de contrôle, pointeurs",
    "cert5_h4": "Fondamentaux de la cybersécurité",
    "cert5_p": "Cyberattaques, bases des réseaux, contrôle d'accès, pare-feu, sécurité des systèmes",
    "cert6_h4": "Simulation d'emploi développeur",
    "cert6_p": "Infrastructure vers le cloud, tests unitaires, cycle de vie du développement logiciel, données et confidentialité",
    "cert7_h4": "Programmation Python",
    "cert7_p": "Programmation orientée objet, gestion de fichiers, gestion des exceptions, structures de données, flux de contrôle",
    "cert8_h4": "Analyse de données avec Python",
    "cert8_p": "Nettoyage et traitement de données, techniques de visualisation de données, bases du machine learning, Python",
    "cert9_h4": "Science des données",
    "cert9_p": "Fondamentaux de la science des données, big data, exploration de données, applications de la science des données",
    "cert10_h4": "Fondamentaux du support technique Google",
    "cert10_p": "Dépannage, service client, bases matériel/logiciel/sécurité, bases des réseaux",
    "cert11_h4": "Structures de données Python",
    "cert11_p": "Manipulation de chaînes et de listes, gestion des exceptions avec les structures de données, algorithmes",
    "proj_h2": "Mes projets",
    "proj_p": "Voici quelques-uns des projets sur lesquels j'ai travaillé.",
    "p1_title": "Tableau de bord de portefeuille crypto",
    "p1_desc": "Conçu un pipeline de données centralisé pour automatiser le suivi des investissements en cryptomonnaies et du sentiment de marché, offrant une source unique et fiable pour la performance du portefeuille.",
    "p2_title": "Analyse financière et ESG des entreprises du secteur des véhicules électriques",
    "p2_desc": "Analysé la santé financière et la performance ESG des principales entreprises de véhicules électriques. Prévu les tendances par régression linéaire et évalué les risques ESG pour fournir des recommandations concrètes aux investisseurs.",
    "p3_title": "Analyse prédictive : prévision des ventes et classification des maladies cardiaques",
    "p3_desc": "Appliqué la modélisation prédictive sur des données temporelles et cliniques pour prévoir les ventes issues de la publicité télévisée et diagnostiquer les maladies cardiaques avec 90 % de précision.",
    "p4_title": "Rapport de conception d'entrepôt — système de chariot élévateur à 3 roues",
    "p4_desc": "Optimisé la capacité de stockage, l'efficacité opérationnelle, les coûts, la durabilité et la sécurité à l'aide du chariot élévateur électrique 3 roues Toyota Traigo 80.",
    "p5_title": "Politique et plan RH de TechZone Global",
    "p5_desc": "Conçu un cadre RH complet intégrant des modèles stratégiques de capital humain, des structures d'autorité et une codification des politiques.",
    "p6_title": "Exploration algorithmique de la satisfaction des passagers",
    "p6_desc": "Identifié les variables liées au service affectant l'expérience passager grâce à une analyse de régression et une investigation des causes profondes.",
    "p7_title": "Innovation commerciale au sein du magasin La Ferme de Pierrelaye",
    "p7_desc": "Collaboré avec une équipe pour identifier les inefficacités opérationnelles — suivi manuel des stocks, ruptures de stock, erreurs de calcul — et proposé une solution numérique basée sur le cloud pour automatiser les processus.",
    "p8_title": "Prévision des cours boursiers par apprentissage automatique",
    "p8_desc": "Prédit les cours boursiers futurs et transmis les résultats directement aux investisseurs via un site web, sans intermédiaire courtier.",
    "p9_title": "Gestion de magasin de sport",
    "p9_desc": "Une application web de commerce électronique pour parcourir et acheter des produits de sport, avec fonctions d'ajout/mise à jour/suppression de produits.",
    "view_github": "Voir sur GitHub",
    "see_more": "Voir plus",
    "activity_eyebrow": "En direct",
    "activity_h2": "Ce sur quoi je travaille",
    "activity_p": "Récupéré en direct depuis GitHub et Medium — mise à jour automatique, aucune modification manuelle.",
    "activity_commits": "Commits récents",
    "activity_writing": "Derniers articles",
    "loading_repos": "Chargement des dépôts…",
    "loading_articles": "Chargement des articles…",
    "lead_h2": "Au-delà du bureau",
    "lead1": "Participé au processus de recrutement de HCL Tech et sélectionné pour le programme de formation spécialisée pratique.",
    "lead2": "Reçu une lettre de recommandation d'Infotrixs pour ses performances exceptionnelles et sa contribution à l'équipe et à l'entreprise.",
    "lead3": "Participé à des événements techniques organisés par des universités et classé parmi les 10 premiers.",
    "lead4": "Collaboré avec la Fondation Isha sur la campagne « Cauvery Calling », en plantant des arbres pour améliorer la qualité de vie.",
    "lead5": "Joueur d'échecs compétitif sur Chess.com — classement en direct ci-dessous.",
    "contact_h2": "Discutons",
    "contact_p": "Si vous souhaitez me contacter, ou si vous avez une opportunité potentielle, n'hésitez pas à m'envoyer un message. Je suis impatient d'échanger avec d'autres professionnels du secteur, de partager des idées et d'explorer de nouvelles perspectives.",
    "ph_name": "Nom",
    "ph_email": "E-mail",
    "ph_subject": "Objet",
    "ph_message": "Message",
    "send_message": "Envoyer le message",
    "reset_form": "Réinitialiser",
    "rights_reserved": "Tous droits réservés."
  }
};

    var STORAGE_KEY = 'site-lang';
    var current = 'en';
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'fr') current = saved;
    } catch (e) {}

    function applyLang(lang) {
      var dict = TRANSLATIONS[lang];
      if (!dict) return;

      document.querySelectorAll('[data-i18n]').forEach(function (el) {
        var key = el.getAttribute('data-i18n');
        if (dict[key] !== undefined) el.textContent = dict[key];
      });
      document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
        var key = el.getAttribute('data-i18n-html');
        if (dict[key] !== undefined) el.innerHTML = dict[key];
      });
      document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
        var key = el.getAttribute('data-i18n-placeholder');
        if (dict[key] !== undefined) el.setAttribute('placeholder', dict[key]);
      });

      document.documentElement.setAttribute('lang', lang);
      buttons.forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-site-lang') === lang);
      });
      current = lang;
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lang = btn.getAttribute('data-site-lang');
        if (lang === current) return;
        applyLang(lang);
      });
    });

    if (current !== 'en') applyLang(current);
  })();


  /* ---------------------------------------------------------
     Live Chess.com rating widget (player ID card)
     --------------------------------------------------------- */
  (function () {
    var body = document.getElementById('chess-card-body');
    if (!body) return;
    var USERNAME = 'sri180401';
    var FORMATS = [
      { key: 'chess_rapid', label: 'Rapid', icon: 'fa-gauge-high' },
      { key: 'chess_blitz', label: 'Blitz', icon: 'fa-bolt' },
      { key: 'chess_bullet', label: 'Bullet', icon: 'fa-rocket' }
    ];

    Promise.all([
      fetch('https://api.chess.com/pub/player/' + USERNAME).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('https://api.chess.com/pub/player/' + USERNAME + '/stats').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (results) {
      var profile = results[0];
      var stats = results[1];
      if (!stats) throw new Error('no stats');

      var tiles = FORMATS
        .filter(function (f) { return stats[f.key] && stats[f.key].last && stats[f.key].last.rating; })
        .map(function (f) {
          var rating = stats[f.key].last.rating;
          return '<div class="chess-stat-tile"><i class="fa-solid ' + f.icon + '"></i><div class="v">' + rating + '</div><div class="l">' + f.label + '</div></div>';
        });
      if (tiles.length === 0) throw new Error('no rated formats');

      var avatarUrl = (profile && profile.avatar) ? profile.avatar : '';
      var avatarHtml = avatarUrl
        ? '<img class="chess-avatar" src="' + avatarUrl + '" alt="" loading="lazy" />'
        : '<div class="chess-avatar" style="display:flex;align-items:center;justify-content:center;color:var(--accent);font-size:20px;"><i class="fa-solid fa-chess-knight"></i></div>';

      body.innerHTML =
        '<div class="chess-card-head">' + avatarHtml +
          '<div>' +
            '<div class="chess-username">' + USERNAME + '</div>' +
            '<a class="chess-link" href="https://www.chess.com/member/' + USERNAME + '" target="_blank" rel="noopener">View on Chess.com <i class="fa-solid fa-arrow-up-right-from-square"></i></a>' +
          '</div>' +
        '</div>' +
        '<div class="chess-stats-grid">' + tiles.join('') + '</div>';
    }).catch(function () {
      body.innerHTML = '<span class="chess-error">Couldn\'t load live Chess.com profile — <a href="https://www.chess.com/member/sri180401" target="_blank" rel="noopener">view profile directly</a>.</span>';
    });
  })();

})();
