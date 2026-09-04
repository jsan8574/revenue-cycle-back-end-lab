#!/usr/bin/env python3
"""Generate fictional completed CMS-1500 and UB-04 training claim packets."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
CMS_TEMPLATE = ROOT / "public/billing/cms-1500-activity.pdf"
UB_TEMPLATE = ROOT / "public/billing/ub-04-activity.pdf"
OUTPUT = ROOT / "public/training-claims"


SCENARIOS = [
    dict(id="AR-3106", form="UB-04", patient="Evelyn Brooks", sex="F", dob="09/16/1971", address="1840 Cedar Lane, Portland, OR 97205", member="NSH-188-2044", group="NS-44018", payer="Northstar Health", plan="Northstar Choice PPO", dos_from="04/18/2026", dos_to="04/18/2026", provider="Dr. Oliver Grant", facility="Evergreen Surgical Center", npi="1992881044", tin="91-8842017", claim="CL-7719204", auth="NS-AUTH-771920", diagnosis="M17.11", type_bill="831", pos="24", lines=[("0360", "27447", "Total knee arthroplasty", 1, 17400), ("0320", "73560", "Post-op knee imaging", 1, 1240)]),
    dict(id="AR-3119", form="UB-04", patient="Marcus Hill", sex="M", dob="01/28/1980", address="2298 Willow Street, Salem, OR 97301", member="WC-558-291", group="OR-WC-9044", payer="Pioneer Casualty", plan="Oregon Workers Compensation", dos_from="03/06/2026", dos_to="03/06/2026", provider="Dr. Nadia Wells", facility="Evergreen Orthopedics", npi="1447289062", tin="93-7712048", claim="CL-7601138", auth="UR-391184", diagnosis="S83.241A", type_bill="831", pos="24", lines=[("0360", "29881", "Knee arthroscopy", 1, 6120), ("0320", "73562", "Knee radiology", 1, 800)]),
    dict(id="AR-3142", form="CMS-1500", patient="Noah Bennett", sex="M", dob="06/21/1992", address="610 North Harbor Way, Portland, OR 97209", member="HBX-771-4482", group="HB-77144", payer="Harbor Blue PPO", plan="Harbor Blue Preferred", dos_from="02/22/2026", dos_to="02/22/2026", provider="Dr. Erin Blake", facility="Evergreen Imaging", npi="1669402281", tin="91-8842017", claim="CL-7413360", auth="HB-PA-741336", diagnosis="M54.50", type_bill="", pos="49", lines=[("", "72148", "MRI lumbar spine", 1, 1175)]),
    dict(id="AR-3160", form="UB-04", patient="Camille Foster", sex="F", dob="10/11/1985", address="921 Summit Avenue, Eugene, OR 97401", member="MCH-440-7781", group="MCH-55190", payer="Meridian Community Health", plan="Meridian Select PPO", dos_from="05/08/2026", dos_to="05/08/2026", provider="Dr. Lena Walsh", facility="Evergreen Emergency Department", npi="1225487714", tin="91-8842017", claim="CL-7360448", auth="EMERGENCY", diagnosis="R07.9", type_bill="131", pos="23", lines=[("0450", "99285", "Emergency department visit", 1, 2500), ("0320", "71046", "Chest radiology, two views", 1, 700)]),
    dict(id="AR-3174", form="UB-04", patient="Renee Wallace", sex="F", dob="02/24/1976", address="1148 Rosewood Drive, Beaverton, OR 97005", member="NSH-772-6614", group="NS-44018", payer="Northstar Health", plan="Northstar Choice PPO", dos_from="05/01/2026", dos_to="05/01/2026", provider="Dr. Maya Chen", facility="Evergreen Infusion Center", npi="1881027746", tin="91-8842017", claim="CL-7308825", auth="NS-AUTH-730882", diagnosis="K50.90", type_bill="131", pos="22", lines=[("0636", "J1745", "Infliximab, 10 mg", 40, 7200), ("0335", "96413", "Chemotherapy administration", 1, 1200)]),
    dict(id="DM-5101", form="CMS-1500", patient="Nora Bennett", sex="F", dob="11/08/1968", address="431 Lakeview Court, Hillsboro, OR 97124", member="HBX-550-1492", group="HB-55014", payer="Harbor Blue PPO", plan="Harbor Blue Select PPO", dos_from="03/31/2026", dos_to="03/31/2026", provider="Dr. Priya Nair", facility="Evergreen Diagnostic Imaging", npi="1992881044", tin="91-8842017", claim="CL-8401183", auth="HB-PA-840118", diagnosis="M54.16", type_bill="", pos="49", lines=[("", "72158", "Lumbar MRI with and without contrast", 1, 4200), ("", "76376", "3-D rendering with interpretation", 1, 720)]),
    dict(id="DM-5102", form="UB-04", patient="Andre Collins", sex="M", dob="01/19/1959", address="87 Hawthorne Place, Gresham, OR 97030", member="CCR-882-1104", group="CC-88211", payer="Crescent Choice", plan="Crescent Choice Gold", dos_from="05/15/2026", dos_to="05/16/2026", provider="Dr. Samuel Ortiz", facility="Evergreen Medical Center", npi="1992881044", tin="91-8842017", claim="CL-8517045", auth="CC-AUTH-771902", diagnosis="R06.02", type_bill="131", pos="22", lines=[("0510", "99223", "Initial hospital care", 1, 1640), ("0762", "G0378", "Hospital observation service", 20, 9000), ("0320", "71046", "Chest radiology", 1, 2000)]),
    dict(id="DM-5103", form="CMS-1500", patient="Leah Morgan", sex="F", dob="06/12/1990", address="1507 Pinecrest Road, Tigard, OR 97223", member="SUM-331-0084", group="SUM-33100", payer="Summit Health HMO", plan="Summit Essential HMO", dos_from="06/18/2026", dos_to="06/18/2026", provider="Dr. Amelia Hart", facility="Evergreen Neurology", npi="1992881044", tin="91-8842017", claim="CL-8627016", auth="SUM-REF-500812", diagnosis="G43.909", type_bill="", pos="11", lines=[("", "99205", "New patient office visit", 1, 685), ("", "96127", "Brief emotional assessment", 1, 100)]),
    dict(id="DM-5104", form="CMS-1500", patient="Felix Ramirez", sex="M", dob="04/27/1977", address="774 Birch Avenue, Lake Oswego, OR 97034", member="MER-009-7112", group="MER-00971", payer="MeridianCare", plan="Meridian Preferred", dos_from="04/26/2026", dos_to="04/26/2026", provider="Dr. Renee Wallace", facility="Evergreen Outpatient Lab", npi="1992881044", tin="91-8842017", claim="CL-8733904", auth="N/A", diagnosis="Z13.79", type_bill="", pos="81", lines=[("", "81479", "Unlisted molecular pathology procedure", 1, 1280), ("", "36415", "Venipuncture", 1, 100)]),
    dict(id="DM-5105", form="UB-04", patient="Camille Foster", sex="F", dob="12/02/1982", address="921 Summit Avenue, Eugene, OR 97401", member="NSH-774-0091", group="NS-44018", payer="Northstar Health", plan="Northstar Choice PPO", dos_from="06/02/2026", dos_to="06/02/2026", provider="Dr. Oliver Grant", facility="Evergreen Infusion Center", npi="1992881044", tin="91-8842017", claim="CL-8842196", auth="NS-AUTH-884219", diagnosis="K50.90", type_bill="131", pos="22", lines=[("0636", "J1745", "Infliximab, 10 mg", 40, 7200), ("0335", "96413", "Chemotherapy administration", 1, 1200)]),
]


def draw_training_label(c: canvas.Canvas, width: float, height: float) -> None:
    c.saveState()
    c.setFillColorRGB(0.12, 0.28, 0.34)
    c.setFont("Helvetica-Bold", 6)
    c.drawRightString(width - 16, height - 12, "FICTIONAL TRAINING CLAIM - NOT FOR SUBMISSION")
    c.restoreState()


def cms_overlay(s: dict, width: float, height: float) -> BytesIO:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(width, height))
    draw_training_label(c, width, height)
    c.setFillColorRGB(0.04, 0.20, 0.27)
    total = sum(line[4] for line in s["lines"])

    def digits(value: str) -> str:
        return "".join(character for character in value if character.isdigit())

    def short_date(value: str) -> str:
        value_digits = digits(value)
        return value_digits[:4] + value_digits[-2:] if len(value_digits) == 8 else value_digits

    def field(value: object, rect: tuple[float, float, float, float], size: float = 6.4, align: str = "left", font_name: str = "Helvetica") -> None:
        text = str(value or "").replace("’", "'").replace("–", "-").upper()
        x1, y1, x2, y2 = rect
        available = max(1, x2 - x1 - 4)
        actual_size = size
        while actual_size > 4.5 and stringWidth(text, font_name, actual_size) > available:
            actual_size -= 0.2
        while text and stringWidth(text, font_name, actual_size) > available:
            text = text[:-1]
        c.setFont(font_name, actual_size)
        baseline = y1 + max(1.2, (y2 - y1 - actual_size) / 2 + 1.2)
        if align == "right":
            c.drawRightString(x2 - 2, baseline, text)
        elif align == "center":
            c.drawCentredString((x1 + x2) / 2, baseline, text)
        else:
            c.drawString(x1 + 2, baseline, text)

    address_parts = [part.strip() for part in s["address"].split(",")]
    street = address_parts[0] if address_parts else ""
    city = address_parts[1] if len(address_parts) > 1 else ""
    state_zip = address_parts[2].split(maxsplit=1) if len(address_parts) > 2 else ["", ""]
    state = state_zip[0] if state_zip else ""
    postal = state_zip[1] if len(state_zip) > 1 else ""
    patient_dob = short_date(s["dob"])
    service_from = short_date(s["dos_from"])
    service_to = short_date(s["dos_to"])
    phone = f"555015{s['id'][-4:]}"

    # CMS-1500 FL 1-14: coverage, patient, and insured information.
    field("X", (278, 708, 290, 724), 9, "center", "Helvetica-Bold")
    field(s["member"], (411.3, 707, 628.4, 731), 7)
    field(s["patient"], (60.4, 684.4, 266.3, 707), 7)
    field(s["patient"], (411.3, 684.4, 628.4, 707), 7)
    if len(patient_dob) == 6:
        field(patient_dob[:2], (275, 684.4, 299, 694), 6.2, "center")
        field(patient_dob[2:4], (300, 684.4, 324, 694), 6.2, "center")
        field(patient_dob[4:], (326, 684.4, 350, 694), 6.2, "center")
    field("X", (357, 684.4, 370, 698) if s.get("sex") == "M" else (392, 684.4, 405, 698), 8, "center", "Helvetica-Bold")
    field(street, (60.4, 659.5, 266.3, 684.4), 6.5)
    field(city, (60.4, 636.4, 240, 659.5), 6.5)
    field(state, (240, 636.4, 266.3, 659.5), 6.5, "center")
    field(postal, (60.4, 611, 153.6, 636.4), 6.5)
    field(phone, (153.6, 611, 266.3, 636.4), 6.2, "center")
    field("X", (293, 659.5, 305, 674), 8, "center", "Helvetica-Bold")
    field(street, (411.3, 659.5, 628.4, 684.4), 6.5)
    field(city, (411.3, 636.4, 586, 659.5), 6.5)
    field(state, (586, 636.4, 628.4, 659.5), 6.2, "center")
    field(postal, (411.3, 611, 520, 636.4), 6.5)
    field(phone, (520, 611, 628.4, 636.4), 6.2, "center")
    field(s["group"], (411.3, 588, 628.5, 611), 7)
    if len(patient_dob) == 6:
        field(patient_dob[:2], (420, 565, 444, 576), 6.2, "center")
        field(patient_dob[2:4], (446, 565, 470, 576), 6.2, "center")
        field(patient_dob[4:], (472, 565, 497, 576), 6.2, "center")
    field("X", (544, 565, 556, 578) if s.get("sex") == "M" else (590, 565, 602, 578), 8, "center", "Helvetica-Bold")
    field(s["plan"], (411.3, 518, 628.5, 542), 6.5)
    field("X", (565, 494, 577, 508), 8, "center", "Helvetica-Bold")
    field("SIGNATURE ON FILE", (95, 444, 250, 458), 6.2)
    field("SIGNATURE ON FILE", (455, 444, 600, 458), 6.2)
    # FL 14 uses three separate date cells. Keep MM, DD, and YY in their
    # individual boxes instead of drawing one six-digit value across the row.
    if len(service_from) == 6:
        field(service_from[:2], (60.4, 419, 84.4, 432), 6.2, "center")
        field(service_from[2:4], (84.4, 419, 108.4, 432), 6.2, "center")
        field(service_from[4:], (108.4, 419, 137.4, 432), 6.2, "center")

    # CMS-1500 FL 21-24: diagnosis, authorization, and service lines.
    field("0", (355, 358, 368.5, 371.8), 6.5, "center")
    field(s["diagnosis"].replace(".", ""), (74, 349.2, 124.7, 360.5), 6.5)
    field(s["auth"] if s["auth"] != "N/A" else "", (411.3, 326, 628.5, 349), 6.2)
    date_cells = [(60.4, 277, 79.5, 301), (79.5, 277, 100.5, 301), (100.5, 277, 122.6, 301), (122.6, 277, 143.5, 301), (143.5, 277, 166.3, 301), (166.3, 277, 187, 301)]
    service_rows = [((277, 301), (277, 288.8)), ((252.4, 277), (252.4, 264.6))]
    for index, line in enumerate(s["lines"][:2]):
        main, npi_row = service_rows[index]
        combined_dates = service_from + service_to
        for cell_index, base_rect in enumerate(date_cells):
            rect = (base_rect[0], main[0], base_rect[2], main[1])
            field(combined_dates[cell_index * 2:cell_index * 2 + 2], rect, 6.2, "center")
        field(s["pos"], (187, main[0], 210, main[1]), 6.5, "center")
        field(line[1], (231.6, main[0], 284, main[1]), 6.5, "center")
        field("A", (374.5, main[0], 411.3, main[1]), 6.5, "center")
        field(f"{line[4]:.2f}", (411.3, main[0], 475, main[1]), 6.2, "right")
        field(line[3], (475, main[0], 504, main[1]), 6.5, "center")
        field(s["npi"], (540, npi_row[0], 628.5, npi_row[1]), 6.2, "center")

    # CMS-1500 FL 25-33: tax, totals, signatures, facility, and billing provider.
    field(s["tin"], (60.4, 132.8, 216.5, 157), 6.5)
    field("X", (136, 132.8, 153, 148), 8, "center", "Helvetica-Bold")
    field(s["claim"], (216.5, 132.8, 322, 157), 6.2)
    field("X", (326, 132.8, 342, 149), 9, "center", "Helvetica-Bold")
    field(f"{total:.2f}", (411.3, 132.8, 492, 157), 6.5, "right")
    field("0.00", (492, 132.8, 560, 157), 6.5, "right")
    field(f"{total:.2f}", (560, 132.8, 628.5, 157), 6.5, "right")
    field(s["provider"], (85, 72, 190, 85), 5.8)
    field(service_to, (174, 62, 216.5, 74), 5.4, "center")
    field(s["facility"], (220, 116, 409, 129), 5.6)
    field("1200 EVERGREEN WAY", (220, 104, 409, 116), 5.2)
    field("PORTLAND, OR 97205", (220, 92, 409, 104), 5.2)
    field(s["npi"], (235, 72, 321.9, 86), 6)
    field("EVERGREEN MEDICAL GROUP", (415, 116, 627, 129), 5.6)
    field("1200 EVERGREEN WAY", (415, 104, 627, 116), 5.2)
    field("PORTLAND, OR 97205", (415, 92, 627, 104), 5.2)
    field(s["npi"], (430, 72, 494.3, 86), 6)
    c.save()
    buffer.seek(0)
    return buffer


def ub_overlay(s: dict, width: float, height: float) -> BytesIO:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(width, height))
    draw_training_label(c, width, height)
    c.setFillColorRGB(0.04, 0.20, 0.27)
    total = sum(line[4] for line in s["lines"])

    def digits(value: str, count: int = 8) -> str:
        return "".join(character for character in value if character.isdigit())[:count]

    def short_date(value: str) -> str:
        full = digits(value)
        return f"{full[:4]}{full[-2:]}" if len(full) == 8 else full

    def field(value: object, rect: tuple[float, float, float, float], size: float = 6.4, align: str = "left") -> None:
        text = str(value or "").replace("’", "'").replace("–", "-").upper()
        x1, y1, x2, y2 = rect
        available = max(1, x2 - x1 - 4)
        actual_size = size
        while actual_size > 4.5 and stringWidth(text, "Helvetica", actual_size) > available:
            actual_size -= 0.2
        while text and stringWidth(text, "Helvetica", actual_size) > available:
            text = text[:-1]
        c.setFont("Helvetica", actual_size)
        baseline = y1 + max(1.2, (y2 - y1 - actual_size) / 2 + 1.2)
        if align == "right":
            c.drawRightString(x2 - 2, baseline, text)
        elif align == "center":
            c.drawCentredString((x1 + x2) / 2, baseline, text)
        else:
            c.drawString(x1 + 2, baseline, text)

    patient_parts = [part.strip() for part in s["address"].split(",")]
    patient_street = patient_parts[0]
    patient_city = patient_parts[1] if len(patient_parts) > 1 else ""
    patient_state_zip = patient_parts[2].split(maxsplit=1) if len(patient_parts) > 2 else ["", ""]
    patient_state = patient_state_zip[0] if patient_state_zip else ""
    patient_zip = patient_state_zip[1] if len(patient_state_zip) > 1 else ""
    name_parts = s["patient"].split()
    patient_claim_name = f"{name_parts[-1]}, {' '.join(name_parts[:-1])}".upper()
    provider_name = s["provider"].replace("Dr. ", "")
    provider_parts = provider_name.split()
    provider_last = provider_parts[-1].upper()
    provider_first = " ".join(provider_parts[:-1]).upper()

    # UB-04 FL 1-17: provider, claim, statement, and patient information.
    field(s["facility"], (112.3, 981.8, 276.9, 993.1), 6.2)
    field("1200 Evergreen Way", (112.3, 969.5, 276.9, 980.8), 6.0)
    field("Portland, OR 97205", (112.1, 957.1, 276.7, 968.5), 6.0)
    field("5035550140", (112.3, 946.9, 276.9, 957.4), 6.0)
    # FL 2: centralized pay-to provider address, distinct from the billing
    # facility in FL 1.
    field("Evergreen Medical Group", (278.0, 981.8, 445.0, 993.1), 6.0)
    field("PO Box 7719", (278.0, 969.5, 445.0, 980.8), 6.0)
    field("Portland, OR 97207", (278.0, 957.1, 445.0, 968.5), 6.0)
    field(s["claim"], (490.8, 982.6, 638.4, 995.2), 6.2)
    field(s["patient"].split()[0][:1] + s["claim"].replace("-", ""), (490.2, 971.6, 637.0, 982.0), 6.0)
    field(s["type_bill"], (657.0, 970.4, 691.4, 983.7), 7.0, "center")
    field(s["tin"].replace("-", ""), (463.9, 947.8, 529.3, 958.3), 6.0)
    field(digits(s["dos_from"]), (533.5, 947.6, 581.6, 958.6), 6.0, "center")
    field(digits(s["dos_to"]), (585.5, 946.7, 633.5, 958.6), 6.0, "center")
    field(patient_claim_name, (110.3, 922.2, 313.7, 936.0), 6.2)
    field(patient_street, (401.6, 935.3, 688.5, 947.3), 6.0)
    field(patient_city, (326.4, 924.4, 550.4, 934.0), 6.0)
    field(patient_state, (562.8, 923.6, 584.3, 934.1), 6.0, "center")
    field(patient_zip, (591.5, 924.1, 660.2, 935.2), 6.0)
    field(digits(s["dob"]), (102.0, 901.1, 164.2, 910.9), 6.0, "center")
    field(s.get("sex", "U"), (168.6, 899.6, 183.7, 911.7), 6.2, "center")
    field(short_date(s["dos_from"]), (187.5, 900.7, 229.5, 910.2), 5.8, "center")
    field("14", (233.2, 899.7, 250.3, 910.2), 5.8, "center")
    field("1", (253.4, 899.6, 269.9, 910.6), 6.0, "center")
    field("1", (276.0, 899.2, 292.5, 910.6), 6.0, "center")
    field("01", (340.2, 899.5, 358.7, 909.5), 5.8, "center")

    # UB-04 FL 42-47: revenue-code service lines and total line.
    line_rects = [
        ((101.6, 780.3, 132.7, 789.3), (136.8, 780.3, 309.8, 790.3), (316.2, 778.5, 419.2, 789.7), (424.4, 780.1, 468.9, 789.1), (474.6, 780.1, 527.7, 790.9), (532.6, 779.1, 597.9, 789.1)),
        ((101.6, 768.8, 132.8, 777.3), (136.2, 768.0, 310.8, 778.0), (316.9, 767.2, 418.8, 777.7), (424.2, 768.7, 469.2, 777.2), (475.1, 767.7, 528.2, 778.5), (532.3, 767.5, 597.6, 777.5)),
        ((101.7, 756.7, 133.2, 765.4), (136.9, 755.7, 310.9, 766.2), (316.8, 753.2, 418.3, 766.3), (424.4, 756.8, 467.9, 765.3), (475.1, 754.1, 528.2, 764.8), (531.3, 755.1, 596.6, 765.6)),
    ]
    for line, rects in zip(s["lines"][:3], line_rects):
        revenue, code, description, units, charge = line
        values = (revenue, description, code, short_date(s["dos_from"]), units, f"{charge:.2f}")
        for index, (value, rect) in enumerate(zip(values, rects)):
            field(value, rect, 6.0, "right" if index == 5 else "center" if index in (0, 2, 3, 4) else "left")
    field("0001", (102.3, 516.4, 134.6, 525.4), 6.0, "center")
    field("072626", (422.8, 515.8, 472.0, 527.2), 5.8, "center")
    field(f"{total:.2f}", (531.8, 514.7, 597.1, 525.2), 6.2, "right")

    # UB-04 FL 50-63: payer and insured information.
    field(s["payer"], (103.1, 490.6, 264.1, 500.6), 6.0)
    payer_ids = {
        "Northstar Health": "NORTHSTAR",
        "Pioneer Casualty": "PIONEERWC",
        "Meridian Community Health": "MERIDIAN",
        "Crescent Choice": "CRESCENT",
    }
    field(payer_ids.get(s["payer"], s["payer"].replace(" ", "")[:12].upper()), (269.1, 492.1, 370.8, 501.1), 5.8)
    field("Y", (376.3, 491.2, 387.6, 501.2), 6.0, "center")
    field("Y", (396.4, 491.3, 410.2, 501.5), 6.0, "center")
    field(f"{total:.2f}", (484.8, 492.2, 559.8, 501.7), 6.0, "right")
    field(s["npi"], (585.6, 502.8, 687.9, 512.8), 6.0)
    # FL 58-62: the primary insured belongs on payer sequence A.
    field(patient_claim_name, (103.5, 444.0, 283.7, 453.0), 6.0)
    field("18", (288.7, 442.7, 307.3, 452.7), 6.0, "center")
    field(s["member"], (311.7, 442.2, 450.6, 452.2), 6.0)
    field(s["plan"], (455.2, 443.8, 561.9, 453.6), 5.4)
    field(s["group"], (564.1, 442.8, 689.8, 452.8), 6.0)
    field(s["auth"], (104.2, 394.7, 319.6, 404.7), 6.0)

    # UB-04 FL 67, 74, 76, 80, and 81CC.
    field("0", (100.7, 358.5, 108.9, 370.0), 5.4, "center")
    field(s["diagnosis"].replace(".", ""), (110.7, 358.5, 157.7, 370.0), 6.2)
    field(provider_last, (480.3, 312.4, 585.3, 321.0), 5.8)
    field(provider_first, (610.5, 312.8, 690.3, 321.4), 5.8)
    field(s["npi"], (522.3, 324.0, 594.0, 332.6), 5.8)
    field("FICTIONAL TRAINING CLAIM - NOT FOR SUBMISSION", (103.0, 252.0, 457.0, 262.0), 5.6)
    field("B3", (462.0, 240.8, 486.0, 250.0), 5.8, "center")
    field("261QA1903X" if s["type_bill"].startswith("83") else "282N00000X", (489.0, 240.8, 585.0, 250.0), 5.8)
    c.save()
    buffer.seek(0)
    return buffer


def attachment_pdf(s: dict) -> BytesIO:
    buffer = BytesIO()
    styles = getSampleStyleSheet()
    styles["Title"].textColor = colors.HexColor("#123B43")
    styles["Heading2"].textColor = colors.HexColor("#176C74")
    doc = SimpleDocTemplate(buffer, pagesize=letter, leftMargin=0.55 * inch, rightMargin=0.55 * inch, topMargin=0.48 * inch, bottomMargin=0.48 * inch)
    story = [Paragraph("Training Claim Detail Attachment", styles["Title"]), Paragraph(f"{s['id']} | {s['form']} | Fictional record - not for submission", styles["Normal"]), Spacer(1, 10)]
    details = [
        ["Patient", s["patient"], "DOB", s["dob"]], ["Address", s["address"], "Member ID", s["member"]],
        ["Payer / plan", f"{s['payer']} / {s['plan']}", "Group", s["group"]],
        ["Claim / account", s["claim"], "Service dates", f"{s['dos_from']} to {s['dos_to']}"],
        ["Provider", s["provider"], "Facility", s["facility"]], ["NPI", s["npi"], "TIN", s["tin"]],
        ["Authorization / referral", s["auth"], "Diagnosis", s["diagnosis"]],
        ["Place / type of bill", s["pos"] or "Facility", "Form", s["form"]],
    ]
    table = Table(details, colWidths=[1.25*inch, 2.35*inch, 1.25*inch, 2.15*inch])
    table.setStyle(TableStyle([("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#B8C9C9")), ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#EDF4F2")), ("BACKGROUND", (2,0), (2,-1), colors.HexColor("#EDF4F2")), ("FONTNAME", (0,0), (-1,-1), "Helvetica"), ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"), ("FONTNAME", (2,0), (2,-1), "Helvetica-Bold"), ("FONTSIZE", (0,0), (-1,-1), 8), ("VALIGN", (0,0), (-1,-1), "TOP"), ("PADDING", (0,0), (-1,-1), 5)]))
    story += [table, Spacer(1, 12), Paragraph("Claim service lines", styles["Heading2"])]
    rows = [["From", "To", "Rev", "CPT/HCPCS", "Description", "Units", "Charge"]]
    for rev, code, desc, units, charge in s["lines"]:
        rows.append([s["dos_from"], s["dos_to"], rev or "-", code, desc, str(units), f"${charge:,.2f}"])
    rows.append(["", "", "", "", "TOTAL CHARGES", "", f"${sum(line[4] for line in s['lines']):,.2f}"])
    lines = Table(rows, repeatRows=1, colWidths=[0.76*inch,0.76*inch,0.42*inch,0.68*inch,2.65*inch,0.42*inch,0.82*inch])
    lines.setStyle(TableStyle([("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#B8C9C9")), ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#123B43")), ("TEXTCOLOR", (0,0), (-1,0), colors.white), ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"), ("FONTNAME", (4,-1), (-1,-1), "Helvetica-Bold"), ("FONTSIZE", (0,0), (-1,-1), 7.5), ("VALIGN", (0,0), (-1,-1), "TOP"), ("ALIGN", (5,1), (-1,-1), "RIGHT"), ("PADDING", (0,0), (-1,-1), 5)]))
    story += [lines, Spacer(1, 12), Paragraph("Training use", styles["Heading2"]), Paragraph("This attachment identifies the complete fictional source data represented on page 1. Learners should compare these values with the claim image, account record, eligibility response, clinical or authorization support, and billing history. It is not a payer-submission document and contains no real patient information.", styles["BodyText"])]
    doc.build(story)
    buffer.seek(0)
    return buffer


def generate(s: dict) -> Path:
    template = CMS_TEMPLATE if s["form"] == "CMS-1500" else UB_TEMPLATE
    reader = PdfReader(str(template))
    page = reader.pages[0]
    if "/Annots" in page:
        del page["/Annots"]
    width, height = float(page.mediabox.width), float(page.mediabox.height)
    overlay = PdfReader(cms_overlay(s, width, height) if s["form"] == "CMS-1500" else ub_overlay(s, width, height)).pages[0]
    page.merge_page(overlay)
    writer = PdfWriter()
    writer.add_page(page)
    for attachment_page in PdfReader(attachment_pdf(s)).pages:
        writer.add_page(attachment_page)
    slug = s["id"].lower() + "-" + s["form"].lower().replace("-", "") + ".pdf"
    target = OUTPUT / slug
    with target.open("wb") as handle:
        writer.write(handle)
    return target


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for scenario in SCENARIOS:
        print(generate(scenario).relative_to(ROOT))
