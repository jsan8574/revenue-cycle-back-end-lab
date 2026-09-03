#!/usr/bin/env python3
"""Render claim PDFs for site preview and local visual QA."""

from pathlib import Path

from PIL import Image, ImageDraw
from pypdf import PdfReader, PdfWriter, Transformation
from pypdf._page import PageObject
import subprocess


ROOT = Path(__file__).resolve().parents[1]
QA = Path("/private/tmp/revenue-cycle-claim-qa")
QA.mkdir(parents=True, exist_ok=True)


subprocess.run(
    ["sips", "-s", "format", "png", str(ROOT / "public/billing/cms-1500-activity.pdf"), "--out", str(ROOT / "public/billing/cms-1500-preview.png")],
    check=True,
    stdout=subprocess.DEVNULL,
)
blank_preview = Image.open(ROOT / "public/billing/cms-1500-preview.png").convert("RGBA")
blank_white = Image.new("RGBA", blank_preview.size, "white")
blank_white.alpha_composite(blank_preview)
blank_white.convert("RGB").save(ROOT / "public/billing/cms-1500-preview.png")

tiles = []
ub_first_pages = []
for pdf in sorted((ROOT / "public/training-claims").glob("*.pdf")):
    reader = PdfReader(str(pdf))
    for page_number, source_page in enumerate(reader.pages, 1):
        one_page_pdf = QA / f"{pdf.stem}-p{page_number}.pdf"
        writer = PdfWriter()
        crop = source_page.cropbox
        if float(crop.left) or float(crop.bottom):
            normalized = PageObject.create_blank_page(
                width=float(crop.width), height=float(crop.height)
            )
            normalized.merge_transformed_page(
                source_page,
                Transformation().translate(-float(crop.left), -float(crop.bottom)),
            )
            writer.add_page(normalized)
        else:
            writer.add_page(source_page)
        with one_page_pdf.open("wb") as handle:
            writer.write(handle)
        rendered = QA / f"{pdf.stem}-p{page_number}.png"
        subprocess.run(
            ["sips", "-s", "format", "png", str(one_page_pdf), "--out", str(rendered)],
            check=True,
            stdout=subprocess.DEVNULL,
        )
        rendered_page = Image.open(rendered).convert("RGBA")
        white_page = Image.new("RGBA", rendered_page.size, "white")
        white_page.alpha_composite(rendered_page)
        page = white_page.convert("RGB")
        page.save(QA / f"{pdf.stem}-p{page_number}-white.png")
        if "ub04" in pdf.stem and page_number == 1:
            ub_first_pages.append((pdf.stem, page.copy()))
        page.thumbnail((520, 670))
        tile = Image.new("RGB", (550, 720), "white")
        tile.paste(page, ((550 - page.width) // 2, 35))
        draw = ImageDraw.Draw(tile)
        draw.text((16, 10), f"{pdf.stem} - page {page_number}", fill="#123b43")
        tiles.append(tile)

columns = 4
rows = (len(tiles) + columns - 1) // columns
sheet = Image.new("RGB", (columns * 550, rows * 720), "#dfe8e6")
for index, tile in enumerate(tiles):
    sheet.paste(tile, ((index % columns) * 550, (index // columns) * 720))
sheet.save(QA / "all-claim-pages-contact-sheet.png")
ub_sheet = Image.new("RGB", (1204, 3 * 816), "#dfe8e6")
for index, (label, page) in enumerate(ub_first_pages):
    page.thumbnail((580, 742))
    x = (index % 2) * 602 + 11
    y = (index // 2) * 816 + 50
    ImageDraw.Draw(ub_sheet).text((x, y - 28), label, fill="#123b43")
    ub_sheet.paste(page, (x, y))
ub_sheet.save(QA / "ub04-first-pages-contact-sheet.png")
print(QA / "all-claim-pages-contact-sheet.png")
