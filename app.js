// ============================================================
// Dati statici del portafoglio
// ============================================================
const FONDI = [
  { idx: 0, nome: 'Lux Im Intermonte PIR Ita SmallMid', isin: 'LU1698605562', carico: 158.60, quote: 154.90 },
  { idx: 1, nome: 'Lux Im Goldman Sachs Global Eq Op',   isin: 'LU1881760893', carico: 156.25, quote: 165.17 },
  { idx: 2, nome: 'Lux Im Blackrock Credit Defensive St', isin: 'LU0894903326', carico:  98.10, quote: 312.66 },
  { idx: 3, nome: 'Ff World Fund E Acc Euro',             isin: 'LU0115769746', carico:  42.23, quote: 567.44 },
  { idx: 4, nome: 'Eurizon Az.Internaz.Etico',            isin: 'IT0001083424', carico:  17.85, quote: 3316.86 },
];

// Asset class (indici riferiti all'array FONDI)
const AC_DEF = [
  { nome: 'Azionario Italia',   idxs: [0] },
  { nome: 'Azionario Globale',  idxs: [1, 3] },
  { nome: 'Obbligazionario',    idxs: [2] },
  { nome: 'Azionario Intl ESG', idxs: [4] },
];

// Colori grafici (uno per fondo)
const COLORI = ['#6366f1', '#22c55e', '#3b82f6', '#f59e0b', '#ec4899'];

// Istanze Chart.js
let chartPeso = null;
let chartPnl  = null;
let chartVar  = null;

// NAV correnti (aggiornabili via modal)
let navCorrente = {};

// ============================================================
// Calcola tutti i valori derivati
// calcAll(navMap) → { fondi: [...], totali: {...}, ac: [...] }
// navMap: { isin → { navAtt, errore } }
// DEVE essere definita PRIMA di initCharts()
// ============================================================
function calcAll(navMap) {
  const fondiCalc = FONDI.map(f => {
    const entry     = navMap[f.isin] || {};
    const navAtt    = entry.navAtt  ?? f.carico;
    const errore    = entry.errore  ?? false;
    const costoStor = f.carico * f.quote;
    const contro    = navAtt   * f.quote;
    const pnl       = contro   - costoStor;
    const varPct    = (navAtt  - f.carico) / f.carico;
    return { ...f, navAtt, errore, costoStor, contro, pnl, varPct };
  });

  const totCosto  = fondiCalc.reduce((s, f) => s + f.costoStor, 0);
  const totContro = fondiCalc.reduce((s, f) => s + f.contro,    0);
  const totPnl    = totContro - totCosto;
  const totVarPct = totCosto > 0 ? totPnl / totCosto : 0;

  const fondiFinale = fondiCalc.map(f => ({
    ...f,
    contributo: totCosto > 0 ? f.pnl / totCosto : 0,
    peso:       totContro > 0 ? f.contro / totContro : 0,
  }));

  const ac = AC_DEF.map(a => {
    const ff     = a.idxs.map(i => fondiFinale[i]);
    const costo  = ff.reduce((s, f) => s + f.costoStor, 0);
    const contro = ff.reduce((s, f) => s + f.contro,    0);
    const pnl    = contro - costo;
    const peso   = totContro > 0 ? contro / totContro : 0;
    return { nome: a.nome, costo, contro, pnl, peso };
  });

  return { fondi: fondiFinale, totali: { totCosto, totContro, totPnl, totVarPct }, ac };
}

// ============================================================
// Formattazione
// ============================================================
function eur(v) {
  return v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function pct(v) {
  return (v >= 0 ? '+' : '') + (v * 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}

function cls(v) {
  return v >= 0 ? 'pos' : 'neg';
}

// ============================================================
// Render card riepilogo
// ============================================================
function renderCards(totali) {
  document.getElementById('card-controvalore').textContent = eur(totali.totContro);
  document.getElementById('card-costo').textContent        = eur(totali.totCosto);

  const cardPnl = document.getElementById('card-pnl');
  cardPnl.textContent = eur(totali.totPnl);
  cardPnl.className   = 'card-value ' + cls(totali.totPnl);

  const cardPct = document.getElementById('card-pct');
  cardPct.textContent = pct(totali.totVarPct);
  cardPct.className   = 'card-value ' + cls(totali.totVarPct);
}

// ============================================================
// Render tabella fondi
// ============================================================
function renderTabella(fondi) {
  const tbody = document.getElementById('tbody-fondi');
  tbody.innerHTML = fondi.map(f => {
    const badgeWarn = f.errore
      ? '<span class="badge-warn">&#9888; NAV non aggiornato</span>'
      : '';
    return `
      <tr>
        <td>${f.nome}${badgeWarn}</td>
        <td style="color:var(--text-muted);font-size:11px">${f.isin}</td>
        <td class="num">${eur(f.carico)}</td>
        <td class="num">${eur(f.navAtt)}</td>
        <td class="num">${f.quote.toLocaleString('it-IT', { maximumFractionDigits: 2 })}</td>
        <td class="num">${eur(f.costoStor)}</td>
        <td class="num">${eur(f.contro)}</td>
        <td class="num ${cls(f.pnl)}">${eur(f.pnl)}</td>
        <td class="num ${cls(f.varPct)}">${pct(f.varPct)}</td>
        <td class="num">${pct(f.peso)}</td>
        <td class="num ${cls(f.contributo)}">${pct(f.contributo)}</td>
      </tr>`;
  }).join('');
}

// ============================================================
// Render tabella asset class
// ============================================================
function renderAC(ac) {
  const tbody = document.getElementById('tbody-ac');
  tbody.innerHTML = ac.map(a => `
    <tr>
      <td>${a.nome}</td>
      <td class="num">${eur(a.costo)}</td>
      <td class="num">${eur(a.contro)}</td>
      <td class="num ${cls(a.pnl)}">${eur(a.pnl)}</td>
      <td class="num">${pct(a.peso)}</td>
    </tr>
  `).join('');
}

// ============================================================
// Inizializza / aggiorna grafici Chart.js
// ============================================================
function initCharts(fondi) {
  if (typeof Chart === 'undefined') return;

  const nomi = fondi.map(f => f.nome.length > 28 ? f.nome.slice(0, 27) + '…' : f.nome);
  const pesi = fondi.map(f => +(f.peso * 100).toFixed(2));
  const pnls = fondi.map(f => +f.pnl.toFixed(2));
  const vars = fondi.map(f => +(f.varPct * 100).toFixed(2));

  const bgPnl = pnls.map(v => v >= 0 ? 'rgba(34,197,94,0.75)' : 'rgba(239,68,68,0.75)');
  const bgVar = vars.map(v => v >= 0 ? 'rgba(34,197,94,0.75)' : 'rgba(239,68,68,0.75)');

  const defaultOpts = {
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#8892a4', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#8892a4', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
    },
  };

  // Grafico donut peso
  if (!chartPeso) {
    chartPeso = new Chart(document.getElementById('chartPeso'), {
      type: 'doughnut',
      data: {
        labels: nomi,
        datasets: [{ data: pesi, backgroundColor: COLORI, borderWidth: 2, borderColor: '#1a1d2e' }],
      },
      options: {
        responsive: true,
        cutout: '65%',
        plugins: {
          legend: {
            display: true, position: 'bottom',
            labels: { color: '#8892a4', font: { size: 11 }, boxWidth: 12, padding: 10 },
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString('it-IT', { minimumFractionDigits: 2 })}%`,
            },
          },
        },
      },
    });
  } else {
    chartPeso.data.datasets[0].data = pesi;
    chartPeso.update();
  }

  // Grafico barre P&L
  const optsBar = {
    ...defaultOpts,
    indexAxis: 'y',
    responsive: true,
    plugins: {
      ...defaultOpts.plugins,
      tooltip: { callbacks: { label: ctx => ' ' + eur(ctx.parsed.x) } },
    },
    scales: {
      x: { ...defaultOpts.scales.x },
      y: { ticks: { color: '#8892a4', font: { size: 11 } }, grid: { display: false } },
    },
  };

  if (!chartPnl) {
    chartPnl = new Chart(document.getElementById('chartPnl'), {
      type: 'bar',
      data: { labels: nomi, datasets: [{ data: pnls, backgroundColor: bgPnl, borderRadius: 4 }] },
      options: optsBar,
    });
  } else {
    chartPnl.data.datasets[0].data            = pnls;
    chartPnl.data.datasets[0].backgroundColor = bgPnl;
    chartPnl.update();
  }

  // Grafico barre variazione %
  if (!chartVar) {
    chartVar = new Chart(document.getElementById('chartVar'), {
      type: 'bar',
      data: { labels: nomi, datasets: [{ data: vars, backgroundColor: bgVar, borderRadius: 4 }] },
      options: {
        ...optsBar,
        plugins: {
          ...optsBar.plugins,
          tooltip: {
            callbacks: { label: ctx => ' ' + ctx.parsed.x.toLocaleString('it-IT', { minimumFractionDigits: 2 }) + '%' },
          },
        },
      },
    });
  } else {
    chartVar.data.datasets[0].data            = vars;
    chartVar.data.datasets[0].backgroundColor = bgVar;
    chartVar.update();
  }
}

// ============================================================
// Aggiorna tutta la UI con un navMap
// ============================================================
function aggiornaUI(navMap) {
  const { fondi, totali, ac } = calcAll(navMap);
  renderCards(totali);
  renderTabella(fondi);
  renderAC(ac);
  initCharts(fondi);
}

// ============================================================
// Carica nav.json e aggiorna la UI
// Chiamata al caricamento pagina e dal bottone "Aggiorna i valori"
// ============================================================
async function loadNav() {
  const btnEl  = document.querySelector('.btn-primary');
  const dataEl = document.getElementById('data-aggiornamento');

  if (btnEl) { btnEl.disabled = true; btnEl.textContent = '⏳ Caricamento...'; }

  try {
    const res = await fetch(`nav.json?v=${Date.now()}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    // Aggiorna navCorrente da nav.json
    data.fondi.forEach(f => { navCorrente[f.isin] = { navAtt: f.navAtt, errore: f.errore }; });

    // Mostra data/ora del click come richiesto
    dataEl.textContent = 'Aggiornato: ' + new Date().toLocaleString('it-IT');

  } catch {
    // Fallback: usa il carico come NAV
    FONDI.forEach(f => { navCorrente[f.isin] = { navAtt: f.carico, errore: false }; });
    dataEl.textContent = 'Dati default (nav.json non disponibile)';
  }

  aggiornaUI(navCorrente);
  if (btnEl) { btnEl.disabled = false; btnEl.textContent = '↻ Aggiorna i valori'; }
}

// ============================================================
// Modal aggiornamento NAV manuale
// ============================================================
function openModalNav() {
  const container = document.getElementById('modal-inputs');
  container.innerHTML = FONDI.map(f => {
    const navAtt = navCorrente[f.isin]?.navAtt ?? f.carico;
    return `
      <div class="modal-row">
        <label>${f.nome}</label>
        <input type="number" step="0.0001" id="nav-input-${f.isin}"
               value="${navAtt.toLocaleString('it-IT', { minimumFractionDigits: 4 }).replace(',', '.')}">
      </div>`;
  }).join('');
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModalNav() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function applicaNavManuale() {
  FONDI.forEach(f => {
    const input = document.getElementById('nav-input-' + f.isin);
    if (!input) return;
    const val = parseFloat(input.value.replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      navCorrente[f.isin] = { navAtt: val, errore: false };
    }
  });
  closeModalNav();
  aggiornaUI(navCorrente);
}

// ============================================================
// Avvio
// ============================================================
loadNav();
