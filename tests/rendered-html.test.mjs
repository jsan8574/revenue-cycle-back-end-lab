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
  assert.match(packageJson, /"pdf-lib"/);
});
