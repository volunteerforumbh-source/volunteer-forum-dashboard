// Public endpoint identifier only. Authorization uses a fresh Firebase token; no token is persisted.
export const notificationServiceUrl = 'https://script.google.com/macros/s/AKfycbwTmfaeN-MjODlQgVqywELT7UfzxIXfvMEJURxv108vz7VhlqqWKcSpgzKI231yYiYn/exec';
async function request(user, body) {
  const response=await fetch(notificationServiceUrl,{
    method:'POST',credentials:'omit',headers:{'Content-Type':'text/plain;charset=UTF-8'},
    body:JSON.stringify({...body,idToken:await user.getIdToken()}),signal:AbortSignal.timeout(10000)
  });
  if(!response.ok)throw Error('notification_service_unavailable');
  return response.json();
}
export async function withNotification(user,eventType,sourceId,mutate) {
  let prepared;
  try {prepared=await request(user,{action:'forumNotificationPrepare',eventType,sourceId});} catch {}
  // An integration outage must never change existing membership or task authorization/transactions.
  const result=await mutate();
  if(prepared?.status==='prepared') {
    try {
      const state=await request(user,{action:'forumNotificationCommit',preparationId:prepared.preparationId});
      if(!['dry_run','duplicate','no_change'].includes(state.status))throw Error('notification_not_recorded');
    } catch {console.warn('Forum notification was not confirmed in the central ledger. No WhatsApp send was attempted.');}
  } else console.warn('Forum notification preparation unavailable. Original change was saved; no WhatsApp send was attempted.');
  return result;
}
