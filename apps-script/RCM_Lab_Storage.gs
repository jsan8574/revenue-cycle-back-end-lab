// Google Apps Script storage adapter. Only the Lab SERVER may call this endpoint.
// Never place RCM_STORAGE_KEY in browser code or share the spreadsheet publicly.
const RCM_SHEET_ID = '1c6k6g88ankOOOtRns1buITb1LkbNk4jVKq3mum75Dxo';
const RCM_CASES = ['AR-3106','AR-3119','AR-3142','AR-3160','AR-3174','DM-5101','DM-5102','DM-5103','DM-5104','DM-5105'];
const RCM_HEADERS = {
  Sessions: ['session_id','resume_code_hash','learner_name','created_at_utc','updated_at_utc','status','data_version','revision','learner_email'],
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
      const email = rcmEmail_(req.learner_email);
      if (!session) {
        const now = new Date().toISOString();
        db.Sessions.appendRow([Utilities.getUuid(),hash,rcmText_(req.learner_name,100),now,now,'active',rcmText_(req.data_version,100),0,email]);
        session = rcmRows_(db.Sessions).find(r => r.values[1] === hash);
        rcmSafeRefresh_(db);
      } else if (email && !session.values[8]) {
        db.Sessions.getRange(session.row,9).setValue(email);
        rcmSafeRefresh_(db);
      }
      return rcmReply_({ok:true,session_id:session.values[0]});
    }
    if (!session) rcmFail_('SESSION_NOT_FOUND');
    const sid = session.values[0];
    if (action === 'load_session') {
      return rcmReply_({ok:true,session:{session_id:sid,learner_name:session.values[2],learner_email:session.values[8],updated_at_utc:session.values[4],data_version:session.values[6]},
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
    rcmSafeRefresh_(db);
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
    // Columns added in later versions are appended to an existing header row.
    if(sh){const cur=sh.getRange(1,1,1,header.length).getValues()[0];header.forEach((h,i)=>{if(cur[i]===''&&cur.slice(0,i).every((v,j)=>v===header[j]))sh.getRange(1,i+1).setValue(h);});}
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
function rcmEmail_(s){if(s===undefined||s==='')return '';const e=rcmText_(s,200).trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e))rcmFail_('INVALID_TEXT');return e;}
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

// ---------------------------------------------------------------------------
// Facilitator view: Learners, Account Progress and Activity Log tabs.
// Rebuilt after every save. Only the "Required accounts" column is typed by
// the facilitator; it is kept across rebuilds. Everything else is generated.
// ---------------------------------------------------------------------------
const RCM_DEFAULT_REQUIRED = ['AR-3106','AR-3119','AR-3142','AR-3160','AR-3174'];
const RCM_STALLED_DAYS = 3;

// Adds an "RCM Lab" menu to the spreadsheet for facilitators.
function onOpen() {
  SpreadsheetApp.getUi().createMenu('RCM Lab').addItem('Refresh facilitator view', 'refreshDashboard').addToUi();
}

// Run from the editor any time to rebuild the facilitator tabs by hand.
function refreshDashboard() { rcmRefreshDashboard_(rcmDb_()); }

function rcmSafeRefresh_(db) {
  try { rcmRefreshDashboard_(db); } catch (err) { console.error('Dashboard refresh failed: ' + err.message); }
}

function rcmRefreshDashboard_(db) {
  const book = SpreadsheetApp.openById(RCM_SHEET_ID);
  book.setRecalculationInterval(SpreadsheetApp.RecalculationInterval.HOUR);
  const toDate = v => v instanceof Date ? v : (v ? new Date(v) : null);
  const parse = v => { try { return JSON.parse(v); } catch (e) { return {}; } };

  const sessions = rcmRows_(db.Sessions).map(r => ({id:r.values[0], name:String(r.values[2]), email:String(r.values[8] || ''), created:toDate(r.values[3]), updated:toDate(r.values[4])}));
  const progress = rcmRows_(db['Case Progress']).map(r => ({sid:r.values[0], caseId:r.values[1], module:r.values[2], updated:toDate(r.values[3]), p:parse(r.values[5])}));
  const research = rcmRows_(db['Research Log']).map(r => ({sid:r.values[1], caseId:r.values[2], at:toDate(r.values[3]), channel:r.values[4], type:r.values[5], details:parse(r.values[6])}));
  const submissions = rcmRows_(db.Submissions).map(r => ({sid:r.values[1], caseId:r.values[2], at:toDate(r.values[3]), type:r.values[4], ref:r.values[7]}));
  const nameOf = {}; sessions.forEach(s => nameOf[s.id] = s.name);

  // Keep what the facilitator typed in "Required accounts".
  const learnersSheet = book.getSheetByName('Learners') || book.insertSheet('Learners');
  const required = {};
  if (learnersSheet.getLastRow() > 1) {
    const head = learnersSheet.getRange(1, 1, 1, learnersSheet.getLastColumn()).getValues()[0];
    const reqCol = head.indexOf('Required accounts'), idCol = head.indexOf('Learner ID');
    if (reqCol >= 0 && idCol >= 0) {
      learnersSheet.getRange(2, 1, learnersSheet.getLastRow() - 1, head.length).getValues()
        .forEach(row => { if (row[idCol]) required[row[idCol]] = String(row[reqCol] || '').trim(); });
    }
  }
  const requiredList = sid => {
    const typed = (required[sid] || '').toUpperCase().match(/(AR|DM)-\d{4}/g);
    return typed && typed.length ? typed.filter((x, i, a) => a.indexOf(x) === i) : RCM_DEFAULT_REQUIRED;
  };
  const stalledFormula = (cell, active) =>
    '=IF(NOW()-' + cell + '>' + RCM_STALLED_DAYS + ',"🔴 Stalled","' + active + '")';
  const idleFormula = cell =>
    '=IF(' + cell + '="","",IF(NOW()-' + cell + '<1,ROUND((NOW()-' + cell + ')*24)&" hrs",ROUND(NOW()-' + cell + ')&" days"))';

  // ---- Account Progress: one row per learner per account (required or touched)
  const accountRows = [];
  const learnerRows = [];
  sessions.sort((a, b) => (b.updated || 0) - (a.updated || 0)).forEach(s => {
    const mine = progress.filter(x => x.sid === s.id);
    const req = requiredList(s.id);
    const caseIds = req.concat(mine.map(x => x.caseId).filter(id => req.indexOf(id) < 0));
    const flags = [];
    let done = 0, touched = 0;
    caseIds.forEach(caseId => {
      const rec = mine.find(x => x.caseId === caseId);
      const sum = (rec && rec.p && rec.p.summary) || null;
      const checklist = (sum && sum.checklist) || [];
      const doneSteps = checklist.filter(c => c.done).length;
      const missing = checklist.filter(c => !c.done).map(c => c.label);
      const res = research.filter(x => x.sid === s.id && x.caseId === caseId);
      const subs = submissions.filter(x => x.sid === s.id && x.caseId === caseId);
      const count = ch => res.filter(x => x.channel === ch).length;
      const researchText = !rec && !res.length ? '' :
        [[count('portal'), 'portal'], [count('phone'), 'call'], [count('chat'), 'chat'], [subs.length, 'submission']]
          .filter(x => x[0]).map(x => x[0] + ' ' + x[1]).join(', ') || 'None';
      const closed = !!(sum && sum.closed);
      const wrong = (sum && sum.wrongAttempts) || 0;
      if (closed && req.indexOf(caseId) >= 0) done++;
      if (rec) touched++;
      if (wrong >= 3) flags.push(wrong + ' wrong resolution attempts on ' + caseId);
      const status = !rec ? '⚪ Not started' : closed ? '🟢 Completed' : null;
      accountRows.push({
        status, last: rec ? rec.updated : null,
        values: [s.name, (sum && sum.module) || (caseId.indexOf('DM-') === 0 ? 'Denial Management' : 'Insurance Follow-up'),
          caseId, req.indexOf(caseId) >= 0 ? 'Yes' : 'No', '',
          sum ? doneSteps + ' of ' + checklist.length : (rec ? 'Opened' : ''),
          closed ? '—' : missing.join(', '), researchText,
          (sum && sum.resolution) || '', rec ? wrong : '', sum ? (sum.notePosted ? '✔' : '✘') : '',
          (sum && sum.score != null) ? sum.score : '', rec ? rec.updated : '', '']
      });
    });
    const last = s.updated || s.created;
    const base = done >= req.length ? '🟢 Completed' : touched ? '🟡 In progress' : '⚪ Not started';
    learnerRows.push({ base, values: [s.name, s.email, required[s.id] || '', done + ' of ' + req.length, '', s.created, last, '', flags.join('; ') || '—', s.id] });
  });

  // ---- Write Learners
  const LH = ['Learner','Email','Required accounts','Done','Status','Started','Last active','Idle','Needs attention','Learner ID'];
  rcmWriteTab_(learnersSheet, LH, learnerRows.map((r, i) => {
    const row = i + 2, v = r.values.slice();
    v[4] = r.base === '🟢 Completed' ? r.base : stalledFormula('G' + row, r.base);
    v[7] = r.base === '🟢 Completed' ? '—' : idleFormula('G' + row);
    return v;
  }), {dates:[6,7], widths:[170,220,190,80,130,130,150,80,320,10]});
  learnersSheet.getRange(1, 3).setNote('Type the accounts this learner must complete, e.g. AR-3106, AR-3119. Leave blank for all 5 Insurance Follow-up accounts. Kept when the tab refreshes.');
  learnersSheet.showColumns(1, learnersSheet.getMaxColumns());
  learnersSheet.hideColumns(10);
  if (learnerRows.length) learnersSheet.getRange(2, 3, learnerRows.length, 1).setBackground('#fff8e1');

  // ---- Write Account Progress
  const AH = ['Learner','Module','Account','Required','Status','Checklist','Missing steps','Payer research','Resolution chosen','Wrong attempts','Note posted','Score','Last active'];
  const accountSheet = book.getSheetByName('Account Progress') || book.insertSheet('Account Progress');
  rcmWriteTab_(accountSheet, AH, accountRows.map((r, i) => {
    const row = i + 2, v = r.values.slice(0, AH.length);
    v[4] = r.status || stalledFormula('M' + row, '🟡 In progress');
    return v;
  }), {dates:[13], widths:[170,150,90,80,130,90,360,200,200,110,100,70,150], wrap:[7]});

  // ---- Write Activity Log (newest first)
  const activity = research.map(x => [x.at, nameOf[x.sid] || '', x.caseId, {portal:'Portal',phone:'Call',chat:'Chat',lab:'Lab'}[x.channel] || x.channel, x.type, (x.details && x.details.text) || ''])
    .concat(submissions.map(x => [x.at, nameOf[x.sid] || '', x.caseId, 'Submission', x.type, 'Receipt ' + x.ref]))
    .sort((a, b) => (b[0] || 0) - (a[0] || 0));
  const activitySheet = book.getSheetByName('Activity Log') || book.insertSheet('Activity Log');
  rcmWriteTab_(activitySheet, ['When','Learner','Account','Channel','Activity','Details'], activity,
    {dates:[1], widths:[150,170,90,100,180,520], wrap:[6]});

  // Facilitator tabs first, raw tabs after.
  ['Learners','Account Progress','Activity Log'].forEach((name, i) => { book.setActiveSheet(book.getSheetByName(name)); book.moveActiveSheet(i + 1); });
}

function rcmWriteTab_(sh, header, rows, opts) {
  sh.clearContents(); sh.clearFormats();
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold').setBackground('#1b6168').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  if (sh.getMaxRows() < rows.length + 1) sh.insertRowsAfter(sh.getMaxRows(), rows.length + 1 - sh.getMaxRows());
  if (rows.length) {
    sh.getRange(2, 1, rows.length, header.length).setValues(rows).setVerticalAlignment('top');
    (opts.dates || []).forEach(c => sh.getRange(2, c, rows.length, 1).setNumberFormat('mmm d, h:mm am/pm'));
    (opts.wrap || []).forEach(c => sh.getRange(2, c, rows.length, 1).setWrap(true));
  }
  (opts.widths || []).forEach((w, i) => sh.setColumnWidth(i + 1, w));
  const extra = sh.getMaxRows() - Math.max(rows.length + 1, 50);
  if (extra > 0) sh.deleteRows(Math.max(rows.length + 1, 50) + 1, extra);
}
