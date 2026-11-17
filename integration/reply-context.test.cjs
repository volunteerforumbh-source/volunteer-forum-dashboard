const test=require('node:test');
const assert=require('node:assert/strict');
const engine=require('./reply-context.js');
const now='2026-11-17T00:00:00Z';
function fixture(){
  const map=new Map();let writes=0,failAt=Infinity;
  const ledger={get:k=>map.has(k)?structuredClone(map.get(k)):null,put(k,v){if(++writes===failAt)throw Error('storage_failed');map.set(k,structuredClone(v));}};
  const trust={authenticated:true,receiptVerified:true,memberBindingVerified:true,mode:'synthetic'};
  const member={id:'synthetic-member',title:'member',role:'member',state:'active'};
  const tasks=Object.fromEntries(['A','B'].map(n=>['synthetic-task-'+n,{id:'synthetic-task-'+n,title:n,state:'production',planState:'accepted',assigneeId:member.id,revision:'rev-'+n}]));
  const read=(group,id)=>structuredClone(group==='members'&&id===member.id?member:tasks[id]||null);
  const binding={memberId:member.id,contactId:'synthetic-contact',locationId:'synthetic-location'};
  const receipt=n=>({messageId:'synthetic-crm-'+n,altIds:['synthetic-wamid-'+n],locationId:binding.locationId,contactId:binding.contactId,conversationId:'synthetic-conversation',status:'sent'});
  const event=n=>({eventId:'synthetic-event-'+n,memberId:member.id,taskId:'synthetic-task-'+n,revision:'rev-'+n,template:'forum_task_followup_ar',status:'DRY_RUN',dryRun:true,synthetic:true});
  const bind=n=>engine.bind(ledger,event(n),receipt(n),binding,trust,now);
  const incoming=(replyId='synthetic-reply',original='synthetic-wamid-A',text='تمت المهمة')=>({replyId,originalMessageId:original,text,locationId:binding.locationId,contactId:binding.contactId,conversationId:'synthetic-conversation'});
  const process=body=>engine.process(ledger,body,trust,read,now);
  return {map,ledger,trust,member,tasks,read,binding,receipt,event,bind,incoming,process,writes:()=>writes,failOn:n=>failAt=n};
}
test('bind CRM/provider IDs to one immutable event; same member has two independently correlated tasks',()=>{
  const h=fixture();h.bind('A');h.bind('B');
  assert.equal(h.process(h.incoming()).taskId,'synthetic-task-A');
  assert.equal(h.process(h.incoming('synthetic-reply-B','synthetic-crm-B')).taskId,'synthetic-task-B');
  assert.equal(h.process(h.incoming('synthetic-reply-B2','synthetic-wamid-B')).taskId,'synthetic-task-B');
});
test('three buttons prepare review, production, and help alert without source writes',()=>{
  const h=fixture();h.bind('A');const before=JSON.stringify(h.tasks);
  assert.equal(h.process(h.incoming()).patch.state,'review');
  assert.equal(h.process(h.incoming('synthetic-progress',undefined,'تحت التنفيذ')).patch.state,'production');
  const help=h.process(h.incoming('synthetic-help',undefined,'أحتاج مساعدة'));
  assert.equal(help.alertResponsible,true);assert.equal(help.status,'DRY_RUN');assert.equal(help.createdAt,now);
  assert.equal(JSON.stringify(h.tasks),before);
});
test('duplicate reply is a no-op even if its body changes on retry',()=>{
  const h=fixture();h.bind('A');h.process(h.incoming());const before=JSON.stringify([...h.map]);const count=h.writes();
  assert.equal(h.process({...h.incoming(),taskId:'synthetic-task-B',text:'أحتاج مساعدة'}).status,'duplicate');
  assert.equal(h.writes(),count);assert.equal(JSON.stringify([...h.map]),before);
});
test('unknown text/message, missing parent, and wrong task are review only; never select latest task',()=>{
  const h=fixture();h.bind('A');h.bind('B');const before=JSON.stringify(h.tasks);
  for(const [name,body] of Object.entries({unknownText:h.incoming('synthetic-1',undefined,'نص مجهول'),unknownParent:h.incoming('synthetic-2','synthetic-unknown'),missingParent:{...h.incoming('synthetic-3'),originalMessageId:null},wrongTask:{...h.incoming('synthetic-4'),taskId:'synthetic-task-B'},wrongMember:{...h.incoming('synthetic-5'),memberId:'synthetic-other'}})){
    assert.equal(h.process(body).status,'REVIEW_REQUIRED',name);
  }
  assert.equal(JSON.stringify(h.tasks),before);
});
test('location, sender and conversation scope must match, not just message ID',()=>{
  const h=fixture();h.bind('A');
  for(const field of ['contactId','conversationId','locationId'])assert.equal(h.process({...h.incoming('synthetic-'+field),[field]:'synthetic-other'}).status,'REVIEW_REQUIRED');
});

test('inbound CRM IDs, alternate IDs and outbound reply fields do not substitute for a verified parent',()=>{
  const h=fixture();h.bind('A');h.bind('B');const before=JSON.stringify(h.tasks);
  // These fields identify the incoming message or belong to a send request.
  // Even values colliding with known outbound aliases cannot select a task.
  for (const [index,fields] of [{messageId:'synthetic-crm-A'},{id:'synthetic-crm-B',altId:'synthetic-wamid-B'},{replyMessageId:'synthetic-crm-A'},{lastMessageId:'synthetic-crm-B'}].entries()) {
    const body={...h.incoming('synthetic-contract-'+index),originalMessageId:null,...fields};
    const result=h.process(body);
    assert.equal(result.status,'REVIEW_REQUIRED');
    assert.equal(result.reason,'missing_original_message');
    assert.equal(Object.hasOwn(result,'patch'),false);
  }
  assert.equal(JSON.stringify(h.tasks),before);
});
test('current member role, assignment and source revision are revalidated',()=>{
  const h=fixture();h.bind('A');h.member.role='observer';assert.equal(h.process(h.incoming()).reason,'member_not_authorized');
  h.member.role='member';h.tasks['synthetic-task-A'].assigneeId='synthetic-other';assert.equal(h.process(h.incoming('synthetic-other-assignee')).reason,'task_mismatch');
  h.tasks['synthetic-task-A'].assigneeId=h.member.id;h.tasks['synthetic-task-A'].revision='rev-changed';assert.equal(h.process(h.incoming('synthetic-stale')).reason,'task_revision_changed');
});
test('unverified transport cannot bind or process; aliases cannot be rebound to another task',()=>{
  const h=fixture();assert.throws(()=>engine.bind(h.ledger,h.event('A'),h.receipt('A'),h.binding,{...h.trust,authenticated:false},now),/unverified/);
  assert.throws(()=>engine.process(h.ledger,h.incoming(),{...h.trust,authenticated:false},h.read,now),/unverified/);assert.equal(h.map.size,0);
  h.bind('A');const before=JSON.stringify([...h.map]);
  assert.throws(()=>engine.bind(h.ledger,h.event('B'),{...h.receipt('B'),altIds:['synthetic-wamid-A']},h.binding,h.trust,now),/alias_collision/);
  assert.equal(JSON.stringify([...h.map]),before);
  assert.throws(()=>engine.bind(h.ledger,{...h.event('A'),taskId:'synthetic-task-B'},h.receipt('A'),h.binding,h.trust,now),/context_collision/);
});
test('partial storage never yields a usable context; retry repairs it idempotently',()=>{
  const h=fixture();h.failOn(4);assert.throws(()=>h.bind('A'),/storage_failed/);
  assert.equal(h.process(h.incoming()).reason,'unknown_original_message');h.failOn(Infinity);h.bind('A');
  assert.equal(h.process(h.incoming('synthetic-repaired')).status,'DRY_RUN');
  const count=h.writes();assert.equal(h.bind('A').status,'duplicate');assert.equal(h.writes(),count);
});
test('synthetic and live namespaces cannot consume each other; preview has no live transport',()=>{
  const h=fixture();h.bind('A');
  assert.equal(engine.process(h.ledger,h.incoming('live-reply'),{authenticated:true,mode:'live'},h.read,now).reason,'unknown_original_message');
  assert.throws(()=>engine.bind(h.ledger,h.event('A'),h.receipt('A'),h.binding,{...h.trust,mode:'live'},now),/live_send_not_verified/);
  assert.throws(()=>h.process(h.incoming('real-looking-id')),/synthetic_only/);
  assert.ok(!JSON.stringify([...h.map]).includes('"status":"SENT"'));
});
