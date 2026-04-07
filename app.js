// ===== STATE =====
let state = {
  logger: [],       // [{type: 'fjell'|'vann', id, bruker, dato, notat, poeng}]
  aktiveTab: 'fjell'
};

let aktivScoreboardFilter = null; // null = alt tid, tall = antall dager
let aktivTurerFilter = null;

let kart = null;
let fjellMarkers = {};
let vannMarkers = {};
let fjellLag = null;
let vannLag = null;
let herErViMarkør = null;

let profilKart = null;
let profilMarker = null;
let profilHerErVi = { lat: 59.47638, lng: 9.01032 }; // Standard: Jønnbu

// ===== NAVIGASJON =====
const PANEL_SEKSJONER = ['profil', 'admin'];
const ALLE_SEKSJONER = ['hero', 'kart', 'fjell-liste', 'vann-liste', 'registrer', 'scoreboard', 'turleder', 'profil', 'admin'];

function navigerTil(id) {
  const seksjonId = id.startsWith('#') ? id.slice(1) : id;

  if (PANEL_SEKSJONER.includes(seksjonId)) {
    // Vis panel, skjul scrollbart innhold
    document.body.classList.add('panel-aktiv');
    PANEL_SEKSJONER.forEach(sid => document.getElementById(sid)?.classList.remove('aktiv-side'));
    document.getElementById(seksjonId)?.classList.add('aktiv-side');
    window.scrollTo(0, 0);
  } else {
    // Skjul paneler, scroll til seksjon
    const varIPanelModus = document.body.classList.contains('panel-aktiv');
    document.body.classList.remove('panel-aktiv');
    PANEL_SEKSJONER.forEach(sid => document.getElementById(sid)?.classList.remove('aktiv-side'));
    const el = document.getElementById(seksjonId);
    if (el) {
      if (varIPanelModus) {
        // Vent til main er synlig, scroll deretter
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 20);
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  history.replaceState(null, '', '#' + seksjonId);

  document.querySelectorAll('.nav-link-item').forEach(a => {
    a.classList.toggle('aktiv', a.getAttribute('href') === '#' + seksjonId);
  });

  // Fiks kartstørrelser etter visning
  setTimeout(() => {
    if (seksjonId === 'kart' && kart) kart.invalidateSize();
    if (seksjonId === 'turleder' && turlederKart) turlederKart.invalidateSize();
    if (seksjonId === 'profil' && profilKart) profilKart.invalidateSize();
    if (seksjonId === 'admin' && adminVelgerKart) adminVelgerKart.invalidateSize();
  }, 50);
}

function byttProfilFane(fane) {
  document.querySelectorAll('.profil-panel-tab').forEach(t =>
    t.classList.toggle('aktiv', t.dataset.ptab === fane));
  document.querySelectorAll('.profil-panel').forEach(p =>
    p.classList.toggle('aktiv', p.dataset.ppanel === fane));
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  lastData();
  initMountain3D();
  populerChipVelgere();
  initKart();
  renderFjellListe();
  renderVannListe();
  renderScoreboard();
  renderMineTurer();
  oppdaterHeroStats();
  renderAdminListe();
  renderWaypoints();
  initTurlederKart();
  bindEvents();

  // Login-sjekk: vis modal eller sett opp bruker
  sjekkInnlogging();
});

// ===== LOCALSTORAGE =====
function lagreData() {
  localStorage.setItem('lifjell_logger', JSON.stringify(state.logger));
}

function lastData() {
  const lagret = localStorage.getItem('lifjell_logger');
  if (lagret) state.logger = JSON.parse(lagret);

  // Legg inn egendefinerte topper
  const egneFjell = JSON.parse(localStorage.getItem('lifjell_egne_fjell') || '[]');
  egneFjell.forEach(f => {
    f.poeng = f.hoyde ? Math.round(f.hoyde / 10) : 20;
    if (!FJELL_DATA.find(x => x.id === f.id)) FJELL_DATA.push(f);
  });

  // Legg inn egendefinerte vann
  const egneVann = JSON.parse(localStorage.getItem('lifjell_egne_vann') || '[]');
  egneVann.forEach(v => {
    if (!VANN_DATA.find(x => x.id === v.id)) VANN_DATA.push(v);
  });

  // Bruk redigeringer på eksisterende
  const fjellEdits = JSON.parse(localStorage.getItem('lifjell_fjell_edits') || '{}');
  FJELL_DATA.forEach(f => { if (fjellEdits[f.id]) Object.assign(f, fjellEdits[f.id]); });

  const vannEdits = JSON.parse(localStorage.getItem('lifjell_vann_edits') || '{}');
  VANN_DATA.forEach(v => { if (vannEdits[v.id]) Object.assign(v, vannEdits[v.id]); });

  // Fjern slettede items
  const slettedeFjell = JSON.parse(localStorage.getItem('lifjell_slettede_fjell') || '[]');
  slettedeFjell.forEach(id => {
    const idx = FJELL_DATA.findIndex(f => f.id === id);
    if (idx !== -1) FJELL_DATA.splice(idx, 1);
  });
  const slettedeVann = JSON.parse(localStorage.getItem('lifjell_slettede_vann') || '[]');
  slettedeVann.forEach(id => {
    const idx = VANN_DATA.findIndex(v => v.id === id);
    if (idx !== -1) VANN_DATA.splice(idx, 1);
  });
}

// ===== CUSTOM DATA LAGRING =====
function lagreEgneFjell(liste) {
  localStorage.setItem('lifjell_egne_fjell', JSON.stringify(liste));
}

function lagreEgneVann(liste) {
  localStorage.setItem('lifjell_egne_vann', JSON.stringify(liste));
}

function hentEgneFjell() {
  return JSON.parse(localStorage.getItem('lifjell_egne_fjell') || '[]');
}

function hentEgneVann() {
  return JSON.parse(localStorage.getItem('lifjell_egne_vann') || '[]');
}

function erEgetFjell(id) {
  return hentEgneFjell().some(f => f.id === id);
}

function erEgetVann(id) {
  return hentEgneVann().some(v => v.id === id);
}

function lagreFjellEdit(id, data) {
  const edits = JSON.parse(localStorage.getItem('lifjell_fjell_edits') || '{}');
  edits[id] = { ...edits[id], ...data };
  localStorage.setItem('lifjell_fjell_edits', JSON.stringify(edits));
}

function lagreVannEdit(id, data) {
  const edits = JSON.parse(localStorage.getItem('lifjell_vann_edits') || '{}');
  edits[id] = { ...edits[id], ...data };
  localStorage.setItem('lifjell_vann_edits', JSON.stringify(edits));
}

// ===== KART =====
function initKart() {
  const grenser = L.latLngBounds(
    L.latLng(59.40, 8.65),
    L.latLng(59.62, 9.12)
  );

  kart = L.map('map', {
    center: [59.515, 8.880],
    zoom: 11,
    zoomControl: true,
    maxBounds: grenser,
    maxBoundsViscosity: 0.9,
    minZoom: 10,
    maxZoom: 16
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(kart);

  fjellLag = L.layerGroup().addTo(kart);
  vannLag = L.layerGroup().addTo(kart);

  // "Her er vi" — Bruk profil-lokasjon om satt, ellers Jønnbu
  leggTilHerErViMarkør();

  FJELL_DATA.forEach(f => leggTilFjellMarkør(f));
  VANN_DATA.forEach(v => leggTilVannMarkør(v));
}

// ===== KART FILTER =====
function toggleFjellLag() {
  const btn = document.getElementById('toggle-fjell');
  if (kart.hasLayer(fjellLag)) {
    kart.removeLayer(fjellLag);
    btn.classList.remove('aktiv');
  } else {
    kart.addLayer(fjellLag);
    btn.classList.add('aktiv');
  }
}

function toggleVannLag() {
  const btn = document.getElementById('toggle-vann');
  if (kart.hasLayer(vannLag)) {
    kart.removeLayer(vannLag);
    btn.classList.remove('aktiv');
  } else {
    kart.addLayer(vannLag);
    btn.classList.add('aktiv');
  }
}

function lagFjellPopup(fjell) {
  const besøkt = erFjellBesøkt(fjell.id);
  const antall = antallBesøkFjell(fjell.id);
  return `
    <div style="font-family: 'Segoe UI', sans-serif; min-width: 220px;">
      ${fjell.bilde ? `<img src="${fjell.bilde}" style="width:100%; height:100px; object-fit:cover; border-radius:6px; margin-bottom:8px;" onerror="this.style.display='none'">` : ''}
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <strong style="font-size:1rem; color:#1a3a2a;">⛰ ${fjell.navn}</strong>
        <span style="background:#1a3a2a; color:white; padding:2px 8px; border-radius:50px; font-size:0.75rem; font-weight:700;">${fjell.hoyde}m</span>
      </div>
      <p style="font-size:0.82rem; color:#666; margin:4px 0 8px;">${fjell.beskrivelse}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
        <span style="color:#4a8c5c;">📍 ${fjell.kommune}</span>
        <span style="color:${besøkt ? '#5ba87a' : '#999'}; font-weight:600;">${besøkt ? `✓ Besøkt ${antall}x` : '○ Ikke besøkt'}</span>
      </div>
      <div style="margin-top:8px; font-size:0.78rem; color:#888;">⭐ ${fjell.poeng} poeng</div>
    </div>
  `;
}

function lagVannPopup(vann) {
  const badet = erVannBadet(vann.id);
  const antall = antallBadVann(vann.id);
  return `
    <div style="font-family: 'Segoe UI', sans-serif; min-width: 200px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <strong style="font-size:1rem; color:#2b6cb0;">🌊 ${vann.navn}</strong>
      </div>
      <p style="font-size:0.82rem; color:#666; margin:4px 0 8px;">${vann.beskrivelse}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
        <span style="color:#2b6cb0;">📍 ${vann.kommune}</span>
        <span style="color:${badet ? '#4299e1' : '#999'}; font-weight:600;">${badet ? `🏊 Badet ${antall}x` : '○ Ikke badet'}</span>
      </div>
      <div style="margin-top:8px; font-size:0.78rem; color:#888;">⭐ ${vann.poeng} poeng</div>
    </div>
  `;
}

// ===== CHIP-VELGER (ny registrer tur) =====
let valgteFjell = []; // array av fjell-IDs
let valdteVann  = []; // array av vann-IDs

function populerChipVelgere() {
  // Sjekk at elementene finnes (registrer-seksjonen)
  const fjellSøk = document.getElementById('reg-fjell-søk');
  const vannSøk  = document.getElementById('reg-vann-søk');
  if (!fjellSøk || !vannSøk) return;

  fjellSøk.addEventListener('input', () => {
    const q = fjellSøk.value.trim().toLowerCase();
    const forslag = document.getElementById('reg-fjell-forslag');
    if (!q) { forslag.classList.remove('synlig'); return; }
    const treff = [...FJELL_DATA].sort((a, b) => (b.hoyde || 0) - (a.hoyde || 0))
      .filter(f => f.navn.toLowerCase().includes(q)).slice(0, 8);
    forslag.innerHTML = treff.map(f => {
      const valgt = valgteFjell.includes(f.id);
      return `<div class="chip-forslag-item ${valgt ? 'valgt' : ''}" onmousedown="${valgt ? 'event.preventDefault()' : `event.preventDefault();leggTilFjellChip(${f.id})`}">
        <span>${f.navn}${f.hoyde ? ` (${f.hoyde}m)` : ''}</span>
        <span class="chip-poeng">${valgt ? '✓' : `⭐ ${f.poeng}p`}</span>
      </div>`;
    }).join('') || '<div class="chip-forslag-item" style="color:var(--tekst-dim);">Ingen treff</div>';
    forslag.classList.add('synlig');
  });

  vannSøk.addEventListener('input', () => {
    const q = vannSøk.value.trim().toLowerCase();
    const forslag = document.getElementById('reg-vann-forslag');
    if (!q) { forslag.classList.remove('synlig'); return; }
    const treff = VANN_DATA.filter(v => v.navn.toLowerCase().includes(q)).slice(0, 8);
    forslag.innerHTML = treff.map(v => {
      const valgt = valdteVann.includes(v.id);
      return `<div class="chip-forslag-item ${valgt ? 'valgt' : ''}" onmousedown="${valgt ? 'event.preventDefault()' : `event.preventDefault();leggTilVannChip(${v.id})`}">
        <span>${v.navn}</span>
        <span class="chip-poeng">${valgt ? '✓' : `⭐ ${v.poeng}p`}</span>
      </div>`;
    }).join('') || '<div class="chip-forslag-item" style="color:var(--tekst-dim);">Ingen treff</div>';
    forslag.classList.add('synlig');
  });

  // Lukk forslag ved klikk utenfor
  document.addEventListener('click', e => {
    if (!e.target.closest('.chip-søk-wrapper')) {
      document.querySelectorAll('.chip-forslag').forEach(f => f.classList.remove('synlig'));
    }
  });
}

function leggTilFjellChip(id) {
  if (valgteFjell.includes(id)) return;
  valgteFjell.push(id);
  renderChips();
  const søk = document.getElementById('reg-fjell-søk');
  if (søk) { søk.value = ''; søk.dispatchEvent(new Event('input')); }
}

function fjernFjellChip(id) {
  valgteFjell = valgteFjell.filter(x => x !== id);
  renderChips();
}

function leggTilVannChip(id) {
  if (valdteVann.includes(id)) return;
  valdteVann.push(id);
  renderChips();
  const søk = document.getElementById('reg-vann-søk');
  if (søk) { søk.value = ''; søk.dispatchEvent(new Event('input')); }
}

function fjernVannChip(id) {
  valdteVann = valdteVann.filter(x => x !== id);
  renderChips();
}

function renderChips() {
  const fjellContainer = document.getElementById('reg-fjell-valgte');
  const vannContainer  = document.getElementById('reg-vann-valgte');
  if (fjellContainer) {
    fjellContainer.innerHTML = valgteFjell.map(id => {
      const f = FJELL_DATA.find(x => x.id === id);
      return f ? `<div class="venn-chip">
        <span>⛰ ${f.navn}</span>
        <button type="button" onclick="fjernFjellChip(${id})">×</button>
      </div>` : '';
    }).join('');
  }
  if (vannContainer) {
    vannContainer.innerHTML = valdteVann.map(id => {
      const v = VANN_DATA.find(x => x.id === id);
      return v ? `<div class="venn-chip" style="background:var(--vann-bg);border-color:rgba(44,110,138,0.25);color:var(--vann);">
        <span>🌊 ${v.navn}</span>
        <button type="button" onclick="fjernVannChip(${id})">×</button>
      </div>` : '';
    }).join('');
  }
}

// Populer admin-selecter (waypoints mm.)
function populerSelects() {
  // Brukes nå kun for waypoints i turleder — chip-velger håndterer registrering
}

// ===== FJELL LISTE =====
let fjellVis = 6;

function renderFjellListe(filter = '') {
  const container = document.getElementById('fjell-grid');
  if (!container) return;

  const sortert = [...FJELL_DATA].sort((a, b) => (b.hoyde || 0) - (a.hoyde || 0));
  const filtrert = filter
    ? sortert.filter(f => f.navn.toLowerCase().includes(filter.toLowerCase()) ||
                          f.kommune.toLowerCase().includes(filter.toLowerCase()))
    : sortert;

  // Reset vis-count when filtering
  const visDette = filter ? filtrert.length : Math.min(fjellVis, filtrert.length);

  container.innerHTML = filtrert.slice(0, visDette).map((fjell) => {
    const besøkt = erFjellBesøkt(fjell.id);
    const rang = sortert.findIndex(f => f.id === fjell.id) + 1;

    return `
    <div class="fjell-card" data-fjell-id="${fjell.id}" onclick="visPåKart('fjell',${fjell.id})" style="cursor:pointer;">
      <div class="fjell-card-img">
        ${fjell.bilde
          ? `<img src="${fjell.bilde}" alt="${fjell.navn}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\'placeholder-img\'>⛰️</div>'">`
          : '<div class="placeholder-img">⛰️</div>'}
        <div class="hoyde-badge">⬆ ${fjell.hoyde}m</div>
        <div class="rank-badge ${rang === 1 ? '' : rang === 2 ? 'rank-2' : rang === 3 ? 'rank-3' : 'rank-other'}">#${rang}</div>
        ${besøkt ? '<div class="besøkt-overlay">✓</div>' : ''}
      </div>
      <div class="fjell-card-body">
        <div class="fjell-navn">${fjell.navn}</div>
        <div class="fjell-meta">
          <span>📍 ${fjell.kommune}</span>
          <span>🧭 ${fjell.hoyde} moh</span>
        </div>
        <div class="fjell-desc">${fjell.beskrivelse}</div>
        <div class="fjell-card-footer">
          <span class="poeng-chip">⭐ ${fjell.poeng} poeng</span>
          <button class="btn-sm ${besøkt ? 'besøkt' : ''}"
            onclick="event.stopPropagation();${besøkt ? '' : `åpneRegistrerFjell(${fjell.id})`}"
            ${besøkt ? 'disabled title="Allerede registrert"' : ''}>
            ${besøkt ? '✓ Besøkt' : '+ Registrer'}
          </button>
        </div>
      </div>
    </div>`;
  }).join('');

  // "Se flere" / "Skjul" knapp
  let btn = document.getElementById('fjell-se-fler-btn');
  if (!btn) {
    btn = document.createElement('div');
    btn.id = 'fjell-se-fler-btn';
    btn.className = 'se-fler-wrapper';
    container.parentElement.appendChild(btn);
  }
  if (!filter && filtrert.length > 6) {
    const skjult = filtrert.length - visDette;
    if (skjult > 0) {
      btn.innerHTML = `<button class="btn btn-secondary se-fler-btn" onclick="visFlerefjell()">Se ${skjult} flere fjell ▼</button>`;
    } else {
      btn.innerHTML = `<button class="btn btn-secondary se-fler-btn" onclick="skjulFjell()">Skjul ▲</button>`;
    }
    btn.style.display = '';
  } else {
    btn.style.display = 'none';
  }
}

function visFlerefjell() {
  fjellVis = FJELL_DATA.length;
  renderFjellListe(document.getElementById('fjell-filter')?.value || '');
}

function skjulFjell() {
  fjellVis = 6;
  renderFjellListe(document.getElementById('fjell-filter')?.value || '');
  window.scrollTo({ top: 0 });
}

// ===== VANN LISTE =====
let vannVis = 6;

function renderVannListe() {
  const container = document.getElementById('vann-grid');
  if (!container) return;

  const data = VANN_DATA;
  const visDette = Math.min(vannVis, data.length);

  container.innerHTML = data.slice(0, visDette).map(vann => {
    const badet = erVannBadet(vann.id);
    return `
    <div class="vann-card" onclick="visPåKart('vann',${vann.id})" style="cursor:pointer;">
      <div class="vann-icon">🏊</div>
      <div class="vann-navn">${vann.navn}</div>
      <div class="vann-meta">📍 ${vann.kommune}</div>
      <div class="vann-desc">${vann.beskrivelse}</div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        ${badet
          ? '<span class="badet-chip">🌊 Badet her!</span>'
          : `<span class="poeng-chip vann-poeng">⭐ ${vann.poeng} poeng</span>`}
        <button class="btn-sm ${badet ? 'badet' : 'vann-btn'}"
          onclick="event.stopPropagation();${badet ? '' : `åpneRegistrerVann(${vann.id})`}"
          ${badet ? 'disabled' : ''}>
          ${badet ? '✓ Badet' : '+ Registrer'}
        </button>
      </div>
    </div>`;
  }).join('');

  // "Se flere" / "Skjul" knapp
  let btn = document.getElementById('vann-se-fler-btn');
  if (!btn) {
    btn = document.createElement('div');
    btn.id = 'vann-se-fler-btn';
    btn.className = 'se-fler-wrapper';
    container.parentElement.appendChild(btn);
  }
  if (data.length > 6) {
    const skjult = data.length - visDette;
    if (skjult > 0) {
      btn.innerHTML = `<button class="btn btn-secondary se-fler-btn" onclick="visFlereVann()">Se ${skjult} flere badesteder ▼</button>`;
    } else {
      btn.innerHTML = `<button class="btn btn-secondary se-fler-btn" onclick="skjulVann()">Skjul ▲</button>`;
    }
    btn.style.display = '';
  } else {
    btn.style.display = 'none';
  }
}

function visFlereVann() {
  vannVis = VANN_DATA.length;
  renderVannListe();
}

function skjulVann() {
  vannVis = 6;
  renderVannListe();
  window.scrollTo({ top: 0 });
}

// ===== SCOREBOARD =====
function renderScoreboard() {
  renderFjellScoreboard();
  renderVannScoreboard();
  renderHytteScoreboard();
}

function settScoreboardFilter(dager) {
  aktivScoreboardFilter = dager ? parseInt(dager) : null;
  document.querySelectorAll('#scoreboard-filter .tidsfilter-btn').forEach(btn =>
    btn.classList.toggle('aktiv', btn.dataset.dager === String(dager || '')));
  renderScoreboard();
}

function settTurerFilter(dager) {
  aktivTurerFilter = dager ? parseInt(dager) : null;
  document.querySelectorAll('#turer-filter .tidsfilter-btn').forEach(btn =>
    btn.classList.toggle('aktiv', btn.dataset.dager === String(dager || '')));
  renderMineTurer();
}

// Hjelp: finn hytte for bruker fra brukerlista
function hytteTilBruker(brukerNavn) {
  return hentBrukere().find(b => b.navn === brukerNavn)?.hytte || '';
}

function lagScoreAvatar(brukerNavn) {
  const bruker = hentBrukere().find(b => b.navn === brukerNavn);
  if (bruker?.bilde) {
    return `<div class="score-avatar"><img src="${bruker.bilde}" alt="${brukerNavn}"></div>`;
  }
  const initial = brukerNavn.charAt(0).toUpperCase();
  return `<div class="score-avatar">${initial}</div>`;
}

function renderFjellScoreboard() {
  const container = document.getElementById('fjell-scoreboard');
  if (!container) return;

  const poengPerBruker = {};
  const logger = filtrerLoggerPåTid(state.logger, aktivScoreboardFilter);

  logger.forEach(l => {
    if (l.type === 'fjell') {
      const fjell = FJELL_DATA.find(f => f.id === l.id);
      if (!fjell) return;
      if (!poengPerBruker[l.bruker]) poengPerBruker[l.bruker] = { poeng: 0, fjell: new Set() };
      if (!poengPerBruker[l.bruker].fjell.has(l.id)) {
        poengPerBruker[l.bruker].fjell.add(l.id);
        poengPerBruker[l.bruker].poeng += fjell.poeng;
      }
    } else if (l.type === 'tur' && l.fjell?.length) {
      if (!poengPerBruker[l.bruker]) poengPerBruker[l.bruker] = { poeng: 0, fjell: new Set() };
      l.fjell.forEach(id => {
        const fjell = FJELL_DATA.find(f => f.id === id);
        if (fjell && !poengPerBruker[l.bruker].fjell.has(id)) {
          poengPerBruker[l.bruker].fjell.add(id);
          poengPerBruker[l.bruker].poeng += fjell.poeng;
        }
      });
    }
  });

  const sorted = Object.entries(poengPerBruker).sort((a, b) => b[1].poeng - a[1].poeng);

  if (sorted.length === 0) {
    container.innerHTML = '<li class="tom-melding">Ingen registrerte fjellbesøk ennå.<br>Vær den første! 🏔️</li>';
    return;
  }

  container.innerHTML = sorted.map(([navn, data], idx) => {
    const hytte = hytteTilBruker(navn);
    const medalje = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1;
    return `
    <li class="score-item">
      <div class="score-rank ${idx < 3 ? `pos-${idx+1}` : ''}">${medalje}</div>
      ${lagScoreAvatar(navn)}
      <div class="score-info">
        <div class="score-navn">${navn}</div>
        ${hytte ? `<div class="score-hytte">🏠 ${hytte}</div>` : ''}
        <div class="score-detaljer">⛰ ${data.fjell.size} fjell</div>
      </div>
      <div class="score-poeng">${data.poeng}p</div>
    </li>`;
  }).join('');
}

function renderVannScoreboard() {
  const container = document.getElementById('vann-scoreboard');
  if (!container) return;

  const poengPerBruker = {};
  const logger = filtrerLoggerPåTid(state.logger, aktivScoreboardFilter);

  logger.forEach(l => {
    if (l.type === 'vann') {
      const vann = VANN_DATA.find(v => v.id === l.id);
      if (!vann) return;
      if (!poengPerBruker[l.bruker]) poengPerBruker[l.bruker] = { poeng: 0, vann: new Set() };
      if (!poengPerBruker[l.bruker].vann.has(l.id)) {
        poengPerBruker[l.bruker].vann.add(l.id);
        poengPerBruker[l.bruker].poeng += vann.poeng;
      }
    } else if (l.type === 'tur' && l.vann?.length) {
      if (!poengPerBruker[l.bruker]) poengPerBruker[l.bruker] = { poeng: 0, vann: new Set() };
      l.vann.forEach(id => {
        const vann = VANN_DATA.find(v => v.id === id);
        if (vann && !poengPerBruker[l.bruker].vann.has(id)) {
          poengPerBruker[l.bruker].vann.add(id);
          poengPerBruker[l.bruker].poeng += vann.poeng;
        }
      });
    }
  });

  const sorted = Object.entries(poengPerBruker).sort((a, b) => b[1].poeng - a[1].poeng);

  if (sorted.length === 0) {
    container.innerHTML = '<li class="tom-melding">Ingen registrerte bad ennå.<br>Hopp i vannet! 🏊</li>';
    return;
  }

  container.innerHTML = sorted.map(([navn, data], idx) => {
    const hytte = hytteTilBruker(navn);
    const medalje = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1;
    return `
    <li class="score-item">
      <div class="score-rank ${idx < 3 ? `pos-${idx+1}` : ''}">${medalje}</div>
      ${lagScoreAvatar(navn)}
      <div class="score-info">
        <div class="score-navn">${navn}</div>
        ${hytte ? `<div class="score-hytte">🏠 ${hytte}</div>` : ''}
        <div class="score-detaljer">🌊 ${data.vann.size} vann</div>
      </div>
      <div class="score-poeng">${data.poeng}p</div>
    </li>`;
  }).join('');
}

function renderHytteScoreboard() {
  const container = document.getElementById('hytte-scoreboard');
  if (!container) return;

  const poengPerHytte = {};
  const logger = filtrerLoggerPåTid(state.logger, aktivScoreboardFilter);

  logger.forEach(l => {
    const hytte = l.hytte || hytteTilBruker(l.bruker);
    if (!hytte) return;
    if (!poengPerHytte[hytte]) poengPerHytte[hytte] = { poeng: 0, brukere: new Set() };
    poengPerHytte[hytte].poeng += (l.poeng || 0);
    if (l.bruker) poengPerHytte[hytte].brukere.add(l.bruker);
  });

  const sorted = Object.entries(poengPerHytte).sort((a, b) => b[1].poeng - a[1].poeng);

  if (sorted.length === 0) {
    container.innerHTML = '<li class="tom-melding">Ingen hytter med poeng ennå.</li>';
    return;
  }

  container.innerHTML = sorted.map(([hytte, data], idx) => `
    <li class="score-item">
      <div class="score-rank ${idx === 0 ? 'pos-1' : idx === 1 ? 'pos-2' : idx === 2 ? 'pos-3' : ''}">
        ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
      </div>
      <div class="score-info">
        <div class="score-navn">🏠 ${hytte}</div>
        <div class="score-detaljer">👥 ${data.brukere.size} ${data.brukere.size === 1 ? 'person' : 'personer'}</div>
      </div>
      <div class="score-poeng">${data.poeng}p</div>
    </li>
  `).join('');
}

// ===== MINE TURER =====
function renderMineTurer() {
  const container = document.getElementById('mine-turer-liste');
  if (!container) return;

  const bruker = hentAktivBruker();
  const mine = bruker ? state.logger.filter(l => l.bruker === bruker.navn) : state.logger;
  const filtrert = filtrerLoggerPåTid(mine, aktivTurerFilter);
  const sortert = [...filtrert].sort((a, b) => new Date(b.dato) - new Date(a.dato));

  if (sortert.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:3rem; color:var(--stein); grid-column:1/-1;">
      <div style="font-size:3rem; margin-bottom:1rem;">🗻</div>
      <div>Ingen turer registrert ennå.</div>
    </div>`;
    return;
  }

  container.innerHTML = sortert.map(logg => {
    if (logg.type === 'tur') {
      const fjellNavn = (logg.fjell || []).map(id => FJELL_DATA.find(f => f.id === id)?.navn).filter(Boolean);
      const vannNavn = (logg.vann || []).map(id => VANN_DATA.find(v => v.id === id)?.navn).filter(Boolean);
      const deler = [
        fjellNavn.length ? `⛰ ${fjellNavn.join(', ')}` : '',
        vannNavn.length ? `🌊 ${vannNavn.join(', ')}` : ''
      ].filter(Boolean);
      return `
      <div class="tur-card">
        <div class="tur-type">🎒 Tur</div>
        <div class="tur-navn">${deler.join(' · ') || 'Tom tur'}</div>
        <div class="tur-meta">
          👤 ${logg.bruker}${logg.hytte ? ` · 🏠 ${logg.hytte}` : ''} &nbsp;|&nbsp; 📅 ${formaterDato(logg.dato)} &nbsp;|&nbsp; ⭐ ${logg.poeng} poeng
        </div>
        ${logg.notat ? `<div class="tur-notat">"${logg.notat}"</div>` : ''}
      </div>`;
    }

    // Gammelt format
    const erFjell = logg.type === 'fjell';
    const item = erFjell
      ? FJELL_DATA.find(f => f.id === logg.id)
      : VANN_DATA.find(v => v.id === logg.id);
    if (!item) return '';

    return `
    <div class="tur-card ${erFjell ? '' : 'vann-tur'}">
      <div class="tur-type ${erFjell ? '' : 'vann-type'}">${erFjell ? '⛰ Fjell' : '🌊 Bading'}</div>
      <div class="tur-navn">${item.navn}</div>
      <div class="tur-meta">
        👤 ${logg.bruker} &nbsp;|&nbsp; 📅 ${formaterDato(logg.dato)} &nbsp;|&nbsp; ⭐ ${logg.poeng} poeng
      </div>
      ${logg.notat ? `<div class="tur-notat">"${logg.notat}"</div>` : ''}
    </div>`;
  }).join('');
}

// ===== HERO STATS =====
function oppdaterHeroStats() {
  const bruker = hentAktivBruker();
  const mine = bruker ? state.logger.filter(l => l.bruker === bruker.navn) : [];
  const fjellIds = new Set();
  const vannIds = new Set();
  mine.forEach(l => {
    if (l.type === 'fjell') fjellIds.add(l.id);
    else if (l.type === 'vann') vannIds.add(l.id);
    else if (l.type === 'tur') {
      l.fjell?.forEach(id => fjellIds.add(id));
      l.vann?.forEach(id => vannIds.add(id));
    }
  });
  const besøkteFjell = fjellIds.size;
  const badedeVann = vannIds.size;
  const totPoeng = mine.reduce((sum, l) => sum + (l.poeng || 0), 0);

  const elFjell = document.getElementById('stat-fjell');
  const elVann = document.getElementById('stat-vann');
  const elPoeng = document.getElementById('stat-poeng');

  if (elFjell) elFjell.textContent = besøkteFjell;
  if (elVann) elVann.textContent = badedeVann;
  if (elPoeng) elPoeng.textContent = totPoeng;
}

// ===== REGISTRERING =====
function åpneRegistrerFjell(id) {
  leggTilFjellChip(id);
  navigerTil('registrer');
}

function åpneRegistrerVann(id) {
  leggTilVannChip(id);
  navigerTil('registrer');
}

function registrerTur(e) {
  e.preventDefault();
  const bruker = hentAktivBruker();
  if (!bruker) { alert('Du må være logget inn for å registrere tur.'); return; }

  const dato = document.getElementById('reg-tur-dato').value;
  const notat = document.getElementById('reg-tur-notat').value.trim();

  if (!dato) { alert('Velg dato.'); return; }
  if (!valgteFjell.length && !valdteVann.length) {
    alert('Legg til minst ett fjell eller vann.'); return;
  }

  let totPoeng = 0;
  valgteFjell.forEach(id => { const f = FJELL_DATA.find(x => x.id === id); if (f) totPoeng += f.poeng; });
  valdteVann.forEach(id => { const v = VANN_DATA.find(x => x.id === id); if (v) totPoeng += v.poeng; });

  state.logger.push({
    type: 'tur',
    bruker: bruker.navn,
    hytte: bruker.hytte || '',
    dato,
    notat,
    fjell: [...valgteFjell],
    vann: [...valdteVann],
    poeng: totPoeng,
    tidspunkt: Date.now()
  });

  lagreData();
  visSuccessMelding('tur');

  // Reset
  valgteFjell = [];
  valdteVann = [];
  renderChips();
  document.getElementById('reg-tur-notat').value = '';
  document.getElementById('reg-tur-dato').value = new Date().toISOString().split('T')[0];
  oppdaterAlt();
}

function visSuccessMelding(type) {
  const el = document.getElementById(`success-${type}`);
  if (!el) return;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3000);
}

function oppdaterAlt() {
  renderFjellListe(document.getElementById('fjell-filter')?.value || '');
  renderVannListe();
  renderScoreboard();
  renderMineTurer();
  oppdaterHeroStats();
  // Refresh kart-markører
  if (kart) initKartMarkorer();
}

function initKartMarkorer() {
  fjellLag.clearLayers();
  vannLag.clearLayers();
  fjellMarkers = {};
  vannMarkers = {};
  FJELL_DATA.forEach(f => leggTilFjellMarkør(f));
  VANN_DATA.forEach(v => leggTilVannMarkør(v));
}

// ===== HELPERS =====
function erFjellBesøkt(id) {
  const bruker = hentAktivBruker();
  if (!bruker) return false;
  return state.logger.some(l =>
    l.bruker === bruker.navn &&
    ((l.type === 'fjell' && l.id === id) ||
     (l.type === 'tur' && l.fjell?.includes(id)))
  );
}

function erVannBadet(id) {
  const bruker = hentAktivBruker();
  if (!bruker) return false;
  return state.logger.some(l =>
    l.bruker === bruker.navn &&
    ((l.type === 'vann' && l.id === id) ||
     (l.type === 'tur' && l.vann?.includes(id)))
  );
}

function antallBesøkFjell(id) {
  const bruker = hentAktivBruker();
  if (!bruker) return 0;
  return state.logger.filter(l =>
    l.bruker === bruker.navn &&
    ((l.type === 'fjell' && l.id === id) ||
     (l.type === 'tur' && l.fjell?.includes(id)))
  ).length;
}

function antallBadVann(id) {
  const bruker = hentAktivBruker();
  if (!bruker) return 0;
  return state.logger.filter(l =>
    l.bruker === bruker.navn &&
    ((l.type === 'vann' && l.id === id) ||
     (l.type === 'tur' && l.vann?.includes(id)))
  ).length;
}

function filtrerLoggerPåTid(logger, dager) {
  if (!dager) return logger;
  const grense = new Date();
  grense.setDate(grense.getDate() - dager);
  return logger.filter(l => new Date(l.dato) >= grense);
}

function formaterDato(dato) {
  if (!dato) return '';
  const d = new Date(dato);
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ===== ADMIN: RENDER LISTE =====
function renderAdminListe() {
  renderAdminFjellListe();
  renderAdminVannListe();
}

function renderAdminFjellListe() {
  const container = document.getElementById('admin-fjell-liste');
  if (!container) return;
  const sortert = [...FJELL_DATA].sort((a, b) => (b.hoyde || 0) - (a.hoyde || 0));
  container.innerHTML = sortert.map(f => `
    <div class="admin-item">
      <div class="admin-item-info">
        <div class="admin-item-navn">${f.navn}${f.hoyde ? ` (${f.hoyde}m)` : ''}</div>
        <div class="admin-item-meta">${f.kommune}</div>
      </div>
      <div class="admin-item-btns">
        <button class="btn-edit" onclick="åpneEditFjell(${f.id})">Rediger</button>
        <button class="btn-slett" onclick="slettFjell(${f.id})">Slett</button>
      </div>
    </div>
  `).join('');
}

function renderAdminVannListe() {
  const container = document.getElementById('admin-vann-liste');
  if (!container) return;
  container.innerHTML = VANN_DATA.map(v => `
    <div class="admin-item">
      <div class="admin-item-info">
        <div class="admin-item-navn">${v.navn}</div>
        <div class="admin-item-meta">${v.kommune} · ${v.poeng}p</div>
      </div>
      <div class="admin-item-btns">
        <button class="btn-edit" onclick="åpneEditVann(${v.id})">Rediger</button>
        <button class="btn-slett" onclick="slettVann(${v.id})">Slett</button>
      </div>
    </div>
  `).join('');
}

// ===== ADMIN: NY FJELL/VANN =====
function leggTilFjell(e) {
  e.preventDefault();
  const navn = document.getElementById('ny-fjell-navn').value.trim();
  const hoyde = parseInt(document.getElementById('ny-fjell-hoyde').value) || null;
  const kommune = document.getElementById('ny-fjell-kommune').value.trim();
  const lat = parseFloat(document.getElementById('ny-fjell-lat').value);
  const lng = parseFloat(document.getElementById('ny-fjell-lng').value);
  const beskrivelse = document.getElementById('ny-fjell-beskrivelse').value.trim();

  if (!navn || !kommune || !lat || !lng) return;

  const egne = hentEgneFjell();
  const nyId = Date.now() + Math.floor(Math.random() * 1000);
  const nyFjell = { id: nyId, navn, hoyde, kommune, lat, lng, beskrivelse: beskrivelse || `${navn} — brukerregistrert topp.`, bilde: null };
  nyFjell.poeng = hoyde ? Math.round(hoyde / 10) : 20;

  egne.push(nyFjell);
  lagreEgneFjell(egne);
  FJELL_DATA.push(nyFjell);

  e.target.reset();
  visSuccessMelding('ny-fjell');
  populerSelects();
  renderAdminFjellListe();
  renderFjellListe();
  if (kart) {
    Object.values(fjellMarkers).forEach(m => kart.removeLayer(m));
    fjellMarkers = {};
    FJELL_DATA.forEach(f => leggTilFjellMarkør(f));
  }
}

function leggTilVann(e) {
  e.preventDefault();
  const navn = document.getElementById('ny-vann-navn').value.trim();
  const poeng = parseInt(document.getElementById('ny-vann-poeng').value) || 35;
  const kommune = document.getElementById('ny-vann-kommune').value.trim();
  const lat = parseFloat(document.getElementById('ny-vann-lat').value);
  const lng = parseFloat(document.getElementById('ny-vann-lng').value);
  const beskrivelse = document.getElementById('ny-vann-beskrivelse').value.trim();

  if (!navn || !kommune || !lat || !lng) return;

  const egne = hentEgneVann();
  const nyId = Date.now() + Math.floor(Math.random() * 1000);
  const nyVann = { id: nyId, navn, poeng, kommune, lat, lng, beskrivelse: beskrivelse || `${navn} — brukerregistrert vann.` };

  egne.push(nyVann);
  lagreEgneVann(egne);
  VANN_DATA.push(nyVann);

  e.target.reset();
  document.getElementById('ny-vann-poeng').value = '35';
  visSuccessMelding('ny-vann');
  populerSelects();
  renderAdminVannListe();
  renderVannListe();
  if (kart) {
    Object.values(vannMarkers).forEach(m => kart.removeLayer(m));
    vannMarkers = {};
    VANN_DATA.forEach(v => leggTilVannMarkør(v));
  }
}

// ===== ADMIN: SLETT =====
function slettFjell(id) {
  if (!confirm('Slette denne toppen? Dette kan ikke angres.')) return;

  // Fjern fra egne hvis det er et eget fjell
  if (erEgetFjell(id)) {
    lagreEgneFjell(hentEgneFjell().filter(f => f.id !== id));
  }

  // Legg til i slettede-lista (for innebygde)
  const slettede = JSON.parse(localStorage.getItem('lifjell_slettede_fjell') || '[]');
  if (!slettede.includes(id)) { slettede.push(id); localStorage.setItem('lifjell_slettede_fjell', JSON.stringify(slettede)); }

  const idx = FJELL_DATA.findIndex(f => f.id === id);
  if (idx !== -1) FJELL_DATA.splice(idx, 1);

  populerChipVelgere();
  renderAdminFjellListe();
  renderFjellListe();
  if (kart && fjellMarkers[id]) { kart.removeLayer(fjellMarkers[id]); delete fjellMarkers[id]; }
}

function slettVann(id) {
  if (!confirm('Slette dette vannet? Dette kan ikke angres.')) return;

  if (erEgetVann(id)) {
    lagreEgneVann(hentEgneVann().filter(v => v.id !== id));
  }

  const slettede = JSON.parse(localStorage.getItem('lifjell_slettede_vann') || '[]');
  if (!slettede.includes(id)) { slettede.push(id); localStorage.setItem('lifjell_slettede_vann', JSON.stringify(slettede)); }

  const idx = VANN_DATA.findIndex(v => v.id === id);
  if (idx !== -1) VANN_DATA.splice(idx, 1);

  populerChipVelgere();
  renderAdminVannListe();
  renderVannListe();
  if (kart && vannMarkers[id]) { kart.removeLayer(vannMarkers[id]); delete vannMarkers[id]; }
}

// ===== ADMIN: REDIGER (MODAL) =====
function åpneEditFjell(id) {
  const f = FJELL_DATA.find(x => x.id === id);
  if (!f) return;
  document.getElementById('edit-id').value = id;
  document.getElementById('edit-type').value = 'fjell';
  document.getElementById('modal-tittel').textContent = `Rediger: ${f.navn}`;
  document.getElementById('edit-navn').value = f.navn;
  document.getElementById('edit-hoyde').value = f.hoyde || '';
  document.getElementById('edit-kommune').value = f.kommune;
  document.getElementById('edit-lat').value = f.lat;
  document.getElementById('edit-lng').value = f.lng;
  document.getElementById('edit-beskrivelse').value = f.beskrivelse;
  document.getElementById('edit-hoyde-gruppe').style.display = '';
  document.getElementById('edit-poeng-gruppe').style.display = 'none';
  document.getElementById('edit-modal').style.display = 'flex';
  modalMarker = null;
  visMiniKartMedPosisjon(f.lat, f.lng);
}

function åpneEditVann(id) {
  const v = VANN_DATA.find(x => x.id === id);
  if (!v) return;
  document.getElementById('edit-id').value = id;
  document.getElementById('edit-type').value = 'vann';
  document.getElementById('modal-tittel').textContent = `Rediger: ${v.navn}`;
  document.getElementById('edit-navn').value = v.navn;
  document.getElementById('edit-poeng').value = v.poeng;
  document.getElementById('edit-kommune').value = v.kommune;
  document.getElementById('edit-lat').value = v.lat;
  document.getElementById('edit-lng').value = v.lng;
  document.getElementById('edit-beskrivelse').value = v.beskrivelse;
  document.getElementById('edit-hoyde-gruppe').style.display = 'none';
  document.getElementById('edit-poeng-gruppe').style.display = '';
  document.getElementById('edit-modal').style.display = 'flex';
  modalMarker = null;
  visMiniKartMedPosisjon(v.lat, v.lng);
}

function lukkModal() {
  document.getElementById('edit-modal').style.display = 'none';
}

function lagreEdit(e) {
  e.preventDefault();
  const id = parseInt(document.getElementById('edit-id').value);
  const type = document.getElementById('edit-type').value;
  const data = {
    navn:        document.getElementById('edit-navn').value.trim(),
    kommune:     document.getElementById('edit-kommune').value.trim(),
    lat:         parseFloat(document.getElementById('edit-lat').value),
    lng:         parseFloat(document.getElementById('edit-lng').value),
    beskrivelse: document.getElementById('edit-beskrivelse').value.trim()
  };

  if (type === 'fjell') {
    data.hoyde = parseInt(document.getElementById('edit-hoyde').value) || null;
    data.poeng = data.hoyde ? Math.round(data.hoyde / 10) : 20;
    const f = FJELL_DATA.find(x => x.id === id);
    if (f) Object.assign(f, data);
    if (erEgetFjell(id)) {
      const egne = hentEgneFjell().map(x => x.id === id ? { ...x, ...data } : x);
      lagreEgneFjell(egne);
    } else {
      lagreFjellEdit(id, data);
    }
    renderFjellListe();
    renderAdminFjellListe();
    populerSelects();
  } else {
    data.poeng = parseInt(document.getElementById('edit-poeng').value) || 35;
    const v = VANN_DATA.find(x => x.id === id);
    if (v) Object.assign(v, data);
    if (erEgetVann(id)) {
      const egne = hentEgneVann().map(x => x.id === id ? { ...x, ...data } : x);
      lagreEgneVann(egne);
    } else {
      lagreVannEdit(id, data);
    }
    renderVannListe();
    renderAdminVannListe();
    populerSelects();
  }

  lukkModal();
}

// ===== VIS PÅ KART =====
function visPåKart(type, id) {
  // Sørg for at riktig lag er synlig
  if (type === 'fjell' && !kart.hasLayer(fjellLag)) toggleFjellLag();
  if (type === 'vann' && !kart.hasLayer(vannLag)) toggleVannLag();

  const marker = type === 'fjell' ? fjellMarkers[id] : vannMarkers[id];
  if (!marker) return;

  navigerTil('kart');

  // Gi kartet tid til å bli synlig, flytt så til markøren
  setTimeout(() => {
    kart.flyTo(marker.getLatLng(), 14, { duration: 1.2 });
    setTimeout(() => marker.openPopup(), 1300);
  }, 100);
}

// ===== KART HJELPEFUNKSJONER =====
function leggTilFjellMarkør(fjell) {
  const erBesøkt = erFjellBesøkt(fjell.id);
  const farge = erBesøkt ? '#5ba87a' : '#2d5a3d';
  const ikon = L.divIcon({
    className: '',
    html: `<div style="background:${farge};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:28px;height:28px;box-shadow:0 3px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:12px;">⛰</span></div>`,
    iconSize: [28, 28], iconAnchor: [14, 28]
  });
  fjellMarkers[fjell.id] = L.marker([fjell.lat, fjell.lng], { icon: ikon })
    .addTo(fjellLag).bindPopup(lagFjellPopup(fjell), { maxWidth: 280 });
}

function leggTilVannMarkør(vann) {
  const erBadet = erVannBadet(vann.id);
  const farge = erBadet ? '#4299e1' : '#2b6cb0';
  const ikon = L.divIcon({
    className: '',
    html: `<div style="background:${farge};border:3px solid white;border-radius:50%;width:22px;height:22px;box-shadow:0 3px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:11px;">🌊</div>`,
    iconSize: [22, 22], iconAnchor: [11, 11]
  });
  vannMarkers[vann.id] = L.marker([vann.lat, vann.lng], { icon: ikon })
    .addTo(vannLag).bindPopup(lagVannPopup(vann), { maxWidth: 260 });
}


// ===== TURLEDER =====
let turlederKart = null;
let turlederRuteLag = null;
let turlederMarkørLag = null;
let waypoints = [{ id: '' }, { id: '' }]; // start + mål

function alleStederOptions() {
  const steder = [
    ...STEDER_DATA.map(s => ({ key: `s${s.id}`, navn: s.navn, sub: 'Utgangspunkt', lat: s.lat, lng: s.lng })),
    ...FJELL_DATA.sort((a, b) => (b.hoyde || 0) - (a.hoyde || 0))
      .map(f => ({ key: `f${f.id}`, navn: f.navn, sub: f.hoyde ? `${f.hoyde}m · ${f.kommune}` : f.kommune, lat: f.lat, lng: f.lng })),
    ...VANN_DATA.map(v => ({ key: `v${v.id}`, navn: v.navn, sub: v.kommune, lat: v.lat, lng: v.lng }))
  ];
  return steder;
}

function finnStedFraKey(key) {
  return alleStederOptions().find(s => s.key === key);
}

function renderWaypoints() {
  const container = document.getElementById('waypoint-liste');
  if (!container) return;

  const options = alleStederOptions();
  const optHtml = '<option value="">— Velg sted —</option>' +
    ['Utgangspunkt', 'Fjell', 'Vann'].map(gruppe => {
      const items = options.filter(o => o.sub === 'Utgangspunkt' && gruppe === 'Utgangspunkt' ||
        FJELL_DATA.find(f => `f${f.id}` === o.key) && gruppe === 'Fjell' ||
        VANN_DATA.find(v => `v${v.id}` === o.key) && gruppe === 'Vann');
      if (!items.length) return '';
      return `<optgroup label="${gruppe}">${items.map(o => `<option value="${o.key}">${o.navn}${o.sub !== 'Utgangspunkt' ? ` (${o.sub})` : ''}</option>`).join('')}</optgroup>`;
    }).join('');

  container.innerHTML = waypoints.map((wp, i) => {
    const erStart = i === 0;
    const erMal = i === waypoints.length - 1;
    const erStopp = !erStart && !erMal;
    const label = erStart ? 'Start' : erMal ? 'Mål' : `Stopp ${i}`;
    const labelClass = erStart ? 'start' : erMal ? 'maal' : '';

    return `
      ${i > 0 ? '<div class="waypoint-connector"></div>' : ''}
      <div class="waypoint-row">
        <span class="waypoint-label ${labelClass}">${label}</span>
        <select onchange="oppdaterWaypoint(${i}, this.value)">
          ${optHtml.replace(`value="${wp.id}"`, `value="${wp.id}" selected`)}
        </select>
        ${erStopp ? `<button class="btn-fjern-stopp" onclick="fjernStopp(${i})">×</button>` : ''}
      </div>`;
  }).join('');
}

function oppdaterWaypoint(idx, val) {
  waypoints[idx].id = val;
}

function leggTilStopp() {
  waypoints.splice(waypoints.length - 1, 0, { id: '' });
  renderWaypoints();
}

function fjernStopp(idx) {
  waypoints.splice(idx, 1);
  renderWaypoints();
}

// ===== OPTIMALISER STOPP-REKKEFØLGE =====
// Nearest-neighbour heuristic: fast start/end, reorder intermediate stops
function optimaliserRekkefølge() {
  if (waypoints.length <= 3) return; // bare start + én stopp + mål — ingenting å optimalisere

  const start = waypoints[0];
  const mål   = waypoints[waypoints.length - 1];
  let stopp   = waypoints.slice(1, -1).filter(w => w.id);

  if (stopp.length < 2) return; // trenger minst 2 stopp for å ha noe å sortere

  // Hjelp: hent koordinater for et waypoint
  function koord(wp) {
    const s = finnStedFraKey(wp.id);
    return s ? { lat: s.lat, lng: s.lng } : null;
  }

  // Haversine-avstand i km
  function avstand(a, b) {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const c = 2 * Math.asin(Math.sqrt(
      sinLat * sinLat +
      Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sinLng * sinLng
    ));
    return R * c;
  }

  // Nearest-neighbour fra startpunkt gjennom alle stopp
  const startKoord = koord(start);
  if (!startKoord) return;

  const gjenstående = [...stopp];
  const sortert = [];
  let nåværende = startKoord;

  while (gjenstående.length) {
    let nærmestIdx = 0;
    let nærmestAvstand = Infinity;
    gjenstående.forEach((wp, i) => {
      const k = koord(wp);
      if (!k) return;
      const d = avstand(nåværende, k);
      if (d < nærmestAvstand) { nærmestAvstand = d; nærmestIdx = i; }
    });
    const valgt = gjenstående.splice(nærmestIdx, 1)[0];
    sortert.push(valgt);
    nåværende = koord(valgt) || nåværende;
  }

  waypoints = [start, ...sortert, mål];
  renderWaypoints();

  // Vis kort bekreftelse
  const feilEl = document.getElementById('turleder-feil');
  feilEl.style.display = 'block';
  feilEl.style.background = 'var(--is-lys)';
  feilEl.style.borderColor = 'rgba(58,122,74,0.25)';
  feilEl.style.color = 'var(--is)';
  feilEl.textContent = '⚡ Mellomstegene er sortert i mest effektiv rekkefølge.';
  setTimeout(() => { feilEl.style.display = 'none'; feilEl.style.background = ''; feilEl.style.borderColor = ''; feilEl.style.color = ''; }, 3000);
}

function decodePolyline6(encoded) {
  const coords = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    coords.push([lat / 1e6, lng / 1e6]);
  }
  return coords;
}

function formaterTid(sekunder) {
  const t = Math.round(sekunder);
  const timer = Math.floor(t / 3600);
  const min = Math.floor((t % 3600) / 60);
  if (timer === 0) return `${min} min`;
  if (min === 0) return `${timer} t`;
  return `${timer} t ${min} min`;
}

async function beregnTur() {
  const valgte = waypoints.filter(w => w.id);
  if (valgte.length < 2) {
    visturlederFeil('Velg minst start og mål.');
    return;
  }

  document.getElementById('turleder-feil').style.display = 'none';
  document.getElementById('turleder-resultat').style.display = 'none';
  document.getElementById('turleder-laster').style.display = 'flex';

  const steder = valgte.map(w => finnStedFraKey(w.id)).filter(Boolean);
  if (steder.length < 2) {
    visturlederFeil('Feil ved sted-oppslag.');
    document.getElementById('turleder-laster').style.display = 'none';
    return;
  }

  const locations = steder.map(s => ({ lon: s.lng, lat: s.lat }));

  try {
    const res = await fetch('https://valhalla1.openstreetmap.de/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations, costing: 'pedestrian', directions_options: { units: 'km' } }),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    document.getElementById('turleder-laster').style.display = 'none';

    if (!data.trip) {
      visturlederFeil('Ingen rute funnet mellom disse stedene.');
      return;
    }

    visRuteResultat(data.trip, steder);
  } catch (err) {
    document.getElementById('turleder-laster').style.display = 'none';
    visturlederFeil('Kunne ikke hente rute. Sjekk internettforbindelsen og prøv igjen.');
  }
}

function visRuteResultat(trip, steder) {
  const totTid = trip.summary.time;
  const totDist = trip.summary.length;

  // Sammendrag
  document.getElementById('tur-summary').innerHTML = `
    <div class="tur-summary-stat">
      <span class="tal">${formaterTid(totTid)}</span>
      <span class="etikett">Gangtid</span>
    </div>
    <div class="tur-summary-stat">
      <span class="tal">${totDist.toFixed(1)} km</span>
      <span class="etikett">Avstand</span>
    </div>
    <div class="tur-summary-stat">
      <span class="tal">${steder.length - 1}</span>
      <span class="etikett">${steder.length - 1 === 1 ? 'Etappe' : 'Etapper'}</span>
    </div>
  `;

  // Etapper
  document.getElementById('tur-etapper').innerHTML = trip.legs.map((leg, i) => `
    <div class="etappe-rad">
      <div class="etappe-nr">${i + 1}</div>
      <div class="etappe-info">
        <div class="etappe-navn">${steder[i].navn} → ${steder[i + 1].navn}</div>
        <div class="etappe-detalj">${leg.summary.length.toFixed(1)} km</div>
      </div>
      <div class="etappe-tid">${formaterTid(leg.summary.time)}</div>
    </div>
  `).join('');

  document.getElementById('turleder-resultat').style.display = 'block';

  // Tegn rute på kart
  initTurlederKart();
  turlederRuteLag.clearLayers();
  turlederMarkørLag.clearLayers();

  const alleKoords = [];
  trip.legs.forEach(leg => {
    const coords = decodePolyline6(leg.shape);
    alleKoords.push(...coords);
    L.polyline(coords, { color: '#3a7a4a', weight: 4, opacity: 0.85 }).addTo(turlederRuteLag);
  });

  steder.forEach((s, i) => {
    const erStart = i === 0;
    const erMal = i === steder.length - 1;
    const farge = erStart ? '#3a7a4a' : erMal ? '#b05050' : '#e08020';
    const label = erStart ? 'S' : erMal ? 'M' : String(i);
    const ikon = L.divIcon({
      className: '',
      html: `<div style="background:${farge};color:#fff;border:2px solid white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:900;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${label}</div>`,
      iconSize: [28, 28], iconAnchor: [14, 14]
    });
    L.marker([s.lat, s.lng], { icon: ikon }).addTo(turlederMarkørLag)
      .bindTooltip(s.navn, { permanent: false });
  });

  if (alleKoords.length) {
    turlederKart.fitBounds(L.latLngBounds(alleKoords), { padding: [24, 24] });
  }
}

function visturlederFeil(melding) {
  const el = document.getElementById('turleder-feil');
  el.textContent = melding;
  el.style.display = 'block';
}

function initTurlederKart() {
  if (turlederKart) return;

  turlederKart = L.map('turleder-kart', {
    center: [59.515, 8.880],
    zoom: 11,
    maxBounds: L.latLngBounds(L.latLng(59.35, 8.50), L.latLng(59.70, 9.25)),
    maxBoundsViscosity: 0.7,
    minZoom: 9,
    maxZoom: 17
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19
  }).addTo(turlederKart);

  turlederRuteLag = L.layerGroup().addTo(turlederKart);
  turlederMarkørLag = L.layerGroup().addTo(turlederKart);
}

// ===== ADMIN KART-VELGER =====
let adminVelgerKart = null;
let adminVelgerMarker = null;
let adminLatTarget = null;
let adminLngTarget = null;

function initAdminVelgerKart() {
  if (adminVelgerKart) return;

  adminVelgerKart = L.map('admin-velger-kart', {
    center: [59.515, 8.880],
    zoom: 11,
    maxBounds: L.latLngBounds(L.latLng(59.40, 8.65), L.latLng(59.62, 9.12)),
    maxBoundsViscosity: 0.9,
    minZoom: 10,
    maxZoom: 16
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19
  }).addTo(adminVelgerKart);

  // Vis eksisterende punkter som referanse
  FJELL_DATA.forEach(f => {
    L.circleMarker([f.lat, f.lng], { radius: 6, color: '#3a7a4a', fillColor: '#3a7a4a', fillOpacity: 0.5, weight: 2 })
      .addTo(adminVelgerKart).bindTooltip(f.navn, { permanent: false });
  });
  VANN_DATA.forEach(v => {
    L.circleMarker([v.lat, v.lng], { radius: 5, color: '#2c6e8a', fillColor: '#2c6e8a', fillOpacity: 0.5, weight: 2 })
      .addTo(adminVelgerKart).bindTooltip(v.navn, { permanent: false });
  });

  adminVelgerKart.on('click', e => {
    settAdminPos(e.latlng.lat, e.latlng.lng);
  });
}

function settAdminPos(lat, lng) {
  const latR = parseFloat(lat.toFixed(5));
  const lngR = parseFloat(lng.toFixed(5));

  if (adminLatTarget) document.getElementById(adminLatTarget).value = latR;
  if (adminLngTarget) document.getElementById(adminLngTarget).value = lngR;

  const ll = L.latLng(latR, lngR);
  if (adminVelgerMarker) {
    adminVelgerMarker.setLatLng(ll);
  } else {
    adminVelgerMarker = L.marker(ll, { draggable: true }).addTo(adminVelgerKart);
    adminVelgerMarker.on('drag', ev => settAdminPos(ev.latlng.lat, ev.latlng.lng));
  }
}

function åpneAdminKart(latId, lngId) {
  adminLatTarget = latId;
  adminLngTarget = lngId;

  const container = document.getElementById('admin-kart-container');
  container.style.display = 'block';

  if (!adminVelgerKart) {
    initAdminVelgerKart();
  }

  setTimeout(() => {
    adminVelgerKart.invalidateSize();

    // Flytt til eksisterende posisjon hvis felt er fylt inn
    const curLat = parseFloat(document.getElementById(latId)?.value);
    const curLng = parseFloat(document.getElementById(lngId)?.value);
    if (curLat && curLng) {
      adminVelgerKart.setView([curLat, curLng], 13);
      settAdminPos(curLat, curLng);
    }

    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 80);
}

// ===== MODAL MINI-KART =====
let modalKart = null;
let modalMarker = null;

function initModalKart() {
  if (modalKart) return;

  modalKart = L.map('modal-mini-kart', {
    center: [59.515, 8.880],
    zoom: 11,
    maxBounds: L.latLngBounds(L.latLng(59.40, 8.65), L.latLng(59.62, 9.12)),
    maxBoundsViscosity: 0.9,
    minZoom: 10,
    maxZoom: 16,
    zoomControl: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19
  }).addTo(modalKart);

  modalKart.on('click', e => {
    oppdaterModalPos(e.latlng.lat, e.latlng.lng);
  });
}

function oppdaterModalPos(lat, lng) {
  const latR = parseFloat(lat.toFixed(5));
  const lngR = parseFloat(lng.toFixed(5));
  document.getElementById('edit-lat').value = latR;
  document.getElementById('edit-lng').value = lngR;

  const ll = L.latLng(latR, lngR);
  if (modalMarker) {
    modalMarker.setLatLng(ll);
  } else {
    modalMarker = L.marker(ll, { draggable: true }).addTo(modalKart);
    modalMarker.on('drag', ev => oppdaterModalPos(ev.latlng.lat, ev.latlng.lng));
  }
}

function oppdaterModalMarkør() {
  if (!modalKart) return;
  const lat = parseFloat(document.getElementById('edit-lat').value);
  const lng = parseFloat(document.getElementById('edit-lng').value);
  if (!lat || !lng) return;
  const ll = L.latLng(lat, lng);
  if (modalMarker) modalMarker.setLatLng(ll);
  else {
    modalMarker = L.marker(ll, { draggable: true }).addTo(modalKart);
    modalMarker.on('drag', ev => oppdaterModalPos(ev.latlng.lat, ev.latlng.lng));
  }
  modalKart.setView(ll);
}

function visMiniKartMedPosisjon(lat, lng) {
  setTimeout(() => {
    if (!modalKart) initModalKart();
    modalKart.invalidateSize();

    if (lat && lng) {
      const ll = L.latLng(lat, lng);
      modalKart.setView(ll, 13);
      if (modalMarker) {
        modalMarker.setLatLng(ll);
      } else {
        modalMarker = L.marker(ll, { draggable: true }).addTo(modalKart);
        modalMarker.on('drag', ev => oppdaterModalPos(ev.latlng.lat, ev.latlng.lng));
      }
    }
  }, 120);
}

// ===== EVENTS =====
function bindEvents() {
  // Fjellliste filter
  const filterInput = document.getElementById('fjell-filter');
  if (filterInput) filterInput.addEventListener('input', e => renderFjellListe(e.target.value));

  // Tur-registreringsskjema
  const turForm = document.getElementById('form-tur');
  if (turForm) turForm.addEventListener('submit', registrerTur);

  // Login-tabs
  document.querySelectorAll('.login-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('aktiv'));
      document.querySelectorAll('.login-panel').forEach(p => p.classList.remove('aktiv'));
      tab.classList.add('aktiv');
      document.querySelector(`.login-panel[data-lpanel="${tab.dataset.ltab}"]`)?.classList.add('aktiv');
    });
  });

  // Login-skjema
  document.getElementById('form-logg-inn')?.addEventListener('submit', e => {
    e.preventDefault();
    const navn = document.getElementById('login-navn').value.trim();
    const passord = document.getElementById('login-passord').value;
    const feil = document.getElementById('login-feil');
    const ok = loggInn(navn, passord);
    if (!ok) {
      feil.textContent = 'Feil navn eller passord.';
      feil.style.display = '';
    } else {
      feil.style.display = 'none';
    }
  });

  // Ny bruker-skjema
  document.getElementById('form-ny-bruker')?.addEventListener('submit', e => {
    e.preventDefault();
    const navn = document.getElementById('ny-navn').value.trim();
    const passord = document.getElementById('ny-passord').value;
    const passord2 = document.getElementById('ny-passord2').value;
    const alder = parseInt(document.getElementById('ny-alder').value) || null;
    const hytte = document.getElementById('ny-hytte').value.trim();
    const feil = document.getElementById('ny-bruker-feil');

    if (!navn) { feil.textContent = 'Navn er påkrevd.'; feil.style.display = ''; return; }
    if (passord.length < 4) { feil.textContent = 'Passordet må være minst 4 tegn.'; feil.style.display = ''; return; }
    if (passord !== passord2) { feil.textContent = 'Passordene stemmer ikke overens.'; feil.style.display = ''; return; }
    if (hentBrukere().some(b => b.navn.toLowerCase() === navn.toLowerCase())) {
      feil.textContent = 'Det finnes allerede en bruker med dette navnet.'; feil.style.display = ''; return;
    }
    feil.style.display = 'none';
    opprettBruker(navn, passord, alder, hytte);
  });

  // Admin tabs
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('aktiv'));
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('aktiv'));
      tab.classList.add('aktiv');
      document.querySelector(`.admin-panel[data-apanel="${tab.dataset.atab}"]`)?.classList.add('aktiv');
    });
  });

  // Admin type-knapper (fjell/vann i redigeringslisten)
  document.querySelectorAll('.admin-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-type-btn').forEach(b => b.classList.remove('aktiv'));
      btn.classList.add('aktiv');
      document.getElementById('admin-fjell-liste').style.display = btn.dataset.dtype === 'fjell' ? '' : 'none';
      document.getElementById('admin-vann-liste').style.display = btn.dataset.dtype === 'vann' ? '' : 'none';
    });
  });

  // Admin legg til-skjemaer
  const nyFjellForm = document.getElementById('form-ny-fjell');
  if (nyFjellForm) nyFjellForm.addEventListener('submit', leggTilFjell);
  const nyVannForm = document.getElementById('form-ny-vann');
  if (nyVannForm) nyVannForm.addEventListener('submit', leggTilVann);

  // Edit modal
  const redigerForm = document.getElementById('form-rediger');
  if (redigerForm) redigerForm.addEventListener('submit', lagreEdit);

  // Lukk modal ved klikk utenfor
  document.getElementById('edit-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) lukkModal();
  });

  // Sett dagens dato som standard
  const datoInputs = document.querySelectorAll('input[type="date"]');
  const idag = new Date().toISOString().split('T')[0];
  datoInputs.forEach(input => input.value = idag);

  // Navigasjon for alle href="#..."-lenker
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const href = a.getAttribute('href').slice(1);
      navigerTil(href);
      // Lukk hamburger-meny på mobil
      document.getElementById('nav-links')?.classList.remove('open');
      document.getElementById('nav-hamburger')?.classList.remove('open');
    });
  });

  // Hamburger-meny
  const hamburger = document.getElementById('nav-hamburger');
  const navLinks = document.getElementById('nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      navLinks.classList.toggle('open');
    });
  }

  // Admin passord-gate
  const adminPassordForm = document.getElementById('admin-passord-form');
  if (adminPassordForm) {
    adminPassordForm.addEventListener('submit', e => {
      e.preventDefault();
      const input = document.getElementById('admin-passord-input');
      const feil = document.getElementById('admin-feil');
      if (input.value === '1234') {
        document.getElementById('admin-lås').style.display = 'none';
        document.getElementById('admin-innhold').style.display = '';
        sessionStorage.setItem('admin-unlocked', '1');
      } else {
        feil.style.display = '';
        input.value = '';
        input.focus();
      }
    });
  }

  // Behold innlogget i samme sesjon
  if (sessionStorage.getItem('admin-unlocked') === '1') {
    const lås = document.getElementById('admin-lås');
    const innhold = document.getElementById('admin-innhold');
    if (lås && innhold) {
      lås.style.display = 'none';
      innhold.style.display = '';
    }
  }

  // Profilbilde-opplasting
  const bildeInput = document.getElementById('profil-bilde-input');
  if (bildeInput) {
    bildeInput.addEventListener('change', e => {
      const fil = e.target.files[0];
      if (!fil) return;
      komprimerBilde(fil, 200, base64 => {
        const container = document.getElementById('profil-bilde-container');
        if (container) container.innerHTML = `<img src="${base64}" alt="Profilbilde">`;
        const bruker = hentAktivBruker();
        if (bruker) {
          bruker.bilde = base64;
          lagreBrukere(hentBrukere().map(b => b.id === bruker.id ? bruker : b));
          oppdaterNavBruker();
        }
      });
    });
  }

  // Legg til venn ved Enter-tast
  const nyVennInput = document.getElementById('ny-venn-input');
  if (nyVennInput) {
    nyVennInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); leggTilVenn(); }
    });
  }
}

// ===== BRUKERKONTO =====
function hentBrukere() {
  return JSON.parse(localStorage.getItem('lifjell_brukere') || '[]');
}

function lagreBrukere(liste) {
  localStorage.setItem('lifjell_brukere', JSON.stringify(liste));
}

function hentAktivBruker() {
  const id = localStorage.getItem('lifjell_aktiv_bruker');
  if (!id) return null;
  return hentBrukere().find(b => b.id === id) || null;
}

function opprettBruker(navn, passord, alder, hytte) {
  const brukere = hentBrukere();
  const nyBruker = {
    id: Date.now().toString(),
    navn, passord, alder: alder || null,
    hytte: hytte || '',
    bilde: null, venner: [], herErVi: null,
    opprettet: new Date().toISOString()
  };
  brukere.push(nyBruker);
  lagreBrukere(brukere);
  localStorage.setItem('lifjell_aktiv_bruker', nyBruker.id);
  etterInnlogging();
}

function loggInn(navn, passord) {
  const bruker = hentBrukere().find(
    b => b.navn.toLowerCase() === navn.toLowerCase() && b.passord === passord
  );
  if (!bruker) return false;
  localStorage.setItem('lifjell_aktiv_bruker', bruker.id);
  etterInnlogging();
  return true;
}

function loggUt() {
  localStorage.removeItem('lifjell_aktiv_bruker');
  document.getElementById('nav-bruker').style.display = 'none';
  // Tilbake til scroll-modus
  document.body.classList.remove('panel-aktiv');
  PANEL_SEKSJONER.forEach(sid => document.getElementById(sid)?.classList.remove('aktiv-side'));
  document.getElementById('login-modal').classList.remove('skjult');
  // Reset login-form
  document.getElementById('form-logg-inn')?.reset();
  document.getElementById('form-ny-bruker')?.reset();
}

function etterInnlogging() {
  document.getElementById('login-modal').classList.add('skjult');
  oppdaterNavBruker();
  lastProfil();
  initProfilKart();
  oppdaterRegBrukerInfo();

  const startHash = window.location.hash.slice(1);
  navigerTil(ALLE_SEKSJONER.includes(startHash) ? startHash : 'hero');
}

function sjekkInnlogging() {
  const bruker = hentAktivBruker();
  if (bruker) {
    etterInnlogging();
  } else {
    document.getElementById('login-modal').classList.remove('skjult');
  }
}

function oppdaterNavBruker() {
  const bruker = hentAktivBruker();
  const navBruker = document.getElementById('nav-bruker');
  if (!bruker || !navBruker) return;
  navBruker.style.display = 'flex';
  document.getElementById('nav-navn').textContent = bruker.navn;
  const avatar = document.getElementById('nav-avatar');
  if (bruker.bilde) {
    avatar.innerHTML = `<img src="${bruker.bilde}" alt="${bruker.navn}">`;
  } else {
    avatar.textContent = bruker.navn.charAt(0).toUpperCase();
  }
}

function oppdaterRegBrukerInfo() {
  const bruker = hentAktivBruker();
  if (!bruker) return;
  const navnVis = document.getElementById('reg-bruker-navn-vis');
  const hytteVis = document.getElementById('reg-hytte-vis');
  if (navnVis) navnVis.textContent = bruker.navn;
  if (hytteVis) hytteVis.textContent = bruker.hytte ? `· 🏠 ${bruker.hytte}` : '';
}

// ===== PROFIL (synkronisert med brukerkonto) =====
function lastProfil() {
  const bruker = hentAktivBruker();
  if (!bruker) return;

  if (bruker.herErVi) profilHerErVi = bruker.herErVi;

  const navnEl = document.getElementById('profil-navn');
  if (navnEl) navnEl.value = bruker.navn || '';

  const alderEl = document.getElementById('profil-alder');
  if (alderEl && bruker.alder) alderEl.value = bruker.alder;

  const hytteEl = document.getElementById('profil-hytte');
  if (hytteEl) hytteEl.value = bruker.hytte || '';

  if (bruker.bilde) {
    const container = document.getElementById('profil-bilde-container');
    if (container) container.innerHTML = `<img src="${bruker.bilde}" alt="Profilbilde">`;
  }

  renderVennerListe(bruker.venner || []);
}

function lagreProfil() {
  const bruker = hentAktivBruker();
  if (!bruker) return;

  bruker.navn   = document.getElementById('profil-navn')?.value.trim() || bruker.navn;
  bruker.alder  = parseInt(document.getElementById('profil-alder')?.value) || null;
  bruker.hytte  = document.getElementById('profil-hytte')?.value.trim() || '';
  bruker.herErVi = profilHerErVi;

  const brukere = hentBrukere().map(b => b.id === bruker.id ? bruker : b);
  lagreBrukere(brukere);

  // Oppdater "Her er vi"-markøren
  if (herErViMarkør && kart) {
    herErViMarkør.setLatLng([profilHerErVi.lat, profilHerErVi.lng]);
    herErViMarkør.setPopupContent(lagHerErViPopup());
  }

  oppdaterNavBruker();
  oppdaterRegBrukerInfo();

  const msg = document.getElementById('profil-lagret');
  if (msg) { msg.style.display = ''; setTimeout(() => msg.style.display = 'none', 2500); }
}

function lagHerErViPopup() {
  const bruker = hentAktivBruker();
  const navn = bruker?.navn || 'Hytte';
  const hytte = bruker?.hytte ? `<br><span style="color:var(--tekst-dim);font-size:0.8rem;">🏠 ${bruker.hytte}</span>` : '';
  return `<div style="font-family:'Segoe UI',sans-serif;">
    <strong>🏕 ${navn}</strong>${hytte}
    <p style="font-size:0.8rem;color:#555;margin:4px 0 0;">Her er vi</p>
  </div>`;
}

function leggTilHerErViMarkør() {
  if (!kart) return;
  const ikon = L.divIcon({
    className: '',
    html: `<div style="background:#c47c20;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:28px;height:28px;box-shadow:0 3px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:12px;">🏕</span></div>`,
    iconSize: [28, 28], iconAnchor: [14, 28]
  });
  herErViMarkør = L.marker([profilHerErVi.lat, profilHerErVi.lng], { icon: ikon })
    .addTo(kart)
    .bindPopup(lagHerErViPopup(), { maxWidth: 220 });
}

function leggTilVenn() {
  const input = document.getElementById('ny-venn-input');
  if (!input) return;
  const navn = input.value.trim();
  if (!navn) return;

  const bruker = hentAktivBruker();
  if (!bruker) return;
  bruker.venner = bruker.venner || [];
  if (!bruker.venner.includes(navn)) {
    bruker.venner.push(navn);
    lagreBrukere(hentBrukere().map(b => b.id === bruker.id ? bruker : b));
  }

  renderVennerListe(bruker.venner);
  input.value = '';
  input.focus();
}

function fjernVenn(navn) {
  const bruker = hentAktivBruker();
  if (!bruker) return;
  bruker.venner = (bruker.venner || []).filter(v => v !== navn);
  lagreBrukere(hentBrukere().map(b => b.id === bruker.id ? bruker : b));
  renderVennerListe(bruker.venner);
}

function renderVennerListe(venner) {
  const container = document.getElementById('venner-liste');
  if (!container) return;
  if (!venner || venner.length === 0) {
    container.innerHTML = '<p class="ingen-venner">Ingen venner lagt til ennå.</p>';
    return;
  }
  container.innerHTML = venner.map(navn => `
    <div class="venn-chip">
      <span>👤 ${navn}</span>
      <button type="button" onclick="fjernVenn('${navn.replace(/'/g, "&#39;")}')">×</button>
    </div>
  `).join('');
}

function initProfilKart() {
  if (profilKart) {
    // Oppdater markørposisjon og kartvisning ved re-innlogging
    if (profilMarker) profilMarker.setLatLng([profilHerErVi.lat, profilHerErVi.lng]);
    profilKart.setView([profilHerErVi.lat, profilHerErVi.lng], profilKart.getZoom());
    return;
  }
  const el = document.getElementById('profil-kart');
  if (!el) return;

  profilKart = L.map('profil-kart', {
    center: [profilHerErVi.lat, profilHerErVi.lng],
    zoom: 13,
    maxBounds: L.latLngBounds(L.latLng(59.40, 8.65), L.latLng(59.62, 9.12)),
    maxBoundsViscosity: 0.9,
    minZoom: 10,
    maxZoom: 16
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19
  }).addTo(profilKart);

  const ikon = L.divIcon({
    className: '',
    html: `<div style="background:#e63946;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:32px;height:32px;box-shadow:0 3px 12px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:14px;">📍</span></div>`,
    iconSize: [32, 32], iconAnchor: [16, 32]
  });

  profilMarker = L.marker([profilHerErVi.lat, profilHerErVi.lng], { icon: ikon, draggable: true })
    .addTo(profilKart);

  profilMarker.on('drag', e => {
    profilHerErVi = {
      lat: parseFloat(e.latlng.lat.toFixed(5)),
      lng: parseFloat(e.latlng.lng.toFixed(5))
    };
    oppdaterProfilKartHint();
  });

  // Klikk deaktivert som standard — aktiveres via "Flytt hytte"-knapp
  profilKart._karteventHandler = e => {
    const lat = parseFloat(e.latlng.lat.toFixed(5));
    const lng = parseFloat(e.latlng.lng.toFixed(5));
    profilHerErVi = { lat, lng };
    profilMarker.setLatLng([lat, lng]);
    oppdaterProfilKartHint(true);
  };

  oppdaterProfilKartHint(false);
  setTimeout(() => profilKart.invalidateSize(), 100);
}

function aktiverHytteFlytt() {
  const kartEl = document.getElementById('profil-kart');
  kartEl?.classList.remove('profil-kart-låst');
  kartEl?.classList.add('profil-kart-aktiv');
  document.getElementById('flytt-hytte-btn').style.display = 'none';
  document.getElementById('flytt-hytte-ferdig').style.display = '';

  if (profilKart) {
    profilMarker?.setOpacity(1);
    profilMarker?.dragging?.enable();
    profilKart.on('click', profilKart._karteventHandler);
  }
  oppdaterProfilKartHint(true);
}

function deaktiverHytteFlytt() {
  const kartEl = document.getElementById('profil-kart');
  kartEl?.classList.add('profil-kart-låst');
  kartEl?.classList.remove('profil-kart-aktiv');
  document.getElementById('flytt-hytte-btn').style.display = '';
  document.getElementById('flytt-hytte-ferdig').style.display = 'none';

  if (profilKart) {
    profilMarker?.dragging?.disable();
    profilKart.off('click', profilKart._karteventHandler);
  }
  oppdaterProfilKartHint(false);
}

function oppdaterProfilKartHint(aktiv) {
  const hint = document.getElementById('profil-kart-hint');
  if (!hint) return;
  if (aktiv) {
    hint.textContent = `📍 Klikk i kartet eller dra markøren for å flytte. Nåværende: ${profilHerErVi.lat.toFixed(4)}°N, ${profilHerErVi.lng.toFixed(4)}°Ø`;
    hint.style.color = 'var(--is)';
  } else {
    hint.textContent = `Nåværende posisjon: ${profilHerErVi.lat.toFixed(4)}°N, ${profilHerErVi.lng.toFixed(4)}°Ø`;
    hint.style.color = '';
  }
}

function komprimerBilde(fil, maxPx, callback) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(fil);
}
