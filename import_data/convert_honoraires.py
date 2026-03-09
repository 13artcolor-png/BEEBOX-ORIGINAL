"""
Convertit les PDFs de factures d'honoraires ORPI en CSV honoraires_XXXX.csv

Traite:
  2023/honoraires/  -> honoraires_2023.csv  (PDFs texte natif)
  2024/honoraires/  -> honoraires_2024.csv  (PDFs image-based, OCR)
  2025/honoraires/  -> honoraires_2025.csv  (PDFs image-based, OCR)
  2026/honoraires/  -> honoraires_2026.csv  (PDFs image-based, OCR)

Détection automatique: pdfplumber si texte natif, sinon EasyOCR.
Déduplication par Facture N° pour éviter les doublons inter-dossiers.

Prérequis: pip install pymupdf easyocr pdfplumber

Format cible CSV:
  Facture N°;Date Facture;Rubrique;Ref Loc;Bailleur;Nom Locataire;Adresse Bien;
  Loyer (€);Date Effet;Mandat N°;Prestation;HT (€);TVA (%);TVA (€);TTC (€);Fichier
"""
import re
import os

BASE_DIR = r'C:/Users/ragot/OneDrive/Bureau/beeboxlaon-original/import_data'

# Dossiers à traiter par année (relatifs à BASE_DIR)
JOBS = [
    {'dir': '2023/honoraires', 'year': 2023, 'out': '2023/honoraires/honoraires_2023.csv'},
    {'dir': '2024/honoraires', 'year': 2024, 'out': '2024/honoraires/honoraires_2024.csv'},
    {'dir': '2025/honoraires', 'year': 2025, 'out': '2025/honoraires/honoraires_2025.csv'},
    {'dir': '2026/honoraires', 'year': 2026, 'out': '2026/honoraires/honoraires_2026.csv'},
]

CSV_HEADER = (
    'Facture N°;Date Facture;Rubrique;Ref Loc;Bailleur;Nom Locataire;Adresse Bien;'
    'Loyer (€);Date Effet;Mandat N°;'
    'Prestation;HT (€);TVA (%);TVA (€);TTC (€);Fichier'
)

# --------------------------------------------------------------------------
# Utilitaires
# --------------------------------------------------------------------------

def fmt_euro(s):
    """Normalise un montant: '90,00 €' → '90,00'."""
    s = str(s).strip()
    s = re.sub(r'[€\s\xa0]', '', s)
    s = re.sub(r'\.(?=\d{3})', '', s)
    return s

def safe(s):
    """Nettoie une chaîne pour CSV."""
    if not s:
        return ''
    return str(s).strip().replace(';', ',').replace('\n', ' ').replace('\r', '')


# --------------------------------------------------------------------------
# Extraction des items (texte natif ou OCR)
# --------------------------------------------------------------------------

_reader = None

def get_reader():
    """Initialise EasyOCR (chargement unique du modèle)."""
    global _reader
    if _reader is None:
        import easyocr
        print('  Initialisation OCR (première fois, peut prendre 30s)...')
        _reader = easyocr.Reader(['fr'], gpu=False, verbose=False)
    return _reader


def extract_items(pdf_path, page_index=0):
    """
    Extrait les mots d'une page PDF avec leurs positions.
    Utilise pdfplumber si texte natif disponible, sinon EasyOCR.
    Retourne (items, page_width) avec items = [(x0, y0, x1, y1, text, conf)].
    """
    import pdfplumber

    # Tenter l'extraction texte natif
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[page_index]
        native_text = page.extract_text() or ''
        if len(native_text.strip()) > 50:
            # Mode texte: convertir les mots pdfplumber au format items
            # y_tolerance=3 (points PDF) pour ne pas fusionner les lignes adjacentes
            words = page.extract_words(x_tolerance=3, y_tolerance=3)
            items = [
                (w['x0'], w['top'], w['x1'], w['bottom'], w['text'], 1.0)
                for w in words
            ]
            return items, float(page.width), 3   # y_tol=3pt pour texte natif

    # Mode OCR: rendu image + EasyOCR
    import fitz
    scale = 2.0
    doc = fitz.open(pdf_path)
    page_fitz = doc[page_index]
    mat = fitz.Matrix(scale, scale)
    pix = page_fitz.get_pixmap(matrix=mat)
    img_bytes = pix.tobytes('png')

    reader = get_reader()
    results = reader.readtext(img_bytes, detail=1, paragraph=False)
    items = []
    for (bbox, text, conf) in results:
        xs = [p[0] for p in bbox]
        ys = [p[1] for p in bbox]
        x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
        items.append((x0, y0, x1, y1, text.strip(), conf))
    return items, float(pix.width), 15   # y_tol=15px pour OCR


def group_by_lines(items, y_tolerance=15):
    """
    Regroupe les éléments par lignes (même Y ± tolérance).
    Retourne liste de listes triées par X.
    """
    buckets = {}
    for item in items:
        x0, y0, x1, y1, text, conf = item
        cy = (y0 + y1) / 2
        matched = None
        for ky in buckets:
            if abs(ky - cy) <= y_tolerance:
                matched = ky
                break
        if matched is not None:
            buckets[matched].append(item)
        else:
            buckets[cy] = [item]
    lines = []
    for y in sorted(buckets):
        ws = sorted(buckets[y], key=lambda w: w[0])
        lines.append(ws)
    return lines


# --------------------------------------------------------------------------
# Parseur de facture ORPI
# --------------------------------------------------------------------------

def extract_invoice(pdf_path):
    """
    Extrait les champs d'une facture ORPI.
    Retourne un dict ou None si non reconnu.
    """
    items, page_width, y_tol = extract_items(pdf_path)
    lines = group_by_lines(items, y_tolerance=y_tol)
    mid_x = page_width * 0.5

    result = {
        'facture_num':  '',
        'date_facture': '',
        'rubrique':     '',
        'ref_loc':      '',
        'bailleur':     '',
        'locataire':    '',
        'adresse':      '',
        'loyer':        '',
        'date_effet':   '',
        'mandat':       '',
        'prestation':   '',
        'ht':           '',
        'tva_pct':      '',
        'tva_mt':       '',
        'ttc':          '',
        'fichier':      os.path.basename(pdf_path),
    }

    flat_lines = []
    for ws in lines:
        texts = [w[4] for w in ws]
        flat_lines.append(' '.join(texts))

    for i, (line_text, ws) in enumerate(zip(flat_lines, lines)):

        # Facture N° : "Facture n 2026-54" ou "Facture n° : 2026-54"
        m = re.search(r'Facture\s+n[°o]?\s*[:\-]?\s*([\d-]+)', line_text, re.I)
        if m and not result['facture_num']:
            result['facture_num'] = safe(m.group(1))
            dm = re.search(r'Date\s*[:\-]?\s*(\d{2}/\d{2}/\d{4})', line_text, re.I)
            if dm:
                result['date_facture'] = dm.group(1)
            continue

        # Date facture seule : "Date : 10/02/2026"
        m = re.match(r'^Date\s*[:\-]?\s*(\d{2}/\d{2}/\d{4})$', line_text.strip(), re.I)
        if m and not result['date_facture']:
            result['date_facture'] = m.group(1)
            continue
        if re.match(r'^Date$', line_text.strip(), re.I) and not result['date_facture']:
            if i + 1 < len(flat_lines):
                dm = re.match(r'^(\d{2}/\d{2}/\d{4})', flat_lines[i + 1].strip())
                if dm:
                    result['date_facture'] = dm.group(1)
            continue

        # Honoraires concernant : Rub XXXX Loc XXX
        m = re.search(r'Honoraires\s+concernant', line_text, re.I)
        if m:
            rm = re.search(r'Rub\s*[:\-]?\s*(\S+)', line_text, re.I)
            if rm:
                result['rubrique'] = safe(rm.group(1))
            lm = re.search(r'Loc\s+(.+)', line_text, re.I)
            if lm:
                result['ref_loc'] = safe(lm.group(1))
            else:
                tokens = [w[4] for w in ws]
                try:
                    loc_idx = next(j for j, t in enumerate(tokens) if re.match(r'^Loc', t, re.I))
                    result['ref_loc'] = safe(' '.join(tokens[loc_idx + 1:]))
                except StopIteration:
                    pass
            continue

        # Rub seul : "Rub 1618 Loc 13 BIS HOMEBOX"
        if re.match(r'^Rub\b', line_text.strip(), re.I) and not result['rubrique']:
            rm = re.search(r'Rub\s+(\S+)', line_text, re.I)
            if rm:
                result['rubrique'] = safe(rm.group(1))
            lm = re.search(r'Loc\s+(.+)', line_text, re.I)
            if lm:
                result['ref_loc'] = safe(lm.group(1))
            continue

        # Loc seul (ligne séparée)
        if re.match(r'^Loc\b', line_text.strip(), re.I) and not result['ref_loc']:
            result['ref_loc'] = safe(re.sub(r'^Loc\s+', '', line_text.strip(), flags=re.I))
            continue

        # Montant du loyer : "Montant du loyer 90,00 €"
        m = re.search(r'Montant\s+du\s+loyer\s+([\d,\.]+)', line_text, re.I)
        if m:
            result['loyer'] = fmt_euro(m.group(1))
            continue

        # Date d'effet : "Date d'effet 16/02/2026"
        m = re.search(r"Date\s+d[''\u2019]?effet\s+(\d{2}/\d{2}/\d{4})", line_text, re.I)
        if m:
            result['date_effet'] = m.group(1)
            continue

        # Mandat de location n° 2424 — capture uniquement les chiffres (3+ digits)
        m = re.search(r'Mandat\s+de\s+location.*?(\d{3,})', line_text, re.I)
        if m:
            result['mandat'] = safe(m.group(1))
            continue

        # Honoraires [prestation] + montant HT
        m = re.match(r'(Honoraires\s+(?!concernant).+?)\s+([\d,]+)\s*[€$]?\s*$', line_text.strip(), re.I)
        if m and not result['ht']:
            result['prestation'] = safe(m.group(1))
            result['ht']         = fmt_euro(m.group(2))
            continue
        if re.match(r'^Honoraires\s+(?!concernant)', line_text.strip(), re.I) and not result['ht']:
            amounts = [w[4] for w in ws if re.match(r'^[\d,]+$', w[4].replace(' ', ''))]
            if amounts:
                result['prestation'] = safe(re.sub(r'\s+[\d,]+\s*$', '', line_text.strip()))
                result['ht'] = fmt_euro(amounts[-1])
            else:
                result['prestation'] = safe(line_text.strip())
            continue

        # Total HT (confirmation si prestation non trouvée)
        m = re.search(r'Total\s+HT\s+([\d,]+)', line_text, re.I)
        if m and not result['ht']:
            result['ht'] = fmt_euro(m.group(1))
            continue

        # TVA XX,XX % + montant
        m = re.search(r'TVA\s+([\d,]+)\s*%\s+([\d,]+)', line_text, re.I)
        if m:
            result['tva_pct'] = safe(m.group(1))
            result['tva_mt']  = fmt_euro(m.group(2))
            continue

        # MONTANT TTC
        m = re.search(r'MONTANT\s+TTC\s+([\d,]+)', line_text, re.I)
        if m:
            result['ttc'] = fmt_euro(m.group(1))
            continue

    # ── Bailleur / Locataire via position X (table 2 colonnes) ──────────
    bailleur_y = None
    for ws in lines:
        texts = [w[4] for w in ws]
        if any(re.match(r'^Bailleur$', t, re.I) for t in texts):
            bailleur_y = ws[0][1]
            break

    if bailleur_y is not None:
        by: float = bailleur_y  # type: ignore[assignment]
        bailleur_parts = []
        locataire_parts = []
        names_collected = False   # True après avoir collecté la ligne des noms
        for ws in lines:
            y0 = ws[0][1]
            if y0 <= by:
                continue
            line_text_w = ' '.join(w[4] for w in ws)
            # Arrêter avant "Pour l'exécution..." (OCR lit parfois "l'" comme "/")
            if re.match(r'^Pour\b', line_text_w, re.I):
                break
            if y0 > by + 200:  # type: ignore[operator]
                break
            # Arrêter dès qu'on atteint les lignes d'adresse (commence par un chiffre)
            first_word = ws[0][4] if ws else ''
            if names_collected and re.match(r'^\d', first_word):
                break
            for w in ws:
                x0 = w[0]
                if x0 < mid_x:
                    bailleur_parts.append(w[4])
                else:
                    locataire_parts.append(w[4])
            names_collected = True

        if bailleur_parts and not result['bailleur']:
            result['bailleur'] = safe(' '.join(bailleur_parts[:4]))
        if locataire_parts and not result['locataire']:
            result['locataire'] = safe(' '.join(locataire_parts[:4]))

    # Vérification minimale
    if not result['facture_num'] and not result['ttc']:
        return None

    return result


# --------------------------------------------------------------------------
# Écriture CSV
# --------------------------------------------------------------------------

def write_csv(rows, output_path):
    with open(output_path, 'w', encoding='utf-8-sig') as f:
        f.write(CSV_HEADER + '\n')
        for r in rows:
            f.write(';'.join([
                r['facture_num'], r['date_facture'],
                r['rubrique'],    r['ref_loc'],
                r['bailleur'],    r['locataire'],
                r['adresse'],
                r['loyer'],       r['date_effet'],  r['mandat'],
                r['prestation'],  r['ht'],
                r['tva_pct'],     r['tva_mt'],      r['ttc'],
                r['fichier'],
            ]) + '\n')


# --------------------------------------------------------------------------
# Point d'entrée
# --------------------------------------------------------------------------

def main():
    print('=== Conversion Honoraires ORPI -> CSV (2023 / 2024 / 2025 / 2026) ===\n')

    grand_total = 0

    for job in JOBS:
        pdf_dir = os.path.join(BASE_DIR, job['dir'])
        out_path = os.path.join(BASE_DIR, job['out'])

        if not os.path.isdir(pdf_dir):
            print(f'[MANQUANT] {pdf_dir}')
            continue

        pdfs = sorted([f for f in os.listdir(pdf_dir) if f.lower().endswith('.pdf')])
        if not pdfs:
            print(f'[VIDE] {pdf_dir}')
            continue

        print(f'\n--- {job["dir"]} ({len(pdfs)} PDFs) ---')

        rows = []
        seen_factures = set()

        for pdf_name in pdfs:
            pdf_path = os.path.join(pdf_dir, pdf_name)
            print(f'  Traitement {pdf_name}')
            try:
                row = extract_invoice(pdf_path)
                if row:
                    fn = row['facture_num']
                    if fn and fn in seen_factures:
                        print(f'    [DOUBLON] {fn} ignoré')
                        continue
                    if fn:
                        seen_factures.add(fn)
                    rows.append(row)
                    print(f'    -> {fn} | {row["locataire"][:40]} | TTC {row["ttc"]} €')
                else:
                    print('    [IGNORÉ] Format non reconnu')
            except Exception as e:
                import traceback
                print(f'    [ERREUR] {e}')
                traceback.print_exc()

        if rows:
            write_csv(rows, out_path)
            print(f'  {len(rows)} facture(s) -> {out_path}')
            grand_total += len(rows)
        else:
            print(f'  Aucune facture extraite.')

    print(f'\n{grand_total} factures au total. Terminé.')


if __name__ == '__main__':
    main()
