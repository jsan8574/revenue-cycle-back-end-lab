#!/usr/bin/env python3
"""Generate fictional completed CMS-1500 and UB-04 training claim packets."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream, FloatObject, NameObject
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
CMS_TEMPLATE = ROOT / "public/billing/cms-1500-activity.pdf"
UB_TEMPLATE = ROOT / "public/billing/ub-04-activity.pdf"
OUTPUT = ROOT / "public/training-claims"


SCENARIOS = [
    dict(id="AR-3106", form="UB-04", patient="Evelyn Brooks", dob="09/16/1971", address="1840 Cedar Lane, Portland, OR 97205", member="NSH-188-2044", group="NS-44018", payer="Northstar Health", plan="Northstar Choice PPO", dos_from="04/18/2026", dos_to="04/18/2026", provider="Dr. Oliver Grant", facility="Evergreen Surgical Center", npi="1992881044", tin="91-8842017", claim="CL-7719204", auth="NS-AUTH-771920", diagnosis="M17.11", type_bill="131", pos="24", lines=[("0360", "27447", "Total knee arthroplasty", 1, 17400), ("0320", "73560", "Post-op knee imaging", 1, 1240)]),
    dict(id="AR-3119", form="UB-04", patient="Marcus Hill", dob="01/28/1980", address="2298 Willow Street, Salem, OR 97301", member="WC-558-291", group="OR-WC-9044", payer="Pioneer Casualty", plan="Oregon Workers Compensation", dos_from="03/06/2026", dos_to="03/06/2026", provider="Dr. Nadia Wells", facility="Evergreen Orthopedics", npi="1447289062", tin="93-7712048", claim="CL-7601138", auth="UR-391184", diagnosis="S83.241A", type_bill="131", pos="24", lines=[("0360", "29881", "Knee arthroscopy", 1, 6120), ("0320", "73562", "Knee radiology", 1, 800)]),
    dict(id="AR-3142", form="CMS-1500", patient="Noah Bennett", dob="06/21/1992", address="610 North Harbor Way, Portland, OR 97209", member="HBX-771-4482", group="HB-77144", payer="Harbor Blue PPO", plan="Harbor Blue Preferred", dos_from="02/22/2026", dos_to="02/22/2026", provider="Dr. Erin Blake", facility="Evergreen Imaging", npi="1669402281", tin="91-8842017", claim="CL-7413360", auth="HB-PA-741336", diagnosis="M54.50", type_bill="", pos="49", lines=[("", "72148", "MRI lumbar spine", 1, 1175)]),
    dict(id="AR-3160", form="UB-04", patient="Camille Foster", dob="10/11/1985", address="921 Summit Avenue, Eugene, OR 97401", member="MCH-440-7781", group="MCH-55190", payer="Meridian Community Health", plan="Meridian Select PPO", dos_from="05/08/2026", dos_to="05/08/2026", provider="Dr. Lena Walsh", facility="Evergreen Emergency Department", npi="1225487714", tin="91-8842017", claim="CL-7360448", auth="EMERGENCY", diagnosis="R07.9", type_bill="131", pos="23", lines=[("0450", "99285", "Emergency department visit", 1, 2500), ("0320", "71046", "Chest radiology, two views", 1, 700)]),
    dict(id="AR-3174", form="UB-04", patient="Renee Wallace", dob="02/24/1976", address="1148 Rosewood Drive, Beaverton, OR 97005", member="NSH-772-6614", group="NS-44018", payer="Northstar Health", plan="Northstar Choice PPO", dos_from="05/01/2026", dos_to="05/01/2026", provider="Dr. Maya Chen", facility="Evergreen Infusion Center", npi="1881027746", tin="91-8842017", claim="CL-7308825", auth="NS-AUTH-730882", diagnosis="K50.90", type_bill="131", pos="22", lines=[("0636", "J1745", "Infliximab, 10 mg", 40, 7200), ("0335", "96413", "Chemotherapy administration", 1, 1200)]),
    dict(id="DM-5101", form="CMS-1500", patient="Nora Bennett", dob="11/08/1968", address="431 Lakeview Court, Hillsboro, OR 97124", member="HBX-550-1492", group="HB-55014", payer="Harbor Blue PPO", plan="Harbor Blue Select PPO", dos_from="03/31/2026", dos_to="03/31/2026", provider="Dr. Priya Nair", facility="Evergreen Diagnostic Imaging", npi="1992881044", tin="91-8842017", claim="CL-8401183", auth="HB-PA-840118", diagnosis="M54.16", type_bill="", pos="49", lines=[("", "72158", "Lumbar MRI with and without contrast", 1, 4200), ("", "76376", "3-D rendering with interpretation", 1, 720)]),
    dict(id="DM-5102", form="UB-04", patient="Andre Collins", dob="01/19/1959", address="87 Hawthorne Place, Gresham, OR 97030", member="CCR-882-1104", group="CC-88211", payer="Crescent Choice", plan="Crescent Choice Gold", dos_from="05/15/2026", dos_to="05/16/2026", provider="Dr. Samuel Ortiz", facility="Evergreen Medical Center", npi="1992881044", tin="91-8842017", claim="CL-8517045", auth="CC-AUTH-771902", diagnosis="R06.02", type_bill="131", pos="22", lines=[("0510", "99223", "Initial hospital care", 1, 1640), ("0762", "G0378", "Hospital observation service", 20, 9000), ("0320", "71046", "Chest radiology", 1, 2000)]),
    dict(id="DM-5103", form="CMS-1500", patient="Leah Morgan", dob="06/12/1990", address="1507 Pinecrest Road, Tigard, OR 97223", member="SUM-331-0084", group="SUM-33100", payer="Summit Health HMO", plan="Summit Essential HMO", dos_from="06/18/2026", dos_to="06/18/2026", provider="Dr. Amelia Hart", facility="Evergreen Neurology", npi="1992881044", tin="91-8842017", claim="CL-8627016", auth="SUM-REF-500812", diagnosis="G43.909", type_bill="", pos="11", lines=[("", "99205", "New patient office visit", 1, 685), ("", "96127", "Brief emotional assessment", 1, 100)]),
    dict(id="DM-5104", form="CMS-1500", patient="Felix Ramirez", dob="04/27/1977", address="774 Birch Avenue, Lake Oswego, OR 97034", member="MER-009-7112", group="MER-00971", payer="MeridianCare", plan="Meridian Preferred", dos_from="04/26/2026", dos_to="04/26/2026", provider="Dr. Renee Wallace", facility="Evergreen Outpatient Lab", npi="1992881044", tin="91-8842017", claim="CL-8733904", auth="N/A", diagnosis="Z13.79", type_bill="", pos="81", lines=[("", "81479", "Unlisted molecular pathology procedure", 1, 1280), ("", "36415", "Venipuncture", 1, 100)]),
    dict(id="DM-5105", form="UB-04", patient="Camille Foster", dob="12/02/1982", address="921 Summit Avenue, Eugene, OR 97401", member="NSH-774-0091", group="NS-44018", payer="Northstar Health", plan="Northstar Choice PPO", dos_from="06/02/2026", dos_to="06/02/2026", provider="Dr. Oliver Grant", facility="Evergreen Infusion Center", npi="1992881044", tin="91-8842017", claim="CL-8842196", auth="NS-AUTH-884219", diagnosis="K50.90", type_bill="131", pos="22", lines=[("0636", "J1745", "Infliximab, 10 mg", 40, 7200), ("0335", "96413", "Chemotherapy administration", 1, 1200)]),
]


def lighten_cms_watermark() -> None:
    reader = PdfReader(str(CMS_TEMPLATE))
    page = reader.pages[0]
    stream = ContentStream(page.get_contents(), reader)
    changed = False
    for operands, operator in stream.operations:
        if operator == b"g" and operands and (
            abs(float(operands[0]) - 0.74) < 0.001
            or abs(float(operands[0]) - 0.95) < 0.001
        ):
            operands[0] = FloatObject(0.985)
            changed = True
    if changed:
        page[NameObject("/Contents")] = stream
        writer = PdfWriter()
        writer.add_page(page)
        with CMS_TEMPLATE.open("wb") as handle:
            writer.write(handle)


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
    c.setFont("Helvetica", 7)
    total = sum(line[4] for line in s["lines"])
    entries = [
        (438, 724, s["member"]), (58, 699, s["patient"]), (286, 699, s["dob"]),
        (434, 699, s["patient"]), (58, 675, s["address"]), (434, 675, s["address"]),
        (434, 606, s["group"]), (434, 560, s["plan"]), (434, 536, s["payer"]),
        (58, 493, "SIGNATURE ON FILE"), (358, 493, "SIGNATURE ON FILE"),
        (58, 445, s["provider"]), (292, 445, s["npi"]),
        (58, 417, f"TRAINING CLAIM {s['claim']}"), (434, 397, s["auth"]),
        (112, 369, s["diagnosis"]), (58, 119, s["tin"]), (220, 119, s["claim"]),
        (446, 119, f"{total:,.2f}"), (58, 80, f"{s['provider']} - SIGNATURE ON FILE"),
        (220, 80, s["facility"]), (434, 80, "Evergreen Medical Group"),
    ]
    for x, y, value in entries:
        c.drawString(x, y, str(value)[:44])
    c.setFont("Helvetica", 6.5)
    for index, line in enumerate(s["lines"][:6]):
        y = 313 - index * 28
        c.drawString(58, y, s["dos_from"][:5] + "26")
        c.drawString(104, y, s["dos_to"][:5] + "26")
        c.drawString(148, y, s["pos"])
        c.drawString(205, y, line[1])
        c.drawString(368, y, "A")
        c.drawRightString(470, y, f"{line[4]:,.2f}")
        c.drawString(500, y, str(line[3]))
        c.drawString(548, y, s["npi"])
    c.save()
    buffer.seek(0)
    return buffer


def ub_overlay(s: dict, width: float, height: float) -> BytesIO:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(width, height))
    draw_training_label(c, width, height)
    c.setFillColorRGB(0.04, 0.20, 0.27)
    c.setFont("Helvetica", 6.3)
    total = sum(line[4] for line in s["lines"])
    entries = [
        (55, 682, f"{s['facility']} | Evergreen Medical Group"), (400, 682, s["tin"]),
        (535, 682, s["type_bill"]), (55, 652, s["patient"]), (245, 652, s["address"]),
        (55, 625, s["dob"]), (112, 625, "U"), (210, 625, s["claim"]),
        (405, 625, s["dos_from"]), (475, 625, s["dos_to"]),
        (55, 214, s["payer"]), (210, 214, s["plan"]), (375, 214, s["member"]),
        (55, 187, s["provider"]), (210, 187, s["npi"]), (375, 187, s["auth"]),
        (55, 135, s["diagnosis"]), (420, 108, f"{total:,.2f}"), (505, 108, "0.00"),
    ]
    for x, y, value in entries:
        c.drawString(x, y, str(value)[:48])
    c.setFont("Helvetica", 6.1)
    for index, line in enumerate(s["lines"][:10]):
        y = 552 - index * 19
        c.drawString(52, y, line[0] or "0001")
        c.drawString(82, y, line[2][:29])
        c.drawString(280, y, line[1])
        c.drawString(338, y, s["dos_from"])
        c.drawString(406, y, s["dos_to"])
        c.drawRightString(506, y, f"{line[4]:,.2f}")
        c.drawString(516, y, str(line[3]))
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
    lighten_cms_watermark()
    for scenario in SCENARIOS:
        print(generate(scenario).relative_to(ROOT))
