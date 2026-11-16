import test from 'node:test';
import assert from 'node:assert/strict';
import {withNotification,inspectNotificationSource} from '../forum-notifications.mjs';
const user={getIdToken:async()=> 'synthetic-transient-token'};
test('source inspection only requests a read and rejects unverified results',async()=>{
  const calls=[];globalThis.fetch=async(url,options)=>{calls.push(JSON.parse(options.body));return {ok:true,json:async()=>({status:'read_only',memberActive:true,auditMatches:true,sourceWrites:0})};};
  assert.equal((await inspectNotificationSource(user,'tasks','synthetic-task')).sourceWrites,0);
  assert.deepEqual(calls,[{action:'forumNotificationInspect',group:'tasks',sourceId:'synthetic-task',idToken:'synthetic-transient-token'}]);
  globalThis.fetch=async()=>({ok:true,json:async()=>({status:'error',reason:'unauthorized'})});
  await assert.rejects(()=>inspectNotificationSource(user,'tasks','synthetic-task'),/unauthorized/);
});
test('integration unavailable: original transaction still succeeds once',async()=>{
  let changes=0,calls=0;globalThis.fetch=async()=>{calls++;throw Error('offline');};
  assert.equal(await withNotification(user,'task_assigned','task-A',async()=>{changes++;return 'saved';}),'saved');
  assert.equal(changes,1);assert.equal(calls,1);
});
test('original write fails: no commit request is made',async()=>{
  const actions=[];globalThis.fetch=async(url,options)=>{actions.push(JSON.parse(options.body).action);return {ok:true,json:async()=>({status:'prepared',preparationId:'p'})};};
  await assert.rejects(()=>withNotification(user,'task_assigned','task-A',async()=>{throw Error('permission-denied');}),/permission-denied/);
  assert.deepEqual(actions,['forumNotificationPrepare']);
});
test('successful source transaction commits only the preparation ID and transient identity',async()=>{
  const bodies=[];globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);bodies.push(body);return {ok:true,json:async()=>body.action==='forumNotificationPrepare'?{status:'prepared',preparationId:'p'}:{status:'dry_run'}};};
  await withNotification(user,'permission_updated','member-A',async()=>{});
  assert.deepEqual(Object.keys(bodies[1]).sort(),['action','idToken','preparationId']);
  assert.equal(bodies[1].preparationId,'p');
  assert.equal(bodies.some(x=>'variables' in x || 'recipientName' in x),false);
});
