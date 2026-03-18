# CLAUDE.md — Progetto Fondi

## Contesto
Dashboard web per monitoraggio portafoglio fondi comuni di investimento.
Aggiornamento NAV automatico via GitHub Actions + scraper Python.
Hosting statico su GitHub Pages.

## Stack
- **Frontend**: HTML + CSS + JS vanilla (no framework), Chart.js 4.4.1 da CDN
- **Scraper**: Python 3.12, requests, beautifulsoup4
- **CI/CD**: GitHub Actions (cron giornaliero)
- **Hosting**: GitHub Pages (repo pubblico o privato con piano a pagamento)

## Struttura file
```
Fondi/
├── index.html                   # struttura HTML pura, niente CSS/JS inline
├── style.css                    # tutto il CSS, variabili CSS in :root
├── app.js                       # dati statici + logica + grafici
├── nav.json                     # generato da fetch_nav.py, letto da app.js
├── fondi_config.json            # ISIN + dati statici (fonte verità per lo script)
├── scripts/
│   ├── fetch_nav.py             # scraper NAV
│   └── requirements.txt        # requests==2.31.0, beautifulsoup4==4.12.3
└── .github/
    └── workflows/
        └── update_nav.yml       # cron lun-ven 20:30 UTC
```

## Portafoglio
| # | Nome fondo | ISIN | Carico (€) | Quote |
|---|---|---|---|---|
| 0 | Lux Im Intermonte PIR Ita SmallMid | LU1698605562 | 158.60 | 154.90 |
| 1 | Lux Im Goldman Sachs Global Eq Op | DA TROVARE | 156.25 | 165.17 |
| 2 | Lux Im Blackrock Credit Defensive St | DA TROVARE | 98.10 | 312.66 |
| 3 | Ff World Fund E Acc Euro | DA TROVARE | 42.23 | 567.44 |
| 4 | Eurizon Az.Internaz.Etico | IT0001083424 | 17.85 | 3316.86 |

**Nota ISIN mancanti**: cerca su Morningstar.it o Borsa Italiana per ISIN #1, #2, #3.
Se non li trovi, segna `errore: true` in nav.json e mostra warning giallo in tabella.

## Asset class
```js
AC_DEF = [
  { nome: "Azionario Italia",   idxs: [0] },
  { nome: "Azionario Globale",  idxs: [1, 3] },
  { nome: "Obbligazionario",    idxs: [2] },
  { nome: "Azionario Intl ESG", idxs: [4] },
]
```

## Logica nav.json
- `app.js` fa `fetch('nav.json?v=timestamp')` al caricamento (cache-busting)
- Se `nav.json` non esiste o è corrotto → usa i valori default hardcoded in `app.js`
- Se un fondo ha `errore: true` → mostra badge `⚠ NAV non aggiornato` in tabella
- Il modal "Aggiorna NAV" permette override manuale (non sovrascrive nav.json)

## Scraper fetch_nav.py
Cascata sorgenti per ogni ISIN:
1. **Morningstar search** `https://www.morningstar.it/it/util/SecuritySearch.aspx?q={ISIN}`
2. **Morningstar screener REST** `https://lt.morningstar.com/api/rest.svc/.../security/screener`
3. **Borsa Italiana** `https://www.borsaitaliana.it/borsa/fondi/ricerca.html?isin={ISIN}`

Se tutte e tre falliscono → mantieni il valore precedente da nav.json (`errore: true`).
Pausa 2 secondi tra un fondo e l'altro (evita rate-limit).

## Calcoli
- `costo_storico = carico * quote`
- `controvalore  = navAtt * quote`
- `pnl           = controvalore - costo_storico`
- `var_pct       = (navAtt - carico) / carico`
- `contributo    = pnl_fondo / totale_costo_storico`
- `peso          = controvalore_fondo / totale_controvalore`

## Stile UI
- Dark theme, colori in variabili CSS (`--bg`, `--accent`, `--green`, `--red`, ecc.)
- Verde `#22c55e` per positivo, rosso `#ef4444` per negativo
- Grafici: donut peso, barre orizzontali P&L, barre orizzontali variazione %
- Formattazione italiana: `toLocaleString('it-IT')`, separatore decimale `,`

## Regole codice
- Niente framework, niente build tool — file statici puri
- Commenti in italiano
- `calcAll()` deve essere definita PRIMA di `initCharts()` nello script
- Guard su Chart.js: `if (typeof Chart === 'undefined') return`
- Guard su grafici: `if (!chartPeso || !chartPnl || !chartVar) return`
- Niente `localStorage` — tutto in memoria

## Deploy GitHub Pages
```
Settings → Pages → Source: main branch, / (root)
URL: https://pmaggioni.github.io/Fondi/
```
Il workflow GitHub Actions ha permesso `contents: write` implicito
(non serve secret aggiuntivo per il push di nav.json).

## Ambiente locale (Windows - Fisso)
- Oracle: `C:\app\pmagg\product\12.1.0\dbhome_1`
- Claude Code: installato, API key configurata
- Git: disponibile in PATH
- Python: verificare con `python --version` prima di testare fetch_nav.py
