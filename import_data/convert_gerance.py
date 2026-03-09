"""
Convertit les PDFs de rapports de gérance ORPI en CSV gerance_YYYY_MM.csv

Traite: 2023/gerance/, 2024/gerance/, 2026/gerance/
Détecte automatiquement l'année et le mois depuis la période du PDF.
Sortie: dans le même dossier que les PDFs source.

Format cible:
  Immeuble;Adresse;Box N°;Code Lot;Taille;Code Locataire;Nom Locataire;
  Loyer (€);Assurance (€);TVA (€);Total Quittancé (€);Total Réglé (€);Solde (€);Période
"""
import pdfplumber
import re
import os

BASE_DIR = r'C:/Users/ragot/OneDrive/Bureau/beeboxlaon-original/import_data'

# Dossiers à traiter (relatifs à BASE_DIR)
GERANCE_DIRS = ['2023/gerance', '2024/gerance', '2026/gerance']

IMMEUBLE = 'R69'
ADRESSE  = '58 RUE DE MANOISE 02000 LAON'

CSV_HEADER = (
    'Immeuble;Adresse;Box N°;Code Lot;Taille;Code Locataire;Nom Locataire;'
    'Loyer (€);Assurance (€);TVA (€);Total Quittancé (€);Total Réglé (€);Solde (€);Période'
)

COL_Q_MAX = 420
COL_R_MAX = 480

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
# Détection automatique année/mois depuis la période du PDF
# ---------------------------------------------------------------------------

def detect_year_month(pdf_path):
    """
    Lit la première page et retourne (year, month) depuis 'Période du ... au DD/MM/YYYY'.
    Ex: 'Période du 23/12/2025 au 22/01/2026' → ('2026', '01')
    """
    try:
        with pdfplumber.open(pdf_path) as pdf:
            txt = pdf.pages[0].extract_text() or ''
        m = re.search(r'riode du \d{2}/\d{2}/\d{4} au (\d{2})/(\d{2})/(\d{4})', txt)
        if m:
            return m.group(3), m.group(2)  # (year, month)
    except Exception:
        pass
    return None, None


def is_gerance(pdf_path):
    """Vérifie si le PDF est bien un rapport de gérance (a du texte + mot GERANCE)."""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            txt = pdf.pages[0].extract_text() or ''
        return 'GERANCE' in txt.upper() and len(txt.strip()) > 50
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Utilitaires (identiques à convert_pdf2025.py)
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
    words = page.extract_words(x_tolerance=3, y_tolerance=3)
    if not words:
        return []
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
    with pdfplumber.open(pdf_path) as pdf:
        raw_lines = []
        for page in pdf.pages:
            raw_lines.extend(_page_to_lines(page))

    all_lines = []
    k = 0
    while k < len(raw_lines):
        text, words = raw_lines[k]
        if k + 1 < len(raw_lines):
            nxt_text, nxt_words = raw_lines[k + 1]
            if re.match(r'^\(\d{4,5}\)$', nxt_text.strip()):
                text  = text + ' ' + nxt_text
                words = words + nxt_words
                k += 1
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

        lot_m = re.match(
            r'Lot\s*:(?:Box|BOX)\s*(?:N[°o\s]*(\d+))?\s*[-/\s]*(.*?)\((\d{4})\)',
            text, re.IGNORECASE
        )
        if lot_m:
            code_lot = lot_m.group(3)
            box_num  = lot_m.group(1) or str(int(code_lot))
            taille   = normalize_taille(lot_m.group(2))

            if (current
                    and current['box'] == box_num
                    and current['code_lot'] == code_lot):
                i += 1
                continue

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

        loc_m = re.match(r'Locataire\s*:\s*(.+?)\s*\((\d{5})\)', text)
        if loc_m:
            if current['cur_loc'] is not None:
                current['locataires'].append(current['cur_loc'])
            nom  = loc_m.group(1).strip()
            code = loc_m.group(2)
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
                'loyer': 0.0, 'assurance': 0.0, 'tva': 0.0, 'periode': '',
            }
            i += 1
            continue

        loc = current['cur_loc']

        if re.match(r'Total\s+.{0,15}du\s+lot', text, re.I):
            q, r, s = _qrs_from_words(words)
            has_numbers = any(re.match(r'^-?\d+,\d{2}$', w['text']) for w in words)
            if has_numbers:
                current['total_q'] = fmt(q)
                current['total_r'] = fmt(r)
                current['total_s'] = fmt(s) if s else fmt(q - r)
            i += 1
            continue

        if re.match(r'(Total|Solde)', text, re.I):
            i += 1
            continue

        if loc is None:
            i += 1
            continue

        trans_m = re.match(r'^(\d{2}/\d{2}/\d{4})\s+(.*)', text)
        if trans_m:
            _process_transaction(loc, trans_m.group(1), trans_m.group(2), words)
            i += 1
            continue

        if re.match(r'^(Loyer|Appel\s+Assurance|Assurance|Rappel|TVA)', text, re.I):
            _process_transaction(loc, '', text, words)
            i += 1
            continue

        i += 1

    if current:
        row = _finalize(current, default_period)
        if row:
            lots.append(row)

    return lots


def _process_transaction(loc, date_str, desc, words):
    q, r, s = _qrs_from_words(words)
    amount = q
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
    if current['cur_loc'] is not None:
        current['locataires'].append(current['cur_loc'])
    locs = current['locataires']
    if not locs and current['total_q'] is None:
        return None
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
    print('=== Conversion Gérance ORPI -> CSV (2023 / 2024 / 2026) ===\n')

    total = 0
    for rel_dir in GERANCE_DIRS:
        pdf_dir = os.path.join(BASE_DIR, rel_dir)
        if not os.path.isdir(pdf_dir):
            print(f'[MANQUANT] {pdf_dir}')
            continue

        pdfs = sorted([f for f in os.listdir(pdf_dir) if f.lower().endswith('.pdf')])
        print(f'\n--- {rel_dir} ({len(pdfs)} PDFs) ---')

        for pdf_name in pdfs:
            pdf_path = os.path.join(pdf_dir, pdf_name)

            if not is_gerance(pdf_path):
                print(f'  [IGNORÉ] {pdf_name} (pas un rapport de gérance)')
                continue

            year, month = detect_year_month(pdf_path)
            if not year or not month:
                print(f'  [ERREUR] Période non détectée: {pdf_name}')
                continue

            out_name = f'gerance_{year}_{month}.csv'
            out_path = os.path.join(pdf_dir, out_name)
            print(f'  {pdf_name} -> {out_name}')

            try:
                default_period = f'01/{month}/{year}'
                rows = extract_lots(pdf_path, default_period)
                write_csv(rows, out_path)
                print(f'    -> {len(rows)} lignes')
                total += len(rows)
            except Exception as e:
                import traceback
                print(f'    [ERREUR] {e}')
                traceback.print_exc()

    print(f'\n{total} lignes au total. Terminé.')


if __name__ == '__main__':
    main()
