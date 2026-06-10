# Ramme prisberegner

Åbn beregneren lokalt på:

```text
http://localhost:8000/
```

Start serveren fra projektmappen med:

```bash
python3 -m http.server 8000
```

## Fremtidige fakturaer

Når nye materialepriser skal ind:

1. Læg PDF-fakturaerne i `fakturaer/`.
2. Bed Codex om at opdatere prisberegneren ud fra nye fakturaer.
3. Codex kan køre `tools/scan_invoices.py fakturaer`, sammenligne varelinjer med `data/price-ledger.json` og derefter opdatere satserne i beregneren.

Fakturaimporten ændrer ikke priser automatisk. Det er med vilje, så nye varer og uventede prisændringer bliver vurderet før de lander i kundeberegneren.

## Deling via GitHub Pages

Beregneren kan hostes direkte på GitHub Pages, fordi den kun består af statiske filer.

Grundopsætning:

1. Opret et GitHub-repository.
2. Push projektet til GitHub.
3. Gå til repositoryets `Settings` -> `Pages`.
4. Vælg `Deploy from a branch`.
5. Vælg branch `main` og folder `/root`.
6. Gem.

Efter et minut eller to får I et link i stil med:

```text
https://brugernavn.github.io/repository-navn/
```

Del det link med makkeren. Han kan bruge beregneren direkte i browseren.

Bemærk: Faktura-PDF'er er ignoreret i Git, så de ikke kommer med på GitHub. Brug `fakturaer/` som lokal indbakke til prisopdateringer, men læg ikke følsomme fakturaer i et offentligt repository.
