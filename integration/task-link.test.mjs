import test from 'node:test';
import assert from 'node:assert/strict';
import {taskLinkRequest,linkedTasks} from '../task-link.mjs';
const search = '?section=media-committee&view=tasks&task=synthetic-task-A';
const rows = [
  {id:'synthetic-task-A',assigneeId:'synthetic-member',state:'production'},
  {id:'synthetic-task-B',assigneeId:'synthetic-member',state:'production'},
  {id:'synthetic-task-C',assigneeId:'synthetic-other',state:'production'}
];
test('specific task is selected even when the same member has multiple tasks',()=>{
  assert.deepEqual(linkedTasks(rows,taskLinkRequest(search),'synthetic-member'),[rows[0]]);
  assert.deepEqual(linkedTasks(rows,taskLinkRequest(search.replace('task-A','task-B')),'synthetic-member'),[rows[1]]);
});
test('forwarded, missing, and wrong-task links reveal no substitute task',()=>{
  for (const [url,uid] of [[search,'synthetic-other'],[search,''],[search.replace('task-A','unknown'),'synthetic-member'],[search.replace('task-A','task-C'),'synthetic-member']]) {
    assert.deepEqual(linkedTasks(rows,taskLinkRequest(url),uid),[]);
  }
});
test('duplicate, malformed, cross-section and cross-view task requests fail closed',()=>{
  for (const url of [search+'&task=synthetic-task-B',search+'&view=allTasks',search+'&section=other',search.replace('task-A','../task-A'),search.replace('task-A','%2Ftask-A'),search.replace('media-committee','other'),search.replace('view=tasks','view=allTasks'),'?task=synthetic-task-A',search.replace('synthetic-task-A','')]) {
    const request=taskLinkRequest(url);
    assert.equal(request.valid,false,url);
    assert.deepEqual(linkedTasks(rows,request,'synthetic-member'),[]);
  }
});
test('URL state/action/member claims cannot update a task or expand assignment',()=>{
  const before=structuredClone(rows);
  const request=taskLinkRequest(search+'&state=completed&action=approve&memberId=synthetic-other');
  assert.deepEqual(request,{requested:true,valid:true,taskId:'synthetic-task-A'});
  assert.deepEqual(linkedTasks(rows,request,'synthetic-member'),[rows[0]]);
  assert.deepEqual(rows,before);
});
test('ordinary authorized task list navigation remains available without a task link',()=>{
  assert.equal(linkedTasks(rows,taskLinkRequest('?section=media-committee&view=tasks'),'synthetic-member'),rows);
});
