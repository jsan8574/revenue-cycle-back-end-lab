"use client";

import { useMemo, useState } from "react";
import {
  arScenarios,
  resolutionActions,
  resolutionRoutes,
  type ArScenario,
} from "../data/exploration";
import type { TrainingModule } from "../data/training";
import { PdfExportCenter } from "./PdfExportCenter";

type ArDeskTab =
  | "account"
  | "eobs"
  | "transactions"
  | "coverage"
  | "investigate"
  | "reimbursement"
  | "resolve"
  | "notation";

type CalculatorState = {
  method: string;
  billed: string;
  rate: string;
  percent: string;
  patientResponsibility: string;
  otherInsurance: string;
  actualPayment: string;
};

const arTabs: { id: ArDeskTab; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "eobs", label: "EOBs & correspondence" },
  { id: "transactions", label: "Transactions" },
  { id: "coverage", label: "Coverage & auth" },
  { id: "investigate", label: "Payer investigation" },
  { id: "reimbursement", label: "Reimbursement" },
  { id: "resolve", label: "Resolution" },
  { id: "notation", label: "Notation" },
];

const initialCalculator = (): CalculatorState => ({
  method: "",
  billed: "",
  rate: "",
  percent: "",
  patientResponsibility: "",
  otherInsurance: "",
  actualPayment: "",
});

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

const numeric = (value: string) => {
  const result = Number(value.replace(/[$,%\s]/g, ""));
  return Number.isFinite(result) ? result : 0;
};

const closeEnough = (left: number, right: number) =>
  Math.abs(left - right) < 0.005;

export function ARCollectionsLab({
  module,
  learnerName,
  scenarioIndex,
  onSelectScenario,
  onComplete,
}: {
  module: TrainingModule;
  learnerName: string;
  scenarioIndex: number;
  onSelectScenario: (index: number) => void;
  onComplete: (scenario: string, score: number) => void;
}) {
  const scenario = arScenarios[scenarioIndex];
  const [tab, setTab] = useState<ArDeskTab>("account");
  const [visited, setVisited] = useState<ArDeskTab[]>(["account"]);
  const [balanceReviewed, setBalanceReviewed] = useState(false);
  const [portalOpened, setPortalOpened] = useState(false);
  const [portalCredentials, setPortalCredentials] = useState({
    memberId: "",
    providerId: "",
    dob: "",
    dos: "",
  });
  const [portalFeedback, setPortalFeedback] = useState("");
  const [callStage, setCallStage] = useState(0);
  const [callAnswers, setCallAnswers] = useState<number[]>([]);
  const [callClosed, setCallClosed] = useState(false);
  const [calculator, setCalculator] = useState<CalculatorState>(
    initialCalculator(),
  );
  const [calculation, setCalculation] = useState<{
    allowed: number;
    payment: number;
    variance: number;
  } | null>(null);
  const [reimbursementValid, setReimbursementValid] = useState(false);
  const [calculationFeedback, setCalculationFeedback] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [actionValid, setActionValid] = useState(false);
  const [actionFeedback, setActionFeedback] = useState("");
  const [decisionAttempts, setDecisionAttempts] = useState(0);
  const [notes, setNotes] = useState({
    source: "",
    representative: "",
    reference: "",
    followUp: "",
    issue: "",
    findings: "",
    resolution: "",
  });
  const [notePosted, setNotePosted] = useState(false);
  const [closed, setClosed] = useState(false);

  const investigationComplete = portalOpened && callClosed;
  const notesComplete =
    notes.source.length > 0 &&
    notes.representative.trim().length >= 2 &&
    notes.reference.trim().length >= 5 &&
    notes.followUp.trim().length >= 4 &&
    notes.issue.trim().length >= 12 &&
    notes.findings.trim().length >= 12 &&
    notes.resolution.trim().length >= 12;
  const checklist = [
    { label: "Access the account", done: true },
    { label: "Review the account balance", done: balanceReviewed },
    {
      label: "Review EOBs / correspondences",
      done: visited.includes("eobs"),
    },
    {
      label: "Compare payment / allowed to expected reimbursement",
      done: reimbursementValid,
    },
    {
      label: "Review previous transactions & related accounts",
      done: visited.includes("transactions"),
    },
    {
      label: "Complete payer portal research and call",
      done: investigationComplete,
    },
    { label: "Choose and validate a resolution", done: actionValid },
    { label: "Create notation: issue, findings, resolution", done: notesComplete },
    { label: "Post note in the system", done: notePosted },
  ];

  const completedCount = checklist.filter((item) => item.done).length;
  const canPostNote =
    notesComplete && actionValid && reimbursementValid && investigationComplete;

  const openTab = (next: ArDeskTab) => {
    setTab(next);
    setVisited((current) =>
      current.includes(next) ? current : [...current, next],
    );
  };

  const authenticatePortal = () => {
    const normalize = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const providerEntered = normalize(portalCredentials.providerId);
    const correct =
      normalize(portalCredentials.memberId) ===
        normalize(scenario.patient.memberId) &&
      (providerEntered === normalize(scenario.patient.providerNpi) ||
        providerEntered === normalize(scenario.patient.providerTaxId)) &&
      normalize(portalCredentials.dob) === normalize(scenario.patient.dob) &&
      normalize(portalCredentials.dos) === normalize(scenario.patient.dos);
    setPortalOpened(correct);
    setPortalFeedback(
      correct
        ? "Claim located. The adjudication detail is available below."
        : "Claim not found. Verify the member ID, provider NPI or tax ID, patient DOB, and date of service.",
    );
  };

  const runCalculation = () => {
    const billed = numeric(calculator.billed);
    const rate = numeric(calculator.rate);
    const percent = numeric(calculator.percent);
    const patient = numeric(calculator.patientResponsibility);
    const other = numeric(calculator.otherInsurance);
    const actual = numeric(calculator.actualPayment);
    const allowed =
      calculator.method === "percent-charge"
        ? billed * (percent / 100)
        : rate;
    const payment = Math.max(0, allowed - patient - other);
    const variance = payment - actual;
    const result = { allowed, payment, variance };
    setCalculation(result);

    const correct =
      calculator.method === scenario.expected.method &&
      closeEnough(allowed, scenario.expected.expectedAllowed) &&
      closeEnough(payment, scenario.expected.expectedPayment) &&
      closeEnough(variance, scenario.expected.variance);
    setReimbursementValid(correct);
    setCalculationFeedback(
      correct
        ? "Validated. Your methodology, expected reimbursement, and payment variance match the contract evidence."
        : "Not validated. Recheck the contract methodology, rate source, patient liability, other insurance, and actual payment.",
    );
  };

  const validateAction = () => {
    setDecisionAttempts((count) => count + 1);
    const correct =
      selectedAction === scenario.expected.action &&
      selectedRoute === scenario.expected.route &&
      decisionReason.trim().length >= 20;
    setActionValid(correct);
    setActionFeedback(
      correct
        ? `Decision supported. ${scenario.expected.rationale}`
        : "The action, destination, or written rationale is not fully supported by the investigation. Revisit the payer evidence and deadlines before trying again.",
    );
  };

  const postNote = () => {
    if (!canPostNote || notePosted) return;
    setNotePosted(true);
  };

  const closeAccount = () => {
    if (!notePosted || closed) return;
    const score = Math.max(74, 100 - decisionAttempts * 4);
    setClosed(true);
    onComplete(scenario.title, score);
  };

  return (
    <div
      className="exploration-page page-enter"
      style={
        {
          "--module-accent": module.accent,
          "--module-soft": module.soft,
        } as React.CSSProperties
      }
    >
      <section className="exploration-header">
        <div>
          <span className="section-kicker">AR investigation desktop</span>
          <h1>Work the account. Prove the next action.</h1>
          <p>
            Navigate a realistic patient account, develop the claim story,
            calculate expected reimbursement, investigate with the payer, and
            own the resolution.
          </p>
        </div>
        <span className="mode-chip">Industry-ready mode</span>
      </section>

      <ArScenarioRail
        selected={scenarioIndex}
        onSelect={onSelectScenario}
      />

      <PdfExportCenter
        learnerName={learnerName}
        moduleName={module.title}
        scenarioName={`${scenario.id} · ${scenario.title}`}
        reports={[
          {
            label: "Account investigation",
            description: "Claim facts, notes, transactions, and documents reviewed",
            title: "AR Account Investigation",
            sections: [
              {
                heading: "Account and claim",
                lines: [
                  `${scenario.patient.name} · ${scenario.patient.account}`,
                  `Member ID: ${scenario.patient.memberId}`,
                  `DOS: ${scenario.patient.dos}`,
                  `Claim: ${scenario.claim.claimId}`,
                  `Billed: ${money(scenario.claim.billed)}`,
                  `Open insurance AR: ${money(scenario.claim.openAr)}`,
                ],
              },
              {
                heading: "Previous account notes",
                lines: scenario.previousNotes.map(
                  (note) =>
                    `${note.date} · ${note.author} (${note.department}): ${note.note}`,
                ),
              },
              {
                heading: "Investigation status",
                lines: [
                  `Portal claim detail: ${portalOpened ? "Reviewed" : "Not reviewed"}`,
                  `Payer call: ${callClosed ? "Closed" : "Not completed"}`,
                  `Documents reviewed: ${visited.includes("eobs") ? "Yes" : "No"}`,
                  `Transactions reviewed: ${visited.includes("transactions") ? "Yes" : "No"}`,
                ],
              },
            ],
          },
          {
            label: "Resolution worksheet",
            description: "Reimbursement calculation and proposed next action",
            title: "AR Resolution Worksheet",
            sections: [
              {
                heading: "Expected reimbursement",
                lines: [
                  `Method selected: ${calculator.method || "Not selected"}`,
                  `Expected allowed: ${calculation ? money(calculation.allowed) : "Not calculated"}`,
                  `Expected payment: ${calculation ? money(calculation.payment) : "Not calculated"}`,
                  `Variance: ${calculation ? money(calculation.variance) : "Not calculated"}`,
                  `Validation: ${reimbursementValid ? "Passed" : "Not passed"}`,
                ],
              },
              {
                heading: "Resolution decision",
                lines: [
                  `Action: ${selectedAction || "Not selected"}`,
                  `Route: ${selectedRoute || "Not selected"}`,
                  `Rationale: ${decisionReason || "Not entered"}`,
                ],
              },
            ],
          },
          {
            label: "Final account note",
            description: "Issue, findings, resolution, and completion status",
            title: "AR Completion Report",
            sections: [
              { heading: "Issue", lines: [notes.issue || "Not entered"] },
              {
                heading: "Status source and payer contact",
                lines: [
                  `Source: ${notes.source || "Not entered"}`,
                  `Representative: ${notes.representative || "Not entered"}`,
                  `Reference: ${notes.reference || "Not entered"}`,
                  `Follow-up: ${notes.followUp || "Not entered"}`,
                ],
              },
              { heading: "Findings", lines: [notes.findings || "Not entered"] },
              {
                heading: "Resolution",
                lines: [notes.resolution || "Not entered"],
              },
              {
                heading: "Completion",
                lines: [
                  `Checklist: ${completedCount} of 9 complete`,
                  `Note status: ${notePosted ? "Posted" : "Draft"}`,
                  `Account status: ${closed ? "Completed" : "Open"}`,
                ],
              },
            ],
          },
        ]}
      />

      <section className="ar-system-frame">
        <header className="ar-system-titlebar">
          <div className="system-brand">
            <span className="system-logo amber">AR</span>
            <div>
              <strong>Account Resolution Manager</strong>
              <small>Practice tenant · {scenario.id}</small>
            </div>
          </div>
          <div className="ar-search-context">
            <span>Patient account</span>
            <strong>
              {scenario.patient.name} · {scenario.patient.account}
            </strong>
          </div>
          <div className="system-title-meta">
            <span>{scenario.status}</span>
            <strong>{scenario.amount}</strong>
          </div>
        </header>

        <div className="ar-system-body">
          <aside className="ar-checklist">
            <div className="checklist-heading">
              <span className="system-kicker">Collection workflow</span>
              <h3>Account checklist</h3>
              <p>{completedCount} of 9 complete</p>
            </div>
            <div className="ar-checklist-progress">
              <span style={{ width: `${(completedCount / 9) * 100}%` }} />
            </div>
            <div className="ar-checklist-items">
              {checklist.map((item, index) => (
                <div
                  className={item.done ? "ar-check-item done" : "ar-check-item"}
                  key={item.label}
                >
                  <span>{item.done ? "✓" : index + 1}</span>
                  <p>{item.label}</p>
                </div>
              ))}
            </div>
            <details className="action-reference">
              <summary>Resolution action types</summary>
              {resolutionActions.map((action) => (
                <span key={action.id}>· {action.label}</span>
              ))}
            </details>
          </aside>

          <div className="ar-workspace">
            <nav className="ar-tabbar" aria-label="AR account areas">
              {arTabs.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={tab === item.id ? "ar-tab active" : "ar-tab"}
                  onClick={() => openTab(item.id)}
                >
                  {item.label}
                  {visited.includes(item.id) && item.id !== "account" ? (
                    <span aria-label="Visited">·</span>
                  ) : null}
                </button>
              ))}
            </nav>

            <div className="ar-workarea">
              {tab === "account" ? (
                <AccountView
                  scenario={scenario}
                  reviewed={balanceReviewed}
                  onReviewed={() => setBalanceReviewed(true)}
                />
              ) : null}
              {tab === "eobs" ? <DocumentsView scenario={scenario} /> : null}
              {tab === "transactions" ? (
                <TransactionsView scenario={scenario} />
              ) : null}
              {tab === "coverage" ? <CoverageView scenario={scenario} /> : null}
              {tab === "investigate" ? (
                <InvestigationView
                  scenario={scenario}
                  portalOpened={portalOpened}
                  portalCredentials={portalCredentials}
                  portalFeedback={portalFeedback}
                  callStage={callStage}
                  callAnswers={callAnswers}
                  callClosed={callClosed}
                  onPortalCredential={(key, value) =>
                    setPortalCredentials((current) => ({
                      ...current,
                      [key]: value,
                    }))
                  }
                  onPortal={authenticatePortal}
                  onAdvanceCall={() =>
                    setCallStage((current) => Math.min(4, current + 1))
                  }
                  onQuestion={(index) =>
                    setCallAnswers((current) =>
                      current.includes(index) ? current : [...current, index],
                    )
                  }
                  onCloseCall={() => setCallClosed(true)}
                />
              ) : null}
              {tab === "reimbursement" ? (
                <ReimbursementView
                  scenario={scenario}
                  calculator={calculator}
                  calculation={calculation}
                  feedback={calculationFeedback}
                  valid={reimbursementValid}
                  onChange={(key, value) =>
                    setCalculator((current) => ({ ...current, [key]: value }))
                  }
                  onCalculate={runCalculation}
                />
              ) : null}
              {tab === "resolve" ? (
                <ResolutionView
                  selectedAction={selectedAction}
                  selectedRoute={selectedRoute}
                  decisionReason={decisionReason}
                  feedback={actionFeedback}
                  valid={actionValid}
                  onAction={setSelectedAction}
                  onRoute={setSelectedRoute}
                  onReason={setDecisionReason}
                  onValidate={validateAction}
                />
              ) : null}
              {tab === "notation" ? (
                <NotationView
                  notes={notes}
                  canPost={canPostNote}
                  posted={notePosted}
                  closed={closed}
                  onChange={(key, value) =>
                    setNotes((current) => ({ ...current, [key]: value }))
                  }
                  onPost={postNote}
                  onClose={closeAccount}
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ArScenarioRail({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <section className="scenario-rail exploration-scenarios" aria-label="AR scenarios">
      {arScenarios.map((item, index) => (
        <button
          key={item.id}
          className={
            index === selected
              ? "scenario-card scenario-card-active"
              : "scenario-card"
          }
          onClick={() => onSelect(index)}
          type="button"
        >
          <span className="scenario-number">0{index + 1}</span>
          <span className="scenario-card-copy">
            <strong>{item.title}</strong>
            <small>{item.subtitle}</small>
          </span>
          <span
            className={`priority-tag priority-${item.priority
              .toLowerCase()
              .replace(" ", "-")}`}
          >
            {item.priority} · {item.status}
          </span>
        </button>
      ))}
    </section>
  );
}

function AccountView({
  scenario,
  reviewed,
  onReviewed,
}: {
  scenario: ArScenario;
  reviewed: boolean;
  onReviewed: () => void;
}) {
  return (
    <div className="ar-account-view">
      <div className="ar-patient-banner">
        <span className="account-result-avatar large">
          {scenario.patient.name
            .split(" ")
            .map((part) => part[0])
            .join("")}
        </span>
        <div>
          <span className="system-kicker">{scenario.patient.account}</span>
          <h2>{scenario.patient.name}</h2>
          <p>
            DOB {scenario.patient.dob} · Member {scenario.patient.memberId} ·{" "}
            {scenario.patient.payer}
          </p>
        </div>
        <div className="ar-balance-callout">
          <span>Insurance AR</span>
          <strong>{money(scenario.claim.openAr)}</strong>
          <small>{scenario.claim.aging}</small>
        </div>
      </div>

      <div className="ar-summary-grid">
        {[
          ["Date of service", scenario.patient.dos],
          ["Provider", scenario.patient.provider],
          ["Location", scenario.patient.location],
          ["Claim ID", scenario.claim.claimId],
          ["Filing limit", scenario.claim.filingLimit],
          ["Appeal deadline", scenario.claim.appealDeadline],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="balance-strip">
        {[
          ["Billed", scenario.claim.billed],
          ["Allowed", scenario.claim.allowed],
          ["Insurance paid", scenario.claim.paid],
          ["Patient responsibility", scenario.claim.patientResponsibility],
          ["Open AR", scenario.claim.openAr],
        ].map(([label, value], index) => (
          <div className={index === 4 ? "emphasis" : ""} key={String(label)}>
            <span>{label}</span>
            <strong>{money(Number(value))}</strong>
          </div>
        ))}
      </div>

      <div className="ar-section">
        <div className="system-section-heading compact-system-heading">
          <div>
            <span className="system-kicker">Claim services</span>
            <h3>Service-line detail</h3>
          </div>
        </div>
        <div className="system-table-wrap">
          <table className="system-table">
            <thead>
              <tr>
                <th>CPT</th>
                <th>Description</th>
                <th>Units</th>
                <th>Charge</th>
              </tr>
            </thead>
            <tbody>
              {scenario.claim.services.map((service) => (
                <tr key={service.cpt}>
                  <td>{service.cpt}</td>
                  <td>{service.description}</td>
                  <td>{service.units}</td>
                  <td>{money(service.charge)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ar-section">
        <div className="system-section-heading compact-system-heading">
          <div>
            <span className="system-kicker">Billing history</span>
            <h3>Claim story to date</h3>
          </div>
          <button
            type="button"
            className={reviewed ? "review-control reviewed" : "review-control"}
            onClick={onReviewed}
          >
            {reviewed ? "Balance reviewed ✓" : "Mark balance reviewed"}
          </button>
        </div>
        <div className="billing-history-list">
          {scenario.billingHistory.map((item) => (
            <div key={`${item.date}-${item.event}`}>
              <span>{item.date}</span>
              <p>
                <strong>{item.event}</strong>
                {item.detail}
              </p>
              <small>{item.source}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="ar-section previous-notes-section">
        <div className="system-section-heading compact-system-heading">
          <div>
            <span className="system-kicker">Account notes</span>
            <h3>Previous collector and department notes</h3>
          </div>
          <small>Read chronologically before duplicating work.</small>
        </div>
        <div className="previous-note-list">
          {scenario.previousNotes.map((note) => (
            <article key={`${note.date}-${note.author}`}>
              <div>
                <strong>{note.author}</strong>
                <span>{note.department}</span>
                <small>{note.date}</small>
              </div>
              <p>{note.note}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function DocumentsView({ scenario }: { scenario: ArScenario }) {
  const [selectedDocument, setSelectedDocument] = useState(0);
  const document = scenario.documents[selectedDocument];
  const isEob =
    document.type.toLowerCase().includes("eob") ||
    document.type.toLowerCase().includes("era");

  return (
    <div className="ar-section">
      <div className="system-section-heading">
        <div>
          <span className="system-kicker">Document center</span>
          <h3>EOBs, acknowledgments & correspondence</h3>
          <p>Read each record and decide which evidence changes the account story.</p>
        </div>
      </div>
      <div className="document-review-layout">
        <div className="ar-document-grid document-index">
          {scenario.documents.map((item, index) => (
            <button
              type="button"
              key={item.reference}
              className={selectedDocument === index ? "selected" : ""}
              onClick={() => setSelectedDocument(index)}
            >
              <div>
                <span>{item.type}</span>
                <small>{item.date}</small>
              </div>
              <h4>{item.reference}</h4>
              <p>{item.summary}</p>
              <strong>{item.codes}</strong>
            </button>
          ))}
        </div>

        <article className="pdf-document-page">
          <div className="pdf-document-toolbar">
            <span>PDF preview · Page 1 of 1</span>
            <strong>{document.reference}</strong>
          </div>
          <div className="pdf-document-sheet">
            <header>
              <div className="pdf-payer-mark">
                {isEob ? scenario.patient.payer : document.type}
              </div>
              <div>
                <span>{isEob ? "Explanation of Benefits" : "Correspondence"}</span>
                <strong>{document.date}</strong>
              </div>
            </header>

            <div className="pdf-document-address">
              <div>
                <span>Patient / member</span>
                <strong>{scenario.patient.name}</strong>
                <p>{scenario.patient.memberId}</p>
              </div>
              <div>
                <span>Provider</span>
                <strong>{scenario.patient.provider}</strong>
                <p>NPI {scenario.patient.providerNpi}</p>
              </div>
              <div>
                <span>Claim / reference</span>
                <strong>{isEob ? scenario.portal.icn : document.reference}</strong>
                <p>DOS {scenario.patient.dos}</p>
              </div>
            </div>

            {isEob ? (
              <>
                <div className="pdf-eob-summary">
                  <div>
                    <span>Total billed</span>
                    <strong>{money(scenario.portal.claimBilled)}</strong>
                  </div>
                  <div>
                    <span>Allowed</span>
                    <strong>{money(scenario.portal.claimAllowed)}</strong>
                  </div>
                  <div>
                    <span>Plan paid</span>
                    <strong>{money(scenario.portal.claimPaid)}</strong>
                  </div>
                  <div>
                    <span>Patient responsibility</span>
                    <strong>
                      {money(scenario.portal.claimPatientResponsibility)}
                    </strong>
                  </div>
                </div>
                <table className="pdf-eob-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Billed</th>
                      <th>Allowed</th>
                      <th>Paid</th>
                      <th>Adjustment</th>
                      <th>Patient</th>
                      <th>Codes / status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenario.portal.serviceLines.map((line) => (
                      <tr key={line.cpt}>
                        <td>{line.cpt}</td>
                        <td>{money(line.billed)}</td>
                        <td>{money(line.allowed)}</td>
                        <td>{money(line.paid)}</td>
                        <td>{money(line.adjustment)}</td>
                        <td>{money(line.patientResponsibility)}</td>
                        <td>
                          {line.codes}
                          <small>{line.status}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="pdf-letter-body">
                <p>Re: {document.reference}</p>
                <p>{document.body}</p>
              </div>
            )}

            <div className="pdf-document-explanation">
              <span>Explanation / correspondence detail</span>
              <p>{document.body}</p>
              <strong>{document.codes}</strong>
            </div>
            <footer>
              Fictional training document · Not a real payer communication
            </footer>
          </div>
        </article>
      </div>
    </div>
  );
}

function TransactionsView({ scenario }: { scenario: ArScenario }) {
  return (
    <div className="ar-transactions-view">
      <div className="ar-section">
        <div className="system-section-heading compact-system-heading">
          <div>
            <span className="system-kicker">Financial ledger</span>
            <h3>Previous transactions</h3>
          </div>
        </div>
        <div className="system-table-wrap">
          <table className="system-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction</th>
                <th>Amount</th>
                <th>Reference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {scenario.transactions.map((transaction) => (
                <tr key={`${transaction.date}-${transaction.reference}`}>
                  <td>{transaction.date}</td>
                  <td>{transaction.type}</td>
                  <td>{money(transaction.amount)}</td>
                  <td>{transaction.reference}</td>
                  <td>{transaction.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="ar-section related-section">
        <div className="system-section-heading compact-system-heading">
          <div>
            <span className="system-kicker">Enterprise account links</span>
            <h3>Related accounts</h3>
          </div>
        </div>
        <div className="related-account-grid">
          {scenario.relatedAccounts.map((account) => (
            <div key={account.account}>
              <span>{account.account}</span>
              <strong>{account.dos}</strong>
              <small>{account.status}</small>
              <b>{money(account.balance)}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CoverageView({ scenario }: { scenario: ArScenario }) {
  return (
    <div className="coverage-layout">
      <article className="coverage-card">
        <div className="coverage-icon">INS</div>
        <span className="system-kicker">Insurance record</span>
        <h3>{scenario.patient.plan}</h3>
        <dl>
          <dt>Effective</dt>
          <dd>{scenario.insurance.effective}</dd>
          <dt>Termination / status</dt>
          <dd>{scenario.insurance.termination}</dd>
          <dt>Network</dt>
          <dd>{scenario.insurance.network}</dd>
          <dt>Coordination</dt>
          <dd>{scenario.insurance.coordination}</dd>
          <dt>Subscriber</dt>
          <dd>{scenario.insurance.subscriber}</dd>
          <dt>Payer phone</dt>
          <dd>{scenario.insurance.phone}</dd>
        </dl>
      </article>
      <article className="coverage-card">
        <div className="coverage-icon auth">AUTH</div>
        <span className="system-kicker">Authorization record</span>
        <h3>{scenario.authorization.number}</h3>
        <dl>
          <dt>Required</dt>
          <dd>{scenario.authorization.required}</dd>
          <dt>Status</dt>
          <dd>{scenario.authorization.status}</dd>
          <dt>Service span</dt>
          <dd>{scenario.authorization.span}</dd>
          <dt>Approved services</dt>
          <dd>{scenario.authorization.services}</dd>
        </dl>
        <div className="coverage-note">{scenario.authorization.notes}</div>
      </article>
      <article className="contract-card">
        <div>
          <span className="system-kicker">Contract reference</span>
          <h3>{scenario.contract.name}</h3>
          <p>Effective {scenario.contract.effective}</p>
        </div>
        <strong>
          {scenario.contract.method === "case-rate"
            ? `${money(scenario.contract.rate)} case rate`
            : scenario.contract.method === "percent-charge"
              ? `${scenario.contract.percent}% of billed charges`
              : `${money(scenario.contract.rate)} fee schedule`}
        </strong>
        <p>{scenario.contract.terms}</p>
      </article>
    </div>
  );
}

function InvestigationView({
  scenario,
  portalOpened,
  portalCredentials,
  portalFeedback,
  callStage,
  callAnswers,
  callClosed,
  onPortalCredential,
  onPortal,
  onAdvanceCall,
  onQuestion,
  onCloseCall,
}: {
  scenario: ArScenario;
  portalOpened: boolean;
  portalCredentials: {
    memberId: string;
    providerId: string;
    dob: string;
    dos: string;
  };
  portalFeedback: string;
  callStage: number;
  callAnswers: number[];
  callClosed: boolean;
  onPortalCredential: (
    key: "memberId" | "providerId" | "dob" | "dos",
    value: string,
  ) => void;
  onPortal: () => void;
  onAdvanceCall: () => void;
  onQuestion: (index: number) => void;
  onCloseCall: () => void;
}) {
  const openingExchanges = [
    {
      rep: `Thank you for calling ${scenario.patient.payer} Provider Services. My name is Alex. How may I help you?`,
      learner: `Hello, I’m calling from ${scenario.patient.location} for a detailed claim-status review.`,
    },
    {
      rep: "Please provide the member ID, patient name, and date of birth.",
      learner: `${scenario.patient.memberId}; ${scenario.patient.name}; DOB ${scenario.patient.dob}.`,
    },
    {
      rep: "Please verify the billing provider NPI or tax ID.",
      learner: `${scenario.patient.provider}; NPI ${scenario.patient.providerNpi}; tax ID ${scenario.patient.providerTaxId}.`,
    },
    {
      rep: "What date of service and billed amount should I search?",
      learner: `DOS ${scenario.patient.dos}; total billed ${money(scenario.claim.billed)}; patient control ${scenario.claim.claimId}.`,
    },
  ];
  const referenceAsked = callAnswers.some((index) =>
    scenario.callQuestions[index].question.toLowerCase().includes("reference"),
  );
  const canCloseCall =
    callStage >= openingExchanges.length &&
    callAnswers.length >= 3 &&
    referenceAsked;

  return (
    <div className="investigation-layout">
      <div className="portal-simulator">
        <div className="simulator-header">
          <div className="coverage-icon">WEB</div>
          <div>
            <span className="system-kicker">External simulation</span>
            <h3>Multi-payer provider portal</h3>
          </div>
        </div>

        <div className="portal-search-form">
          <div className="portal-search-banner">
            <span>Claims & payments inquiry</span>
            <strong>{scenario.patient.payer}</strong>
          </div>
          <div className="portal-credential-grid">
            <label>
              <span>Member ID</span>
              <input
                value={portalCredentials.memberId}
                onChange={(event) =>
                  onPortalCredential("memberId", event.target.value)
                }
                placeholder="Member / subscriber ID"
              />
            </label>
            <label>
              <span>Provider NPI or tax ID</span>
              <input
                value={portalCredentials.providerId}
                onChange={(event) =>
                  onPortalCredential("providerId", event.target.value)
                }
                placeholder="NPI or TIN"
              />
            </label>
            <label>
              <span>Patient DOB</span>
              <input
                value={portalCredentials.dob}
                onChange={(event) =>
                  onPortalCredential("dob", event.target.value)
                }
                placeholder="MM/DD/YYYY or written date"
              />
            </label>
            <label>
              <span>Date of service</span>
              <input
                value={portalCredentials.dos}
                onChange={(event) =>
                  onPortalCredential("dos", event.target.value)
                }
                placeholder="Service date"
              />
            </label>
          </div>
          <button type="button" onClick={onPortal}>
            Search claim
          </button>
          {portalFeedback ? (
            <p className={portalOpened ? "portal-feedback valid" : "portal-feedback"}>
              {portalFeedback}
            </p>
          ) : null}
        </div>

        {portalOpened ? (
          <div className="portal-result">
            <div className="portal-claim-title">
              <div>
                <span>Claim status</span>
                <strong>{scenario.portal.status}</strong>
              </div>
              <div>
                <span>Payer claim control</span>
                <strong>{scenario.portal.icn}</strong>
              </div>
              <div>
                <span>Patient control</span>
                <strong>{scenario.portal.patientControl}</strong>
              </div>
            </div>
            <div className="portal-grid">
              <div>
                <span>Received</span>
                <strong>{scenario.portal.received}</strong>
              </div>
              <div>
                <span>Finalized</span>
                <strong>{scenario.portal.finalized}</strong>
              </div>
              <div>
                <span>Payer ICN</span>
                <strong>{scenario.portal.icn}</strong>
              </div>
              <div>
                <span>Payment reference</span>
                <strong>{scenario.portal.checkOrEft}</strong>
              </div>
            </div>
            <div className="portal-payment-summary">
              {[
                ["Claim billed", scenario.portal.claimBilled],
                ["Allowed", scenario.portal.claimAllowed],
                ["Plan paid", scenario.portal.claimPaid],
                [
                  "Patient responsibility",
                  scenario.portal.claimPatientResponsibility,
                ],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <span>{label}</span>
                  <strong>{money(Number(value))}</strong>
                </div>
              ))}
            </div>
            <div className="system-table-wrap portal-service-lines">
              <table className="system-table">
                <thead>
                  <tr>
                    <th>CPT</th>
                    <th>Billed</th>
                    <th>Allowed</th>
                    <th>Paid</th>
                    <th>Adjustment</th>
                    <th>Patient</th>
                    <th>Codes</th>
                    <th>Line status</th>
                  </tr>
                </thead>
                <tbody>
                  {scenario.portal.serviceLines.map((line) => (
                    <tr key={line.cpt}>
                      <td>{line.cpt}</td>
                      <td>{money(line.billed)}</td>
                      <td>{money(line.allowed)}</td>
                      <td>{money(line.paid)}</td>
                      <td>{money(line.adjustment)}</td>
                      <td>{money(line.patientResponsibility)}</td>
                      <td>{line.codes}</td>
                      <td>{line.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="portal-reason">
              <span>Processing detail</span>
              <p>{scenario.portal.reason}</p>
              <span>Portal guidance</span>
              <p>{scenario.portal.nextStep}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="payer-call-simulator">
        <div className="simulator-header">
          <div className="coverage-icon call">CALL</div>
          <div>
            <span className="system-kicker">Call simulation</span>
            <h3>Speak with the payer</h3>
          </div>
          <span className="call-timer">
            00:{String(18 + callStage * 14 + callAnswers.length * 18).padStart(2, "0")}
          </span>
        </div>
        <p className="simulator-instruction">
          Complete the verification flow before asking claim questions. Obtain
          a call reference number and close the call professionally.
        </p>

        {callStage < openingExchanges.length ? (
          <div className="call-flow-prompt">
            <span>Payer representative</span>
            <p>{openingExchanges[callStage].rep}</p>
            <button type="button" onClick={onAdvanceCall}>
              Respond: “{openingExchanges[callStage].learner}”
            </button>
          </div>
        ) : (
          <>
            <div className="question-bank">
              {scenario.callQuestions.map((item, index) => (
                <button
                  type="button"
                  className={callAnswers.includes(index) ? "asked" : ""}
                  key={item.question}
                  disabled={callClosed}
                  onClick={() => onQuestion(index)}
                >
                  {callAnswers.includes(index) ? "✓" : "+"} {item.question}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="close-call-button"
              disabled={!canCloseCall || callClosed}
              onClick={onCloseCall}
            >
              {callClosed
                ? "Call closed ✓"
                : referenceAsked
                  ? "Confirm next step and close call"
                  : "Ask for a reference number before closing"}
            </button>
          </>
        )}

        <div className="call-transcript">
          {openingExchanges.slice(0, callStage).map((exchange, index) => (
            <div key={`opening-${index}`}>
              <span>Payer representative</span>
              <p>{exchange.rep}</p>
              <span>You</span>
              <p>{exchange.learner}</p>
            </div>
          ))}
          {callAnswers.map((index) => (
              <div key={index}>
                <span>You</span>
                <p>{scenario.callQuestions[index].question}</p>
                <span>Payer representative</span>
                <p>{scenario.callQuestions[index].answer}</p>
              </div>
            ))}
          {callClosed ? (
            <div>
              <span>You</span>
              <p>
                Thank you. I have documented the outcome, turnaround, and call
                reference. Have a good day.
              </p>
              <span>Payer representative</span>
              <p>Thank you for calling. Goodbye.</p>
            </div>
          ) : null}
          {!callStage && !callAnswers.length ? (
            <p className="transcript-empty">No payer questions asked yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReimbursementView({
  scenario,
  calculator,
  calculation,
  feedback,
  valid,
  onChange,
  onCalculate,
}: {
  scenario: ArScenario;
  calculator: CalculatorState;
  calculation: { allowed: number; payment: number; variance: number } | null;
  feedback: string;
  valid: boolean;
  onChange: (key: keyof CalculatorState, value: string) => void;
  onCalculate: () => void;
}) {
  const fields: { key: keyof CalculatorState; label: string; suffix?: string }[] = [
    { key: "billed", label: "Billed charges" },
    { key: "rate", label: "Case / fee schedule rate" },
    { key: "percent", label: "Percent of charge", suffix: "%" },
    { key: "patientResponsibility", label: "Patient responsibility" },
    { key: "otherInsurance", label: "Other insurance payment" },
    { key: "actualPayment", label: "Actual payer payment" },
  ];

  return (
    <div className="reimbursement-layout">
      <div className="calculator-panel">
        <span className="system-kicker">Built-in activity</span>
        <h3>Expected reimbursement calculator</h3>
        <p>
          Select the correct contract methodology and enter values found
          elsewhere in the account. The calculator will compute and validate the
          expected plan payment and variance.
        </p>
        <label>
          <span>Contract methodology</span>
          <select
            value={calculator.method}
            onChange={(event) => onChange("method", event.target.value)}
          >
            <option value="">Select methodology…</option>
            <option value="case-rate">Case rate</option>
            <option value="percent-charge">Percent of billed charges</option>
            <option value="fee-schedule">Fee schedule amount</option>
          </select>
        </label>
        <div className="calculator-grid">
          {fields.map((field) => (
            <label key={field.key}>
              <span>{field.label}</span>
              <div className="calculator-input">
                {!field.suffix ? <b>$</b> : null}
                <input
                  inputMode="decimal"
                  value={calculator[field.key]}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  placeholder="0.00"
                />
                {field.suffix ? <b>{field.suffix}</b> : null}
              </div>
            </label>
          ))}
        </div>
        <button type="button" className="system-primary-button" onClick={onCalculate}>
          Compute & validate reimbursement
        </button>
      </div>

      <div className="calculator-results">
        <span className={valid ? "release-state ready" : "release-state"}>
          {valid ? "Validated" : "Practice result"}
        </span>
        <h3>Reimbursement analysis</h3>
        <div className="formula-reference">
          <strong>Formula reference</strong>
          <span>Expected payment = expected allowed − patient responsibility − other insurance</span>
          <span>Variance = expected payment − actual payer payment</span>
        </div>
        <div className="calculated-values">
          <div>
            <span>Expected allowed</span>
            <strong>{calculation ? money(calculation.allowed) : "—"}</strong>
          </div>
          <div>
            <span>Expected payer payment</span>
            <strong>{calculation ? money(calculation.payment) : "—"}</strong>
          </div>
          <div className="variance">
            <span>Payment variance</span>
            <strong>{calculation ? money(calculation.variance) : "—"}</strong>
          </div>
        </div>
        <p className={valid ? "calculator-feedback valid" : "calculator-feedback"}>
          {feedback || "Enter the account evidence and calculate when ready."}
        </p>
        <small>
          Account reference: {scenario.claim.claimId} · DOS {scenario.patient.dos}
        </small>
      </div>
    </div>
  );
}

function ResolutionView({
  selectedAction,
  selectedRoute,
  decisionReason,
  feedback,
  valid,
  onAction,
  onRoute,
  onReason,
  onValidate,
}: {
  selectedAction: string;
  selectedRoute: string;
  decisionReason: string;
  feedback: string;
  valid: boolean;
  onAction: (value: string) => void;
  onRoute: (value: string) => void;
  onReason: (value: string) => void;
  onValidate: () => void;
}) {
  return (
    <div className="resolution-layout">
      <div className="resolution-decision">
        <span className="system-kicker">Resolution / action</span>
        <h3>What should happen next?</h3>
        <p>
          Choose the action supported by your findings. A financially convenient
          action is not necessarily a compliant action.
        </p>
        <div className="action-choice-grid">
          {resolutionActions.map((action, index) => (
            <button
              type="button"
              key={action.id}
              className={selectedAction === action.id ? "selected" : ""}
              onClick={() => onAction(action.id)}
            >
              <span>{String.fromCharCode(97 + index)}</span>
              {action.label}
            </button>
          ))}
        </div>
        <label>
          <span>Route / destination</span>
          <select
            value={selectedRoute}
            onChange={(event) => onRoute(event.target.value)}
          >
            <option value="">Choose the responsible destination…</option>
            {resolutionRoutes.map((route) => (
              <option value={route.id} key={route.id}>
                {route.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Decision rationale</span>
          <textarea
            value={decisionReason}
            onChange={(event) => onReason(event.target.value)}
            placeholder="Cite the account findings, payer evidence, amount, and deadline that support your action."
          />
        </label>
        <button type="button" className="system-primary-button" onClick={onValidate}>
          Commit decision for validation
        </button>
      </div>

      <aside className={valid ? "decision-validation valid" : "decision-validation"}>
        <span>{valid ? "✓" : "?"}</span>
        <h3>{valid ? "Decision supported" : "No answer revealed yet"}</h3>
        <p>
          {feedback ||
            "The simulator will validate the action and destination only after you commit your rationale."}
        </p>
      </aside>
    </div>
  );
}

function NotationView({
  notes,
  canPost,
  posted,
  closed,
  onChange,
  onPost,
  onClose,
}: {
  notes: {
    source: string;
    representative: string;
    reference: string;
    followUp: string;
    issue: string;
    findings: string;
    resolution: string;
  };
  canPost: boolean;
  posted: boolean;
  closed: boolean;
  onChange: (
    key:
      | "source"
      | "representative"
      | "reference"
      | "followUp"
      | "issue"
      | "findings"
      | "resolution",
    value: string,
  ) => void;
  onPost: () => void;
  onClose: () => void;
}) {
  return (
    <div className="notation-layout">
      <div className="notation-editor">
        <span className="system-kicker">Account notation</span>
        <h3>Document the issue, findings, and resolution</h3>
        <div className="notation-control-grid">
          <label>
            <span>Source of claim status</span>
            <select
              value={notes.source}
              onChange={(event) => onChange("source", event.target.value)}
            >
              <option value="">Choose source…</option>
              <option value="Payer portal and call">
                Payer portal and call
              </option>
              <option value="Payer portal">Payer portal</option>
              <option value="Payer call">Payer call</option>
              <option value="EOB / correspondence">EOB / correspondence</option>
            </select>
          </label>
          <label>
            <span>Representative name</span>
            <input
              value={notes.representative}
              onChange={(event) =>
                onChange("representative", event.target.value)
              }
              placeholder="Payer representative"
            />
          </label>
          <label>
            <span>Call / portal reference</span>
            <input
              value={notes.reference}
              onChange={(event) => onChange("reference", event.target.value)}
              placeholder="Reference number"
            />
          </label>
          <label>
            <span>Follow-up date / timeframe</span>
            <input
              value={notes.followUp}
              onChange={(event) => onChange("followUp", event.target.value)}
              placeholder="Date or payer turnaround"
            />
          </label>
        </div>
        {(
          [
            ["issue", "Issue", "Why is the account still open?"],
            [
              "findings",
              "Findings",
              "What did the account, documents, reimbursement calculation, and payer confirm?",
            ],
            [
              "resolution",
              "Resolution",
              "What action was taken, where was it routed, and when is follow-up due?",
            ],
          ] as const
        ).map(([key, label, placeholder]) => (
          <label key={key}>
            <span>{label}</span>
            <textarea
              value={notes[key]}
              onChange={(event) => onChange(key, event.target.value)}
              placeholder={placeholder}
            />
          </label>
        ))}
        <div className="notation-actions">
          <button
            type="button"
            className="system-secondary-button"
            disabled={!canPost || posted}
            onClick={onPost}
          >
            {posted ? "Note posted ✓" : "Post note in system"}
          </button>
          <button
            type="button"
            className="system-primary-button"
            disabled={!posted || closed}
            onClick={onClose}
          >
            {closed ? "Account completed ✓" : "Complete practice account"}
          </button>
        </div>
        {!canPost ? (
          <p className="notation-requirement">
            Complete the investigation, reimbursement validation, and resolution
            decision before posting the final note.
          </p>
        ) : null}
      </div>
      <aside className="note-quality-card">
        <span className="system-kicker">Notation standard</span>
        <h3>Could the next collector continue without rework?</h3>
        <ul>
          <li>Name the root issue, not only the open balance.</li>
          <li>Include payer reference, evidence, and financial variance.</li>
          <li>Record the action owner, destination, and follow-up date.</li>
          <li>Keep the note objective and free of unsupported assumptions.</li>
        </ul>
      </aside>
    </div>
  );
}
