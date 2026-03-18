"""
fetch_nav.py
============
Scarica il NAV da Teleborsa.it per ogni fondo usando l'URL diretto
definito in fondi_config.json → campo "teleborsa".

Il NAV appare come numero nella pagina (es. "143,13") subito sotto
al titolo del fondo, prima del simbolo % della variazione.

Dipendenze:
    pip install -r scripts/requirements.txt
    (requests==2.31.0, beautifulsoup4==4.12.3)

Esecuzione:
    cd D:/Git_Claude/Projects/Fondi
    python scripts/fetch_nav.py
"""

import json
import re
import time
import logging
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT        = Path(__file__).parent.parent
CONFIG_FILE = ROOT / "fondi_config.json"
NAV_FILE    = ROOT / "nav.json"

DELAY_SECONDS = 3

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "it-IT,it;q=0.9",
    "Accept": "text/html,application/xhtml+xml,*/*",
}

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)


def fetch_nav_teleborsa(url: str, isin: str, session: requests.Session) -> float | None:
    """
    Legge il NAV dalla pagina Teleborsa del fondo.

    Struttura HTML rilevante:
      <h1>Nome fondo</h1>
      <div class="...">
        143,13       ← NAV come testo nel primo div numerico
        -0,66%
      </div>

    Strategia: prende tutti i testi numerici della pagina con il pattern
    decimale italiano (es. 143,13 oppure 21,99) e filtra per range NAV tipico.
    """
    try:
        r = session.get(url, headers=HEADERS, timeout=20)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")

        # Cerca il valore NAV: numero con 2-4 decimali, formato italiano (virgola)
        # Esclude percentuali (segno + o - prima o dopo), date, e numeri troppo grandi
        testo = soup.get_text(separator="\n")
        righe = [r.strip() for r in testo.splitlines() if r.strip()]

        for riga in righe:
            # Pattern: numero isolato con virgola decimale, es. "143,13" o "21,99"
            m = re.fullmatch(r"(\d{1,5}[,.]\d{2,4})", riga)
            if m:
                val = m.group(1).replace(".", "").replace(",", ".")
                nav = float(val)
                # Sanity check: range realistico per NAV fondi comuni
                if 0.5 < nav < 5000:
                    return nav

    except requests.exceptions.HTTPError as e:
        log.error(f"  [Teleborsa] HTTP {e}")
    except Exception as e:
        log.error(f"  [Teleborsa] errore: {e}")

    return None


def main():
    # Carica config
    raw = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    fondi = raw["fondi"] if isinstance(raw, dict) else raw

    # Carica nav.json precedente come fallback
    nav_precedente = {}
    if NAV_FILE.exists():
        try:
            old = json.loads(NAV_FILE.read_text(encoding="utf-8"))
            for f in old.get("fondi", []):
                nav_precedente[f["isin"]] = f.get("navAtt")
        except Exception:
            pass

    risultati   = []
    n_ok        = 0
    n_errori    = 0
    nomi_errori = []

    with requests.Session() as session:
        for idx, fondo in enumerate(fondi):
            isin = fondo["isin"]
            nome = fondo["nome"]
            url  = fondo.get("teleborsa", "")
            log.info(f"[{idx+1}/{len(fondi)}] {nome} ({isin})")

            nav_val = None
            errore  = True

            if url:
                nav_val = fetch_nav_teleborsa(url, isin, session)

            if nav_val is not None:
                log.info(f"  OK: NAV = {nav_val}")
                n_ok   += 1
                errore  = False
            else:
                # Fallback: mantieni ultimo valore valido
                nav_val = nav_precedente.get(isin)
                log.warning(f"  FALLBACK valore precedente = {nav_val}")
                n_errori += 1
                nomi_errori.append(nome)

            risultati.append({
                "nome":   nome,
                "isin":   isin,
                "navAtt": nav_val,
                "errore": errore,
            })

            if idx < len(fondi) - 1:
                time.sleep(DELAY_SECONDS)

    # Scrivi nav.json
    output = {
        "aggiornato":    datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "aggiornato_it": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "fondi":         risultati,
        "errori":        nomi_errori,
    }
    NAV_FILE.write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    log.info(f"\nDone. Aggiornati: {n_ok}, Errori: {n_errori}")
    log.info(f"Scritto: {NAV_FILE}")

    if n_ok == 0:
        raise SystemExit("Nessun NAV aggiornato")


if __name__ == "__main__":
    main()
