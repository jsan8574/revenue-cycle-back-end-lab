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

test("records prioritization rationale and reveals coaching in Insurance Follow-up and Denial Management", async () => {
  const [workspace, arLab, styles] = await Promise.all([
    readFile(new URL("../app/components/TrainingWorkspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ARCollectionsLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(workspace, /mode="denial"/);
  assert.match(arLab, /Explain account prioritization/);
  assert.match(arLab, /How would you prioritize the selected account\?/);
  assert.match(arLab, /setPriorityRationaleSubmitted\(true\)/);
  assert.match(arLab, /canPostNote =\s*notesComplete &&\s*priorityRationaleSubmitted/);
  assert.match(arLab, /Here is the recommended prioritization approach\./);
  assert.match(arLab, /Your answer has been recorded\. You may continue now/);
  assert.match(arLab, /heading: "Prioritization decision"/);
  assert.match(arLab, /Prioritization rationale: \$\{priorityRationaleSubmitted/);
  assert.match(styles, /\.priority-rationale-panel/);
  assert.match(styles, /\.priority-coaching-key/);
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
