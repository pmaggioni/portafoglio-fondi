// ============================================================
// Dati statici del portafoglio
// ============================================================
const FONDI = [
  { idx: 0, nome: 'Lux Im Intermonte PIR Ita SmallMid', nomeBreve: 'Intermonte PIR Ita',    isin: 'LU1698605562', carico: 158.60, quote: 154.90, ac: 'az-it'  },
  { idx: 1, nome: 'Lux Im Goldman Sachs Global Eq Op',  nomeBreve: 'Goldman Sachs Global',  isin: 'LU1881760893', carico: 156.25, quote: 165.17, ac: 'az-gl'  },
  { idx: 2, nome: 'Lux Im Blackrock Credit Defensive St', nomeBreve: 'Blackrock Credit Def.',isin: 'LU0894903326', carico: 98.10,  quote: 312.66, ac: 'obbl'   },
  { idx: 3, nome: 'Ff World Fund E Acc Euro',            nomeBreve: 'Ff World Fund',         isin: 'LU0115769746', carico: 42.23,  quote: 567.44, ac: 'az-gl'  },
  { idx: 4, nome: 'Eurizon Az.Internaz.Etico',           nomeBreve: 'Eurizon Az.Etico',      isin: 'IT0001083424', carico: 17.85,  quote: 3316.86,ac: 'az-esg' },
  ];

// Asset class definitions
const AC_DEF = [
  { nome: 'Azionario Italia',   nomeBreve: 'Az. Italia',   idxs: [0],    cls: 'az-it'  },
  { nome: 'Azionario Globale',  nomeBreve: 'Az. Globale',  idxs: [1, 3], cls: 'az-gl'  },
  { nome: 'Obbligazionario',    nomeBreve: 'Obbligazionario', idxs: [2], cls: 'obbl'   },
  { nome: 'Azionario Intl ESG', nomeBreve: 'Az. Intl ESG', idxs: [4],    cls: 'az-esg' },
  ];

// Badge labels per asset class
const AC_LABELS = {
    'az-it':  'Azionario Italia',
    'az-gl':  'Azionario Globale',
    'obbl':   'Obbligazionario',
    'az-esg': 'Azionario Intl ESG',
};

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
// ============================================================
function calcAll(navMap) {
    const fondiCalc = FONDI.map(f => {
          const entry    = navMap[f.isin] || {};
          const navAtt   = entry.navAtt ?? f.carico;
          const errore   = entry.errore ?? false;
          const costoStor = f.carico * f.quote;
          const contro    = navAtt  * f.quote;
          const pnl       = contro - costoStor;
          const varPct    = (navAtt - f.carico) / f.carico;
          return { ...f, navAtt, errore, costoStor, contro, pnl, varPct };
    });

  const totCosto  = fondiCalc.reduce((s, f) => s + f.costoStor, 0);
    const totContro = fondiCalc.reduce((s, f) => s + f.contro,    0);
    const totPnl    = totContro - totCosto;
    const totVarPct = totCosto > 0 ? totPnl / totCosto : 0;

  const fondiFinale = fondiCalc.map(f => ({
        ...f,
        contributo: totCosto  > 0 ? f.pnl    / totCosto  : 0,
        peso:       totContro > 0 ? f.contro / totContro : 0,
  }));

  // Fondo migliore per variazione %
  const fondoMigliore = fondiFinale.reduce((best, f) => f.varPct > best.varPct ? f : best, fondiFinale[0]);

  const ac = AC_DEF.map(a => {
        const ff     = a.idxs.map(i => fondiFinale[i]);
        const costo  = ff.reduce((s, f) => s + f.costoStor, 0);
        const contro = ff.reduce((s, f) => s + f.contro,    0);
        const pnl    = contro - costo;
        const peso   = totContro > 0 ? contro / totContro : 0;
        return { ...a, costo, contro, pnl, peso };
  });

  return { fondi: fondiFinale, totali: { totCosto, totContro, totPnl, totVarPct }, ac, fondoMigliore };
}

// ============================================================
// Formattazione
// ============================================================
function eur(v) {
    return v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20ac';
}
function pct(v) {
    return (v >= 0 ? '+' : '') + (v * 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}
function cls(v) { return v >= 0 ? 'pos' : 'neg'; }

// Ritorna la classe CSS del badge per asset class
function acBadgeClass(acKey) {
    const map = { 'az-it': 'badge-az-it', 'az-gl': 'badge-az-gl', 'obbl': 'badge-obbl', 'az-esg': 'badge-az-esg' };
    return map[acKey] || '';
}

// ============================================================
// Render card riepilogo
// ============================================================
function renderCards(totali, fondoMigliore) {
    document.getElementById('card-controvalore').textContent = eur(totali.totContro);
    document.getElementById('card-nfondi').textContent = FONDI.length + ' fondi';
    document.getElementById('card-costo').textContent   = eur(totali.totCosto);

  const cardPnl = document.getElementById('card-pnl');
    cardPnl.textContent  = eur(totali.totPnl);
    cardPnl.className    = 'card-value ' + cls(totali.totPnl);

  const cardPct = document.getElementById('card-pct');
    cardPct.textContent  = '\u25b2 ' + (totali.totVarPct * 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    cardPct.className    = 'card-sub ' + cls(totali.totVarPct);

  // Fondo migliore — mostra nome breve
  const cardFM = document.getElementById('card-fondo-migliore');
    cardFM.textContent = fondoMigliore.nomeBreve;

  const cardFMpct = document.getElementById('card-fondo-migliore-pct');
    cardFMpct.textContent = (fondoMigliore.varPct >= 0 ? '+' : '') + (fondoMigliore.varPct * 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    cardFMpct.className = 'card-sub ' + cls(fondoMigliore.varPct);
}

// ============================================================
// Render tabella fondi
// ============================================================
function renderTabella(fondi, totali) {
    const tbody = document.getElementById('tbody-fondi');
    const maxPeso = Math.max(...fondi.map(f => f.peso));

  tbody.innerHTML = fondi.map(f => {
        const badgeWarn   = f.errore ? '<span class="badge-warn">\u26a0 NAV non aggiornato</span>' : '';
        const badgeAC     = '<span class="badge-ac ' + acBadgeClass(f.ac) + '">' + AC_LABELS[f.ac] + '</span>';
        const pesoBar     = '<div class="peso-bar-wrap"><span>' + pct(f.peso) + '</span><div class="peso-bar-track"><div class="peso-bar-fill" style="width:' + Math.round((f.peso / maxPeso) * 100) + '%"></div></div></div>';
        const contribSign = f.contributo >= 0 ? '+' : '';
        const contribVal  = contribSign + (f.contributo * 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
        const contribColor = f.contributo >= 0 ? '#22c55e' : '#ef4444';
        const contribBar  = '<div class="contrib-wrap"><span class="' + cls(f.contributo) + '">' + contribVal + '</span><div class="contrib-bar-track"><div class="contrib-bar-fill" style="width:60%;background:' + contribColor + '"></div></div></div>';

                                  return `
                                        <tr>
                                                <td>
                                                          <div class="fondo-nome">${f.nome}${badgeWarn}</div>
                                                                    <div class="fondo-sub">${AC_LABELS[f.ac]}</div>
                                                                            </td>
                                                                                    <td>${badgeAC}</td>
                                                                                            <td class="num">${f.carico.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                                                    <td class="num nav-attuale">${f.navAtt.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                                                            <td class="num">${f.quote.toLocaleString('it-IT', { maximumFractionDigits: 2 })}</td>
                                                                                                                    <td class="num">${eur(f.costoStor)}</td>
                                                                                                                            <td class="num">${eur(f.contro)}</td>
                                                                                                                                    <td class="num ${cls(f.pnl)}">${f.pnl >= 0 ? '\u25b2 ' : '\u25bc '}${eur(f.pnl)}</td>
                                                                                                                                            <td class="num ${cls(f.varPct)}">${pct(f.varPct)}</td>
                                                                                                                                                    <td class="num">${pesoBar}</td>
                                                                                                                                                            <td class="num">${contribBar}</td>
                                                                                                                                                                  </tr>`;
  }).join('');

  // Riga totale
  tbody.innerHTML += `
      <tr class="row-totale">
            <td colspan="5"><strong>TOTALE</strong></td>
                  <td class="num">${eur(totali.totCosto)}</td>
                        <td class="num">${eur(totali.totContro)}</td>
                              <td class="num ${cls(totali.totPnl)}">${totali.totPnl >= 0 ? '\u25b2 ' : '\u25bc '}${eur(totali.totPnl)}</td>
                                    <td class="num ${cls(totali.totVarPct)}">${pct(totali.totVarPct)}</td>
                                          <td class="num">100%</td>
                                                <td class="num ${cls(totali.totVarPct)}">${pct(totali.totVarPct)}</td>
                                                    </tr>`;
}

// ============================================================
// Render card Asset Class (bottom row)
// ============================================================
function renderACCards(ac) {
    const container = document.getElementById('ac-cards-grid');
    container.innerHTML = ac.map(a => `
        <div class="ac-card">
              <div class="ac-card-label">${a.nome}</div>
                    <div class="ac-card-pct">${(a.peso * 100).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</div>
                          <div class="ac-card-sub">${eur(a.contro)}</div>
                                <div class="ac-card-pnl ${cls(a.pnl)}">${a.pnl >= 0 ? '\u25b2' : '\u25bc'} ${eur(a.pnl)}</div>
                                    </div>
                                      `).join('');
}

// ============================================================
// Inizializza / aggiorna grafici Chart.js
// ============================================================
function initCharts(fondi) {
    if (typeof Chart === 'undefined') return;

  const nomi = fondi.map(f => f.nomeBreve);
    const pesi = fondi.map(f => +(f.peso * 100).toFixed(2));
    const pnls = fondi.map(f => +f.pnl.toFixed(2));
    const vars = fondi.map(f => +(f.varPct * 100).toFixed(2));
    const bgPnl = pnls.map(v => v >= 0 ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.8)');
    const bgVar = vars.map(v => v >= 0 ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.8)');

  const tickStyle = { color: '#8892a4', font: { size: 11 } };
    const gridStyle = { color: 'rgba(255,255,255,0.06)' };

  const optsBar = {
        indexAxis: 'y',
        responsive: true,
        plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => ' ' + eur(ctx.parsed.x) } },
        },
        scales: {
                x: { ticks: tickStyle, grid: gridStyle },
                y: { ticks: { ...tickStyle, font: { size: 11 } }, grid: { display: false } },
        },
  };

  // Donut peso
  if (!chartPeso) {
        chartPeso = new Chart(document.getElementById('chartPeso'), {
                type: 'doughnut',
                data: {
                          labels: nomi,
                          datasets: [{ data: pesi, backgroundColor: COLORI, borderWidth: 2, borderColor: '#161b22' }],
                },
                options: {
                          responsive: true,
                          cutout: '62%',
                          plugins: {
                                      legend: {
                                                    display: true, position: 'bottom',
                                                    labels: { color: '#8892a4', font: { size: 11 }, boxWidth: 12, padding: 8 },
                                      },
                                      tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString('it-IT', { minimumFractionDigits: 2 })}%` } },
                          },
                },
        });
  } else {
        chartPeso.data.datasets[0].data = pesi;
        chartPeso.update();
  }

  // P&L bar
  if (!chartPnl) {
        chartPnl = new Chart(document.getElementById('chartPnl'), {
                type: 'bar',
                data: { labels: nomi, datasets: [{ data: pnls, backgroundColor: bgPnl, borderRadius: 3 }] },
                options: optsBar,
        });
  } else {
        chartPnl.data.datasets[0].data = pnls;
        chartPnl.data.datasets[0].backgroundColor = bgPnl;
        chartPnl.update();
  }

  // Variazione % bar
  const optsVar = {
        ...optsBar,
        plugins: {
                ...optsBar.plugins,
                tooltip: { callbacks: { label: ctx => ' ' + ctx.parsed.x.toLocaleString('it-IT', { minimumFractionDigits: 2 }) + '%' } },
        },
  };
    if (!chartVar) {
          chartVar = new Chart(document.getElementById('chartVar'), {
                  type: 'bar',
                  data: { labels: nomi, datasets: [{ data: vars, backgroundColor: bgVar, borderRadius: 3 }] },
                  options: optsVar,
          });
    } else {
          chartVar.data.datasets[0].data = vars;
          chartVar.data.datasets[0].backgroundColor = bgVar;
          chartVar.update();
    }
}

// ============================================================
// Aggiorna tutta la UI
// ============================================================
function aggiornaUI(navMap) {
    const { fondi, totali, ac, fondoMigliore } = calcAll(navMap);
    renderCards(totali, fondoMigliore);
    renderTabella(fondi, totali);
    renderACCards(ac);
    initCharts(fondi);
}

// ============================================================
// Carica nav.json e aggiorna la UI
// ============================================================
async function loadNav() {
    const btnEl  = document.querySelector('.btn-ricalcola');
    const dataEl = document.getElementById('data-aggiornamento');
    if (btnEl) { btnEl.disabled = true; btnEl.textContent = '\u23f3 Caricamento...'; }
    try {
          const res  = await fetch(`nav.json?v=${Date.now()}`);
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          data.fondi.forEach(f => { navCorrente[f.isin] = { navAtt: f.navAtt, errore: f.errore }; });
          dataEl.textContent = new Date().toLocaleString('it-IT');
    } catch {
          FONDI.forEach(f => { navCorrente[f.isin] = { navAtt: f.carico, errore: false }; });
          dataEl.textContent = 'Dati default (nav.json non disponibile)';
    }
    aggiornaUI(navCorrente);
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = '\u8635 Ricalcola'; }
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
          if (!isNaN(val) && val > 0) navCorrente[f.isin] = { navAtt: val, errore: false };
    });
    closeModalNav();
    aggiornaUI(navCorrente);
}

// ============================================================
// Avvio
// ============================================================
loadNav();
