"use client";

import { useEffect, useRef, useState } from "react";
import type { ArScenario } from "../data/exploration";

const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
type Props = { scenario: ArScenario; filename: string; recipient: string; subject: string; letter: string; selectedDocuments: string[]; onClose: () => void };

function sourceDocument(s: ArScenario, filename: string) {
  const name = normalize(filename);
  const reference = s.documents.find(document => name.includes(normalize(document.reference)));
  if (reference) return reference;
  const patterns = /eob|era/i.test(filename) ? /eob|era/i : /contract/i.test(filename) ? /contract/i : /authorization|referral/i.test(filename) ? /auth|referral/i : /277ca|acceptance/i.test(filename) ? /277ca|acknowledg|acceptance/i : /medication|administration/i.test(filename) ? /medication|administration/i : /clinical|medical record|order/i.test(filename) ? /clinical|medical record|order/i : /coding/i.test(filename) ? /coding/i : /reprocessing|pricing request|payer icn/i.test(filename) ? /payer|reprocessing|correspondence/i : null;
  return patterns ? s.documents.find(document => patterns.test(`${document.type} ${document.summary}`)) : undefined;
}

function Facts({ values }: { values: [string, string][] }) {
  return <dl className="payer-file-facts">{values.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not supplied in the case record"}</dd></div>)}</dl>;
}

export function PayerDocumentViewer({ scenario: s, filename, recipient, subject, letter, selectedDocuments, onClose }: Props) {
  const [zoom, setZoom] = useState(100);
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const source = sourceDocument(s, filename);
  const isCover = /cover sheet/i.test(filename);
  const isEob = /eob|era/i.test(filename);
  const isCalculation = /reimbursement calculation|variance worksheet/i.test(filename);
  const isClaim = /claim (form|image)|ub-04/i.test(filename);
  const isContract = /contract/i.test(filename) && !isClaim;
  const isAuthorization = /authorization|referral/i.test(filename);
  const isClinical = /clinical|medical record|medication|administration|signed.*order/i.test(filename);
  const isLetter = /appeal letter|reconsideration letter|request letter/i.test(filename);
  const isReview = /coding review|internal review|review memorandum/i.test(filename);
  const isClosure = /pricing request closure|reprocessing response/i.test(filename);
  const isAcknowledgment = /277ca|acceptance/i.test(filename);
  const includeContract = isClaim && /contract/i.test(filename);
  const pages = includeContract ? 2 : 1;
  const heading = isCover ? "Document Transmittal Cover Sheet" : isEob ? "Provider Remittance Advice" : isCalculation ? /variance/i.test(filename) ? "Underpayment Variance Worksheet" : "Expected Reimbursement Calculation" : isClaim ? "Claim Detail Image" : isContract ? "Participating Provider Agreement" : isAuthorization ? "Authorization / Referral Determination" : isClinical ? /order/i.test(filename) ? "Provider Order" : /medication/i.test(filename) ? "Medication Administration Record" : "Clinical Records Packet" : isLetter ? "Provider Claim Review Request" : isClosure ? "Payer Request Status Record" : isAcknowledgment ? "Claim Acceptance Acknowledgment" : source?.type || "Claim Review Memorandum";
  const issuedBy = isEob || isAuthorization || isClosure || isAcknowledgment || /payer/i.test(filename) ? s.patient.payer : s.patient.location;
  const reference = source?.reference || (isAuthorization ? s.authorization.number : isClaim ? s.claim.claimId : s.portal.icn);
  const expectedAllowed = s.contract.method === "case-rate" ? s.contract.rate : s.contract.method === "percent-charge" ? s.claim.billed * s.contract.percent / 100 : s.contract.rate;
  const expectedPayment = Math.max(0, expectedAllowed - s.claim.patientResponsibility);
  const calculationRows: [string, string][] = [
    ["Reimbursement method", s.contract.method === "case-rate" ? "Contracted case rate" : s.contract.method === "percent-charge" ? "Percentage of billed charges" : "Fee schedule"],
    ["Contract support", s.contract.name], ["Contracted allowed amount", money(expectedAllowed)], ["Patient responsibility", money(s.claim.patientResponsibility)], ["Expected payer payment", money(expectedPayment)], ["Actual payer payment", money(s.portal.claimPaid)], ["Calculated payment difference", money(expectedPayment - s.portal.claimPaid)],
  ];
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      const controls = [...(dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled),select") || [])];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKey); previousFocus?.focus(); };
  }, [onClose]);

  const header = <header className="payer-file-letterhead"><div><div><strong>{issuedBy}</strong><small>{isEob ? "Provider Claims & Remittance Services" : isClinical ? "Health Information Management" : "Provider Records & Correspondence"}</small></div></div><div className="payer-file-issued"><span>Record reference</span><strong>{reference}</strong><small>{source?.date ? `Record date · ${source.date}` : `Service date · ${s.patient.dos}`}</small></div></header>;
  const memberFacts = <Facts values={[["Patient / member", s.patient.name], ["Member ID", s.patient.memberId], ["Date of birth", s.patient.dob], ["Date of service", s.patient.dos], ["Provider", s.patient.provider], ["Provider NPI / TIN", `${s.patient.providerNpi} / ${s.patient.providerTaxId}`], ["Provider claim number", s.claim.claimId], ["Payer claim number", s.portal.icn]]}/>;
  const footer = (page: number) => <footer className="payer-file-footer"><span>Fictional training document · {s.id} · Not a real clinical or payer record</span><span>Preview page {page} of {pages}</span></footer>;
  const services = <table className="payer-file-table"><thead><tr><th>Service date</th><th>CPT / HCPCS</th><th>Description</th><th>Units</th><th>Charge</th></tr></thead><tbody>{s.claim.services.map((service, index) => <tr key={index}><td>{s.patient.dos}</td><td>{service.cpt}</td><td>{service.description}</td><td>{service.units}</td><td>{money(service.charge)}</td></tr>)}</tbody></table>;
  const contract = <><div className="payer-file-section-title">Exhibit B · Reimbursement schedule</div><Facts values={[["Agreement", s.contract.name], ["Effective date", s.contract.effective], ["Payer", s.patient.payer], ["Provider location", s.patient.location]]}/><table className="payer-file-table"><thead><tr><th>Reimbursement basis</th><th>Rate / provision</th></tr></thead><tbody><tr><td>{s.contract.method === "case-rate" ? "Case rate" : s.contract.method === "percent-charge" ? "Percentage of charges" : "Fee schedule"}</td><td>{s.contract.method === "percent-charge" ? `${s.contract.percent}%` : money(s.contract.rate)}</td></tr></tbody></table><div className="payer-file-copy"><h3>Contract provision</h3><p>{s.contract.terms}</p>{source?.body && <p>{source.body}</p>}</div></>;

  return <div className="payer-file-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div ref={dialog} className="payer-file-viewer" role="dialog" aria-modal="true" aria-label={`Document preview: ${filename}`}>
    <header className="payer-file-toolbar"><div><svg className="payer-file-icon" viewBox="0 0 24 28" aria-hidden="true"><path d="M5 2h10l6 6v18H5zM15 2v6h6M9 13h8M9 18h8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg><div><strong>{filename}.pdf</strong><small>Secure document preview · {pages} {pages === 1 ? "rendered page" : "rendered pages"}</small></div></div><div className="payer-file-controls"><label>Zoom<select value={zoom} onChange={event => setZoom(Number(event.target.value))}><option value={80}>80%</option><option value={100}>100%</option><option value={125}>125%</option></select></label><button ref={closeButton} onClick={onClose}>Close preview ×</button></div></header>
    <div className="payer-file-canvas"><div className="payer-file-pages" style={{ zoom: zoom / 100 }}>
      <article className="payer-file-sheet">{header}<div className="payer-file-title"><span>{isCover ? "Provider submission packet" : isLetter ? "Learner-prepared correspondence" : "Case evidence record"}</span><h2>{heading}</h2>{isEob && <strong>{s.portal.status}</strong>}</div>
        {memberFacts}
        {isEob ? <><div className="payer-file-totals">{[["Billed", s.portal.claimBilled], ["Allowed", s.portal.claimAllowed], ["Plan paid", s.portal.claimPaid], ["Patient responsibility", s.portal.claimPatientResponsibility]].map(([label, value]) => <div key={String(label)}><span>{label}</span><strong>{money(Number(value))}</strong></div>)}</div><table className="payer-file-table"><thead><tr><th>Service from / to</th><th>CPT</th><th>Billed</th><th>Allowed</th><th>Paid</th><th>Adjustment</th><th>PR</th><th>Codes / status</th></tr></thead><tbody>{s.portal.serviceLines.map((line, index) => <tr key={index}><td>{line.serviceFrom || s.patient.dos}<br/>{line.serviceTo || s.patient.dos}</td><td>{line.cpt}</td><td>{money(line.billed)}</td><td>{money(line.allowed)}</td><td>{money(line.paid)}</td><td>{money(line.adjustment)}</td><td>{money(line.patientResponsibility)}</td><td>{line.codes}<small>{line.status}</small></td></tr>)}</tbody></table><div className="payer-file-copy"><h3>Remittance explanation</h3><p>{s.portal.reason}</p>{source?.body && <p>{source.body}</p>}<p>Payment trace: {s.portal.checkOrEft}</p></div></> :
        isContract ? contract :
        isCalculation ? <><table className="payer-file-table payer-file-calculation"><thead><tr><th>Calculation item</th><th>Amount / basis</th></tr></thead><tbody>{calculationRows.map(([label, value]) => <tr key={label}><td>{label}</td><td>{value}</td></tr>)}</tbody></table><div className="payer-file-copy"><h3>Calculation support</h3><p>{s.contract.terms}</p><p>Expected payer payment = contracted allowed amount − patient responsibility. Payment difference = expected payer payment − actual payment. The posted ledger balance is a separate value.</p><p>Posted insurance AR: {money(s.claim.openAr)}</p></div></> :
        isCover ? <><Facts values={[["To / payer recipient", recipient || "Not entered in your packet"], ["Subject", subject || "Not entered in your packet"], ["From", `${s.patient.location} · Revenue Cycle Operations`], ["Documents included", String(selectedDocuments.length)]]}/><h3>Enclosure checklist</h3><ul className="payer-file-enclosures">{selectedDocuments.length ? selectedDocuments.map(name => <li key={name}>☑ {name}.pdf</li>) : <li>No documents selected yet.</li>}</ul><div className="payer-file-copy"><p>This cover sheet reflects the current selected packet. Selection and preview do not confirm upload or submission.</p></div></> :
        isLetter ? <div className="payer-file-copy payer-file-letter"><p>To: {recipient || "Payer recipient not entered"}</p><p><strong>Re: {subject || "Claim review request"}</strong></p><p>Dear Claims Review Team:</p><p>{letter || "No request letter has been drafted yet. Prepare your letter in the submission workspace; its text will appear here."}</p><p>Sincerely,<br/>Revenue Cycle Operations<br/>{s.patient.location}</p></div> :
        isAuthorization ? <><div className="payer-file-status"><span>Authorization number</span><strong>{s.authorization.number}</strong><b>{s.authorization.status}</b></div><Facts values={[["Approved span", s.authorization.span], ["Approved services", s.authorization.services], ["Authorization requirement", s.authorization.required]]}/><div className="payer-file-copy"><h3>Determination details</h3><p>{source?.body || s.authorization.notes}</p><p>{s.authorization.notes}</p></div></> :
        isClaim ? <><Facts values={[["Billing / service location", s.patient.location], ["Claim number", s.claim.claimId], ["Total charge", money(s.claim.billed)], ["Payer status", s.portal.status]]}/><h3>Submitted service detail</h3>{services}<div className="payer-file-copy"><h3>Claim record support</h3><p>{source?.body || "The service detail above is drawn from the case claim record."}</p><p>{source?.summary || "Review the original claim packet in the Lab for the full claim form."}</p></div></> :
        isClinical ? <><div className="payer-file-section-title">Encounter / ordered service record</div>{services}<div className="payer-file-copy"><h3>{/order/i.test(filename) ? "Order detail" : /medication/i.test(filename) ? "Administration record detail" : "Clinical documentation"}</h3><p>{source?.summary || "Service and provider identifiers are reproduced from the case record."}</p><p>{source?.body || "Additional clinical narrative is not supplied for this named evidence item. Review the supporting record in the Lab."}</p></div><div className="payer-file-signature"><span>Provider on record</span><strong>{s.patient.provider}</strong><small>NPI {s.patient.providerNpi}</small></div></> :
        isReview ? <><div className="payer-file-section-title">Internal review record</div><div className="payer-file-copy"><h3>Review findings</h3><p>{source?.summary || "Review the case documentation."}</p><p>{source?.body || "No additional review narrative is supplied in the case."}</p></div><h3>Claim services under review</h3>{services}</> :
        <><div className="payer-file-reference">Reference: {reference}{source?.codes && <span>{source.codes}</span>}</div><div className="payer-file-copy"><p>Dear Provider:</p>{isClosure ? <><p>{(/pricing request closure/i.test(filename) ? s.callQuestions.find(question => /prior.*request|request.*open|reprocess/i.test(question.question))?.answer : source?.body) || source?.body || s.portal.reason}</p>{source?.body && <><h3>Previous correspondence</h3><p>{source.body}</p></>}</> : <><p>{source?.summary || s.portal.status}</p><p>{source?.body || s.portal.reason}</p></>}<p>{isAcknowledgment ? "An acceptance acknowledgment confirms claim receipt, not payment or approval." : "Include the member, date of service and correspondence reference when responding."}</p><p>Sincerely,<br/>{isAcknowledgment ? "Electronic Claims Processing" : "Provider Claims Records"}</p></div></>}
        {footer(1)}
      </article>
      {includeContract && <article className="payer-file-sheet">{header}<div className="payer-file-title"><span>Claim supporting evidence</span><h2>Contract Support</h2></div>{contract}{footer(2)}</article>}
    </div></div>
  </div></div>;
}
