// RENOVA OFFICE — site behaviour (vanilla JS, no dependencies)
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  // Footer year
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Mobile navigation
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('site-nav');

  function setNav(open) {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setNav(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setNav(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 760) setNav(false);
    });
  }

  // Reveal-on-scroll
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('visible'); });
  }

  // Pop the target section into view when a menu item or button jumps to it
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    var target = document.querySelector(a.getAttribute('href'));
    if (!target || reduceMotion) return;
    var parts = target.querySelectorAll('.reveal');
    parts.forEach(function (el) { el.classList.remove('pop-in'); });
    setTimeout(function () {
      parts.forEach(function (el, i) {
        el.style.animationDelay = (i * 90) + 'ms';
        void el.offsetWidth; // restart the animation
        el.classList.add('pop-in');
      });
    }, 350);
  });

  // Open the contact links in Gmail's compose window (the plain mailto: link stays as a fallback)
  var GMAIL = 'https://mail.google.com/mail/?view=cm&fs=1&to=renovaoffice.support%40gmail.com&su=' +
    encodeURIComponent('Enquiry from the RENOVA OFFICE website');
  document.querySelectorAll('a[data-gmail]').forEach(function (a) {
    a.href = GMAIL;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });

  // Highlight the nav link for the section in view
  var links = document.querySelectorAll('.site-nav a[href^="#"]:not(.btn)');
  var sections = Array.prototype.map.call(links, function (a) {
    return document.querySelector(a.getAttribute('href'));
  });
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { if (s) spy.observe(s); });
  }
})();
