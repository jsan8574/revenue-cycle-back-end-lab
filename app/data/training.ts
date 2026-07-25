export type ModuleId =
  | "payment-posting"
  | "ar-collections"
  | "denial-management";

export type TimelineItem = {
  date: string;
  title: string;
  detail: string;
  actor: string;
};

export type WorkflowStep = {
  label: string;
  kicker: string;
  instruction: string;
  evidence: string[];
  prompt: string;
  listenFor: string;
};

export type Scenario = {
  id: string;
  title: string;
  subtitle: string;
  priority: "Routine" | "Priority" | "High risk";
  status: string;
  amount: string;
  age: string;
  account: string;
  payer: string;
  owner: string;
  story: string;
  mission: string;
  facts: { label: string; value: string }[];
  breakdown: { label: string; value: string; tone?: "accent" | "muted" }[];
  steps: WorkflowStep[];
  history: TimelineItem[];
  notePrompts: string[];
  documentLines?: {
    cpt: string;
    billed: string;
    allowed: string;
    paid: string;
    adjustment: string;
    patient: string;
    codes: string;
  }[];
  correspondence?: {
    title: string;
    date: string;
    reference: string;
    body: string;
  };
};

export type TrainingModule = {
  id: ModuleId;
  navLabel: string;
  title: string;
  eyebrow: string;
  description: string;
  accent: string;
  soft: string;
  metric: string;
  metricLabel: string;
  scenarios: Scenario[];
};

const postingSteps: WorkflowStep[] = [
  {
    label: "Validate",
    kicker: "Confirm the source",
    instruction:
      "Match the deposit, trace, payer, and remittance date before posting any transaction.",
    evidence: [
      "Compare EFT total to the bank deposit",
      "Validate payer and trace number",
      "Confirm the remittance belongs to the correct entity",
    ],
    prompt: "What must match before this batch can be opened?",
    listenFor:
      "The trainee verifies source controls first and does not force an out-of-balance batch.",
  },
  {
    label: "Map",
    kicker: "Read the remittance",
    instruction:
      "Identify claims, service lines, adjustment groups, and patient responsibility amounts.",
    evidence: [
      "Map claim and service-line identifiers",
      "Interpret CARC/RARC combinations",
      "Separate payments, contractuals, and patient responsibility",
    ],
    prompt: "Which adjustment belongs to contract and which requires follow-up?",
    listenFor:
      "Correct group-code logic and attention to claim-level versus service-line detail.",
  },
  {
    label: "Post",
    kicker: "Apply accurately",
    instruction:
      "Post payments and adjustments to the correct encounters using the ERA as the source of truth.",
    evidence: [
      "Apply payment by service line",
      "Use the approved adjustment reason",
      "Preserve unapplied funds when research is still required",
    ],
    prompt: "Where would you place an amount you cannot safely identify?",
    listenFor:
      "The trainee uses the suspense or unapplied process rather than guessing.",
  },
  {
    label: "Reconcile",
    kicker: "Balance the batch",
    instruction:
      "Account for every cent across payments, reversals, adjustments, and unresolved exceptions.",
    evidence: [
      "Tie system batch to EFT total",
      "Review variances and duplicate risk",
      "Document each remaining exception",
    ],
    prompt: "What explains the difference between the EFT and posted total?",
    listenFor:
      "A complete variance equation, not a workaround or unsupported write-off.",
  },
  {
    label: "Finalize",
    kicker: "Release with evidence",
    instruction:
      "Close the batch only after totals balance and the exception path is documented.",
    evidence: [
      "Attach or reference the remittance",
      "Route exceptions to the correct queue",
      "Record batch ID, total, and completion status",
    ],
    prompt: "What evidence should an auditor see tomorrow?",
    listenFor:
      "A traceable record connecting the deposit, remittance, posting batch, and exception work.",
  },
];

const arSteps: WorkflowStep[] = [
  {
    label: "Prioritize",
    kicker: "Choose the next account",
    instruction:
      "Use age, balance, filing limits, and prior actions to confirm why this account is actionable now.",
    evidence: [
      "Check days in AR and balance",
      "Identify timely filing or appeal deadline",
      "Review last meaningful touch",
    ],
    prompt: "Why should this account be worked today instead of next week?",
    listenFor:
      "The trainee connects urgency to a concrete deadline, value, or stalled follow-up.",
  },
  {
    label: "Research",
    kicker: "Build the account story",
    instruction:
      "Reconstruct submission, adjudication, follow-up, and contract history before contacting the payer.",
    evidence: [
      "Validate claim receipt and status",
      "Review ERA/EOB and contract terms",
      "Confirm earlier follow-up outcomes",
    ],
    prompt: "What evidence supports the amount you are asking the payer to move?",
    listenFor:
      "Claim facts, contractual support, and prior payer commitments are all connected.",
  },
  {
    label: "Contact",
    kicker: "Drive a payer action",
    instruction:
      "Use a concise call or portal inquiry to obtain a specific status, reason, and next action.",
    evidence: [
      "Confirm representative and reference number",
      "Ask for a processing date or action owner",
      "Restate the commitment before ending",
    ],
    prompt: "What exact commitment will you ask the payer to make?",
    listenFor:
      "The trainee asks for a dated, measurable action rather than accepting a vague reprocessing answer.",
  },
  {
    label: "Resolve",
    kicker: "Take the right account action",
    instruction:
      "Choose the correct escalation, corrected claim, appeal, or adjustment based on verified findings.",
    evidence: [
      "Match action to root cause",
      "Protect filing and appeal rights",
      "Avoid duplicate or unnecessary submissions",
    ],
    prompt: "What is the smallest action that will actually move this account?",
    listenFor:
      "A root-cause response with no duplicate billing and no unsupported adjustment.",
  },
  {
    label: "Follow up",
    kicker: "Set the next control",
    instruction:
      "Document the outcome and establish a purposeful follow-up date tied to the payer commitment.",
    evidence: [
      "Capture reference and representative",
      "Set a date based on stated turnaround",
      "Define the escalation if the commitment is missed",
    ],
    prompt: "What should the next collector do if nothing changes by that date?",
    listenFor:
      "A complete next-step note with a deadline and escalation route.",
  },
];

const denialSteps: WorkflowStep[] = [
  {
    label: "Classify",
    kicker: "Name the denial",
    instruction:
      "Confirm the claim, service line, denial codes, and responsible work queue.",
    evidence: [
      "Read CARC and RARC together",
      "Determine claim-level or line-level impact",
      "Check whether the denial is clinical or technical",
    ],
    prompt: "What is the payer actually asking us to correct or prove?",
    listenFor:
      "The trainee translates the code combination into a precise operational reason.",
  },
  {
    label: "Diagnose",
    kicker: "Find the root cause",
    instruction:
      "Compare claim data, documentation, authorization, and payer policy to find the first failure point.",
    evidence: [
      "Trace source registration and coding data",
      "Validate policy and authorization requirements",
      "Separate symptom from root cause",
    ],
    prompt: "Where did the process first break?",
    listenFor:
      "The trainee identifies a source issue instead of treating only the denial message.",
  },
  {
    label: "Correct",
    kicker: "Prepare the fix",
    instruction:
      "Choose a corrected claim, reconsideration, appeal, or non-billable action supported by the record.",
    evidence: [
      "Confirm correction is evidence-based",
      "Gather every required attachment",
      "Use the payer’s required channel",
    ],
    prompt: "Why is this the correct recovery path?",
    listenFor:
      "The trainee selects the path based on payer rules, not habit.",
  },
  {
    label: "Submit",
    kicker: "Protect the recovery",
    instruction:
      "Submit a complete package within the deadline and retain proof of transmission.",
    evidence: [
      "Verify filing or appeal limit",
      "Include claim, rationale, and attachments",
      "Capture confirmation or reference",
    ],
    prompt: "What would make the payer reject this package as incomplete?",
    listenFor:
      "A deadline-aware completeness check and clear proof of submission.",
  },
  {
    label: "Prevent",
    kicker: "Close the learning loop",
    instruction:
      "Document the outcome and identify a prevention action when the cause is repeatable.",
    evidence: [
      "Set payer follow-up date",
      "Tag the confirmed root cause",
      "Route a prevention insight to the upstream owner",
    ],
    prompt: "How could the next claim avoid this denial?",
    listenFor:
      "A specific upstream control, owner, and feedback path—not a generic reminder.",
  },
];

export const modules: TrainingModule[] = [
  {
    id: "payment-posting",
    navLabel: "Payment Posting",
    title: "Payment Posting",
    eyebrow: "Independent workstation",
    description:
      "Explore raw payment evidence, find the correct account and DOS, enter line-level transactions, and reconcile the batch.",
    accent: "#36a6a3",
    soft: "#e5f6f4",
    metric: "99.2%",
    metricLabel: "batch accuracy",
    scenarios: [
      {
        id: "PP-2401",
        title: "EFT / ERA variance",
        subtitle: "Harbor Blue · 38 claims",
        priority: "Priority",
        status: "$150 variance",
        amount: "$28,430.12",
        age: "Today",
        account: "BAT-0626-184",
        payer: "Harbor Blue PPO",
        owner: "Posting team A",
        story:
          "The bank shows a $28,430.12 EFT, but the ERA claim payments total $28,280.12. One service-line interest payment appears on the EFT addenda only.",
        mission:
          "Prove the $150 difference, post the remittance correctly, and close the batch with a traceable exception record.",
        facts: [
          { label: "EFT trace", value: "091000-772184" },
          { label: "Deposit date", value: "Jul 26, 2026" },
          { label: "Claims", value: "38" },
          { label: "Service lines", value: "64" },
          { label: "ERA total", value: "$28,280.12" },
          { label: "EFT total", value: "$28,430.12" },
        ],
        breakdown: [
          { label: "Claim payments", value: "$28,280.12" },
          { label: "Interest addenda", value: "$150.00" },
          { label: "Contractual adjustments", value: "$9,614.88", tone: "muted" },
          { label: "Expected batch", value: "$28,430.12", tone: "accent" },
        ],
        steps: postingSteps,
        history: [
          {
            date: "8:12 AM",
            title: "EFT received",
            detail: "Deposit imported from bank lockbox.",
            actor: "Treasury feed",
          },
          {
            date: "8:19 AM",
            title: "835 matched",
            detail: "ERA matched by trace; system flagged a $150 variance.",
            actor: "Auto posting",
          },
          {
            date: "8:36 AM",
            title: "Addenda located",
            detail: "PLB interest reference appears outside claim loops.",
            actor: "Queue analyst",
          },
        ],
        notePrompts: [
          "What caused the deposit-to-ERA variance?",
          "How was the non-claim amount posted?",
          "Which batch and trace prove reconciliation?",
        ],
      },
      {
        id: "PP-2407",
        title: "Reversal and recoupment",
        subtitle: "Crescent Choice · 6 claims",
        priority: "High risk",
        status: "Negative remit",
        amount: "−$1,275.00",
        age: "1 day",
        account: "BAT-0625-409",
        payer: "Crescent Choice",
        owner: "Posting exceptions",
        story:
          "A negative remittance reverses a prior payment on two claims and recoups the amount from four unrelated current payments.",
        mission:
          "Link every reversal to its original transaction, avoid duplicate takebacks, and reconcile the net deposit.",
        facts: [
          { label: "EFT trace", value: "114002-665409" },
          { label: "Original batch", value: "BAT-0516-088" },
          { label: "Reversed claims", value: "2" },
          { label: "Offset claims", value: "4" },
          { label: "PLB reason", value: "WO · overpayment" },
          { label: "Net remit", value: "−$1,275.00" },
        ],
        breakdown: [
          { label: "Current payments", value: "$4,860.00" },
          { label: "Claim reversals", value: "−$3,475.00" },
          { label: "PLB recoupment", value: "−$2,660.00" },
          { label: "Net batch", value: "−$1,275.00", tone: "accent" },
        ],
        steps: postingSteps,
        history: [
          {
            date: "Jul 25 · 4:10 PM",
            title: "Negative ERA imported",
            detail: "Batch routed to posting exceptions.",
            actor: "Auto posting",
          },
          {
            date: "May 16 · 2:05 PM",
            title: "Original payments posted",
            detail: "Both reversed claims were paid in batch BAT-0516-088.",
            actor: "Posting team B",
          },
          {
            date: "May 12 · 9:22 AM",
            title: "Claims adjudicated",
            detail: "Payer processed original claim versions.",
            actor: "Payer",
          },
        ],
        notePrompts: [
          "Which original transactions were reversed?",
          "How were offsets and PLB activity separated?",
          "What follow-up was routed for the overpayment reason?",
        ],
      },
      {
        id: "PP-2412",
        title: "Secondary split remit",
        subtitle: "Northstar Health · 14 claims",
        priority: "Routine",
        status: "Crossovers",
        amount: "$7,864.58",
        age: "Today",
        account: "BAT-0626-512",
        payer: "Northstar Health",
        owner: "Posting team C",
        story:
          "Fourteen secondary claims include mixed coinsurance payments, zero-pay crossovers, and one claim that does not match the patient control number.",
        mission:
          "Post valid service lines, preserve the unmatched payment, and balance the batch without forcing a patient match.",
        facts: [
          { label: "EFT trace", value: "031101-445812" },
          { label: "Claims", value: "14" },
          { label: "Zero-pay claims", value: "3" },
          { label: "Unmatched claim", value: "1" },
          { label: "EFT total", value: "$7,864.58" },
          { label: "Unmatched amount", value: "$286.40" },
        ],
        breakdown: [
          { label: "Matched payments", value: "$7,578.18" },
          { label: "Unapplied research", value: "$286.40" },
          { label: "Secondary adjustments", value: "$1,142.30", tone: "muted" },
          { label: "Controlled total", value: "$7,864.58", tone: "accent" },
        ],
        steps: postingSteps,
        history: [
          {
            date: "10:14 AM",
            title: "ERA imported",
            detail: "Thirteen claims matched automatically.",
            actor: "Auto posting",
          },
          {
            date: "10:18 AM",
            title: "Control number exception",
            detail: "One patient control number not found.",
            actor: "System edit",
          },
          {
            date: "10:25 AM",
            title: "Crossover validation complete",
            detail: "Medicare primary payments found for all valid claims.",
            actor: "Queue analyst",
          },
        ],
        notePrompts: [
          "Which payment remained unapplied and why?",
          "How were zero-pay claims handled?",
          "How does the batch still tie to the EFT?",
        ],
      },
    ],
  },
  {
    id: "ar-collections",
    navLabel: "AR Collections",
    title: "AR Collections",
    eyebrow: "Account investigation",
    description:
      "Navigate the full account, investigate with the payer, validate expected reimbursement, and defend the next action.",
    accent: "#d79a35",
    soft: "#fff5dd",
    metric: "18.4",
    metricLabel: "days to next action",
    scenarios: [
      {
        id: "AR-3106",
        title: "Contract underpayment",
        subtitle: "Northstar Health · commercial",
        priority: "Priority",
        status: "Variance confirmed",
        amount: "$2,480.00",
        age: "64 days",
        account: "CL-7719204",
        payer: "Northstar Health",
        owner: "Commercial pod",
        story:
          "The payer allowed the surgical claim but reimbursed below the contracted case rate. A prior representative said reprocessing was requested, but no change has posted.",
        mission:
          "Validate the contract variance, obtain a dated payer commitment, and protect the escalation path.",
        facts: [
          { label: "Date of service", value: "Apr 18, 2026" },
          { label: "Claim received", value: "Apr 24, 2026" },
          { label: "Contract case rate", value: "$12,600.00" },
          { label: "Payer allowed", value: "$10,120.00" },
          { label: "Last reference", value: "NS-884120" },
          { label: "Filing limit", value: "180 days" },
        ],
        breakdown: [
          { label: "Expected allowed", value: "$12,600.00" },
          { label: "Actual allowed", value: "$10,120.00" },
          { label: "Confirmed variance", value: "$2,480.00", tone: "accent" },
          { label: "Patient impact", value: "$0.00", tone: "muted" },
        ],
        steps: arSteps,
        history: [
          {
            date: "Jul 10 · 2:21 PM",
            title: "Reprocessing requested",
            detail: "Payer representative quoted 15–20 business days.",
            actor: "Ref NS-884120",
          },
          {
            date: "Jun 12 · 11:45 AM",
            title: "Contract variance validated",
            detail: "Case rate schedule effective Jan 1, 2026 confirmed.",
            actor: "Contract team",
          },
          {
            date: "May 3 · 6:02 AM",
            title: "Initial ERA posted",
            detail: "Claim paid with lower allowed amount; no denial.",
            actor: "Auto posting",
          },
        ],
        notePrompts: [
          "What contract evidence supports recovery?",
          "What did the payer commit to and by when?",
          "What is the next escalation if payment does not move?",
        ],
      },
      {
        id: "AR-3119",
        title: "Workers’ comp silence",
        subtitle: "Pioneer Casualty · work injury",
        priority: "High risk",
        status: "No response",
        amount: "$6,920.00",
        age: "96 days",
        account: "CL-7601138",
        payer: "Pioneer Casualty",
        owner: "Specialty AR",
        story:
          "The claim and records were acknowledged, but the adjuster has not issued a determination after two documented follow-ups.",
        mission:
          "Confirm jurisdictional timing, secure an adjuster action, and escalate without sending duplicate records.",
        facts: [
          { label: "Date of service", value: "Mar 6, 2026" },
          { label: "Injury date", value: "Mar 5, 2026" },
          { label: "Adjuster", value: "Case desk 47" },
          { label: "Records received", value: "Apr 2, 2026" },
          { label: "Claim number", value: "WC-558-291" },
          { label: "Last touch", value: "18 days ago" },
        ],
        breakdown: [
          { label: "Total charges", value: "$6,920.00" },
          { label: "Payments", value: "$0.00", tone: "muted" },
          { label: "Adjustments", value: "$0.00", tone: "muted" },
          { label: "Open AR", value: "$6,920.00", tone: "accent" },
        ],
        steps: arSteps,
        history: [
          {
            date: "Jul 8 · 9:40 AM",
            title: "Second adjuster message",
            detail: "Requested written status and decision date.",
            actor: "Collector J. Lee",
          },
          {
            date: "Jun 17 · 3:18 PM",
            title: "Receipt reconfirmed",
            detail: "Payer portal shows medical records attached.",
            actor: "Portal",
          },
          {
            date: "Apr 2 · 12:10 PM",
            title: "Records delivered",
            detail: "Secure upload confirmation RC-220147 retained.",
            actor: "Document team",
          },
        ],
        notePrompts: [
          "Which deadline or regulation makes this urgent?",
          "What evidence proves records were received?",
          "Who owns the next escalation and on what date?",
        ],
      },
      {
        id: "AR-3142",
        title: "Timely filing proof",
        subtitle: "Harbor Blue · corrected claim",
        priority: "High risk",
        status: "Appeal due",
        amount: "$1,175.00",
        age: "122 days",
        account: "CL-7413360",
        payer: "Harbor Blue PPO",
        owner: "Appeals AR",
        story:
          "A corrected claim denied for timely filing, but the clearinghouse acceptance report shows the original claim was received within the limit.",
        mission:
          "Build the filing timeline, choose the correct reconsideration path, and submit proof before the appeal deadline.",
        facts: [
          { label: "Date of service", value: "Feb 22, 2026" },
          { label: "Original receipt", value: "Mar 1, 2026" },
          { label: "Corrected claim", value: "Jun 14, 2026" },
          { label: "Payer limit", value: "90 days" },
          { label: "Appeal due", value: "Aug 8, 2026" },
          { label: "Acceptance file", value: "ACK-0301-774" },
        ],
        breakdown: [
          { label: "Billed amount", value: "$1,175.00" },
          { label: "Payer payment", value: "$0.00", tone: "muted" },
          { label: "Denied amount", value: "$1,175.00", tone: "accent" },
          { label: "Days to deadline", value: "13" },
        ],
        steps: arSteps,
        history: [
          {
            date: "Jul 22 · 7:08 AM",
            title: "Corrected claim denied",
            detail: "CO-29 timely filing denial posted.",
            actor: "Auto posting",
          },
          {
            date: "Jun 14 · 5:31 PM",
            title: "Corrected claim accepted",
            detail: "Frequency code 7 accepted by clearinghouse.",
            actor: "Claims",
          },
          {
            date: "Mar 1 · 6:44 PM",
            title: "Original claim accepted",
            detail: "Acceptance report retained with payer claim ID.",
            actor: "Clearinghouse",
          },
        ],
        notePrompts: [
          "What proves the original filing was timely?",
          "Which payer channel and deadline apply?",
          "When should the account be checked after submission?",
        ],
      },
    ],
  },
  {
    id: "denial-management",
    navLabel: "Denial Management",
    title: "Denial Management",
    eyebrow: "Root-cause workbench",
    description:
      "Practice denial classification, root-cause analysis, recovery strategy, and upstream prevention.",
    accent: "#8067b7",
    soft: "#f0ebfa",
    metric: "72%",
    metricLabel: "first-pass recovery",
    scenarios: [
      {
        id: "DM-4203",
        title: "Specialist claim 4203",
        subtitle: "Summit Health · CO-16",
        priority: "Priority",
        status: "Correctable",
        amount: "$785.00",
        age: "12 days",
        account: "CL-8027614",
        payer: "Summit Health HMO",
        owner: "Technical denials",
        story:
          "The claim denied CO-16 with an MA36 remark. A valid referral exists in the scheduling record, but its number was not populated on the claim.",
        mission:
          "Confirm the referral, correct the source and claim, and prevent the missing field from recurring.",
        facts: [
          { label: "Date of service", value: "Jun 28, 2026" },
          { label: "Denial posted", value: "Jul 14, 2026" },
          { label: "CARC / RARC", value: "CO-16 · MA36" },
          { label: "Referral", value: "RF-662910" },
          { label: "Resubmit limit", value: "90 days" },
          { label: "Claim frequency", value: "7 · corrected" },
        ],
        breakdown: [
          { label: "Billed amount", value: "$785.00" },
          { label: "Paid amount", value: "$0.00", tone: "muted" },
          { label: "Denied amount", value: "$785.00", tone: "accent" },
          { label: "Recovery path", value: "Corrected claim" },
        ],
        steps: denialSteps,
        history: [
          {
            date: "Jul 16 · 1:35 PM",
            title: "Referral located",
            detail: "Valid referral covers date, provider, and service.",
            actor: "Denial analyst",
          },
          {
            date: "Jul 14 · 5:06 AM",
            title: "Denial posted",
            detail: "CO-16 with missing referral remark.",
            actor: "Auto posting",
          },
          {
            date: "Jun 29 · 8:11 PM",
            title: "Claim accepted",
            detail: "Original claim passed clearinghouse edits.",
            actor: "Claims",
          },
        ],
        notePrompts: [
          "What evidence proves the referral is valid?",
          "Which claim field and source record need correction?",
          "Who owns the upstream prevention action?",
        ],
        documentLines: [
          { cpt: "99204", billed: "$785.00", allowed: "$0.00", paid: "$0.00", adjustment: "$785.00", patient: "$0.00", codes: "CO-16 · MA36" },
        ],
        correspondence: {
          title: "Remittance advice and referral record",
          date: "Jul 14, 2026",
          reference: "SUM-ICN-8027614",
          body: "The claim could not be processed because required referral information was missing from the submitted claim. The scheduling record contains referral RF-662910 covering the member, specialist, date of service, and billed service.",
        },
      },
      {
        id: "DM-4218",
        title: "Advanced imaging claim 4218",
        subtitle: "Northstar Health · CO-50",
        priority: "High risk",
        status: "Clinical appeal",
        amount: "$3,240.00",
        age: "27 days",
        account: "CL-7961044",
        payer: "Northstar Health",
        owner: "Clinical denials",
        story:
          "An advanced imaging claim denied as not medically necessary. The ordering note documents failed conservative treatment, but the original authorization file lacks that clinical detail.",
        mission:
          "Validate policy criteria, assemble the clinical appeal, and preserve the appeal deadline.",
        facts: [
          { label: "Date of service", value: "May 30, 2026" },
          { label: "CARC / RARC", value: "CO-50 · N115" },
          { label: "Appeal level", value: "First level" },
          { label: "Appeal due", value: "Aug 14, 2026" },
          { label: "Policy", value: "RAD-221" },
          { label: "Ordering provider", value: "Dr. Mira Chen" },
        ],
        breakdown: [
          { label: "Billed amount", value: "$3,240.00" },
          { label: "Paid amount", value: "$0.00", tone: "muted" },
          { label: "Denied amount", value: "$3,240.00", tone: "accent" },
          { label: "Days to appeal", value: "19" },
        ],
        steps: denialSteps,
        history: [
          {
            date: "Jul 21 · 11:17 AM",
            title: "Clinical note indexed",
            detail: "Six weeks of conservative therapy documented.",
            actor: "HIM",
          },
          {
            date: "Jun 29 · 5:22 AM",
            title: "Denial posted",
            detail: "Medical necessity criteria not demonstrated.",
            actor: "Auto posting",
          },
          {
            date: "May 25 · 3:14 PM",
            title: "Authorization closed",
            detail: "Request closed without full clinical attachment.",
            actor: "Authorization",
          },
        ],
        notePrompts: [
          "Which policy criteria does the record satisfy?",
          "What documents belong in the appeal package?",
          "What upstream authorization control should change?",
        ],
        documentLines: [
          { cpt: "72141", billed: "$3,240.00", allowed: "$0.00", paid: "$0.00", adjustment: "$3,240.00", patient: "$0.00", codes: "CO-50 · N115" },
        ],
        correspondence: {
          title: "Clinical claim determination",
          date: "Jun 29, 2026",
          reference: "NS-CLN-7961044",
          body: "The submitted clinical information did not demonstrate the plan criteria required for advanced imaging. First-level appeal rights remain available. Include ordering notes, conservative-treatment history, and the applicable policy criteria.",
        },
      },
      {
        id: "DM-4226",
        title: "Preventive service claim 4226",
        subtitle: "Crescent Choice · PR-204",
        priority: "Routine",
        status: "Benefit review",
        amount: "$460.00",
        age: "7 days",
        account: "CL-8080552",
        payer: "Crescent Choice",
        owner: "Benefit denials",
        story:
          "A screening service processed as non-covered. Registration shows the patient signed a notice, but the coding and benefit records must be reviewed before moving the amount to patient responsibility.",
        mission:
          "Confirm benefit, coding, and notice requirements before deciding whether the balance is billable.",
        facts: [
          { label: "Date of service", value: "Jul 8, 2026" },
          { label: "CARC / RARC", value: "PR-204 · N130" },
          { label: "Procedure", value: "Preventive screening" },
          { label: "Notice on file", value: "Signed Jul 8" },
          { label: "Coding review", value: "Pending" },
          { label: "Plan year", value: "2026" },
        ],
        breakdown: [
          { label: "Billed amount", value: "$460.00" },
          { label: "Plan payment", value: "$0.00", tone: "muted" },
          { label: "Proposed patient amount", value: "$460.00", tone: "accent" },
          { label: "Final liability", value: "Pending review" },
        ],
        steps: denialSteps,
        history: [
          {
            date: "Jul 23 · 9:48 AM",
            title: "Coding review requested",
            detail: "Diagnosis and preventive frequency under review.",
            actor: "Denial analyst",
          },
          {
            date: "Jul 19 · 5:45 AM",
            title: "Denial posted",
            detail: "PR-204 service not covered under current benefit.",
            actor: "Auto posting",
          },
          {
            date: "Jul 8 · 8:24 AM",
            title: "Notice captured",
            detail: "Signed notice indexed before service.",
            actor: "Registration",
          },
        ],
        notePrompts: [
          "What must be confirmed before patient billing?",
          "Does coding match the service and benefit?",
          "What outcome and prevention action should be documented?",
        ],
        documentLines: [
          { cpt: "G0439", billed: "$460.00", allowed: "$0.00", paid: "$0.00", adjustment: "$460.00", patient: "$460.00", codes: "PR-204 · N130" },
        ],
        correspondence: {
          title: "Member benefit determination",
          date: "Jul 19, 2026",
          reference: "CC-EOB-8080552",
          body: "The billed preventive service is not covered under the member's current benefit as submitted. Review diagnosis, benefit frequency, and the signed patient notice before assigning final liability.",
        },
      },
      {
        id: "DM-4234",
        title: "Laboratory claim 4234",
        subtitle: "Harbor Blue · CO-11",
        priority: "Priority",
        status: "Coding review",
        amount: "$1,120.00",
        age: "18 days",
        account: "CL-8114234",
        payer: "Harbor Blue PPO",
        owner: "Coding denials",
        story:
          "A multi-line laboratory claim denied with CO-11 and N386. The order, result, and claim image are available, but the submitted diagnosis must be compared with the service documentation before any correction.",
        mission:
          "Determine whether the denial can be corrected from existing documentation or requires provider clarification, then select the appropriate recovery path.",
        facts: [
          { label: "Date of service", value: "Jun 16, 2026" },
          { label: "CARC / RARC", value: "CO-11 · N386" },
          { label: "Claim received", value: "Jun 19, 2026" },
          { label: "Correction limit", value: "120 days" },
          { label: "Order diagnosis", value: "Indexed in chart" },
          { label: "Claim diagnosis", value: "R53.83" },
        ],
        breakdown: [
          { label: "Billed amount", value: "$1,120.00" },
          { label: "Paid amount", value: "$0.00", tone: "muted" },
          { label: "Denied amount", value: "$1,120.00", tone: "accent" },
          { label: "Patient liability", value: "$0.00" },
        ],
        steps: denialSteps,
        history: [
          {
            date: "Jul 24 · 10:41 AM",
            title: "Order and results indexed",
            detail: "Ordering diagnosis and final pathology report available.",
            actor: "HIM",
          },
          {
            date: "Jul 8 · 5:12 AM",
            title: "Denial posted",
            detail: "CO-11 diagnosis inconsistent with procedure.",
            actor: "Auto posting",
          },
          {
            date: "Jun 19 · 6:20 PM",
            title: "Claim accepted",
            detail: "Original claim passed front-end edits.",
            actor: "Claims",
          },
        ],
        notePrompts: [
          "Which source supports the diagnosis used for correction?",
          "Does the correction require a coder or ordering provider?",
          "What should be changed upstream to prevent recurrence?",
        ],
        documentLines: [
          { cpt: "88305", billed: "$820.00", allowed: "$0.00", paid: "$0.00", adjustment: "$820.00", patient: "$0.00", codes: "CO-11 · N386" },
          { cpt: "88312", billed: "$300.00", allowed: "$0.00", paid: "$0.00", adjustment: "$300.00", patient: "$0.00", codes: "CO-11 · N386" },
        ],
        correspondence: {
          title: "Claim coding determination",
          date: "Jul 8, 2026",
          reference: "HB-ICN-8114234",
          body: "The diagnosis submitted is inconsistent with the billed laboratory services. Corrected claim submission is permitted when supported by the medical record. Do not change diagnosis solely to obtain payment.",
        },
      },
      {
        id: "DM-4241",
        title: "Observation claim 4241",
        subtitle: "Meridian · CO-197",
        priority: "High risk",
        status: "Authorization review",
        amount: "$6,480.00",
        age: "31 days",
        account: "CL-8144241",
        payer: "Meridian Community Health",
        owner: "Authorization denials",
        story:
          "An observation claim denied with CO-197. A notification number appears in the utilization-management log, but the approved span, level of care, and claim dates require comparison before deciding whether to appeal or correct the claim.",
        mission:
          "Reconcile the authorization evidence with the billed claim, preserve the deadline, and route the case using the strongest supported action.",
        facts: [
          { label: "Dates of service", value: "Jun 2–Jun 3, 2026" },
          { label: "CARC / RARC", value: "CO-197 · N130" },
          { label: "Notification", value: "MCH-NOT-771904" },
          { label: "Approved level", value: "Observation" },
          { label: "Appeal due", value: "Aug 20, 2026" },
          { label: "Claim type", value: "Facility UB-04" },
        ],
        breakdown: [
          { label: "Billed amount", value: "$6,480.00" },
          { label: "Paid amount", value: "$0.00", tone: "muted" },
          { label: "Denied amount", value: "$6,480.00", tone: "accent" },
          { label: "Days to appeal", value: "25" },
        ],
        steps: denialSteps,
        history: [
          {
            date: "Jul 20 · 2:14 PM",
            title: "Notification log located",
            detail: "Reference includes observation approval for both service dates.",
            actor: "Prior authorization",
          },
          {
            date: "Jun 25 · 5:02 AM",
            title: "Denial posted",
            detail: "CO-197 authorization not matched.",
            actor: "Auto posting",
          },
          {
            date: "Jun 5 · 7:11 PM",
            title: "Claim accepted",
            detail: "Facility claim accepted by payer.",
            actor: "Claims",
          },
        ],
        notePrompts: [
          "Do the approved span and level of care match every billed line?",
          "Which evidence must accompany the payer request?",
          "What notification-number control failed on the original claim?",
        ],
        documentLines: [
          { cpt: "G0378", billed: "$4,980.00", allowed: "$0.00", paid: "$0.00", adjustment: "$4,980.00", patient: "$0.00", codes: "CO-197 · N130" },
          { cpt: "99220", billed: "$1,500.00", allowed: "$0.00", paid: "$0.00", adjustment: "$1,500.00", patient: "$0.00", codes: "CO-197 · N130" },
        ],
        correspondence: {
          title: "Authorization claim determination",
          date: "Jun 25, 2026",
          reference: "MCH-ICN-8144241",
          body: "The claim did not match an authorization or notification in the adjudication system. Appeal or reconsideration may include the notification number, approval span, level of care, and complete claim identifiers.",
        },
      },
    ],
  },
];

export const startingLogs = [
  {
    id: "LOG-8821",
    module: "Denial Management",
    scenario: "Advanced imaging claim 4218",
    learner: "A. Reyes",
    score: 92,
    time: "Today · 10:42 AM",
  },
  {
    id: "LOG-8819",
    module: "Payment Posting",
    scenario: "EFT / ERA variance",
    learner: "M. Cruz",
    score: 88,
    time: "Today · 9:18 AM",
  },
  {
    id: "LOG-8808",
    module: "AR Collections",
    scenario: "Surgical claim review",
    learner: "S. Flores",
    score: 86,
    time: "Yesterday · 2:03 PM",
  },
];
