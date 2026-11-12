"use client";
import { useEffect,useState } from "react";
import { EMAIL_PATTERN, session, startSession } from "../lib/researchStore";
import { resumeOnline,saveOnline } from "../lib/onlineStorage";
export function SessionStoragePanel({compact=false}:{compact?:boolean}) {
  const [configured,setConfigured]=useState(false);
  const [status,setStatus]=useState("Work saves on this device");
  const [showCode,setShowCode]=useState(false);
  const [resume,setResume]=useState("");
  const [busy,setBusy]=useState(false);
  const [newName,setNewName]=useState("");
  const [newEmail,setNewEmail]=useState("");
  const learner=session();
  useEffect(()=>{fetch("/api/training-storage").then(r=>r.json()).then(r=>setConfigured((r as {configured:boolean}).configured)).catch(()=>setConfigured(false));
    const error=()=>setStatus("Device saving failed. Export your PDF before leaving this page.");window.addEventListener("rcm-storage-error",error);return()=>window.removeEventListener("rcm-storage-error",error);
  },[]);
  const save=async()=>{if(!configured||!session())return;setBusy(true);try{const at=await saveOnline();setStatus(`Saved online · ${new Date(at!).toLocaleTimeString()}`);}catch(e){setStatus(e instanceof Error&&e.message==="REVISION_CONFLICT"?"Online work changed on another device. Export this PDF before resuming online.":`Online saving did not complete${e instanceof Error&&e.message?` (${e.message})`:""}. Your device copy and PDF remain available.`);}finally{setBusy(false);}};
  useEffect(()=>{
    if(!configured||!learner)return;
    let timer:ReturnType<typeof setTimeout>;
    const changed=()=>{clearTimeout(timer);timer=setTimeout(()=>{void save();},2500);};
    window.addEventListener("rcm-research-change",changed);window.addEventListener("storage",changed);changed();
    return()=>{clearTimeout(timer);window.removeEventListener("rcm-research-change",changed);window.removeEventListener("storage",changed);};
    // This listener is recreated only when the connection or learner changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[configured,learner?.code]);
  return <section className={compact?"payer-storage compact":"payer-storage"}><strong>{configured?"Online saving connected":"Device saving available"}</strong><p role="status">{status}</p>{learner&&<>{configured&&<button disabled={busy} onClick={save}>{busy?"Saving…":"Save online now"}</button>}<button onClick={()=>setShowCode(!showCode)}>{showCode?"Hide resume code":"Show my resume code"}</button>{showCode&&<><textarea readOnly aria-label="Your private resume code" value={learner.code}/><small>Keep this code private. It opens your saved training work on another device.</small><button onClick={()=>{void navigator.clipboard.writeText(learner.code).then(()=>setStatus("Resume code copied"));}}>Copy resume code</button></>}</>}{<details><summary>Resume a saved session</summary><label>Resume code<input value={resume} onChange={e=>setResume(e.target.value)} autoComplete="off"/></label><button disabled={busy||resume.length<32} onClick={async()=>{setBusy(true);try{const local=localStorage.getItem(`rcm:session:${resume.trim()}`);if(configured)await resumeOnline(resume);else if(local){const saved=JSON.parse(local);startSession(saved.name,resume.trim(),saved.email||"");window.location.assign("/");}else throw new Error("No local session");}catch{setStatus("Session could not be restored. Check the code; another device requires online saving.");setBusy(false);}}}>Resume saved session</button></details>}{learner&&<details><summary>Start another learner session</summary><p>Keep your resume code or PDF before starting another learner.</p><label>Learner name<input maxLength={100} value={newName} onChange={e=>setNewName(e.target.value)}/></label><label>Email address<input type="email" maxLength={200} autoComplete="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)}/></label><button disabled={newName.trim().length<2||!EMAIL_PATTERN.test(newEmail.trim())} onClick={()=>{startSession(newName.trim(),undefined,newEmail.trim());window.location.assign("/");}}>Begin new learner session</button></details>}<small>{configured?"Online resume covers Insurance Follow-up and Denial Management accounts.":"Online connection is pending. Keep using the Lab and download your PDF."}</small></section>;
}
