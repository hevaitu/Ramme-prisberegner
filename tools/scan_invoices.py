#!/usr/bin/env python3
"""Udtræk varelinjer fra Nyram-fakturaer til prisgennemgang.

Kør fra projektmappen:

    python3 tools/scan_invoices.py fakturaer

Scriptet ændrer ikke beregneren automatisk. Det laver kun en oversigt, som kan
bruges til at opdatere satserne kontrolleret.
"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, asdict
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError as exc:
    raise SystemExit(
        "Mangler Python-pakken pypdf. Brug Codex' bundled Python-runtime, eller installer pypdf."
    ) from exc


MONEY = r"\d{1,3}(?:\.\d{3})*,\d{2}"
LINE_RE = re.compile(
    rf"(?P<name>.+?)(?P<sku>[A-ZÆØÅ0-9][A-ZÆØÅ0-9\-]*)\s+"
    rf"(?P<unit_price>{MONEY})\s+(?P<amount>{MONEY})(?P<qty>\d+(?:,\d+)?)$"
)


@dataclass
class InvoiceLine:
    invoice: str
    sku: str
    name: str
    unit_price: float
    amount: float
    quantity: float


def parse_number(value: str) -> float:
    return float(value.replace(".", "").replace(",", "."))


def clean_sku(value: str) -> str:
    if value.endswith("UV-70"):
        return "UV-70"
    return value


def clean_name(value: str) -> str:
    cleaned = " ".join(value.split())
    return re.sub(r"^\d+\s+\d+\s+", "", cleaned)


def extract_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def normalized_lines(text: str) -> list[str]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    merged: list[str] = []
    buffer = ""

    for line in lines:
        if not buffer:
            buffer = line
        else:
            buffer = f"{buffer} {line}"

        if re.search(rf"{MONEY}\s+{MONEY}\d+(?:,\d+)?$", buffer):
            merged.append(buffer)
            buffer = ""
        elif len(buffer) > 150:
            buffer = ""

    return merged


def parse_invoice(pdf_path: Path) -> list[InvoiceLine]:
    invoice_id = pdf_path.stem
    results: list[InvoiceLine] = []

    for line in normalized_lines(extract_text(pdf_path)):
        match = LINE_RE.search(line)
        if not match:
            continue

        results.append(
            InvoiceLine(
                invoice=invoice_id,
                sku=clean_sku(match.group("sku")),
                name=clean_name(match.group("name")),
                unit_price=parse_number(match.group("unit_price")),
                amount=parse_number(match.group("amount")),
                quantity=parse_number(match.group("qty")),
            )
        )

    return results


def main() -> int:
    folder = Path(sys.argv[1] if len(sys.argv) > 1 else "fakturaer")
    if not folder.exists():
        print(f"Mappen findes ikke: {folder}", file=sys.stderr)
        return 1

    pdfs = sorted(folder.glob("*.pdf"))
    if not pdfs:
        print(f"Ingen PDF-fakturaer fundet i {folder}")
        return 0

    lines: list[InvoiceLine] = []
    for pdf in pdfs:
        lines.extend(parse_invoice(pdf))

    output = {
        "source_folder": str(folder),
        "pdf_count": len(pdfs),
        "line_count": len(lines),
        "lines": [asdict(line) for line in lines],
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
