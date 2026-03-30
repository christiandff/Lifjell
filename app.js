// ===== STATE =====
let state = {
  logger: [],       // [{type: 'fjell'|'vann', id, bruker, dato, notat, poeng}]
  aktiveTab: 'fjell'
};

let kart = null;
let fjellMarkers = {};
let vannMarkers = {};
let fjellLag = null;
let vannLag = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  lastData();
  initMountain3D();
  populerSelects();
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

  // "Her er vi" — Jønnbu
  STEDER_DATA.forEach(sted => {
    const ikon = L.divIcon({
      className: '',
      html: `<div style="background:#e63946;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:32px;height:32px;box-shadow:0 3px 12px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:14px;">📍</span></div>`,
      iconSize: [32, 32], iconAnchor: [16, 32]
    });
    L.marker([sted.lat, sted.lng], { icon: ikon })
      .addTo(kart)
      .bindPopup(`<div style="font-family:'Segoe UI',sans-serif;min-width:200px;"><strong style="color:#e63946;">📍 ${sted.navn}</strong><div style="background:#fff3f3;border:1px solid #e63946;border-radius:4px;padding:4px 8px;font-size:0.78rem;color:#c1121f;font-weight:700;margin:6px 0;">🧭 HER ER VI</div><p style="font-size:0.8rem;color:#555;margin:0;">${sted.beskrivelse}</p></div>`, { maxWidth: 250 })
      .openPopup();
  });

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

// ===== DYNAMISKE SELECT-LISTER =====
function populerSelects() {
  const fjellSelect = document.getElementById('reg-fjell-select');
  if (fjellSelect) {
    const sortert = [...FJELL_DATA].sort((a, b) => (b.hoyde || 0) - (a.hoyde || 0));
    fjellSelect.innerHTML = '<option value="">— Velg fjell —</option>' +
      sortert.map(f => `<option value="${f.id}">${f.navn}${f.hoyde ? ` (${f.hoyde}m)` : ''}</option>`).join('');
  }

  const vannSelect = document.getElementById('reg-vann-select');
  if (vannSelect) {
    vannSelect.innerHTML = '<option value="">— Velg vann —</option>' +
      VANN_DATA.map(v => `<option value="${v.id}">${v.navn} (${v.poeng}p)</option>`).join('');
  }
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
  document.getElementById('fjell-liste')?.scrollIntoView({ behavior: 'smooth' });
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
  document.getElementById('vann-liste')?.scrollIntoView({ behavior: 'smooth' });
}

// ===== SCOREBOARD =====
function renderScoreboard() {
  renderFjellScoreboard();
  renderVannScoreboard();
}

function renderFjellScoreboard() {
  const container = document.getElementById('fjell-scoreboard');
  if (!container) return;

  const poengPerBruker = {};

  state.logger
    .filter(l => l.type === 'fjell')
    .forEach(l => {
      const fjell = FJELL_DATA.find(f => f.id === l.id);
      if (!fjell) return;
      if (!poengPerBruker[l.bruker]) {
        poengPerBruker[l.bruker] = { poeng: 0, fjell: new Set() };
      }
      poengPerBruker[l.bruker].fjell.add(l.id);
      poengPerBruker[l.bruker].poeng += fjell.poeng;
    });

  const sorted = Object.entries(poengPerBruker)
    .sort((a, b) => b[1].poeng - a[1].poeng);

  if (sorted.length === 0) {
    container.innerHTML = '<li class="tom-melding">Ingen registrerte fjellbesøk ennå.<br>Vær den første! 🏔️</li>';
    return;
  }

  container.innerHTML = sorted.map(([navn, data], idx) => `
    <li class="score-item">
      <div class="score-rank ${idx === 0 ? 'pos-1' : idx === 1 ? 'pos-2' : idx === 2 ? 'pos-3' : ''}">
        ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
      </div>
      <div class="score-info">
        <div class="score-navn">${navn}</div>
        <div class="score-detaljer">⛰ ${data.fjell.size} fjell besteiget</div>
      </div>
      <div class="score-poeng">${data.poeng}p</div>
    </li>
  `).join('');
}

function renderVannScoreboard() {
  const container = document.getElementById('vann-scoreboard');
  if (!container) return;

  const poengPerBruker = {};

  state.logger
    .filter(l => l.type === 'vann')
    .forEach(l => {
      const vann = VANN_DATA.find(v => v.id === l.id);
      if (!vann) return;
      if (!poengPerBruker[l.bruker]) {
        poengPerBruker[l.bruker] = { poeng: 0, vann: new Set() };
      }
      poengPerBruker[l.bruker].vann.add(l.id);
      poengPerBruker[l.bruker].poeng += vann.poeng;
    });

  const sorted = Object.entries(poengPerBruker)
    .sort((a, b) => b[1].poeng - a[1].poeng);

  if (sorted.length === 0) {
    container.innerHTML = '<li class="tom-melding">Ingen registrerte bad ennå.<br>Hopp i vannet! 🏊</li>';
    return;
  }

  container.innerHTML = sorted.map(([navn, data], idx) => `
    <li class="score-item">
      <div class="score-rank ${idx === 0 ? 'pos-1' : idx === 1 ? 'pos-2' : idx === 2 ? 'pos-3' : ''}">
        ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
      </div>
      <div class="score-info">
        <div class="score-navn">${navn}</div>
        <div class="score-detaljer">🌊 ${data.vann.size} vann badet i</div>
      </div>
      <div class="score-poeng">${data.poeng}p</div>
    </li>
  `).join('');
}

// ===== MINE TURER =====
function renderMineTurer() {
  const container = document.getElementById('mine-turer-liste');
  if (!container) return;

  const sortert = [...state.logger].sort((a, b) => new Date(b.dato) - new Date(a.dato));

  if (sortert.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:3rem; color:var(--stein); grid-column:1/-1;">
      <div style="font-size:3rem; margin-bottom:1rem;">🗻</div>
      <div>Ingen turer registrert ennå.</div>
    </div>`;
    return;
  }

  container.innerHTML = sortert.map(logg => {
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
  const besøkteFjell = new Set(state.logger.filter(l => l.type === 'fjell').map(l => l.id)).size;
  const badedeVann = new Set(state.logger.filter(l => l.type === 'vann').map(l => l.id)).size;
  const totPoeng = state.logger.reduce((sum, l) => sum + (l.poeng || 0), 0);

  const elFjell = document.getElementById('stat-fjell');
  const elVann = document.getElementById('stat-vann');
  const elPoeng = document.getElementById('stat-poeng');

  if (elFjell) elFjell.textContent = besøkteFjell;
  if (elVann) elVann.textContent = badedeVann;
  if (elPoeng) elPoeng.textContent = totPoeng;
}

// ===== REGISTRERING =====
function åpneRegistrerFjell(id) {
  const fjellEl = document.getElementById('reg-fjell-select');
  if (fjellEl) {
    fjellEl.value = id;
    byttTab('fjell');
  }
  document.getElementById('registrer').scrollIntoView({ behavior: 'smooth' });
}

function åpneRegistrerVann(id) {
  const vannEl = document.getElementById('reg-vann-select');
  if (vannEl) {
    vannEl.value = id;
    byttTab('vann');
  }
  document.getElementById('registrer').scrollIntoView({ behavior: 'smooth' });
}

function byttTab(tab) {
  state.aktiveTab = tab;
  document.querySelectorAll('.reg-tab').forEach(t => {
    t.classList.toggle('aktiv', t.dataset.tab === tab);
  });
  document.querySelectorAll('.form-panel').forEach(p => {
    p.classList.toggle('aktiv', p.dataset.panel === tab);
  });
}

function registrerFjell(e) {
  e.preventDefault();
  const form = e.target;
  const fjellId = parseInt(form.querySelector('#reg-fjell-select').value);
  const bruker = form.querySelector('#reg-fjell-bruker').value.trim();
  const dato = form.querySelector('#reg-fjell-dato').value;
  const notat = form.querySelector('#reg-fjell-notat').value.trim();

  if (!fjellId || !bruker || !dato) return;

  const fjell = FJELL_DATA.find(f => f.id === fjellId);
  if (!fjell) return;

  state.logger.push({
    id: fjellId,
    type: 'fjell',
    bruker,
    dato,
    notat,
    poeng: fjell.poeng,
    tidspunkt: Date.now()
  });

  lagreData();
  visSuccessMelding('fjell');
  form.reset();
  oppdaterAlt();
}

function registrerVann(e) {
  e.preventDefault();
  const form = e.target;
  const vannId = parseInt(form.querySelector('#reg-vann-select').value);
  const bruker = form.querySelector('#reg-vann-bruker').value.trim();
  const dato = form.querySelector('#reg-vann-dato').value;
  const notat = form.querySelector('#reg-vann-notat').value.trim();

  if (!vannId || !bruker || !dato) return;

  const vann = VANN_DATA.find(v => v.id === vannId);
  if (!vann) return;

  state.logger.push({
    id: vannId,
    type: 'vann',
    bruker,
    dato,
    notat,
    poeng: vann.poeng,
    tidspunkt: Date.now()
  });

  lagreData();
  visSuccessMelding('vann');
  form.reset();
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
  return state.logger.some(l => l.type === 'fjell' && l.id === id);
}

function erVannBadet(id) {
  return state.logger.some(l => l.type === 'vann' && l.id === id);
}

function antallBesøkFjell(id) {
  return state.logger.filter(l => l.type === 'fjell' && l.id === id).length;
}

function antallBadVann(id) {
  return state.logger.filter(l => l.type === 'vann' && l.id === id).length;
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
        ${erEgetFjell(f.id) ? `<button class="btn-slett" onclick="slettEgetFjell(${f.id})">Slett</button>` : ''}
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
        ${erEgetVann(v.id) ? `<button class="btn-slett" onclick="slettEgetVann(${v.id})">Slett</button>` : ''}
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
  const nyId = 10000 + Date.now() % 1000000;
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
  const nyId = 20000 + Date.now() % 1000000;
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
function slettEgetFjell(id) {
  if (!confirm('Slette denne toppen?')) return;
  const egne = hentEgneFjell().filter(f => f.id !== id);
  lagreEgneFjell(egne);
  const idx = FJELL_DATA.findIndex(f => f.id === id);
  if (idx !== -1) FJELL_DATA.splice(idx, 1);
  populerSelects();
  renderAdminFjellListe();
  renderFjellListe();
  if (kart && fjellMarkers[id]) { kart.removeLayer(fjellMarkers[id]); delete fjellMarkers[id]; }
}

function slettEgetVann(id) {
  if (!confirm('Slette dette vannet?')) return;
  const egne = hentEgneVann().filter(v => v.id !== id);
  lagreEgneVann(egne);
  const idx = VANN_DATA.findIndex(v => v.id === id);
  if (idx !== -1) VANN_DATA.splice(idx, 1);
  populerSelects();
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

  document.getElementById('kart').scrollIntoView({ behavior: 'smooth' });

  // Gi scroll tid til å lande, flytt så kartet og åpne popup
  setTimeout(() => {
    kart.flyTo(marker.getLatLng(), 14, { duration: 1.2 });
    setTimeout(() => marker.openPopup(), 1300);
  }, 400);
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

// ===== RUTER FRA UT.NO =====
let ruterKart = null;
let ruterRuteLag = null;
let aktivRuteId = null;
const ruterCache = [];

const GRADERING_NORSK = {
  EASY: 'Enkel',
  MODERATE: 'Moderat',
  TOUGH: 'Krevende',
  VERY_TOUGH: 'Svært krevende',
  VERY_EASY: 'Svært enkel'
};

const GRADERING_KLASSE = {
  EASY: 'grad-easy',
  MODERATE: 'grad-moderate',
  TOUGH: 'grad-tough',
  VERY_TOUGH: 'grad-very-tough',
  VERY_EASY: 'grad-easy'
};

function initRuterKart() {
  if (ruterKart) return;
  ruterKart = L.map('ruter-kart', {
    center: [59.515, 8.880],
    zoom: 11,
    minZoom: 8,
    maxZoom: 17
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap | Ruter: ut.no / Nasjonal Turbase', maxZoom: 19
  }).addTo(ruterKart);
  ruterRuteLag = L.layerGroup().addTo(ruterKart);
}

async function hentRuter() {
  initRuterKart();

  const liste = document.getElementById('ruter-liste');
  liste.innerHTML = `<div class="ruter-laster"><div class="spinner" style="width:20px;height:20px;"></div> Henter ruter fra ut.no…</div>`;

  const query = `{
    ntb_findRoutesNear(coordinates: [8.86, 59.515], distance: 25000) {
      edges {
        node {
          id
          name
          grading
          distance
          elevationGain
          geometry
        }
        distance
      }
    }
  }`;

  try {
    const res = await fetch('https://api.ut.no/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const edges = json?.data?.ntb_findRoutesNear?.edges;

    if (!edges?.length) {
      liste.innerHTML = `<div class="ruter-feil">Ingen ruter funnet i området.</div>`;
      return;
    }

    ruterCache.length = 0;
    edges.forEach(e => ruterCache.push({ ...e.node, fravær: Math.round(e.distance / 1000) }));

    renderRuterListe();
  } catch (err) {
    liste.innerHTML = `<div class="ruter-feil">Kunne ikke hente ruter fra ut.no. Sjekk internettforbindelsen og prøv igjen.</div>`;
  }
}

function renderRuterListe() {
  const liste = document.getElementById('ruter-liste');

  if (!ruterCache.length) {
    liste.innerHTML = `<div class="ruter-feil">Ingen ruter.</div>`;
    return;
  }

  liste.innerHTML = ruterCache.map(r => {
    const gradKlasse = GRADERING_KLASSE[r.grading] || 'grad-moderate';
    const gradNorsk = GRADERING_NORSK[r.grading] || r.grading;
    const dist = r.distance ? (r.distance / 1000).toFixed(1) + ' km' : '—';
    const høyde = r.elevationGain ? `+${Math.round(r.elevationGain)} m` : '';
    return `
      <div class="rute-kort ${gradKlasse} ${aktivRuteId === r.id ? 'aktiv' : ''}" onclick="visRute('${r.id}')">
        <div class="rute-navn">${r.name || 'Ukjent rute'}</div>
        <div class="rute-meta">
          <span class="rute-gradering">${gradNorsk}</span>
          <span class="rute-detalj">📏 ${dist}</span>
          ${høyde ? `<span class="rute-detalj">⬆ ${høyde}</span>` : ''}
        </div>
      </div>`;
  }).join('');
}

function visRute(id) {
  aktivRuteId = id;
  renderRuterListe();

  const rute = ruterCache.find(r => r.id === id);
  if (!rute?.geometry?.coordinates?.length) return;

  ruterRuteLag.clearLayers();

  // Geometry er GeoJSON LineString: [lng, lat, elev]
  const coords = rute.geometry.coordinates.map(c => [c[1], c[0]]);

  const polyline = L.polyline(coords, {
    color: '#3a7a4a',
    weight: 4,
    opacity: 0.9
  }).addTo(ruterRuteLag);

  // Start- og endepunkt-markører
  const mkrStart = L.divIcon({
    className: '',
    html: `<div style="background:#3a7a4a;color:#fff;border:2px solid white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:900;box-shadow:0 2px 6px rgba(0,0,0,0.3);">S</div>`,
    iconSize: [24, 24], iconAnchor: [12, 12]
  });
  const mkrMal = L.divIcon({
    className: '',
    html: `<div style="background:#b04040;color:#fff;border:2px solid white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:900;box-shadow:0 2px 6px rgba(0,0,0,0.3);">M</div>`,
    iconSize: [24, 24], iconAnchor: [12, 12]
  });

  L.marker(coords[0], { icon: mkrStart }).addTo(ruterRuteLag);
  L.marker(coords[coords.length - 1], { icon: mkrMal }).addTo(ruterRuteLag);

  ruterKart.fitBounds(polyline.getBounds(), { padding: [24, 24] });

  // Info-panel
  const gradNorsk = GRADERING_NORSK[rute.grading] || rute.grading || '—';
  const dist = rute.distance ? (rute.distance / 1000).toFixed(1) + ' km' : '—';
  const høyde = rute.elevationGain ? `+${Math.round(rute.elevationGain)} m` : '—';

  const infoEl = document.getElementById('ruter-kart-info');
  infoEl.style.display = 'block';
  infoEl.innerHTML = `
    <h3>${rute.name || 'Ukjent rute'}</h3>
    <div class="rute-stats">
      <div class="rute-stat"><span class="tal">${dist}</span><span class="etikett">Avstand</span></div>
      <div class="rute-stat"><span class="tal">${høyde}</span><span class="etikett">Stigning</span></div>
      <div class="rute-stat"><span class="tal">${gradNorsk}</span><span class="etikett">Vanskelighet</span></div>
    </div>
    <p style="margin-top:0.5rem;"><a href="https://www.ut.no/tur/${rute.id}/" target="_blank" rel="noopener" style="color:var(--is);font-size:0.82rem;font-weight:600;">→ Se full beskrivelse på ut.no</a></p>
  `;
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

  // Tabs i registreringsskjema
  document.querySelectorAll('.reg-tab').forEach(tab => {
    tab.addEventListener('click', () => byttTab(tab.dataset.tab));
  });

  // Registreringsskjemaer
  const fjellForm = document.getElementById('form-fjell');
  if (fjellForm) fjellForm.addEventListener('submit', registrerFjell);
  const vannForm = document.getElementById('form-vann');
  if (vannForm) vannForm.addEventListener('submit', registrerVann);

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

  // Smooth scroll for nav-linker + lukk mobil-meny ved klikk
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
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
}
