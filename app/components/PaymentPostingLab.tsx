"use client";

import { Fragment, useMemo, useState } from "react";
import {
  postingScenarios,
  type PostingScenario,
} from "../data/exploration";
import type { TrainingModule } from "../data/training";

type PostingDeskTab =
  | "source"
  | "search"
  | "account"
  | "post"
  | "reconcile"
  | "glossary";
type SourceDocument = "era" | "bank" | "proof";

type PostingForm = {
  payment: string;
  contractual: string;
  deductible: string;
  coinsurance: string;
  copay: string;
  denial: string;
  denialCode: string;
  action: string;
};

type FieldFeedback = {
  label: string;
  ok: boolean;
  message: string;
};

const postingTabs: { id: PostingDeskTab; label: string; marker: string }[] = [
  { id: "source", label: "Source documents", marker: "01" },
  { id: "search", label: "Patient search", marker: "02" },
  { id: "account", label: "Account ledger", marker: "03" },
  { id: "post", label: "Post transaction", marker: "04" },
  { id: "reconcile", label: "Batch control", marker: "05" },
  { id: "glossary", label: "Terms & codes", marker: "06" },
];

const emptyPostingForm = (): PostingForm => ({
  payment: "",
  contractual: "",
  deductible: "",
  coinsurance: "",
  copay: "",
  denial: "",
  denialCode: "",
  action: "",
});

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

const numeric = (value: string) => {
  const result = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(result) ? result : Number.NaN;
};

const closeEnough = (left: number, right: number) =>
  Number.isFinite(left) && Math.abs(left - right) < 0.005;

export function PaymentPostingLab({
  module,
  scenarioIndex,
  onSelectScenario,
  onComplete,
}: {
  module: TrainingModule;
  scenarioIndex: number;
  onSelectScenario: (index: number) => void;
  onComplete: (scenario: string, score: number) => void;
}) {
  const scenario = postingScenarios[scenarioIndex];
  const [tab, setTab] = useState<PostingDeskTab>("source");
  const [document, setDocument] = useState<SourceDocument>("era");
  const [viewedDocuments, setViewedDocuments] = useState<SourceDocument[]>([
    "era",
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searched, setSearched] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedEncounterId, setSelectedEncounterId] = useState("");
  const [form, setForm] = useState<PostingForm>(emptyPostingForm());
  const [feedback, setFeedback] = useState<FieldFeedback[]>([]);
  const [postingValid, setPostingValid] = useState(false);
  const [batchTotal, setBatchTotal] = useState("");
  const [varianceReason, setVarianceReason] = useState("");
  const [reconcileFeedback, setReconcileFeedback] = useState("");
  const [reconcileValid, setReconcileValid] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [closed, setClosed] = useState(false);

  const selectedAccount = scenario.accounts.find(
    (account) => account.id === selectedAccountId,
  );
  const selectedEncounter = selectedAccount?.encounters.find(
    (encounter) => encounter.id === selectedEncounterId,
  );

  const postingTotal = useMemo(
    () =>
      [
        form.payment,
        form.contractual,
        form.deductible,
        form.coinsurance,
        form.copay,
      ].reduce((sum, value) => {
        const parsed = numeric(value);
        return sum + (Number.isFinite(parsed) ? parsed : 0);
      }, 0),
    [form],
  );

  const milestones = [
    {
      label: "Review source evidence",
      done: viewedDocuments.includes("era") && viewedDocuments.includes("bank"),
    },
    { label: "Locate the patient account", done: Boolean(selectedAccountId) },
    {
      label: "Verify DOS, service, and billed charge",
      done: Boolean(selectedEncounterId),
    },
    { label: "Submit a posting decision", done: postingValid },
    { label: "Reconcile the batch", done: reconcileValid },
  ];

  const openDocument = (next: SourceDocument) => {
    setDocument(next);
    setViewedDocuments((current) =>
      current.includes(next) ? current : [...current, next],
    );
  };

  const openTab = (next: PostingDeskTab) => {
    setTab(next);
    setFeedback([]);
    setReconcileFeedback("");
  };

  const chooseAccount = (accountId: string) => {
    setSelectedAccountId(accountId);
    setSelectedEncounterId("");
    setPostingValid(false);
    setFeedback([]);
  };

  const validatePosting = () => {
    setAttempts((count) => count + 1);
    const expected = scenario.expected;
    const reversalToAr = expected.action === "reverse-to-ar";
    const checks: FieldFeedback[] = [
      {
        label: "Patient account",
        ok: selectedAccountId === expected.accountId,
        message:
          selectedAccountId === expected.accountId
            ? "Patient control, member ID, and name align."
            : "The selected account does not fully match the remittance identifiers.",
      },
      {
        label: "Encounter / DOS",
        ok: selectedEncounterId === expected.encounterId,
        message:
          selectedEncounterId === expected.encounterId
            ? "DOS, service, charge, and payer claim ID align."
            : "Recheck the DOS, service, billed charge, and payer claim ID.",
      },
      {
        label: "Insurance payment",
        ok: closeEnough(numeric(form.payment), expected.payment),
        message: closeEnough(numeric(form.payment), expected.payment)
          ? "Payment amount matches the claim service line."
          : "The payment does not match the CLP/SVC amount.",
      },
      {
        label: "Contractual adjustment",
        ok: closeEnough(numeric(form.contractual), expected.contractual),
        message: closeEnough(numeric(form.contractual), expected.contractual)
          ? "Contractual adjustment is supported."
          : "Recheck the adjustment group, reason, and service-line equation.",
      },
      {
        label: "Patient responsibility",
        ok:
          closeEnough(numeric(form.deductible), expected.deductible) &&
          closeEnough(numeric(form.coinsurance), expected.coinsurance) &&
          closeEnough(numeric(form.copay), expected.copay),
        message:
          closeEnough(numeric(form.deductible), expected.deductible) &&
          closeEnough(numeric(form.coinsurance), expected.coinsurance) &&
          closeEnough(numeric(form.copay), expected.copay)
            ? "Patient-responsibility categories are correct."
            : "Separate deductible, coinsurance, and copay using the PR reason codes.",
      },
      {
        label: reversalToAr ? "Reversal reason" : "Denial / reversal",
        ok:
          closeEnough(numeric(form.denial), expected.denial) &&
          form.denialCode.trim().toUpperCase() === expected.denialCode,
        message:
          closeEnough(numeric(form.denial), expected.denial) &&
          form.denialCode.trim().toUpperCase() === expected.denialCode
            ? reversalToAr
              ? "Payer reason captured without creating a patient-liability amount."
              : "Denial and reversal treatment is correct."
            : reversalToAr
              ? "Record the payer reason, but do not add a denial or patient-responsibility amount."
              : "Recheck the reversal amount and CARC group/reason code.",
      },
      {
        label: "Posting action",
        ok: form.action === expected.action,
        message:
          form.action === expected.action
            ? reversalToAr
              ? "The negative payment restores insurance AR for follow-up."
              : "The transaction path is appropriate."
            : "The selected action does not fit the remittance evidence.",
      },
    ];
    setFeedback(checks);
    setPostingValid(checks.every((check) => check.ok));
  };

  const validateReconciliation = () => {
    setAttempts((count) => count + 1);
    const totalOk = closeEnough(
      numeric(batchTotal),
      scenario.expected.batchTotal,
    );
    const reasonOk = varianceReason === scenario.expected.varianceReason;
    setReconcileValid(totalOk && reasonOk);
    if (totalOk && reasonOk) {
      setReconcileFeedback(
        "Balanced. The bank total, 835 total, and the documented exception are fully accounted for.",
      );
    } else if (!totalOk && !reasonOk) {
      setReconcileFeedback(
        "The controlled total and exception treatment both need review.",
      );
    } else if (!totalOk) {
      setReconcileFeedback(
        "The exception is classified correctly, but the controlled batch total is not balanced.",
      );
    } else {
      setReconcileFeedback(
        "The total balances, but the difference is not routed to the correct exception type.",
      );
    }
  };

  const closeBatch = () => {
    if (!postingValid || !reconcileValid || closed) return;
    const score = Math.max(72, 100 - Math.max(0, attempts - 2) * 4);
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
      <ExplorationHeader
        eyebrow="Payment posting workstation"
        title="Post from evidence, not from hints."
        description="Read the raw payment evidence, find the correct account and DOS, then make the posting and reconciliation decisions yourself."
        metric="Simulation mode"
      />

      <ScenarioRail
        scenarios={postingScenarios}
        selected={scenarioIndex}
        onSelect={onSelectScenario}
      />

      <section className="system-frame">
        <header className="system-titlebar">
          <div className="system-brand">
            <span className="system-logo">PM</span>
            <div>
              <strong>Payment Management</strong>
              <small>Batch {scenario.id} · Training tenant</small>
            </div>
          </div>
          <div className="system-title-meta">
            <span>{scenario.status}</span>
            <strong>{scenario.amount}</strong>
          </div>
        </header>

        <div className="system-body">
          <aside className="system-nav">
            <div className="system-nav-label">Workspace</div>
            {postingTabs.map((item) => (
              <button
                type="button"
                className={
                  tab === item.id
                    ? "system-nav-item system-nav-item-active"
                    : "system-nav-item"
                }
                key={item.id}
                onClick={() => openTab(item.id)}
              >
                <span>{item.marker}</span>
                {item.label}
                {milestones[postingTabs.indexOf(item)]?.done ? (
                  <b aria-label="Completed">✓</b>
                ) : null}
              </button>
            ))}
            <div className="practice-progress">
              <div>
                <span>Case progress</span>
                <strong>
                  {milestones.filter((item) => item.done).length}/5
                </strong>
              </div>
              <div className="practice-progress-track">
                <span
                  style={{
                    width: `${
                      (milestones.filter((item) => item.done).length / 5) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          </aside>

          <div className="system-workarea">
            <div className="system-context">
              <div>
                <span className="system-kicker">{scenario.id}</span>
                <h2>{scenario.title}</h2>
                <p>{scenario.objective}</p>
              </div>
              <span className="difficulty-chip">
                {scenario.priority} · independent
              </span>
            </div>

            {tab === "source" ? (
              <SourceDesk
                scenario={scenario}
                document={document}
                onOpenDocument={openDocument}
              />
            ) : null}
            {tab === "search" ? (
              <AccountSearch
                scenario={scenario}
                searchTerm={searchTerm}
                searched={searched}
                selectedAccountId={selectedAccountId}
                onSearchTerm={setSearchTerm}
                onSearch={() => {
                  setSearched(true);
                  setSelectedAccountId("");
                  setSelectedEncounterId("");
                }}
                onChoose={chooseAccount}
                onOpen={() => setTab("account")}
              />
            ) : null}
            {tab === "account" ? (
              <AccountLedger
                scenario={scenario}
                selectedAccount={selectedAccount}
                selectedEncounterId={selectedEncounterId}
                onSelectEncounter={setSelectedEncounterId}
                onGoToSearch={() => setTab("search")}
                onPost={() => setTab("post")}
              />
            ) : null}
            {tab === "post" ? (
              <PostTransaction
                scenario={scenario}
                selectedAccount={selectedAccount}
                selectedEncounter={selectedEncounter}
                form={form}
                feedback={feedback}
                postingTotal={postingTotal}
                onChange={(key, value) =>
                  setForm((current) => ({ ...current, [key]: value }))
                }
                onValidate={validatePosting}
                onGoToAccount={() => setTab("account")}
              />
            ) : null}
            {tab === "reconcile" ? (
              <ReconciliationDesk
                scenario={scenario}
                batchTotal={batchTotal}
                varianceReason={varianceReason}
                feedback={reconcileFeedback}
                valid={reconcileValid}
                postingValid={postingValid}
                closed={closed}
                onBatchTotal={setBatchTotal}
                onVarianceReason={setVarianceReason}
                onValidate={validateReconciliation}
                onClose={closeBatch}
              />
            ) : null}
            {tab === "glossary" ? <PostingGlossary /> : null}
          </div>

          <aside className="independent-rail">
            <span className="system-kicker">Learner control</span>
            <h3>Investigation trail</h3>
            <p>
              These checkpoints track activity. They do not confirm that your
              decision is correct.
            </p>
            <div className="milestone-list">
              {milestones.map((item, index) => (
                <div className={item.done ? "milestone done" : "milestone"} key={item.label}>
                  <span>{item.done ? "✓" : index + 1}</span>
                  <strong>{item.label}</strong>
                </div>
              ))}
            </div>
            <div className="no-hint-card">
              <span>Independent mode</span>
              <p>
                Validation becomes available after you submit. Use the evidence
                in the system, not the checklist, to decide.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function ExplorationHeader({
  eyebrow,
  title,
  description,
  metric,
}: {
  eyebrow: string;
  title: string;
  description: string;
  metric: string;
}) {
  return (
    <section className="exploration-header">
      <div>
        <span className="section-kicker">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <span className="mode-chip">{metric}</span>
    </section>
  );
}

function ScenarioRail({
  scenarios,
  selected,
  onSelect,
}: {
  scenarios: Pick<
    PostingScenario,
    "id" | "title" | "subtitle" | "priority" | "status"
  >[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <section className="scenario-rail exploration-scenarios" aria-label="Posting scenarios">
      {scenarios.map((item, index) => (
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
            {item.status}
          </span>
        </button>
      ))}
    </section>
  );
}

function SourceDesk({
  scenario,
  document,
  onOpenDocument,
}: {
  scenario: PostingScenario;
  document: SourceDocument;
  onOpenDocument: (document: SourceDocument) => void;
}) {
  const claimTotals = scenario.era.serviceLines.reduce(
    (totals, line) => ({
      billed: totals.billed + line.billed,
      allowed: totals.allowed + line.allowed,
      priorPaid: totals.priorPaid + line.priorPayerPaid,
      paid: totals.paid + line.paid,
      patient: totals.patient + line.patientResponsibility,
      contractual:
        totals.contractual +
        line.adjustments
          .filter((adjustment) => adjustment.group === "CO")
          .reduce((sum, adjustment) => sum + adjustment.amount, 0),
    }),
    {
      billed: 0,
      allowed: 0,
      priorPaid: 0,
      paid: 0,
      patient: 0,
      contractual: 0,
    },
  );

  return (
    <div className="source-desk">
      <div className="document-switcher" role="tablist" aria-label="Payment source documents">
        {[
          ["era", "ERA / 835"],
          ["bank", "Bank report"],
          ["proof", "Supporting proof"],
        ].map(([id, label]) => (
          <button
            type="button"
            role="tab"
            aria-selected={document === id}
            className={document === id ? "document-tab active" : "document-tab"}
            key={id}
            onClick={() => onOpenDocument(id as SourceDocument)}
          >
            <span>{id === "era" ? "835" : id === "bank" ? "EFT" : "DOC"}</span>
            {label}
          </button>
        ))}
      </div>

      {document === "era" ? (
        <div className="document-paper era-paper">
          <div className="era-form-banner">
            <div>
              <span>HIPAA 835 · Electronic Remittance Advice</span>
              <h3>Provider Remittance Detail</h3>
            </div>
            <div>
              <span>Payment amount (BPR)</span>
              <strong>{money(scenario.era.eraTotal)}</strong>
            </div>
          </div>

          <div className="era-party-grid">
            <div>
              <span>Payer</span>
              <strong>{scenario.era.payer}</strong>
              <small>Claim payment / remittance issuer</small>
            </div>
            <div>
              <span>Payee</span>
              <strong>{scenario.era.payee}</strong>
              <small>Rendering / billing entity</small>
            </div>
          </div>

          <div className="document-meta-grid era-control-grid">
            <DocumentMeta label="TRN trace number" value={scenario.era.trace} />
            <DocumentMeta label="Remittance date" value={scenario.era.eraDate} />
            <DocumentMeta label="Transaction type" value="ACH / CCD+" />
            <DocumentMeta label="Version" value="005010X221A1" />
          </div>

          <div className="era-claim-header">
            <div>
              <span>Claim payment information (CLP)</span>
              <strong>{scenario.era.patient}</strong>
              <small>Member {scenario.era.memberId}</small>
            </div>
            <div>
              <span>Patient control number</span>
              <strong>{scenario.era.patientControl}</strong>
            </div>
            <div>
              <span>Payer claim control</span>
              <strong>{scenario.era.payerClaim}</strong>
            </div>
            <div>
              <span>Claim status</span>
              <strong>
                {scenario.id === "PP-2407"
                  ? "22 · Reversal of previous payment"
                  : scenario.id === "PP-2412"
                    ? "2 · Processed as secondary"
                    : "1 · Processed as primary"}
              </strong>
            </div>
          </div>

          <div className="system-table-wrap">
            <table className="system-table era-service-table">
              <thead>
                <tr>
                  <th>Line</th>
                  <th>DOS</th>
                  <th>Procedure</th>
                  <th>Units</th>
                  <th>Charge</th>
                  <th>Allowed</th>
                  <th>Prior paid</th>
                  <th>Line payment</th>
                  <th>Patient resp.</th>
                </tr>
              </thead>
              <tbody>
                {scenario.era.serviceLines.map((line, index) => (
                  <Fragment key={`${line.dos}-${line.cpt}`}>
                    <tr className="era-service-row">
                      <td>{String(index + 1).padStart(2, "0")}</td>
                      <td>{line.dos}</td>
                      <td>
                        <strong>{line.cpt}</strong>
                        {line.modifier ? <small> Mod {line.modifier}</small> : null}
                      </td>
                      <td>{line.units}</td>
                      <td>{money(line.billed)}</td>
                      <td>{money(line.allowed)}</td>
                      <td>{money(line.priorPayerPaid)}</td>
                      <td>{money(line.paid)}</td>
                      <td>{money(line.patientResponsibility)}</td>
                    </tr>
                    <tr className="era-adjustment-row">
                      <td aria-hidden="true" />
                      <td colSpan={8}>
                        <span>CAS adjustments</span>
                        <div>
                          {line.adjustments.map((adjustment) => (
                            <span
                              className={`era-cas-tag era-cas-${adjustment.group.toLowerCase()}`}
                              key={`${adjustment.group}-${adjustment.reason}-${adjustment.amount}`}
                            >
                              <strong>
                                {adjustment.group}-{adjustment.reason}
                              </strong>
                              {money(adjustment.amount)} · {adjustment.description}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={4}>Claim totals</th>
                  <th>{money(claimTotals.billed)}</th>
                  <th>{money(claimTotals.allowed)}</th>
                  <th>{money(claimTotals.priorPaid)}</th>
                  <th>{money(claimTotals.paid)}</th>
                  <th>{money(claimTotals.patient)}</th>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="era-claim-summary">
            <div>
              <span>Total claim charge</span>
              <strong>{money(claimTotals.billed)}</strong>
              <small>CLP03</small>
            </div>
            <div>
              <span>Claim payment</span>
              <strong>{money(claimTotals.paid)}</strong>
              <small>CLP04</small>
            </div>
            <div>
              <span>Contractual (CO)</span>
              <strong>{money(claimTotals.contractual)}</strong>
              <small>CAS group CO</small>
            </div>
            <div>
              <span>Patient responsibility</span>
              <strong>{money(claimTotals.patient)}</strong>
              <small>CLP05 / CAS group PR</small>
            </div>
          </div>

          <div className="remark-block">
            <span>Claim and provider-level remarks</span>
            {scenario.era.remarks.map((remark) => (
              <p key={remark}>{remark}</p>
            ))}
          </div>
        </div>
      ) : null}

      {document === "bank" ? (
        <div className="document-paper bank-paper">
          <div className="bank-banner">
            <span>Daily ACH receipt</span>
            <strong>{scenario.bank.status}</strong>
          </div>
          <div className="bank-amount">{money(scenario.bank.deposit)}</div>
          <div className="document-meta-grid bank-grid">
            <DocumentMeta label="Effective date" value={scenario.bank.effectiveDate} />
            <DocumentMeta label="Originator" value={scenario.bank.originator} />
            <DocumentMeta label="ACH trace" value={scenario.bank.trace} />
            <DocumentMeta label="Deposit account" value={scenario.bank.accountEnding} />
          </div>
          <div className="bank-control-note">
            <span>Control note</span>
            <p>
              Match the bank trace and amount to the 835. Any difference must
              be classified before the batch is released.
            </p>
          </div>
        </div>
      ) : null}

      {document === "proof" ? (
        <div className="proof-grid">
          {scenario.proof.map((item) => (
            <article className="proof-card" key={item.reference}>
              <span className="proof-type">Supporting record</span>
              <h3>{item.label}</h3>
              <strong>{money(item.amount)}</strong>
              <dl>
                <dt>Reference</dt>
                <dd>{item.reference}</dd>
                <dt>Detail</dt>
                <dd>{item.detail}</dd>
              </dl>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DocumentMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AccountSearch({
  scenario,
  searchTerm,
  searched,
  selectedAccountId,
  onSearchTerm,
  onSearch,
  onChoose,
  onOpen,
}: {
  scenario: PostingScenario;
  searchTerm: string;
  searched: boolean;
  selectedAccountId: string;
  onSearchTerm: (value: string) => void;
  onSearch: () => void;
  onChoose: (accountId: string) => void;
  onOpen: () => void;
}) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const matchingAccounts = normalizedSearch
    ? scenario.accounts.filter((account) =>
        [
          account.id,
          account.patient,
          account.dob,
          account.memberId,
          account.address,
          ...account.encounters.flatMap((encounter) => [
            encounter.id,
            encounter.dos,
            encounter.service,
            encounter.cpt,
            encounter.claimId,
          ]),
        ].some((value) => {
          const normalizedValue = value.toLowerCase();
          return (
            normalizedValue.includes(normalizedSearch) ||
            (normalizedSearch.length >= 6 &&
              normalizedSearch.includes(normalizedValue))
          );
        }),
      )
    : [];

  return (
    <div className="search-workspace">
      <div className="system-section-heading">
        <div>
          <span className="system-kicker">Enterprise patient search</span>
          <h3>Locate an account</h3>
          <p>Search by any identifiers available in the source documentation.</p>
        </div>
      </div>
      <form
        className="patient-search-bar"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <label htmlFor="patient-search">Patient, account, member, or claim ID</label>
        <div>
          <input
            id="patient-search"
            value={searchTerm}
            onChange={(event) => onSearchTerm(event.target.value)}
            placeholder="Enter search criteria"
          />
          <button type="submit" disabled={searchTerm.trim().length < 2}>
            Search accounts
          </button>
        </div>
      </form>

      {searched ? (
        matchingAccounts.length ? (
          <div className="search-results">
            <div className="results-heading">
              <span>
                {matchingAccounts.length}{" "}
                {matchingAccounts.length === 1 ? "match" : "possible matches"}
              </span>
              <small>Confirm multiple identifiers before opening an account.</small>
            </div>
            {matchingAccounts.map((account) => (
              <button
                type="button"
                key={account.id}
                className={
                  selectedAccountId === account.id
                    ? "account-result selected"
                    : "account-result"
                }
                onClick={() => onChoose(account.id)}
              >
                <span className="account-result-avatar">
                  {account.patient
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </span>
                <span>
                  <strong>{account.patient}</strong>
                  <small>
                    {account.id} · DOB {account.dob}
                  </small>
                </span>
                <span>
                  <small>Member ID</small>
                  <strong>{account.memberId}</strong>
                </span>
                <span>
                  <small>Open balance</small>
                  <strong>{money(account.balance)}</strong>
                </span>
              </button>
            ))}
            <button
              type="button"
              className="system-primary-button"
              disabled={
                !selectedAccountId ||
                !matchingAccounts.some(
                  (account) => account.id === selectedAccountId,
                )
              }
              onClick={onOpen}
            >
              Open selected account <span>→</span>
            </button>
          </div>
        ) : (
          <div className="system-empty-state search-not-found">
            <span>404</span>
            <strong>Not found</strong>
            <p>
              No account matches “{searchTerm}”. Check the remittance
              identifiers and try again.
            </p>
          </div>
        )
      ) : (
        <div className="system-empty-state">
          <span>⌕</span>
          <strong>No search submitted</strong>
          <p>Use the ERA identifiers to begin.</p>
        </div>
      )}
    </div>
  );
}

function AccountLedger({
  scenario,
  selectedAccount,
  selectedEncounterId,
  onSelectEncounter,
  onGoToSearch,
  onPost,
}: {
  scenario: PostingScenario;
  selectedAccount: PostingScenario["accounts"][number] | undefined;
  selectedEncounterId: string;
  onSelectEncounter: (id: string) => void;
  onGoToSearch: () => void;
  onPost: () => void;
}) {
  if (!selectedAccount) {
    return (
      <div className="system-empty-state tall">
        <span>AC</span>
        <strong>No account is open</strong>
        <p>Locate and select a patient account first.</p>
        <button type="button" onClick={onGoToSearch}>
          Go to patient search
        </button>
      </div>
    );
  }

  return (
    <div className="ledger-workspace">
      <div className="patient-banner">
        <span className="account-result-avatar">
          {selectedAccount.patient
            .split(" ")
            .map((part) => part[0])
            .join("")}
        </span>
        <div>
          <span className="system-kicker">{selectedAccount.id}</span>
          <h3>{selectedAccount.patient}</h3>
          <p>
            DOB {selectedAccount.dob} · {selectedAccount.memberId} ·{" "}
            {selectedAccount.address}
          </p>
        </div>
        <div>
          <span>Account balance</span>
          <strong>{money(selectedAccount.balance)}</strong>
        </div>
      </div>

      {selectedAccount.balance === 0 ? (
        <div className="zero-balance-notice">
          <span>Previously settled account</span>
          <p>
            A zero balance can be the correct match for a negative remittance.
            Verify the original transaction, DOS, service, and claim ID before
            posting a reversal.
          </p>
        </div>
      ) : null}

      <div className="system-section-heading compact-system-heading">
        <div>
          <span className="system-kicker">Encounter ledger</span>
          <h3>Select the service to post</h3>
        </div>
        <small>Compare DOS, service, charge, and claim ID.</small>
      </div>

      <div className="encounter-list">
        {selectedAccount.encounters.map((encounter) => (
          <button
            type="button"
            key={encounter.id}
            className={
              selectedEncounterId === encounter.id
                ? "encounter-row selected"
                : "encounter-row"
            }
            onClick={() => onSelectEncounter(encounter.id)}
          >
            <span className="encounter-radio">
              {selectedEncounterId === encounter.id ? "●" : "○"}
            </span>
            <span>
              <small>DOS</small>
              <strong>{encounter.dos}</strong>
            </span>
            <span className="encounter-service">
              <small>Service / CPT</small>
              <strong>
                {encounter.service} · {encounter.cpt}
              </strong>
            </span>
            <span>
              <small>Billed</small>
              <strong>{money(encounter.billed)}</strong>
            </span>
            <span>
              <small>Open</small>
              <strong>{money(encounter.openBalance)}</strong>
            </span>
            <span>
              <small>Claim ID</small>
              <strong>{encounter.claimId}</strong>
            </span>
          </button>
        ))}
      </div>
      <div className="system-action-row">
        <span>Source record: {scenario.era.payer}</span>
        <button
          type="button"
          className="system-primary-button"
          disabled={!selectedEncounterId}
          onClick={onPost}
        >
          Continue to posting <span>→</span>
        </button>
      </div>
    </div>
  );
}

function PostTransaction({
  scenario,
  selectedAccount,
  selectedEncounter,
  form,
  feedback,
  postingTotal,
  onChange,
  onValidate,
  onGoToAccount,
}: {
  scenario: PostingScenario;
  selectedAccount: PostingScenario["accounts"][number] | undefined;
  selectedEncounter:
    | PostingScenario["accounts"][number]["encounters"][number]
    | undefined;
  form: PostingForm;
  feedback: FieldFeedback[];
  postingTotal: number;
  onChange: (key: keyof PostingForm, value: string) => void;
  onValidate: () => void;
  onGoToAccount: () => void;
}) {
  if (!selectedAccount || !selectedEncounter) {
    return (
      <div className="system-empty-state tall">
        <span>TX</span>
        <strong>No encounter selected</strong>
        <p>Select the account and exact DOS before posting.</p>
        <button type="button" onClick={onGoToAccount}>
          Return to account ledger
        </button>
      </div>
    );
  }

  const fields: { key: keyof PostingForm; label: string }[] = [
    { key: "payment", label: "Insurance payment" },
    { key: "contractual", label: "Contractual adjustment" },
    { key: "deductible", label: "Deductible" },
    { key: "coinsurance", label: "Coinsurance" },
    { key: "copay", label: "Copay" },
    {
      key: "denial",
      label:
        scenario.expected.action === "reverse-to-ar"
          ? "Additional denial amount (if any)"
          : "Denial / reversal amount",
    },
  ];
  const postingApproved =
    feedback.length > 0 && feedback.every((item) => item.ok);

  return (
    <div className="posting-entry">
      <div className="posting-context-strip">
        <div>
          <span>Patient / account</span>
          <strong>
            {selectedAccount.patient} · {selectedAccount.id}
          </strong>
        </div>
        <div>
          <span>DOS / service</span>
          <strong>
            {selectedEncounter.dos} · {selectedEncounter.cpt}
          </strong>
        </div>
        <div>
          <span>Billed charge</span>
          <strong>{money(selectedEncounter.billed)}</strong>
        </div>
      </div>

      <div className="entry-layout">
        <div className="entry-form-card">
          <div className="system-section-heading compact-system-heading">
            <div>
              <span className="system-kicker">Transaction entry</span>
              <h3>Post the remittance</h3>
            </div>
            <span className="entry-control-total">
              Entered allocation <strong>{money(postingTotal)}</strong>
            </span>
          </div>
          <div className="posting-fields">
            {fields.map((field) => (
              <label key={field.key}>
                <span>{field.label}</span>
                <div className="currency-input">
                  <span>$</span>
                  <input
                    inputMode="decimal"
                    value={form[field.key]}
                    onChange={(event) => onChange(field.key, event.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </label>
            ))}
            <label>
              <span>CARC group / reason</span>
              <input
                value={form.denialCode}
                onChange={(event) => onChange("denialCode", event.target.value)}
                placeholder="Example: CO-18"
              />
            </label>
            <label>
              <span>Posting action</span>
              <select
                value={form.action}
                onChange={(event) => onChange("action", event.target.value)}
              >
                <option value="">Choose an action…</option>
                <option value="standard-posting">Post payment and adjustments</option>
                <option value="reverse-to-ar">
                  Reverse payment and return balance to insurance AR
                </option>
                <option value="hold-unapplied">Hold funds to unapplied research</option>
                <option value="write-off">Post administrative write-off</option>
                <option value="patient-transfer">Transfer full balance to patient</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            className="system-primary-button full-system-button"
            onClick={onValidate}
          >
            Submit posting for validation <span>↗</span>
          </button>
        </div>

        <div className="validation-panel">
          <span className="system-kicker">Validation results</span>
          <h3>{feedback.length ? "Decision review" : "Awaiting submission"}</h3>
          {!feedback.length ? (
            <p>
              The system will validate account matching, service allocation,
              adjustment handling, patient responsibility, and transaction path
              after you submit.
            </p>
          ) : (
            <div className="feedback-list">
              {feedback.map((item) => (
                <div className={item.ok ? "feedback-item ok" : "feedback-item"} key={item.label}>
                  <span>{item.ok ? "✓" : "!"}</span>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {postingApproved && scenario.expected.action === "reverse-to-ar" ? (
        <div className="posting-outcome-card">
          <span>Projected account outcome</span>
          <div>
            <strong>$1,275.00 restored to insurance AR</strong>
            <p>
              The account leaves its prior $0.00 status and routes to the AR
              team for payer follow-up. Patient responsibility remains $0.00.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PostingGlossary() {
  const groups = [
    {
      title: "Payment files & control",
      terms: [
        {
          term: "ERA / 835",
          definition:
            "Electronic Remittance Advice. The HIPAA 835 file explains how a payer adjudicated claims and supports an EFT or check.",
        },
        {
          term: "EFT",
          definition:
            "Electronic Funds Transfer. The actual movement of payer money into or out of the provider bank account.",
        },
        {
          term: "TRN trace",
          definition:
            "The payment trace used to connect the bank transaction to the ERA. Amount, payer, date, and trace should align.",
        },
        {
          term: "BPR",
          definition:
            "The 835 payment segment containing the total payment amount and payment method information.",
        },
        {
          term: "PLB",
          definition:
            "Provider-Level Balance adjustment. An amount outside a specific claim, such as interest, recoupment, or other provider-level activity.",
        },
        {
          term: "Batch control",
          definition:
            "The comparison of the posting total, ERA total, bank amount, and documented exceptions before the batch is released.",
        },
      ],
    },
    {
      title: "Claim & service detail",
      terms: [
        {
          term: "CLP",
          definition:
            "The claim payment loop in an 835. It identifies the patient control number, claim status, charge, payment, and patient responsibility.",
        },
        {
          term: "SVC",
          definition:
            "The service payment loop. It shows adjudication for an individual procedure or revenue-code line.",
        },
        {
          term: "CAS",
          definition:
            "Claim Adjustment segment. It reports the adjustment group, reason code, and amount at claim or service level.",
        },
        {
          term: "CARC",
          definition:
            "Claim Adjustment Reason Code. The numeric reason explaining why an amount was reduced, denied, or assigned.",
        },
        {
          term: "RARC",
          definition:
            "Remittance Advice Remark Code. Extra information that clarifies a CARC or payer decision.",
        },
        {
          term: "Allowed amount",
          definition:
            "The amount recognized under payer processing or contract terms before plan payment and patient responsibility are allocated.",
        },
      ],
    },
    {
      title: "Adjustment groups & liability",
      terms: [
        {
          term: "CO",
          definition:
            "Contractual obligation. The provider is generally responsible under contract; it is not automatically billable to the patient.",
        },
        {
          term: "PR",
          definition:
            "Patient responsibility. Amount assigned to the patient, such as deductible, coinsurance, or copay, subject to billing rules.",
        },
        {
          term: "OA",
          definition:
            "Other adjustment. Used when the amount does not fit contractual, patient, or payer-initiated responsibility groups.",
        },
        {
          term: "PI",
          definition:
            "Payer-initiated reduction. The payer assigns the adjustment, but the correct follow-up depends on contract and remittance details.",
        },
        {
          term: "Deductible",
          definition:
            "The amount a member must pay for covered services before the plan begins paying under the benefit design.",
        },
        {
          term: "Coinsurance / copay",
          definition:
            "Coinsurance is usually a percentage of allowed charges; a copay is usually a fixed amount for a service.",
        },
      ],
    },
    {
      title: "Exceptions & negative payments",
      terms: [
        {
          term: "Reversal",
          definition:
            "A negative transaction that unwinds a previously posted payer payment. The matching account may correctly be at $0 before posting; the reversal restores insurance AR.",
        },
        {
          term: "Recoupment / takeback",
          definition:
            "The payer actually recovers money, often by offsetting a current EFT or using a PLB. The cash-side takeback must reconcile to the reversal.",
        },
        {
          term: "Insurance AR",
          definition:
            "The balance assigned to payer follow-up. A reversal should route here for AR review unless separate evidence supports patient liability.",
        },
        {
          term: "Unapplied cash",
          definition:
            "Funds received but not safely matched to an account or claim. Hold and research rather than forcing a patient posting.",
        },
        {
          term: "Zero-pay remit",
          definition:
            "An ERA with no payer payment. It can still carry denial, adjustment, or patient-responsibility information that requires review.",
        },
        {
          term: "Reconciliation variance",
          definition:
            "A difference between bank, ERA, and posting totals that must be supported and routed before batch close.",
        },
      ],
    },
  ];

  return (
    <div className="glossary-workspace">
      <div className="system-section-heading">
        <div>
          <span className="system-kicker">Payment posting reference</span>
          <h3>Terms, segments, and adjustment groups</h3>
          <p>
            Use this reference when the source documents contain unfamiliar
            language. Definitions explain the term without solving the case.
          </p>
        </div>
      </div>

      <div className="glossary-callout">
        <span>Reversal ≠ patient transfer</span>
        <p>
          A reversal removes a prior payer payment and normally restores the
          amount to insurance AR. A recoupment is the related recovery of cash.
          Patient liability requires separate support.
        </p>
      </div>

      <div className="glossary-grid">
        {groups.map((group) => (
          <section className="glossary-group" key={group.title}>
            <h4>{group.title}</h4>
            <dl>
              {group.terms.map((item) => (
                <div key={item.term}>
                  <dt>{item.term}</dt>
                  <dd>{item.definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}

function ReconciliationDesk({
  scenario,
  batchTotal,
  varianceReason,
  feedback,
  valid,
  postingValid,
  closed,
  onBatchTotal,
  onVarianceReason,
  onValidate,
  onClose,
}: {
  scenario: PostingScenario;
  batchTotal: string;
  varianceReason: string;
  feedback: string;
  valid: boolean;
  postingValid: boolean;
  closed: boolean;
  onBatchTotal: (value: string) => void;
  onVarianceReason: (value: string) => void;
  onValidate: () => void;
  onClose: () => void;
}) {
  return (
    <div className="reconciliation-layout">
      <div className="batch-control-card">
        <span className="system-kicker">Batch control</span>
        <h3>Reconcile the remittance to the bank</h3>
        <p>
          Enter the controlled batch total and classify any difference. Do not
          force the 835 total to equal the bank when a supported exception exists.
        </p>
        <div className="control-source-grid">
          <div>
            <span>835 / ERA total</span>
            <strong>{money(scenario.era.eraTotal)}</strong>
          </div>
          <div>
            <span>Bank deposit</span>
            <strong>{money(scenario.bank.deposit)}</strong>
          </div>
          <div>
            <span>Calculated difference</span>
            <strong>{money(scenario.bank.deposit - scenario.era.eraTotal)}</strong>
          </div>
        </div>
        <label>
          <span>Controlled batch total</span>
          <div className="currency-input">
            <span>$</span>
            <input
              inputMode="decimal"
              value={batchTotal}
              onChange={(event) => onBatchTotal(event.target.value)}
              placeholder="0.00"
            />
          </div>
        </label>
        <label>
          <span>Difference treatment</span>
          <select
            value={varianceReason}
            onChange={(event) => onVarianceReason(event.target.value)}
          >
            <option value="">Choose treatment…</option>
            <option value="interest-plb">Provider-level interest adjustment</option>
            <option value="recoupment">Payer recoupment / offset</option>
            <option value="unmatched-held">Unmatched funds held to unapplied</option>
            <option value="force-balance">Force balance to contractual</option>
            <option value="patient-transfer">Transfer difference to patient</option>
          </select>
        </label>
        <button type="button" className="system-primary-button" onClick={onValidate}>
          Validate reconciliation
        </button>
      </div>

      <div className="batch-release-card">
        <span className={valid ? "release-state ready" : "release-state"}>
          {valid ? "Balanced" : "Not released"}
        </span>
        <h3>{valid ? "Batch control passed" : "Complete both controls"}</h3>
        <p>
          {feedback ||
            "A batch can close only after the posting decision and deposit reconciliation both pass validation."}
        </p>
        <div className="release-check">
          <span>{postingValid ? "✓" : "○"}</span>
          <div>
            <strong>Claim posting</strong>
            <small>{postingValid ? "Validated" : "Not yet validated"}</small>
          </div>
        </div>
        <div className="release-check">
          <span>{valid ? "✓" : "○"}</span>
          <div>
            <strong>Batch reconciliation</strong>
            <small>{valid ? "Validated" : "Not yet validated"}</small>
          </div>
        </div>
        <button
          type="button"
          className="system-primary-button full-system-button"
          disabled={!postingValid || !valid || closed}
          onClick={onClose}
        >
          {closed ? "Practice batch closed ✓" : "Close practice batch"}
        </button>
      </div>
    </div>
  );
}
