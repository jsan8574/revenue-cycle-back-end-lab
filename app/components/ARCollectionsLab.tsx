"use client";

import { useState } from "react";
import {
  arScenarios,
  denialScenarios,
  resolutionActions,
  resolutionRoutes,
  type ArScenario,
  type DenialScenario,
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
  | "appeal";

type CalculatorState = {
  billed: string;
  rate: string;
  percent: string;
  patientResponsibility: string;
  otherInsurance: string;
  actualPayment: string;
};

type AccountNoteFields = {
  source: string;
  representative: string;
  reference: string;
  followUp: string;
  issue: string;
  findings: string;
  resolution: string;
};

type PostedAccountNote = AccountNoteFields & {
  author: string;
  date: string;
  department: string;
};

type AccountHistoryFilter = "all" | "billing" | "financial" | "notes";
type AppealScenario = ArScenario & {
  appeal: NonNullable<ArScenario["appeal"]>;
};

const arTabs: { id: ArDeskTab; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "eobs", label: "EOBs & correspondence" },
  { id: "transactions", label: "Account notes" },
  { id: "coverage", label: "Insurance" },
  { id: "investigate", label: "Payer investigation" },
  { id: "reimbursement", label: "Reimbursement" },
  { id: "resolve", label: "Resolution & notation" },
  { id: "appeal", label: "Appeal workbench" },
];

const initialCalculator = (): CalculatorState => ({
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

const canonicalText = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const canonicalDate = (value: string) => {
  const normalized = value.trim().toLowerCase();
  const pad = (part: string | number) => String(part).padStart(2, "0");
  const isoMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${pad(isoMatch[2])}-${pad(isoMatch[3])}`;
  }

  const numericMatch = normalized.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
  );
  if (numericMatch) {
    return `${numericMatch[3]}-${pad(numericMatch[1])}-${pad(
      numericMatch[2],
    )}`;
  }

  const monthNumbers: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };
  const namedMatch = normalized.match(
    /^([a-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})$/,
  );
  if (namedMatch && monthNumbers[namedMatch[1]]) {
    return `${namedMatch[3]}-${pad(monthNumbers[namedMatch[1]])}-${pad(
      namedMatch[2],
    )}`;
  }

  return normalized.replace(/\s+/g, "");
};

const samePatientName = (entered: string, expected: string) => {
  const enteredTokens = entered
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .sort();
  const expectedTokens = expected
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .sort();
  return (
    enteredTokens.length > 0 &&
    enteredTokens.join("") === expectedTokens.join("")
  );
};

const dateBefore = (value: string, days: number) => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  const date = new Date(parsed);
  date.setUTCDate(date.getUTCDate() - days);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

type ContractScheduleRow = {
  category: string;
  codes: string;
  method: string;
  rate: string;
  rule: string;
};

function contractMethodLabel(scenario: ArScenario) {
  if (scenario.contract.method === "case-rate") return "Case rate";
  if (scenario.contract.method === "percent-charge") {
    return "Percentage of billed charges";
  }
  return "Fee schedule";
}

function serviceCategory(scenario: ArScenario) {
  const serviceText = scenario.claim.services
    .map((service) => service.description.toLowerCase())
    .join(" ");
  if (serviceText.includes("infusion") || serviceText.includes("drug")) {
    return "Specialty drugs & infusion";
  }
  if (serviceText.includes("mri") || serviceText.includes("radiology")) {
    return "Advanced diagnostic imaging";
  }
  if (serviceText.includes("surgery") || serviceText.includes("arthroplasty")) {
    return "Facility surgery";
  }
  if (serviceText.includes("laboratory") || serviceText.includes("pathology")) {
    return "Laboratory & pathology";
  }
  if (serviceText.includes("observation") || serviceText.includes("hospital")) {
    return "Outpatient hospital";
  }
  return "Professional services";
}

function contractScheduleRows(scenario: ArScenario): ContractScheduleRow[] {
  const claimCodeSet = new Set(
    scenario.claim.services.map((service) => service.cpt),
  );
  const referenceRows: ContractScheduleRow[] = [
    {
      category: "Primary care office",
      codes: "99202",
      method: "Fee schedule",
      rate: "$102.00 per service",
      rule: "New-patient office visit; separately payable services follow their own code rate.",
    },
    {
      category: "Primary care office",
      codes: "99203",
      method: "Fee schedule",
      rate: "$165.00 per service",
      rule: "New-patient office visit; professional component only.",
    },
    {
      category: "Primary care office",
      codes: "99213",
      method: "Fee schedule",
      rate: "$128.00 per service",
      rule: "Established-patient office visit; separately payable services use their own code rate.",
    },
    {
      category: "Primary care office",
      codes: "99214",
      method: "Fee schedule",
      rate: "$184.00 per service",
      rule: "Established-patient office visit; professional component only.",
    },
    {
      category: "Preventive medicine",
      codes: "99395",
      method: "Fee schedule",
      rate: "$168.00 per service",
      rule: "Preventive visit for an established adult; routine counseling is included.",
    },
    {
      category: "Preventive medicine",
      codes: "99396",
      method: "Fee schedule",
      rate: "$190.00 per service",
      rule: "Preventive visit for an established adult; age-appropriate preventive work is included.",
    },
    {
      category: "Diagnostic imaging",
      codes: "71046",
      method: "Fee schedule",
      rate: "$58.00 per service",
      rule: "Two-view chest radiograph; modifier-specific professional or technical rates supersede this global rate.",
    },
    {
      category: "Diagnostic imaging",
      codes: "73562",
      method: "Fee schedule",
      rate: "$72.00 per service",
      rule: "Three-view knee radiograph; global service rate.",
    },
    {
      category: "Diagnostic imaging",
      codes: "72148",
      method: "Fee schedule",
      rate: "$412.00 per service",
      rule: "Lumbar MRI without contrast; authorization and modifier requirements apply.",
    },
    {
      category: "Standard laboratory",
      codes: "80053",
      method: "Fee schedule",
      rate: "$31.00 per service",
      rule: "Comprehensive metabolic panel; code-specific rate is the maximum allowed.",
    },
    {
      category: "Standard laboratory",
      codes: "85025",
      method: "Fee schedule",
      rate: "$18.00 per service",
      rule: "Complete blood count; code-specific rate is the maximum allowed.",
    },
    {
      category: "Pathology",
      codes: "88305",
      method: "Fee schedule",
      rate: "$92.00 per service",
      rule: "Surgical pathology examination; modifier-specific component rules apply.",
    },
    {
      category: "Physical medicine",
      codes: "97110",
      method: "Per-unit fee schedule",
      rate: "$42.00 per unit",
      rule: "Daily therapy limits and multiple-procedure reductions may apply.",
    },
    {
      category: "Physical medicine",
      codes: "97140",
      method: "Per-unit fee schedule",
      rate: "$38.00 per unit",
      rule: "Daily therapy limits and multiple-procedure reductions may apply.",
    },
    {
      category: "Emergency department",
      codes: "99285",
      method: "Percentage of charges",
      rate: "74% of covered billed charges",
      rule: "Subject to outlier and coordination-of-benefits provisions.",
    },
  ];

  let relevantRows: ContractScheduleRow[];
  if (scenario.contract.method === "case-rate") {
    relevantRows = [
      {
        category: serviceCategory(scenario),
        codes: scenario.claim.services.map((service) => service.cpt).join(" + "),
        method: "Case rate",
        rate: `${money(scenario.contract.rate)} per case`,
        rule: scenario.contract.terms,
      },
    ];
  } else if (scenario.contract.method === "percent-charge") {
    relevantRows = scenario.claim.services.map((service) => ({
      category: serviceCategory(scenario),
      codes: service.cpt,
      method: "Percentage of billed charges",
      rate: `${scenario.contract.percent}% of the covered charge for CPT ${service.cpt}`,
      rule: scenario.contract.terms,
    }));
  } else {
    const totalCharges = scenario.claim.services.reduce(
      (sum, service) => sum + service.charge,
      0,
    );
    let assignedAllowance = 0;
    relevantRows = scenario.claim.services.map((service, index) => {
      const units = Math.max(1, service.units);
      const isLast = index === scenario.claim.services.length - 1;
      const unitRate = isLast
        ? (scenario.contract.rate - assignedAllowance) / units
        : Math.round(
            ((scenario.contract.rate * service.charge) / totalCharges / units) *
              100,
          ) / 100;
      const lineAllowance = unitRate * units;
      assignedAllowance += lineAllowance;
      return {
        category: serviceCategory(scenario),
        codes: service.cpt,
        method: units > 1 ? "Per-unit fee schedule" : "Fee schedule",
        rate:
          units > 1
            ? `${money(unitRate)} per unit`
            : `${money(unitRate)} per service`,
        rule: `${service.description}; ${units} billed ${units === 1 ? "unit" : "units"} produce an expected line allowance of ${money(lineAllowance)}. ${scenario.contract.terms}`,
      };
    });
  }

  const filteredReferenceRows = referenceRows.filter(
    (row) => !claimCodeSet.has(row.codes),
  );
  const insertionPoint = Math.min(5, filteredReferenceRows.length);
  return [
    ...filteredReferenceRows.slice(0, insertionPoint),
    ...relevantRows,
    ...filteredReferenceRows.slice(insertionPoint),
  ];
}

function ContractScheduleTable({ scenario }: { scenario: ArScenario }) {
  return (
    <div className="system-table-wrap contract-schedule-wrap">
      <table className="system-table contract-schedule-table">
        <thead>
          <tr>
            <th>Service category</th>
            <th>Covered codes</th>
            <th>Reimbursement method</th>
            <th>Code-specific rate</th>
            <th>Contract provision</th>
          </tr>
        </thead>
        <tbody>
          {contractScheduleRows(scenario).map((row) => (
            <tr key={`${row.category}-${row.codes}`}>
              <td>{row.category}</td>
              <td>{row.codes}</td>
              <td>{row.method}</td>
              <td>{row.rate}</td>
              <td>{row.rule}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const trainingToday = new Date("2026-07-26T12:00:00");

function getAgeDays(scenario: ArScenario) {
  const match = scenario.claim.aging.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function getDeadlineDays(scenario: ArScenario) {
  const timestamp = Date.parse(scenario.claim.appealDeadline);
  if (!Number.isFinite(timestamp)) return 180;
  return Math.ceil((timestamp - trainingToday.getTime()) / 86400000);
}

function getPriorityScore(scenario: ArScenario) {
  const balancePoints = Math.min(35, scenario.claim.openAr / 350);
  const agePoints = Math.min(28, getAgeDays(scenario) / 3.5);
  const deadlineDays = getDeadlineDays(scenario);
  const deadlinePoints =
    deadlineDays <= 7 ? 32 : deadlineDays <= 21 ? 24 : deadlineDays <= 45 ? 14 : 4;
  const riskPoints =
    scenario.priority === "High risk"
      ? 12
      : scenario.priority === "Priority"
        ? 7
        : 2;
  return Math.round(balancePoints + agePoints + deadlinePoints + riskPoints);
}

function getPriorityReason(scenario: ArScenario) {
  const reasons: string[] = [];
  const age = getAgeDays(scenario);
  const deadline = getDeadlineDays(scenario);
  if (scenario.claim.openAr >= 5000) reasons.push("high balance");
  else if (scenario.claim.openAr >= 2000) reasons.push("material balance");
  if (age >= 90) reasons.push("aged 90+ days");
  else if (age >= 60) reasons.push("aged 60+ days");
  if (deadline <= 7) reasons.push("deadline within 7 days");
  else if (deadline <= 21) reasons.push("deadline within 21 days");
  else if (deadline <= 45) reasons.push("near-term filing risk");
  return reasons.slice(0, 3).join(" · ") || "routine follow-up window";
}

function getPriorityFactorCount(value: string) {
  const factorPatterns = [
    /\b(balance|amount|dollar|financial|high[- ]?value)\b|\$/i,
    /\b(age|aging|aged|days?\s+(old|in\s+ar))\b/i,
    /\b(deadline|filing|appeal|timely)\b/i,
    /\b(risk|status|reject|denial|pending|readiness|workable|operational)\b/i,
  ];
  return factorPatterns.filter((pattern) => pattern.test(value)).length;
}

function getPriorityCoachingAnswer(
  scenario: ArScenario,
  scenarios: ArScenario[],
  mode: "ar" | "denial",
) {
  const rankedScenarioIds = [...scenarios]
    .sort((left, right) => getPriorityScore(right) - getPriorityScore(left))
    .map((item) => item.id);
  const rank = rankedScenarioIds.indexOf(scenario.id) + 1;
  const deadlineDays = getDeadlineDays(scenario);
  const deadlineLabel = mode === "denial" ? "appeal deadline" : "filing or follow-up deadline";
  const deadlineReason = Number.isFinite(Date.parse(scenario.claim.appealDeadline))
    ? `Its ${deadlineLabel} is ${scenario.claim.appealDeadline}${
        deadlineDays >= 0 ? `, with ${deadlineDays} days remaining` : ", and it is already overdue"
      }.`
    : `No formal deadline has been issued, so the unresolved ${scenario.status.toLowerCase()} status must be monitored as an operational risk.`;

  return `Place ${scenario.id} at #${rank} of ${scenarios.length}. It has ${money(
    scenario.claim.openAr,
  )} in open insurance AR and is ${scenario.claim.aging}. ${deadlineReason} Its ${scenario.priority.toLowerCase()} designation adds operational risk. The queue position is supported by balance, age, deadline or status, and recovery risk—not by the priority score alone.`;
}

export function ARCollectionsLab({
  module,
  learnerName,
  scenarioIndex,
  onSelectScenario,
  onComplete,
  mode = "ar",
}: {
  module: TrainingModule;
  learnerName: string;
  scenarioIndex: number;
  onSelectScenario: (index: number) => void;
  onComplete: (scenario: string, score: number) => void;
  mode?: "ar" | "denial";
}) {
  const scenarioList: ArScenario[] =
    mode === "denial" ? denialScenarios : arScenarios;
  const scenario = scenarioList[scenarioIndex];
  const denialScenario =
    mode === "denial" ? (scenario as DenialScenario) : null;
  const appealScenario = scenario.appeal
    ? (scenario as AppealScenario)
    : null;
  const visibleTabs = arTabs
    .filter((item) => item.id !== "appeal" || Boolean(appealScenario))
    .map((item) =>
      item.id === "appeal" &&
      appealScenario?.appeal.category === "pricing-reconsideration"
        ? { ...item, label: "Reconsideration letter" }
        : item,
    );
  const [tab, setTab] = useState<ArDeskTab>("account");
  const [visited, setVisited] = useState<ArDeskTab[]>(["account"]);
  const [balanceReviewed, setBalanceReviewed] = useState(false);
  const [portalOpened, setPortalOpened] = useState(false);
  const [portalCredentials, setPortalCredentials] = useState({
    patientName: "",
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
  const [appealDraft, setAppealDraft] = useState(() => ({
    recipient: appealScenario?.appeal.recipient ?? "",
    subject: appealScenario?.appeal.subject ?? "",
    body: appealScenario?.appeal.template ?? "",
  }));
  const [appealMethod, setAppealMethod] = useState<"electronic" | "mail" | "">(
    "",
  );
  const [appealAttachments, setAppealAttachments] = useState<string[]>([]);
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [appealFeedback, setAppealFeedback] = useState("");
  const [notes, setNotes] = useState<AccountNoteFields>({
    source: "",
    representative: "",
    reference: "",
    followUp: "",
    issue: "",
    findings: "",
    resolution: "",
  });
  const [postedAccountNotes, setPostedAccountNotes] = useState<
    PostedAccountNote[]
  >([]);
  const [notePosted, setNotePosted] = useState(false);
  const [closed, setClosed] = useState(false);
  const [priorityRationale, setPriorityRationale] = useState("");
  const [priorityRationaleSubmitted, setPriorityRationaleSubmitted] =
    useState(false);
  const [priorityRationaleMeetsCriteria, setPriorityRationaleMeetsCriteria] =
    useState(false);
  const [priorityRationaleFeedback, setPriorityRationaleFeedback] =
    useState("");

  const rankedScenarioIds = [...scenarioList]
    .sort((left, right) => getPriorityScore(right) - getPriorityScore(left))
    .map((item) => item.id);
  const selectedPriorityRank = rankedScenarioIds.indexOf(scenario.id) + 1;
  const selectedPriorityScore = getPriorityScore(scenario);
  const priorityCoachingAnswer = getPriorityCoachingAnswer(
    scenario,
    scenarioList,
    mode,
  );

  const investigationComplete = portalOpened && callClosed;
  const appealRequirementMet =
    !appealScenario?.appeal.required ||
    appealSubmitted;
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
    {
      label: "Explain account prioritization",
      done: priorityRationaleSubmitted,
    },
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
      label: "Review billing history, transactions & collector notes",
      done: visited.includes("transactions"),
    },
    {
      label: "Complete payer portal research and call",
      done: investigationComplete,
    },
    { label: "Choose and validate a resolution", done: actionValid },
    ...(appealScenario
      ? [
          {
            label:
              appealScenario.appeal.category === "pricing-reconsideration"
                ? "Prepare and submit the pricing reconsideration"
                : "Prepare the required denial response / appeal",
            done: appealRequirementMet && actionValid,
          },
        ]
      : []),
    { label: "Create notation: issue, findings, resolution", done: notesComplete },
    { label: "Post note in the system", done: notePosted },
  ];

  const completedCount = checklist.filter((item) => item.done).length;
  const canPostNote =
    notesComplete &&
    priorityRationaleSubmitted &&
    actionValid &&
    reimbursementValid &&
    investigationComplete &&
    appealRequirementMet;

  const validatePriorityRationale = () => {
    if (!priorityRationale.trim()) {
      setPriorityRationaleSubmitted(false);
      setPriorityRationaleMeetsCriteria(false);
      setPriorityRationaleFeedback(
        "Enter your prioritization decision before submitting.",
      );
      return;
    }
    const factorCount = getPriorityFactorCount(priorityRationale);
    const meetsCriteria =
      priorityRationale.trim().length >= 80 && factorCount >= 3;
    setPriorityRationaleSubmitted(true);
    setPriorityRationaleMeetsCriteria(meetsCriteria);
    setPriorityRationaleFeedback(
      meetsCriteria
        ? `Answer submitted for ${scenario.id}. You used at least three prioritization factors. Compare your reasoning with the coaching key below.`
        : `Answer submitted for ${scenario.id}. The response used ${factorCount} of 4 recognized factors. Review the coaching key below, then continue or revise and resubmit.`,
    );
  };

  const openTab = (next: ArDeskTab) => {
    setTab(next);
    setVisited((current) =>
      current.includes(next) ? current : [...current, next],
    );
  };

  const authenticatePortal = () => {
    const providerEntered = canonicalText(portalCredentials.providerId);
    const patientMatch =
      samePatientName(
        portalCredentials.patientName,
        scenario.patient.name,
      ) ||
      canonicalText(portalCredentials.patientName) ===
        canonicalText(scenario.patient.name);
    const memberMatch =
      canonicalText(portalCredentials.memberId) ===
      canonicalText(scenario.patient.memberId);
    const providerMatch =
      providerEntered === canonicalText(scenario.patient.providerNpi) ||
      providerEntered === canonicalText(scenario.patient.providerTaxId);
    const dobMatch =
      canonicalDate(portalCredentials.dob) ===
      canonicalDate(scenario.patient.dob);
    const dosMatch =
      canonicalDate(portalCredentials.dos) ===
      canonicalDate(scenario.patient.dos);
    const correct =
      (patientMatch || memberMatch) &&
      providerMatch &&
      dobMatch &&
      dosMatch;
    setPortalOpened(correct);
    setPortalFeedback(
      correct
        ? "Claim located. The adjudication detail is available below."
        : !patientMatch && !memberMatch
          ? "Patient not found. Enter either the patient name or member ID from the account. Spaces, dashes, and capitalization do not matter."
          : !providerMatch
            ? "Patient found, but the provider identifier does not match. Verify the billing NPI or tax ID from the Account tab."
            : !dobMatch || !dosMatch
              ? "Patient found, but no claim matches the selected birth date and date of service."
              : "Claim not found. Review the account identifiers and try again.",
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
      scenario.contract.method === "percent-charge"
        ? billed * (percent / 100)
        : rate;
    const payment = Math.max(0, allowed - patient - other);
    const variance = payment - actual;
    const result = { allowed, payment, variance };
    setCalculation(result);

    const correct =
      closeEnough(allowed, scenario.expected.expectedAllowed) &&
      closeEnough(payment, scenario.expected.expectedPayment) &&
      closeEnough(variance, scenario.expected.variance);
    setReimbursementValid(correct);
    setCalculationFeedback(
      correct
        ? "Validated. Your service-code match, contract rate, expected reimbursement, and payment variance are correct."
        : "Not validated. Recheck the billed service codes against the full contract schedule, then verify the applicable rate, patient liability, other insurance, and actual payment.",
    );
  };

  const validateAction = () => {
    setDecisionAttempts((count) => count + 1);
    const routeRequired = selectedAction === "send-task";
    const correct =
      selectedAction === scenario.expected.action &&
      (!routeRequired || selectedRoute === scenario.expected.route) &&
      (!routeRequired || decisionReason.trim().length >= 20);
    setActionValid(correct);
    setActionFeedback(
      correct
        ? `Decision supported. ${scenario.expected.rationale}`
        : routeRequired
          ? "The task or escalation, request note, or internal destination is not fully supported. Revisit the account evidence and deadlines before trying again."
          : "The selected action is not fully supported. Revisit the account evidence and deadlines before trying again.",
    );
    if (
      correct &&
      selectedAction === "submit-appeal" &&
      appealScenario
    ) {
      openTab("appeal");
    }
  };

  const postNote = () => {
    if (!canPostNote || notePosted) return;
    setPostedAccountNotes((current) => [
      ...current,
      {
        ...notes,
        author: learnerName,
        date: "Jul 26, 2026 · Posted this session",
        department:
          mode === "denial" ? "Denial Management" : "Insurance Follow-up",
      },
    ]);
    setNotePosted(true);
  };

  const submitAppealRequest = () => {
    if (
      !appealScenario ||
      !appealMethod ||
      appealDraft.recipient.trim().length < 4 ||
      appealDraft.subject.trim().length < 8 ||
      appealDraft.body.trim().length < 120
    ) {
      setAppealFeedback(
        "Complete the recipient, subject, letter, and submission method before sending the request.",
      );
      return;
    }
    if (
      appealScenario.appeal.required &&
      appealAttachments.length !== appealScenario.appeal.attachments.length
    ) {
      const requestType =
        appealScenario.appeal.category === "pricing-reconsideration"
          ? "pricing reconsideration"
          : "appeal";
      setAppealFeedback(
        `Confirm every required attachment before submitting the ${requestType} request.`,
      );
      return;
    }
    const isReconsideration =
      appealScenario.appeal.category === "pricing-reconsideration";
    const reference = `${
      appealMethod === "electronic"
        ? isReconsideration
          ? "REC"
          : "APL"
        : "MAIL"
    }-${scenario.id.replace(/^(DM|AR)-/, "")}-${
      appealMethod === "electronic" ? "26" : "48"
    }`;
    setAppealSubmitted(true);
    setAppealFeedback(
      appealMethod === "electronic"
        ? `Successful — the electronic ${isReconsideration ? "pricing reconsideration" : "appeal"} was sent to ${appealScenario.appeal.electronicRoute}. Confirmation ${reference}.`
        : `Successful — the mail submission request was created for ${appealScenario.appeal.mailingAddress}. Tracking task ${reference}.`,
    );
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
          <span className="section-kicker">
            {mode === "denial"
              ? "Denial investigation desktop"
              : "AR Collections / Insurance Follow-up desktop"}
          </span>
          <h1>
            {mode === "denial"
              ? "Investigate the denial. Defend the recovery path."
              : "Work the account. Prove the next action."}
          </h1>
          <p>
            {mode === "denial"
              ? "Build the claim story from system evidence, confirm the denial and reimbursement impact, then correct, escalate, or appeal it."
              : "Navigate a realistic patient account, develop the claim story, calculate expected reimbursement, investigate with the payer, and own the resolution."}
          </p>
        </div>
        <span className="mode-chip">Industry-ready mode</span>
      </section>

      <ArScenarioRail
        scenarios={scenarioList}
        mode={mode}
        selected={scenarioIndex}
        onSelect={onSelectScenario}
        rationale={priorityRationale}
        rationaleSubmitted={priorityRationaleSubmitted}
        rationaleMeetsCriteria={priorityRationaleMeetsCriteria}
        rationaleFeedback={priorityRationaleFeedback}
        coachingAnswer={priorityCoachingAnswer}
        onRationale={(value) => {
          setPriorityRationale(value);
          setPriorityRationaleSubmitted(false);
          setPriorityRationaleMeetsCriteria(false);
          setPriorityRationaleFeedback("");
        }}
        onSubmitRationale={validatePriorityRationale}
      />

      <section className="ar-system-frame">
        <header className="ar-system-titlebar">
          <div className="system-brand">
            <span className="system-logo amber">
              {mode === "denial" ? "DM" : "AR"}
            </span>
            <div>
              <strong>
                {mode === "denial"
                  ? "Denial Resolution Manager"
                  : "Insurance Follow-up Manager"}
              </strong>
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

        <AccountReferenceStrip scenario={scenario} />

        <div className="ar-system-body">
          <aside className="ar-checklist">
            <div className="checklist-heading">
              <span className="system-kicker">
                {mode === "denial"
                  ? "Denial management workflow"
                  : "Insurance follow-up workflow"}
              </span>
              <h3>Account checklist</h3>
              <p>
                {completedCount} of {checklist.length} complete
              </p>
            </div>
            <div className="ar-checklist-progress">
              <span
                style={{
                  width: `${(completedCount / checklist.length) * 100}%`,
                }}
              />
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
            <nav
              className="ar-tabbar"
              aria-label={
                mode === "denial"
                  ? "Denial account areas"
                  : "Insurance follow-up account areas"
              }
            >
              {visibleTabs.map((item) => (
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
                <AccountNotesView
                  scenario={scenario}
                  postedNotes={postedAccountNotes}
                />
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
                <div className="resolution-notation-stack">
                  <ResolutionView
                    selectedAction={selectedAction}
                    selectedRoute={selectedRoute}
                    decisionReason={decisionReason}
                    feedback={actionFeedback}
                    valid={actionValid}
                    onAction={(value) => {
                      setSelectedAction(value);
                      setActionValid(false);
                      setActionFeedback("");
                      if (value !== "send-task") {
                        setSelectedRoute("");
                        setDecisionReason("");
                      }
                    }}
                    onRoute={setSelectedRoute}
                    onReason={setDecisionReason}
                    onValidate={validateAction}
                  />
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
                </div>
              ) : null}
              {tab === "appeal" && appealScenario ? (
                <AppealView
                  scenario={appealScenario}
                  draft={appealDraft}
                  method={appealMethod}
                  attachments={appealAttachments}
                  submitted={appealSubmitted}
                  feedback={appealFeedback}
                  onDraft={(key, value) =>
                    setAppealDraft((current) => ({
                      ...current,
                      [key]: value,
                    }))
                  }
                  onMethod={setAppealMethod}
                  onAttachment={(attachment) =>
                    setAppealAttachments((current) =>
                      current.includes(attachment)
                        ? current.filter((item) => item !== attachment)
                        : [...current, attachment],
                    )
                  }
                  onSubmit={submitAppealRequest}
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <PdfExportCenter
        learnerName={learnerName}
        moduleName={module.title}
        scenarioName={`${scenario.id} · ${scenario.title}`}
        reports={[
          {
            label: "Account investigation",
            description:
              "Claim facts, account history, notes, transactions, and documents reviewed",
            title:
              mode === "denial"
                ? "Denial Account Investigation"
                : "Insurance Follow-up Account Investigation",
            sections: [
              {
                heading: "Prioritization decision",
                lines: [
                  `Selected account queue position: ${selectedPriorityRank} of ${scenarioList.length}`,
                  `System priority score: ${selectedPriorityScore}`,
                  `Submission status: ${priorityRationaleSubmitted ? "Submitted" : "Not submitted"}`,
                  `Coaching criteria: ${priorityRationaleMeetsCriteria ? "Met" : priorityRationaleSubmitted ? "Needs improvement" : "Not evaluated"}`,
                  `Learner response: ${priorityRationale || "No prioritization rationale entered"}`,
                  `Coaching key: ${priorityRationaleSubmitted ? priorityCoachingAnswer : "Revealed after submission"}`,
                ],
              },
              {
                heading: "Patient, provider, and claim",
                lines: [
                  `${scenario.patient.name} · ${scenario.patient.account}`,
                  `DOB: ${scenario.patient.dob}`,
                  `Member ID: ${scenario.patient.memberId}`,
                  `DOS: ${scenario.patient.dos}`,
                  `Provider: ${scenario.patient.provider}`,
                  `NPI: ${scenario.patient.providerNpi}`,
                  `TIN: ${scenario.patient.providerTaxId}`,
                  `Claim: ${scenario.claim.claimId}`,
                  `Billed: ${money(scenario.claim.billed)}`,
                  `Open insurance AR: ${money(scenario.claim.openAr)}`,
                ],
              },
              {
                heading: "Account notes",
                lines: [
                  ...scenario.previousNotes.map(
                    (note) =>
                      `${note.date} · ${note.author} (${note.department}): ${note.note}`,
                  ),
                  ...postedAccountNotes.map(
                    (note) =>
                      `${note.date} · ${note.author} (${note.department}): Issue — ${note.issue} Findings — ${note.findings} Resolution — ${note.resolution}`,
                  ),
                ],
              },
              {
                heading: "Investigation status",
                lines: [
                  `Portal claim detail: ${portalOpened ? "Reviewed" : "Not reviewed"}`,
                  `Payer call: ${callClosed ? "Closed" : "Not completed"}`,
                  `Documents reviewed: ${visited.includes("eobs") ? "Yes" : "No"}`,
                  `Account history reviewed: ${visited.includes("transactions") ? "Yes" : "No"}`,
                ],
              },
            ],
          },
          {
            label:
              appealScenario
                ? appealScenario.appeal.category === "pricing-reconsideration"
                  ? "Reconsideration & resolution"
                  : "Appeal & resolution"
                : "Resolution worksheet",
            description:
              appealScenario
                ? appealScenario.appeal.category === "pricing-reconsideration"
                  ? "Reimbursement, underpayment decision, and editable reconsideration package"
                  : "Reimbursement, denial action, and editable appeal package"
                : "Reimbursement calculation and proposed next action",
            title:
              appealScenario
                ? appealScenario.appeal.category === "pricing-reconsideration"
                  ? "Insurance Underpayment Reconsideration Package"
                  : "Denial Resolution and Appeal Package"
                : "Insurance Follow-up Resolution Worksheet",
            sections: [
              {
                heading: "Expected reimbursement",
                lines: [
                  `Contract method: ${contractMethodLabel(scenario)}`,
                  `Expected allowed: ${calculation ? money(calculation.allowed) : "Not calculated"}`,
                  `Expected payment: ${calculation ? money(calculation.payment) : "Not calculated"}`,
                  `Variance: ${calculation ? money(calculation.variance) : "Not calculated"}`,
                  `Validation: ${reimbursementValid ? "Passed" : "Not passed"}`,
                ],
              },
              {
                heading: "Resolution decision",
                lines: [
                  `Action: ${resolutionActions.find((action) => action.id === selectedAction)?.label || "Not selected"}`,
                  `Route: ${selectedAction === "send-task" ? selectedRoute || "Not selected" : "Not required"}`,
                  `Request note: ${selectedAction === "send-task" ? decisionReason || "Not entered" : "Not required"}`,
                ],
              },
              ...(appealScenario
                ? [
                    {
                      heading:
                        appealScenario.appeal.category ===
                        "pricing-reconsideration"
                          ? "Pricing reconsideration request"
                          : "Appeal request",
                      lines: [
                        ...(denialScenario
                          ? [
                              `Denial: ${denialScenario.denial.carc} / ${denialScenario.denial.rarc}`,
                            ]
                          : [
                              `Underpayment variance: ${money(scenario.expected.variance)}`,
                              `Payer claim: ${scenario.portal.icn}`,
                            ]),
                        `Recipient: ${appealDraft.recipient || "Not entered"}`,
                        `Subject: ${appealDraft.subject || "Not entered"}`,
                        `Method: ${appealMethod || "Not selected"}`,
                        `Attachments: ${appealAttachments.length} of ${appealScenario.appeal.attachments.length} confirmed`,
                        `Status: ${appealSubmitted ? "Submitted successfully" : "Draft"}`,
                        "",
                        appealDraft.body || "No appeal letter drafted",
                      ],
                    },
                  ]
                : []),
            ],
          },
          {
            label: "Final account note",
            description: "Issue, findings, resolution, and completion status",
            title:
              mode === "denial"
                ? "Denial Management Completion Report"
                : "Insurance Follow-up Completion Report",
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
                  `Checklist: ${completedCount} of ${checklist.length} complete`,
                  `Prioritization rationale: ${priorityRationaleSubmitted ? "Submitted" : "Not submitted"}`,
                  `Prioritization coaching criteria: ${priorityRationaleMeetsCriteria ? "Met" : priorityRationaleSubmitted ? "Needs improvement" : "Not evaluated"}`,
                  `Note status: ${notePosted ? "Posted" : "Draft"}`,
                  `Account status: ${closed ? "Completed" : "Open"}`,
                ],
              },
            ],
          },
        ]}
      />
    </div>
  );
}

function ArScenarioRail({
  scenarios,
  mode,
  selected,
  onSelect,
  rationale,
  rationaleSubmitted,
  rationaleMeetsCriteria,
  rationaleFeedback,
  coachingAnswer,
  onRationale,
  onSubmitRationale,
}: {
  scenarios: ArScenario[];
  mode: "ar" | "denial";
  selected: number;
  onSelect: (index: number) => void;
  rationale: string;
  rationaleSubmitted: boolean;
  rationaleMeetsCriteria: boolean;
  rationaleFeedback: string;
  coachingAnswer: string;
  onRationale: (value: string) => void;
  onSubmitRationale: () => void;
}) {
  const ranked = scenarios
    .map((scenario, originalIndex) => ({
      scenario,
      originalIndex,
      score: getPriorityScore(scenario),
    }))
    .sort((left, right) => right.score - left.score);

  return (
    <section className="priority-queue-panel">
      <div className="priority-queue-heading">
        <div>
          <span className="section-kicker">Prioritization activity</span>
          <h2>
            {mode === "denial"
              ? "Denial priority queue"
              : "Insurance Follow-up priority queue"}
          </h2>
          <p>
            Worklist rank weighs open balance, account age, filing or appeal
            deadline, and operational risk. The underlying issue stays hidden.
          </p>
        </div>
        <div className="priority-legend">
          <span>Balance</span>
          <span>Age</span>
          <span>Deadline</span>
          <span>Risk</span>
        </div>
      </div>
      <div
        className="scenario-rail exploration-scenarios"
        aria-label={
          mode === "denial"
            ? "Ranked denial scenarios"
            : "Ranked insurance follow-up scenarios"
        }
      >
        {ranked.map(({ scenario: item, originalIndex, score }, rank) => (
          <button
            key={item.id}
            className={
              originalIndex === selected
                ? "scenario-card scenario-card-active"
                : "scenario-card"
            }
            onClick={() => onSelect(originalIndex)}
            type="button"
          >
            <span className="scenario-number">#{rank + 1}</span>
            <span className="scenario-card-copy">
              <strong>{item.title}</strong>
              <small>{item.subtitle}</small>
              <small className="priority-reason">
                {getPriorityReason(item)}
              </small>
            </span>
            <span className="queue-score">
              <strong>{score}</strong>
              <small>priority score</small>
            </span>
            <span
              className={`priority-tag priority-${item.priority
                .toLowerCase()
                .replace(" ", "-")}`}
            >
              {item.claim.aging} · {money(item.claim.openAr)}
            </span>
          </button>
        ))}
      </div>
      <div className="priority-rationale-panel">
        <div>
          <span className="system-kicker">Required learner explanation</span>
          <h3>How would you prioritize the selected account?</h3>
          <p>
            Explain where it belongs in the five-account queue and why. Support
            your decision with at least three factors from the worklist.
          </p>
        </div>
        <label>
          <span>Prioritization rationale</span>
          <textarea
            value={rationale}
            onChange={(event) => onRationale(event.target.value)}
            placeholder="Explain your decision using balance, account age, filing or appeal deadline, and operational risk or status."
            rows={4}
          />
          <small>{rationale.trim().length} characters · minimum 80</small>
        </label>
        <div className="priority-rationale-actions">
          <button type="button" onClick={onSubmitRationale}>
            Submit prioritization rationale
          </button>
          {rationaleFeedback ? (
            <p
              className={
                rationaleSubmitted ? "success-message" : "warning-message"
              }
              aria-live="polite"
            >
              {rationaleFeedback}
            </p>
          ) : null}
        </div>
        {rationaleSubmitted ? (
          <aside
            className={
              rationaleMeetsCriteria
                ? "priority-coaching-key meets-criteria"
                : "priority-coaching-key needs-review"
            }
            aria-live="polite"
          >
            <span className="system-kicker">Coaching key</span>
            <h4>
              {rationaleMeetsCriteria
                ? "Your rationale is well supported."
                : "Here is the recommended prioritization approach."}
            </h4>
            <p>{coachingAnswer}</p>
            <small>
              Your answer has been recorded. You may continue now, or revise it
              and submit again after comparing the four factors.
            </small>
          </aside>
        ) : null}
      </div>
    </section>
  );
}

function AccountReferenceStrip({ scenario }: { scenario: ArScenario }) {
  return (
    <section
      className="account-reference-strip"
      aria-label="Patient and provider quick reference"
    >
      <div className="account-reference-group patient-reference">
        <span className="reference-group-label">Patient information</span>
        <strong>{scenario.patient.name}</strong>
        <dl>
          <div>
            <dt>Account</dt>
            <dd>{scenario.patient.account}</dd>
          </div>
          <div>
            <dt>DOB</dt>
            <dd>{scenario.patient.dob}</dd>
          </div>
          <div>
            <dt>DOS</dt>
            <dd>{scenario.patient.dos}</dd>
          </div>
        </dl>
      </div>
      <div className="account-reference-group provider-reference">
        <span className="reference-group-label">Provider information</span>
        <strong>{scenario.patient.provider}</strong>
        <dl>
          <div>
            <dt>Practice</dt>
            <dd>Evergreen Medical Group</dd>
          </div>
          <div>
            <dt>NPI</dt>
            <dd>{scenario.patient.providerNpi}</dd>
          </div>
          <div>
            <dt>TIN</dt>
            <dd>{scenario.patient.providerTaxId}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{scenario.patient.location}</dd>
          </div>
        </dl>
      </div>
      <div className="account-reference-balance">
        <span>Open insurance AR</span>
        <strong>{money(scenario.claim.openAr)}</strong>
        <small>
          {scenario.claim.claimId} · {scenario.claim.aging}
        </small>
      </div>
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

      <div className="provider-information-panel">
        <div>
          <span className="system-kicker">Billing provider information</span>
          <h3>{scenario.patient.provider}</h3>
          <p>Evergreen Medical Group · {scenario.patient.location}</p>
        </div>
        <dl>
          <div>
            <dt>Rendering / billing provider</dt>
            <dd>{scenario.patient.provider}</dd>
          </div>
          <div>
            <dt>Practice</dt>
            <dd>Evergreen Medical Group</dd>
          </div>
          <div>
            <dt>National Provider Identifier</dt>
            <dd>{scenario.patient.providerNpi}</dd>
          </div>
          <div>
            <dt>Tax identification number</dt>
            <dd>{scenario.patient.providerTaxId}</dd>
          </div>
          <div>
            <dt>Service location</dt>
            <dd>{scenario.patient.location}</dd>
          </div>
          <div>
            <dt>Payer network status</dt>
            <dd>{scenario.insurance.network}</dd>
          </div>
        </dl>
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

      <div className="account-review-row">
        <div>
          <span className="system-kicker">Account balance review</span>
          <p>
            Confirm the open insurance amount and service-line charges before
            continuing the investigation.
          </p>
        </div>
        <button
          type="button"
          className={reviewed ? "review-control reviewed" : "review-control"}
          onClick={onReviewed}
        >
          {reviewed ? "Balance reviewed ✓" : "Mark balance reviewed"}
        </button>
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
    </div>
  );
}

function DocumentsView({ scenario }: { scenario: ArScenario }) {
  const [selectedDocument, setSelectedDocument] = useState(0);
  const supplementalLetters = [
    {
      type: "Electronic eligibility response",
      date: dateBefore(scenario.patient.dos, 14),
      reference: `271-${scenario.patient.account}`,
      summary:
        "Initial electronic eligibility and benefits verification completed before the date of service.",
      codes: "270/271 · Active coverage · Benefits returned",
      body: `An electronic 270 eligibility inquiry was submitted for ${scenario.patient.name}. The payer 271 response confirmed ${scenario.patient.plan} coverage as ${scenario.insurance.termination.toLowerCase()}, ${scenario.insurance.network.toLowerCase()} participation, and ${scenario.insurance.coordination.toLowerCase()} order for the requested service period. Benefit verification is not a guarantee of payment; claim processing remains subject to authorization, medical necessity, coding, contract, and plan rules.`,
    },
    {
      type: "Provider contract",
      date: scenario.contract.effective,
      reference: `CONTRACT-${scenario.patient.payer.replace(/\W/g, "").toUpperCase()}-2026`,
      summary:
        "Full participating-provider reimbursement schedule with multiple service categories, covered codes, methods, and rates.",
      codes: "Exhibit B · Reimbursement schedule",
      body: scenario.contract.terms,
    },
    {
      type: "Payer determination letter",
      date: scenario.portal.finalized,
      reference: `LTR-${scenario.portal.icn}`,
      summary:
        "Written payer determination with the claim status, response rights, and submission deadline.",
      codes: "Payer correspondence · Action required",
      body: `Dear Provider: We completed our review of claim ${scenario.portal.icn} for ${scenario.patient.name}, date of service ${scenario.patient.dos}. ${scenario.portal.reason} ${scenario.portal.nextStep} Keep this letter with the EOB and include the payer claim number on any follow-up submission.`,
    },
    {
      type: "Provider follow-up letter",
      date: "Jul 25, 2026",
      reference: `EVG-${scenario.claim.claimId}-FUP`,
      summary:
        "Provider request for reconsideration, reprocessing, or written clarification.",
      codes: "Provider correspondence · Draft evidence",
      body: `To ${scenario.patient.payer} Provider Services: Evergreen Medical Group requests detailed review of claim ${scenario.portal.icn} for ${scenario.patient.name}, DOS ${scenario.patient.dos}. The account reflects ${money(scenario.claim.openAr)} in open insurance receivables. Please review the attached claim history, remittance, and supporting account records, then issue a written determination or reprocess the claim as supported. Direct correspondence to Evergreen Medical Group, Revenue Cycle Back End Operations.`,
    },
  ];
  const documents = [
    ...scenario.documents.filter(
      (item) => !item.type.toLowerCase().includes("contract"),
    ),
    ...supplementalLetters,
  ];
  const document = documents[selectedDocument];

  return (
    <div className="ar-section">
      <div className="system-section-heading">
        <div>
          <span className="system-kicker">Document center</span>
          <h3>EOBs, acknowledgments, letters & correspondence</h3>
          <p>
            Select a document type and upload date, then review its native-style
            record in the preview.
          </p>
        </div>
      </div>
      <div className="document-review-layout">
        <aside className="ar-document-grid document-index document-list">
          <div className="document-list-heading">
            <div>
              <span>Account documents</span>
              <strong>{documents.length} files</strong>
            </div>
            <small>Sorted by account record</small>
          </div>
          {documents.map((item, index) => (
            <button
              type="button"
              key={item.reference}
              className={selectedDocument === index ? "selected" : ""}
              onClick={() => setSelectedDocument(index)}
            >
              <span className="document-type-icon" aria-hidden="true">
                {item.type.toLowerCase().includes("eligibility")
                  ? "ELG"
                  : item.type.toLowerCase().includes("contract")
                    ? "CTR"
                  : item.type.toLowerCase().includes("letter")
                    ? "LTR"
                    : isDocumentEob(item.type)
                      ? "EOB"
                      : "DOC"}
              </span>
              <div className="document-list-copy">
                <strong>{item.type}</strong>
                <small>Date uploaded · {item.date}</small>
              </div>
              <span className="document-open-arrow" aria-hidden="true">›</span>
            </button>
          ))}
        </aside>

        <article className="pdf-document-page">
          <div className="pdf-document-toolbar">
            <span>Document preview · Page 1 of 1</span>
            <strong>{document.reference}</strong>
          </div>
          <DocumentPreview scenario={scenario} document={document} />
        </article>
      </div>
    </div>
  );
}

function isDocumentEob(type: string) {
  const normalized = type.toLowerCase();
  return normalized.includes("eob") || normalized.includes("era");
}

function DocumentPreview({
  scenario,
  document,
}: {
  scenario: ArScenario;
  document: ArScenario["documents"][number];
}) {
  const type = document.type.toLowerCase();
  const isEob = isDocumentEob(type);
  const isEligibility = type.includes("eligibility");
  const isContract = type.includes("contract");
  const isClinical =
    type.includes("clinical") ||
    type.includes("medical record") ||
    type.includes("medication record") ||
    type.includes("provider query");
  const isAcknowledgment =
    type.includes("277ca") ||
    type.includes("acknowledg") ||
    type.includes("clearinghouse");
  const isPatientCorrespondence =
    type.includes("patient correspondence") || type.includes("patient message");
  const isAuthorization =
    type.includes("authorization") || type.includes("referral");
  const isPayerLetter =
    type.includes("payer") || type.includes("determination");
  const isInternalReview =
    type.includes("coding review") || type.includes("claim image");

  if (isEob) {
    return (
      <div className="pdf-document-sheet format-eob">
        <header className="eob-letterhead">
          <div>
            <span className="payer-logo-block">HB</span>
            <div>
              <strong>{scenario.patient.payer}</strong>
              <small>Provider Remittance Advice</small>
            </div>
          </div>
          <div>
            <span>Remittance date</span>
            <strong>{document.date}</strong>
            <small>ICN {scenario.portal.icn}</small>
          </div>
        </header>
        <div className="pdf-document-address">
          <div>
            <span>Patient / member</span>
            <strong>{scenario.patient.name}</strong>
            <p>{scenario.patient.memberId}</p>
          </div>
          <div>
            <span>Billing provider</span>
            <strong>Evergreen Medical Group</strong>
            <p>NPI {scenario.patient.providerNpi}</p>
          </div>
          <div>
            <span>Claim</span>
            <strong>{scenario.portal.icn}</strong>
            <p>DOS {scenario.patient.dos}</p>
          </div>
        </div>
        <div className="pdf-eob-summary">
          {[
            ["Total billed", scenario.portal.claimBilled],
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
        <div className="pdf-document-explanation">
          <span>Remittance explanation</span>
          <p>{document.body}</p>
          <strong>{document.codes}</strong>
        </div>
        <DocumentFooter />
      </div>
    );
  }

  if (isEligibility) {
    return (
      <div className="pdf-document-sheet format-eligibility">
        <div className="eligibility-transaction-head">
          <span>271</span>
          <div>
            <strong>Electronic Eligibility & Benefits Response</strong>
            <small>{scenario.patient.payer} · X12 005010X279A1</small>
          </div>
          <div>
            <small>Response date</small>
            <strong>{document.date}</strong>
          </div>
        </div>
        <div className="eligibility-response-sheet">
          <div className="eligibility-status-banner">
            <span>Coverage status</span>
            <strong>Active coverage returned</strong>
            <small>Trace {document.reference}</small>
          </div>
          <dl>
            {[
              ["Member / insurance ID", scenario.patient.memberId],
              ["Health plan", scenario.patient.plan],
              [
                "Eligibility period",
                `${scenario.insurance.effective} through ${scenario.insurance.termination}`,
              ],
              ["Network", scenario.insurance.network],
              ["Coordination of benefits", scenario.insurance.coordination],
              ["Requested service date", scenario.patient.dos],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="eligibility-disclaimer">
            <strong>Electronic response detail</strong>
            <p>{document.body}</p>
          </div>
        </div>
        <DocumentFooter />
      </div>
    );
  }

  if (isContract) {
    return (
      <div className="pdf-document-sheet format-contract">
        <header className="contract-letterhead">
          <div>
            <span>Evergreen Medical Group</span>
            <h3>Participating Provider Agreement</h3>
            <p>Exhibit B — Reimbursement Schedule</p>
          </div>
          <div>
            <span>Contract year</span>
            <strong>2026</strong>
            <small>Effective {scenario.contract.effective}</small>
          </div>
        </header>
        <div className="contract-parties">
          <p>
            This schedule is incorporated into the participating-provider
            agreement between Evergreen Medical Group and{" "}
            {scenario.patient.payer}. Covered services are reimbursed according
            to the code-specific provision below, subject to eligibility,
            authorization, coding, and coordination-of-benefits requirements.
          </p>
        </div>
        <ContractScheduleTable scenario={scenario} />
        <div className="contract-provisions">
          <h4>General reimbursement provisions</h4>
          <ol>
            <li>Only covered, medically necessary, properly billed services are payable.</li>
            <li>Case rates include related same-day services when the schedule states that they are bundled.</li>
            <li>Patient responsibility and other primary coverage reduce the payer payment, not the contracted allowed amount.</li>
            <li>The provider must report a pricing discrepancy within the claim-dispute filing period.</li>
          </ol>
        </div>
        <div className="contract-signatures">
          <span>Evergreen Medical Group</span>
          <span>{scenario.patient.payer}</span>
        </div>
        <DocumentFooter />
      </div>
    );
  }

  if (isClinical) {
    return (
      <div className="pdf-document-sheet format-clinical">
        <header className="clinical-letterhead">
          <div>
            <span className="clinical-mark">EMG</span>
            <div>
              <strong>{scenario.patient.location}</strong>
              <small>Clinical Records Packet · Fictional Training Record</small>
            </div>
          </div>
          <div>
            <span>Packet ID</span>
            <strong>{document.reference}</strong>
            <small>Uploaded {document.date}</small>
          </div>
        </header>
        <div className="clinical-demographics">
          {[
            ["Patient", scenario.patient.name],
            ["DOB", scenario.patient.dob],
            ["Member ID", scenario.patient.memberId],
            ["Encounter date", scenario.patient.dos],
            ["Ordering / treating provider", scenario.patient.provider],
            ["NPI", scenario.patient.providerNpi],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <section className="clinical-note-section">
          <h4>History of present illness</h4>
          <p>
            Patient presented for the documented services after symptoms
            persisted despite an appropriate course of conservative management.
            The treating provider reviewed prior findings, current functional
            limitations, medication response, and relevant risk factors before
            ordering or performing the services listed in this packet.
          </p>
        </section>
        <section className="clinical-note-section">
          <h4>Services and clinical support</h4>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Service</th>
                <th>Units</th>
                <th>Clinical record entry</th>
              </tr>
            </thead>
            <tbody>
              {scenario.claim.services.map((service) => (
                <tr key={service.cpt}>
                  <td>{service.cpt}</td>
                  <td>{service.description}</td>
                  <td>{service.units}</td>
                  <td>
                    Signed order, encounter note, and result or administration
                    record included.
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="clinical-note-section">
          <h4>Assessment and plan</h4>
          <p>
            The documented service was selected after review of the patient’s
            history and examination. Records supporting the service, relevant
            authorization, results, and follow-up plan are included for payer
            review. {document.body}
          </p>
        </section>
        <div className="clinical-signature">
          <span>Electronically signed by</span>
          <strong>{scenario.patient.provider}, MD</strong>
          <small>NPI {scenario.patient.providerNpi} · {document.date}</small>
        </div>
        <DocumentFooter />
      </div>
    );
  }

  if (isAcknowledgment) {
    return (
      <div className="pdf-document-sheet format-acknowledgment">
        <div className="ack-terminal-head">
          <span>X12 277CA</span>
          <strong>Health Care Claim Acknowledgment</strong>
          <small>Clearinghouse response · {document.date}</small>
        </div>
        <div className="ack-status-grid">
          {[
            ["Patient control", scenario.claim.claimId],
            ["Payer claim control", scenario.portal.icn],
            ["Billing provider NPI", scenario.patient.providerNpi],
            ["Total claim charge", money(scenario.claim.billed)],
            ["Acknowledgment status", document.codes],
            ["Reference", document.reference],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <pre className="ack-raw-record">{`ST*277*0001~
HL*1**20*1~
NM1*PR*2*${scenario.patient.payer.toUpperCase()}*****PI~
TRN*2*${document.reference.replace(/\W/g, "")}~
STC*A1:19*${document.date}*WQ*${scenario.claim.billed.toFixed(2)}~
REF*1K*${scenario.portal.icn}~
SE*7*0001~`}</pre>
        <div className="ack-explanation">
          <strong>Response explanation</strong>
          <p>{document.body}</p>
        </div>
        <DocumentFooter />
      </div>
    );
  }

  if (isAuthorization) {
    return (
      <div className="pdf-document-sheet format-authorization">
        <header>
          <div>
            <span>{scenario.patient.payer}</span>
            <h3>Authorization / Referral Determination</h3>
          </div>
          <strong className="authorization-status">
            {scenario.authorization.status}
          </strong>
        </header>
        <div className="authorization-number">
          <span>Authorization number</span>
          <strong>{scenario.authorization.number}</strong>
        </div>
        <dl>
          {[
            ["Member", `${scenario.patient.name} · ${scenario.patient.memberId}`],
            ["Rendering provider", scenario.patient.provider],
            ["Service location", scenario.patient.location],
            ["Approved span", scenario.authorization.span],
            ["Approved services", scenario.authorization.services],
            ["Reference", document.reference],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="authorization-notice">
          <p>{document.body}</p>
          <strong>{scenario.authorization.notes}</strong>
        </div>
        <DocumentFooter />
      </div>
    );
  }

  if (isPatientCorrespondence) {
    return (
      <div className="pdf-document-sheet format-patient-correspondence">
        <header className="patient-message-head">
          <div>
            <span className="patient-message-avatar">
              {scenario.patient.name
                .split(" ")
                .map((part) => part[0])
                .join("")}
            </span>
            <div>
              <strong>Patient Portal Message</strong>
              <small>Correspondence Center · Attachment received</small>
            </div>
          </div>
          <div>
            <span>Received</span>
            <strong>{document.date}</strong>
            <small>{document.reference}</small>
          </div>
        </header>
        <div className="patient-message-metadata">
          <div><span>From</span><strong>{scenario.patient.name}</strong></div>
          <div><span>Account</span><strong>{scenario.patient.account}</strong></div>
          <div><span>Subject</span><strong>Other insurance information</strong></div>
        </div>
        <section className="patient-message-body">
          <span>Message</span>
          <p>{document.body.replace(/^Patient message:\s*/i, "")}</p>
        </section>
        <section className="patient-attachment-section">
          <div className="patient-attachment-heading">
            <div>
              <span>Attachments</span>
              <strong>
                {document.attachments?.length || 0} files · Insurance card
              </strong>
            </div>
            <small>Uploaded through the fictional patient portal</small>
          </div>
          <div className="insurance-card-attachments">
            {document.attachments?.map((attachment) => (
              <article
                className={`insurance-card-attachment card-${attachment.side.toLowerCase()}`}
                key={`${attachment.name}-${attachment.side}`}
              >
                <header>
                  <div>
                    <span className="summit-card-mark">S</span>
                    <div>
                      <strong>SUMMIT</strong>
                      <small>Employer Health</small>
                    </div>
                  </div>
                  <span>{attachment.side}</span>
                </header>
                <dl>
                  {attachment.fields.map((field) => (
                    <div key={field.label}>
                      <dt>{field.label}</dt>
                      <dd>{field.value}</dd>
                    </div>
                  ))}
                </dl>
                <footer>Fictional training card · Not valid insurance</footer>
              </article>
            ))}
          </div>
        </section>
        <DocumentFooter />
      </div>
    );
  }

  if (isPayerLetter) {
    return (
      <div className="pdf-document-sheet format-payer-letter">
        <header className="payer-correspondence-head">
          <div>
            <span className="payer-wordmark">
              {scenario.patient.payer.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{scenario.patient.payer}</strong>
              <small>Provider Claims Correspondence</small>
            </div>
          </div>
          <p>{document.date}</p>
        </header>
        <div className="letter-recipient">
          <strong>Evergreen Medical Group</strong>
          <span>Revenue Cycle Back End Operations</span>
          <span>{scenario.patient.location}</span>
        </div>
        <div className="payer-reference-box">
          <span>Member: {scenario.patient.name}</span>
          <span>Member ID: {scenario.patient.memberId}</span>
          <span>Claim: {scenario.portal.icn}</span>
          <span>DOS: {scenario.patient.dos}</span>
        </div>
        <div className="payer-letter-copy">
          <p>Dear Provider:</p>
          <p>{document.body}</p>
          <p>
            When responding, include the claim number and this correspondence
            reference: <strong>{document.reference}</strong>.
          </p>
          <p>Sincerely,<br />Provider Claims Resolution Unit</p>
        </div>
        <DocumentFooter />
      </div>
    );
  }

  if (isInternalReview) {
    return (
      <div className="pdf-document-sheet format-internal-review">
        <div className="internal-review-head">
          <span>INTERNAL</span>
          <div>
            <h3>Claim Review Memorandum</h3>
            <p>Evergreen Medical Group · Revenue Integrity</p>
          </div>
          <strong>{document.date}</strong>
        </div>
        <dl>
          <div><dt>Account</dt><dd>{scenario.patient.account}</dd></div>
          <div><dt>Claim</dt><dd>{scenario.claim.claimId}</dd></div>
          <div><dt>Reviewer reference</dt><dd>{document.reference}</dd></div>
          <div><dt>Classification</dt><dd>{document.codes}</dd></div>
        </dl>
        <section>
          <h4>Review findings</h4>
          <p>{document.body}</p>
        </section>
        <section>
          <h4>Claim service lines reviewed</h4>
          <ul>
            {scenario.claim.services.map((service) => (
              <li key={service.cpt}>
                {service.cpt} · {service.description} · {service.units} unit(s)
              </li>
            ))}
          </ul>
        </section>
        <DocumentFooter />
      </div>
    );
  }

  return (
    <div className="pdf-document-sheet format-provider-letter">
      <header>
        <div>
          <strong>EVERGREEN</strong>
          <span>Medical Group</span>
        </div>
        <small>{document.date}</small>
      </header>
      <div className="provider-letter-address">
        <strong>{scenario.patient.payer} Provider Services</strong>
        <span>Claims Review Department</span>
      </div>
      <div className="provider-letter-reference">
        Re: {scenario.patient.name} · {scenario.patient.memberId} · DOS{" "}
        {scenario.patient.dos} · Claim {scenario.portal.icn}
      </div>
      <div className="pdf-letter-body">
        <p>To the Claims Review Team:</p>
        <p>{document.body}</p>
        <p>
          Sincerely,
          <br />
          Revenue Cycle Back End Operations
          <br />
          Evergreen Medical Group
        </p>
      </div>
      <DocumentFooter />
    </div>
  );
}

function DocumentFooter() {
  return (
    <footer>
      Fictional training document · Not a real clinical, payer, or contract
      record
    </footer>
  );
}

function AccountNotesView({
  scenario,
  postedNotes,
}: {
  scenario: ArScenario;
  postedNotes: PostedAccountNote[];
}) {
  const [filter, setFilter] = useState<AccountHistoryFilter>("all");
  const collectorNotes = [
    ...scenario.previousNotes,
    ...postedNotes.map((note) => ({
      date: note.date,
      author: note.author,
      department: note.department,
      note: [
        `Issue: ${note.issue}`,
        `Findings: ${note.findings}`,
        `Resolution: ${note.resolution}`,
        `Source: ${note.source}; representative ${note.representative}; reference ${note.reference}; follow-up ${note.followUp}.`,
      ].join(" "),
    })),
  ];
  const filters: { id: AccountHistoryFilter; label: string }[] = [
    { id: "all", label: "All activity" },
    { id: "billing", label: "Billing history" },
    { id: "financial", label: "Financial transactions" },
    { id: "notes", label: "Collector notes" },
  ];

  return (
    <div className="account-notes-view">
      <section className="account-history-header">
        <div>
          <span className="system-kicker">Historical account data</span>
          <h3>Account Notes</h3>
          <p>
            Review the complete account story or filter by record type before
            taking new action.
          </p>
        </div>
        <div className="account-history-filters" aria-label="Filter account history">
          {filters.map((item) => (
            <button
              type="button"
              key={item.id}
              className={filter === item.id ? "selected" : ""}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {filter === "all" || filter === "billing" ? (
        <section className="ar-section account-history-section">
          <div className="system-section-heading compact-system-heading">
            <div>
              <span className="system-kicker">Billing history</span>
              <h3>Claim story to date</h3>
            </div>
            <small>{scenario.billingHistory.length} recorded events</small>
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
        </section>
      ) : null}

      {filter === "all" || filter === "financial" ? (
        <section className="ar-section account-history-section">
        <div className="system-section-heading compact-system-heading">
          <div>
            <span className="system-kicker">Financial ledger</span>
              <h3>Financial transactions</h3>
          </div>
            <small>{scenario.transactions.length} ledger entries</small>
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
          <div className="related-history-block">
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
        </section>
      ) : null}

      {filter === "all" || filter === "notes" ? (
        <section className="ar-section account-history-section">
          <div className="system-section-heading compact-system-heading">
            <div>
              <span className="system-kicker">Collectors notes</span>
              <h3>Collector and department notes</h3>
            </div>
            <small>{collectorNotes.length} posted notes</small>
          </div>
          <div className="previous-note-list">
            {collectorNotes.map((note, index) => (
              <article
                className={
                  index >= scenario.previousNotes.length
                    ? "learner-posted-note"
                    : ""
                }
                key={`${note.date}-${note.author}-${index}`}
              >
                <div>
                  <strong>{note.author}</strong>
                  <span>{note.department}</span>
                  <small>{note.date}</small>
                </div>
                <p>{note.note}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
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
          <dt>Payer</dt>
          <dd>{scenario.patient.payer}</dd>
          <dt>Member / insurance ID</dt>
          <dd>{scenario.patient.memberId}</dd>
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
    patientName: string;
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
    key: "patientName" | "memberId" | "providerId" | "dob" | "dos",
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
            <h3>Payer website</h3>
          </div>
        </div>

        <div className="portal-search-form">
          <div className="portal-search-banner">
            <span>Provider claim search</span>
            <strong>{scenario.patient.payer}</strong>
          </div>
          <div className="portal-credential-grid">
            <label>
              <span>Patient name</span>
              <input
                value={portalCredentials.patientName}
                onChange={(event) =>
                  onPortalCredential("patientName", event.target.value)
                }
                placeholder="First and last name"
              />
            </label>
            <label>
              <span>Member ID (or use patient name)</span>
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
                type="date"
                value={portalCredentials.dob}
                onChange={(event) =>
                  onPortalCredential("dob", event.target.value)
                }
              />
            </label>
            <label>
              <span>Date of service</span>
              <input
                type="date"
                value={portalCredentials.dos}
                onChange={(event) =>
                  onPortalCredential("dos", event.target.value)
                }
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
  const contractFields: {
    key: keyof CalculatorState;
    label: string;
    suffix?: string;
  }[] =
    scenario.contract.method === "percent-charge"
      ? [
          { key: "billed", label: "Covered billed charges" },
          { key: "percent", label: "Contract percentage", suffix: "%" },
        ]
      : [
          {
            key: "rate",
            label:
              scenario.contract.method === "case-rate"
                ? "Applicable case rate"
                : "Total code-specific fee-schedule allowance",
          },
        ];
  const fields: { key: keyof CalculatorState; label: string; suffix?: string }[] = [
    ...contractFields,
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
          Match the claim’s billed codes to the full contract schedule, identify
          each applicable rate, multiply per-unit rates by the billed units,
          total the service-line allowances, then compute the expected payment.
        </p>
        <section className="contract-document-view">
          <header>
            <div>
              <span>Evergreen Medical Group</span>
              <h4>Participating Provider Reimbursement Schedule</h4>
              <p>{scenario.contract.name}</p>
            </div>
            <div>
              <span>Effective</span>
              <strong>{scenario.contract.effective}</strong>
              <small>Exhibit B · Fictional training contract</small>
            </div>
          </header>
          <ContractScheduleTable scenario={scenario} />
          <footer>
            Locate each claim code in this schedule. Fee-schedule rates are
            assigned to individual codes; add the applicable service-line
            allowances before comparing them with the payer’s allowed amount.
          </footer>
        </section>
        <section className="claim-code-reference">
          <div>
            <span className="system-kicker">Claim being analyzed</span>
            <h4>Service-line code reference</h4>
          </div>
          <div className="system-table-wrap">
            <table className="system-table reimbursement-service-table">
              <thead>
                <tr>
                  <th>CPT</th>
                  <th>Service</th>
                  <th>Units</th>
                  <th>Billed charge</th>
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
        </section>
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
        {calculation ? (
          <div className="allowed-comparison">
            <div>
              <span>Insurance allowed amount</span>
              <strong>{money(scenario.portal.claimAllowed)}</strong>
            </div>
            <div>
              <span>Provider expected reimbursement</span>
              <strong>{money(calculation.allowed)}</strong>
            </div>
            <div>
              <span>Allowed discrepancy</span>
              <strong>
                {money(calculation.allowed - scenario.portal.claimAllowed)}
              </strong>
            </div>
          </div>
        ) : null}
        <p className={valid ? "calculator-feedback valid" : "calculator-feedback"}>
          {feedback || "Enter the account evidence and calculate when ready."}
        </p>
        {valid ? (
          <div className="reimbursement-reminder" role="status">
            <strong>Before closing any account</strong>
            <p>
              Always compare the insurance allowed amount with the provider’s
              expected reimbursement. Investigate and document every discrepancy
              before deciding the next action.
            </p>
          </div>
        ) : null}
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
        {selectedAction === "send-task" ? (
          <>
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
              <span>Request note</span>
              <textarea
                value={decisionReason}
                onChange={(event) => onReason(event.target.value)}
                placeholder="Write a clear request for the receiving department: state the issue, evidence reviewed, exact action needed, amount, and deadline."
              />
            </label>
          </>
        ) : null}
        <button type="button" className="system-primary-button" onClick={onValidate}>
          Commit decision for validation
        </button>
      </div>

      <aside className={valid ? "decision-validation valid" : "decision-validation"}>
        <span>{valid ? "✓" : "?"}</span>
        <h3>{valid ? "Decision supported" : "No answer revealed yet"}</h3>
        <p>
          {feedback ||
            "The simulator will validate the action. A destination and request note are checked only when Send task / escalation is selected."}
        </p>
      </aside>
    </div>
  );
}

function AppealView({
  scenario,
  draft,
  method,
  attachments,
  submitted,
  feedback,
  onDraft,
  onMethod,
  onAttachment,
  onSubmit,
}: {
  scenario: AppealScenario;
  draft: { recipient: string; subject: string; body: string };
  method: "electronic" | "mail" | "";
  attachments: string[];
  submitted: boolean;
  feedback: string;
  onDraft: (key: "recipient" | "subject" | "body", value: string) => void;
  onMethod: (value: "electronic" | "mail") => void;
  onAttachment: (attachment: string) => void;
  onSubmit: () => void;
}) {
  const denial = "denial" in scenario
    ? (scenario as DenialScenario).denial
    : null;
  const isReconsideration =
    scenario.appeal.category === "pricing-reconsideration";

  return (
    <div className="appeal-workbench">
      <section className="appeal-editor-panel">
        <div className="system-section-heading">
          <div>
            <span className="system-kicker">
              {isReconsideration
                ? "Editable pricing reconsideration letter"
                : "Editable appeal letter"}
            </span>
            <h3>
              {isReconsideration
                ? "Document the underpayment and missing support"
                : "Build the argument from the account evidence"}
            </h3>
            <p>
              The template is a starting point. Edit it so the request,
              evidence, dates, claim identifiers, and requested payment support
              this account.
            </p>
          </div>
          <span className={scenario.appeal.required ? "deadline-badge urgent" : "deadline-badge"}>
            {scenario.appeal.required
              ? isReconsideration
                ? "Pricing reconsideration indicated"
                : "Appeal indicated"
              : "Confirm the correct first action"}
          </span>
        </div>

        <div className="denial-fact-strip">
          <div>
            <span>{denial ? "CARC / RARC" : "Dispute type"}</span>
            <strong>
              {denial
                ? `${denial.carc} · ${denial.rarc}`
                : "Contract pricing underpayment"}
            </strong>
          </div>
          <div>
            <span>{denial ? "Denied amount" : "Additional payment due"}</span>
            <strong>
              {money(denial ? denial.deniedAmount : scenario.expected.variance)}
            </strong>
          </div>
          <div>
            <span>Submission deadline</span>
            <strong>
              {denial ? denial.deadline : scenario.claim.appealDeadline}
            </strong>
          </div>
        </div>

        <label>
          <span>{isReconsideration ? "Reconsideration recipient" : "Appeal recipient"}</span>
          <input
            value={draft.recipient}
            onChange={(event) => onDraft("recipient", event.target.value)}
          />
        </label>
        <label>
          <span>Subject / claim reference</span>
          <input
            value={draft.subject}
            onChange={(event) => onDraft("subject", event.target.value)}
          />
        </label>
        <label>
          <span>{isReconsideration ? "Pricing reconsideration letter" : "Appeal letter"}</span>
          <textarea
            className="appeal-letter-textarea"
            value={draft.body}
            onChange={(event) => onDraft("body", event.target.value)}
          />
        </label>
      </section>

      <aside className="appeal-submission-panel">
        <span className="system-kicker">Submission request</span>
        <h3>Choose the delivery channel</h3>
        <p>
          Confirm the payer destination and include every document named in the
          {isReconsideration ? " reconsideration request." : " appeal."}
        </p>

        <div className="submission-methods">
          <button
            type="button"
            className={method === "electronic" ? "selected" : ""}
            onClick={() => onMethod("electronic")}
          >
            <span>Electronic</span>
            <strong>{scenario.appeal.electronicRoute}</strong>
          </button>
          <button
            type="button"
            className={method === "mail" ? "selected" : ""}
            onClick={() => onMethod("mail")}
          >
            <span>Mail</span>
            <strong>{scenario.appeal.mailingAddress}</strong>
          </button>
        </div>

        <div className="appeal-attachments">
          <strong>Attachment checklist</strong>
          {scenario.appeal.attachments.map((attachment) => (
            <label key={attachment}>
              <input
                type="checkbox"
                checked={attachments.includes(attachment)}
                onChange={() => onAttachment(attachment)}
              />
              <span>{attachment}</span>
            </label>
          ))}
        </div>

        <button
          type="button"
          className="system-primary-button"
          disabled={submitted}
          onClick={onSubmit}
        >
          {submitted ? "Submission request sent ✓" : "Send submission request"}
        </button>

        {feedback ? (
          <div
            className={
              submitted
                ? "appeal-submission-feedback success"
                : "appeal-submission-feedback"
            }
            role="status"
          >
            <strong>{submitted ? "Successful" : "Review required"}</strong>
            <p>{feedback}</p>
          </div>
        ) : null}
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
  notes: AccountNoteFields;
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
            <span>Follow-up date</span>
            <input
              type="date"
              value={notes.followUp}
              onChange={(event) => onChange("followUp", event.target.value)}
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
