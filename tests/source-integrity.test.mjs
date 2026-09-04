import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const requiredFiles = [
  "public/billing/cms-1500-activity.pdf",
  "public/billing/ub-04-activity.pdf",
  "public/training-claims/ar-3142-cms1500.pdf",
  "public/training-claims/dm-5105-ub04.pdf",
  "public/fonts/geist-latin.woff2",
];

test("includes the learner workflows and downloadable source records", async () => {
  await Promise.all(requiredFiles.map((file) => access(file)));
  const workspace = await readFile("app/components/TrainingWorkspace.tsx", "utf8");
  assert.match(workspace, /BillingLab/);
  assert.match(workspace, /PaymentPostingLab/);
  assert.match(workspace, /ARCollectionsLab/);
  assert.match(workspace, /mode="denial"/);
});

test("keeps device-local learner progress and PDF generation", async () => {
  const [billing, billingData, exportCenter, claimPdf] = await Promise.all([
    readFile("app/components/BillingLab.tsx", "utf8"),
    readFile("app/data/billing.ts", "utf8"),
    readFile("app/components/PdfExportCenter.tsx", "utf8"),
    readFile("app/lib/claimPdf.ts", "utf8"),
  ]);
  assert.match(billing, /localStorage/);
  assert.match(billing, /showEditHints/);
  assert.match(billing, /MM\/DD\/YYYY/);
  assert.doesNotMatch(billing, /date in YYYY-MM-DD format/);
  assert.match(billing, /Non-applicable locators remain blank/);
  assert.match(billing, /disabled=\{downloading \|\| !claimReadyForDownload\}/);
  assert.match(billingData, /\["insuredName", "4"/);
  assert.match(billingData, /\["medicalRecord", "3b"/);
  assert.match(billingData, /"Discharge status": "01"/);
  assert.match(exportCenter, /localStorage/);
  assert.match(claimPdf, /PDFDocument/);
  assert.match(claimPdf, /v\("insuredName"\)/);
  assert.match(claimPdf, /v\("medicalRecord"\)/);
});
