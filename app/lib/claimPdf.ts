type ClaimForm = "CMS-1500" | "UB-04";
type Rect = [number, number, number, number];

const normalize = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const ascii = (value: string) => value.replace(/[’‘]/g, "'").replace(/[^\x20-\x7E]/g, "");

function compactDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[2]}${match[3]}${match[1].slice(2)}` : value.replace(/\D/g, "");
}

function fullDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[2]}${match[3]}${match[1]}` : value.replace(/\D/g, "");
}

export async function buildClaimPdf({
  templateBytes, form, values, learnerName, scenarioId, patient,
}: {
  templateBytes: ArrayBuffer;
  form: ClaimForm;
  values: Record<string, string>;
  learnerName: string;
  scenarioId: string;
  patient: string;
}) {
  const { PDFDocument, PDFName, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.load(templateBytes);
  pdf.setAuthor(learnerName);
  pdf.setTitle(`${form} training claim - ${patient}`);
  try { pdf.getForm().flatten(); } catch { /* legacy hybrid form */ }
  const pages = pdf.getPages();
  pages.forEach((outputPage) => outputPage.node.delete(PDFName.of("Annots")));
  pdf.catalog.delete(PDFName.of("AcroForm"));
  const page = pages[0];
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.02, 0.16, 0.2);
  const v = (id: string) => ascii(values[id] || "");
  const drawRect = (text: string, rect: Rect, size = 6.2, align: "left" | "center" | "right" = "left", heavy = false) => {
    if (!text) return;
    const [x1, y1, x2, y2] = rect;
    const selectedFont = heavy ? bold : font;
    const available = Math.max(1, x2 - x1 - 4);
    let safe = text.slice(0, 100), actualSize = size;
    while (actualSize > 4.5 && selectedFont.widthOfTextAtSize(safe, actualSize) > available) actualSize -= 0.2;
    while (safe && selectedFont.widthOfTextAtSize(safe, actualSize) > available) safe = safe.slice(0, -1);
    const width = selectedFont.widthOfTextAtSize(safe, actualSize);
    const x = align === "right" ? x2 - width - 2 : align === "center" ? x1 + (x2 - x1 - width) / 2 : x1 + 2;
    const y = y1 + Math.max(1.2, (y2 - y1 - actualSize) / 2 + 1.2);
    page.drawText(safe, { x, y, size: actualSize, font: selectedFont, color: ink });
  };

  if (form === "CMS-1500") {
    const coverage: Record<string, number> = { medicare: 63, medicaid: 111, tricare: 160, champva: 225, grouphealthplan: 278, feca: 334, other: 379 };
    const addressParts = v("patientAddress").split(",").map((part) => part.trim());
    const stateZip = (addressParts[2] || "").match(/^([A-Z]{2})\s+(.+)$/i);
    const dob = compactDate(v("patientDob"));
    const dateCells: Rect[] = [[60.4, 277, 79.5, 301], [79.5, 277, 100.5, 301], [100.5, 277, 122.6, 301], [122.6, 277, 143.5, 301], [143.5, 277, 166.3, 301], [166.3, 277, 187, 301]];
    const serviceRows = [
      { main: [277, 301] as const, npi: [277, 288.8] as const },
      { main: [252.4, 277] as const, npi: [252.4, 264.6] as const },
    ];

    drawRect("X", [coverage[normalize(v("coverage"))] || 278, 708, (coverage[normalize(v("coverage"))] || 278) + 12, 724], 9, "center", true);
    drawRect(v("memberId"), [411.3, 707, 628.4, 731], 7);
    drawRect(v("patientName"), [60.4, 684.4, 266.3, 707], 7);
    if (dob.length >= 6) {
      drawRect(dob.slice(0, 2), [275, 684.4, 299, 694], 6.2, "center");
      drawRect(dob.slice(2, 4), [300, 684.4, 324, 694], 6.2, "center");
      drawRect(dob.slice(4, 6), [326, 684.4, 350, 694], 6.2, "center");
    }
    drawRect("X", normalize(v("patientSex")) === "m" ? [357, 684.4, 370, 698] : [392, 684.4, 405, 698], 8, "center", true);
    drawRect(addressParts[0] || v("patientAddress"), [60.4, 659.5, 266.3, 684.4], 6.5);
    drawRect(addressParts[1] || "", [60.4, 636.4, 240, 659.5], 6.5);
    drawRect(stateZip?.[1] || "", [240, 636.4, 266.3, 659.5], 6.5, "center");
    drawRect(stateZip?.[2] || "", [60.4, 611, 153.6, 636.4], 6.5);
    drawRect("X", [293, 659.5, 305, 674], 8, "center", true);
    drawRect(v("policy"), [411.3, 588, 628.5, 611], 7);
    drawRect(v("patientSignature"), [95, 444, 250, 458], 6.2);
    drawRect(v("insuredSignature"), [455, 444, 600, 458], 6.2);
    drawRect(v("icdIndicator"), [355, 358, 368.5, 371.8], 6.5, "center", true);
    drawRect(v("diagnosis").replace(".", ""), [74, 349.2, 124.7, 360.5], 6.5);

    [1, 2].forEach((line, index) => {
      if (!v(`cpt${line}`)) return;
      const row = serviceRows[index];
      const date = compactDate(v(`dos${line}`));
      dateCells.forEach((rect, cell) => {
        const shifted: Rect = [rect[0], row.main[0], rect[2], row.main[1]];
        drawRect(date.slice(cell * 2, cell * 2 + 2) || date.slice((cell % 3) * 2, (cell % 3) * 2 + 2), shifted, 6.2, "center");
      });
      drawRect(v(`pos${line}`), [187, row.main[0], 210, row.main[1]], 6.5, "center");
      drawRect(v(`cpt${line}`), [231.6, row.main[0], 284, row.main[1]], 6.5, "center");
      drawRect(v(`pointer${line}`), [374.5, row.main[0], 411.3, row.main[1]], 6.5, "center");
      drawRect(Number(v(`charge${line}`) || 0).toFixed(2), [411.3, row.main[0], 475, row.main[1]], 6.2, "right");
      drawRect(v(`units${line}`), [475, row.main[0], 504, row.main[1]], 6.5, "center");
      drawRect(v(`renderingNpi${line}`), [540, row.npi[0], 628.5, row.npi[1]], 6.2, "center");
    });
    drawRect(v("taxId"), [60.4, 132.8, 216.5, 157], 6.5);
    drawRect("X", [136, 132.8, 153, 148], 8, "center", true);
    drawRect(v("patientAccount"), [216.5, 132.8, 322, 157], 6.2);
    drawRect("X", [326, 132.8, 342, 149], 9, "center", true);
    drawRect(Number(v("totalCharges") || 0).toFixed(2), [411.3, 132.8, 492, 157], 6.5, "right");
    const facilityParts = v("facility").split(",").map((part) => part.trim());
    const billingParts = v("billingProvider").split(",").map((part) => part.trim());
    drawRect(v("providerSignature"), [85, 72, 190, 85], 5.8);
    drawRect(facilityParts[0] || "", [220, 116, 409, 129], 5.6);
    drawRect(facilityParts[1] || "", [220, 104, 409, 116], 5.2);
    drawRect(`${facilityParts[2] || ""}, ${facilityParts[3] || ""}`, [220, 92, 409, 104], 5.2);
    drawRect(v("facilityNpi"), [235, 72, 321.9, 86], 6);
    drawRect(billingParts[0] || "", [415, 116, 627, 129], 5.6);
    drawRect(billingParts[1] || "", [415, 104, 627, 116], 5.2);
    drawRect(`${billingParts[2] || ""}, ${billingParts[3] || ""}`, [415, 92, 627, 104], 5.2);
    drawRect(v("billingNpi"), [430, 72, 494.3, 86], 6);
  } else {
    const providerParts = v("provider").split(",").map((part) => part.trim());
    const patientParts = v("patientAddress").split(",").map((part) => part.trim());
    const stateZip = (patientParts[2] || "").match(/^([A-Z]{2})\s+(.+)$/i);
    drawRect(providerParts[0] || "", [112.3, 981.8, 276.9, 993.1]);
    drawRect(providerParts[1] || "", [112.3, 969.5, 276.9, 980.8], 6);
    drawRect(`${providerParts[2] || ""}, ${providerParts[3] || ""}`, [112.1, 957.1, 276.7, 968.5], 6);
    drawRect("2065550140", [112.3, 946.9, 276.9, 957.4], 6);
    drawRect(v("patientControl"), [490.8, 982.6, 638.4, 995.2]);
    drawRect(v("patientControl").replace(/\W/g, ""), [490.2, 971.6, 637, 982], 6);
    drawRect(v("typeOfBill"), [657, 970.4, 691.4, 983.7], 7, "center");
    drawRect(v("taxId").replace("-", ""), [463.9, 947.8, 529.3, 958.3], 6);
    drawRect(fullDate(v("statementFrom")), [533.5, 947.6, 581.6, 958.6], 6, "center");
    drawRect(fullDate(v("statementThrough")), [585.5, 946.7, 633.5, 958.6], 6, "center");
    drawRect(v("patientName").toUpperCase(), [110.3, 922.2, 313.7, 936]);
    drawRect(patientParts[0] || "", [401.6, 935.3, 688.5, 947.3], 6);
    drawRect(patientParts[1] || "", [326.4, 924.4, 550.4, 934], 6);
    drawRect(stateZip?.[1] || "", [562.8, 923.6, 584.3, 934.1], 6, "center");
    drawRect(stateZip?.[2] || "", [591.5, 924.1, 660.2, 935.2], 6);
    drawRect(fullDate(v("patientDob")), [102, 901.1, 164.2, 910.9], 6, "center");
    drawRect(v("patientSex"), [168.6, 899.6, 183.7, 911.7], 6, "center");
    drawRect(compactDate(v("admitDate")), [187.5, 900.7, 229.5, 910.2], 5.8, "center");
    drawRect(v("admitHour"), [233.2, 899.7, 250.3, 910.2], 5.8, "center");
    drawRect(v("admitType"), [253.4, 899.6, 269.9, 910.6], 6, "center");
    drawRect("1", [276, 899.2, 292.5, 910.6], 6, "center");
    drawRect(v("patientStatus").padStart(2, "0"), [340.2, 899.5, 358.7, 909.5], 5.8, "center");
    const lineRects: Rect[][] = [
      [[101.6,780.3,132.7,789.3],[136.8,780.3,309.8,790.3],[316.2,778.5,419.2,789.7],[424.4,780.1,468.9,789.1],[474.6,780.1,527.7,790.9],[532.6,779.1,597.9,789.1]],
      [[101.6,768.8,132.8,777.3],[136.2,768,310.8,778],[316.9,767.2,418.8,777.7],[424.2,768.7,469.2,777.2],[475.1,767.7,528.2,778.5],[532.3,767.5,597.6,777.5]],
      [[101.7,756.7,133.2,765.4],[136.9,755.7,310.9,766.2],[316.8,753.2,418.3,766.3],[424.4,756.8,467.9,765.3],[475.1,754.1,528.2,764.8],[531.3,755.1,596.6,765.6]],
      [[102.1,744.5,131.9,753],[137.4,743.2,311.4,753.7],[316.2,739.9,418.4,753],[423.6,744.7,468.1,753.2],[474.6,742.8,527.7,753.6],[532.7,743,598,753.5]],
    ];
    [1, 2, 3, 4].forEach((line, index) => {
      if (!v(`rev${line}`)) return;
      const lineValues = [v(`rev${line}`), v(`desc${line}`), v(`hcpcs${line}`), compactDate(v(`serviceDate${line}`)), v(`units${line}`), Number(v(`charge${line}`) || 0).toFixed(2)];
      lineValues.forEach((value, fieldIndex) => drawRect(value, lineRects[index][fieldIndex], 6, fieldIndex === 5 ? "right" : [0,2,3,4].includes(fieldIndex) ? "center" : "left"));
    });
    drawRect("0001", [102.3, 516.4, 134.6, 525.4], 6, "center");
    drawRect(compactDate(v("statementThrough")), [422.8, 515.8, 472, 527.2], 5.8, "center");
    drawRect(Number(v("totalCharges") || 0).toFixed(2), [531.8, 514.7, 597.1, 525.2], 6.2, "right");
    drawRect(v("payer"), [103.1, 490.6, 264.1, 500.6], 6);
    drawRect(v("planId"), [269.1, 492.1, 370.8, 501.1], 6);
    drawRect("Y", [376.3, 491.2, 387.6, 501.2], 6, "center");
    drawRect("Y", [396.4, 491.3, 410.2, 501.5], 6, "center");
    drawRect(Number(v("totalCharges") || 0).toFixed(2), [484.8, 492.2, 559.8, 501.7], 6, "right");
    drawRect("1098765432", [585.6, 502.8, 687.9, 512.8], 6);
    drawRect(v("insuredName").toUpperCase(), [103.5, 432, 283.7, 441], 6);
    drawRect(v("relationship"), [288.7, 430.7, 307.3, 440.7], 6, "center");
    drawRect(v("memberId"), [311.7, 430.2, 450.6, 440.2], 6);
    drawRect(v("groupName"), [455.2, 431.8, 561.9, 441.6], 5.8);
    drawRect(v("groupNumber"), [564.1, 430.8, 689.8, 440.8], 6);
    drawRect(v("authorization"), [104.2, 394.7, 319.6, 404.7], 6);
    drawRect(v("icdIndicator"), [100.7, 358.5, 108.9, 370], 5.4, "center");
    drawRect(v("diagnosis").replace(".", ""), [110.7, 358.5, 157.7, 370], 6.2);
    drawRect(v("otherDiagnosis").replace(".", ""), [168.1, 358.6, 212.1, 370.8], 6.2);
    drawRect(v("procedure"), [130.1, 336, 176.6, 346.6], 6);
    drawRect(compactDate(v("procedureDate")), [218.2, 335.1, 263.2, 345.1], 5.8, "center");
    drawRect(v("attendingNpi"), [522.3, 324, 594, 332.6], 5.8);
    drawRect(v("attendingLast").toUpperCase(), [480.3, 312.4, 585.3, 321], 5.8);
    drawRect(v("attendingFirst").toUpperCase(), [610.5, 312.8, 690.3, 321.4], 5.8);
    drawRect(`FICTIONAL TRAINING CLAIM | ${learnerName} | ${scenarioId}`, [103, 252, 457, 262], 5.6);
    drawRect("B3", [462, 240.8, 486, 250], 5.8, "center");
    drawRect(v("taxonomy"), [489, 240.8, 585, 250], 5.8);
  }

  return pdf.save({ useObjectStreams: false });
}
