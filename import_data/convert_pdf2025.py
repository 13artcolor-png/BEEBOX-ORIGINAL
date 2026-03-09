"""
Convertit les PDFs de PFD2025 en fichiers CSV gerance_2025_XX.csv

Format cible:
  Immeuble;Adresse;Box N°;Code Lot;Taille;Code Locataire;Nom Locataire;
  Loyer (€);Assurance (€);TVA (€);Total Quittancé (€);Total Réglé (€);Solde (€);Période

Approche: extraction par positions X pour distinguer colonnes Q/R/S
  Q (Quittancé) : x0 < 420
  R (Réglé)     : 420 ≤ x0 < 480
  S (Solde)     : x0 ≥ 480

Règles métier:
 - Un locataire peut louer plusieurs boxes → une ligne par lot (box)
 - Lots multi-pages: le header répété est ignoré (même box+code_lot)
 - Section "Détail règlements / Mouvements" ignorée
 - Locataires partis → toujours dans la base, juste plus dans les boxes
"""
import pdfplumber
import re
import os

PDF_DIR = r'C:/Users/ragot/OneDrive/Bureau/beeboxlaon-original/import_data/2025/gerance'
OUT_DIR = r'C:/Users/ragot/OneDrive/Bureau/beeboxlaon-original/import_data/2025/gerance'
IMMEUBLE = 'R69'
ADRESSE  = '58 RUE DE MANOISE 02000 LAON'

PDF_MONTH = {
    'document.pdf':       '01',
    'document (1).pdf':   '02',
    'document (2).pdf':   '03',
    'document (3).pdf':   '04',
    'document (4).pdf':   '05',
    'document (5).pdf':   '06',
    'document (6).pdf':   '07',
    'document (7).pdf':   '08',
    'document (8).pdf':   '09',
    'document (9).pdf':   '10',
    'document (10).pdf':  '11',
    'document (12).pdf':  '12',
}

CSV_HEADER = (
    'Immeuble;Adresse;Box N°;Code Lot;Taille;Code Locataire;Nom Locataire;'
    'Loyer (€);Assurance (€);TVA (€);Total Quittancé (€);Total Réglé (€);Solde (€);Période'
)

# Colonnes financières (positions X dans le PDF)
COL_Q_MAX  = 420   # Quittancé: x0 < 420
COL_R_MAX  = 480   # Réglé:     420 ≤ x0 < 480
                   # Solde:     x0 ≥ 480

SKIP_KEYWORDS = [
    'ADMINISTRATEUR DE BIENS', 'RUE DE LA REPUBLIQUE', 'CPI 0201', 'SOCAF',
    'COMPTE RENDU DE GERANCE', 'S.C.I. 13 BIS', 'CHAUNY', 'Immeuble :',
    '02000 LAON', 'Situation Locative',
]
STOP_KEYWORDS = [
    'tail des r', 'glements du solde', 'Mouvements des immeubles',
    'Mouvements du propri', 'Total Situation Locative',
]


# ---------------------------------------------------------------------------
# Utilitaires
# ---------------------------------------------------------------------------

def fmt(f):
    return f'{f:.2f}'.replace('.', ',')

def parse_amount(s):
    if not s:
        return 0.0
    try:
        return float(str(s).strip().replace(' ', '').replace(',', '.'))
    except Exception:
        return 0.0

def normalize_taille(raw):
    raw = raw.strip()
    raw = re.sub(r'^(?:DE|de|/|-)\s*', '', raw)
    raw = re.sub(r'M[²2]', 'M2', raw)
    raw = re.sub(r'(\d)\s*Box\b', r'\1M3', raw, flags=re.IGNORECASE)
    raw = re.sub(r'\s*(?:OU|ou|/)\s*', ' / ', raw)
    raw = re.sub(r'\s+', ' ', raw)
    return raw.strip()

def is_skip(text):
    for kw in SKIP_KEYWORDS:
        if kw in text:
            return True
    if re.match(r'^\d{2} RUE ', text):
        return True
    return False

def is_stop(text):
    for kw in STOP_KEYWORDS:
        if kw in text:
            return True
    return False


# ---------------------------------------------------------------------------
# Extraction de lignes avec positions X
# ---------------------------------------------------------------------------

def _page_to_lines(page):
    """
    Retourne une liste de (text, words) par ligne du PDF.
    'words' = liste de dicts pdfplumber avec x0, top, text.
    """
    words = page.extract_words(x_tolerance=3, y_tolerance=3)
    if not words:
        return []

    # Grouper par y (même ligne = y à ±2 pts)
    buckets = {}
    for w in words:
        y = round(w['top'])
        matched = None
        for ky in buckets:
            if abs(ky - y) <= 2:
                matched = ky
                break
        if matched is not None:
            buckets[matched].append(w)
        else:
            buckets[y] = [w]

    result = []
    for y in sorted(buckets):
        ws = sorted(buckets[y], key=lambda w: w['x0'])
        text = ' '.join(w['text'] for w in ws)
        result.append((text, ws))
    return result


def _qrs_from_words(words):
    """
    Extrait les montants Q, R, S en utilisant la position X.
    Q: x0 < COL_Q_MAX  |  R: COL_Q_MAX ≤ x0 < COL_R_MAX  |  S: x0 ≥ COL_R_MAX
    """
    q = r = s = 0.0
    for w in words:
        txt = w['text'].replace(' ', '')
        if not re.match(r'^-?\d+,\d{2}$', txt):
            continue
        amount = parse_amount(txt)
        x = w['x0']
        if x < COL_Q_MAX:
            q += amount
        elif x < COL_R_MAX:
            r += amount
        else:
            s += amount
    return q, r, s


# ---------------------------------------------------------------------------
# Parseur principal
# ---------------------------------------------------------------------------

def extract_lots(pdf_path, default_period=''):
    """Lit un PDF et retourne une liste de dicts (un par lot/box)."""
    with pdfplumber.open(pdf_path) as pdf:
        raw_lines = []
        for page in pdf.pages:
            raw_lines.extend(_page_to_lines(page))

    # Prétraitement: fusionner "(XXXX)" ou "(XXXXX)" isolés sur la ligne suivante
    # Cas courant: "Lot :Box N°1 - 23 M²" | "(0001)" → "Lot :Box N°1 - 23 M² (0001)"
    # et          "Locataire : NOM"        | "(50745)" → "Locataire : NOM (50745)"
    all_lines = []
    k = 0
    while k < len(raw_lines):
        text, words = raw_lines[k]
        if k + 1 < len(raw_lines):
            nxt_text, nxt_words = raw_lines[k + 1]
            if re.match(r'^\(\d{4,5}\)$', nxt_text.strip()):
                text  = text + ' ' + nxt_text
                words = words + nxt_words
                k += 1  # consommer la ligne suivante
        all_lines.append((text, words))
        k += 1

    lots    = []
    current = None
    stop    = False

    n = len(all_lines)
    i = 0
    while i < n:
        text, words = all_lines[i]

        if is_skip(text):
            i += 1
            continue

        if is_stop(text):
            stop = True
        if stop:
            i += 1
            continue

        # ----------------------------------------------------------------
        # Lot header: "Lot :Box N°X ... (CODE)"
        # Le numéro de box peut être absent (tronqué en bas de page)
        # → dériver du code_lot (ex: "(0005)" → box "5")
        # ----------------------------------------------------------------
        lot_m = re.match(
            r'Lot\s*:(?:Box|BOX)\s*(?:N[°o\s]*(\d+))?\s*[-/\s]*(.*?)\((\d{4})\)',
            text, re.IGNORECASE
        )
        if lot_m:
            code_lot = lot_m.group(3)
            box_num  = lot_m.group(1) or str(int(code_lot))   # fallback: code → numéro
            taille   = normalize_taille(lot_m.group(2))

            # Lot multi-pages: même box+code répété → ignorer
            if (current
                    and current['box'] == box_num
                    and current['code_lot'] == code_lot):
                i += 1
                continue

            # Finaliser lot précédent
            if current:
                row = _finalize(current, default_period)
                if row:
                    lots.append(row)

            current = {
                'box': box_num, 'code_lot': code_lot, 'taille': taille,
                'locataires': [], 'cur_loc': None,
                'total_q': None, 'total_r': None, 'total_s': None,
            }
            i += 1
            continue

        if current is None:
            i += 1
            continue

        # ----------------------------------------------------------------
        # Locataire: "Locataire : NOM (CODE)"
        # ----------------------------------------------------------------
        loc_m = re.match(r'Locataire\s*:\s*(.+?)\s*\((\d{5})\)', text)
        if loc_m:
            if current['cur_loc'] is not None:
                current['locataires'].append(current['cur_loc'])

            nom  = loc_m.group(1).strip()
            code = loc_m.group(2)

            # Nom sur deux lignes (ex: fin de page "MME MARTIN" / "MARIE")
            if i + 1 < n:
                nxt_text = all_lines[i + 1][0]
                if (
                    re.match(r'^[A-Z]', nxt_text)
                    and len(nxt_text) < 40
                    and not re.match(r'^\d{2}/\d{2}/\d{4}', nxt_text)
                    and not re.match(r'^(Locataire|Lot|Total|Solde)', nxt_text, re.I)
                    and not re.search(r'\d+,\d{2}', nxt_text)
                ):
                    nom += ' ' + nxt_text.strip()
                    i += 1

            current['cur_loc'] = {
                'nom': nom, 'code': code,
                'loyer': 0.0, 'assurance': 0.0, 'tva': 0.0,
                'periode': '',
            }
            i += 1
            continue

        loc = current['cur_loc']

        # ----------------------------------------------------------------
        # Total Général du lot → Q / R / S via positions X
        # ----------------------------------------------------------------
        if re.match(r'Total\s+.{0,15}du\s+lot', text, re.I):
            q, r, s = _qrs_from_words(words)
            has_numbers = any(re.match(r'^-?\d+,\d{2}$', w['text']) for w in words)
            if has_numbers:
                current['total_q'] = fmt(q)
                current['total_r'] = fmt(r)
                current['total_s'] = fmt(s) if s else fmt(q - r)
            i += 1
            continue

        # Ignorer autres lignes Total/Solde
        if re.match(r'(Total|Solde)', text, re.I):
            i += 1
            continue

        if loc is None:
            i += 1
            continue

        # ----------------------------------------------------------------
        # Transaction avec date ("01/01/2025 Loyer box (05) 90,00 ...")
        # ----------------------------------------------------------------
        trans_m = re.match(r'^(\d{2}/\d{2}/\d{4})\s+(.*)', text)
        if trans_m:
            _process_transaction(loc, trans_m.group(1), trans_m.group(2), words)
            i += 1
            continue

        # Transaction sans date ("Loyer box (05) 90,00" / "Appel Assurance ...")
        if re.match(r'^(Loyer|Appel\s+Assurance|Assurance|Rappel|TVA)', text, re.I):
            _process_transaction(loc, '', text, words)
            i += 1
            continue

        i += 1

    # Dernier lot
    if current:
        row = _finalize(current)
        if row:
            lots.append(row)

    return lots


def _process_transaction(loc, date_str, desc, words):
    """Enregistre un montant de transaction sur le locataire courant."""
    # Utiliser la colonne Q (quittancé) pour le montant principal
    q, r, s = _qrs_from_words(words)
    amount = q  # montant quittancé de cette ligne

    # Fallback si _qrs ne trouve rien (pas dans la zone Q)
    if amount == 0.0:
        nums = re.findall(r'-?\d+,\d{2}', desc)
        if nums:
            amount = parse_amount(nums[0])

    if date_str and not loc['periode']:
        loc['periode'] = date_str

    desc_up = desc.upper()
    if 'ASSURANCE' in desc_up:
        loc['assurance'] += amount
    elif 'TVA' in desc_up:
        loc['tva'] += amount
    elif any(k in desc_up for k in ('LOYER', 'GARAGE', 'RAPPEL')):
        loc['loyer'] += amount


def _finalize(current, default_period=''):
    """Construit le dict CSV final. Retourne None si lot vide."""
    if current['cur_loc'] is not None:
        current['locataires'].append(current['cur_loc'])

    locs = current['locataires']

    # Lot vide (header sans contenu)
    if not locs and current['total_q'] is None:
        return None

    # Locataire principal = le dernier (transition = locataire actif)
    loc = locs[-1] if locs else {
        'nom': '', 'code': '', 'loyer': 0.0,
        'assurance': 0.0, 'tva': 0.0, 'periode': ''
    }

    total_q = current['total_q'] or fmt(loc['loyer'] + loc['assurance'] + loc['tva'])
    total_r = current['total_r'] or '0,00'
    total_s = current['total_s'] or fmt(parse_amount(total_q) - parse_amount(total_r))

    return {
        'immeuble':       IMMEUBLE,
        'adresse':        ADRESSE,
        'box':            current['box'],
        'code_lot':       current['code_lot'],
        'taille':         current['taille'],
        'code_locataire': loc['code'],
        'nom_locataire':  loc['nom'],
        'loyer':          fmt(loc['loyer']),
        'assurance':      fmt(loc['assurance']),
        'tva':            fmt(loc['tva']),
        'total_q':        total_q,
        'total_r':        total_r,
        'total_s':        total_s,
        'periode':        loc['periode'] or default_period,
    }


# ---------------------------------------------------------------------------
# Écriture CSV
# ---------------------------------------------------------------------------

def write_csv(rows, output_path):
    with open(output_path, 'w', encoding='utf-8-sig') as f:
        f.write(CSV_HEADER + '\n')
        for r in rows:
            f.write(';'.join([
                r['immeuble'], r['adresse'], r['box'], r['code_lot'], r['taille'],
                r['code_locataire'], r['nom_locataire'],
                r['loyer'], r['assurance'], r['tva'],
                r['total_q'], r['total_r'], r['total_s'],
                r['periode'],
            ]) + '\n')


# ---------------------------------------------------------------------------
# Point d'entrée
# ---------------------------------------------------------------------------

def main():
    print('=== Conversion PDFs 2025 -> CSV ===\n')
    for pdf_name, month in sorted(PDF_MONTH.items(), key=lambda x: x[1]):
        pdf_path = os.path.join(PDF_DIR, pdf_name)
        if not os.path.exists(pdf_path):
            print(f'[MANQUANT] {pdf_name}')
            continue
        out_name = f'gerance_2025_{month}.csv'
        out_path = os.path.join(OUT_DIR, out_name)
        print(f'Traitement {pdf_name} -> {out_name}')
        try:
            default_period = f'01/{month}/2025'
            rows = extract_lots(pdf_path, default_period)
            write_csv(rows, out_path)
            print(f'  -> {len(rows)} lignes')
        except Exception as e:
            import traceback
            print(f'  [ERREUR] {e}')
            traceback.print_exc()
    print('\nTerminé.')


if __name__ == '__main__':
    main()
