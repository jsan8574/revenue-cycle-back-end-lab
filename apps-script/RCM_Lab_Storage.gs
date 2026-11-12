// Google Apps Script storage adapter. Only the Lab SERVER may call this endpoint.
// Never place RCM_STORAGE_KEY in browser code or share the spreadsheet publicly.
const RCM_SHEET_ID = '1c6k6g88ankOOOtRns1buITb1LkbNk4jVKq3mum75Dxo';
const RCM_CASES = ['AR-3106','AR-3119','AR-3142','AR-3160','AR-3174','DM-5101','DM-5102','DM-5103','DM-5104','DM-5105'];
const RCM_HEADERS = {
  Sessions: ['session_id','resume_code_hash','learner_name','created_at_utc','updated_at_utc','status','data_version','revision'],
  'Case Progress': ['session_id','case_id','module_id','updated_at_utc','revision','progress_json'],
  'Research Log': ['event_id','session_id','case_id','occurred_at_utc','channel','event_type','details_json'],
  Submissions: ['submission_id','session_id','case_id','submitted_at_utc','submission_type','channel','document_ids_json','receipt_reference','status','follow_up_date','details_json']
};

function doGet() {
  return rcmReply_({ok:true,service:'RCM Lab training storage',schema_version:1});
}

function doPost(e) {
  let lock;
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 800000) rcmFail_('INVALID_REQUEST');
    const req = JSON.parse(raw);
    const key = PropertiesService.getScriptProperties().getProperty('RCM_STORAGE_KEY');
    if (!key || key.length < 32 || req.key !== key) rcmFail_('UNAUTHORIZED');
    const action = rcmText_(req.action,30);
    if (!['create_session','load_session','save_case'].includes(action)) rcmFail_('INVALID_ACTION');
    const code = rcmText_(req.resume_code,160);
    if (!/^[A-Za-z0-9_-]{32,160}$/.test(code)) rcmFail_('INVALID_RESUME_CODE');
    const hash = rcmHash_(code);
    lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) rcmFail_('BUSY_RETRY');
    const db = rcmDb_();
    let session = rcmRows_(db.Sessions).find(r => r.values[1] === hash);
    if (action === 'create_session') {
      if (!session) {
        const now = new Date().toISOString();
        db.Sessions.appendRow([Utilities.getUuid(),hash,rcmText_(req.learner_name,100),now,now,'active',rcmText_(req.data_version,100),0]);
        session = rcmRows_(db.Sessions).find(r => r.values[1] === hash);
      }
      return rcmReply_({ok:true,session_id:session.values[0]});
    }
    if (!session) rcmFail_('SESSION_NOT_FOUND');
    const sid = session.values[0];
    if (action === 'load_session') {
      return rcmReply_({ok:true,session:{session_id:sid,learner_name:session.values[2],updated_at_utc:session.values[4],data_version:session.values[6]},
        cases:rcmRows_(db['Case Progress']).filter(r=>r.values[0]===sid).map(r=>({case_id:r.values[1],module_id:r.values[2],revision:Number(r.values[4]),progress:rcmPublicProgress_(r.values[5])})),
        research:rcmRows_(db['Research Log']).filter(r=>r.values[1]===sid).map(r=>({event_id:r.values[0],case_id:r.values[2],occurred_at_utc:r.values[3],channel:r.values[4],event_type:r.values[5],details:JSON.parse(r.values[6])})),
        submissions:rcmRows_(db.Submissions).filter(r=>r.values[1]===sid).map(r=>({submission_id:r.values[0],case_id:r.values[2],submitted_at_utc:r.values[3],submission_type:r.values[4],channel:r.values[5],document_ids:JSON.parse(r.values[6]),receipt_reference:r.values[7],status:r.values[8],follow_up_date:r.values[9],details:JSON.parse(r.values[10])}))});
    }
    const caseId = rcmText_(req.case_id,20);
    if (RCM_CASES.indexOf(caseId)<0) rcmFail_('INVALID_CASE');
    const moduleId = caseId.indexOf('AR-')===0 ? 'insurance-follow-up' : 'denial-management';
    const requestId = rcmText_(req.request_id,100);
    if (!requestId) rcmFail_('REQUEST_ID_REQUIRED');
    if (!req.progress || typeof req.progress!=='object' || Array.isArray(req.progress) || req.progress._storage) rcmFail_('INVALID_PROGRESS');
    const progress = JSON.parse(rcmJson_(req.progress,35000));
    const events = rcmList_(req.events,50);
    const submissions = rcmList_(req.submissions,10);
    const now = new Date().toISOString();
    const eventRows = events.map(item=>{
      const id = rcmText_(item.event_id,100);
      if (!id || ['portal','phone','chat','lab'].indexOf(item.channel)<0) rcmFail_('INVALID_EVENT');
      return [id,sid,caseId,rcmTimestamp_(item.occurred_at_utc),item.channel,rcmText_(item.event_type,80),rcmJson_(item.details||{},20000)];
    });
    const submissionRows = submissions.map(item=>{
      const id=rcmText_(item.submission_id,100);
      if (!id || ['portal','phone','chat','lab'].indexOf(item.channel)<0) rcmFail_('INVALID_SUBMISSION');
      const documents=rcmList_(item.document_ids,50).map(x=>rcmText_(x,150));
      return [id,sid,caseId,rcmTimestamp_(item.submitted_at_utc),rcmText_(item.submission_type,100),item.channel,rcmJson_(documents,10000),rcmText_(item.receipt_reference,100),'acknowledged',rcmText_(item.follow_up_date||'',30),rcmJson_(item.details||{},20000)];
    });
    const record = rcmRows_(db['Case Progress']).find(r=>r.values[0]===sid&&r.values[1]===caseId);
    const previous = record ? JSON.parse(record.values[5]) : {};
    const payloadHash = rcmHash_(JSON.stringify({progress,eventRows,submissionRows}));
    if (previous._storage && previous._storage.request_id===requestId) {
      if (previous._storage.payload_hash!==payloadHash) rcmFail_('RETRY_PAYLOAD_MISMATCH');
      return rcmReply_({ok:true,revision:Number(record.values[4]),saved_at_utc:record.values[3]});
    }
    const revision = record ? Number(record.values[4]) : 0;
    if (!Number.isInteger(req.expected_revision) || req.expected_revision!==revision) {
      return rcmReply_({ok:false,error:'REVISION_CONFLICT',current_revision:revision});
    }
    // Validate all identifiers before any writes. Replay only identical event rows.
    const pendingEvents = rcmPendingRows_(db['Research Log'],eventRows);
    const pendingSubmissions = rcmPendingRows_(db.Submissions,submissionRows);
    progress._storage={request_id:requestId,payload_hash:payloadHash};
    const savedProgress=rcmJson_(progress,40000);
    // Sheets has no multi-tab transaction. Log first, progress last; identical retries
    // deduplicate logged rows and recover after a partially completed save.
    rcmAppend_(db['Research Log'],pendingEvents);
    rcmAppend_(db.Submissions,pendingSubmissions);
    const next=[sid,caseId,moduleId,now,revision+1,savedProgress];
    db['Case Progress'].getRange(record?record.row:db['Case Progress'].getLastRow()+1,1,1,next.length).setValues([next]);
    db.Sessions.getRange(session.row,5).setValue(now);
    db.Sessions.getRange(session.row,8).setValue(Number(session.values[7])+1);
    return rcmReply_({ok:true,revision:revision+1,saved_at_utc:now});
  } catch (err) {
    const allowed=['INVALID_REQUEST','UNAUTHORIZED','INVALID_ACTION','INVALID_RESUME_CODE','BUSY_RETRY','SESSION_NOT_FOUND','INVALID_CASE','REQUEST_ID_REQUIRED','INVALID_PROGRESS','INVALID_EVENT','INVALID_SUBMISSION','RETRY_PAYLOAD_MISMATCH','DUPLICATE_ID_CONFLICT','INVALID_TEXT','INVALID_LIST','INVALID_TIMESTAMP','RECORD_TOO_LARGE','SCHEMA_MISMATCH'];
    return rcmReply_({ok:false,error:allowed.indexOf(err.message)>=0?err.message:'STORAGE_ERROR'});
  } finally {if(lock)lock.releaseLock();}
}

function rcmDb_() {
  const book=SpreadsheetApp.openById(RCM_SHEET_ID),db={};
  Object.keys(RCM_HEADERS).forEach(name=>{
    const sh=book.getSheetByName(name),header=RCM_HEADERS[name];
    if(!sh || JSON.stringify(sh.getRange(1,1,1,header.length).getValues()[0])!==JSON.stringify(header))rcmFail_('SCHEMA_MISMATCH');
    db[name]=sh;
  });return db;
}
function rcmRows_(sh) {
  const n=sh.getLastRow();if(n<2)return [];
  return sh.getRange(2,1,n-1,RCM_HEADERS[sh.getName()].length).getValues().map((values,i)=>({row:i+2,values}));
}
function rcmPendingRows_(sh,rows) {
  const existing=rcmRows_(sh).map(r=>r.values),pending=[];
  rows.forEach(row=>{
    const found=existing.concat(pending).find(r=>r[0]===row[0]);
    if(found){if(JSON.stringify(found)!==JSON.stringify(row))rcmFail_('DUPLICATE_ID_CONFLICT');}
    else pending.push(row);
  });return pending;
}
function rcmAppend_(sh,rows){if(rows.length)sh.getRange(sh.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);}
function rcmPublicProgress_(value){const p=JSON.parse(value);delete p._storage;return p;}
function rcmHash_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s,Utilities.Charset.UTF_8).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');}
function rcmText_(s,max){if(typeof s!=='string'||s.length>max||/^[=+@]/.test(s))rcmFail_('INVALID_TEXT');return s;}
function rcmJson_(value,max){const s=JSON.stringify(value);if(!s||s.length>max)rcmFail_('RECORD_TOO_LARGE');return s;}
function rcmList_(value,max){if(value===undefined)return [];if(!Array.isArray(value)||value.length>max)rcmFail_('INVALID_LIST');return value;}
function rcmTimestamp_(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(s)||!Number.isFinite(Date.parse(s)))rcmFail_('INVALID_TIMESTAMP');return s;}
function rcmFail_(code){throw new Error(code);}
function rcmReply_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}

// Run once from the Google editor to create the private connection key.
function initializeStorage() {
  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty('RCM_STORAGE_KEY')) properties.setProperty('RCM_STORAGE_KEY', Utilities.getUuid() + Utilities.getUuid());
  console.log('Private connection key is ready. No key is printed in this log.');
}

// Run once from the Google editor: creates any missing tabs with the expected headers.
function setupSheets() {
  const book = SpreadsheetApp.openById(RCM_SHEET_ID);
  Object.keys(RCM_HEADERS).forEach(name => {
    const header = RCM_HEADERS[name];
    const sh = book.getSheetByName(name) || book.insertSheet(name);
    if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  console.log('Tabs ready: ' + Object.keys(RCM_HEADERS).join(', '));
}
