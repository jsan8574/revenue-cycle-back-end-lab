import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("includes the Billing claim-form mastery workflow", async () => {
  const [workspace, billingLab, billingData, packageJson] = await Promise.all([
    readFile(new URL("../app/components/TrainingWorkspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/BillingLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/billing.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(workspace, /id:\s*"billing"/);
  assert.match(workspace, /<BillingLab/);
  assert.match(billingLab, /Submit \/ resubmit to clearinghouse/);
  assert.match(billingLab, /Congratulations, you sent a clean claim\./);
  assert.match(billingLab, /Download accomplished/);
  assert.match(billingData, /export const billingScenarios/);
  assert.match(billingData, /form:\s*"CMS-1500"/);
  assert.match(billingData, /form:\s*"UB-04"/);
  assert.match(billingData, /\["icdIndicator", "21 · ICD Ind\."/);
  assert.match(billingData, /\["memberId", "60A", "Insured unique ID \/ member ID"/);
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
