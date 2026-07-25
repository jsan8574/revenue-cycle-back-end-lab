"use client";

import { useMemo, useState } from "react";
import {
  postingScenarios,
  type PostingScenario,
} from "../data/exploration";
import type { TrainingModule } from "../data/training";

type PostingDeskTab = "source" | "search" | "account" | "post" | "reconcile";
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
        label: "Denial / reversal",
        ok:
          closeEnough(numeric(form.denial), expected.denial) &&
          form.denialCode.trim().toUpperCase() === expected.denialCode,
        message:
          closeEnough(numeric(form.denial), expected.denial) &&
          form.denialCode.trim().toUpperCase() === expected.denialCode
            ? "Denial and reversal treatment is correct."
            : "Recheck the reversal amount and CARC group/reason code.",
      },
      {
        label: "Posting action",
        ok: form.action === expected.action,
        message:
          form.action === expected.action
            ? "The transaction path is appropriate."
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
                onSearch={() => setSearched(true)}
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
        <div className="document-paper">
          <div className="document-heading">
            <div>
              <span>Electronic Remittance Advice</span>
              <h3>{scenario.era.payer}</h3>
              <p>{scenario.era.payee}</p>
            </div>
            <div>
              <span>ERA total</span>
              <strong>{money(scenario.era.eraTotal)}</strong>
            </div>
          </div>
          <div className="document-meta-grid">
            <DocumentMeta label="Trace number" value={scenario.era.trace} />
            <DocumentMeta label="Remittance date" value={scenario.era.eraDate} />
            <DocumentMeta label="Patient control" value={scenario.era.patientControl} />
            <DocumentMeta label="Payer claim ID" value={scenario.era.payerClaim} />
            <DocumentMeta label="Patient" value={scenario.era.patient} />
            <DocumentMeta label="Member ID" value={scenario.era.memberId} />
          </div>
          <div className="system-table-wrap">
            <table className="system-table">
              <thead>
                <tr>
                  <th>DOS</th>
                  <th>CPT</th>
                  <th>Billed</th>
                  <th>Allowed</th>
                  <th>Paid</th>
                  <th>Group / reason</th>
                  <th>Adjustment</th>
                  <th>Patient resp.</th>
                </tr>
              </thead>
              <tbody>
                {scenario.era.serviceLines.map((line) => (
                  <tr key={`${line.dos}-${line.cpt}`}>
                    <td>{line.dos}</td>
                    <td>{line.cpt}</td>
                    <td>{money(line.billed)}</td>
                    <td>{money(line.allowed)}</td>
                    <td>{money(line.paid)}</td>
                    <td>
                      {line.group}-{line.reason}
                    </td>
                    <td>{money(line.adjustment)}</td>
                    <td>{money(line.patientResponsibility)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="remark-block">
            <span>Remittance remarks</span>
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
        <div className="search-results">
          <div className="results-heading">
            <span>{scenario.accounts.length} possible matches</span>
            <small>Confirm multiple identifiers before opening an account.</small>
          </div>
          {scenario.accounts.map((account) => (
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
            disabled={!selectedAccountId}
            onClick={onOpen}
          >
            Open selected account <span>→</span>
          </button>
        </div>
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
    { key: "denial", label: "Denial / reversal amount" },
  ];

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
                <option value="reverse-and-deny">Reverse payment and post denial</option>
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
