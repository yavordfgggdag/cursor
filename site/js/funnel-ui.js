// SCROLL PROGRESS BAR
const progressBar = document.getElementById('scroll-progress');
window.addEventListener('scroll', () => {
  const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100;
  progressBar.style.width = Math.min(pct, 100) + '%';
}, { passive: true });

// SCROLL REVEAL
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.07 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// FAQ ACCORDION
document.querySelectorAll('.faq-q').forEach(q => {
  q.addEventListener('click', () => {
    const isOpen = q.classList.contains('open');
    document.querySelectorAll('.faq-q.open').forEach(other => {
      other.classList.remove('open');
      other.setAttribute('aria-expanded', 'false');
      other.nextElementSibling.style.maxHeight = '0';
    });
    if (!isOpen) {
      q.classList.add('open');
      q.setAttribute('aria-expanded', 'true');
      const body = q.nextElementSibling;
      body.style.maxHeight = body.scrollHeight + 'px';
    }
  });
});

// COUNTDOWN TIMER (persistent)
(function() {
  const KEY = 'butzin_deadline_v1';
  let deadline;
  const stored = localStorage.getItem(KEY);
  if (stored) {
    deadline = new Date(+stored);
    if (deadline < new Date()) {
      deadline = new Date(Date.now() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000);
      localStorage.setItem(KEY, deadline.getTime());
    }
  } else {
    deadline = new Date(Date.now() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000);
    localStorage.setItem(KEY, deadline.getTime());
  }
  const timers = document.querySelectorAll('.timer');
  function tick() {
    const diff = Math.max(0, deadline - Date.now());
    if (diff === 0) {
      timers.forEach(t => t.textContent = '00:00:00');
      return;
    }
    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    timers.forEach(t => t.textContent = h + ':' + m + ':' + s);
  }
  tick();
  setInterval(tick, 1000);
})();

// FLOATING CTA BAR
(function() {
  const bar = document.getElementById('floatingCta');
  const firstOffer = document.querySelector('.offer-box');
  const secondOffer = document.getElementById('order');
  if (!bar || !firstOffer) return;

  let firstVisible = false;
  let secondVisible = false;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.target === firstOffer) firstVisible = e.isIntersecting;
      if (e.target === secondOffer) secondVisible = e.isIntersecting;
    });
    if (firstVisible || secondVisible) {
      bar.classList.remove('show');
    } else {
      if (window.scrollY > 400) bar.classList.add('show');
    }
  }, { threshold: 0.1 });

  obs.observe(firstOffer);
  if (secondOffer) obs.observe(secondOffer);

  window.addEventListener('scroll', () => {
    if (!firstVisible && !secondVisible && window.scrollY > 400) {
      bar.classList.add('show');
    }
  }, { passive: true });
})();
