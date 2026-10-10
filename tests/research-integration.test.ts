import { test } from "node:test";
import assert from "node:assert/strict";
import { storageApi } from "../app/lib/storageServer";
import { arScenarios,denialScenarios } from "../app/data/exploration";
import { emptyResearch,readWork,saveWork,startSession,researchComplete } from "../app/lib/researchStore";

test("public storage route rejects cross-origin requests and never exposes its service key",async()=>{
  const env={RCM_STORAGE_URL:"https://script.google.com/macros/s/test/exec",RCM_STORAGE_KEY:"test-private-key-of-at-least-32-chars"};
  const config=await storageApi(new Request("https://lab.test/api/training-storage"),env);
  assert.deepEqual(await config.json(),{configured:true});
  const blocked=await storageApi(new Request("https://lab.test/api/training-storage",{method:"POST",headers:{Origin:"https://other.test","Content-Type":"application/json"},body:JSON.stringify({action:"load_session",resume_code:"a".repeat(48)})}),env);
  assert.equal(blocked.status,403);
  const malformed=await storageApi(new Request("https://lab.test/api/training-storage",{method:"POST",headers:{Origin:"https://lab.test","Content-Type":"application/json"},body:JSON.stringify({action:"load_session",resume_code:"short"})}),env);
  assert.equal(malformed.status,400);
  const previous=globalThis.fetch;let outgoing="";
  globalThis.fetch=async(_url,options)=>{outgoing=String(options?.body);return Response.json({ok:true,cases:[]});};
  try {
    const allowed=await storageApi(new Request("https://lab.test/api/training-storage",{method:"POST",headers:{Origin:"https://lab.test","Content-Type":"application/json"},body:JSON.stringify({action:"load_session",resume_code:"a".repeat(48),key:"browser-injected-key"})}),env);
    assert.equal(JSON.parse(outgoing).key,env.RCM_STORAGE_KEY);
    assert.equal((await allowed.text()).includes(env.RCM_STORAGE_KEY),false);
  }finally{globalThis.fetch=previous;}
});

test("case evidence permits portal-only research except payer-side contact cases",()=>{
  const portal={...emptyResearch(),verified:true,views:["claims","authorization"]};
  for(const s of [...arScenarios,...denialScenarios]) {
    assert.equal(researchComplete(s,portal),!["AR-3119","AR-3174"].includes(s.id));
    assert.equal(researchComplete(s,{...portal,closedChannels:["chat"]}),true);
    assert.equal(researchComplete(s,{...portal,verified:false}),false);
  }
});

test("reused payer identifiers cannot merge cases or different learner sessions",()=>{
  const map=new Map<string,string>();
  const previousWindow=globalThis.window,previousStorage=globalThis.localStorage;
  Object.assign(globalThis,{window:{dispatchEvent:()=>true},localStorage:{getItem:(k:string)=>map.get(k)||null,setItem:(k:string,v:string)=>map.set(k,v)}});
  try {
    startSession("First Learner","a".repeat(48));
    saveWork("AR-3174","research",{note:"AR claim evidence"});
    saveWork("DM-5105","research",{note:"Denial claim evidence"});
    assert.deepEqual(readWork("AR-3174","research"),{note:"AR claim evidence"});
    assert.deepEqual(readWork("DM-5105","research"),{note:"Denial claim evidence"});
    startSession("Second Learner","b".repeat(48));
    assert.equal(readWork("AR-3174","research"),null);
  }finally{Object.assign(globalThis,{window:previousWindow,localStorage:previousStorage});}
});
