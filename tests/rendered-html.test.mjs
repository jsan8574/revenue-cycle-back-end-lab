import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the learner entry screen", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Revenue Cycle Back End Lab/);
  assert.match(html, /Welcome to your practice session\./);
  assert.match(html, /Learner name/);
  assert.match(html, /Begin learner session/);
  assert.match(html, /All accounts and payer records in this lab are fictional\./);
});

test("uses real current-session progress instead of fictional dashboard activity", async () => {
  const [workspace, styles] = await Promise.all([
    readFile(new URL("../app/components/TrainingWorkspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(workspace, /useState<CompletionLog\[\]>\(\[\]\)/);
  assert.match(workspace, /Session readiness/);
  assert.match(workspace, /completed this session/);
  assert.match(workspace, /Session progress by workflow/);
  assert.match(workspace, /RCM readiness evidence/);
  assert.match(workspace, /Build one complete work sample in every workflow\./);
  assert.match(workspace, /const readinessEvidence: Record<ModuleId, string>/);
  assert.match(workspace, /Next: \$\{nextModule\.navLabel\}/);
  assert.doesNotMatch(workspace, /Recent coaching sessions/);
  assert.doesNotMatch(workspace, /Team readiness/);
  assert.doesNotMatch(workspace, /completed this week/);
  assert.match(styles, /\.module-progress-row/);
  assert.match(styles, /\.readiness-action-panel/);
});

test("supports an icon-only workspace toggle, required coaching acknowledgment, and full document review", async () => {
  const [workspace, arLab, styles] = await Promise.all([
    readFile(new URL("../app/components/TrainingWorkspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ARCollectionsLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(workspace, /const \[sidebarCollapsed, setSidebarCollapsed\]/);
  assert.match(workspace, /sidebar-is-collapsed/);
  assert.match(workspace, /Hide workspace navigation/);
  assert.match(workspace, /Show workspace navigation/);
  assert.doesNotMatch(workspace, /Show menu/);
  assert.doesNotMatch(workspace, /Hide menu/);
  assert.match(arLab, /acknowledgedAt: string/);
  assert.match(arLab, /Acknowledge and unlock accounts/);
  assert.match(arLab, /disabled=\{!acknowledged\}/);
  assert.match(arLab, /Coaching key acknowledgement:/);
  assert.match(arLab, /Complete coaching key:/);
  assert.match(arLab, /Workflow activity record/);
  assert.match(arLab, /Document accessed:/);
  assert.match(arLab, /Expand document ↗/);
  assert.match(arLab, /document-fullscreen-dialog/);
  assert.match(styles, /\.sidebar-is-collapsed \.sidebar/);
  assert.match(styles, /\.priority-coaching-acknowledgment/);
  assert.match(styles, /\.document-fullscreen-backdrop/);
  assert.match(styles, /\.document-fullscreen-scroll \.pdf-document-sheet/);
});

test("separates internal task routing from payer-side escalation", async () => {
  const [arLab, explorationData, styles] = await Promise.all([
    readFile(new URL("../app/components/ARCollectionsLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/exploration.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  const internalRoutes = explorationData.match(
    /export const resolutionRoutes = \[([\s\S]*?)\];/,
  )?.[1] ?? "";
  const payerRoutes = explorationData.match(
    /export const payerEscalationRoutes = \[([\s\S]*?)\];/,
  )?.[1] ?? "";

  assert.match(explorationData, /label: "Send internal task \/ escalation"/);
  assert.match(explorationData, /label: "Escalate with payer \/ adjuster"/);
  assert.doesNotMatch(internalRoutes, /Payer adjuster supervisor/);
  assert.match(internalRoutes, /Internal billing team/);
  assert.match(payerRoutes, /Payer adjuster supervisor/);
  assert.match(explorationData, /action: "payer-escalation",\s*route: "payer-supervisor-escalation"/);
  assert.match(arLab, /Payer escalation route/);
  assert.match(arLab, /Internal route \/ destination/);
  assert.match(arLab, /External payer-side escalation/);
  assert.match(arLab, /payerEscalationSelected/);
  assert.match(styles, /\.resolution-route-guidance/);
});

test("includes the Billing claim-form mastery workflow", async () => {
  const [workspace, billingLab, billingData, claimPdf, packageJson] = await Promise.all([
    readFile(new URL("../app/components/TrainingWorkspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/BillingLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/billing.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/claimPdf.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(workspace, /id:\s*"billing"/);
  assert.match(workspace, /<BillingLab/);
  assert.match(billingLab, /Submit \/ resubmit to clearinghouse/);
  assert.match(billingLab, /Congratulations, you sent a clean claim\./);
  assert.match(billingLab, /Download accomplished/);
  assert.match(billingLab, /showEditHints/);
  assert.match(billingLab, /Hint: \{learnerHint/);
  assert.match(billingLab, /Use the date picker or enter the date in the format displayed by this field: MM\/DD\/YYYY/);
  assert.doesNotMatch(billingLab, /date in YYYY-MM-DD format/);
  assert.match(billingLab, /This field accepts numerical dollar data/);
  assert.match(billingLab, /The options are Medicare, Medicaid, TRICARE/);
  assert.match(billingLab, /Valid choices include Y, I, or R/);
  assert.match(billingLab, /Non-applicable locators remain blank, as they would on an actual claim/);
  assert.match(billingLab, /Your accomplished \{scenario\.form\} is ready to download/);
  assert.match(billingLab, /disabled=\{downloading \|\| !claimReadyForDownload\}/);
  assert.match(billingLab, /pass claim edits before downloading the accomplished form/);
  assert.doesNotMatch(billingLab, /className="claim-preview"/);
  assert.match(billingLab, /CMS-1500 source/);
  assert.match(billingLab, /CMS-1450 \/ UB-04 guidance/);
  assert.match(billingLab, /buildClaimPdf/);
  assert.match(claimPdf, /const drawRect =/);
  assert.match(claimPdf, /outputPage\.node\.delete\(PDFName\.of\("Annots"\)\)/);
  assert.match(claimPdf, /pdf\.catalog\.delete\(PDFName\.of\("AcroForm"\)\)/);
  assert.match(claimPdf, /\[187, row\.main\[0\], 210, row\.main\[1\]\]/);
  assert.match(claimPdf, /\[231\.6, row\.main\[0\], 284, row\.main\[1\]\]/);
  assert.match(claimPdf, /\[374\.5, row\.main\[0\], 411\.3, row\.main\[1\]\]/);
  assert.match(claimPdf, /\[411\.3, row\.main\[0\], 475, row\.main\[1\]\]/);
  assert.match(claimPdf, /\[475, row\.main\[0\], 504, row\.main\[1\]\]/);
  assert.match(claimPdf, /\[540, row\.npi\[0\], 628\.5, row\.npi\[1\]\]/);
  assert.match(claimPdf, /\[101\.6,780\.3,132\.7,789\.3\]/);
  assert.match(claimPdf, /v\("insuredName"\)/);
  assert.match(claimPdf, /v\("patientPhone"\)/);
  assert.match(claimPdf, /v\("amountPaid"\)/);
  assert.match(claimPdf, /v\("balanceDue"\)/);
  assert.match(claimPdf, /v\("medicalRecord"\)/);
  assert.match(claimPdf, /v\("creationDate"\)/);
  assert.match(claimPdf, /v\("priorPayments"\)/);
  assert.match(claimPdf, /v\("estimatedDue"\)/);
  assert.doesNotMatch(claimPdf, /draw\(v\("provider"\)\.split\(","\)\[0\], 114, 986/);
  assert.match(billingData, /export const billingScenarios/);
  assert.match(billingData, /form:\s*"CMS-1500"/);
  assert.match(billingData, /form:\s*"UB-04"/);
  assert.match(billingData, /\["icdIndicator", "21 · ICD Ind\."/);
  assert.match(billingData, /\["memberId", "60A", "Insured unique ID \/ member ID"/);
  assert.match(billingData, /\["insuredName", "4", "Insured name"/);
  assert.match(billingData, /\["medicalRecord", "3b", "Medical record number"/);
  assert.match(billingData, /\["releaseInfo", "52A", "Release of information"/);
  assert.match(billingData, /\["authorization", "63A", "Treatment authorization code"/);
  assert.match(billingData, /"Other diagnosis": config\.other \|\| "None"/);
  assert.match(billingData, /id: "BIL-0401"[\s\S]*?other: "E11\.9"/);
  assert.match(billingData, /procedureDate:\s*"2026-01-16"/);
  assert.match(billingData, /groupName:\s*"", groupNumber:\s*""/);
  assert.match(packageJson, /"pdf-lib"/);
});

test("gates both account workspaces behind draggable prioritization and queue coaching", async () => {
  const [workspace, arLab, styles] = await Promise.all([
    readFile(new URL("../app/components/TrainingWorkspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ARCollectionsLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(workspace, /mode="denial"/);
  assert.match(workspace, /priorityActivities/);
  assert.match(workspace, /priorityActivity=\{priorityActivities\["ar-collections"\]\}/);
  assert.match(workspace, /priorityActivity=\{priorityActivities\["denial-management"\]\}/);
  assert.match(arLab, /Why did you choose this five-account order\?/);
  assert.match(arLab, /draggable=\{!finalized\}/);
  assert.match(arLab, /onDrop=\{\(event\) =>/);
  assert.match(arLab, /Move queue case/);
  assert.match(arLab, /Finalize queue and rationale/);
  assert.match(arLab, /accountOpened \? \(/);
  assert.match(arLab, /Account workspace locked/);
  assert.match(arLab, /Patient, provider, claim, and historical details remain hidden/);
  assert.match(arLab, /Open account/);
  assert.match(arLab, /canPostNote =\s*notesComplete &&\s*priorityRationaleSubmitted/);
  assert.match(arLab, /Compare your queue with the recommended order\./);
  assert.match(arLab, /Learner queue order:/);
  assert.match(arLab, /Recommended queue order:/);
  assert.match(arLab, /heading: "Prioritization decision"/);
  assert.match(arLab, /Prioritization rationale: \$\{priorityRationaleSubmitted/);
  assert.match(styles, /\.priority-rationale-panel/);
  assert.match(styles, /\.priority-coaching-key/);
  assert.match(styles, /\.priority-queue-card/);
  assert.match(styles, /\.priority-account-gate/);
});

test("shows the fictional Summit insurance-card attachment in AR-3160 correspondence", async () => {
  const [arLab, explorationData, styles] = await Promise.all([
    readFile(new URL("../app/components/ARCollectionsLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/exploration.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(explorationData, /id: "AR-3160"[\s\S]*?type: "Patient correspondence"/);
  assert.match(explorationData, /Member ID", value: "SEH-882-1047"/);
  assert.match(explorationData, /Group number", value: "EMP-41760"/);
  assert.match(explorationData, /Electronic payer ID", value: "SUMEH"/);
  assert.match(arLab, /format-patient-correspondence/);
  assert.match(arLab, /document\.attachments\?\.map/);
  assert.match(styles, /\.insurance-card-attachments/);
});

test("routes Evelyn Brooks to a documented pricing reconsideration", async () => {
  const [arLab, explorationData] = await Promise.all([
    readFile(new URL("../app/components/ARCollectionsLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/exploration.ts", import.meta.url), "utf8"),
  ]);

  assert.match(explorationData, /id: "AR-3106"[\s\S]*?action: "submit-appeal"/);
  assert.match(explorationData, /category: "pricing-reconsideration"/);
  assert.match(explorationData, /Prior pricing request closure — NS-884120/);
  assert.match(explorationData, /label: "Request balance adjustment \/ write-off"/);
  assert.match(explorationData, /label: "Submit appeal \/ reconsideration"/);
  assert.match(arLab, /label: "Reconsideration letter"/);
  assert.match(arLab, /openTab\("appeal"\)/);
  assert.match(arLab, /Successful — the electronic \$\{isReconsideration \? "pricing reconsideration" : "appeal"\}/);
});

test("keeps Payment Posting diagnoses hidden until the full workflow is closed", async () => {
  const [postingLab, explorationData, styles] = await Promise.all([
    readFile(new URL("../app/components/PaymentPostingLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/exploration.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(postingLab, /Posting case \{String\(index \+ 1\)\.padStart\(2, "0"\)\}/);
  assert.match(postingLab, /Evidence-based work item/);
  assert.match(postingLab, /Diagnosis locked/);
  assert.doesNotMatch(postingLab, /\{item\.priority\} · \{item\.status\}/);
  assert.match(postingLab, /\["era", "bank", "proof"\]/);
  assert.match(postingLab, /const allTasksComplete = milestones\.every/);
  assert.match(postingLab, /closed \? <PostingScenarioReveal scenario=\{scenario\}/);
  assert.match(postingLab, /Why this is correct/);
  assert.match(postingLab, /How to prevent posting errors/);
  assert.equal((explorationData.match(/diagnosis:/g) ?? []).length, 7);
  assert.equal((explorationData.match(/preventionTips:/g) ?? []).length, 7);
  assert.match(styles, /\.posting-scenario-reveal/);
});

test("shows service-from and service-to dates on every Insurance Follow-up and Denial EOB line", async () => {
  const [arLab, explorationData, styles] = await Promise.all([
    readFile(new URL("../app/components/ARCollectionsLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/exploration.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(explorationData, /serviceFrom\?: string/);
  assert.match(explorationData, /serviceTo\?: string/);
  assert.match(explorationData, /cpt: "G0378", serviceFrom: "May 15, 2026", serviceTo: "May 16, 2026"/);
  assert.match(arLab, /function serviceDateRange/);
  assert.match(arLab, /line\.serviceFrom \?\? scenario\.patient\.dos/);
  assert.match(arLab, /line\.serviceTo \?\? serviceFrom/);
  assert.match(arLab, /<th>Service From<\/th>/);
  assert.match(arLab, /<th>Service To<\/th>/);
  assert.match(arLab, /heading: "EOB service-line detail"/);
  assert.match(styles, /\.pdf-eob-table \.eob-service-date/);
  assert.match(styles, /\.portal-service-lines table/);
});

test("provides a completed claim packet for every follow-up and denial account", async () => {
  const [arLab, mapping, styles, generator] = await Promise.all([
    readFile(new URL("../app/components/ARCollectionsLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/claimForms.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../tools/generate-training-claim-pdfs.py", import.meta.url), "utf8"),
  ]);
  const scenarioIds = [
    "AR-3106", "AR-3119", "AR-3142", "AR-3160", "AR-3174",
    "DM-5101", "DM-5102", "DM-5103", "DM-5104", "DM-5105",
  ];

  for (const scenarioId of scenarioIds) {
    assert.match(mapping, new RegExp(scenarioId));
    const form = mapping.match(new RegExp(`\\["${scenarioId}", "(CMS-1500|UB-04)"\\]`))?.[1];
    assert.ok(form);
    const slug = `${scenarioId.toLowerCase()}-${form.toLowerCase().replace("-", "")}.pdf`;
    const file = await stat(new URL(`../public/training-claims/${slug}`, import.meta.url));
    assert.ok(file.size > 50_000);
  }

  assert.match(arLab, /Submitted claim image/);
  assert.match(arLab, /Open full PDF/);
  assert.match(arLab, /Download PDF/);
  assert.match(arLab, /claim-form-pdf-frame/);
  assert.match(arLab, /2-page claim packet/);
  assert.match(styles, /\.format-claim-form/);
  assert.match(generator, /UB-04 FL 42-47/);
  assert.match(generator, /\(101\.6, 780\.3, 132\.7, 789\.3\)/);
  assert.match(generator, /FICTIONAL TRAINING CLAIM - NOT FOR SUBMISSION/);
  assert.doesNotMatch(generator, /\(55, 682/);
});

test("makes billing-history exceptions and reimbursement sources explicit", async () => {
  const [arLab, explorationData, styles] = await Promise.all([
    readFile(new URL("../app/components/ARCollectionsLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/exploration.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(arLab, /Reason/);
  assert.match(arLab, /Information changed/);
  assert.match(arLab, /Bypassed \/ not supplied/);
  assert.match(arLab, /Evidence/);
  assert.match(arLab, /Source: \{field\.source\}/);
  assert.match(arLab, /calculator-field-source/);
  assert.match(explorationData, /original payer ICN was required/);
  assert.match(explorationData, /Corrected claim rejected/);
  assert.match(explorationData, /formal dispute was not submitted/);
  assert.match(styles, /\.billing-history-bypassed/);
  assert.match(styles, /\.calculator-field-source/);
});
