const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function harness(){
  const rows=[['Event_Key','State_JSON','Updated_At_UTC']];
  let failWrite=false,uid='actor',sequence=0;
  const docs={};
  function range(row,col,height=1,width=1){return {
    getValues:()=>Array.from({length:height},(_,r)=>Array.from({length:width},(_,c)=>rows[row+r-1]?.[col+c-1]??'')),
    getValue:()=>rows[row-1]?.[col-1]??'',getRow:()=>row,
    setValues(values){if(failWrite)throw Error('simulated_storage_failure');values.forEach((r,i)=>{rows[row+i-1]||=[];r.forEach((v,j)=>rows[row+i-1][col+j-1]=v);});},
    createTextFinder(key){return {matchEntireCell(){return this;},useRegularExpression(){return this;},
      findAll:()=>rows.flatMap((r,i)=>r[0]===key?[range(i+1,1)]:[])};}
  };}
  const encode=v=>typeof v==='string'?{stringValue:v}:typeof v==='boolean'?{booleanValue:v}:
    Array.isArray(v)?{arrayValue:{values:v.map(encode)}}:typeof v==='number'?{integerValue:String(v)}:{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,w])=>[k,encode(w)]))}};
  const response=(code,data)=>({getResponseCode:()=>code,getContentText:()=>JSON.stringify(data)});
  const context=vm.createContext({console,Date,JSON,Object,Array,Number,Error,NaN,
    SpreadsheetApp:{openById:()=>({getSheetByName:()=>({getRange:range,getLastRow:()=>rows.length})}),flush(){}},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
    PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'test-public-project-key'})},
    Utilities:{getUuid:()=> 'test-preparation-'+(++sequence)},
    UrlFetchApp:{fetch(url){if(url.includes('accounts:lookup'))return response(200,{users:[{localId:uid,email:'synthetic@example.invalid',emailVerified:true}]});
      const path=decodeURIComponent(url.split('/media/')[1]||'');const doc=docs[path];
      return doc?response(200,{updateTime:doc.revision,fields:Object.fromEntries(Object.entries(doc.data).map(([k,v])=>[k,encode(v)]))}):response(404,{});}}
  });
  vm.runInContext(['notification-core.js','reply-context.js','ForumNotifications.gs'].map(f=>fs.readFileSync(__dirname+'/'+f,'utf8')).join('\n'),context);
  docs['members/actor']={revision:'v1',data:{title:'مسؤول تجريبي',state:'active',role:'manager'}};
  return {context,rows,docs,request:body=>context.forumNotificationRequest_({idToken:'x'.repeat(120),...body}),
    setUid:id=>uid=id,fail:()=>failWrite=true};
}
test('existing ledger: actual Apps Script dry-run harness writes 4 events, 3 replies, summary; second run is idempotent',()=>{
  const h=harness();h.context.forumRunDryRun();assert.equal(h.rows.length,9);
  const before=JSON.stringify(h.rows);h.context.forumRunDryRun();assert.equal(h.rows.length,9);
  assert.equal(h.rows.filter(r=>r[0].includes('task_assigned')).length,1);
  assert.ok(before.includes('DRY_RUN'));
});

test('read-only source inspection verifies actor/member/audit without any ledger or source mutation',()=>{
  const h=harness();h.docs['members/member-A']={revision:'v1',data:{state:'active',role:'member'}};
  h.docs['tasks/task-A']={revision:'v2',data:{assigneeId:'member-A',auditId:'audit-A',updatedAt:'time-A'}};
  h.docs['audit/audit-A']={revision:'v2',data:{actorId:'actor',group:'tasks',targetId:'task-A',timestamp:'time-A'}};
  const docs=JSON.stringify(h.docs),rows=JSON.stringify(h.rows);
  const result=h.request({action:'forumNotificationInspect',group:'tasks',sourceId:'task-A'});
  assert.equal(result.auditMatches,true);assert.equal(result.memberId,'member-A');assert.equal(result.memberActive,true);
  assert.equal(JSON.stringify(h.docs),docs);assert.equal(JSON.stringify(h.rows),rows);
  h.setUid('member-A');assert.equal(h.request({action:'forumNotificationInspect',group:'tasks',sourceId:'task-A'}).status,'read_only');
  h.docs['tasks/task-A'].data.assigneeId='member-B';assert.throws(()=>h.request({action:'forumNotificationInspect',group:'tasks',sourceId:'task-A'}),/unauthorized/);
});

test('editor context harness persists two tasks/nine replies, and the repeated run adds no rows',()=>{
  const h=harness();const docs=JSON.stringify(h.docs);h.context.forumRunReplyContextDryRun();const count=h.rows.length;
  h.context.forumRunReplyContextDryRun();assert.equal(h.rows.length,count);assert.equal(JSON.stringify(h.docs),docs);
  const summary=JSON.parse(h.rows.find(r=>r[0]==='FORUM_NOTIFY:reply-context-test-20261117')[1]);
  assert.equal(summary.replyCases,9);assert.ok(summary.results.every(r=>r.existing));
  assert.ok(!h.rows.some(r=>String(r[1]).includes('"status":"SENT"')));
});

test('public JSON cannot manufacture a trusted provider receipt or bypass Firebase authentication',()=>{
  const h=harness();const before=JSON.stringify(h.rows);
  const result=h.request({action:'forumNotificationProviderReply',authenticated:true,mode:'live',replyId:'fake'});
  assert.equal(result.status,'unsupported_action');assert.equal(JSON.stringify(h.rows),before);
  assert.throws(()=>h.request({action:'forumNotificationProviderReply',idToken:'short',authenticated:true}),/unauthorized/);
});
test('two-phase adapter verifies the source and audit, snapshots the recipient, deduplicates retries',()=>{
  const h=harness();h.docs['tasks/task-A']={revision:'v1',data:{title:'task',planState:'proposed',state:'idea',assigneeId:''}};
  h.docs['members/member-A']={revision:'v1',data:{title:'member-A-name',state:'active',role:'member'}};
  const p=h.request({action:'forumNotificationPrepare',eventType:'task_assigned',sourceId:'task-A'});
  h.docs['tasks/task-A']={revision:'v2',data:{title:'task-A-title',planState:'accepted',state:'production',assigneeId:'member-A',auditId:'audit-A',updatedAt:'timestamp-A'}};
  h.docs['audit/audit-A']={revision:'v2',data:{actorId:'actor',group:'tasks',targetId:'task-A',timestamp:'timestamp-A'}};
  const c=h.request({action:'forumNotificationCommit',preparationId:p.preparationId});assert.equal(c.status,'dry_run');
  const count=h.rows.length;h.request({action:'forumNotificationCommit',preparationId:p.preparationId});assert.equal(h.rows.length,count);
  const record=JSON.parse(h.rows.find(r=>r[0]==='FORUM_NOTIFY:'+c.eventId)[1]);
  assert.equal(record.variables[0],'member-A-name');assert.equal(record.variables[1],'task-A-title');
});
test('adapter refuses another actor, missing audit and storage failure without marking a send',()=>{
  const h=harness();h.docs['tasks/task-A']={revision:'v1',data:{title:'task',planState:'proposed',state:'idea',assigneeId:''}};
  const p=h.request({action:'forumNotificationPrepare',eventType:'task_assigned',sourceId:'task-A'});
  h.setUid('other');assert.throws(()=>h.request({action:'forumNotificationCommit',preparationId:p.preparationId}),/unauthorized/);
  h.setUid('actor');h.docs['tasks/task-A'].revision='v2';
  assert.throws(()=>h.request({action:'forumNotificationCommit',preparationId:p.preparationId}),/invalid_source|audit_mismatch/);
  h.fail();assert.throws(()=>h.request({action:'forumNotificationPrepare',eventType:'task_assigned',sourceId:'task-A'}),/simulated_storage_failure/);
  assert.ok(!h.rows.some(r=>String(r[1]).includes('"status":"SENT"')));
});
test('reply adapter deduplicates, preserves task identity and never writes to Firestore in preview mode',()=>{
  const h=harness();h.setUid('member-A');h.docs['members/member-A']={revision:'v1',data:{title:'A',state:'active',role:'member'}};
  h.docs['tasks/task-A']={revision:'v1',data:{title:'A',planState:'accepted',state:'production',assigneeId:'member-A'}};
  h.rows.push(['FORUM_NOTIFY:message:outbound-A',JSON.stringify({messageId:'outbound-A',memberId:'member-A',taskId:'task-A',template:'forum_task_followup_ar',status:'SENT'}),'']);
  const body={action:'forumNotificationReplyPreview',reply:{replyId:'reply-A',messageId:'outbound-A',memberId:'member-A',text:'تمت المهمة'}};
  const before=JSON.stringify(h.docs);assert.equal(h.request(body).status,'dry_run');assert.equal(h.request(body).status,'duplicate');
  assert.equal(JSON.stringify(h.docs),before);
  assert.throws(()=>h.request({...body,reply:{...body.reply,replyId:'reply-B',memberId:'another-member'}}),/invalid_reply/);
});
