/* Add to the EXISTING pilot Apps Script project together with notification-core.js.
 * Route only action names beginning forumNotification to forumNotificationRequest_().
 * Existing sendPilot handler stays unchanged. No live WhatsApp transport is installed.
 */
const FORUM_NOTIFICATION_SHEET_ID_ = '1kfoULs8mq2GkMyRG2Hgu7iBpr7KQ1KzpMGhmBZitT5w';
const FORUM_FIRESTORE_ROOT_ = 'https://firestore.googleapis.com/v1/projects/forum-committee-membership/databases/(default)/documents/forumCommittees/media/';

function forumLedger_() {
  const sheet = SpreadsheetApp.openById(FORUM_NOTIFICATION_SHEET_ID_).getSheetByName('سجل رسائل المنتدى 2026');
  if (!sheet) throw Error('missing_message_ledger');
  const header = sheet.getRange(1, 1, 1, 3).getValues()[0];
  if (header.join('|') !== 'Event_Key|State_JSON|Updated_At_UTC') throw Error('ledger_schema_mismatch');
  return {
    get(key) {
      if (sheet.getLastRow() < 2) return null;
      const match = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder('FORUM_NOTIFY:' + key)
        .matchEntireCell(true).useRegularExpression(false).findAll();
      if (match.length > 1) throw Error('duplicate_ledger_key');
      if (!match.length) return null;
      return JSON.parse(sheet.getRange(match[0].getRow(), 2).getValue());
    },
    put(key, state) {
      const serialized = JSON.stringify(state);
      if (serialized.length > 45000) throw Error('ledger_record_too_large');
      let matches = [];
      if (sheet.getLastRow() > 1) matches = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
        .createTextFinder('FORUM_NOTIFY:' + key).matchEntireCell(true).useRegularExpression(false).findAll();
      if (matches.length > 1) throw Error('duplicate_ledger_key');
      const row = matches.length ? matches[0].getRow() : sheet.getLastRow() + 1;
      sheet.getRange(row, 1, 1, 3).setValues([['FORUM_NOTIFY:' + key, serialized, new Date().toISOString()]]);
      SpreadsheetApp.flush();
    }
  };
}

function forumIdentity_(token) {
  const key = PropertiesService.getScriptProperties().getProperty('FIREBASE_API_KEY');
  if (!key || typeof token !== 'string' || token.length < 100 || token.length > 8000) throw Error('unauthorized');
  const response = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(key), {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({idToken: token}),
    muteHttpExceptions: true, followRedirects: false
  });
  if (response.getResponseCode() !== 200) throw Error('unauthorized');
  const user = JSON.parse(response.getContentText()).users?.[0];
  if (!user?.localId || !user.emailVerified || user.disabled) throw Error('unauthorized');
  return {uid: user.localId, email: user.email};
}

function forumDecodeFirestore_(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(forumDecodeFirestore_);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k,v])=>[k,forumDecodeFirestore_(v)]));
  throw Error('unsupported_source_value');
}

function forumSource_(group, id, token) {
  if (!['members','tasks','memberInvites','audit'].includes(group) || !id || id.includes('/') || id.length > 256) throw Error('invalid_source');
  const response = UrlFetchApp.fetch(FORUM_FIRESTORE_ROOT_ + group + '/' + encodeURIComponent(id), {
    headers: {Authorization: 'Bearer ' + token}, muteHttpExceptions: true, followRedirects: false
  });
  if (response.getResponseCode() === 404) return null;
  if (response.getResponseCode() !== 200) throw Error('source_unavailable');
  const document = JSON.parse(response.getContentText());
  return {id, revision: document.updateTime,
    data: Object.fromEntries(Object.entries(document.fields || {}).map(([k,v])=>[k,forumDecodeFirestore_(v)]))};
}

function forumSnapshot_(source, group) {
  if (!source) return null;
  const keys = group === 'members' ? ['title','state','role','portalSections'] :
    ['title','assigneeId','planState','state','due','followupAt'];
  return Object.fromEntries(keys.filter(key=>source.data[key] !== undefined).map(key=>[key,source.data[key]]));
}

function forumNotificationRequest_(body) {
  // All supported public requests require the existing Firebase identity verification.
  // Neither browser-supplied "Active" nor a caller-supplied recipient snapshot is trusted.
  const identity = forumIdentity_(body.idToken);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) return {status: 'busy'};
  try {
    const ledger = forumLedger_();
    if (body.action === 'forumNotificationReplyPreview') {
      const reply=body.reply;
      if (!reply || !ForumNotificationCore.validReplyId(reply.replyId) || reply.memberId !== identity.uid ||
          typeof reply.messageId !== 'string' || reply.messageId.length > 512) throw Error('invalid_reply');
      const key='reply:'+reply.replyId;
      const prior=ledger.get(key);
      if(prior)return {status:'duplicate',dryRun:true};
      const context=ledger.get('message:'+reply.messageId);
      let task=null;
      if(context?.taskId && ForumNotificationCore.validId(context.taskId)) {
        const source=forumSource_('tasks',context.taskId,body.idToken);
        if(source)task={id:source.id,...source.data};
      }
      const person=forumSource_('members',identity.uid,body.idToken);
      const decision=ForumNotificationCore.replyDecision(reply,context,task,person?{id:person.id,...person.data}:null);
      ledger.put(key,{...reply,eventType:'task_reply',...decision,status:decision.status==='APPLY'?'DRY_RUN':'REVIEW_REQUIRED',
        dryRun:true,createdAt:new Date().toISOString(),reason:decision.reason||'preview_only_no_task_write'});
      return {status:decision.status==='APPLY'?'dry_run':'review_required',reason:decision.reason||'',dryRun:true};
    }
    if (body.action === 'forumNotificationPrepare') {
      const type = body.eventType;
      if (!Object.hasOwn(ForumNotificationCore.templates,type) || !ForumNotificationCore.validId(body.sourceId)) throw Error('invalid_event');
      const group = type.startsWith('task_') ? 'tasks' : 'members';
      const actor = forumSource_('members', identity.uid, body.idToken);
      const source = forumSource_(group, body.sourceId, body.idToken);
      let selfActivation = false;
      if (type === 'membership_activated' && body.sourceId === identity.uid && !source) {
        const invite = forumSource_('memberInvites', identity.email, body.idToken);
        selfActivation = invite?.data.profile?.state === 'active' && !invite.data.claimedUid;
      }
      if (!selfActivation && (actor?.data.state !== 'active' || !['manager','deputy'].includes(actor.data.role))) throw Error('unauthorized');
      const preparationId = Utilities.getUuid();
      ledger.put('prepare:' + preparationId, {status:'PREPARED', preparationId, eventType:type, group,
        sourceId:body.sourceId, actorId:identity.uid, before:forumSnapshot_(source,group),
        beforeRevision:source?.revision || '', selfActivation, createdAt:new Date().toISOString(), dryRun:true});
      return {status:'prepared', preparationId, dryRun:true};
    }
    if (body.action === 'forumNotificationCommit') {
      if (!ForumNotificationCore.validId(body.preparationId)) throw Error('invalid_preparation');
      const prepared = ledger.get('prepare:' + body.preparationId);
      if (!prepared || prepared.actorId !== identity.uid) throw Error('unauthorized');
      if (prepared.result) return prepared.result;
      if (Date.now() - Date.parse(prepared.createdAt) > 10 * 60 * 1000) throw Error('preparation_expired');
      const source = forumSource_(prepared.group, prepared.sourceId, body.idToken);
      if (!source || (source.revision === prepared.beforeRevision && prepared.eventType !== 'task_followup')) return {status:'not_committed', dryRun:true};
      const actor = forumSource_('members', identity.uid, body.idToken);
      if (prepared.selfActivation) {
        const invite = forumSource_('memberInvites', identity.email, body.idToken);
        if (identity.uid !== prepared.sourceId || invite?.data.claimedUid !== identity.uid || actor?.data.state !== 'active') throw Error('unauthorized');
      } else {
        if (actor?.data.state !== 'active' || !['manager','deputy'].includes(actor.data.role)) throw Error('unauthorized');
        if (prepared.eventType !== 'task_followup') {
          const audit = forumSource_('audit',source.data.auditId,body.idToken);
          if (!audit || audit.data.actorId !== identity.uid || audit.data.group !== prepared.group ||
              audit.data.targetId !== source.id || audit.data.timestamp !== source.data.updatedAt) throw Error('audit_mismatch');
        }
      }
      const memberId = prepared.group === 'tasks' ? source.data.assigneeId : source.id;
      if (!ForumNotificationCore.validId(memberId)) throw Error('invalid_recipient');
      const member = forumSource_('members',memberId,body.idToken);
      const record = ForumNotificationCore.build({eventType:prepared.eventType,sourceId:source.id,revision:source.revision,
        before:prepared.before,after:forumSnapshot_(source,prepared.group),member:{id:memberId,...forumSnapshot_(member,'members')},now:new Date().toISOString()});
      let result = {status:'no_change',dryRun:true};
      if (record) {
        const prior = ledger.get(record.eventId);
        if (!prior) ledger.put(record.eventId,{...record,actorId:identity.uid});
        result = {status:prior?'duplicate':'dry_run',eventId:record.eventId,template:record.template,dryRun:true};
      }
      ledger.put('prepare:' + prepared.preparationId,{...prepared,status:'COMMITTED',result});
      return result;
    }
    // No generic public task-update endpoint and no unauthenticated WhatsApp callback.
    // Provider context/message IDs and a trusted callback adapter must be verified before live replies.
    return {status:'unsupported_action',dryRun:true};
  } finally { lock.releaseLock(); }
}

function forumNotificationOwns_(event) {
  try {return JSON.parse(event.postData.contents).action?.startsWith('forumNotification') === true;}catch{return false;}
}
function forumNotificationHandle_(event) {
  let result;
  try { result=forumNotificationRequest_(JSON.parse(event.postData.contents)); }
  catch(error) {
    const safe=['unauthorized','invalid_reply','invalid_event','inactive_recipient','source_unavailable','audit_mismatch',
      'ledger_schema_mismatch','missing_message_ledger','duplicate_ledger_key','preparation_expired','invalid_preparation'];
    result={status:'error',reason:safe.includes(error.message)?error.message:'execution_failed',dryRun:true};
    console.warn('Forum notification request: '+result.reason);
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function forumRunDryRun() {
  // Editor-only harness: synthetic data, existing ledger, NO UrlFetch / WhatsApp calls.
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(3000)) throw Error('busy');
  try {
    const ledger=forumLedger_();
    const now='2026-11-17T12:00:00.000Z';
    const member={id:'synthetic-member-001',title:'عضو اصطناعي',state:'active',role:'member'};
    const task={id:'synthetic-task-001',title:'مهمة اصطناعية',assigneeId:member.id,planState:'accepted',state:'production',due:'2026-11-16'};
    const cases=[
      ['membership_activated',{state:'pending'},member],
      ['permission_updated',{...member,portalSections:['volunteer-space']},{...member,portalSections:['volunteer-space','media-committee']}],
      ['task_assigned',null,task], ['task_followup',null,task]
    ];
    const results=[];
    cases.forEach(([eventType,before,after])=>{
      const record=ForumNotificationCore.build({eventType,sourceId:eventType.startsWith('task_')?task.id:member.id,
        revision:'synthetic-revision-20261117',before,after,member,now});
      if(!record||record.status!=='DRY_RUN') throw Error('dry_run_failed');
      const first=ledger.get(record.eventId);
      if(!first) ledger.put(record.eventId,{...record,synthetic:true});
      if(!ledger.get(record.eventId)) throw Error('ledger_write_failed');
      results.push({eventType,status:'PASS',ledger:first?'existing':'written'});
    });
    const context={messageId:'synthetic-message-001',memberId:member.id,taskId:task.id,template:ForumNotificationCore.templates.task_followup,status:'SENT'};
    const seen={};
    ['تمت المهمة','تحت التنفيذ','أحتاج مساعدة'].forEach((text,index)=>{
      const reply={replyId:'synthetic-reply-'+index,messageId:context.messageId,memberId:member.id,text};
      const result=ForumNotificationCore.replyDecision(reply,context,task,member);
      if(result.status!=='APPLY'||result.taskId!==task.id) throw Error('reply_failed');
      const key='reply:'+reply.replyId;
      if(!ledger.get(key))ledger.put(key,{reply,...result,status:'DRY_RUN',synthetic:true,createdAt:now});
      seen[key]=true;
    });
    const wrong=ForumNotificationCore.replyDecision({replyId:'wrong-task',messageId:context.messageId,memberId:member.id,text:'تمت المهمة'},context,{...task,id:'other-task'},member);
    if(wrong.status!=='REVIEW_REQUIRED')throw Error('wrong_task_changed');
    const dup=ledger.get(cases.length&&ForumNotificationCore.build({eventType:'task_assigned',sourceId:task.id,revision:'synthetic-revision-20261117',before:null,after:task,member,now}).eventId);
    if(!dup)throw Error('dedup_failed');
    ledger.put('test-run-20261117',{status:'DRY_RUN_PASS',synthetic:true,results,replyCases:3,dedup:true,otherTaskUnchanged:true,
      liveSendCalls:0,sourceWrites:0,createdAt:new Date().toISOString()});
    console.log(JSON.stringify({status:'PASS',eventCases:4,replyCases:3,dedup:true,otherTaskUnchanged:true,liveSendCalls:0,sourceWrites:0}));
  } finally {lock.releaseLock();}
}
