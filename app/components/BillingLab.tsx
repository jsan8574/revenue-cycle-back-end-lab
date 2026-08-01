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

type Tab = "queue" | "sources" | "claim" | "submit" | "history";
type Attempt = { id: string; caseId: string; time: string; status: "Rejected" | "Accepted"; errors: number; reference: string };
type Edit = { fieldId: string; locator: string; code: string; segment: string; title: string; message: string };
type Persisted = { values: Record<string, Record<string, string>>; attempts: Attempt[]; completed: Record<string, boolean>; order: string[]; rankingScore: number };

const initialValues = () => Object.fromEntries(billingScenarios.map((s) => [s.id, Object.fromEntries(fieldsForScenario(s).map((f) => [f.id, s.initial[f.id] || ""]))]));
const normalize = (value: string) => value.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9]/g, "");
const equivalent = (actual: string, expected: string) => {
  if (normalize(actual) === normalize(expected)) return true;
  const pair = `${normalize(actual)}:${normalize(expected)}`;
  return ["f:female", "female:f", "m:male", "male:m", "self:18", "18:self", "yes:accepted", "accepted:yes"].includes(pair);
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

function validate(scenario: BillingScenario, values: Record<string, string>) {
  return fieldsForScenario(scenario).flatMap((field): Edit[] => {
    const expected = scenario.answers[field.id] || "";
    if (!expected && !field.required) return [];
    if (equivalent(values[field.id] || "", expected)) return [];
    const [code, segment, title, message] = editInfo(field);
    return [{ fieldId: field.id, locator: field.locator, code, segment, title, message }];
  });
}

function compactDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[2]}${match[3]}${match[1].slice(2)}` : value;
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
        if (saved.order?.length === billingScenarios.length) setOrder(saved.order);
        if (saved.rankingScore) { setRankingScore(saved.rankingScore); setRankingSubmitted(true); }
      } catch { setToast("A previous Billing draft could not be opened. A fresh practice copy is ready."); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const persist = (message = "Billing work saved on this device.") => {
    const state: Persisted = { values, attempts, completed, order, rankingScore };
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

  const transmit = () => {
    const result = validate(scenario, caseValues);
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
      setToast("Congratulations, you sent a clean claim.");
    } else setToast(`${result.length} clearinghouse edit${result.length === 1 ? "" : "s"} returned. Correct and resubmit.`);
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const template = scenario.form === "CMS-1500" ? "/billing/cms-1500-activity.pdf" : "/billing/ub-04-activity.pdf";
      const response = await fetch(template); if (!response.ok) throw new Error("template");
      const pdf = await PDFDocument.load(await response.arrayBuffer());
      pdf.setAuthor(learnerName); pdf.setTitle(`${scenario.form} training claim - ${scenario.patient}`);
      try { pdf.getForm().flatten(); } catch { /* legacy hybrid form */ }
      const page = pdf.getPages()[0], font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      const ink = rgb(0.02, 0.16, 0.2), v = (id: string) => (caseValues[id] || "").replace(/[’‘]/g, "'").replace(/[^\x20-\x7E]/g, "");
      const draw = (text: string, x: number, y: number, size = 7, heavy = false) => { if (text) page.drawText(text.slice(0, 80), { x, y, size, font: heavy ? bold : font, color: ink }); };
      if (scenario.form === "CMS-1500") {
        const coverage: Record<string, number> = { medicare: 63, medicaid: 111, tricare: 160, champva: 225, grouphealthplan: 278, feca: 334, other: 379 };
        const addressParts = v("patientAddress").split(",").map((part) => part.trim());
        const stateZip = (addressParts[2] || "").match(/^([A-Z]{2})\s+(.+)$/i);
        draw("X", coverage[normalize(v("coverage"))] || 278, 714, 9, true); draw(v("memberId"), 416, 714);
        draw(v("patientName"), 64, 690); draw(compactDate(v("patientDob")), 279, 690); draw("X", normalize(v("patientSex")) === "m" ? 353 : 389, 689, 9, true);
        draw(addressParts[0] || v("patientAddress"), 64, 667, 6); draw(addressParts[1] || "", 64, 642, 6); draw(stateZip?.[1] || "", 244, 642, 6); draw(stateZip?.[2] || "", 64, 618, 6);
        draw("X", 284, 666, 9, true); draw(v("policy"), 416, 594); draw(v("patientSignature"), 92, 450, 6); draw(v("insuredSignature"), 454, 450, 6);
        draw(v("icdIndicator"), 319, 358, 7, true); draw(v("diagnosis"), 165, 364);
        [1, 2].forEach((line, i) => { const y = [280, 256][i]; if (!v(`cpt${line}`)) return; draw(compactDate(v(`dos${line}`)), 64, y); draw(v(`pos${line}`), 140, y); draw(v(`cpt${line}`), 185, y); draw(v(`pointer${line}`), 326, y); draw(v(`charge${line}`), 379, y); draw(v(`units${line}`), 430, y); draw(v(`renderingNpi${line}`), 542, y); });
        draw(v("taxId"), 64, 138); draw("X", 142, 138, 8, true); draw(v("patientAccount"), 170, 138); draw("X", 330, 138, 9, true); draw(v("totalCharges"), 420, 138);
        const facilityParts = v("facility").split(",").map((part) => part.trim());
        const billingParts = v("billingProvider").split(",").map((part) => part.trim());
        draw(v("providerSignature"), 78, 79, 6); draw(facilityParts[0] || "", 220, 107, 5.5); draw(facilityParts.slice(1).join(", ").slice(0, 46), 220, 95, 5); draw(v("facilityNpi"), 220, 82, 6);
        draw(billingParts[0] || "", 415, 107, 5.5); draw(billingParts.slice(1).join(", ").slice(0, 46), 415, 95, 5); draw(v("billingNpi"), 415, 82, 6);
        draw(`Training copy | Learner: ${learnerName} | ${scenario.id}`, 60, 22, 6, true);
      } else {
        draw(v("provider").split(",")[0], 114, 986, 6); draw(v("provider").split(",").slice(1).join(",").slice(0, 45), 114, 974, 6);
        draw(v("patientControl"), 492, 987, 6); draw(v("typeOfBill"), 660, 975, 7, true); draw(v("taxId"), 466, 951, 6);
        draw(compactDate(v("statementFrom")), 536, 951, 6); draw(compactDate(v("statementThrough")), 587, 951, 6); draw(v("patientName"), 112, 926, 6); draw(v("patientAddress").slice(0, 48), 403, 938, 6);
        draw(compactDate(v("patientDob")), 104, 904, 6); draw(v("patientSex"), 171, 904); draw(compactDate(v("admitDate")), 189, 904, 6); draw(v("admitHour"), 235, 904); draw(v("admitType"), 255, 904); draw(v("patientStatus"), 320, 904);
        [1, 2, 3, 4].forEach((line, i) => { const y = [783, 771, 759, 747][i]; if (!v(`rev${line}`)) return; draw(v(`rev${line}`), 103, y, 6); draw(v(`desc${line}`), 138, y, 6); draw(v(`hcpcs${line}`), 314, y, 6); draw(compactDate(v(`serviceDate${line}`)), 425, y, 6); draw(v(`units${line}`), 476, y, 6); draw(v(`charge${line}`), 534, y, 6); });
        draw(v("totalCharges"), 534, 518, 7, true); draw(v("payer"), 104, 493, 6); draw(v("planId"), 267, 493, 6); draw(v("insuredName"), 104, 445, 6); draw(v("relationship"), 291, 445, 6); draw(v("memberId"), 313, 445, 6); draw(v("groupName"), 456, 445, 6); draw(v("groupNumber"), 565, 445, 6); draw(v("authorization"), 105, 397, 6);
        draw(v("icdIndicator"), 103, 362, 6); draw(v("diagnosis"), 112, 362, 6); draw(v("otherDiagnosis"), 169, 362, 6); draw(v("procedure"), 131, 339, 6); draw(compactDate(v("procedureDate")), 219, 339, 6); draw(v("attendingNpi"), 523, 327, 6); draw(v("attendingLast"), 481, 315, 6); draw(v("attendingFirst"), 611, 315, 6); draw("B3", 291, 243, 6, true); draw(v("taxonomy"), 307, 243, 6);
        draw(`Training copy | Learner: ${learnerName} | ${scenario.id}`, 100, 230, 6, true);
      }
      const bytes = await pdf.save({ useObjectStreams: false }); const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${learnerName.replace(/[^a-z0-9]+/gi, "-")}-${scenario.id}-${scenario.form.replace("-", "")}-completed.pdf`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setToast("Your accomplished claim form was downloaded as one PDF file.");
    } catch { setToast("The PDF could not be created. Save, refresh once, and try again."); }
    finally { setDownloading(false); }
  };

  const filtered = billingScenarios.filter((item) => !normalize(search) || [item.patient, item.account, item.payer, item.id, item.form].some((value) => normalize(value).includes(normalize(search))));
  const activeFields = fields.filter((field) => field.group === group);
  const caseAttempts = attempts.filter((attempt) => attempt.caseId === scenario.id);

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
      {!filtered.length ? <div className="billing-empty"><strong>Not found</strong><span>No training account matches that information.</span></div> : <div className="billing-queue">{order.map((id) => billingScenarios.find((item) => item.id === id)).filter((item): item is BillingScenario => Boolean(item) && filtered.some((match) => match.id === item.id)).map((item) => { const position = order.indexOf(item.id); return <article key={item.id} className={item.id === scenario.id ? "selected" : ""}><span className="rank">{position + 1}</span><div><strong>{item.patient}</strong><small>{item.id} · {item.account}</small><p><span>{item.form}</span><span>{item.complexity}</span><span>{item.status}</span></p></div><div className="queue-money"><strong>{money(item.total)}</strong><small>{item.age} days · {item.filingDays} filing days</small></div><div className="queue-buttons"><button onClick={() => move(item.id, -1)} disabled={!position}>↑</button><button onClick={() => move(item.id, 1)} disabled={position === order.length - 1}>↓</button><button onClick={() => openCase(item.id)}>Open</button></div>{rankingSubmitted && <aside><strong>Operational rationale:</strong> {item.priorityReason}</aside>}</article>; })}</div>}
      <label className="billing-rationale">Document your rationale<textarea value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="Explain the balance, age, filing, and readiness factors you used." /></label><button className="primary-button" disabled={rationale.trim().length < 20} onClick={scoreRanking}>Submit queue decision</button>
    </section>}

    {tab === "sources" && <section className="billing-card"><header className="billing-heading"><div><span className="section-kicker">Source review</span><h2>Build the claim from the record</h2><p>Review registration, eligibility, coded charges, and the provider master. Locator answers are not called out.</p></div><a href={scenario.form === "CMS-1500" ? "/billing/cms-1500-activity.pdf" : "/billing/ub-04-activity.pdf"} target="_blank" rel="noreferrer">Open blank {scenario.form} PDF ↗</a></header><div className="source-grid">{scenario.sourceSections.map((section) => <article key={section.title}><header><span>{section.source.slice(0, 3).toUpperCase()}</span><div><strong>{section.title}</strong><small>{section.source}</small></div></header><dl>{section.items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></article>)}</div><button className="primary-button" onClick={() => setTab("claim")}>Open the {scenario.form} editor →</button></section>}

    {tab === "claim" && <section className="billing-claim"><div className="billing-card"><header className="billing-heading"><div><span className="section-kicker">Field locator editor</span><h2>{scenario.form}</h2><p>Enter only what the source record supports.</p></div><b>{progress}% matched</b></header><div className="field-groups">{fieldGroups.map((name) => { const count = fields.filter((field) => field.group === name).length; return count ? <button className={group === name ? "active" : ""} onClick={() => setGroup(name)} key={name}>{name}<span>{count}</span></button> : null; })}</div><div className="field-list">{activeFields.map((field) => <label key={field.id} className={selectedField === field.id ? "active" : ""} onFocus={() => setSelectedField(field.id)}><span>FL {field.locator}</span><strong>{field.label}<small>{field.required ? "required" : "when applicable"}</small></strong><input type={field.type || "text"} step={field.type === "number" ? "0.01" : undefined} value={caseValues[field.id] || ""} onChange={(event) => setField(field.id, event.target.value)} placeholder="Enter from source record" /></label>)}</div><button className="primary-button" onClick={() => { setEdits(validate(scenario, caseValues)); setTab("submit"); }}>Run claim edits</button></div><aside className="claim-preview"><header><span>Form preview</span><strong>{fields.find((field) => field.id === selectedField) ? `FL ${fields.find((field) => field.id === selectedField)?.locator} · ${fields.find((field) => field.id === selectedField)?.label}` : "Select a locator to focus"}</strong></header><div><img src={scenario.form === "CMS-1500" ? "/billing/cms-1500-preview.png" : "/billing/ub-04-preview.png"} alt={`Blank ${scenario.form} preview`} /></div><p>The accomplished PDF is generated from the original fillable activity, not this preview.</p></aside></section>}

    {tab === "submit" && <section className="billing-card"><header className="billing-heading"><div><span className="section-kicker">Claim scrubber and clearinghouse</span><h2>Correct, transmit, and resubmit</h2><p>The response uses claim-status categories and implementation-guide segments without revealing the answer.</p></div><button className="primary-button" onClick={transmit}>Transmit claim</button></header>{edits === null ? <div className="billing-empty"><strong>No edit report yet</strong><span>Run edits or transmit to receive a clearinghouse response.</span></div> : !edits.length ? <div className="clean-claim"><span>✓</span><div><small>999 accepted · 277CA accepted</small><h2>Congratulations, you sent a clean claim.</h2><p>The claim passed required data, provider, subscriber, coding, service-line, and balancing edits.</p></div></div> : <div className="edit-list"><header><strong>277CA response: rejected</strong><span>{edits.length} edits require correction.</span></header>{edits.map((edit) => <article key={edit.fieldId}><div><strong>{edit.code}</strong><small>{edit.segment}</small></div><div><span>FL {edit.locator}</span><h3>{edit.title}</h3><p>{edit.message}</p></div><button onClick={() => { const field = fields.find((item) => item.id === edit.fieldId); if (field) setGroup(field.group); setSelectedField(edit.fieldId); setTab("claim"); }}>Correct field</button></article>)}</div>}<div className="billing-actions"><button className="secondary-button" onClick={() => setEdits(validate(scenario, caseValues))}>Run pre-transmission edits</button><button className="primary-button" onClick={transmit}>Submit / resubmit to clearinghouse</button></div></section>}

    {tab === "history" && <section className="billing-card"><header className="billing-heading"><div><span className="section-kicker">Audit trail</span><h2>Submission history</h2><p>Trace every rejection, correction, and acceptance.</p></div><b>{caseAttempts.length} attempts</b></header>{caseAttempts.length ? <div className="attempts">{caseAttempts.map((attempt) => <article key={attempt.id}><span className={attempt.status.toLowerCase()}>{attempt.status}</span><div><strong>{attempt.reference}</strong><small>{attempt.time}</small></div><div><strong>{attempt.errors}</strong><small>returned edits</small></div></article>)}</div> : <div className="billing-empty"><strong>No transmissions yet</strong><span>Submit the claim to begin the audit trail.</span></div>}</section>}

    <section className="billing-save"><div><span className="section-kicker">Save your work</span><h2>Keep the draft or download the accomplished form</h2><p>One PDF contains the current field entries, learner name, and training-case reference.</p></div><div><button className="secondary-button" onClick={() => persist()}>Save work</button><button className="primary-button" disabled={downloading} onClick={downloadPdf}>{downloading ? "Creating PDF…" : `Download accomplished ${scenario.form}`}</button></div><span className={completed[scenario.id] ? "accepted" : "draft"}>{completed[scenario.id] ? "Clean claim accepted" : "Draft in progress"}</span></section>
    {toast && <div className="billing-toast" role="status"><span>{toast.includes("Congratulations") ? "✓" : "i"}</span>{toast}<button onClick={() => setToast("")} aria-label="Dismiss">×</button></div>}
  </div>;
}
