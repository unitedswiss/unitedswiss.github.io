/* United Securities of Switzerland: scroll story */
(() => {
  'use strict';

  const SVGNS = 'http://www.w3.org/2000/svg';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Fractal 1D noise with linear interpolation: jagged, like rock.
  function makeNoise(rand, octaves = 6) {
    const tables = [];
    for (let o = 0; o < octaves; o++) {
      tables.push(Array.from({ length: (3 << o) + 2 }, () => rand() * 2 - 1));
    }
    return x => {
      let sum = 0, amp = 1, total = 0;
      for (const t of tables) {
        const f = clamp(x) * (t.length - 2);
        const i = Math.floor(f), fr = f - i;
        sum += amp * (t[i] * (1 - fr) + t[i + 1] * fr);
        total += amp; amp *= 0.52;
      }
      return sum / total;
    };
  }

  const el = (tag, attrs = {}, parent) => {
    const node = document.createElementNS(SVGNS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  };

  /* ------------------------------------------------------------------ */
  /* Hero mountain range                                                 */
  /* ------------------------------------------------------------------ */
  const W = 1600, H = 1000, STEP = 6;
  const LAYERS = [
    { seed: 3,  base: 330, rough: 46, body: '#c9dae6', snow: '#edf3f8', snowY: 560, rise: 60,
      peaks: [{ x: .14, h: 220, wl: .16, wr: .2 }, { x: .5, h: 170, wl: .25, wr: .2 }, { x: .84, h: 250, wl: .18, wr: .2 }] },
    { seed: 8,  base: 260, rough: 54, body: '#a8bfd0', snow: '#f4f8fb', snowY: 600, rise: 130,
      peaks: [{ x: .05, h: 210, wl: .1, wr: .16 }, { x: .33, h: 250, wl: .18, wr: .16 }, { x: .74, h: 220, wl: .2, wr: .22 }] },
    { seed: 21, base: 190, rough: 44, body: '#6b8398', snow: '#ffffff', snowY: 560, rise: 220, shade: true,
      peaks: [{ x: .61, h: 540, wl: .1, wr: .14, k: 1.05 }, { x: .24, h: 210, wl: .18, wr: .16 }, { x: .97, h: 230, wl: .16, wr: .1 }] },
    { seed: 34, base: 130, rough: 34, body: '#3f5467', snow: '#e9f0f5', snowY: 800, rise: 400, shade: true,
      peaks: [{ x: .08, h: 190, wl: .14, wr: .18 }, { x: .42, h: 80, wl: .2, wr: .2 }, { x: .9, h: 170, wl: .16, wr: .2 }] },
    { seed: 55, base: 60, rough: 14, body: '#f7fafc', rise: 1000,
      peaks: [{ x: .28, h: 46, wl: .4, wr: .4, k: 2 }, { x: .82, h: 64, wl: .35, wr: .4, k: 2 }] }
  ];

  function ridgeY(layer, noise, x) {
    const u = x / W;
    let h = layer.base;
    for (const p of layer.peaks) {
      const d = u - p.x, w = d < 0 ? p.wl : p.wr;
      const t = 1 - Math.abs(d) / w;
      if (t > 0) h += p.h * Math.pow(t, p.k || 1.4);
    }
    h += noise(u) * layer.rough;
    return H - h;
  }

  function buildRange() {
    const svg = document.getElementById('range');
    if (!svg) return [];
    const defs = el('defs', {}, svg);
    const mist = el('linearGradient', { id: 'mist', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0', 'stop-color': '#f7fafc', 'stop-opacity': 0 }, mist);
    el('stop', { offset: '.55', 'stop-color': '#f7fafc', 'stop-opacity': .35 }, mist);
    el('stop', { offset: '1', 'stop-color': '#f7fafc', 'stop-opacity': .95 }, mist);
    const sun = el('radialGradient', { id: 'sun' }, defs);
    el('stop', { offset: '0', 'stop-color': '#ffffff', 'stop-opacity': .95 }, sun);
    el('stop', { offset: '1', 'stop-color': '#ffffff', 'stop-opacity': 0 }, sun);
    el('circle', { cx: 1180, cy: 260, r: 340, fill: 'url(#sun)' }, svg);

    return LAYERS.map((L, li) => {
      const rand = rng(L.seed);
      const noise = makeNoise(rand);
      const snowNoise = makeNoise(rand, 7);
      const g = el('g', { class: 'layer' }, svg);
      const pts = [];
      for (let x = 0; x <= W; x += STEP) pts.push([x, ridgeY(L, noise, x)]);
      const top = pts.map(([x, y]) => `${x},${y.toFixed(1)}`).join(' L');
      const bodyD = `M0,2200 L${top} L${W},2200 Z`;

      const clipId = `clip${li}`;
      const clip = el('clipPath', { id: clipId }, defs);
      el('path', { d: bodyD }, clip);
      el('path', { d: bodyD, fill: L.body }, g);

      if (L.snow) {
        // Snow cap: from ridge down to a ragged snowline with gullies.
        const lower = pts.map(([x, y]) => {
          const n = snowNoise(x / W);
          const gully = Math.abs(snowNoise((x / W + .37) % 1)) * 160;
          const sy = L.snowY + n * 60 + gully;
          return [x, Math.max(y, sy)];
        }).reverse();
        const d = `M${top} L${lower.map(([x, y]) => `${x},${y.toFixed(1)}`).join(' L')} Z`;
        el('path', { d, fill: L.snow, 'clip-path': `url(#${clipId})` }, g);
      }

      if (L.shade) {
        // Shadowed east faces: a wedge from each apex down-right.
        const sg = el('g', { 'clip-path': `url(#${clipId})`, fill: '#0b1a29', opacity: .14 }, g);
        for (const p of L.peaks) {
          const ax = p.x * W, ay = ridgeY(L, noise, ax);
          const rx = (p.x + p.wr * .95) * W;
          const seg = pts.filter(([x]) => x >= ax && x <= rx).map(([x, y]) => `${x},${y.toFixed(1)}`).join(' L');
          if (!seg) continue;
          el('path', { d: `M${ax},${ay} L${seg} L${(p.x + p.wr * .3) * W},${H + 40} L${ax + 10},${H + 40} Z` }, sg);
        }
      }

      if (li < LAYERS.length - 1) {
        const minY = Math.min(...pts.map(p => p[1]));
        el('rect', { x: 0, y: minY, width: W, height: H - minY + 1200, fill: 'url(#mist)' }, g);
      }
      return { g, rise: L.rise };
    });
  }

  /* ------------------------------------------------------------------ */
  /* Snowflake specimens                                                 */
  /* ------------------------------------------------------------------ */
  function buildFlake(svg, seed) {
    const r = rng(seed), R = 88;
    const segs = [];
    const line = (x1, y1, x2, y2, w) => segs.push({ d: `M${x1.toFixed(2)},${y1.toFixed(2)} L${x2.toFixed(2)},${y2.toFixed(2)}`, w });
    const s60 = Math.sin(Math.PI / 3), c60 = Math.cos(Math.PI / 3);

    line(0, 0, 0, -R, 1.8);
    const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const t = .22 + (i / n) * .66 + r() * .06;
      const y0 = -t * R;
      const len = (1 - t) * R * (.35 + r() * .5);
      for (const s of [1, -1]) {
        const x1 = s * len * s60, y1 = y0 - len * c60;
        line(0, y0, x1, y1, 1.3);
        if (len > 26 && r() > .35) {
          const k = .5, bx = s * len * k * s60, by = y0 - len * k * c60;
          const l2 = len * .35;
          line(bx, by, bx, by - l2, 1);
        }
      }
    }
    const tip = 4 + r() * 6;
    const plate = 10 + r() * 16;

    const root = el('g', {}, svg);
    for (let k = 0; k < 6; k++) {
      const arm = el('g', { transform: `rotate(${k * 60})` }, root);
      for (const sg of segs) el('path', { d: sg.d, 'stroke-width': sg.w }, arm);
      el('polygon', { points: hex(0, -R - tip * .4, tip), 'stroke-width': 1 }, arm);
    }
    el('polygon', { class: 'core', points: hex(0, 0, plate), 'stroke-width': 1.2 }, root);
    el('polygon', { points: hex(0, 0, plate * .5), 'stroke-width': .8 }, root);
  }
  function hex(cx, cy, r) {
    let p = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + i * Math.PI / 3;
      p.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
    }
    return p.join(' ');
  }

  /* ------------------------------------------------------------------ */
  /* Ascent profile                                                      */
  /* ------------------------------------------------------------------ */
  function buildProfile() {
    const svg = document.getElementById('profile');
    if (!svg) return null;
    const lo = 2600, hi = 4700;
    const yOf = alt => 600 - (alt - lo) / (hi - lo) * 560;
    const camps = [
      { x: 150, alt: 2900 },
      { x: 300, alt: 3300 },
      { x: 450, alt: 3750 },
      { x: 590, alt: 4150 },
      { x: 710, alt: 4478 }
    ];
    // Camp labels come from the (translated) step headings.
    const names = [...document.querySelectorAll('.step h3')].map(h => h.textContent.trim());
    const summit = { x: 770, alt: 4634 };
    const r = rng(7);


    const ctrl = [{ x: 30, alt: 2650 }, ...camps, summit];
    const pts = [];
    const campIdx = [];
    ctrl.forEach((c, i) => {
      if (i > 0) {
        const p = ctrl[i - 1];
        for (let j = 1; j < 5; j++) {
          const t = j / 5;
          pts.push([lerp(p.x, c.x, t) + (r() - .5) * 8, yOf(lerp(p.alt, c.alt, t)) + (r() - .35) * 26]);
        }
      }
      pts.push([c.x, yOf(c.alt)]);
      if (i >= 1 && i <= camps.length) campIdx.push(pts.length - 1);
    });

    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const total = cum[cum.length - 1];
    const d = 'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L');
    document.getElementById('profileGhost').setAttribute('d', d);
    const line = document.getElementById('profileLine');
    line.setAttribute('d', d);
    line.style.strokeDasharray = total;
    line.style.strokeDashoffset = total;

    const campsG = document.getElementById('profileCamps');
    const campEls = camps.map((c, i) => {
      const [x, y] = pts[campIdx[i]];
      const g = el('g', { class: 'camp' }, campsG);
      el('circle', { cx: x, cy: y, r: 6 }, g);
      const t = el('text', { x: x + 16, y: y + 22 }, g);
      t.textContent = names[i] || '';
      return g;
    });

    const climber = document.getElementById('climber');
    const at = L => {
      let i = 1;
      while (i < cum.length - 1 && cum[i] < L) i++;
      const t = clamp((L - cum[i - 1]) / (cum[i] - cum[i - 1] || 1));
      return [lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)];
    };
    return { line, total, campLen: campIdx.map(i => cum[i]), campEls, climber, at };
  }

  /* ------------------------------------------------------------------ */
  /* Snow                                                                */
  /* ------------------------------------------------------------------ */
  function Snow(canvas) {
    const ctx = canvas.getContext('2d');
    let w, h, dpr, flakes = [];
    let intensity = 1, target = 1, dark = false, lastY = window.scrollY, wind = 0, t = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp(w * h / 6500, 80, 320));
      while (flakes.length < count) flakes.push(spawn(true));
      flakes.length = count;
    }
    function spawn(anywhere) {
      const z = Math.random();             // depth: 0 far, 1 near
      return {
        x: Math.random() * w, y: anywhere ? Math.random() * h : -10,
        r: .6 + z * z * 3.2, z,
        vy: .25 + z * 1.15, phase: Math.random() * 6.28, amp: .2 + Math.random() * .6,
        k: Math.random()
      };
    }
    function frame() {
      t += .01;
      intensity = lerp(intensity, target, .03);
      const sy = window.scrollY, dy = sy - lastY; lastY = sy;
      wind = lerp(wind, Math.sin(t * .7) * .6 + Math.sin(t * 1.9) * .2, .05);
      ctx.clearRect(0, 0, w, h);
      const n = Math.floor(flakes.length * intensity);
      const rgb = dark ? '255,255,255' : '128,162,192';
      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        f.y += f.vy - dy * (.15 + f.z * .5);
        f.x += wind * (.4 + f.z) + Math.sin(t * 2 + f.phase) * f.amp * .4;
        if (f.y > h + 10) Object.assign(f, spawn(false));
        if (f.y < -20) { f.y = h + 5; }
        if (f.x > w + 10) f.x = -10; else if (f.x < -10) f.x = w + 10;
        if (i >= n) continue;
        const a = (dark ? .35 : .28) + f.z * (dark ? .55 : .42);
        ctx.beginPath();
        ctx.fillStyle = `rgba(${rgb},${a.toFixed(3)})`;
        ctx.arc(f.x, f.y, f.r, 0, 6.283);
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(frame);
    return {
      set(level, isDark) { target = level; dark = isDark; }
    };
  }

  /* ------------------------------------------------------------------ */
  /* Setup                                                               */
  /* ------------------------------------------------------------------ */
  const layers = buildRange();
  document.querySelectorAll('.specimen').forEach(s => buildFlake(s.querySelector('.flake'), +s.dataset.seed));
  const profile = buildProfile();
  const snow = reduced ? null : Snow(document.getElementById('snow'));

  // Statement: split into words (Intl.Segmenter handles scripts without spaces),
  // keeping <em> emphasis from the markup.
  const lang = document.documentElement.lang || 'en';
  const statement = document.getElementById('statement');
  const segmenter = window.Intl && Intl.Segmenter ? new Intl.Segmenter(lang, { granularity: 'word' }) : null;
  const words = [];
  const parts = [...statement.childNodes].map(n => ({ text: n.textContent, em: n.nodeName === 'EM' }));
  statement.textContent = '';
  for (const part of parts) {
    const segs = segmenter
      ? [...segmenter.segment(part.text)].map(s => ({ text: s.segment, word: s.isWordLike }))
      : part.text.split(/(\s+)/).map(t => ({ text: t, word: /\S/.test(t) }));
    for (const seg of segs) {
      const last = words[words.length - 1];
      if (seg.word || !last || /\s/.test(seg.text)) {
        if (/^\s+$/.test(seg.text)) { statement.append(seg.text); continue; }
        const span = document.createElement('span');
        span.className = 'w' + (part.em ? ' em' : '');
        span.textContent = seg.text;
        statement.appendChild(span);
        words.push(span);
      } else {
        last.textContent += seg.text;   // punctuation sticks to the previous word
      }
    }
  }

  // Reveal on view.
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.reveal').forEach(n => io.observe(n));

  const hero = document.querySelector('.hero');
  const heroCopy = document.getElementById('heroCopy');
  const cue = document.getElementById('scrollCue');
  const nav = document.getElementById('nav');
  const altimeter = document.getElementById('altimeter');
  const altValue = document.getElementById('altValue');
    const altMarker = document.getElementById('altMarker');
  const anchors = [...document.querySelectorAll('[data-alt]')];
  const snowSections = [...document.querySelectorAll('[data-snow]')];
  const statementSec = document.querySelector('.statement');
  const varItems = [...document.querySelectorAll('#vars li')];
  const formulaVars = [...document.querySelectorAll('#formula [data-v]')];
  const flakes = [...document.querySelectorAll('.flake')];
  const steps = [...document.querySelectorAll('.step')];
  const summit = document.getElementById('summit');
  const propsSec = document.getElementById('properties');
  const props = [...document.querySelectorAll('.prop')];
  const plates = [...document.querySelectorAll('.plate__view img')];
  const propIndex = [...document.querySelectorAll('.props__index li')];
  let propActive = -1;

  // Figures count up from zero the first time they are seen, keeping any prefix or suffix.
  const counter = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      counter.unobserve(e.target);
      const node = e.target, text = node.textContent, m = text.match(/\d+/);
      if (!m || reduced) continue;
      const to = +m[0], t0 = performance.now(), dur = 1800;
      const tick = now => {
        const p = clamp((now - t0) / dur), k = 1 - Math.pow(1 - p, 4);
        node.textContent = text.slice(0, m.index) + Math.round(to * k) + text.slice(m.index + m[0].length);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: .6 });
  document.querySelectorAll('.prop__stat dd').forEach(n => counter.observe(n));

  const nf = new Intl.NumberFormat(lang + '-u-nu-latn', { maximumFractionDigits: 0 });
  const fmt = n => nf.format(Math.round(n));
  document.querySelectorAll('.altimeter__tick').forEach(t => { t.textContent = fmt(+t.textContent.replace(/\D/g, '')); });

  function update() {
    const vh = window.innerHeight, sy = window.scrollY;
    const focus = vh * .55;

    // Hero: climb above the range; the snowfield rises to meet the page.
    const hp = clamp(sy / (hero.offsetHeight - vh));
    const e = hp * hp * (3 - 2 * hp);
    layers.forEach((l, i) => {
      const k = i === layers.length - 1 ? Math.pow(hp, 2.4) : e;
      l.g.setAttribute('transform', `translate(0 ${(-l.rise * k).toFixed(1)})`);
    });
    heroCopy.style.transform = `translateY(${(-hp * 160).toFixed(1)}px)`;
    heroCopy.style.opacity = clamp(1 - hp * 1.7).toFixed(3);
    cue.style.opacity = clamp(1 - hp * 5).toFixed(3);

    nav.classList.toggle('is-scrolled', sy > hero.offsetHeight - vh * .6);
    altimeter.classList.toggle('is-on', sy > vh * .5);

    // Statement words.
    const sr = statementSec.getBoundingClientRect();
    const sp = clamp(-sr.top / (sr.height - vh) * 1.2);
    const lit = reduced ? words.length : Math.floor(sp * (words.length + 1));
    words.forEach((w, i) => w.classList.toggle('on', i < lit));

    // Method: highlight variables.
    let active = -1;
    varItems.forEach((li, i) => { if (li.getBoundingClientRect().top < vh * .62) active = i; });
    varItems.forEach((li, i) => li.classList.toggle('on', i === active || (active === -1 && i === 0)));
    formulaVars.forEach(v => {
      const i = +v.dataset.v;
      v.classList.toggle('on', i <= active);
      v.classList.toggle('last', i === active);
    });

    // Snowflakes turn slowly as they pass.
    if (!reduced) flakes.forEach(f => {
      const r = f.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const c = (r.top + r.height / 2 - vh / 2) / vh;
      f.style.transform = `rotate(${(c * 40).toFixed(2)}deg) scale(${(1 - Math.abs(c) * .12).toFixed(3)})`;
    });

    // Properties: the plate follows whichever story is under the focus line.
    if (props.length) {
      // Switch when a property's name reaches mid-screen, not when its padding does.
      const line = vh * .5;
      let a = 0, p = 0;
      props.forEach((s, i) => {
        const r = s.getBoundingClientRect(), name = s.querySelector('.prop__name').getBoundingClientRect();
        if (name.top < line) { a = i; p = clamp((line - name.top) / (r.bottom - name.top)); }
      });
      if (a !== propActive) {
        plates.forEach((img, i) => {
          img.classList.toggle('prev', i === propActive);
          img.classList.toggle('on', i === a);
        });
        propIndex.forEach((n, i) => n.classList.toggle('on', i === a));
        propActive = a;
      }
      if (!reduced) plates[a].style.setProperty('--py', `${((.5 - p) * 6).toFixed(2)}%`);
      propIndex.forEach((n, i) => n.style.setProperty('--p', i < a ? 1 : i === a ? p.toFixed(3) : 0));
    }

    // Ascent profile.
    if (profile) {
      const tops = steps.map(s => s.getBoundingClientRect().top);
      let L;
      if (focus < tops[0]) {
        L = profile.campLen[0] * clamp(1 - (tops[0] - focus) / (vh * .7));
      } else {
        let i = 0;
        while (i < tops.length - 1 && tops[i + 1] <= focus) i++;
        const f = i < tops.length - 1 ? clamp((focus - tops[i]) / (tops[i + 1] - tops[i])) : 0;
        L = lerp(profile.campLen[i], profile.campLen[Math.min(i + 1, tops.length - 1)], f * f * (3 - 2 * f));
      }
      profile.line.style.strokeDashoffset = (profile.total - L).toFixed(1);
      const [cx, cy] = profile.at(L);
      profile.climber.setAttribute('cx', cx.toFixed(1));
      profile.climber.setAttribute('cy', cy.toFixed(1));
      steps.forEach((s, i) => {
        const on = tops[i] < focus + 40 && (i === steps.length - 1 || tops[i + 1] > focus + 40);
        s.classList.toggle('on', on);
        profile.campEls[i].classList.toggle('on', profile.campLen[i] <= L + 1);
      });
    }

    // Altimeter: interpolate between altitude anchors.
    const y = sy + focus;
    let alt = +anchors[0].dataset.alt;
    for (let i = 0; i < anchors.length; i++) {
      const a = anchors[i], top = a.getBoundingClientRect().top + sy;
      if (top > y) {
        if (i > 0) {
          const p = anchors[i - 1], pt = p.getBoundingClientRect().top + sy;
          alt = lerp(+p.dataset.alt, +a.dataset.alt, clamp((y - pt) / (top - pt)));
        }
        break;
      }
      alt = +a.dataset.alt;
    }
    altValue.textContent = fmt(alt);
    altMarker.style.bottom = `${((alt - 372) / (4634 - 372) * 100).toFixed(2)}%`;

    // Theme + snow density from the section at the focus line.
    const pr = propsSec.getBoundingClientRect();
    const inProps = pr.top < vh * .4 && pr.bottom > vh * .45;
    const dark = summit.getBoundingClientRect().top < vh * .35 || inProps;
    document.body.classList.toggle('is-dark', dark);
    if (snow) {
      let level = 1;
      for (const s of snowSections) {
        const r = s.getBoundingClientRect();
        if (r.top <= focus && r.bottom > focus) level = +s.dataset.snow;
      }
      snow.set(level, summit.getBoundingClientRect().top < focus || (pr.top < focus && pr.bottom > focus));
    }
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
