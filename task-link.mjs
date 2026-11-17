// Navigation only. Call after authentication and the existing authorized task query.
// A URL is never evidence of identity, membership, assignment, or permission to write.
export function taskLinkRequest(search) {
  const params = new URLSearchParams(search);
  if (!params.has('task')) return {requested:false};
  const single = name => params.getAll(name).length === 1;
  const taskId = params.get('task');
  const valid = ['section','view','task'].every(single) &&
    params.get('section') === 'media-committee' && params.get('view') === 'tasks' &&
    /^[A-Za-z0-9_-]{1,128}$/.test(taskId);
  return valid ? {requested:true,valid:true,taskId} : {requested:true,valid:false};
}

export function linkedTasks(rows, request, currentUid) {
  if (!request.requested) return rows;
  if (!request.valid || !currentUid) return [];
  return rows.filter(row => row.id === request.taskId && row.assigneeId === currentUid);
}
