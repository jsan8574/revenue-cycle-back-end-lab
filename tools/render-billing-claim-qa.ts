import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { billingScenarios } from "../app/data/billing";
import { buildClaimPdf } from "../app/lib/claimPdf";

const outputDirectory = resolve(process.argv[2] || "/private/tmp/billing-claim-qa");
await mkdir(outputDirectory, { recursive: true });

for (const scenario of billingScenarios) {
  const templatePath = scenario.form === "CMS-1500"
    ? "public/billing/cms-1500-activity.pdf"
    : "public/billing/ub-04-activity.pdf";
  const source = await readFile(resolve(templatePath));
  const bytes = await buildClaimPdf({
    templateBytes: source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength) as ArrayBuffer,
    form: scenario.form,
    values: scenario.answers,
    learnerName: "QA Learner",
    scenarioId: scenario.id,
    patient: scenario.patient,
  });
  await writeFile(resolve(outputDirectory, `${scenario.id}-${scenario.form.replace("-", "")}.pdf`), bytes);
}

console.log(`Rendered ${billingScenarios.length} completed claims to ${outputDirectory}`);
