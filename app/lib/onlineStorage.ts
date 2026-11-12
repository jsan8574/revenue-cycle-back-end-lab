"use client";
import { arScenarios,denialScenarios } from "../data/exploration";
import { DATA_VERSION, readWork, saveWork, session, startSession, type ResearchRecord } from "./researchStore";
const cases=[...arScenarios,...denialScenarios];
type OnlineCase={case_id:string;revision:number;progress:{work:unknown;research:Omit<ResearchRecord,"events"|"receipts">;priority:unknown;workspace:unknown;portalDraft:unknown}};
type OnlineEvent={case_id:string;event_id:string;occurred_at_utc:string;channel:"portal"|"phone"|"chat";event_type:string;details:{text:string}};
type OnlineReceipt={case_id:string;submission_id:string;submitted_at_utc:string;submission_type:string;receipt_reference:string;document_ids:string[];details:{recipient:string;subject:string;letter:string;followUp:string}};
type ApiResponse={ok:boolean;error?:string;revision:number;session:{data_version:string;learner_name:string};cases:OnlineCase[];research:OnlineEvent[];submissions:OnlineReceipt[]};
async function api(data:unknown) {
  const response=await fetch("/api/training-storage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
  const result=await response.json() as ApiResponse;
  if (!result.ok) throw new Error(result.error||"GOOGLE_CONNECTION_ERROR");
  return result;
}
export async function saveOnline() {
  const learner=session(); if (!learner) return;
  const run=async()=>{
    await api({action:"create_session",resume_code:learner.code,learner_name:learner.name,data_version:DATA_VERSION});
    for (const c of cases) {
      const pendingKey=`rcm:${learner.code}:${c.id}:pending-cloud`;
      const pending=localStorage.getItem(pendingKey);
      if(pending){
        const recovered=await api(JSON.parse(pending));
        localStorage.setItem(`rcm:${learner.code}:${c.id}:cloud`,JSON.stringify({revision:recovered.revision,fingerprint:""}));
        localStorage.removeItem(pendingKey);
      }
      const work=readWork(c.id,"work"),research=readWork<ResearchRecord>(c.id,"research");
      if (!work&&!research&&!readWork(c.id,"portalDraft")) continue;
      const {events=[],receipts=[],...researchState}=research||{verified:false,views:[],closedChannels:[]};
      const priority=readWork("workspace","priority");
      const workspace=readWork("workspace","work");
      const portalDraft=readWork(c.id,"portalDraft");
      const summary=readWork(c.id,"summary");
      const progress={work,research:researchState,priority,workspace,portalDraft,summary};
      const fingerprint=JSON.stringify({progress,events,receipts});
      const meta=readWork<{revision:number;fingerprint:string}>(c.id,"cloud")||{revision:0,fingerprint:""};
      if (meta.fingerprint===fingerprint) continue;
      let revision=meta.revision;
      const eventRows=events.map(e=>({event_id:e.id,occurred_at_utc:e.at,channel:e.channel,event_type:e.type,details:{text:e.text}}));
      const submissionRows=receipts.map(r=>({submission_id:r.id,submitted_at_utc:r.at,submission_type:r.category,channel:"portal",document_ids:r.documents,receipt_reference:r.reference,follow_up_date:"",details:{recipient:r.recipient,subject:r.subject,letter:r.letter,followUp:r.followUp}}));
      const batches=Math.max(1,Math.ceil(eventRows.length/50));
      for(let i=0;i<batches;i++){
        const payload={action:"save_case",resume_code:learner.code,case_id:c.id,expected_revision:revision,request_id:crypto.randomUUID(),progress,events:eventRows.slice(i*50,(i+1)*50),submissions:i===0?submissionRows:[]};
        localStorage.setItem(pendingKey,JSON.stringify(payload));
        const result=await api(payload);revision=result.revision;
        localStorage.removeItem(pendingKey);
        // Store revisions without a change event, so saving does not trigger itself.
        localStorage.setItem(`rcm:${learner.code}:${c.id}:cloud`,JSON.stringify({revision,fingerprint:i===batches-1?fingerprint:""}));
      }
    }
    return new Date().toISOString();
  };
  return navigator.locks ? navigator.locks.request(`rcm-cloud:${learner.code}`,run) : run();
}
export async function resumeOnline(code:string) {
  const result=await api({action:"load_session",resume_code:code.trim()});
  if (result.session.data_version!==DATA_VERSION) throw new Error("DATA_VERSION_MISMATCH");
  startSession(result.session.learner_name,code.trim());
  for(const item of result.cases as OnlineCase[]) {
    if (!cases.some(c=>c.id===item.case_id)) continue;
    if(item.progress.work) saveWork(item.case_id,"work",item.progress.work);
    if(item.progress.priority) saveWork("workspace","priority",item.progress.priority);
    if(item.progress.workspace) saveWork("workspace","work",item.progress.workspace);
    if(item.progress.portalDraft) saveWork(item.case_id,"portalDraft",item.progress.portalDraft);
    const events=(result.research as OnlineEvent[]).filter(e=>e.case_id===item.case_id).map(e=>({id:e.event_id,at:e.occurred_at_utc,channel:e.channel,type:e.event_type,text:e.details.text}));
    const receipts=(result.submissions as OnlineReceipt[]).filter(r=>r.case_id===item.case_id).map(r=>({id:r.submission_id,at:r.submitted_at_utc,category:r.submission_type,reference:r.receipt_reference,documents:r.document_ids,...r.details,status:"Acknowledged"}));
    const research={...item.progress.research,events,receipts};
    saveWork(item.case_id,"research",research);
    const fingerprint=JSON.stringify({progress:item.progress,events,receipts});
    localStorage.setItem(`rcm:${code.trim()}:${item.case_id}:cloud`,JSON.stringify({revision:item.revision,fingerprint}));
  }
  window.location.assign("/");
}
