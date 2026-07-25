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
      modifier: string;
      units: number;
      billed: number;
      allowed: number;
      priorPayerPaid: number;
      paid: number;
      patientResponsibility: number;
      adjustments: {
        group: string;
        reason: string;
        amount: number;
        description: string;
      }[];
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
    lineAllocations: {
      cpt: string;
      payment: number;
      contractual: number;
      deductible: number;
      coinsurance: number;
      copay: number;
      denial: number;
      code: string;
    }[];
    batchTotal: number;
    varianceReason: string;
  };
};

export const postingScenarios: PostingScenario[] = [
  {
    id: "PP-2401",
    title: "Harbor Blue batch 2401",
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
          modifier: "26",
          units: 1,
          billed: 2200,
          allowed: 1450,
          priorPayerPaid: 0,
          paid: 657.85,
          patientResponsibility: 792.15,
          adjustments: [
            {
              group: "CO",
              reason: "45",
              amount: 750,
              description: "Charge exceeds contracted fee schedule",
            },
            {
              group: "PR",
              reason: "1",
              amount: 700,
              description: "Deductible",
            },
            {
              group: "PR",
              reason: "2",
              amount: 92.15,
              description: "Coinsurance",
            },
          ],
        },
        {
          dos: "May 14, 2026",
          cpt: "76376",
          modifier: "",
          units: 1,
          billed: 280,
          allowed: 100,
          priorPayerPaid: 0,
          paid: 50,
          patientResponsibility: 50,
          adjustments: [
            {
              group: "CO",
              reason: "45",
              amount: 180,
              description: "Charge exceeds contracted fee schedule",
            },
            {
              group: "PR",
              reason: "1",
              amount: 30,
              description: "Deductible",
            },
            {
              group: "PR",
              reason: "2",
              amount: 20,
              description: "Coinsurance",
            },
          ],
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
            service: "MRI brain with 3-D rendering",
            cpt: "70551 + 76376",
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
      lineAllocations: [
        {
          cpt: "70551",
          payment: 657.85,
          contractual: 750,
          deductible: 700,
          coinsurance: 92.15,
          copay: 0,
          denial: 0,
          code: "CO-45 / PR-1 / PR-2",
        },
        {
          cpt: "76376",
          payment: 50,
          contractual: 180,
          deductible: 30,
          coinsurance: 20,
          copay: 0,
          denial: 0,
          code: "CO-45 / PR-1 / PR-2",
        },
      ],
      batchTotal: 28430.12,
      varianceReason: "interest-plb",
    },
  },
  {
    id: "PP-2407",
    title: "Crescent remit 2407",
    subtitle: "Crescent Choice · negative remit",
    priority: "High risk",
    status: "Takeback review",
    amount: "−$1,275.00",
    objective:
      "Analyze the negative remittance and original transaction evidence, then determine the correct account and posting treatment.",
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
          modifier: "",
          units: 1,
          billed: 2850,
          allowed: 1275,
          priorPayerPaid: 1275,
          paid: -1275,
          patientResponsibility: 0,
          adjustments: [
            {
              group: "CO",
              reason: "18",
              amount: 0,
              description: "Exact duplicate claim/service reversal reason",
            },
          ],
        },
      ],
      remarks: [
        "Negative payment references original batch BAT-0516-088 and transaction TXN-660184",
        "Posting the reversal restores $1,275.00 to insurance AR for account follow-up",
        "CO-18 is the payer reason; do not move the balance to patient solely because of this reversal",
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
        detail:
          "Payment posted May 16 to claim CC-91944206; the account settled to a $0.00 balance.",
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
      denial: 0,
      denialCode: "CO-18",
      action: "reverse-to-ar",
      lineAllocations: [
        {
          cpt: "45378",
          payment: -1275,
          contractual: 0,
          deductible: 0,
          coinsurance: 0,
          copay: 0,
          denial: 0,
          code: "CO-18",
        },
      ],
      batchTotal: -1275,
      varianceReason: "recoupment",
    },
  },
  {
    id: "PP-2412",
    title: "Northstar remit 2412",
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
          modifier: "",
          units: 1,
          billed: 800,
          allowed: 700,
          priorPayerPaid: 525,
          paid: 135,
          patientResponsibility: 40,
          adjustments: [
            {
              group: "CO",
              reason: "45",
              amount: 100,
              description: "Charge exceeds contracted fee schedule",
            },
            {
              group: "PR",
              reason: "2",
              amount: 40,
              description: "Coinsurance",
            },
          ],
        },
        {
          dos: "Jun 11, 2026",
          cpt: "93325",
          modifier: "",
          units: 1,
          billed: 120,
          allowed: 90,
          priorPayerPaid: 50,
          paid: 20,
          patientResponsibility: 20,
          adjustments: [
            {
              group: "CO",
              reason: "45",
              amount: 30,
              description: "Charge exceeds contracted fee schedule",
            },
            {
              group: "PR",
              reason: "2",
              amount: 20,
              description: "Coinsurance",
            },
          ],
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
            cpt: "93306 + 93325",
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
      lineAllocations: [
        {
          cpt: "93306",
          payment: 135,
          contractual: 100,
          deductible: 0,
          coinsurance: 40,
          copay: 0,
          denial: 0,
          code: "CO-45 / PR-2",
        },
        {
          cpt: "93325",
          payment: 20,
          contractual: 30,
          deductible: 0,
          coinsurance: 20,
          copay: 0,
          denial: 0,
          code: "CO-45 / PR-2",
        },
      ],
      batchTotal: 7864.58,
      varianceReason: "unmatched-held",
    },
  },
  {
    id: "PP-2420",
    title: "Meridian remit 2420",
    subtitle: "Meridian · multi-line claim",
    priority: "Priority",
    status: "Line exception",
    amount: "$11,840.00",
    objective:
      "Use the remittance to post each service independently and route any unresolved line correctly.",
    era: {
      payer: "Meridian Community Health",
      payee: "Evergreen Medical Group · NPI 1992881044",
      trace: "071005-228410",
      eraDate: "Jul 27, 2026",
      eraTotal: 11840,
      patientControl: "AC-821306-0702",
      payerClaim: "MC-66182047",
      patient: "Daniel Kim",
      memberId: "MCH-780-2241",
      serviceLines: [
        {
          dos: "Jul 2, 2026",
          cpt: "99214",
          modifier: "25",
          units: 1,
          billed: 280,
          allowed: 180,
          priorPayerPaid: 0,
          paid: 144,
          patientResponsibility: 36,
          adjustments: [
            {
              group: "CO",
              reason: "45",
              amount: 100,
              description: "Charge exceeds contracted fee schedule",
            },
            {
              group: "PR",
              reason: "2",
              amount: 36,
              description: "Coinsurance",
            },
          ],
        },
        {
          dos: "Jul 2, 2026",
          cpt: "93000",
          modifier: "",
          units: 1,
          billed: 95,
          allowed: 0,
          priorPayerPaid: 0,
          paid: 0,
          patientResponsibility: 0,
          adjustments: [
            {
              group: "CO",
              reason: "97",
              amount: 95,
              description: "Service is included in another adjudicated service",
            },
          ],
        },
      ],
      remarks: [
        "M15: Separately billed services/tests bundled because they are considered components of the same procedure",
        "Paid and denied service lines must be posted independently",
        "No patient liability is assigned to the denied 93000 line",
      ],
    },
    bank: {
      effectiveDate: "Jul 27, 2026",
      originator: "MERIDIAN COMM HEALTH",
      trace: "071005-228410",
      deposit: 11840,
      accountEnding: "••4408",
      status: "Settled",
    },
    proof: [
      {
        label: "Batch control",
        reference: "MER-BAT-0727-16",
        amount: 11840,
        detail: "ERA and EFT totals match; claim includes both paid and denied lines.",
      },
      {
        label: "Claim charge",
        reference: "MC-66182047",
        amount: 375,
        detail: "Two service lines billed on the same claim and DOS.",
      },
    ],
    accounts: [
      {
        id: "AC-821306",
        patient: "Daniel Kim",
        dob: "Dec 7, 1978",
        memberId: "MCH-780-2241",
        address: "Phoenix, AZ 85004",
        balance: 375,
        encounters: [
          {
            id: "ENC-720702",
            dos: "Jul 2, 2026",
            service: "Established visit with ECG",
            cpt: "99214 + 93000",
            billed: 375,
            openBalance: 375,
            claimId: "MC-66182047",
          },
        ],
      },
      {
        id: "AC-821360",
        patient: "Daniel K. Kim",
        dob: "Dec 17, 1978",
        memberId: "MCH-780-2421",
        address: "Mesa, AZ 85201",
        balance: 180,
        encounters: [
          {
            id: "ENC-720720",
            dos: "Jul 2, 2026",
            service: "New patient visit",
            cpt: "99204",
            billed: 375,
            openBalance: 180,
            claimId: "MC-66182740",
          },
        ],
      },
      {
        id: "AC-771306",
        patient: "Dane Kim",
        dob: "Jun 4, 1981",
        memberId: "NTH-114-8820",
        address: "Tempe, AZ 85281",
        balance: 95,
        encounters: [
          {
            id: "ENC-620702",
            dos: "Jul 2, 2025",
            service: "ECG only",
            cpt: "93000",
            billed: 95,
            openBalance: 95,
            claimId: "NS-44011820",
          },
        ],
      },
    ],
    expected: {
      accountId: "AC-821306",
      encounterId: "ENC-720702",
      payment: 144,
      contractual: 100,
      deductible: 0,
      coinsurance: 36,
      copay: 0,
      denial: 95,
      denialCode: "CO-97",
      action: "post-partial-denial",
      lineAllocations: [
        {
          cpt: "99214",
          payment: 144,
          contractual: 100,
          deductible: 0,
          coinsurance: 36,
          copay: 0,
          denial: 0,
          code: "CO-45 / PR-2",
        },
        {
          cpt: "93000",
          payment: 0,
          contractual: 0,
          deductible: 0,
          coinsurance: 0,
          copay: 0,
          denial: 95,
          code: "CO-97 / M15",
        },
      ],
      batchTotal: 11840,
      varianceReason: "none",
    },
  },
  {
    id: "PP-2425",
    title: "Harbor Blue remit 2425",
    subtitle: "Harbor Blue · benefit allocation",
    priority: "Routine",
    status: "Patient allocation",
    amount: "$4,680.24",
    objective:
      "Use the zero-pay service detail to determine the correct allocation for each line.",
    era: {
      payer: "Harbor Blue PPO",
      payee: "Evergreen Medical Group · NPI 1992881044",
      trace: "091000-773025",
      eraDate: "Jul 27, 2026",
      eraTotal: 4680.24,
      patientControl: "AC-824418-0710",
      payerClaim: "HB-44077209",
      patient: "Nora Alvarez",
      memberId: "HBX-882-7710",
      serviceLines: [
        {
          dos: "Jul 10, 2026",
          cpt: "80053",
          modifier: "",
          units: 1,
          billed: 135,
          allowed: 72,
          priorPayerPaid: 0,
          paid: 0,
          patientResponsibility: 72,
          adjustments: [
            {
              group: "CO",
              reason: "45",
              amount: 63,
              description: "Charge exceeds contracted fee schedule",
            },
            {
              group: "PR",
              reason: "1",
              amount: 72,
              description: "Deductible",
            },
          ],
        },
        {
          dos: "Jul 10, 2026",
          cpt: "36415",
          modifier: "",
          units: 1,
          billed: 35,
          allowed: 12,
          priorPayerPaid: 0,
          paid: 0,
          patientResponsibility: 12,
          adjustments: [
            {
              group: "CO",
              reason: "45",
              amount: 23,
              description: "Charge exceeds contracted fee schedule",
            },
            {
              group: "PR",
              reason: "1",
              amount: 12,
              description: "Deductible",
            },
          ],
        },
      ],
      remarks: [
        "The selected claim contributes $0.00 to the batch payment total",
        "Both lines are allowed and adjudicated to member deductible",
        "Contractual reductions remain provider responsibility",
      ],
    },
    bank: {
      effectiveDate: "Jul 27, 2026",
      originator: "HARBOR BLUE HEALTH",
      trace: "091000-773025",
      deposit: 4680.24,
      accountEnding: "••4408",
      status: "Settled",
    },
    proof: [
      {
        label: "Benefit accumulator",
        reference: "DED-2026-8827710",
        amount: 84,
        detail: "Remaining in-network deductible exceeded the selected claim allowed amount.",
      },
      {
        label: "Batch claim payments",
        reference: "TRN 091000-773025",
        amount: 4680.24,
        detail: "Payment belongs to other claims in the same ERA.",
      },
    ],
    accounts: [
      {
        id: "AC-824418",
        patient: "Nora Alvarez",
        dob: "Apr 18, 1990",
        memberId: "HBX-882-7710",
        address: "Austin, TX 78704",
        balance: 170,
        encounters: [
          {
            id: "ENC-710710",
            dos: "Jul 10, 2026",
            service: "Comprehensive metabolic panel",
            cpt: "80053 + 36415",
            billed: 170,
            openBalance: 170,
            claimId: "HB-44077209",
          },
        ],
      },
      {
        id: "AC-824481",
        patient: "Nora Alvarado",
        dob: "Apr 8, 1990",
        memberId: "HBX-882-7170",
        address: "Round Rock, TX 78664",
        balance: 72,
        encounters: [
          {
            id: "ENC-710701",
            dos: "Jul 10, 2026",
            service: "Thyroid panel",
            cpt: "84443",
            billed: 170,
            openBalance: 72,
            claimId: "HB-44077902",
          },
        ],
      },
      {
        id: "AC-722418",
        patient: "Nora Alvarez",
        dob: "Apr 18, 1990",
        memberId: "MCH-330-1142",
        address: "Austin, TX 78704",
        balance: 0,
        encounters: [
          {
            id: "ENC-610710",
            dos: "Jul 10, 2025",
            service: "Lab panel",
            cpt: "80053",
            billed: 160,
            openBalance: 0,
            claimId: "MC-55022109",
          },
        ],
      },
    ],
    expected: {
      accountId: "AC-824418",
      encounterId: "ENC-710710",
      payment: 0,
      contractual: 86,
      deductible: 84,
      coinsurance: 0,
      copay: 0,
      denial: 0,
      denialCode: "",
      action: "post-patient-responsibility",
      lineAllocations: [
        {
          cpt: "80053",
          payment: 0,
          contractual: 63,
          deductible: 72,
          coinsurance: 0,
          copay: 0,
          denial: 0,
          code: "CO-45 / PR-1",
        },
        {
          cpt: "36415",
          payment: 0,
          contractual: 23,
          deductible: 12,
          coinsurance: 0,
          copay: 0,
          denial: 0,
          code: "CO-45 / PR-1",
        },
      ],
      batchTotal: 4680.24,
      varianceReason: "none",
    },
  },
  {
    id: "PP-2431",
    title: "Crescent remit 2431",
    subtitle: "Crescent Choice · adjudicated claim",
    priority: "High risk",
    status: "No payment",
    amount: "$9,244.16",
    objective:
      "Review the zero-pay claim response, post the service-line outcome, and choose the appropriate transaction path.",
    era: {
      payer: "Crescent Choice",
      payee: "Evergreen Medical Group · NPI 1992881044",
      trace: "114002-668311",
      eraDate: "Jul 27, 2026",
      eraTotal: 9244.16,
      patientControl: "AC-829905-0624",
      payerClaim: "CC-99281140",
      patient: "Elliot Morgan",
      memberId: "CCR-440-9918",
      serviceLines: [
        {
          dos: "Jun 24, 2026",
          cpt: "72148",
          modifier: "",
          units: 1,
          billed: 1800,
          allowed: 0,
          priorPayerPaid: 0,
          paid: 0,
          patientResponsibility: 0,
          adjustments: [
            {
              group: "CO",
              reason: "197",
              amount: 1800,
              description: "Precertification / authorization absent",
            },
          ],
        },
      ],
      remarks: [
        "N130: Consult plan benefit documents or guidelines for restrictions",
        "No patient responsibility assigned on the remittance",
        "The selected claim contributes $0.00 to the batch payment total",
      ],
    },
    bank: {
      effectiveDate: "Jul 27, 2026",
      originator: "CRESCENT CHOICE",
      trace: "114002-668311",
      deposit: 9244.16,
      accountEnding: "••4408",
      status: "Settled",
    },
    proof: [
      {
        label: "Claim acknowledgment",
        reference: "277CA CC-99281140",
        amount: 1800,
        detail: "Claim was accepted and adjudicated; this is not a clearinghouse rejection.",
      },
      {
        label: "Batch claim payments",
        reference: "TRN 114002-668311",
        amount: 9244.16,
        detail: "Payment belongs to other claims in the ERA.",
      },
    ],
    accounts: [
      {
        id: "AC-829905",
        patient: "Elliot Morgan",
        dob: "Sep 30, 1964",
        memberId: "CCR-440-9918",
        address: "Charlotte, NC 28202",
        balance: 1800,
        encounters: [
          {
            id: "ENC-660624",
            dos: "Jun 24, 2026",
            service: "Lumbar MRI without contrast",
            cpt: "72148",
            billed: 1800,
            openBalance: 1800,
            claimId: "CC-99281140",
          },
        ],
      },
      {
        id: "AC-829950",
        patient: "Elliott Morgan",
        dob: "Sep 3, 1964",
        memberId: "CCR-440-9981",
        address: "Concord, NC 28025",
        balance: 810,
        encounters: [
          {
            id: "ENC-660642",
            dos: "Jun 24, 2026",
            service: "Thoracic MRI",
            cpt: "72146",
            billed: 1800,
            openBalance: 810,
            claimId: "CC-99281410",
          },
        ],
      },
      {
        id: "AC-719905",
        patient: "Elliot Morgan",
        dob: "Sep 30, 1964",
        memberId: "HBX-771-4409",
        address: "Charlotte, NC 28202",
        balance: 0,
        encounters: [
          {
            id: "ENC-560624",
            dos: "Jun 24, 2025",
            service: "Lumbar MRI",
            cpt: "72148",
            billed: 1750,
            openBalance: 0,
            claimId: "HB-22011840",
          },
        ],
      },
    ],
    expected: {
      accountId: "AC-829905",
      encounterId: "ENC-660624",
      payment: 0,
      contractual: 0,
      deductible: 0,
      coinsurance: 0,
      copay: 0,
      denial: 1800,
      denialCode: "CO-197",
      action: "post-claim-denial",
      lineAllocations: [
        {
          cpt: "72148",
          payment: 0,
          contractual: 0,
          deductible: 0,
          coinsurance: 0,
          copay: 0,
          denial: 1800,
          code: "CO-197 / N130",
        },
      ],
      batchTotal: 9244.16,
      varianceReason: "none",
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
    providerNpi: string;
    providerTaxId: string;
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
  previousNotes: {
    date: string;
    author: string;
    department: string;
    note: string;
  }[];
  documents: {
    type: string;
    date: string;
    reference: string;
    summary: string;
    codes: string;
    body: string;
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
    checkOrEft: string;
    patientControl: string;
    claimBilled: number;
    claimAllowed: number;
    claimPaid: number;
    claimPatientResponsibility: number;
    serviceLines: {
      cpt: string;
      billed: number;
      allowed: number;
      paid: number;
      adjustment: number;
      patientResponsibility: number;
      codes: string;
      status: string;
    }[];
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
    title: "Surgical claim review",
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
      providerNpi: "1992881044",
      providerTaxId: "91-8842017",
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
    previousNotes: [
      { date: "May 3 · 2:18 PM", author: "Auto Posting", department: "Payment Posting", note: "ERA posted to claim CL-7719204. Insurance paid $10,120.00; CO-45 adjustment $8,520.00; patient responsibility $0.00." },
      { date: "Jun 12 · 9:44 AM", author: "R. Vega", department: "AR Contract Review", note: "Potential underpayment identified. Contract grid lists a $12,600.00 joint case rate for CPT 27447. Routed for collector validation." },
      { date: "Jul 10 · 11:21 AM", author: "T. Wells", department: "AR Follow-up", note: "Called Northstar. Rep opened pricing request NS-884120 and advised 15–20 business days. No documentation was attached during the call." },
      { date: "Jul 25 · 4:02 PM", author: "System", department: "Work Queue", note: "Follow-up date reached. Balance remains $2,480.00. Pricing request outcome not documented." },
    ],
    documents: [
      { type: "EOB / ERA", date: "May 3", reference: "ICN NS-44029118", summary: "Paid at $10,120.00 with CO-45 adjustment. No denial or patient responsibility.", codes: "CO-45 · N/A", body: "This remittance reflects final adjudication of the facility claim. Payment was issued by EFT 331089. Review individual service lines and contractual terms before billing any remaining balance." },
      { type: "Contract excerpt", date: "Jan 1", reference: "NS-EVG-2026 §4.2", summary: "In-network total knee arthroplasty reimburses at a $12,600 case rate.", codes: "Case rate · CPT 27447", body: "Section 4.2: Covered total knee arthroplasty facility services billed with CPT 27447 reimburse at the contracted case rate. Associated same-day facility services are included." },
      { type: "Payer correspondence", date: "Jul 10", reference: "NS-884120", summary: "Reprocessing request opened; standard turnaround 15–20 business days.", codes: "Queue: Pricing review", body: "Northstar pricing review acknowledgment. Request received without contract attachment. If reconsideration is required, include the applicable contract page, payer ICN, and expected reimbursement calculation." },
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
      checkOrEft: "EFT 331089 · May 3, 2026",
      patientControl: "CL-7719204",
      claimBilled: 18640,
      claimAllowed: 10120,
      claimPaid: 10120,
      claimPatientResponsibility: 0,
      serviceLines: [
        { cpt: "27447", billed: 17400, allowed: 9300, paid: 9300, adjustment: 8100, patientResponsibility: 0, codes: "CO-45", status: "Paid" },
        { cpt: "73560", billed: 1240, allowed: 820, paid: 820, adjustment: 420, patientResponsibility: 0, codes: "CO-45", status: "Paid" },
      ],
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
    title: "Occupational health claim",
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
      providerNpi: "1447289062",
      providerTaxId: "93-7712048",
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
    previousNotes: [
      { date: "Mar 10 · 3:16 PM", author: "M. Allen", department: "Billing", note: "Initial bill, First Report of Injury, and employer information transmitted to Pioneer Casualty. Claim number WC-558-291 confirmed." },
      { date: "Apr 2 · 10:44 AM", author: "S. Ortiz", department: "Document Team", note: "Uploaded operative report, work-status note, imaging, and UR certification. Portal receipt RC-220147 saved to account." },
      { date: "Jun 17 · 1:05 PM", author: "J. Lee", department: "AR Follow-up", note: "Portal shows all requested documents received. Claim still pending liability determination. No EOB or payment issued." },
      { date: "Jul 8 · 4:37 PM", author: "J. Lee", department: "AR Follow-up", note: "Called adjuster desk 47. Reached voicemail; left patient, claim, DOS, and callback information. No live contact or reference number obtained." },
    ],
    documents: [
      { type: "Acknowledgment", date: "Mar 14", reference: "PIO-WC-558-291", summary: "Claim and initial bill received. Liability investigation pending.", codes: "No EOB issued", body: "Pioneer Casualty acknowledges receipt of the initial medical bill. This notice is not a payment determination. The assigned adjuster will review compensability and contact the provider if more information is required." },
      { type: "Medical-record receipt", date: "Apr 2", reference: "RC-220147", summary: "Operative report, work-status note, and imaging received.", codes: "24 pages", body: "Secure document receipt confirms successful delivery of 24 pages: operative report, imaging, work-status documentation, and utilization review certification." },
      { type: "Employer correspondence", date: "Mar 9", reference: "ER-4418", summary: "Employer confirmed reported injury date March 5 and accepted work relationship.", codes: "Employer report on file", body: "The employer confirms that the reported knee injury occurred during scheduled work activities on March 5, 2026. This correspondence does not represent the carrier's compensability decision." },
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
      checkOrEft: "No payment issued",
      patientControl: "CL-7601138",
      claimBilled: 6920,
      claimAllowed: 0,
      claimPaid: 0,
      claimPatientResponsibility: 0,
      serviceLines: [
        { cpt: "29881", billed: 6120, allowed: 0, paid: 0, adjustment: 0, patientResponsibility: 0, codes: "Pending liability", status: "In process" },
        { cpt: "73562", billed: 800, allowed: 0, paid: 0, adjustment: 0, patientResponsibility: 0, codes: "Pending liability", status: "In process" },
      ],
    },
    callQuestions: [
      { question: "Are any records still missing?", answer: "No. I see the operative report, work-status note, imaging, and utilization review certification." },
      { question: "Has a liability determination been issued?", answer: "No determination is on file. The assigned adjuster has not completed review." },
      { question: "Can this be escalated today?", answer: "Yes. Request the adjuster supervisor queue because the response window has passed." },
      { question: "What is the call reference number?", answer: "Reference PIO-260726-447. Supervisor review is due within five business days." },
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
    title: "Corrected imaging claim",
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
      providerNpi: "1669402281",
      providerTaxId: "91-8842017",
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
    previousNotes: [
      { date: "Mar 1 · 8:22 AM", author: "Claims Bot", department: "Clearinghouse", note: "Original professional claim accepted by Harbor Blue. 277CA acknowledgment ACK-0301-774 indexed as proof of initial receipt." },
      { date: "Apr 4 · 2:10 PM", author: "A. Young", department: "AR Follow-up", note: "Portal returned claim for rendering taxonomy correction. Task sent to credentialing; patient balance remains suppressed." },
      { date: "Jun 14 · 9:48 AM", author: "D. Singh", department: "Billing", note: "Corrected claim submitted with frequency code 7 after taxonomy update. Original payer ICN was not populated in claim reference field." },
      { date: "Jul 22 · 3:33 PM", author: "Auto Posting", department: "Payment Posting", note: "Zero-pay ERA posted: CO-29 / N211. No patient responsibility. Appeal deadline calculated as Aug 8, 2026." },
    ],
    documents: [
      { type: "277CA acceptance", date: "Mar 1", reference: "ACK-0301-774", summary: "Original claim accepted by Harbor Blue eight days after DOS.", codes: "A1 · 19 · Accepted", body: "Claim acknowledgment: accepted into payer adjudication. Patient control CL-7413360, DOS Feb 22, 2026, billed $1,175.00. This acknowledgment is evidence of electronic receipt." },
      { type: "ERA / EOB", date: "Jul 22", reference: "HB-99104420", summary: "Corrected claim denied for timely filing; no patient responsibility assigned.", codes: "CO-29 · N211", body: "The time limit for filing has expired. This remittance assigns no patient responsibility. Review original submission evidence and appeal instructions before changing account liability." },
      { type: "Claim image", date: "Jun 14", reference: "CLM-0614-018", summary: "Corrected taxonomy only; same patient, DOS, procedure, and billed amount.", codes: "Frequency 7", body: "Corrected claim frequency 7. Patient, member ID, DOS, CPT, diagnosis, and billed charge match the original. Rendering taxonomy is the only substantive correction." },
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
      checkOrEft: "No payment issued",
      patientControl: "CL-7413360",
      claimBilled: 1175,
      claimAllowed: 0,
      claimPaid: 0,
      claimPatientResponsibility: 0,
      serviceLines: [
        { cpt: "72148", billed: 1175, allowed: 0, paid: 0, adjustment: 1175, patientResponsibility: 0, codes: "CO-29 · N211", status: "Denied" },
      ],
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
  {
    id: "AR-3160",
    title: "Emergency encounter review",
    subtitle: "Meridian · commercial",
    priority: "Priority",
    status: "73 days in AR",
    amount: "$3,200.00",
    patient: {
      name: "Camille Foster",
      account: "AC-736044",
      dob: "Oct 11, 1985",
      memberId: "MCH-440-7781",
      payer: "Meridian Community Health",
      plan: "Meridian Select PPO",
      dos: "May 8, 2026",
      provider: "Dr. Lena Walsh",
      providerNpi: "1225487714",
      providerTaxId: "91-8842017",
      location: "Evergreen Emergency Department",
    },
    claim: {
      claimId: "CL-7360448",
      billed: 3200,
      allowed: 0,
      paid: 0,
      patientResponsibility: 0,
      openAr: 3200,
      aging: "61–90 days",
      filingLimit: "120 days from DOS",
      appealDeadline: "Sep 18, 2026",
      services: [
        { cpt: "99285", description: "Emergency department visit", units: 1, charge: 2500 },
        { cpt: "71046", description: "Chest radiology, two views", units: 1, charge: 700 },
      ],
    },
    billingHistory: [
      { date: "May 8", event: "Emergency services posted", detail: "Meridian coverage selected from registration response", source: "Front end" },
      { date: "May 11", event: "Claim accepted", detail: "Clearinghouse acceptance MCH-A1-55108", source: "Claims" },
      { date: "May 27", event: "ERA posted", detail: "Zero-pay adjudication; no patient responsibility", source: "835" },
      { date: "Jun 9", event: "Eligibility rechecked", detail: "Portal displays coordination-of-benefits review flag", source: "AR" },
      { date: "Jul 14", event: "Patient message indexed", detail: "Patient uploaded an employer plan card effective before DOS", source: "Patient portal" },
    ],
    previousNotes: [
      { date: "May 27 · 7:42 AM", author: "Auto Posting", department: "Payment Posting", note: "ERA posted with CO-22 / MA04. Both lines denied; patient liability remains $0.00." },
      { date: "Jun 9 · 11:18 AM", author: "K. Ramos", department: "AR Follow-up", note: "Meridian eligibility active on DOS. Portal indicates another payer may be primary. No alternate policy details available in payer response." },
      { date: "Jul 14 · 2:06 PM", author: "Patient Services", department: "Correspondence", note: "Patient uploaded Summit Employer Health card. Effective date shown as Jan 1, 2026. Card not yet added to account coverage." },
      { date: "Jul 18 · 9:55 AM", author: "System", department: "Work Queue", note: "Account returned to AR queue with $3,200.00 insurance balance. Patient billing hold remains active." },
    ],
    documents: [
      { type: "EOB / ERA", date: "May 27", reference: "ICN MCH-77182004", summary: "Claim denied because another payer may be primary. No patient responsibility assigned.", codes: "CO-22 · MA04", body: "Payment may be the responsibility of another payer under coordination-of-benefits rules. Submit primary payer adjudication or corrected coverage information. This EOB does not assign the denied amount to the member." },
      { type: "Eligibility response", date: "Jun 9", reference: "ELG-660441", summary: "Meridian coverage active on DOS with COB information requested.", codes: "Active · COB review", body: "Member eligibility was active from Jan 1 through Dec 31, 2026. Coordination-of-benefits information is incomplete. Provider should verify other insurance before resubmission." },
      { type: "Patient correspondence", date: "Jul 14", reference: "MSG-220814", summary: "Patient supplied a Summit Employer Health card.", codes: "Effective Jan 1, 2026", body: "Patient message: I had employer insurance through Summit on the emergency visit date. I have attached the front and back of my card. Meridian is my secondary plan." },
    ],
    transactions: [
      { date: "May 8", type: "Charge", amount: 3200, reference: "CHG-90518", status: "Posted" },
      { date: "May 11", type: "Claim submission", amount: 0, reference: "MCH-A1-55108", status: "Accepted" },
      { date: "May 27", type: "Denial", amount: 3200, reference: "CO-22", status: "Open insurance AR" },
    ],
    relatedAccounts: [
      { account: "AC-736044-01", dos: "Apr 22, 2026", balance: 0, status: "Meridian primary claim paid" },
      { account: "AC-736044-03", dos: "Jun 2, 2026", balance: 145, status: "Summit coverage listed" },
    ],
    insurance: {
      effective: "Jan 1, 2026",
      termination: "Active",
      network: "In network",
      coordination: "System currently shows primary",
      subscriber: "Self",
      phone: "800-555-0161",
    },
    authorization: {
      required: "No for emergency services",
      number: "Not required",
      status: "N/A",
      span: "May 8, 2026",
      services: "Emergency encounter",
      notes: "No authorization issue identified.",
    },
    contract: {
      name: "Meridian emergency fee schedule",
      effective: "Jan 1, 2026",
      method: "fee-schedule",
      rate: 2200,
      percent: 0,
      terms: "Combined allowed amount for the emergency visit and radiology is $2,200.00 before other-payer coordination.",
    },
    portal: {
      status: "Denied",
      received: "May 11, 2026",
      finalized: "May 26, 2026",
      reason: "Payer records indicate other coverage may be primary on the date of service.",
      icn: "MCH-77182004",
      nextStep: "Submit primary EOB or updated coordination-of-benefits information.",
      checkOrEft: "No payment issued",
      patientControl: "CL-7360448",
      claimBilled: 3200,
      claimAllowed: 0,
      claimPaid: 0,
      claimPatientResponsibility: 0,
      serviceLines: [
        { cpt: "99285", billed: 2500, allowed: 0, paid: 0, adjustment: 2500, patientResponsibility: 0, codes: "CO-22 · MA04", status: "Denied" },
        { cpt: "71046", billed: 700, allowed: 0, paid: 0, adjustment: 700, patientResponsibility: 0, codes: "CO-22 · MA04", status: "Denied" },
      ],
    },
    callQuestions: [
      { question: "What other-payer information is on the member record?", answer: "The file shows Summit Employer Health as potentially primary effective January 1, but the COB record is not complete." },
      { question: "Will Meridian accept a corrected claim after primary adjudication?", answer: "Yes. Submit the primary EOB and use the original Meridian ICN in the secondary claim reference." },
      { question: "Should any amount be transferred to the patient now?", answer: "No. The EOB does not assign patient responsibility while COB is unresolved." },
      { question: "What is the call reference number?", answer: "Reference MCH-CALL-736044. COB update turnaround is five business days." },
    ],
    expected: {
      method: "fee-schedule",
      expectedAllowed: 2200,
      expectedPayment: 2200,
      variance: 2200,
      action: "insurance-update",
      route: "front-end",
      rationale: "Update the verified primary coverage before rebilling; keep the patient balance suppressed until primary adjudication is available.",
    },
  },
  {
    id: "AR-3174",
    title: "Specialty infusion claim",
    subtitle: "Northstar · commercial",
    priority: "High risk",
    status: "81 days in AR",
    amount: "$3,600.00",
    patient: {
      name: "Renee Wallace",
      account: "AC-730882",
      dob: "Feb 24, 1976",
      memberId: "NSH-772-6614",
      payer: "Northstar Health",
      plan: "Northstar Choice PPO",
      dos: "May 1, 2026",
      provider: "Dr. Maya Chen",
      providerNpi: "1881027746",
      providerTaxId: "91-8842017",
      location: "Evergreen Infusion Center",
    },
    claim: {
      claimId: "CL-7308825",
      billed: 8400,
      allowed: 4200,
      paid: 4200,
      patientResponsibility: 0,
      openAr: 3600,
      aging: "61–90 days",
      filingLimit: "180 days from DOS",
      appealDeadline: "Sep 12, 2026",
      services: [
        { cpt: "J1745", description: "Infliximab, 10 mg", units: 40, charge: 7200 },
        { cpt: "96413", description: "Chemotherapy administration", units: 1, charge: 1200 },
      ],
    },
    billingHistory: [
      { date: "Apr 20", event: "Authorization indexed", detail: "Approval NS-AUTH-884219 for 40 units J1745", source: "Prior auth" },
      { date: "May 1", event: "Infusion completed", detail: "Medication administration record signed", source: "Clinical" },
      { date: "May 5", event: "Claim accepted", detail: "Clearinghouse acceptance NS-A1-730882", source: "Claims" },
      { date: "May 18", event: "Partial ERA posted", detail: "20 drug units and administration paid", source: "835" },
      { date: "Jul 2", event: "Auth copy uploaded", detail: "Approval letter attached to payer message", source: "AR" },
    ],
    previousNotes: [
      { date: "Apr 20 · 10:30 AM", author: "L. Perry", department: "Prior Authorization", note: "Northstar approved J1745 40 units for May 1. Authorization NS-AUTH-884219 valid Apr 28–May 5." },
      { date: "May 18 · 8:08 AM", author: "Auto Posting", department: "Payment Posting", note: "EFT payment $4,200.00 posted. J1745 paid for 20 units; remaining drug amount denied CO-197 / N130. Administration line paid." },
      { date: "Jun 4 · 3:51 PM", author: "C. Bell", department: "AR Follow-up", note: "Portal claim image shows authorization field truncated to NS-AUTH-884. Requested claim review through secure message." },
      { date: "Jul 2 · 9:17 AM", author: "C. Bell", department: "AR Follow-up", note: "Uploaded full authorization letter. Portal message closed with instruction to call Provider Services for reprocessing request." },
    ],
    documents: [
      { type: "EOB / ERA", date: "May 18", reference: "ICN NS-55100842", summary: "Administration and part of drug line paid; remaining drug amount denied.", codes: "CO-197 · N130", body: "The remittance paid the administration service and 20 units of J1745. The remaining drug units were not paid because the authorization information received did not support those units. No patient responsibility is assigned." },
      { type: "Authorization letter", date: "Apr 20", reference: "NS-AUTH-884219", summary: "J1745 approved for 40 units on May 1.", codes: "Approved · 40 units", body: "Northstar authorizes infliximab J1745, 40 units, for the service window Apr 28 through May 5, 2026, at Evergreen Infusion Center." },
      { type: "Portal correspondence", date: "Jul 2", reference: "MSG-NS-11804", summary: "Full authorization received; provider instructed to request claim reprocessing.", codes: "Attachment accepted", body: "Your attachment was received and indexed. Provider Services may initiate reprocessing using the full authorization number and payer claim control number." },
    ],
    transactions: [
      { date: "May 1", type: "Charge", amount: 8400, reference: "CHG-1745", status: "Posted" },
      { date: "May 18", type: "Insurance payment", amount: 4200, reference: "EFT 881104", status: "Posted" },
      { date: "May 18", type: "Contractual adjustment", amount: -600, reference: "CO-45", status: "Posted" },
      { date: "May 18", type: "Denied balance", amount: 3600, reference: "CO-197", status: "Open insurance AR" },
    ],
    relatedAccounts: [
      { account: "AC-730882-01", dos: "Mar 6, 2026", balance: 0, status: "Prior infusion paid 40 units" },
      { account: "AC-730882-03", dos: "Jun 26, 2026", balance: 0, status: "Later infusion paid after auth format update" },
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
      number: "NS-AUTH-884219",
      status: "Approved",
      span: "Apr 28–May 5, 2026",
      services: "J1745 · 40 units",
      notes: "Full approval letter supports all billed drug units.",
    },
    contract: {
      name: "Northstar infusion fee schedule",
      effective: "Jan 1, 2026",
      method: "fee-schedule",
      rate: 7800,
      percent: 0,
      terms: "Expected allowed amount is $7,800.00 for 40 drug units plus administration. No patient responsibility.",
    },
    portal: {
      status: "Partially paid",
      received: "May 5, 2026",
      finalized: "May 17, 2026",
      reason: "Only 20 J1745 units matched the truncated authorization value received on the claim.",
      icn: "NS-55100842",
      nextStep: "Provider Services can initiate reprocessing with the full authorization.",
      checkOrEft: "EFT 881104 · May 18, 2026",
      patientControl: "CL-7308825",
      claimBilled: 8400,
      claimAllowed: 4200,
      claimPaid: 4200,
      claimPatientResponsibility: 0,
      serviceLines: [
        { cpt: "J1745", billed: 7200, allowed: 3600, paid: 3600, adjustment: 3600, patientResponsibility: 0, codes: "CO-197 · N130", status: "20 units paid / 20 denied" },
        { cpt: "96413", billed: 1200, allowed: 600, paid: 600, adjustment: 600, patientResponsibility: 0, codes: "CO-45", status: "Paid" },
      ],
    },
    callQuestions: [
      { question: "How many J1745 units were adjudicated as authorized?", answer: "Twenty units matched. The remaining twenty denied because the authorization field was truncated." },
      { question: "Can the full authorization be linked without a corrected claim?", answer: "Yes. I can submit a reprocessing request using NS-AUTH-884219 and the attachment already indexed." },
      { question: "What is the reprocessing turnaround?", answer: "Standard turnaround is 10–15 business days. Keep the balance with insurance." },
      { question: "What is the call reference number?", answer: "Reference NS-CALL-730882. Reprocessing request RP-55100842 was opened today." },
    ],
    expected: {
      method: "fee-schedule",
      expectedAllowed: 7800,
      expectedPayment: 7800,
      variance: 3600,
      action: "reprocess",
      route: "payer-appeals",
      rationale: "The full authorization supports all billed drug units; request payer reprocessing and retain the balance in insurance AR.",
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
