export type ClaimForm = "CMS-1500" | "UB-04";
export type FieldGroup = "Coverage" | "Patient" | "Provider" | "Clinical" | "Services" | "Claim totals";

export type BillingField = {
  id: string;
  locator: string;
  label: string;
  group: FieldGroup;
  required?: boolean;
  type?: "text" | "date" | "number";
  line?: number;
};

export type SourceSection = {
  title: string;
  source: string;
  items: { label: string; value: string }[];
};

export type BillingScenario = {
  id: string;
  form: ClaimForm;
  patient: string;
  dob: string;
  payer: string;
  account: string;
  claimClass: string;
  status: string;
  complexity: "Foundation" | "Intermediate" | "Advanced";
  total: number;
  age: number;
  filingDays: number;
  expectedRank: number;
  priorityReason: string;
  sourceSections: SourceSection[];
  serviceCount: number;
  answers: Record<string, string>;
  initial: Record<string, string>;
};

const cmsFields: BillingField[] = [
  ["coverage", "1", "Type of health insurance", "Coverage", true],
  ["memberId", "1a", "Insured ID number", "Coverage", true],
  ["patientName", "2", "Patient name", "Patient", true],
  ["patientDob", "3", "Patient birth date", "Patient", true, "date"],
  ["patientSex", "3", "Patient sex", "Patient", true],
  ["insuredName", "4", "Insured name", "Coverage", true],
  ["patientAddress", "5", "Patient address", "Patient", true],
  ["patientPhone", "5", "Patient telephone", "Patient", true],
  ["relationship", "6", "Relationship to insured", "Coverage", true],
  ["insuredAddress", "7", "Insured address", "Coverage", true],
  ["insuredPhone", "7", "Insured telephone", "Coverage", true],
  ["policy", "11", "Policy or group number", "Coverage", true],
  ["insuredDob", "11a", "Insured birth date", "Coverage", true, "date"],
  ["insuredSex", "11a", "Insured sex", "Coverage", true],
  ["planName", "11c", "Insurance plan name", "Coverage", true],
  ["anotherPlan", "11d", "Another health benefit plan", "Coverage", true],
  ["patientSignature", "12", "Patient authorization", "Coverage", true],
  ["insuredSignature", "13", "Payment authorization", "Coverage", true],
  ["illnessDate", "14", "Date of current illness", "Clinical", true, "date"],
  ["outsideLab", "20", "Outside laboratory", "Clinical", true],
  ["icdIndicator", "21 · ICD Ind.", "ICD indicator (0 = ICD-10-CM)", "Clinical", true],
  ["diagnosis", "21A", "Primary diagnosis", "Clinical", true],
  ["dos1", "24A · line 1", "Date of service", "Services", true, "date", 1],
  ["pos1", "24B · line 1", "Place of service", "Services", true, "text", 1],
  ["cpt1", "24D · line 1", "CPT / HCPCS", "Services", true, "text", 1],
  ["pointer1", "24E · line 1", "Diagnosis pointer", "Services", true, "text", 1],
  ["charge1", "24F · line 1", "Charge", "Services", true, "number", 1],
  ["units1", "24G · line 1", "Units", "Services", true, "number", 1],
  ["renderingNpi1", "24J · line 1", "Rendering NPI", "Provider", true, "text", 1],
  ["dos2", "24A · line 2", "Date of service", "Services", false, "date", 2],
  ["pos2", "24B · line 2", "Place of service", "Services", false, "text", 2],
  ["cpt2", "24D · line 2", "CPT / HCPCS", "Services", false, "text", 2],
  ["pointer2", "24E · line 2", "Diagnosis pointer", "Services", false, "text", 2],
  ["charge2", "24F · line 2", "Charge", "Services", false, "number", 2],
  ["units2", "24G · line 2", "Units", "Services", false, "number", 2],
  ["renderingNpi2", "24J · line 2", "Rendering NPI", "Provider", false, "text", 2],
  ["taxId", "25", "Federal tax ID", "Provider", true],
  ["patientAccount", "26", "Patient account number", "Claim totals", true],
  ["assignment", "27", "Accept assignment", "Claim totals", true],
  ["totalCharges", "28", "Total charges", "Claim totals", true, "number"],
  ["amountPaid", "29", "Amount paid", "Claim totals", true, "number"],
  ["balanceDue", "30", "Balance due", "Claim totals", true, "number"],
  ["providerSignature", "31", "Physician / supplier signature", "Provider", true],
  ["providerSignatureDate", "31", "Signature date", "Provider", true, "date"],
  ["facility", "32", "Service facility", "Provider", true],
  ["facilityNpi", "32a", "Service facility NPI", "Provider", true],
  ["billingProvider", "33", "Billing provider", "Provider", true],
  ["billingNpi", "33a", "Billing provider NPI", "Provider", true],
].map(([id, locator, label, group, required, type, line]) => ({
  id: String(id), locator: String(locator), label: String(label), group: group as FieldGroup,
  required: Boolean(required), type: (type as BillingField["type"]) || "text", line: line ? Number(line) : undefined,
}));

const ubStatic: BillingField[] = [
  ["provider", "1", "Provider name and address", "Provider", true],
  ["patientControl", "3a", "Patient control number", "Claim totals", true],
  ["medicalRecord", "3b", "Medical record number", "Patient", true],
  ["typeOfBill", "4", "Type of bill", "Claim totals", true],
  ["taxId", "5", "Federal tax ID", "Provider", true],
  ["statementFrom", "6", "Statement from", "Claim totals", true, "date"],
  ["statementThrough", "6", "Statement through", "Claim totals", true, "date"],
  ["patientName", "8", "Patient name", "Patient", true],
  ["patientAddress", "9", "Patient address", "Patient", true],
  ["patientDob", "10", "Patient birth date", "Patient", true, "date"],
  ["patientSex", "11", "Patient sex", "Patient", true],
  ["admitDate", "12", "Admission / start-of-care date", "Clinical", true, "date"],
  ["admitHour", "13", "Admission hour", "Clinical", true],
  ["admitType", "14", "Priority / type of admission", "Clinical", true],
  ["patientStatus", "17", "Patient discharge status", "Clinical", true],
  ["totalCharges", "47 · line 23", "Total charges", "Claim totals", true, "number"],
  ["creationDate", "45 · line 23", "Claim creation date", "Claim totals", true, "date"],
  ["payer", "50A", "Payer name", "Coverage", true],
  ["planId", "51A", "Health plan ID", "Coverage", true],
  ["releaseInfo", "52A", "Release of information", "Coverage", true],
  ["benefitsAssignment", "53A", "Assignment of benefits", "Coverage", true],
  ["priorPayments", "54A", "Prior payments", "Claim totals", true, "number"],
  ["estimatedDue", "55A", "Estimated amount due", "Claim totals", true, "number"],
  ["providerNpi", "56", "Billing provider NPI", "Provider", true],
  ["insuredName", "58A", "Insured name", "Coverage", true],
  ["relationship", "59A", "Relationship to insured", "Coverage", true],
  ["memberId", "60A", "Insured unique ID / member ID", "Coverage", true],
  ["groupName", "61A", "Insurance group name", "Coverage", false],
  ["groupNumber", "62A", "Insurance group number", "Coverage", false],
  ["authorization", "63A", "Treatment authorization code", "Coverage", false],
  ["icdIndicator", "66", "Diagnosis version qualifier", "Clinical", true],
  ["diagnosis", "67", "Principal diagnosis", "Clinical", true],
  ["otherDiagnosis", "67A", "Other diagnosis", "Clinical", false],
  ["procedure", "74", "Principal procedure", "Clinical", false],
  ["procedureDate", "74", "Principal procedure date", "Clinical", false, "date"],
  ["attendingNpi", "76", "Attending provider NPI", "Provider", true],
  ["attendingLast", "76", "Attending last name", "Provider", true],
  ["attendingFirst", "76", "Attending first name", "Provider", true],
  ["taxonomy", "81CCa", "Billing provider taxonomy", "Provider", true],
].map(([id, locator, label, group, required, type]) => ({
  id: String(id), locator: String(locator), label: String(label), group: group as FieldGroup,
  required: Boolean(required), type: (type as BillingField["type"]) || "text",
}));

const ubLineFields = Array.from({ length: 4 }, (_, index) => index + 1).flatMap((line): BillingField[] => [
  { id: `rev${line}`, locator: `42 · line ${line}`, label: "Revenue code", group: "Services", required: line === 1, line },
  { id: `desc${line}`, locator: `43 · line ${line}`, label: "Revenue description", group: "Services", required: line === 1, line },
  { id: `hcpcs${line}`, locator: `44 · line ${line}`, label: "HCPCS / rate", group: "Services", line },
  { id: `serviceDate${line}`, locator: `45 · line ${line}`, label: "Service date", group: "Services", required: line === 1, type: "date", line },
  { id: `units${line}`, locator: `46 · line ${line}`, label: "Units", group: "Services", required: line === 1, type: "number", line },
  { id: `charge${line}`, locator: `47 · line ${line}`, label: "Charge", group: "Services", required: line === 1, type: "number", line },
]);

export const fieldGroups: FieldGroup[] = ["Coverage", "Patient", "Provider", "Clinical", "Services", "Claim totals"];

const clinic = {
  provider: "ABC Medical Clinic, 4100 Harbor Avenue, San Diego, CA 92101",
  taxId: "98-7654321", npi: "1234567890", taxonomy: "207Q00000X",
};
const hospital = {
  provider: "St. Luke's Medical Center, 850 Westlake Drive, Seattle, WA 98109",
  taxId: "91-2468013", npi: "1098765432", taxonomy: "282N00000X",
};

function section(title: string, source: string, items: Record<string, string>): SourceSection {
  return { title, source, items: Object.entries(items).map(([label, value]) => ({ label, value })) };
}

function cmsCase(config: {
  id: string; patient: string; dob: string; sex: string; address: string; payer: string; memberId: string; group: string;
  account: string; diagnosis: string; doctor: string; doctorNpi: string; services: { dos: string; pos: string; cpt: string; charge: string }[];
  total: number; age: number; filingDays: number; rank: number; status: string; complexity: BillingScenario["complexity"]; initial: Record<string, string>; reason: string;
}): BillingScenario {
  const phone = `(555) 015-${config.id.slice(-4)}`;
  const claimDate = config.services[config.services.length - 1]?.dos || config.services[0]?.dos || "";
  const serviceAnswers = Object.fromEntries(config.services.flatMap((line, i) => {
    const n = i + 1;
    return [[`dos${n}`, line.dos], [`pos${n}`, line.pos], [`cpt${n}`, line.cpt], [`pointer${n}`, "A"], [`charge${n}`, line.charge], [`units${n}`, "1"], [`renderingNpi${n}`, config.doctorNpi]];
  }));
  return {
    id: config.id, form: "CMS-1500", patient: config.patient, dob: config.dob, payer: config.payer, account: config.account,
    claimClass: config.status.includes("Reject") ? "Professional · correction" : "Professional · original", status: config.status,
    complexity: config.complexity, total: config.total, age: config.age, filingDays: config.filingDays, expectedRank: config.rank,
    priorityReason: config.reason, serviceCount: config.services.length, initial: config.initial,
    sourceSections: [
      section("Registration", "Patient registration", { Patient: config.patient, DOB: config.dob, Sex: config.sex, Address: config.address, Telephone: phone, Account: config.account, Relationship: "Self", "Patient authorization": "Signature on file" }),
      section("Coverage", "Electronic eligibility", { Payer: config.payer, "Plan name": config.payer, "Member ID": config.memberId, Group: config.group, Insured: config.patient, "Insured DOB / sex": `${config.dob} · ${config.sex}`, "Insured address / telephone": `${config.address} · ${phone}`, "Other health plan": "No", Assignment: "Accepted", "Insured authorization": "Signature on file" }),
      section("Clinical", "Signed encounter and charge ticket", { Provider: config.doctor, "Rendering NPI": config.doctorNpi, "Date of current illness": config.services[0]?.dos || "", "Outside laboratory": "No", "Diagnosis version": "ICD-10-CM · indicator 0", Diagnosis: config.diagnosis, Services: config.services.map((s) => `${s.dos} · POS ${s.pos} · ${s.cpt} · $${s.charge}`).join(" | ") }),
      section("Provider master", "Billing provider file", { Entity: clinic.provider, TIN: clinic.taxId, NPI: clinic.npi, Taxonomy: clinic.taxonomy, "Claim signature": config.doctor, "Signature date": claimDate, "Prior payment": "$0.00", "Balance due": `$${config.total.toFixed(2)}` }),
    ],
    answers: {
      coverage: config.payer === "Medicare" ? "Medicare" : "Group Health Plan", memberId: config.memberId,
      patientName: config.patient, patientDob: config.dob, patientSex: config.sex, insuredName: config.patient,
      patientAddress: config.address, patientPhone: phone, relationship: "Self", insuredAddress: config.address, insuredPhone: phone,
      policy: config.group, insuredDob: config.dob, insuredSex: config.sex, planName: config.payer, anotherPlan: "No",
      patientSignature: "Signature on file", insuredSignature: "Signature on file", illnessDate: config.services[0]?.dos || "", outsideLab: "No",
      icdIndicator: "0", diagnosis: config.diagnosis, ...serviceAnswers, taxId: clinic.taxId, patientAccount: config.account, assignment: "Yes",
      totalCharges: String(config.total), amountPaid: "0", balanceDue: String(config.total), providerSignature: config.doctor, providerSignatureDate: claimDate, facility: clinic.provider, facilityNpi: clinic.npi,
      billingProvider: clinic.provider, billingNpi: clinic.npi,
    },
  };
}

function ubCase(config: {
  id: string; patient: string; dob: string; sex: string; address: string; payer: string; planId: string; memberId: string; groupName: string; groupNumber: string;
  account: string; tob: string; from: string; through: string; diagnosis: string; other?: string; procedure?: string; procedureDate?: string; authorization?: string;
  attending: string; attendingNpi: string; services: { rev: string; desc: string; hcpcs?: string; date: string; charge: string }[];
  total: number; age: number; filingDays: number; rank: number; status: string; complexity: BillingScenario["complexity"]; initial: Record<string, string>; reason: string;
}): BillingScenario {
  const [last, first = ""] = config.attending.split(", ");
  const medicalRecord = `MR-${config.account.replace(/[^A-Z0-9]/gi, "")}`;
  const serviceAnswers = Object.fromEntries(config.services.flatMap((line, i) => {
    const n = i + 1;
    return [[`rev${n}`, line.rev], [`desc${n}`, line.desc], [`hcpcs${n}`, line.hcpcs || ""], [`serviceDate${n}`, line.date], [`units${n}`, "1"], [`charge${n}`, line.charge]];
  }));
  return {
    id: config.id, form: "UB-04", patient: config.patient, dob: config.dob, payer: config.payer, account: config.account,
    claimClass: config.tob === "111" ? "Institutional · inpatient" : "Institutional · outpatient",
    status: config.status, complexity: config.complexity, total: config.total, age: config.age, filingDays: config.filingDays,
    expectedRank: config.rank, priorityReason: config.reason, serviceCount: config.services.length, initial: config.initial,
    sourceSections: [
      section("Face sheet", "Hospital registration", { Patient: config.patient, DOB: config.dob, Sex: config.sex, Address: config.address, "Patient control": config.account, "Medical record": medicalRecord, "Relationship to insured": "Self · code 18" }),
      section("Coverage", "Electronic eligibility", { Payer: config.payer, "Plan ID": config.planId, "Member ID": config.memberId, Group: config.groupName && config.groupNumber ? `${config.groupName} · ${config.groupNumber}` : "Not applicable", "Release of information": "Y", "Assignment of benefits": "Y", Authorization: config.authorization || "Not required" }),
      section("Coded abstract", "ADT and coding", { "Statement period": `${config.from} through ${config.through}`, "Type of bill": config.tob, "Admission hour": "14", "Admission priority": "1", "Discharge status": "01", "Diagnosis version": "ICD-10-CM · qualifier 0", "Principal diagnosis": config.diagnosis, "Other diagnosis": config.other || "None", Procedure: config.procedure || "None", "Procedure date": config.procedure ? (config.procedureDate || config.from) : "Not applicable", Attending: `${first} ${last} · ${config.attendingNpi}` }),
      section("Charge detail", "Patient accounting", Object.fromEntries(config.services.map((s, i) => [`Line ${i + 1}`, `${s.rev} · ${s.desc}${s.hcpcs ? ` · ${s.hcpcs}` : ""} · ${s.date} · $${s.charge}`]))),
      section("Provider master", "Hospital billing file", { Facility: hospital.provider, TIN: hospital.taxId, NPI: hospital.npi, Taxonomy: hospital.taxonomy, "Claim creation date": config.through, "Prior payments": "$0.00", "Estimated amount due": `$${config.total.toFixed(2)}` }),
    ],
    answers: {
      provider: hospital.provider, patientControl: config.account, medicalRecord, typeOfBill: config.tob, taxId: hospital.taxId,
      statementFrom: config.from, statementThrough: config.through, patientName: config.patient, patientAddress: config.address,
      patientDob: config.dob, patientSex: config.sex, admitDate: config.from, admitHour: "14", admitType: "1", patientStatus: "01",
      ...serviceAnswers, totalCharges: String(config.total), creationDate: config.through, payer: config.payer, planId: config.planId,
      releaseInfo: "Y", benefitsAssignment: "Y", priorPayments: "0", estimatedDue: String(config.total), providerNpi: hospital.npi, insuredName: config.patient,
      relationship: "18", memberId: config.memberId, groupName: config.groupName, groupNumber: config.groupNumber,
      authorization: config.authorization || "", icdIndicator: "0", diagnosis: config.diagnosis, otherDiagnosis: config.other || "",
      procedure: config.procedure || "", procedureDate: config.procedure ? (config.procedureDate || config.from) : "", attendingNpi: config.attendingNpi,
      attendingLast: last, attendingFirst: first, taxonomy: hospital.taxonomy,
    },
  };
}

export const billingScenarios: BillingScenario[] = [
  cmsCase({ id: "BIL-1501", patient: "Maria Santos", dob: "1985-03-15", sex: "F", address: "123 Mabini Street, San Diego, CA 92101", payer: "Harbor Blue PPO", memberId: "BC123456789", group: "HBP-44018", account: "AC-1501-MAS", diagnosis: "J06.9", doctor: "Dr. John Cruz", doctorNpi: "1234567890", services: [{ dos: "2026-02-10", pos: "11", cpt: "99203", charge: "150" }, { dos: "2026-02-10", pos: "11", cpt: "87880", charge: "40" }], total: 190, age: 9, filingDays: 25, rank: 5, status: "Draft claim", complexity: "Foundation", initial: { memberId: "BC12345678" }, reason: "Low balance with adequate filing time; work after deadline-sensitive and high-value claims." }),
  cmsCase({ id: "BIL-1502", patient: "Pedro Garcia", dob: "1975-09-25", sex: "M", address: "225 Willow Lane, Phoenix, AZ 85004", payer: "Medicare", memberId: "2HG5-LM8-OP22", group: "MEDICARE", account: "AC-1502-PEG", diagnosis: "I10", doctor: "Dr. Lisa Tan", doctorNpi: "2233445566", services: [{ dos: "2026-02-18", pos: "11", cpt: "99213", charge: "100" }], total: 100, age: 6, filingDays: 30, rank: 6, status: "Draft claim", complexity: "Foundation", initial: { diagnosis: "110" }, reason: "Lowest balance, newest age, and longest filing runway in the queue." }),
  cmsCase({ id: "BIL-1503", patient: "Carla Mendoza", dob: "1992-12-01", sex: "F", address: "901 Bayberry Court, Tampa, FL 33602", payer: "Aetna", memberId: "AET112233", group: "AET-7206", account: "AC-1503-CAM", diagnosis: "L02.91", doctor: "Dr. Kevin Lim", doctorNpi: "3344556677", services: [{ dos: "2026-03-05", pos: "24", cpt: "10060", charge: "250" }], total: 250, age: 87, filingDays: 3, rank: 3, status: "Rejected draft", complexity: "Intermediate", initial: { pos1: "11" }, reason: "Only three days remain to correct and transmit; filing exposure makes the low balance urgent." }),
  ubCase({ id: "BIL-0401", patient: "Juan Dela Cruz", dob: "1970-07-22", sex: "M", address: "77 Pine Street, Seattle, WA 98104", payer: "Medicare", planId: "00450", memberId: "1EG4-TE5-MK73", groupName: "", groupNumber: "", account: "IP-0401-JDC", tob: "111", from: "2026-01-15", through: "2026-01-18", diagnosis: "I21.9", other: "E11.9", procedure: "027034Z", procedureDate: "2026-01-16", attending: "Chang, Robert", attendingNpi: "2233445566", services: [{ rev: "0450", desc: "Emergency room", hcpcs: "99285", date: "2026-01-15", charge: "500" }, { rev: "0360", desc: "Operating room", hcpcs: "92928", date: "2026-01-16", charge: "5000" }, { rev: "0250", desc: "Pharmacy", date: "2026-01-16", charge: "800" }, { rev: "0300", desc: "Laboratory", hcpcs: "80053", date: "2026-01-15", charge: "300" }], total: 6600, age: 74, filingDays: 12, rank: 2, status: "High-dollar draft", complexity: "Advanced", initial: { typeOfBill: "131" }, reason: "Highest balance with a short filing runway; second only to the already rejected surgery claim." }),
  ubCase({ id: "BIL-0402", patient: "Mark Santos", dob: "1995-05-10", sex: "M", address: "44 Pearl Avenue, Seattle, WA 98115", payer: "Harbor Blue PPO", planId: "HB001", memberId: "BC99887766", groupName: "Harbor Tech", groupNumber: "HT-1902", account: "OP-0402-MAS", tob: "131", from: "2026-02-20", through: "2026-02-20", diagnosis: "S93.401A", attending: "Lim, Kevin", attendingNpi: "3344556677", services: [{ rev: "0450", desc: "Emergency room", hcpcs: "99284", date: "2026-02-20", charge: "400" }, { rev: "0320", desc: "Diagnostic radiology", hcpcs: "73610", date: "2026-02-20", charge: "250" }, { rev: "0250", desc: "Pharmacy", date: "2026-02-20", charge: "150" }], total: 800, age: 28, filingDays: 16, rank: 4, status: "Draft claim", complexity: "Intermediate", initial: { memberId: "BC9988776" }, reason: "Moderate value and filing runway; work after high-risk deadline items and the high-dollar inpatient claim." }),
  ubCase({ id: "BIL-0403", patient: "Ana Reyes", dob: "1990-11-05", sex: "F", address: "1900 Cedar Way, Seattle, WA 98121", payer: "Aetna", planId: "AET01", memberId: "AET567890", groupName: "Northwest Retail", groupNumber: "NWR-771", authorization: "AET-AUTH-44192", account: "OP-0403-ANR", tob: "131", from: "2026-03-01", through: "2026-03-01", diagnosis: "K35.80", procedure: "0DTJ4ZZ", procedureDate: "2026-03-01", attending: "Reyes, Maya", attendingNpi: "5566778899", services: [{ rev: "0360", desc: "Operating room", hcpcs: "44970", date: "2026-03-01", charge: "4500" }, { rev: "0250", desc: "Pharmacy", date: "2026-03-01", charge: "600" }, { rev: "0270", desc: "Medical / surgical supplies", date: "2026-03-01", charge: "400" }], total: 5500, age: 91, filingDays: 7, rank: 1, status: "Clearinghouse rejected", complexity: "Advanced", initial: { attendingNpi: "556677889" }, reason: "Already rejected, high-value, and only seven days remain to correct and transmit; work first." }),
];

export function fieldsForScenario(scenario: BillingScenario) {
  const fields = scenario.form === "CMS-1500" ? cmsFields : [...ubStatic, ...ubLineFields];
  return fields.filter((field) => !field.line || field.line <= scenario.serviceCount);
}
