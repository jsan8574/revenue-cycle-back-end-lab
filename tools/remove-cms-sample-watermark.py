#!/usr/bin/env python3
"""Remove the diagonal SAMPLE watermark from the blank CMS-1500 activity.

The official-form artwork remains intact. This only removes the two vector
text fragments that form the diagonal SAMPLE label.
"""

from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import DecodedStreamObject, NameObject


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/billing/cms-1500-activity.pdf"
OUTPUT = Path("/private/tmp/cms-1500-activity-no-sample.pdf")

AMPLE_BLOCK = b"""BT
0.985 g
1 i
/GS3 gs
/TT0 1 Tf
123.9592 78.3146 -78.3146 123.9592 169.8217 321.5953 Tm
(AMPLE) Tj
/CS0 cs
1 scn
0 i
/GS4 gs
/TT1 1 Tf
8 0 1.7 7.998 289.4533 63.2983 Tm
(PLEASE PRINT OR TYPE ) Tj
/CS2 cs
1 scn
/GS5 gs
/T1_0 1 Tf
7.9992 0 0 8 449.9839 63.7451 Tm
(APPROVED OMB\\0550938\\0551197 FORM 1500 \\05002\\05512\\051 ) Tj
ET
EMC
"""

S_BLOCK = b"""BT
/Artifact <<
/Attached [ /Top ]
/BBox [ 8.8796 238.1055 662.0131 735.0052 ]
/Subtype /Header
/Type /Pagination
>> BDC
0.985 g
1 i
/GS3 gs
/TT0 1 Tf
123.9592 78.3146 -78.3146 123.9592 80.3232 265.0522 Tm
[ (S) -3833 ( ) ] TJ
EMC
ET
"""


def remove_once(content: bytes, block: bytes, label: str) -> bytes:
    if content.count(block) != 1:
        raise RuntimeError(f"Expected exactly one {label} watermark block")
    return content.replace(block, b"", 1)


reader = PdfReader(str(SOURCE))
writer = PdfWriter()
writer.clone_document_from_reader(reader)
page = writer.pages[0]
content = page.get_contents().get_data()
content = remove_once(content, AMPLE_BLOCK, "AMPLE")
content = remove_once(content, S_BLOCK, "S")

replacement = DecodedStreamObject()
replacement.set_data(content)
page[NameObject("/Contents")] = writer._add_object(replacement)

with OUTPUT.open("wb") as stream:
    writer.write(stream)

print(OUTPUT)
