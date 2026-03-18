// =====================================================================
// DATI PORTAFOGLIO
// Aggiorna manualmente: carico = NAV medio acquisto, quote = n° quote,
// navAtt = NAV attuale (modificabile anche dal modal)
// =====================================================================
const FONDI = [
  {
    nome:   "Lux Im Intermonte PIR Ita SmallMid",
    classe: "Azionario Italia",
    badge:  "badge-az-it",
    carico: 158.60,
    quote:  154.90,
    navAtt: 144.62,
  },
  {
    nome:   "Lux Im Goldman Sachs Global Eq Op",
    classe: "Azionario Globale",
    badge:  "badge-az-gl",
    carico: 156.25,
    quote:  165.17,
    navAtt: 179.41,
  },
  {
    nome:   "Lux Im Blackrock Credit Defensive St",
    classe: "Obbligazionario",
    badge:  "badge-ob",
    carico: 98.10,
    quote:  312.66,
    navAtt: 104.14,
  },
  {
    nome:   "Ff World Fund E Acc Euro",
    classe: "Azionario Globale",
    badge:  "badge-az-gl",
    carico: 42.23,
    quote:  567.44,
    navAtt: 53.12,
  },
  {
    nome:   "Eurizon Az.Internaz.Etico",
    classe: "Azionario Intl ESG",
    badge:  "badge-esg",
    carico: 17.85,
    quote:  3316.86,
    navAtt: 21.99,
  },
];

// Raggruppamenti per asset class (idxs = indici in FONDI)
const AC_DEF = [
  { nome: "Azionario Italia",   idxs: [0] },
  { nome: "Azionario Globale",  idxs: [1, 3] },
  { nome: "Obbligazionario",    idxs: [2] },
  { nome: "Azionario Intl ESG", idxs: [4] },
];

// =====================================================================
// FORMATTAZIONE
// =====================================================================
const fmtEur = v => v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const fmtPct = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%';
const fmtNum = v => v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cls    = v => v >= 0 ? 'pos' : 'neg';
const arrow  = v => v >= 0 ? '▲' : '▼';

// Nome breve per le label dei grafici
const shortName = f => f.nome.replace('Lux Im ', '').replace(' St', '').split(' ').slice(0, 3).join(' ');

// =====================================================================
// CALCOLI
// Definita prima di initCharts() — se Chart.js fallisce il caricamento,
// i bottoni restano funzionanti (solo i grafici vengono saltati)
// =====================================================================
function calcAll() {
  const totCtv   = FONDI.reduce((s, f) => s + f.navAtt * f.quote, 0);
  const totCosto = FONDI.reduce((s, f) => s + f.carico * f.quote, 0);
  const totPnl   = totCtv - totCosto;
  const totVar   = totPnl / totCosto;

  // --- KPI ---
  document.getElementById('kpi-ctv').textContent   = fmtEur(totCtv);
  document.getElementById('kpi-costo').textContent = fmtEur(totCosto);

  const pnlEl = document.getElementById('kpi-pnl');
  pnlEl.textContent = fmtEur(totPnl);
  pnlEl.className   = 'kpi-value ' + cls(totPnl);
  document.getElementById('kpi-pnl-pct').textContent = arrow(totVar) + ' ' + fmtPct(totVar);

  // Fondo con rendimento % più alto
  const best = FONDI.reduce((b, f) =>
    (f.navAtt - f.carico) / f.carico > (b.navAtt - b.carico) / b.carico ? f : b
  );
  document.getElementById('kpi-best').textContent     = best.nome.split(' ').slice(-2).join(' ');
  document.getElementById('kpi-best-sub').textContent = fmtPct((best.navAtt - best.carico) / best.carico);

  // --- Tabella ---
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';
  FONDI.forEach(f => {
    const ctv        = f.navAtt * f.quote;
    const costo      = f.carico * f.quote;
    const pnl        = ctv - costo;
    const var_       = (f.navAtt - f.carico) / f.carico;
    const peso       = ctv / totCtv;
    const contributo = pnl / totCosto;   // contributo al rendimento totale sul costo storico
    const barW       = Math.round(peso * 80);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="fondo-name">${f.nome}</div>
        <div class="fondo-isin">${f.classe}</div>
      </td>
      <td><span class="badge ${f.badge}">${f.classe}</span></td>
      <td>${fmtNum(f.carico)}</td>
      <td style="color:var(--accent)">${fmtNum(f.navAtt)}</td>
      <td>${fmtNum(f.quote)}</td>
      <td>${fmtEur(costo)}</td>
      <td style="font-weight:600">${fmtEur(ctv)}</td>
      <td class="${cls(pnl)}" style="font-weight:600">${arrow(pnl)} ${fmtEur(pnl)}</td>
      <td class="${cls(var_)}" style="font-weight:700">${fmtPct(var_)}</td>
      <td>
        <div class="bar-wrap">
          <span style="color:var(--muted);font-size:11px">${(peso * 100).toFixed(1)}%</span>
          <div class="bar" style="width:${barW}px"></div>
        </div>
      </td>
      <td class="${cls(contributo)}" style="font-weight:600">${contributo >= 0 ? '+' : ''}${(contributo * 100).toFixed(2)}%</td>`;
    tbody.appendChild(tr);
  });

  // --- Footer tabella ---
  document.getElementById('tfoot').innerHTML = `
    <td>TOTALE</td><td></td><td></td><td></td><td></td>
    <td>${fmtEur(totCosto)}</td>
    <td>${fmtEur(totCtv)}</td>
    <td class="${cls(totPnl)}">${arrow(totPnl)} ${fmtEur(totPnl)}</td>
    <td class="${cls(totVar)}">${fmtPct(totVar)}</td>
    <td>100%</td>
    <td class="${cls(totVar)}">${totVar >= 0 ? '+' : ''}${(totVar * 100).toFixed(2)}%</td>`;

  // --- Asset class cards ---
  const acGrid = document.getElementById('ac-grid');
  acGrid.innerHTML = '';
  AC_DEF.forEach(ac => {
    const ctv_ac   = ac.idxs.reduce((s, i) => s + FONDI[i].navAtt * FONDI[i].quote, 0);
    const costo_ac = ac.idxs.reduce((s, i) => s + FONDI[i].carico * FONDI[i].quote, 0);
    const pnl_ac   = ctv_ac - costo_ac;
    const peso_ac  = ctv_ac / totCtv;
    const div = document.createElement('div');
    div.className = 'ac-card';
    div.innerHTML = `
      <div class="ac-name">${ac.nome}</div>
      <div class="ac-peso">${(peso_ac * 100).toFixed(1)}%</div>
      <div class="ac-ctv">${fmtEur(ctv_ac)}</div>
      <div class="ac-pnl ${cls(pnl_ac)}">${arrow(pnl_ac)} ${fmtEur(pnl_ac)}</div>`;
    acGrid.appendChild(div);
  });

  // --- Grafici ---
  updateCharts(totCtv);

  // --- Timestamp ---
  const now = new Date().toLocaleString('it-IT');
  document.getElementById('ts').textContent  = now;
  document.getElementById('ts2').textContent = 'Ultimo calcolo: ' + now;
}

// =====================================================================
// GRAFICI
// initCharts() chiamata dopo calcAll per non bloccare nulla in caso
// di problemi con Chart.js (CDN down, offline, ecc.)
// =====================================================================
const PALETTE = ['#4f8ef7', '#22c55e', '#f59e0b', '#a78bfa', '#ef4444'];

let chartPeso = null;
let chartPnl  = null;
let chartVar  = null;

function initCharts() {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js non disponibile — grafici disabilitati');
    return;
  }

  const BASE_OPTS = { responsive: true, maintainAspectRatio: false };

  chartPeso = new Chart(document.getElementById('chartPeso').getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: FONDI.map(shortName),
      datasets: [{ data: [], backgroundColor: PALETTE, borderColor: '#1a1d27', borderWidth: 2, hoverOffset: 6 }]
    },
    options: {
      ...BASE_OPTS,
      cutout: '62%',
      plugins: {
        legend: {
          display: true, position: 'right',
          labels: { color: '#94a3b8', font: { size: 10, family: 'Segoe UI' }, boxWidth: 10, padding: 8 }
        },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed.toFixed(1)}%` } }
      }
    }
  });

  chartPnl = new Chart(document.getElementById('chartPnl').getContext('2d'), {
    type: 'bar',
    data: {
      labels: FONDI.map(shortName),
      datasets: [{ data: [], backgroundColor: [], borderRadius: 4, borderSkipped: false }]
    },
    options: {
      ...BASE_OPTS,
      indexAxis: 'y',
      scales: {
        x: {
          grid: { color: '#2e3350' },
          ticks: { color: '#64748b', font: { size: 10 },
            callback: v => (v >= 0 ? '+' : '') + v.toLocaleString('it-IT', { minimumFractionDigits: 0 }) + ' €'
          }
        },
        y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } }
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` P&L: ${ctx.parsed.x >= 0 ? '+' : ''}${ctx.parsed.x.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €` } }
      }
    }
  });

  chartVar = new Chart(document.getElementById('chartVar').getContext('2d'), {
    type: 'bar',
    data: {
      labels: FONDI.map(shortName),
      datasets: [{ data: [], backgroundColor: [], borderRadius: 4, borderSkipped: false }]
    },
    options: {
      ...BASE_OPTS,
      indexAxis: 'y',
      scales: {
        x: {
          grid: { color: '#2e3350' },
          ticks: { color: '#64748b', font: { size: 10 },
            callback: v => (v >= 0 ? '+' : '') + v.toFixed(1) + '%'
          }
        },
        y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } }
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` Var: ${ctx.parsed.x >= 0 ? '+' : ''}${ctx.parsed.x.toFixed(2)}%` } }
      }
    }
  });
}

function updateCharts(totCtv) {
  if (!chartPeso || !chartPnl || !chartVar) return;

  const pesi = FONDI.map(f => parseFloat(((f.navAtt * f.quote / totCtv) * 100).toFixed(2)));
  const pnls = FONDI.map(f => parseFloat(((f.navAtt - f.carico) * f.quote).toFixed(2)));
  const vars = FONDI.map(f => parseFloat(((f.navAtt - f.carico) / f.carico * 100).toFixed(4)));

  chartPeso.data.datasets[0].data = pesi;
  chartPeso.update('none');

  chartPnl.data.datasets[0].data            = pnls;
  chartPnl.data.datasets[0].backgroundColor = pnls.map(v => v >= 0 ? '#22c55e' : '#ef4444');
  chartPnl.update('none');

  chartVar.data.datasets[0].data            = vars;
  chartVar.data.datasets[0].backgroundColor = vars.map(v => v >= 0 ? '#22c55e' : '#ef4444');
  chartVar.update('none');
}

// =====================================================================
// MODAL aggiornamento NAV
// =====================================================================
function openModal() {
  const container = document.getElementById('modal-fields');
  container.innerHTML = '';
  FONDI.forEach((f, i) => {
    const row = document.createElement('div');
    row.className = 'modal-row';
    row.innerHTML = `
      <div class="modal-label">${f.nome.split(' ').slice(0, 4).join(' ')}</div>
      <input class="modal-input" type="number" step="0.0001" id="nav-modal-${i}" value="${f.navAtt}">`;
    container.appendChild(row);
  });
  document.getElementById('overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('overlay').classList.remove('open');
}

function saveModal() {
  FONDI.forEach((f, i) => {
    const val = parseFloat(document.getElementById(`nav-modal-${i}`).value);
    if (!isNaN(val) && val > 0) f.navAtt = val;
  });
  closeModal();
  calcAll();
}

// Chiudi modal cliccando fuori
document.getElementById('overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

// =====================================================================
// INIT
// =====================================================================
initCharts();
calcAll();
