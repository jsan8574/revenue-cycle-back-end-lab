"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import {
  billingScenarios,
  fieldGroups,
  fieldsForScenario,
  type BillingField,
  type BillingScenario,
  type FieldGroup,
} from "../data/billing";
import { buildClaimPdf } from "../lib/claimPdf";

type Tab = "queue" | "sources" | "claim" | "submit" | "history";
type Attempt = { id: string; caseId: string; time: string; status: "Rejected" | "Accepted"; errors: number; reference: string };
type Edit = { fieldId: string; locator: string; code: string; segment: string; title: string; message: string };
type Persisted = { values: Record<string, Record<string, string>>; attempts: Attempt[]; completed: Record<string, boolean>; order: string[]; rankingScore: number; editRuns?: Record<string, number> };

const initialValues = () => Object.fromEntries(billingScenarios.map((s) => [s.id, Object.fromEntries(fieldsForScenario(s).map((f) => [f.id, s.initial[f.id] || ""]))]));
const normalize = (value: string) => value.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9]/g, "");
const equivalent = (actual: string, expected: string) => {
  if (normalize(actual) === normalize(expected)) return true;
  const pair = `${normalize(actual)}:${normalize(expected)}`;
  return ["f:female", "female:f", "m:male", "male:m", "self:18", "18:self", "yes:accepted", "accepted:yes", "yes:y", "y:yes", "no:n", "n:no"].includes(pair);
};
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

function editInfo(field: BillingField) {
  if (field.id === "memberId") return ["A7:21", "2010BA · NM109", "Subscriber identifier edit", "The subscriber identifier is missing or does not meet the payer format. Compare eligibility with the claim."];
  if (/Npi/i.test(field.id)) return ["A7:21", "2010AA / 2310A · NM109", "Provider identifier edit", "The provider identifier is incomplete or inconsistent with the provider role on the claim."];
  if (field.id === "typeOfBill") return ["A7:21", "2300 · CLM05-1", "Bill classification edit", "Type of bill is inconsistent with the facility setting or claim frequency."];
  if (/^pos/.test(field.id)) return ["A7:21", "2400 · SV105", "Place of service edit", "The place of service is inconsistent with the encounter setting in the source record."];
  if (/^(rev)/.test(field.id)) return ["A7:21", "2400 · SV201", "Revenue code edit", "A service line contains an invalid or missing revenue code."];
  if (/^(cpt|hcpcs)/.test(field.id)) return ["A7:21", "2400 · SV101-2 / SV202-2", "Procedure code edit", "The procedure code does not match the coded charge detail for this line."];
  if (field.id === "icdIndicator") return ["A7:21", "2300 · HI", "Diagnosis qualifier edit", "The ICD version indicator is missing or inconsistent with the diagnosis code set."];
  if (field.id === "diagnosis") return ["A7:21", "2300 · HI01-2", "Diagnosis edit", "The diagnosis is missing, invalid, or inconsistent with the coded encounter."];
  if (field.id === "totalCharges") return ["A3:78", "2300 · CLM02", "Claim balance edit", "Claim total does not balance to the submitted service-line charges."];
  if (field.type === "date") return ["A7:21", "DTP", "Date edit", "A required date is missing or inconsistent with the encounter or statement period."];
  return ["A7:21", "Required data element", "Claim data edit", "A required element is missing or inconsistent with the source record."];
}

function learnerHint(field: BillingField | undefined) {
  if (!field) return "Enter the value exactly as it appears in Source Records for the reported field locator.";
  if (field.type === "date") return "This field accepts a date in YYYY-MM-DD format, for example 2026-02-10. Check the applicable date in Source Records.";
  if (/^(charge|totalCharges|amountPaid|balanceDue|priorPayments|estimatedDue)/.test(field.id)) return "This field accepts numerical dollar data, for example 150.00. Do not enter a dollar sign or comma; calculate or confirm the amount in Source Records.";
  if (/^units/.test(field.id)) return "This field accepts a whole number, for example 1. Check the billed units for this service line.";
  if (/Npi/i.test(field.id) || field.id === "providerNpi" || field.id === "attendingNpi") return "This field accepts a 10-digit NPI, for example 1234567890. Confirm the provider role and NPI in the Provider master.";
  if (field.id === "taxId") return "This field accepts the 9-digit TIN/EIN from the Provider master, for example 123456789. Dashes are accepted.";
  if (["memberId", "planId", "policy", "groupNumber", "authorization"].includes(field.id)) return "Enter the identifier exactly as shown in eligibility or authorization records. Letters and numbers are accepted; spaces and dashes will not affect validation.";
  if (field.id === "coverage") return "The options are Medicare, Medicaid, TRICARE, CHAMPVA, Group Health Plan, FECA, or Other. Select the coverage documented in eligibility.";
  if (["patientSex", "insuredSex"].includes(field.id)) return "The options are M or F. Check the registration or subscriber record.";
  if (field.id === "relationship") return field.locator === "59A"
    ? "Enter the relationship code shown in eligibility, for example 18 for self."
    : "The options are Self, Spouse, Child, or Other. Check the subscriber relationship in eligibility.";
  if (["anotherPlan", "outsideLab", "benefitsAssignment"].includes(field.id)) return "The options are Yes or No. Check the supporting record before selecting one.";
  if (["patientSignature", "insuredSignature"].includes(field.id)) return "Enter the authorization status documented in the record, such as Signature on file.";
  if (field.id === "releaseInfo") return "Enter the release-of-information code from the record. Valid choices include Y, I, or R; verify which one applies.";
  if (field.id === "typeOfBill") return "This field accepts a three-digit type-of-bill code, for example 111 or 131. Verify the facility setting and claim frequency.";
  if (field.id === "icdIndicator") return "The options are 0 for ICD-10-CM or 9 for ICD-9-CM. Check the diagnosis code set used by the encounter.";
  if (["diagnosis", "otherDiagnosis"].includes(field.id)) return "Enter the ICD diagnosis code from the coded abstract, for example J06.9. A decimal is optional for validation.";
  if (/^rev/.test(field.id)) return "This field accepts a four-digit revenue code, for example 0450. Match it to the service in the charge detail.";
  if (/^(cpt|hcpcs)/.test(field.id)) return "This field accepts the five-character CPT/HCPCS code, for example 99213. Match the code to the date and charge line.";
  if (/^pos/.test(field.id)) return "This field accepts a two-digit place-of-service code, for example 11. Check the encounter setting.";
  if (/^pointer/.test(field.id)) return "Enter the diagnosis letter linked to this service line, such as A, B, C, or D. Compare it with the diagnoses in FL 21.";
  if (field.id === "admitHour") return "This field accepts the two-digit admission hour using 00 through 23. Check the facility face sheet.";
  if (field.id === "admitType") return "Enter the one-digit priority/type-of-admission code from the coded abstract; examples include 1, 2, or 3.";
  if (field.id === "patientStatus") return "Enter the discharge-status code documented in the facility record; common values include 01, 02, or 03.";
  if (field.id === "procedure") return "Enter the principal procedure code from the coded abstract. Confirm it matches the procedure date.";
  if (field.id === "assignment") return "The options are Yes or No. Check whether the provider accepts assignment for this claim.";
  return "Enter the value exactly as documented in Source Records for this locator. Do not infer information that is not supported.";
}

function validate(scenario: BillingScenario, values: Record<string, string>) {
  return fieldsForScenario(scenario).flatMap((field): Edit[] => {
    const expected = scenario.answers[field.id] || "";
    if (!expected && !field.required) return [];
    const actual = values[field.id] || "";
    if (field.type === "number" && actual.trim() && Number(actual) === Number(expected)) return [];
    if (equivalent(actual, expected)) return [];
    const [code, segment, title, message] = editInfo(field);
    return [{ fieldId: field.id, locator: field.locator, code, segment, title, message }];
  });
}

export function BillingLab({ learnerName, scenarioIndex, onSelectScenario, onComplete }: {
  learnerName: string; scenarioIndex: number; onSelectScenario: (index: number) => void; onComplete: (name: string, score: number) => void;
}) {
  const scenario = billingScenarios[scenarioIndex] || billingScenarios[0];
  const [tab, setTab] = useState<Tab>("queue");
  const [search, setSearch] = useState("");
  const [values, setValues] = useState<Record<string, Record<string, string>>>(initialValues);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [order, setOrder] = useState(billingScenarios.map((item) => item.id));
  const [rankingScore, setRankingScore] = useState(0);
  const [rankingSubmitted, setRankingSubmitted] = useState(false);
  const [rationale, setRationale] = useState("");
  const [group, setGroup] = useState<FieldGroup>(() => scenario.form === "CMS-1500" ? "Coverage" : "Patient");
  const [selectedField, setSelectedField] = useState("");
  const [edits, setEdits] = useState<Edit[] | null>(null);
  const [editRuns, setEditRuns] = useState<Record<string, number>>({});
  const [toast, setToast] = useState("");
  const [downloading, setDownloading] = useState(false);
  const fields = useMemo(() => fieldsForScenario(scenario), [scenario]);
  const caseValues = values[scenario.id] || {};
  const storageKey = `rcm-billing-${normalize(learnerName)}`;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return;
        const saved = JSON.parse(raw) as Persisted;
        if (saved.values) setValues((current) => ({ ...current, ...saved.values }));
        if (saved.attempts) setAttempts(saved.attempts);
        if (saved.completed) setCompleted(saved.completed);
        if (saved.editRuns) setEditRuns(saved.editRuns);
        if (saved.order?.length === billingScenarios.length) setOrder(saved.order);
        if (saved.rankingScore) { setRankingScore(saved.rankingScore); setRankingSubmitted(true); }
      } catch { setToast("A previous Billing draft could not be opened. A fresh practice copy is ready."); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const persist = (message = "Billing work saved on this device.") => {
    const state: Persisted = { values, attempts, completed, order, rankingScore, editRuns };
    window.localStorage.setItem(storageKey, JSON.stringify(state));
    setToast(message);
  };

  const openCase = (id: string) => {
    const index = billingScenarios.findIndex((item) => item.id === id);
    if (index < 0) return;
    const next = billingScenarios[index];
    onSelectScenario(index);
    setGroup(next.form === "CMS-1500" ? "Coverage" : "Patient");
    setSelectedField("");
    setEdits(null);
    setTab("sources");
  };

  const setField = (id: string, value: string) => {
    setValues((current) => ({ ...current, [scenario.id]: { ...(current[scenario.id] || {}), [id]: value } }));
    setCompleted((current) => ({ ...current, [scenario.id]: false }));
    setEdits(null);
  };

  const matched = fields.filter((field) => {
    const expected = scenario.answers[field.id] || "";
    return (!expected && !field.required) || equivalent(caseValues[field.id] || "", expected);
  }).length;
  const progress = Math.round((matched / fields.length) * 100);

  const move = (id: string, delta: -1 | 1) => {
    setOrder((current) => {
      const index = current.indexOf(id), target = index + delta;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next;
    });
    setRankingSubmitted(false);
  };

  const scoreRanking = () => {
    const exact = order.filter((id, index) => billingScenarios.find((item) => item.id === id)?.expectedRank === index + 1).length;
    const score = Math.round(exact / billingScenarios.length * 100);
    setRankingScore(score); setRankingSubmitted(true);
    setToast(score === 100 ? "Priority queue validated." : "Queue scored. Review the operational rationale and revise your order.");
  };

  const runEdits = () => {
    setEditRuns((current) => ({ ...current, [scenario.id]: (current[scenario.id] || 0) + 1 }));
    setEdits(validate(scenario, caseValues));
    setTab("submit");
  };

  const transmit = () => {
    const result = validate(scenario, caseValues);
    setEditRuns((current) => ({ ...current, [scenario.id]: (current[scenario.id] || 0) + 1 }));
    const accepted = result.length === 0;
    const attempt: Attempt = {
      id: `${scenario.id}-${Date.now()}`, caseId: scenario.id,
      time: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
      status: accepted ? "Accepted" : "Rejected", errors: result.length,
      reference: `${accepted ? "CLN" : "RPT"}-${scenario.id.replace(/\D/g, "")}-${attempts.length + 1}`,
    };
    setAttempts((current) => [attempt, ...current]); setEdits(result); setTab("submit");
    if (accepted) {
      if (!completed[scenario.id]) onComplete(`${scenario.id} · ${scenario.patient}`, 100);
      setCompleted((current) => ({ ...current, [scenario.id]: true }));
      setToast(`Congratulations, you sent a clean claim and completed the applicable ${scenario.form} fields.`);
    } else setToast(`${result.length} clearinghouse edit${result.length === 1 ? "" : "s"} returned. Correct and resubmit.`);
  };

  const downloadPdf = async () => {
    if (validate(scenario, caseValues).length) {
      setToast("Complete the applicable fields and pass claim edits before downloading the accomplished form.");
      return;
    }
    setDownloading(true);
    try {
      const template = scenario.form === "CMS-1500" ? "/billing/cms-1500-activity.pdf" : "/billing/ub-04-activity.pdf";
      const response = await fetch(template); if (!response.ok) throw new Error("template");
      const bytes = await buildClaimPdf({ templateBytes: await response.arrayBuffer(), form: scenario.form, values: caseValues, learnerName, scenarioId: scenario.id, patient: scenario.patient });
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${learnerName.replace(/[^a-z0-9]+/gi, "-")}-${scenario.id}-${scenario.form.replace("-", "")}-completed.pdf`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setToast("Your accomplished claim form was downloaded as one PDF file.");
    } catch { setToast("The PDF could not be created. Save, refresh once, and try again."); }
    finally { setDownloading(false); }
  };

  const filtered = billingScenarios.filter((item) => !normalize(search) || [item.patient, item.account, item.payer, item.id, item.form].some((value) => normalize(value).includes(normalize(search))));
  const activeFields = fields.filter((field) => field.group === group);
  const caseAttempts = attempts.filter((attempt) => attempt.caseId === scenario.id);
  const showEditHints = (editRuns[scenario.id] || 0) >= 2 && Boolean(edits?.length);
  const claimReadyForDownload = validate(scenario, caseValues).length === 0;

  return <div className="billing-page module-page page-enter" style={{ "--module-accent": "#287f71", "--module-soft": "#e7f4f0" } as React.CSSProperties}>
    <section className="module-header billing-header"><div><span className="section-kicker">Clean-claim workbench</span><h1>Billing / Claim Form Mastery</h1><p>Prioritize a billing queue, read source records, complete CMS-1500 and UB-04 locators, correct clearinghouse edits, and transmit a clean claim.</p></div><div className="module-header-stat"><strong>6</strong><span>claim activities</span></div></section>
    <section className="billing-snapshot" aria-label="Current billing account">
      <div><span>Patient</span><strong>{scenario.patient}</strong><small>DOB {new Date(`${scenario.dob}T00:00:00`).toLocaleDateString("en-US")}</small></div>
      <div><span>Account</span><strong>{scenario.account}</strong><small>{scenario.form}</small></div><div><span>Claim</span><strong>{scenario.claimClass}</strong><small>{scenario.status}</small></div>
      <div><span>Charges</span><strong>{money(scenario.total)}</strong><small>{scenario.age} days old</small></div><div><span>Filing</span><strong>{scenario.filingDays} days</strong><small>remaining</small></div>
    </section>
    <nav className="billing-tabs" aria-label="Billing workflow">{(["queue", "sources", "claim", "submit", "history"] as Tab[]).map((id, index) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)} type="button">{index + 1} · {id === "queue" ? "Work queue" : id === "sources" ? "Source records" : id === "claim" ? scenario.form : id === "submit" ? "Scrub & submit" : "Submission history"}</button>)}</nav>

    {tab === "queue" && <section className="billing-card"><header className="billing-heading"><div><span className="section-kicker">Decision activity</span><h2>Which claim should be worked first?</h2><p>Rank by balance, age, timely filing, rejection status, and work readiness. The issue itself is not revealed.</p></div><b>{rankingSubmitted ? `${rankingScore}%` : "Not scored"}</b></header>
      <label className="billing-search">Find an account<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Patient, account, payer, or form" /></label>
      {!filtered.length ? <div className="billing-empty"><strong>Not found</strong><span>No training account matches that information.</span></div> : <div className="billing-queue">{order.map((id) => billingScenarios.find((item) => item.id === id)).filter((item): item is BillingScenario => item !== undefined).filter((item) => filtered.some((match) => match.id === item.id)).map((item) => { const position = order.indexOf(item.id); return <article key={item.id} className={item.id === scenario.id ? "selected" : ""}><span className="rank">{position + 1}</span><div><strong>{item.patient}</strong><small>{item.id} · {item.account}</small><p><span>{item.form}</span><span>{item.complexity}</span><span>{item.status}</span></p></div><div className="queue-money"><strong>{money(item.total)}</strong><small>{item.age} days · {item.filingDays} filing days</small></div><div className="queue-buttons"><button onClick={() => move(item.id, -1)} disabled={!position}>↑</button><button onClick={() => move(item.id, 1)} disabled={position === order.length - 1}>↓</button><button onClick={() => openCase(item.id)}>Open</button></div>{rankingSubmitted && <aside><strong>Operational rationale:</strong> {item.priorityReason}</aside>}</article>; })}</div>}
      <label className="billing-rationale">Document your rationale<textarea value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="Explain the balance, age, filing, and readiness factors you used." /></label><button className="primary-button" disabled={rationale.trim().length < 20} onClick={scoreRanking}>Submit queue decision</button>
    </section>}

    {tab === "sources" && <section className="billing-card"><header className="billing-heading"><div><span className="section-kicker">Source review</span><h2>Build the claim from the record</h2><p>Review registration, eligibility, coded charges, and the provider master. Locator answers are not called out.</p></div><a href={scenario.form === "CMS-1500" ? "/billing/cms-1500-blank-reference.pdf" : "/billing/ub-04-activity.pdf"} target="_blank" rel="noreferrer">Open blank {scenario.form} PDF ↗</a></header><div className="cms-source-note"><strong>Claim-form source: Centers for Medicare &amp; Medicaid Services (CMS)</strong><span>These training references were obtained from CMS materials and are for learning only. Downloaded copies should not be used to submit claims.</span><div><a href="https://www.cms.gov/medicare/cms-forms/cms-forms/cms-forms-items/cms1188854" target="_blank" rel="noreferrer">CMS-1500 source ↗</a><a href="https://www.cms.gov/Outreach-and-Education/MLN/WBT/MLN7388180-MLN-WBT-1450/1450/lesson02/06/index.html" target="_blank" rel="noreferrer">CMS-1450 / UB-04 guidance ↗</a></div></div><div className="source-grid">{scenario.sourceSections.map((section) => <article key={section.title}><header><span>{section.source.slice(0, 3).toUpperCase()}</span><div><strong>{section.title}</strong><small>{section.source}</small></div></header><dl>{section.items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></article>)}</div><button className="primary-button" onClick={() => setTab("claim")}>Open the {scenario.form} editor →</button></section>}

    {tab === "claim" && <section className="billing-claim"><div className="billing-card"><header className="billing-heading"><div><span className="section-kicker">Field locator editor</span><h2>{scenario.form}</h2><p>Enter only what the source record supports. Return to Source Records whenever you need to review the blank claim form.</p></div><b>{progress}% matched</b></header><div className="field-groups">{fieldGroups.map((name) => { const count = fields.filter((field) => field.group === name).length; return count ? <button className={group === name ? "active" : ""} onClick={() => setGroup(name)} key={name}>{name}<span>{count}</span></button> : null; })}</div><div className="field-list">{activeFields.map((field) => <label key={field.id} className={selectedField === field.id ? "active" : ""} onFocus={() => setSelectedField(field.id)}><span>FL {field.locator}</span><strong>{field.label}<small>{field.required ? "required" : "when applicable"}</small></strong><input type={field.type || "text"} step={field.type === "number" ? "0.01" : undefined} value={caseValues[field.id] || ""} onChange={(event) => setField(field.id, event.target.value)} placeholder="Enter from source record" /></label>)}</div><button className="primary-button" onClick={runEdits}>Run claim edits</button></div></section>}

    {tab === "submit" && <section className="billing-card"><header className="billing-heading"><div><span className="section-kicker">Claim scrubber and clearinghouse</span><h2>Correct, transmit, and resubmit</h2><p>The response uses claim-status categories and implementation-guide segments without revealing the answer.</p></div><button className="primary-button" onClick={transmit}>Transmit claim</button></header>{edits === null ? <div className="billing-empty"><strong>No edit report yet</strong><span>Run edits or transmit to receive a clearinghouse response.</span></div> : !edits.length ? <div className="clean-claim"><span>✓</span><div><small>999 accepted · 277CA accepted</small><h2>Congratulations, you sent a clean claim.</h2><p>All applicable fields supported by this scenario passed patient, coverage, provider, coding, service-line, and balancing edits. Non-applicable locators remain blank, as they would on an actual claim.</p><strong>Your accomplished {scenario.form} is ready to download in Save your work below.</strong></div></div> : <div className="edit-list"><header><strong>277CA response: rejected</strong><span>{edits.length} edits require correction.</span></header>{edits.map((edit) => <article key={edit.fieldId}><div><strong>{edit.code}</strong><small>{edit.segment}</small></div><div><span>FL {edit.locator}</span><h3>{edit.title}</h3><p>{edit.message}</p>{showEditHints && <small className="billing-edit-hint">Hint: {learnerHint(fields.find((field) => field.id === edit.fieldId))}</small>}</div><button onClick={() => { const field = fields.find((item) => item.id === edit.fieldId); if (field) setGroup(field.group); setSelectedField(edit.fieldId); setTab("claim"); }}>Correct field</button></article>)}</div>}<div className="billing-actions"><button className="secondary-button" onClick={runEdits}>Run pre-transmission edits</button><button className="primary-button" onClick={transmit}>Submit / resubmit to clearinghouse</button></div></section>}

    {tab === "history" && <section className="billing-card"><header className="billing-heading"><div><span className="section-kicker">Audit trail</span><h2>Submission history</h2><p>Trace every rejection, correction, and acceptance.</p></div><b>{caseAttempts.length} attempts</b></header>{caseAttempts.length ? <div className="attempts">{caseAttempts.map((attempt) => <article key={attempt.id}><span className={attempt.status.toLowerCase()}>{attempt.status}</span><div><strong>{attempt.reference}</strong><small>{attempt.time}</small></div><div><strong>{attempt.errors}</strong><small>returned edits</small></div></article>)}</div> : <div className="billing-empty"><strong>No transmissions yet</strong><span>Submit the claim to begin the audit trail.</span></div>}</section>}

    <section className="billing-save"><div><span className="section-kicker">Save your work</span><h2>Keep the draft or download the accomplished form</h2><p>One PDF contains all applicable completed locators, the learner name, and the training-case reference. The accomplished download unlocks after the claim passes edits.</p></div><div><button className="secondary-button" onClick={() => persist()}>Save work</button><button className="primary-button" disabled={downloading || !claimReadyForDownload} onClick={downloadPdf}>{downloading ? "Creating PDF…" : `Download accomplished ${scenario.form}`}</button></div><span className={completed[scenario.id] ? "accepted" : "draft"}>{completed[scenario.id] ? "Clean claim accepted" : claimReadyForDownload ? "Ready for final submission" : "Draft in progress"}</span></section>
    {toast && <div className="billing-toast" role="status"><span>{toast.includes("Congratulations") ? "✓" : "i"}</span>{toast}<button onClick={() => setToast("")} aria-label="Dismiss">×</button></div>}
  </div>;
}
