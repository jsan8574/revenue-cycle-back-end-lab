export type PostingAccount = {
  id: string;
  patient: string;
  dob: string;
  memberId: string;
  address: string;
  balance: number;
  encounters: {
    id: string;
    dos: string;
    service: string;
    cpt: string;
    billed: number;
    openBalance: number;
    claimId: string;
  }[];
};

export type PostingScenario = {
  id: string;
  title: string;
  subtitle: string;
  priority: "Routine" | "Priority" | "High risk";
  status: string;
  amount: string;
  objective: string;
  era: {
    payer: string;
    payee: string;
    trace: string;
    eraDate: string;
    eraTotal: number;
    patientControl: string;
    payerClaim: string;
    patient: string;
    memberId: string;
    serviceLines: {
      dos: string;
      cpt: string;
      billed: number;
      allowed: number;
      paid: number;
      group: string;
      reason: string;
      adjustment: number;
      patientResponsibility: number;
    }[];
    remarks: string[];
  };
  bank: {
    effectiveDate: string;
    originator: string;
    trace: string;
    deposit: number;
    accountEnding: string;
    status: string;
  };
  proof: {
    label: string;
    reference: string;
    amount: number;
    detail: string;
  }[];
  accounts: PostingAccount[];
  expected: {
    accountId: string;
    encounterId: string;
    payment: number;
    contractual: number;
    deductible: number;
    coinsurance: number;
    copay: number;
    denial: number;
    denialCode: string;
    action: string;
    batchTotal: number;
    varianceReason: string;
  };
};

export const postingScenarios: PostingScenario[] = [
  {
    id: "PP-2401",
    title: "EFT / ERA variance",
    subtitle: "Harbor Blue · 38 claims",
    priority: "Priority",
    status: "Unbalanced batch",
    amount: "$28,430.12",
    objective:
      "Use the source documents to identify the account and encounter, post the selected claim, and reconcile the full deposit.",
    era: {
      payer: "Harbor Blue PPO",
      payee: "Evergreen Medical Group · NPI 1992881044",
      trace: "091000-772184",
      eraDate: "Jul 26, 2026",
      eraTotal: 28280.12,
      patientControl: "AC-782104-0514",
      payerClaim: "HB-44011829",
      patient: "Maria Santos",
      memberId: "HBX-441-8820",
      serviceLines: [
        {
          dos: "May 14, 2026",
          cpt: "70551",
          billed: 2480,
          allowed: 1550,
          paid: 707.85,
          group: "CO",
          reason: "45",
          adjustment: 930,
          patientResponsibility: 842.15,
        },
      ],
      remarks: [
        "PR-1 deductible: $730.00",
        "PR-2 coinsurance: $112.15",
        "PLB L6 interest appears outside the claim loops",
      ],
    },
    bank: {
      effectiveDate: "Jul 26, 2026",
      originator: "HARBOR BLUE HEALTH",
      trace: "091000-772184",
      deposit: 28430.12,
      accountEnding: "••4408",
      status: "Settled",
    },
    proof: [
      {
        label: "Provider-level adjustment",
        reference: "PLB · L6 · HB-44011829",
        amount: 150,
        detail: "Prompt-pay interest deposited with the EFT; not claim payment.",
      },
      {
        label: "835 claim payment total",
        reference: "TRN 091000-772184",
        amount: 28280.12,
        detail: "Sum of all CLP payment segments in the remittance.",
      },
    ],
    accounts: [
      {
        id: "AC-782104",
        patient: "Maria Santos",
        dob: "Aug 22, 1986",
        memberId: "HBX-441-8820",
        address: "Seattle, WA 98114",
        balance: 842.15,
        encounters: [
          {
            id: "ENC-551408",
            dos: "May 14, 2026",
            service: "MRI brain without contrast",
            cpt: "70551",
            billed: 2480,
            openBalance: 2480,
            claimId: "HB-44011829",
          },
          {
            id: "ENC-512208",
            dos: "Jan 22, 2026",
            service: "Office follow-up",
            cpt: "99214",
            billed: 310,
            openBalance: 0,
            claimId: "HB-40098211",
          },
        ],
      },
      {
        id: "AC-719244",
        patient: "Marina Santos",
        dob: "Mar 9, 1984",
        memberId: "HBX-441-8208",
        address: "Tacoma, WA 98402",
        balance: 218,
        encounters: [
          {
            id: "ENC-511094",
            dos: "May 14, 2026",
            service: "Diagnostic ultrasound",
            cpt: "76700",
            billed: 940,
            openBalance: 218,
            claimId: "HB-44018192",
          },
        ],
      },
      {
        id: "AC-782140",
        patient: "Maria S. Santos",
        dob: "Oct 12, 1972",
        memberId: "NRH-110-4418",
        address: "Bellevue, WA 98004",
        balance: 0,
        encounters: [
          {
            id: "ENC-552014",
            dos: "May 20, 2026",
            service: "CT chest",
            cpt: "71250",
            billed: 2480,
            openBalance: 0,
            claimId: "NS-88411102",
          },
        ],
      },
    ],
    expected: {
      accountId: "AC-782104",
      encounterId: "ENC-551408",
      payment: 707.85,
      contractual: 930,
      deductible: 730,
      coinsurance: 112.15,
      copay: 0,
      denial: 0,
      denialCode: "",
      action: "standard-posting",
      batchTotal: 28430.12,
      varianceReason: "interest-plb",
    },
  },
  {
    id: "PP-2407",
    title: "Reversal and recoupment",
    subtitle: "Crescent Choice · negative remit",
    priority: "High risk",
    status: "Takeback review",
    amount: "−$1,275.00",
    objective:
      "Trace the reversal to the original account and claim before recording the negative transaction and denial.",
    era: {
      payer: "Crescent Choice",
      payee: "Evergreen Medical Group · NPI 1992881044",
      trace: "114002-665409",
      eraDate: "Jul 25, 2026",
      eraTotal: -1275,
      patientControl: "AC-774290-0311",
      payerClaim: "CC-91944206",
      patient: "Thomas Clark",
      memberId: "CCR-905-1182",
      serviceLines: [
        {
          dos: "Mar 11, 2026",
          cpt: "45378",
          billed: 2850,
          allowed: 1275,
          paid: -1275,
          group: "CO",
          reason: "18",
          adjustment: 0,
          patientResponsibility: 0,
        },
      ],
      remarks: [
        "Reversal of original payment from batch BAT-0516-088",
        "CO-18: exact duplicate claim/service",
        "Do not transfer contractual or patient responsibility from the original version",
      ],
    },
    bank: {
      effectiveDate: "Jul 25, 2026",
      originator: "CRESCENT CHOICE",
      trace: "114002-665409",
      deposit: -1275,
      accountEnding: "••4408",
      status: "Offset against current EFT",
    },
    proof: [
      {
        label: "Original posting",
        reference: "BAT-0516-088 · TXN-660184",
        amount: 1275,
        detail: "Payment posted May 16 to claim CC-91944206.",
      },
      {
        label: "Payer takeback",
        reference: "PLB · WO · CC-91944206",
        amount: -1275,
        detail: "Recoupment applied against the current payment cycle.",
      },
    ],
    accounts: [
      {
        id: "AC-774290",
        patient: "Thomas Clark",
        dob: "Feb 18, 1969",
        memberId: "CCR-905-1182",
        address: "Portland, OR 97205",
        balance: 0,
        encounters: [
          {
            id: "ENC-440311",
            dos: "Mar 11, 2026",
            service: "Diagnostic colonoscopy",
            cpt: "45378",
            billed: 2850,
            openBalance: 0,
            claimId: "CC-91944206",
          },
          {
            id: "ENC-440210",
            dos: "Feb 10, 2026",
            service: "Pre-procedure office visit",
            cpt: "99204",
            billed: 425,
            openBalance: 0,
            claimId: "CC-90112871",
          },
        ],
      },
      {
        id: "AC-774209",
        patient: "Thomas Clarke",
        dob: "Jul 2, 1975",
        memberId: "CCR-905-1812",
        address: "Salem, OR 97301",
        balance: 1275,
        encounters: [
          {
            id: "ENC-440399",
            dos: "Mar 11, 2026",
            service: "Upper endoscopy",
            cpt: "43235",
            billed: 2850,
            openBalance: 1275,
            claimId: "CC-91944820",
          },
        ],
      },
      {
        id: "AC-708991",
        patient: "Tomas Clark",
        dob: "Feb 18, 1969",
        memberId: "HBP-221-9051",
        address: "Vancouver, WA 98660",
        balance: 220,
        encounters: [
          {
            id: "ENC-390201",
            dos: "Mar 1, 2026",
            service: "Office visit",
            cpt: "99214",
            billed: 310,
            openBalance: 220,
            claimId: "HB-99102442",
          },
        ],
      },
    ],
    expected: {
      accountId: "AC-774290",
      encounterId: "ENC-440311",
      payment: -1275,
      contractual: 0,
      deductible: 0,
      coinsurance: 0,
      copay: 0,
      denial: 1275,
      denialCode: "CO-18",
      action: "reverse-and-deny",
      batchTotal: -1275,
      varianceReason: "recoupment",
    },
  },
  {
    id: "PP-2412",
    title: "Secondary split remit",
    subtitle: "Northstar · crossover",
    priority: "Routine",
    status: "Secondary ERA",
    amount: "$7,864.58",
    objective:
      "Match the secondary claim to the correct primary-adjudicated encounter and post only the remaining liability.",
    era: {
      payer: "Northstar Health",
      payee: "Evergreen Medical Group · NPI 1992881044",
      trace: "031101-445812",
      eraDate: "Jul 26, 2026",
      eraTotal: 7578.18,
      patientControl: "AC-809442-0611",
      payerClaim: "NS-55120428",
      patient: "Aisha Reed",
      memberId: "NSH-660-9144",
      serviceLines: [
        {
          dos: "Jun 11, 2026",
          cpt: "93306",
          billed: 920,
          allowed: 790,
          paid: 155,
          group: "CO",
          reason: "45",
          adjustment: 130,
          patientResponsibility: 60,
        },
      ],
      remarks: [
        "Primary Medicare payment already posted: $575.00",
        "Secondary coinsurance remaining: $60.00",
        "One unrelated claim for $286.40 lacks a valid patient control number",
      ],
    },
    bank: {
      effectiveDate: "Jul 26, 2026",
      originator: "NORTHSTAR HEALTH",
      trace: "031101-445812",
      deposit: 7864.58,
      accountEnding: "••4408",
      status: "Settled",
    },
    proof: [
      {
        label: "Matched claim payments",
        reference: "13 crossover claims",
        amount: 7578.18,
        detail: "Valid patient control numbers and primary adjudication found.",
      },
      {
        label: "Unmatched funds",
        reference: "PCN 000-UNKNOWN-14",
        amount: 286.4,
        detail: "Held to unapplied research; no patient account may be forced.",
      },
    ],
    accounts: [
      {
        id: "AC-809442",
        patient: "Aisha Reed",
        dob: "Nov 4, 1958",
        memberId: "NSH-660-9144",
        address: "Denver, CO 80206",
        balance: 345,
        encounters: [
          {
            id: "ENC-610611",
            dos: "Jun 11, 2026",
            service: "Complete echocardiogram",
            cpt: "93306",
            billed: 920,
            openBalance: 345,
            claimId: "NS-55120428",
          },
          {
            id: "ENC-610507",
            dos: "May 7, 2026",
            service: "Cardiology follow-up",
            cpt: "99214",
            billed: 290,
            openBalance: 0,
            claimId: "NS-54988210",
          },
        ],
      },
      {
        id: "AC-809424",
        patient: "Ayesha Reid",
        dob: "Nov 14, 1958",
        memberId: "NSH-660-9414",
        address: "Aurora, CO 80012",
        balance: 345,
        encounters: [
          {
            id: "ENC-610622",
            dos: "Jun 11, 2026",
            service: "Stress echocardiogram",
            cpt: "93350",
            billed: 920,
            openBalance: 345,
            claimId: "NS-55120991",
          },
        ],
      },
      {
        id: "AC-771004",
        patient: "Aisha Reed",
        dob: "Nov 4, 1958",
        memberId: "MCR-119-8224",
        address: "Denver, CO 80206",
        balance: 60,
        encounters: [
          {
            id: "ENC-510611",
            dos: "Jun 11, 2025",
            service: "Complete echocardiogram",
            cpt: "93306",
            billed: 875,
            openBalance: 60,
            claimId: "MC-20255114",
          },
        ],
      },
    ],
    expected: {
      accountId: "AC-809442",
      encounterId: "ENC-610611",
      payment: 155,
      contractual: 130,
      deductible: 0,
      coinsurance: 60,
      copay: 0,
      denial: 0,
      denialCode: "",
      action: "standard-posting",
      batchTotal: 7864.58,
      varianceReason: "unmatched-held",
    },
  },
];

export type ArScenario = {
  id: string;
  title: string;
  subtitle: string;
  priority: "Routine" | "Priority" | "High risk";
  status: string;
  amount: string;
  patient: {
    name: string;
    account: string;
    dob: string;
    memberId: string;
    payer: string;
    plan: string;
    dos: string;
    provider: string;
    location: string;
  };
  claim: {
    claimId: string;
    billed: number;
    allowed: number;
    paid: number;
    patientResponsibility: number;
    openAr: number;
    aging: string;
    filingLimit: string;
    appealDeadline: string;
    services: { cpt: string; description: string; units: number; charge: number }[];
  };
  billingHistory: { date: string; event: string; detail: string; source: string }[];
  documents: {
    type: string;
    date: string;
    reference: string;
    summary: string;
    codes: string;
  }[];
  transactions: {
    date: string;
    type: string;
    amount: number;
    reference: string;
    status: string;
  }[];
  relatedAccounts: { account: string; dos: string; balance: number; status: string }[];
  insurance: {
    effective: string;
    termination: string;
    network: string;
    coordination: string;
    subscriber: string;
    phone: string;
  };
  authorization: {
    required: string;
    number: string;
    status: string;
    span: string;
    services: string;
    notes: string;
  };
  contract: {
    name: string;
    effective: string;
    method: "case-rate" | "percent-charge" | "fee-schedule";
    rate: number;
    percent: number;
    terms: string;
  };
  portal: {
    status: string;
    received: string;
    finalized: string;
    reason: string;
    icn: string;
    nextStep: string;
  };
  callQuestions: { question: string; answer: string }[];
  expected: {
    method: "case-rate" | "percent-charge" | "fee-schedule";
    expectedAllowed: number;
    expectedPayment: number;
    variance: number;
    action: string;
    route: string;
    rationale: string;
  };
};

export const arScenarios: ArScenario[] = [
  {
    id: "AR-3106",
    title: "Contract underpayment",
    subtitle: "Northstar · commercial",
    priority: "Priority",
    status: "64 days in AR",
    amount: "$2,480.00",
    patient: {
      name: "Evelyn Brooks",
      account: "AC-771920",
      dob: "Sep 16, 1971",
      memberId: "NSH-188-2044",
      payer: "Northstar Health",
      plan: "Northstar Choice PPO",
      dos: "Apr 18, 2026",
      provider: "Dr. Oliver Grant",
      location: "Evergreen Surgical Center",
    },
    claim: {
      claimId: "CL-7719204",
      billed: 18640,
      allowed: 10120,
      paid: 10120,
      patientResponsibility: 0,
      openAr: 2480,
      aging: "61–90 days",
      filingLimit: "180 days from DOS",
      appealDeadline: "Sep 30, 2026",
      services: [
        { cpt: "27447", description: "Total knee arthroplasty", units: 1, charge: 17400 },
        { cpt: "73560", description: "Post-op knee imaging", units: 1, charge: 1240 },
      ],
    },
    billingHistory: [
      { date: "Apr 18", event: "Charges entered", detail: "Final coded charge: $18,640.00", source: "Billing" },
      { date: "Apr 24", event: "Claim accepted", detail: "Clearinghouse acceptance 277CA A1", source: "Claims" },
      { date: "May 3", event: "ERA posted", detail: "Allowed and paid $10,120.00; no patient liability", source: "835" },
      { date: "Jun 12", event: "Variance flagged", detail: "Contract team referenced 2026 joint case rate", source: "Contract review" },
      { date: "Jul 10", event: "Payer contacted", detail: "Representative stated reprocessing requested", source: "Ref NS-884120" },
    ],
    documents: [
      { type: "EOB / ERA", date: "May 3", reference: "ICN NS-44029118", summary: "Paid at $10,120.00 with CO-45 adjustment. No denial or patient responsibility.", codes: "CO-45 · N/A" },
      { type: "Contract excerpt", date: "Jan 1", reference: "NS-EVG-2026 §4.2", summary: "In-network total knee arthroplasty reimburses at a $12,600 case rate.", codes: "Case rate · CPT 27447" },
      { type: "Payer correspondence", date: "Jul 10", reference: "NS-884120", summary: "Reprocessing request opened; standard turnaround 15–20 business days.", codes: "Queue: Pricing review" },
    ],
    transactions: [
      { date: "May 3", type: "Insurance payment", amount: 10120, reference: "EFT 331089", status: "Posted" },
      { date: "May 3", type: "Contractual adjustment", amount: -8520, reference: "CO-45", status: "Posted" },
      { date: "Jun 12", type: "Variance transfer", amount: 2480, reference: "VAR-6601", status: "Open AR" },
    ],
    relatedAccounts: [
      { account: "AC-771920-02", dos: "Mar 20, 2026", balance: 0, status: "Pre-op cleared" },
      { account: "AC-771920-03", dos: "May 1, 2026", balance: 185, status: "Separate PT claim" },
    ],
    insurance: {
      effective: "Jan 1, 2026",
      termination: "Active",
      network: "In network",
      coordination: "Primary",
      subscriber: "Self",
      phone: "800-555-0194",
    },
    authorization: {
      required: "Yes",
      number: "NS-AUTH-660184",
      status: "Approved",
      span: "Apr 15–Apr 22, 2026",
      services: "CPT 27447 · 1 unit",
      notes: "No authorization variance identified.",
    },
    contract: {
      name: "Northstar / Evergreen 2026",
      effective: "Jan 1, 2026",
      method: "case-rate",
      rate: 12600,
      percent: 0,
      terms: "Case rate includes all facility services on the surgical claim. Patient responsibility subtracts from plan payment.",
    },
    portal: {
      status: "Paid",
      received: "Apr 24, 2026",
      finalized: "May 2, 2026",
      reason: "Priced using standard outpatient grouper rather than contracted joint case rate.",
      icn: "NS-44029118",
      nextStep: "Pricing reconsideration can be submitted with contract excerpt.",
    },
    callQuestions: [
      { question: "What pricing methodology was used?", answer: "The claim priced through our standard outpatient grouper. I do not see the joint case-rate indicator." },
      { question: "Is the prior reprocessing request still open?", answer: "Request NS-884120 closed without change on July 24. The note says contract support was not attached." },
      { question: "What is required for reconsideration?", answer: "Submit the contract page, claim ICN, expected allowed amount, and a short variance calculation through Pricing Review." },
      { question: "What is the call reference number?", answer: "Today’s reference is NS-CALL-771026. Turnaround is 15 business days." },
    ],
    expected: {
      method: "case-rate",
      expectedAllowed: 12600,
      expectedPayment: 12600,
      variance: 2480,
      action: "request-adjustment",
      route: "payer-contract-review",
      rationale: "The paid allowed amount is $2,480 below the contracted case rate; submit pricing reconsideration with contract support.",
    },
  },
  {
    id: "AR-3119",
    title: "Workers’ comp silence",
    subtitle: "Pioneer · work injury",
    priority: "High risk",
    status: "96 days in AR",
    amount: "$6,920.00",
    patient: {
      name: "Marcus Hill",
      account: "AC-760113",
      dob: "Jan 28, 1980",
      memberId: "WC-558-291",
      payer: "Pioneer Casualty",
      plan: "Oregon Workers’ Compensation",
      dos: "Mar 6, 2026",
      provider: "Dr. Nadia Wells",
      location: "Evergreen Orthopedics",
    },
    claim: {
      claimId: "CL-7601138",
      billed: 6920,
      allowed: 0,
      paid: 0,
      patientResponsibility: 0,
      openAr: 6920,
      aging: "91–120 days",
      filingLimit: "60 days from service for initial bill",
      appealDeadline: "No determination issued",
      services: [
        { cpt: "29881", description: "Knee arthroscopy", units: 1, charge: 6120 },
        { cpt: "73562", description: "Knee radiology", units: 1, charge: 800 },
      ],
    },
    billingHistory: [
      { date: "Mar 6", event: "Services completed", detail: "Work injury claim number captured", source: "Front end" },
      { date: "Mar 10", event: "Bill submitted", detail: "First report and itemized bill sent", source: "Billing" },
      { date: "Apr 2", event: "Records delivered", detail: "Secure upload RC-220147", source: "Document team" },
      { date: "Jun 17", event: "Receipt confirmed", detail: "Portal shows records attached", source: "Collector" },
      { date: "Jul 8", event: "Second follow-up", detail: "Voicemail left for adjuster case desk 47", source: "Collector J. Lee" },
    ],
    documents: [
      { type: "Acknowledgment", date: "Mar 14", reference: "PC-WC-558-291", summary: "Claim and initial bill received. Liability investigation pending.", codes: "No EOB issued" },
      { type: "Medical-record receipt", date: "Apr 2", reference: "RC-220147", summary: "Operative report, work-status note, and imaging received.", codes: "24 pages" },
      { type: "Employer correspondence", date: "Mar 9", reference: "ER-4418", summary: "Employer confirmed reported injury date March 5 and accepted work relationship.", codes: "Employer report on file" },
    ],
    transactions: [
      { date: "Mar 6", type: "Charge", amount: 6920, reference: "CHG-88021", status: "Posted" },
      { date: "Mar 10", type: "Claim submission", amount: 0, reference: "BILL-31066", status: "Accepted" },
      { date: "Apr 2", type: "Record transmission", amount: 0, reference: "RC-220147", status: "Delivered" },
    ],
    relatedAccounts: [
      { account: "AC-760113-01", dos: "Mar 5, 2026", balance: 0, status: "Emergency claim paid" },
      { account: "AC-760113-03", dos: "Mar 20, 2026", balance: 420, status: "Therapy pending same adjuster" },
    ],
    insurance: {
      effective: "Injury date Mar 5, 2026",
      termination: "Claim open",
      network: "State fee schedule",
      coordination: "Workers’ comp primary",
      subscriber: "Employer policy",
      phone: "800-555-0136",
    },
    authorization: {
      required: "Utilization review",
      number: "UR-391184",
      status: "Certified",
      span: "Mar 6, 2026",
      services: "CPT 29881 · 1 unit",
      notes: "Certification faxed before procedure; receipt confirmed.",
    },
    contract: {
      name: "Oregon WC facility schedule",
      effective: "Jan 1, 2026",
      method: "percent-charge",
      rate: 0,
      percent: 80,
      terms: "Training scenario: facility allowance equals 80% of billed charges. No patient responsibility.",
    },
    portal: {
      status: "Pending adjuster determination",
      received: "Mar 14, 2026",
      finalized: "Not finalized",
      reason: "Liability decision overdue; all requested records show received.",
      icn: "WC-558-291",
      nextStep: "Supervisor escalation is available for overdue adjuster response.",
    },
    callQuestions: [
      { question: "Are any records still missing?", answer: "No. I see the operative report, work-status note, imaging, and utilization review certification." },
      { question: "Has a liability determination been issued?", answer: "No determination is on file. The assigned adjuster has not completed review." },
      { question: "Can this be escalated today?", answer: "Yes. Request the adjuster supervisor queue because the response window has passed." },
      { question: "What is the call reference number?", answer: "Reference PC-260726-447. Supervisor review is due within five business days." },
    ],
    expected: {
      method: "percent-charge",
      expectedAllowed: 5536,
      expectedPayment: 5536,
      variance: 5536,
      action: "send-task",
      route: "payer-supervisor-escalation",
      rationale: "All records and utilization review are present; escalate the overdue liability determination rather than rebilling or billing the patient.",
    },
  },
  {
    id: "AR-3142",
    title: "Timely filing proof",
    subtitle: "Harbor Blue · corrected claim",
    priority: "High risk",
    status: "122 days in AR",
    amount: "$1,175.00",
    patient: {
      name: "Noah Bennett",
      account: "AC-741336",
      dob: "Jun 21, 1992",
      memberId: "HBX-771-4482",
      payer: "Harbor Blue PPO",
      plan: "Harbor Blue Preferred",
      dos: "Feb 22, 2026",
      provider: "Dr. Erin Blake",
      location: "Evergreen Imaging",
    },
    claim: {
      claimId: "CL-7413360",
      billed: 1175,
      allowed: 0,
      paid: 0,
      patientResponsibility: 0,
      openAr: 1175,
      aging: "121–150 days",
      filingLimit: "90 days from DOS",
      appealDeadline: "Aug 8, 2026",
      services: [
        { cpt: "72148", description: "MRI lumbar spine", units: 1, charge: 1175 },
      ],
    },
    billingHistory: [
      { date: "Mar 1", event: "Original claim accepted", detail: "277CA acceptance ACK-0301-774", source: "Clearinghouse" },
      { date: "Apr 4", event: "Payer returned claim", detail: "Rendering taxonomy correction requested", source: "Payer portal" },
      { date: "Jun 14", event: "Corrected claim accepted", detail: "Frequency code 7", source: "Claims" },
      { date: "Jul 22", event: "Denial posted", detail: "CO-29 timely filing", source: "835" },
    ],
    documents: [
      { type: "277CA acceptance", date: "Mar 1", reference: "ACK-0301-774", summary: "Original claim accepted by Harbor Blue eight days after DOS.", codes: "A1 · 19 · Accepted" },
      { type: "ERA / EOB", date: "Jul 22", reference: "HB-99104420", summary: "Corrected claim denied for timely filing; no patient responsibility assigned.", codes: "CO-29 · N211" },
      { type: "Claim image", date: "Jun 14", reference: "CLM-0614-018", summary: "Corrected taxonomy only; same patient, DOS, procedure, and billed amount.", codes: "Frequency 7" },
    ],
    transactions: [
      { date: "Feb 22", type: "Charge", amount: 1175, reference: "CHG-77148", status: "Posted" },
      { date: "Mar 1", type: "Original submission", amount: 0, reference: "ACK-0301-774", status: "Accepted" },
      { date: "Jun 14", type: "Corrected submission", amount: 0, reference: "CLM-0614-018", status: "Accepted" },
      { date: "Jul 22", type: "Denial", amount: 1175, reference: "CO-29", status: "Open AR" },
    ],
    relatedAccounts: [
      { account: "AC-741336-01", dos: "Feb 10, 2026", balance: 0, status: "Ordering visit paid" },
      { account: "AC-741336-03", dos: "Mar 2, 2026", balance: 80, status: "Unrelated therapy copay" },
    ],
    insurance: {
      effective: "Jan 1, 2026",
      termination: "Active",
      network: "In network",
      coordination: "Primary",
      subscriber: "Self",
      phone: "800-555-0194",
    },
    authorization: {
      required: "Yes",
      number: "HB-AUTH-118844",
      status: "Approved",
      span: "Feb 15–Mar 1, 2026",
      services: "CPT 72148 · 1 unit",
      notes: "Authorization is valid and not related to the denial.",
    },
    contract: {
      name: "Harbor Blue imaging schedule",
      effective: "Jan 1, 2026",
      method: "fee-schedule",
      rate: 1175,
      percent: 0,
      terms: "CPT 72148 allowed at $1,175.00. No patient responsibility until payer adjudication.",
    },
    portal: {
      status: "Denied",
      received: "Jun 14, 2026",
      finalized: "Jul 21, 2026",
      reason: "Corrected claim compared only to receipt date; original claim link not recognized.",
      icn: "HB-99104420",
      nextStep: "First-level appeal accepts original acceptance report as proof.",
    },
    callQuestions: [
      { question: "Can you see the original claim receipt?", answer: "I can locate the March 1 acceptance under payer claim HB-88017421." },
      { question: "Why was the corrected claim not linked?", answer: "The corrected claim came in with a revised taxonomy and did not carry the original payer ICN in the reference field." },
      { question: "What is required for the appeal?", answer: "Include the denial EOB, 277CA acceptance, original payer ICN, and corrected claim image." },
      { question: "What is the call reference number?", answer: "Reference HB-CALL-884710. The appeal deadline remains August 8." },
    ],
    expected: {
      method: "fee-schedule",
      expectedAllowed: 1175,
      expectedPayment: 1175,
      variance: 1175,
      action: "submit-appeal",
      route: "payer-appeals",
      rationale: "The original claim was accepted within the 90-day limit; appeal with the 277CA and original payer ICN.",
    },
  },
];

export const resolutionActions = [
  { id: "request-adjustment", label: "Request for adjustment" },
  { id: "submit-appeal", label: "Submit an appeal" },
  { id: "rebill-claim", label: "Rebill claim" },
  { id: "balance-transfer", label: "Balance transfer" },
  { id: "insurance-update", label: "Insurance update" },
  { id: "patient-letter", label: "Send patient letter" },
  { id: "send-task", label: "Send task / escalation" },
  { id: "reprocess", label: "Send claim for reprocessing" },
  { id: "allow-time", label: "Allow more time / claim in process" },
  { id: "skip-account", label: "Skip account / non-workable" },
];

export const resolutionRoutes = [
  { id: "payer-contract-review", label: "Payer contract / pricing review" },
  { id: "payer-appeals", label: "Payer appeals unit" },
  { id: "payer-supervisor-escalation", label: "Payer adjuster supervisor" },
  { id: "billing", label: "Internal billing team" },
  { id: "coding", label: "Coding / CDI" },
  { id: "front-end", label: "Front-end registration" },
  { id: "prior-auth", label: "Prior authorization team" },
  { id: "provider-office", label: "Provider / doctor’s office" },
  { id: "contracting", label: "Contract management" },
  { id: "patient-services", label: "Patient financial services" },
];
