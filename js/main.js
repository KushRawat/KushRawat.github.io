// UI layer: loader, smooth scroll, custom cursor, magnetic buttons, tilt
// cards, project grid + filters, video lightbox, reveals, role ticker.

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = window.matchMedia('(hover: none)').matches;

/* ================= project data ================= */
// category: startup | client | ai | challenge | personal
const PROJECTS = [
  {
    title: 'Luna — local desktop AI assistant',
    blurb: 'Desktop AI assistant that runs LLMs fully on-device — no cloud, no API keys. Electron + node-llama-cpp, React renderer. Built at a hackathon.',
    tags: ['Electron', 'node-llama-cpp', 'React', 'TypeScript'],
    cats: ['ai', 'personal'],
    badge: 'AI · on-device',
    media: 'assets/media/luna.jpg',
    video: 'assets/media/luna.mp4',
  },
  {
    title: 'InoCloud — e-Factura platform',
    blurb: 'Compliance-grade e-invoicing SaaS for Romania’s ANAF e-Factura system, built from scratch: invoice state machine with immutable legal snapshots, multi-tenant RBAC, BullMQ workers, and a Python analytics microservice for WooCommerce sync + sales forecasting.',
    tags: ['Express', 'MongoDB', 'Next.js', 'BullMQ', 'Python'],
    cats: ['client'],
    badge: 'InoventX · in development',
    media: 'assets/media/inocloud.jpg',
  },
  {
    title: 'Meest ops portal',
    blurb: 'Parcel-operations portal for logistics company Meest: bulk CSV/XLSX shipment ingestion with heuristic header mapping in 3 languages, reusable import templates, row-level retry, and a Deliveo→Meest webhook sync with encrypted multi-tenant credentials.',
    tags: ['NestJS', 'Next.js 15', 'PostgreSQL', 'Prisma'],
    cats: ['client'],
    badge: 'InoventX client',
    code: 'https://github.com/KushRawat/meest-ops-portal',
  },
  {
    title: 'NBet — promotions & affiliate backend',
    blurb: 'Full backend for an iGaming promotions platform: custom affiliate click-tracking with multi-partner conversion postbacks, cron-based automated bet settlement against live football data, and a gamified coins wallet (lucky wheel, advent calendar, giveaways).',
    tags: ['Express', 'Knex', 'MySQL', 'GitHub Actions', 'PM2'],
    cats: ['client'],
    badge: 'InoventX client',
  },
  {
    title: 'Stazo — backpacker hostel',
    blurb: 'Full website for a traveler & backpacker hostel in Jibhi, Himachal Pradesh — booking flow, experiences, blog.',
    tags: ['Next.js', 'Tailwind'],
    cats: ['client'],
    badge: 'freelance · live',
    media: 'assets/media/stazo.jpg',
    live: 'https://www.stazo.com',
  },
  {
    title: 'HealthBridge Mediwise',
    blurb: 'Migrated the client’s hosting & PHP codebase from cPanel to AWS Lightsail (Docker, DNS cutover, PHP 8 fixes); built schedule-a-meeting and catalog modules.',
    tags: ['AWS Lightsail', 'Docker', 'PHP'],
    cats: ['client'],
    badge: 'freelance · live',
    media: 'assets/media/hbm.jpg',
    live: 'https://healthbridgemediwise.com/',
  },
  {
    title: 'Lookstyle — footwear brand',
    blurb: 'E-commerce/brand website for a footwear label, including the product photoshoot asset pipeline.',
    tags: ['Next.js', 'E-commerce'],
    cats: ['client'],
    badge: 'freelance',
    media: 'assets/media/lookstyle-1.jpg',
    video: 'assets/media/lookstyle-1.mp4',
  },
  {
    title: 'CaseFlow — bulk CSV ingestion',
    blurb: 'Import → validate → fix → submit → track: ops teams upload 50k-row spreadsheets, clean data inline, and create cases reliably. Live on Vercel + Render.',
    tags: ['React', 'Express', 'OpenAPI'],
    cats: ['challenge'],
    badge: 'challenge · live',
    media: 'assets/media/caseflow.jpg',
    video: 'assets/media/caseflow.mp4',
    live: 'https://caseflow-frontend.vercel.app',
    code: 'https://github.com/KushRawat/caseflow',
  },
  {
    title: 'Scrape & Ask',
    blurb: 'Async scrape-and-answer pipeline: BullMQ workers drive Playwright to scrape any URL, an LLM answers questions over the scraped context.',
    tags: ['BullMQ', 'Playwright', 'LLM', 'Drizzle'],
    cats: ['challenge', 'ai'],
    badge: 'challenge · AI',
    media: 'assets/media/scrapeandask.jpg',
    video: 'assets/media/scrapeandask.mp4',
    code: 'https://github.com/KushRawat/scrape-and-ask',
  },
  {
    title: 'TaskSphere — task management',
    blurb: 'Secure task platform: JWT with refresh rotation & revocation, Prisma, Zod validation; Next.js 14 App Router frontend with React Query + Zustand.',
    tags: ['Next.js 14', 'Prisma', 'JWT', 'Zod'],
    cats: ['challenge'],
    badge: 'challenge',
    media: 'assets/media/tasksphere.jpg',
    video: 'assets/media/tasksphere.mp4',
    code: 'https://github.com/KushRawat/task-management-system',
  },
  {
    title: 'SpeakerDrain — speaker cleaner',
    blurb: 'Browser-based phone-speaker cleaner: Web Audio API tone sweeps eject trapped water and dust, no app or backend. Built as a programmatic-SEO product — 18 generated landing pages, FAQ structured data, and an embeddable widget.',
    tags: ['Next.js 16', 'Web Audio API', 'SEO'],
    cats: ['personal'],
    badge: 'indie product',
    media: 'assets/media/speakerdrain.jpg',
  },
  {
    title: 'CardanStock — inventory & alerts',
    blurb: 'Back-office inventory system for the driveshaft repair shop: stock-movement ledger with transactional row locking, transition-only low-stock email alerts, audit logs, and a bilingual RO/EN UI — dependency-free PHP built to run on cheap shared hosting.',
    tags: ['PHP', 'MySQL', 'Security', 'cron'],
    cats: ['client'],
    badge: 'InoventX client',
  },
  {
    title: 'ProjectMate — task management',
    blurb: 'Task tracker with filterable views and an analytics dashboard (team workload, weekly completions) — end-to-end typed with tRPC + Zod, Prisma/PostgreSQL, Supabase auth, deployed serverless on AWS via SST.',
    tags: ['tRPC', 'SST', 'Supabase', 'Prisma'],
    cats: ['personal'],
    badge: 'personal',
    code: 'https://github.com/KushRawat/project-management-app',
  },
  {
    title: 'InoventX — company site',
    blurb: 'Marketing site for InoventX, the Romanian product studio I contract with.',
    tags: ['Next.js'],
    cats: ['client'],
    badge: 'InoventX · live',
    media: 'assets/media/inoventx.jpg',
    live: 'https://inoventx-ro.vercel.app/',
  },
  {
    title: 'Cardan Service — client website',
    blurb: 'Marketing/service website for a Bucharest driveshaft-repair business — services catalog, process walkthrough, and rapid-booking flow.',
    tags: ['Next.js', 'Tailwind'],
    cats: ['client'],
    badge: 'InoventX client',
    media: 'assets/media/cardan.jpg',
  },
  {
    title: 'Ecom — nth-order discounts',
    blurb: 'TypeScript + Express e-commerce service: carts, checkout, every-nth-order discount codes, admin stats surface.',
    tags: ['TypeScript', 'Express'],
    cats: ['challenge'],
    badge: 'challenge',
    media: 'assets/media/ecom.jpg',
    code: 'https://github.com/KushRawat/ecom',
  },
];

/* ================= render grid ================= */
const grid = document.getElementById('projectGrid');

function initials(title) {
  return title.split(/[\s—-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

grid.innerHTML = PROJECTS.map((p, idx) => {
  const media = p.media
    ? `<img src="${p.media}" alt="${p.title} screenshot" loading="lazy" />`
    : `<div class="card__cover c${idx % 4}"><span>${initials(p.title)}</span></div>`;
  const play = p.video
    ? `<button class="card__play" data-video="${p.video}" aria-label="Play ${p.title} walkthrough"><span>▶</span></button>`
    : '';
  const links = [
    p.live ? `<a href="${p.live}" target="_blank" rel="noopener" data-cursor="link">live ↗</a>` : '',
    p.code ? `<a href="${p.code}" target="_blank" rel="noopener" data-cursor="link">code ↗</a>` : '',
    p.video ? `<button data-video="${p.video}" data-cursor="link">▶ walkthrough</button>` : '',
  ].filter(Boolean).join('');
  return `
    <article class="card reveal" data-cats="${p.cats.join(' ')}" data-tilt>
      <div class="card__media">
        <span class="card__badge">${p.badge}</span>
        ${media}
        ${play}
      </div>
      <div class="card__body">
        <h3>${p.title}</h3>
        <p>${p.blurb}</p>
        <div class="tags">${p.tags.map((t) => `<span>${t}</span>`).join('')}</div>
        <div class="card__links">${links}</div>
      </div>
    </article>`;
}).join('');

/* ================= filters ================= */
const chips = document.querySelectorAll('.filters .chip');
chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    chips.forEach((c) => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    const f = chip.dataset.filter;
    document.querySelectorAll('#projectGrid .card').forEach((card) => {
      const show = f === 'all' || card.dataset.cats.split(' ').includes(f);
      card.classList.toggle('is-hidden', !show);
    });
  });
});

/* ================= video lightbox ================= */
const lightbox = document.getElementById('lightbox');
const lightboxVideo = document.getElementById('lightboxVideo');
document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-video]');
  if (trigger) {
    lightboxVideo.src = trigger.dataset.video;
    lightbox.showModal();
    lightboxVideo.play().catch(() => {});
  }
});
function closeLightbox() {
  lightboxVideo.pause();
  lightboxVideo.removeAttribute('src');
  lightboxVideo.load();
  lightbox.close();
}
document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
lightbox.addEventListener('cancel', closeLightbox);

/* ================= nav scroll state ================= */
const nav = document.getElementById('nav');
function onScrollPos(y) { nav.classList.toggle('is-scrolled', y > 40); }
window.addEventListener('scroll', () => onScrollPos(window.scrollY), { passive: true });

/* ================= smooth scroll (Lenis, optional) ================= */
window.__scrollProgress = 0;
function trackNativeProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.__scrollProgress = max > 0 ? window.scrollY / max : 0;
}
window.addEventListener('scroll', trackNativeProgress, { passive: true });

if (!REDUCED && !TOUCH) {
  import('https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.mjs')
    .then(({ default: Lenis }) => {
      // high lerp = close to native scroll with just a hint of glide
      const lenis = new Lenis({ lerp: 0.18, wheelMultiplier: 1.15 });
      lenis.on('scroll', (e) => {
        window.__scrollProgress = e.limit > 0 ? e.scroll / e.limit : 0;
        onScrollPos(e.scroll);
      });
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
      // anchor links through lenis
      document.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
          const target = document.querySelector(a.getAttribute('href'));
          if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -20 }); }
        });
      });
    })
    .catch(() => { /* native scroll is fine */ });
}

/* ================= custom cursor + magnetic ================= */
if (!TOUCH && !REDUCED) {
  document.body.classList.add('has-cursor');
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  const pos = { x: -100, y: -100, rx: -100, ry: -100 };

  window.addEventListener('pointermove', (e) => { pos.x = e.clientX; pos.y = e.clientY; }, { passive: true });

  const INTERACTIVE = 'a, button, [data-cursor], .chip, .card';
  document.addEventListener('pointerover', (e) => {
    if (e.target.closest(INTERACTIVE)) ring.classList.add('is-active');
  });
  document.addEventListener('pointerout', (e) => {
    if (e.target.closest(INTERACTIVE)) ring.classList.remove('is-active');
  });

  (function cursorLoop() {
    pos.rx += (pos.x - pos.rx) * 0.16;
    pos.ry += (pos.y - pos.ry) * 0.16;
    dot.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    ring.style.transform = `translate(${pos.rx}px, ${pos.ry}px)`;
    requestAnimationFrame(cursorLoop);
  })();

  // magnetic buttons
  document.querySelectorAll('.btn, .nav__logo').forEach((el) => {
    const strength = 0.32;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

/* ================= tilt cards ================= */
if (!TOUCH && !REDUCED) {
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    let raf = null;
    card.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${-py * 6}deg) rotateY(${px * 7}deg) translateY(-4px)`;
        raf = null;
      });
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

/* ================= reveal on scroll ================= */
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

/* ================= hero name split ================= */
const heroName = document.getElementById('heroName');
if (heroName) {
  const text = heroName.textContent;
  heroName.innerHTML = [...text].map((ch, i) =>
    ch === ' '
      ? '<span class="sp">&nbsp;</span>'
      : `<span class="ch" style="transition-delay:${0.05 + i * 0.035}s">${ch}</span>`
  ).join('');
}

/* ================= loader ================= */
const loader = document.getElementById('loader');
const loaderCount = document.getElementById('loaderCount');
const loaderBar = document.getElementById('loaderBar');

function finishLoad() {
  document.body.classList.add('is-loaded');
  setTimeout(() => loader.remove(), 900);
}

const seenIntro = sessionStorage.getItem('kr-intro');
if (REDUCED || seenIntro) {
  // returning within the session (e.g. back from the room) — no counter replay
  loader.remove();
  document.body.classList.add('is-loaded');
} else {
  sessionStorage.setItem('kr-intro', '1');
  let n = 0;
  const start = performance.now();
  (function count() {
    // ease towards 100 over ~1.1s
    const t = Math.min(1, (performance.now() - start) / 1100);
    n = Math.floor(100 * (1 - Math.pow(1 - t, 3)));
    loaderCount.textContent = String(n).padStart(3, '0');
    loaderBar.style.transform = `scaleX(${n / 100})`;
    if (t < 1) requestAnimationFrame(count);
    else finishLoad();
  })();
}

/* ================= role ticker ================= */
const ROLES = [
  'Co-founder @ Trivzy',
  'Full-stack engineer',
  'AI-accelerated builder',
  '0 → 1 product shipper',
  'fintech: payments · KYC · recon',
];
const ticker = document.getElementById('roleTicker');
let roleIdx = 0;
const GLYPHS = '!<>-_\\/[]{}—=+*^?#________';
function scrambleTo(el, text) {
  const from = el.textContent;
  const len = Math.max(from.length, text.length);
  let frame = 0;
  const total = 22;
  (function step() {
    let out = '';
    for (let i = 0; i < len; i++) {
      const progress = frame / total;
      if (i < text.length && i / len < progress) out += text[i];
      else if (Math.random() < 0.4) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      else out += from[i] || '';
    }
    el.textContent = out;
    frame++;
    if (frame <= total) requestAnimationFrame(step);
    else el.textContent = text;
  })();
}
if (!REDUCED) {
  setInterval(() => {
    roleIdx = (roleIdx + 1) % ROLES.length;
    scrambleTo(ticker, ROLES[roleIdx]);
  }, 3200);
}

/* ================= portal to the 3D room ================= */
// warp-out: the particle field surges past the camera, UI fades, then navigate
document.querySelectorAll('a[href="room/"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    document.body.classList.add('is-warping');
    let navigated = false;
    const go = () => { if (!navigated) { navigated = true; location.href = 'room/'; } };
    if (window.__warp) {
      window.__warp(go);
      setTimeout(go, 2200); // safety net if the scene stalls
    } else {
      setTimeout(go, 500); // no-WebGL fallback: CSS fade only
    }
  });
});

// prefetch the room's assets while the visitor browses, so the portal is instant
const ROOM_MODELS = [
  'desk', 'chairDesk', 'computerScreen', 'computerKeyboard', 'computerMouse',
  'laptop', 'bookcaseOpen', 'books', 'lampRoundFloor', 'lampSquareTable',
  'loungeSofa', 'tableCoffee', 'rugRounded', 'pottedPlant', 'plantSmall1',
  'plantSmall2', 'televisionModern', 'cabinetTelevision', 'radio', 'speaker',
  'trashcan', 'pillow', 'kitchenCoffeeMachine', 'pillowBlue', 'plantSmall3',
  'rugDoormat', 'speakerSmall',
];
function prefetchRoom() {
  ['room/', 'room/room.css', 'room/room.js',
    ...ROOM_MODELS.map((m) => `room/assets/models/${m}.glb`),
  ].forEach((f) => fetch(f, { priority: 'low' }).catch(() => {}));
}
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => setTimeout(prefetchRoom, 1500));
} else {
  setTimeout(prefetchRoom, 3000);
}

/* ================= portal resilience ================= */
// back/forward-cache restores can bring the page back mid-warp — reset fully
window.addEventListener('pageshow', (e) => {
  document.body.classList.remove('is-warping');
  window.__warpReset?.();
  if (e.persisted) {
    document.getElementById('loader')?.remove();
    document.body.classList.add('is-loaded');
  }
});
// failsafe: never leave the loading counter stuck, whatever the cause
setTimeout(() => {
  if (document.getElementById('loader')) finishLoad();
}, 2600);

/* ================= footer year ================= */
document.getElementById('year').textContent = new Date().getFullYear();
