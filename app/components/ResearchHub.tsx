"use client";

import { useCallback, useEffect, useState } from "react";
import { arScenarios, denialScenarios, type ArScenario } from "../data/exploration";
import supplements from "../data/payerSupplement.json";
import { addEvent, readWork, saveWork, mutateResearch, researchComplete, researchReport, session, useResearch, type ResearchReceipt } from "../lib/researchStore";
import { PdfExportCenter } from "./PdfExportCenter";
import { SessionStoragePanel } from "./SessionStoragePanel";
import { SimulatedPayerCall } from "./SimulatedPayerCall";
import { PayerDocumentViewer } from "./PayerDocumentViewer";
import { payerGreeting } from "../lib/payerSpeech";

type Row = Record<string, string | number | boolean | null>;
const tables = supplements as unknown as Record<string, Row[]>;
const rows = (name: string, caseId: string) => (tables[name] || []).filter(r => r.case_id === caseId);
const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const date = (s: string) => { if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10); const d = new Date(`${s} UTC`); return Number.isFinite(d.getTime()) ? d.toISOString().slice(0,10) : clean(s); };
const usd = (n: unknown) => typeof n === "number" ? new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(n) : "Not applicable";
const display = (v: unknown) => v === null || v === undefined ? "Not supplied / not applicable" : typeof v === "boolean" ? v ? "Yes" : "No" : typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) ? v.slice(0,10) : String(v);
const title = (s: string) => s.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
const allCases: ArScenario[] = [...arScenarios, ...denialScenarios];
const sectionNames = { eligibility:"Eligibility & benefits", accumulators:"Accumulators & usage", authorization:"Authorization / referral", claims:"Claims & correspondence", documents:"Documents & submissions", history:"Activity history" };
type Section = keyof typeof sectionNames;

function Fields({ data, omit = [] }: { data: Row; omit?: string[] }) {
  return <dl className="payer-facts">{Object.entries(data).filter(([k]) => !omit.includes(k) && k!=="source" && !/(_key|_id|origin|calibration|changed)$/.test(k)).map(([k,v]) => <div key={k}><dt>{title(k)}</dt><dd>{k.endsWith("_usd") ? usd(v) : display(v)}</dd></div>)}</dl>;
}
function PhoneIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3h3l1.2 5-2.2 1.8c1.2 2.5 3.2 4.5 5.7 5.7L16 13.3l5 1.2v3c0 1.7-1.3 3-3 3C10 20.5 3.5 14 3.5 6c0-1.7 1.3-3 3-3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>; }

export function ResearchHub() {
  const [caseId, setCaseId] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => { setCaseId(new URLSearchParams(window.location.search).get("case") || ""); setReady(true); }, []);
  const scenario = allCases.find(s => s.id === caseId);
  if (!ready) return <main className="payer-app"><p>Opening payer research…</p></main>;
  if (!scenario || !session()) return <main className="payer-app"><section className="payer-card"><h1>Start from the RCM Lab</h1><p>Open an account in your learner session and select “Open payer research hub.” This keeps every interaction attached to the correct account.</p><a href="/">Return to RCM Lab →</a></section></main>;
  return <PayerWorkspace key={caseId} scenario={scenario} />;
}

function PayerWorkspace({ scenario:s }: { scenario:ArScenario }) {
  const record = useResearch(s.id);
  const [channel, setChannel] = useState<"choose"|"portal"|"phone">("choose");
  const [signedIn, setSignedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [practiceCode, setPracticeCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [search, setSearch] = useState({ member:"", provider:"", dob:"", dos:"", payer:"" });
  const [feedback, setFeedback] = useState("");
  const [section, setSection] = useState<Section>("eligibility");
  const [tier, setTier] = useState("IN");
  const [serviceFilter, setServiceFilter] = useState("");
  const [dial, setDial] = useState("");
  const [phoneStage, setPhoneStage] = useState<"idle"|"disconnected"|"ringing"|"answered"|"ended">("idle");
  const [contact, setContact] = useState<"phone"|"chat"|null>(null);
  const [asked, setAsked] = useState<number[]>([]);
  const [contactRef, setContactRef] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState("");
  const [category, setCategory] = useState("");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [letter, setLetter] = useState("");
  const [attest, setAttest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState("");

  const [draftLoaded,setDraftLoaded]=useState(false);
  const draftSnapshot={category,recipient,subject,letter,selectedDocs,uploaded,attest};
  useEffect(()=>{
    const saved=readWork<typeof draftSnapshot>(s.id,"portalDraft");
    if(saved){
      setCategory(saved.category);
      setRecipient(saved.recipient);
      setSubject(saved.subject);
      setLetter(saved.letter);
      setSelectedDocs(saved.selectedDocs);
      setUploaded(saved.uploaded);
      setAttest(saved.attest);
    }
    setDraftLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[s.id]);
  useEffect(()=>{
    if(!draftLoaded)return;
    const timer=setTimeout(()=>saveWork(s.id,"portalDraft",draftSnapshot),300);
    return()=>{clearTimeout(timer);saveWork(s.id,"portalDraft",draftSnapshot);};
  },[draftLoaded,s.id,category,recipient,subject,letter,selectedDocs,uploaded,attest]);
  const coverage = rows("Coverage",s.id)[0];
  const member = rows("Member Plan Details",s.id)[0];
  const plan = tables["Plan Details"].find(r => r.plan_id === coverage?.plan_id) || {};
  const rule = rows("Submission Rules",s.id)[0];
  const requiredDocs = rows("Evidence Required",s.id).filter(r => r.required_for_current_external_submission).map(r => String(r.required_document));
  const external = Boolean(rule?.portal_submission_indicated);
  const closePreview = useCallback(() => setPreview(""), []);
  const accountDraft = (() => { try { const raw=localStorage.getItem(`rcm:${session()?.code}:${s.id}:work`); return raw ? JSON.parse(raw).appealDraft as {recipient:string;subject:string;body:string} : null; } catch { return null; } })();

  useEffect(() => {
    if (phoneStage !== "ringing") return;
    const timer = window.setTimeout(() => { setPhoneStage("answered"); setContact("phone"); setVerified(false); setAsked([]); setContactRef(`PHONE-${s.id}-${Date.now().toString(36).toUpperCase()}`); void addEvent(s.id,"phone","answered",`Representative: ${payerGreeting(s.patient.payer)}`); }, 2300);
    return () => clearTimeout(timer);
  }, [phoneStage,s.id,s.patient.payer]);

  const verify = (e:React.FormEvent) => {
    e.preventDefault();
    const matched = clean(search.member)===clean(s.patient.memberId) && [s.patient.providerNpi,s.patient.providerTaxId].some(v => clean(v)===clean(search.provider)) && date(search.dob)===date(s.patient.dob) && date(search.dos)===date(s.patient.dos) && search.payer===s.patient.payer;
    setFeedback(matched ? "Member and provider verified for this date of service." : "No exact match. Check payer, member ID, DOB, DOS and provider NPI or TIN against the Lab account.");
    if (!matched) { void addEvent(s.id,contact || "portal","search-unmatched","Search did not match this scenario; check identifiers and dates."); return; }
    setVerified(true);
    void mutateResearch(s.id,r=>({...r,verified:true,events:[...r.events,{id:crypto.randomUUID(),at:new Date().toISOString(),channel:contact||"portal",type:"verified",text:`${s.patient.name}; member ${s.patient.memberId}; provider ${search.provider}; DOS ${s.patient.dos}.`}]}));
    if (!contact) visit("eligibility");
  };
  const visit = (next:Section) => {
    setSection(next);
    void mutateResearch(s.id,r=>({...r,views:[...new Set([...r.views,next])],events:[...r.events,{id:crypto.randomUUID(),at:new Date().toISOString(),channel:"portal",type:"section-view",text:sectionNames[next]}]}));
  };
  const startCall = () => {
    setFeedback(""); setVerified(false); setContact(null);
    if (dial.replace(/\D/g,"") !== s.insurance.phone.replace(/\D/g,"")) {
      setPhoneStage("disconnected"); void addEvent(s.id,"phone","disconnected",`Dialed ${dial || "an empty number"}; number did not match provider services.`); return;
    }
    setPhoneStage("ringing"); void addEvent(s.id,"phone","dialed",`Called ${s.insurance.phone}.`);
  };
  const startChat = () => { setChatOpen(true); setContact("chat"); setAsked([]); setContactRef(`CHAT-${s.id}-${Date.now().toString(36).toUpperCase()}`); void addEvent(s.id,"chat","started",`${s.patient.payer} provider chat connected in the verified account context.`); };
  const generalQuestions = [
    {question:"Is coverage active on the date of service?",answer:`${s.patient.plan}; effective ${s.insurance.effective}; ${s.insurance.termination}; network ${s.insurance.network}; coordination ${s.insurance.coordination}.`},
    {question:"What are the current medical deductible and out-of-pocket balances?",answer: s.id==="AR-3119" ? "Workers compensation liability is pending. Medical-plan deductibles and OOP accumulators do not apply." : rows("Accumulators",s.id).filter(r=>r.bucket==="Medical"&&r.coverage_level==="Individual"&&r.network_tier==="IN").map(r=>`${r.accumulator_type}: limit ${usd(r.limit_usd)}, met ${usd(r.met_usd)}, remaining ${usd(Number(r.limit_usd)-Number(r.met_usd))}; as of ${display(r.as_of_date)}.`).join(" ")},
    {question:"What does the authorization or referral cover?",answer:`${s.authorization.number}; ${s.authorization.status}; ${s.authorization.span}; ${s.authorization.services}. ${s.authorization.notes}`},
    {question:"What claim status and payment are on file?",answer:`ICN ${s.portal.icn}; ${s.portal.status}; paid ${usd(s.portal.claimPaid)}; ${s.portal.reason}.`},
    {question:"What are the filing and appeal time limits?",answer:`Corrected filing: ${s.claim.filingLimit}. Appeal deadline: ${s.claim.appealDeadline}. These are separate deadlines. Evaluate against the scenario date July 26, 2026.`},
    {question:"Does eligibility verification guarantee payment?",answer:"No. Active coverage, benefits, authorization, coding, medical necessity, COB, filing limits and claim adjudication are distinct checks."},
  ];
  const questions = [...s.callQuestions.map(q=>({...q,question:contact==="chat"?q.question.replace(/call reference/i,"contact reference"):q.question})),...generalQuestions];
  const referenceIndex = s.callQuestions.findIndex(q=>/reference/i.test(q.question));
  const canEnd = asked.filter(i=>i<s.callQuestions.length).length>=(["AR-3119","AR-3174"].includes(s.id)?s.callQuestions.length:3) && (referenceIndex<0 || asked.includes(referenceIndex));
  const ask = (index:number) => {
    if (!contact || !verified || asked.includes(index)) return;
    setAsked(a=>[...a,index]);
    void addEvent(s.id,contact,`question-${index}`,`Q: ${questions[index].question}\nA: ${questions[index].answer}${index===referenceIndex ? ` Current practice contact: ${contactRef}. Historical scenario references above are preserved.` : ""}`);
  };
  const endContact = () => {
    if (!contact || !canEnd) return;
    const ended=contact; void mutateResearch(s.id,r=>({...r,closedChannels:[...new Set([...r.closedChannels,ended])],events:[...r.events,{id:crypto.randomUUID(),at:new Date().toISOString(),channel:ended,type:"ended",text:`Contact ${contactRef} ended with relevant findings and a reference captured.`}]}));
    setContact(null); setChatOpen(false); if (ended==="phone") setPhoneStage("ended");
  };
  const uploadDocuments = () => {
    if (!selectedDocs.length || uploading) return;
    setUploading(true);
    window.setTimeout(()=>{setUploaded([...selectedDocs]);setUploading(false);void addEvent(s.id,"portal","documents-attached",`Selected simulated secure-storage documents: ${selectedDocs.join("; ")}.`);},1200);
  };
  const submit = () => {
    setSubmissionFeedback("");
    if (!external) { setSubmissionFeedback("This account requires an internal task or payer-side investigation first. A new appeal or reconsideration is not the indicated first action. Return to the Lab and validate your resolution."); return; }
    if (category!==String(rule.request_category)) { setSubmissionFeedback("Review the claim issue and select the supported request category."); return; }
    if (!researchComplete(s,record)) { setSubmissionFeedback("Complete claim research or a verified payer contact before submitting."); return; }
    if (recipient.trim().length<4 || subject.trim().length<8 || letter.trim().length<120 || !attest || requiredDocs.some(d=>!uploaded.includes(d))) { setSubmissionFeedback("Complete recipient, subject and letter (at least 120 characters), attach every required document from secure storage, and confirm the packet review."); return; }
    if (record.receipts.length) { setSubmissionFeedback(`Already acknowledged: ${record.receipts[0].reference}. Review the existing receipt instead of creating a duplicate.`); return; }
    setSubmitting(true);
    window.setTimeout(()=>{
      const receipt:ResearchReceipt={id:crypto.randomUUID(),at:new Date().toISOString(),category,reference:`${category.includes("Pricing")?"REC":"APL"}-${s.id}-${Date.now().toString(36).toUpperCase()}`,documents:uploaded,recipient,subject,letter,followUp:"Follow the payer turnaround documented in the case research; verify status before another submission.",status:"Acknowledged"};
      void mutateResearch(s.id,r=>r.receipts.length?r:{...r,receipts:[receipt],events:[...r.events,{id:crypto.randomUUID(),at:receipt.at,channel:"portal",type:"submission-acknowledged",text:`${category}; ${receipt.reference}; no payment or adjudication change.`}]});
      setSubmitting(false);setSubmissionFeedback("Packet acknowledged. Save the reference and follow-up plan. Acknowledgment does not mean approval or payment.");
    },1400);
  };

  const searchForm = <form className="payer-search" onSubmit={verify}>
    <h2>Member & claim search</h2><p>Use identifiers from the RCM account. This search stays within case {s.id}.</p>
    <label>Payer<select required value={search.payer} onChange={e=>setSearch({...search,payer:e.target.value})}><option value="">Select payer</option>{[...new Set(allCases.map(c=>c.patient.payer))].map(p=><option key={p}>{p}</option>)}</select></label>
    <label>Member ID<input required value={search.member} onChange={e=>setSearch({...search,member:e.target.value})}/></label>
    <label>Provider NPI or TIN<input required value={search.provider} onChange={e=>setSearch({...search,provider:e.target.value})}/></label>
    <label>Date of birth<input required type="date" value={search.dob} onChange={e=>setSearch({...search,dob:e.target.value})}/></label>
    <label>Date of service<input required type="date" value={search.dos} onChange={e=>setSearch({...search,dos:e.target.value})}/></label>
    <button className="payer-primary">Search records</button>
    {feedback&&<p role="status" className="payer-feedback">{feedback}</p>}
  </form>;
  const conversation = contact === "chat" && verified ? <section className="payer-conversation"><div className="payer-contact-heading"><div><span className="payer-dot"/> Provider services chat<h2>Payer representative</h2></div><span>{contactRef}</span></div><p>Ask the questions that support your investigation. Case-specific findings and the reference must be captured before ending the contact.</p><div className="payer-conversation-grid"><div className="payer-question-list">{questions.map((q,i)=><button disabled={asked.includes(i)} key={i} onClick={()=>ask(i)}>{asked.includes(i)?"✓ ":"+ "}{q.question}</button>)}</div><div className="payer-transcript" role="log">{!asked.length&&<p className="payer-rep">Thank you for contacting {s.patient.payer}. The member and provider are verified. How may I help?</p>}{asked.map(i=><div key={i}><p className="payer-you">{questions[i].question}</p><p className="payer-rep">{questions[i].answer}{i===referenceIndex&&<small> Current practice reference: {contactRef}. Historical case references remain separate.</small>}</p></div>)}</div></div><button className="payer-primary" disabled={!canEnd} onClick={endContact}>End chat & save contact</button>{!canEnd&&<small>Capture at least three case-specific findings, including the reference, to finish this contact.</small>}</section>:null;

  return <main className="payer-app">
    <header className="payer-topbar"><a className="payer-brand" href={`/research?case=${s.id}`}><div>Provider Exchange<small>Multipayer practice portal</small></div></a><div className="payer-top-right"><span>Scenario date · July 26, 2026</span><a href="/" target="_blank" rel="noopener noreferrer">RCM Lab ↗</a></div></header>
    <div className="payer-training-strip">FICTIONAL TRAINING ENVIRONMENT · {s.id} · Activity returns to your Lab account and consolidated PDF</div>
    <div className="payer-shell">
      <aside className="payer-sidebar"><span className="payer-eyebrow">Research workspace</span><h2>{s.patient.payer}</h2><p>Use the account’s identifiers to investigate the correct member and date of service.</p><button className={channel==="choose"?"active":""} onClick={()=>{setChannel("choose");setContact(null);setChatOpen(false);}}>Choose research channel</button><button className={channel==="portal"?"active":""} onClick={()=>{setChannel("portal");setContact(null);setChatOpen(false);}}>Payer portal</button><button className={channel==="phone"?"active":""} onClick={()=>{setChannel("phone");setContact(null);setChatOpen(false);setPhoneStage("idle");setVerified(false);}}>Call payer</button><div className="payer-session-status"><strong>{researchComplete(s,record)?"Research evidence captured":"Investigation in progress"}</strong><p>{["AR-3119","AR-3174"].includes(s.id)?"This case needs a verified payer contact for the payer-side action. Portal research remains available.":"Use claim and approval records or a verified payer contact. Both channels are available for exploration."}</p><span>{record.events.length} recorded interactions</span></div><SessionStoragePanel compact/></aside>
      <div className="payer-main">
      {channel==="choose"&&<><span className="payer-eyebrow">Connected to your RCM account</span><h1>How would you like to investigate?</h1><p className="payer-lead">Move between claim research, payer conversations and document submission while keeping one account history.</p><div className="payer-channel-cards"><button onClick={()=>setChannel("portal")}><span className="payer-large-icon">▤</span><h2>Check payer portal</h2><p>Sign in to the practice portal. Verify benefits, accumulators, authorization and claims. Use chat or attach a document packet.</p><strong>Open portal →</strong></button><button onClick={()=>{setChannel("phone");setVerified(false);}}><span className="payer-large-icon"><PhoneIcon/></span><h2>Call the payer</h2><p>Find the provider-services number in the Lab, dial it and investigate with a representative.</p><strong>Open dialer →</strong></button></div><section className="payer-card"><h2>One research trail</h2><p>Interactions save in this browser and appear in the RCM Lab PDF. Record your own issue, findings and resolution in the Lab after researching.</p></section></>}
      {channel==="portal"&&!signedIn&&<section className="payer-login"><span className="payer-eyebrow">Provider access</span><h1>Welcome to Provider Exchange</h1><p>Practice signing in to a multipayer provider portal.</p><form onSubmit={e=>{e.preventDefault();if(username.trim().length>=2&&practiceCode==="RCM2026"){setSignedIn(true);setVerified(false);setFeedback("");void addEvent(s.id,"portal","practice-login","Practice provider login completed.");}else setFeedback("Enter a practice username and training access code RCM2026.");}}><label>Practice username<input autoComplete="off" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Your learner name" required/></label><label>Training access code<input autoComplete="off" value={practiceCode} onChange={e=>setPracticeCode(e.target.value)} required/></label><small>Use RCM2026. This is a fictional training code; use your learner name as the practice username.</small><button className="payer-primary">Sign in to practice portal →</button></form>{feedback&&<p role="status">{feedback}</p>}</section>}
      {channel==="portal"&&signedIn&&!verified&&searchForm}
      {channel==="portal"&&signedIn&&verified&&<><div className="payer-member-bar"><div><span>Verified member</span><h1>{s.patient.name}</h1><p>{s.patient.memberId} · DOB {s.patient.dob} · DOS {s.patient.dos}</p></div><button onClick={()=>{setVerified(false);setFeedback("");setChatOpen(false);setContact(null);}}>New search</button><button className="payer-primary" onClick={startChat}>Chat with payer</button></div><p className="payer-provider-context">Provider: {s.patient.provider} · NPI {s.patient.providerNpi} · TIN {s.patient.providerTaxId} · {s.insurance.network}</p><nav className="payer-section-tabs" aria-label="Payer records">{Object.entries(sectionNames).map(([id,name])=><button className={section===id?"active":""} key={id} onClick={()=>visit(id as Section)}>{name}</button>)}</nav>
      {section==="eligibility"&&<><section className="payer-card"><div className="payer-card-heading"><h2>Coverage on date of service</h2><span className="payer-status">{String(coverage.status_at_service)}</span></div><Fields data={coverage} omit={["financial_benefit_detail"]}/><Fields data={member} omit={["medical_accumulator_status","reason_for_calibration"]}/><p className="payer-note">Benefit year and member termination are separate. Active eligibility does not guarantee payment.</p></section><section className="payer-card"><h2>Plan information</h2><p>Detailed plan terms below are fictional supplements calibrated to this training account.</p><Fields data={plan}/></section><section className="payer-card"><div className="payer-card-heading"><h2>Service benefits</h2><label>Network<select value={tier} onChange={e=>{setTier(e.target.value);void addEvent(s.id,"portal","benefit-filter",`Network ${e.target.value}`);}}><option value="IN">In network</option><option value="OUT">Out of network</option></select></label><label>Find service<input value={serviceFilter} onChange={e=>setServiceFilter(e.target.value)} placeholder="Office, surgery, infusion…"/></label></div><div className="payer-table-scroll"><table><thead><tr><th>Service</th><th>Coverage</th><th>Copay</th><th>Coinsurance</th><th>Deductible applies</th><th>Approval / referral</th><th>Limit</th></tr></thead><tbody>{tables["Plan Benefits"].filter(r=>r.plan_id===coverage.plan_id&&r.network_tier===tier).filter(r=>{const name=tables["Service Catalog"].find(c=>c.service_id===r.service_id)?.service_name;return !serviceFilter||String(name).toLowerCase().includes(serviceFilter.toLowerCase());}).map(r=><tr key={String(r.plan_benefit_key)}><td><strong>{display(tables["Service Catalog"].find(c=>c.service_id===r.service_id)?.service_name)}</strong><small>{display(r.benefit_note)}</small></td><td>{display(r.coverage_status)}</td><td>{usd(r.copay_usd)}</td><td>{typeof r.member_coinsurance_rate==="number"?`${r.member_coinsurance_rate*100}%`:"N/A"}</td><td>{display(r.deductible_applies)}</td><td>{display(r.approval_required_source)}{r.pcp_referral_required&&"; PCP referral"}</td><td>{r.annual_limit_units===null ? r.coverage_status==="Excluded" ? "Not applicable" : "No numeric annual cap" : display(r.annual_limit_units)}<small>{display(r.limit_period)}</small></td></tr>)}</tbody></table></div>{rows("Benefit Messages",s.id).map(r=><p className="payer-note" key={String(r.message_key)}>{String(r.message)}</p>)}<p className="payer-note">These are baseline benefits before accumulator adjustments. Apply the appropriate remaining accumulator cap to covered cost share. Separate pharmacy and out-of-network balances remain separate.</p></section>{rows("COB",s.id).map((r,i)=><section key={i} className="payer-card"><h2>Coordination of benefits record</h2><Fields data={r}/></section>)}</>}
      {section==="accumulators"&&<><section className="payer-card"><h2>Deductible & out-of-pocket accumulators</h2><p>Snapshots are dated before the scenario service. Individual and family balances are related limits; do not add them together.</p>{s.id==="AR-3119"&&<p>Not applicable to this workers compensation liability investigation.</p>}<div className="payer-table-scroll"><table><thead><tr><th>Bucket / network</th><th>Limit</th><th>Level</th><th>Annual maximum</th><th>Met</th><th>Remaining</th><th>As of</th></tr></thead><tbody>{rows("Accumulators",s.id).map(r=><tr key={String(r.accumulator_key)}><td>{display(r.bucket)} · {display(r.network_tier)}</td><td>{display(r.accumulator_type)}</td><td>{display(r.coverage_level)}</td><td>{usd(r.limit_usd)}</td><td>{usd(r.met_usd)}</td><td>{usd(Math.max(0,Number(r.limit_usd)-Number(r.met_usd)))}</td><td>{display(r.as_of_date)}</td></tr>)}</tbody></table></div></section><section className="payer-card"><h2>Benefit utilization</h2><div className="payer-table-scroll"><table><thead><tr><th>Shared service pool</th><th>Annual limit</th><th>Used before DOS</th><th>Remaining</th><th>Unit</th></tr></thead><tbody>{rows("Benefit Usage",s.id).map(r=><tr key={String(r.usage_key)}><td>{display(r.shared_pool_services)}</td><td>{display(r.limit_units)}</td><td>{display(r.used_before_source_service)}</td><td>{r.limit_units===null?"No numeric annual limit":Number(r.limit_units)-Number(r.used_before_source_service)}</td><td>{display(r.unit_type)}</td></tr>)}</tbody></table></div></section></>}
      {section==="authorization"&&<><section className="payer-card"><h2>Authorization / referral inquiry</h2><dl className="payer-facts">{Object.entries(s.authorization).map(([k,v])=><div key={k}><dt>{title(k)}</dt><dd>{String(v)}</dd></div>)}</dl>{["AR-3174","DM-5105"].includes(s.id)&&<p className="payer-note">The approval letter covers 40 units. Claim matching shows 20 units. {s.id==="AR-3174"?"The payer matching record displays NS-AUTH-884; compare it with the original letter.":"A historic note uses PA-884219; verify against NS-AUTH-884219 on the letter."} Reference aliases are preserved for investigation and excluded from scoring.</p>}{s.id==="DM-5102"&&<p className="payer-note">Approval letter classification: outpatient observation. Claim-system matching classification: inpatient. Investigate the discrepancy before choosing a submission.</p>}</section><section className="payer-card"><h2>Approval evidence</h2>{s.documents.filter(d=>/auth|approval|referral|certification/i.test(d.type+" "+d.summary)).map(d=><details key={d.reference} onToggle={e=>{if(e.currentTarget.open)void addEvent(s.id,"portal","approval-document",`${d.type}; ${d.reference}; ${d.summary}`);}}><summary>{d.type} · {d.reference}</summary><p>{d.summary}</p><p>{d.body}</p></details>)}</section></>}
      {section==="claims"&&<><section className="payer-card"><div className="payer-card-heading"><h2>Claim status</h2><span className="payer-status">{s.portal.status}</span></div><dl className="payer-facts"><div><dt>ICN</dt><dd>{s.portal.icn}</dd></div><div><dt>Provider claim</dt><dd>{s.claim.claimId}</dd></div><div><dt>Received</dt><dd>{s.portal.received}</dd></div><div><dt>Finalized</dt><dd>{s.portal.finalized}</dd></div><div><dt>Billed</dt><dd>{usd(s.portal.claimBilled)}</dd></div><div><dt>Allowed</dt><dd>{usd(s.portal.claimAllowed)}</dd></div><div><dt>Paid</dt><dd>{usd(s.portal.claimPaid)}</dd></div><div><dt>Patient responsibility</dt><dd>{usd(s.portal.claimPatientResponsibility)}</dd></div><div><dt>Payment trace</dt><dd>{s.portal.checkOrEft}</dd></div></dl><h3>Payer disposition</h3><p>{s.portal.reason}</p><p>{s.portal.nextStep}</p><div className="payer-table-scroll"><table><thead><tr><th>CPT / HCPCS</th><th>Billed</th><th>Allowed</th><th>Paid</th><th>Adjustment</th><th>PR</th><th>Codes / status</th></tr></thead><tbody>{s.portal.serviceLines.map((l,i)=><tr key={i}><td>{l.cpt}</td><td>{usd(l.billed)}</td><td>{usd(l.allowed)}</td><td>{usd(l.paid)}</td><td>{usd(l.adjustment)}</td><td>{usd(l.patientResponsibility)}</td><td>{l.codes}<small>{l.status}</small></td></tr>)}</tbody></table></div><p className="payer-note">Posted insurance AR ({usd(s.claim.openAr)}) is a ledger balance. Calculate expected recovery separately in the Lab. Approval, payment and submission status remain separate.</p></section><section className="payer-card"><h2>Correspondence and previous requests</h2>{s.documents.map(d=><details key={d.reference} onToggle={e=>{if(e.currentTarget.open)void addEvent(s.id,"portal","correspondence-view",`${d.type}; ${d.reference}; ${d.summary}`);}}><summary>{d.type} · {d.reference} · {d.date}</summary><p>{d.summary}</p><p>{d.body}</p><small>{d.codes}</small></details>)}<p>Correction limit: {s.claim.filingLimit} · Appeal deadline: {s.claim.appealDeadline}</p></section></>}
      {section==="documents"&&<><section className="payer-card"><h2>Document packet submission</h2><p>Use simulated documents from secure storage. No real files are needed. An acknowledgment records receipt only.</p><label>Request category<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Choose request type</option>{["Pricing reconsideration","Appeal","Corrected claim","Additional medical records","Prior authorization request"].map(v=><option key={v}>{v}</option>)}</select></label><label>Payer recipient<input value={recipient} onChange={e=>setRecipient(e.target.value)}/></label><label>Subject / claim reference<input value={subject} onChange={e=>setSubject(e.target.value)}/></label><label>Request letter<textarea rows={8} maxLength={10000} value={letter} onChange={e=>setLetter(e.target.value)} placeholder="State the claim issue, evidence and requested action…"/></label><button onClick={()=>{if(accountDraft){setRecipient(accountDraft.recipient);setSubject(accountDraft.subject);setLetter(accountDraft.body);setSubmissionFeedback("Lab draft imported. Review it and select supporting documents before sending.");}else setSubmissionFeedback("Save a draft in the Lab appeal workbench first, or write your letter here.");}}>Import my Lab letter draft</button><p className="payer-note">Scenario deadline: {display(rule.action_deadline)}. The exercise uses July 26, 2026; activity timestamps show when you actually practiced.</p></section><section className="payer-card"><h2>Simulated secure document storage</h2>{(external?requiredDocs:s.documents.map(d=>`${d.type} — ${d.reference}`)).map(d=><div className="payer-doc-row" key={d}><label><input type="checkbox" checked={selectedDocs.includes(d)} onChange={()=>{setSelectedDocs(a=>a.includes(d)?a.filter(x=>x!==d):[...a,d]);setUploaded([]);}}/><span><strong>{d}.pdf</strong><small>Fictional training document · secured storage</small></span></label><button onClick={()=>{setPreview(d);void addEvent(s.id,"portal","document-preview",d);}}>Preview</button></div>)}{external&&<div className="payer-doc-row"><label><input type="checkbox" checked={selectedDocs.includes("Training cover sheet")} onChange={()=>{setSelectedDocs(a=>a.includes("Training cover sheet")?a.filter(x=>x!=="Training cover sheet"):[...a,"Training cover sheet"]);setUploaded([]);}}/><span>Training cover sheet.pdf</span></label><button onClick={()=>{setPreview("Training cover sheet");void addEvent(s.id,"portal","document-preview","Training cover sheet");}}>Preview</button></div>}<button className="payer-primary" disabled={!selectedDocs.length||uploading} onClick={uploadDocuments}>{uploading?"Attaching documents…":`Attach ${selectedDocs.length} selected document(s)`}</button>{uploaded.length>0&&<p role="status">✓ {uploaded.length} simulated documents attached.</p>}<label className="payer-attestation"><input type="checkbox" checked={attest} onChange={e=>setAttest(e.target.checked)}/>I reviewed the member, claim, request letter and supporting packet.</label><button className="payer-primary" disabled={submitting||!!record.receipts.length} onClick={submit}>{submitting?"Sending packet…":record.receipts.length?"Submission acknowledged ✓":"Submit simulated packet"}</button>{submissionFeedback&&<p className="payer-feedback" role="status">{submissionFeedback}</p>}</section>{record.receipts.map(r=><section key={r.id} className="payer-card payer-receipt"><span className="payer-eyebrow">Submission receipt</span><h2>{r.reference}</h2><p>{r.category} · {r.status} · {r.at}</p><p>{r.documents.join("; ")}</p><p>{r.followUp}</p><strong>Receipt only — claim outcome and payment are unchanged.</strong></section>)}</>}
      {section==="history"&&<section className="payer-card"><h2>Your payer activity</h2>{record.events.map(e=><div className="payer-history-row" key={e.id}><span>{e.channel} · {e.at}</span><strong>{title(e.type)}</strong><p>{e.text}</p></div>)}</section>}
      </>}
      {channel==="phone"&&<><h1>Contact provider services</h1><p>Find the payer’s provider-services phone number in the Lab insurance record. The dialer simulates a call; it never places a real call.</p><div className="payer-phone-layout"><section className={`payer-dialer ${phoneStage}`}><div className="payer-handset"><PhoneIcon/></div><span className="payer-eyebrow">{phoneStage==="ringing"?"Ringing…":phoneStage==="answered"?"Representative connected":phoneStage==="disconnected"?"Call disconnected":phoneStage==="ended"?"Call ended":"Ready to dial"}</span><label>Phone number<input type="tel" value={dial} onChange={e=>setDial(e.target.value)} placeholder="Enter provider-services number" disabled={["ringing","answered"].includes(phoneStage)}/></label><div className="payer-keypad">{"123456789*0#".split("").map(n=><button key={n} disabled={["ringing","answered"].includes(phoneStage)} onClick={()=>setDial(d=>d+n)}>{n}</button>)}</div><button onClick={()=>setDial(d=>d.slice(0,-1))} disabled={["ringing","answered"].includes(phoneStage)}>⌫ Delete</button><button className="payer-call-button" onClick={startCall} disabled={["ringing","answered"].includes(phoneStage)}><PhoneIcon/>{phoneStage==="disconnected"?"Try another number":"Call payer"}</button>{phoneStage==="disconnected"&&<p role="status">The number did not connect. Check the number in the account and try again.</p>}{phoneStage==="answered"&&<button onClick={()=>{setPhoneStage("ended");setContact(null);void addEvent(s.id,"phone","left","Call ended before the contact-completion checks were met.");}}>Hang up without completing contact</button>}{phoneStage==="ringing"&&<button onClick={()=>{setPhoneStage("idle");void addEvent(s.id,"phone","cancelled","Call cancelled while ringing.");}}>Cancel call</button>}</section><div>{phoneStage==="answered"&&contact==="phone"&&<SimulatedPayerCall scenario={s} reference={contactRef} verified={verified} questions={questions} asked={asked} referenceIndex={referenceIndex} canEnd={canEnd} onTurn={text=>{void addEvent(s.id,"phone","caller-conversation",text);}} onVerified={(caller,provider)=>{setVerified(true);void mutateResearch(s.id,r=>({...r,verified:true,events:[...r.events,{id:crypto.randomUUID(),at:new Date().toISOString(),channel:"phone",type:"verified",text:`Caller ${caller}; ${s.patient.name}; member ${s.patient.memberId}; provider ${provider}; DOB ${s.patient.dob}; DOS ${s.patient.dos}. Verified during the call conversation.`}]}));}} onAsk={ask} onEnd={endContact}/>}{phoneStage==="ended"&&<section className="payer-card"><h2>Contact saved</h2><p>The activity recorded so far is saved for {s.id}. Check the investigation status before returning to the Lab to document your own findings and resolution.</p></section>}</div></div></>}
      {chatOpen&&<div className="payer-chat-overlay" role="dialog" aria-modal="true" aria-label="Payer chat"><button className="payer-chat-close" onClick={()=>{setChatOpen(false);setContact(null);void addEvent(s.id,"chat","left","Chat window closed before completing contact.");}}>Close chat</button>{conversation}</div>}
      </div>
    </div>
    {preview&&<PayerDocumentViewer key={preview} scenario={s} filename={preview} recipient={recipient} subject={subject} letter={letter} selectedDocuments={selectedDocs} onClose={closePreview}/>}
    <div className="payer-export"><PdfExportCenter learnerName={session()?.name||"Learner"} moduleName="Payer Research" scenarioName={s.id} reports={[{label:"Research history",description:"Recorded payer interactions; also included in the RCM Lab consolidated output",title:"Payer Research Activity",sections:[{heading:`Case ${s.id} · ${s.patient.name}`,lines:researchReport(record)},{heading:"Portal request draft",lines:[`Recipient: ${recipient || "Not entered"}`,`Subject: ${subject || "Not entered"}`,`Status: ${record.receipts.length ? "See immutable receipt above" : "Unsent draft"}`,letter || "No portal letter drafted"]}]}]}/></div>
  </main>;
}
