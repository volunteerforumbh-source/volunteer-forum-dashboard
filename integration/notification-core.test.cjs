const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('./notification-core.js');
const now = '2026-11-17T12:00:00Z';
const member = {id:'test-member',title:'عضو اصطناعي',state:'active',role:'member'};
const task = {id:'task-A',title:'مهمة اصطناعية',assigneeId:member.id,planState:'accepted',state:'production',due:'2026-11-16'};
const build = (type, before, after, overrides={}) => core.build({eventType:type,sourceId:type.startsWith('task_')?task.id:member.id,
  revision:'2026-11-17T11:00:00.000Z',before,after,member,now,...overrides});
test('membership: only a real transition to active',()=>{
  assert.equal(build('membership_activated',{state:'pending'},member).template,core.templates.membership_activated);
  assert.equal(build('membership_activated',member,member),null);
  assert.equal(build('membership_activated',null,{...member,state:'pending'}),null);
});
test('permissions: actual role/section change, never merely order or saving',()=>{
  assert.ok(build('permission_updated',{role:'member',portalSections:['volunteer-space']},{...member,portalSections:['media-committee']}));
  assert.equal(build('permission_updated',{...member,portalSections:['a','b']},{...member,portalSections:['b','a']}),null);
});
test('assignment: accepted task assigned to the exact recipient only',()=>{
  assert.ok(build('task_assigned',null,task));
  assert.equal(build('task_assigned',task,{...task,title:'title changed'}),null);
  assert.equal(build('task_assigned',null,{...task,assigneeId:'another-member'}),null);
  assert.equal(build('task_assigned',null,{...task,planState:'proposed'}),null);
});
test('followup uses Bahrain due date and excludes final states',()=>{
  assert.ok(build('task_followup',null,task));
  assert.equal(build('task_followup',null,{...task,due:'2026-11-18'}),null);
  assert.equal(build('task_followup',null,{...task,state:'completed'}),null);
  assert.equal(core.dueAt({...task,due:'2026-11-17'}),Date.parse('2026-11-17T20:59:59Z'));
});
test('same source revision produces the same id, payload is immutable',()=>{
  const mutable={...task};const one=build('task_assigned',null,mutable);mutable.title='later task';member.title='later contact';
  assert.equal(one.variables[1],'مهمة اصطناعية');assert.equal(one.variables[0],'عضو اصطناعي');
  assert.equal(one.eventId,build('task_assigned',null,task).eventId);member.title='عضو اصطناعي';
});
test('safe gate blocks non-active templates, incomplete config and dry runs',()=>{
  const record={dryRun:false};const ready={dryRun:false,templateStatus:'Active',sourceRevalidated:true,recipientVerified:true,
    requestScopedVariablesVerified:true,replyCorrelationVerified:true,workflowPublished:true};
  assert.equal(core.sendDecision(record,ready),'READY');
  assert.equal(core.sendDecision(record,{...ready,templateStatus:'Pending'}),'BLOCKED_TEMPLATE');
  assert.equal(core.sendDecision(record,{...ready,workflowPublished:false}),'BLOCKED_CONFIGURATION');
  assert.equal(core.sendDecision({...record,dryRun:true},ready),'DRY_RUN');
});
const context={messageId:'synthetic-outbound-1',memberId:member.id,taskId:task.id,template:core.templates.task_followup,status:'SENT'};
const reply=text=>({replyId:'synthetic-reply-1',messageId:context.messageId,memberId:member.id,text});
test('reply: done goes to review, in-progress, help alert; no duplicate task creation',()=>{
  assert.equal(core.replyDecision(reply('تمت المهمة'),context,task,member).patch.state,'review');
  assert.equal(core.replyDecision(reply('تحت التنفيذ'),context,task,member).patch.state,'production');
  const help=core.replyDecision(reply('أحتاج مساعدة'),context,task,member);
  assert.equal(help.alertResponsible,true);assert.equal(help.taskId,task.id);
});
test('same member with two tasks cannot update the other task',()=>{
  assert.equal(core.replyDecision(reply('تمت المهمة'),context,{...task,id:'task-B'},member).reason,'task_mismatch');
  assert.equal(core.replyDecision(reply('تمت المهمة'),context,{...task,assigneeId:'member-B'},member).reason,'task_mismatch');
});
test('unknown, uncorrelated, closed and unauthorized responses only go to review',()=>{
  assert.equal(core.replyDecision(reply('أي رد'),context,task,member).status,'REVIEW_REQUIRED');
  assert.equal(core.replyDecision({...reply('تمت المهمة'),messageId:'other-message'},context,task,member).reason,'unknown_message');
  assert.equal(core.replyDecision(reply('تمت المهمة'),null,task,member).status,'REVIEW_REQUIRED');
  assert.equal(core.replyDecision(reply('تمت المهمة'),context,{...task,state:'completed'},member).reason,'task_closed');
  assert.equal(core.replyDecision(reply('تمت المهمة'),context,task,{...member,state:'inactive'}).reason,'identity_mismatch');
});
