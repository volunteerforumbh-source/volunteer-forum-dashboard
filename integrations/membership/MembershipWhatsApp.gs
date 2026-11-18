/* Install after core.js in the EXISTING notification service. Closed by default.
 * GitHub is the durable scheduler. The browser never carries a recipient or API key.
 * Owner OAuth reads Firestore through IAM; Firebase user tokens are never persisted.
 */
const MN_LOCATION_ = 'JWpqvSmfgfac35fabPLX';
const MN_ROOT_ = 'https://firestore.googleapis.com/v1/projects/forum-committee-membership/databases/(default)/documents/forumCommittees/media/';

function membershipWhatsAppOwns_(event) {
  try { return ['membershipWhatsAppStatus','membershipWhatsAppRetry','membershipWhatsAppWorker'].includes(JSON.parse(event.postData.contents).action); }
  catch (_) { return false; }
}
function membershipWhatsAppHandle_(event) {
  let result;
  try {
    const raw = event.postData.contents;
    if (raw.length > 12000) throw Error('invalid-request');
    const body = JSON.parse(raw);
    result = body.action === 'membershipWhatsAppWorker' ? mnWorker_(body) : mnPublic_(body);
  } catch (_) { result = {ok:false, code:'request-rejected'}; }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
function mnConfig_() {
  const p = PropertiesService.getScriptProperties();
  return {enabled:p.getProperty('MEMBERSHIP_SEND_ENABLED') === 'true',
    workerToken:p.getProperty('MEMBERSHIP_WORKER_TOKEN') || '',
    startAt:p.getProperty('MEMBERSHIP_START_AT') || '',
    apiToken:p.getProperty('MEMBERSHIP_SANAD_TOKEN') || '',
    templateId:p.getProperty('MEMBERSHIP_TEMPLATE_ID') || '',
    // Set only after verifying an actual message resolves exactly one contact.name variable.
    contractVerified:p.getProperty('MEMBERSHIP_TEMPLATE_CONTRACT_VERIFIED') === 'true'};
}
function mnEqual_(a,b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length < 32 || a.length !== b.length) return false;
  let diff = 0; for (let i=0;i<a.length;i++) diff |= a.charCodeAt(i)^b.charCodeAt(i); return diff === 0;
}
function mnId_(id) { if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw Error('invalid-id'); return id; }
function mnRead_(group,id,token) {
  if (!['applications','members','audit'].includes(group)) throw Error('invalid-group');
  const r = UrlFetchApp.fetch(MN_ROOT_+group+'/'+encodeURIComponent(mnId_(id)), {headers:{Authorization:'Bearer '+token},muteHttpExceptions:true,followRedirects:false});
  if (r.getResponseCode() === 404) return null;
  if (r.getResponseCode() !== 200) throw Error('source-unavailable');
  return mnDecode_(JSON.parse(r.getContentText()));
}
function mnDecode_(doc) {
  return {...Object.fromEntries(Object.entries(doc.fields || {}).map(([k,v])=>[k,forumDecodeFirestore_(v)])),id:doc.name.split('/').pop()};
}
function mnList_(group,token) {
  if (!['applications','members','audit'].includes(group)) throw Error('invalid-group');
  const output = []; let page = '';
  do {
    const r=UrlFetchApp.fetch(MN_ROOT_+group+'?pageSize=300'+(page?'&pageToken='+encodeURIComponent(page):''),{headers:{Authorization:'Bearer '+token},muteHttpExceptions:true,followRedirects:false});
    if (r.getResponseCode() !== 200) throw Error('background-read-not-authorized');
    const data=JSON.parse(r.getContentText()); output.push(...(data.documents || []).map(mnDecode_)); page=data.nextPageToken || '';
    // Fail closed rather than treating an incomplete audit scan as complete.
    if (output.length > 10000) throw Error('source-scan-limit');
  } while(page);
  return output;
}
function mnLedger_() {
  // Reuse the private existing ledger, with a distinct namespace; no sheet sharing change.
  const base=forumLedger_();
  return {get:key=>base.get('MEMBERSHIP:'+key),put:(key,value)=>base.put('MEMBERSHIP:'+key,value)};
}
function mnPublic_(body) {
  const identity=forumIdentity_(body.idToken);
  const reviewer=mnRead_('members',identity.uid,body.idToken);
  if (reviewer?.state !== 'active' || reviewer.role !== 'manager') throw Error('unauthorized');
  const uid=mnId_(body.uid);
  // Read using the caller token as well as verifying the role, preserving Firestore Rules.
  const app=mnRead_('applications',uid,body.idToken);
  if (app?.state !== 'accepted') throw Error('invalid-source');
  const config=mnConfig_();
  if (!config.startAt) return {ok:true,state:'not_configured',retryable:false};
  const lock=LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const ledger=mnLedger_(),key=MembershipWhatsAppCore.eventKey(uid),record=ledger.get(key);
    if (body.action === 'membershipWhatsAppRetry') {
      if (uid === identity.uid) throw Error('self-action-denied');
      const next=MembershipWhatsAppCore.retry(record,true);
      next.retryActor=identity.uid; next.retryAt=new Date().toISOString(); ledger.put(key,next);
      return MembershipWhatsAppCore.publicStatus(next);
    }
    if (!record && app.updatedAt && Date.parse(app.updatedAt) < Date.parse(config.startAt)) return {ok:true,state:'historical_review',retryable:false};
    return MembershipWhatsAppCore.publicStatus(record);
  } finally { lock.releaseLock(); }
}
function mnWorker_(body) {
  const config=mnConfig_();
  if (!mnEqual_(body.workerToken,config.workerToken)) throw Error('unauthorized');
  if (body.requestId && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) throw Error('invalid-request-id');
  // A manual request identifier is diagnostic only: it cannot override the source or limits.
  if (!config.enabled || !config.startAt || !config.apiToken || !config.templateId || !config.contractVerified) return {ok:true,state:'disabled',processed:0};
  const lock=LockService.getScriptLock();
  if (!lock.tryLock(1000)) return {ok:true,state:'busy',processed:0};
  try {
    const ownerToken=ScriptApp.getOAuthToken();
    const apps=mnList_('applications',ownerToken),members=mnList_('members',ownerToken),audits=mnList_('audit',ownerToken);
    const byId=Object.fromEntries(members.map(m=>[m.id,m])); const ledger=mnLedger_();
    let historical=0,blocked=0;
    for (const app of apps.filter(a=>a.state === 'accepted')) {
      const key=MembershipWhatsAppCore.eventKey(app.id); let old=ledger.get(key);
      if (old?.state === 'processing') {
        // A process that died after reserving an attempt is ambiguous, not retryable.
        if (Date.now()-Date.parse(old.processingAt)>10*60*1000) ledger.put(key,{...old,state:'unknown',reason:'worker-interrupted'});
        continue;
      }
      if (old && old.state !== 'pending') continue;
      let source;
      try { source=MembershipWhatsAppCore.prove({uid:app.id,application:app,member:byId[app.id],audits,actors:byId,startAt:config.startAt}); }
      catch (_) {
        ledger.put(key,{...old,state:'source_invalid',uid:app.id,reason:'source-or-audit-needs-review'}); blocked++; continue;
      }
      if (source.historical) { ledger.put(key,{state:'historical_review',uid:app.id,reason:'no-retroactive-send'}); historical++; continue; }
      // Re-read immediately before processing; don't send from a stale application list.
      const freshApp=mnRead_('applications',app.id,ownerToken),freshMember=mnRead_('members',app.id,ownerToken);
      source=MembershipWhatsAppCore.prove({uid:app.id,application:freshApp,member:freshMember,audits,actors:byId,startAt:config.startAt});
      if (source.historical) throw Error('source-changed');
      const actor=mnRead_('members',source.actorId,ownerToken);
      if (actor?.state !== 'active' || actor.role !== 'manager') throw Error('actor-revoked');
      const result=mnExecute_(source,old,ledger,config);
      return {ok:true,state:result.state,processed:1,historical,blocked};
    }
    return {ok:true,state:'idle',processed:0,historical,blocked};
  } finally { lock.releaseLock(); }
}
function mnSanad_(path,method,body,config) {
  // Official public API only. No session cookie or private browser API.
  const r=UrlFetchApp.fetch('https://services.leadconnectorhq.com'+path,{method,
    headers:{Authorization:'Bearer '+config.apiToken,Version:'v3'},contentType:'application/json',
    ...(body?{payload:JSON.stringify(body)}:{}),muteHttpExceptions:true,followRedirects:false});
  let data={}; try { data=JSON.parse(r.getContentText()); } catch (_) {}
  return {http:r.getResponseCode(),data};
}
function mnExecute_(source,old,ledger,config) {
  const key=source.eventKey;
  // Reserve before any provider POST; the global lock serializes GitHub reruns.
  let record={...old,uid:source.uid,auditId:source.auditId,state:'processing',processingAt:new Date().toISOString(),attempts:(old?.attempts || 0)+1};
  ledger.put(key,record);
  let contact;
  try {
    const result=mnSanad_('/contacts/search','post',{locationId:MN_LOCATION_,page:1,pageLimit:100,filters:[{field:'phone',operator:'eq',value:source.phone}]},config);
    if (result.http !== 200 || !Array.isArray(result.data.contacts) || result.data.contacts.length >= 100 || result.data.total > 100) throw Error('contact-search-unverified');
    contact=MembershipWhatsAppCore.contact(source,result.data.contacts,MN_LOCATION_);
  } catch (_) {
    record={...record,state:'failed',definitiveNoSend:true,reason:'preflight-contact-or-name-check-failed'};
    ledger.put(key,record); return record;
  }
  // Only the existing contact is used. This service never creates/updates a contact or tag.
  record={...record,contactId:contact.id,externalAttemptAt:new Date().toISOString(),definitiveNoSend:false};
  ledger.put(key,record); // flush completes BEFORE send; timeout afterwards must not cause resend.
  let outcome;
  try {
    const result=mnSanad_('/conversations/messages','post',{type:'WhatsApp',contactId:contact.id,templateId:config.templateId,status:'pending'},config);
    outcome=MembershipWhatsAppCore.outcome(result.http,result.data);
  } catch (_) { outcome={state:'unknown',reason:'transport-interrupted',messageId:'',definitiveNoSend:false}; }
  record={...record,...outcome,completedAt:new Date().toISOString()};
  ledger.put(key,record); return record;
}

// Owner-only editor check. Read-only; never sends, changes a member, or creates a trigger.
function testMembershipBackgroundRead() {
  const email=Session.getEffectiveUser().getEmail();
  if (email !== 'volunteerforumbh@gmail.com') throw Error('owner-account-required');
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL,['https://www.googleapis.com/auth/datastore']);
  const token=ScriptApp.getOAuthToken();
  const apps=mnList_('applications',token),members=mnList_('members',token),audits=mnList_('audit',token);
  console.log(JSON.stringify({ok:true,applications:apps.length,members:members.length,audits:audits.length,sendAttempted:false}));
}

// Local synthetic verification is independent of OAuth expansion and never uses a real phone.
function testMembershipPolicyClosed() {
  const C=MembershipWhatsAppCore;
  if (C.outcome(200,{}).state !== 'unknown') throw Error('unknown-result-guard-failed');
  if (C.outcome(200,{messageId:'synthetic-message'}).state !== 'sent') throw Error('acceptance-result-failed');
  let rejected=false; try { C.retry({state:'unknown'},true); } catch (_) { rejected=true; }
  if (!rejected) throw Error('retry-guard-failed');
  const config=mnConfig_();
  if (config.enabled) throw Error('closed-preparation-only');
  console.log(JSON.stringify({ok:true,policyChecks:3,sendEnabled:false,sendAttempted:false}));
}

// Owner-only probe: emit diagnostic codes, never response bodies, records or OAuth tokens.
function diagnoseMembershipBackgroundRead() {
  if (Session.getEffectiveUser().getEmail() !== 'volunteerforumbh@gmail.com') throw Error('owner-account-required');
  const r=UrlFetchApp.fetch(MN_ROOT_+'applications?pageSize=1',{
    headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true,followRedirects:false});
  const result={stage:'firestore-read-probe',http:r.getResponseCode(),sendAttempted:false};
  if (result.http !== 200) {
    let error={}; try { error=JSON.parse(r.getContentText()).error || {}; } catch (_) {}
    if (/^[A-Z_]{1,80}$/.test(error.status || '')) result.status=error.status;
    const info=(error.details || []).find(d=>d['@type'] === 'type.googleapis.com/google.rpc.ErrorInfo');
    if (/^[A-Z_]{1,80}$/.test(info?.reason || '')) result.reason=info.reason;
    if (info?.metadata?.service === 'firestore.googleapis.com') result.service=info.metadata.service;
    if (/^projects\/\d{1,30}$/.test(info?.metadata?.consumer || '')) result.consumer=info.metadata.consumer;
  }
  console.log(JSON.stringify(result));
}
