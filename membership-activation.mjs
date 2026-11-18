// Acceptance and its two immutable audit records are the durable notification source.
// No network call after this transaction is required for notification recovery.
export async function acceptMembership({sdk, db, collection, actor, application}) {
  if (actor.role !== 'manager' || actor.state !== 'active' || !actor.uid || actor.uid === application.id) {
    throw Error('permission-denied');
  }
  const appRef = sdk.doc(collection('applications'), application.id);
  const memberRef = sdk.doc(collection('members'), application.id);
  const actorRef = sdk.doc(collection('members'), actor.uid);
  const appAudit = sdk.doc(collection('audit'));
  const memberAudit = sdk.doc(collection('audit'));
  return sdk.runTransaction(db, async tx => {
    // Re-read the reviewer in the transaction; UI role state alone is insufficient.
    const reviewer = await tx.get(actorRef);
    const source = await tx.get(appRef);
    const profile = await tx.get(memberRef);
    if (!reviewer.exists() || reviewer.data().state !== 'active' || reviewer.data().role !== 'manager') throw Error('permission-denied');
    if (!source.exists() || !source.data().updatedAt?.isEqual(application.updatedAt)) throw Error('stale');
    if (source.data().state === 'accepted') return {alreadyAccepted:true};
    if (source.data().state === 'draft') throw Error('invalid-state');
    const timestamp = sdk.serverTimestamp();
    tx.set(appAudit, {actorId:actor.uid, group:'applications', targetId:application.id, operation:'update', timestamp});
    tx.update(appRef, {state:'accepted', auditId:appAudit.id, updatedAt:timestamp});
    tx.set(memberAudit, {actorId:actor.uid, group:'members', targetId:application.id, operation:profile.exists()?'update':'create', timestamp});
    if (profile.exists()) tx.update(memberRef, {state:'active', auditId:memberAudit.id, updatedAt:timestamp});
    else tx.set(memberRef, {title:source.data().title, role:'member', teamId:'', primaryRole:'', supportRoles:'', skills:'', availability:source.data().availability||'', state:'active', portalSections:['volunteer-space'], auditId:memberAudit.id, updatedAt:timestamp});
    return {alreadyAccepted:false};
  });
}

const endpoint = 'https://script.google.com/macros/s/AKfycbwTmfaeN-MjODlQgVqywELT7UfzxIXfvMEJURxv108vz7VhlqqWKcSpgzKI231yYiYn/exec';
export async function membershipNotificationRequest(user, action, uid) {
  if (!['membershipWhatsAppStatus','membershipWhatsAppRetry'].includes(action)) throw Error('invalid-action');
  const response = await fetch(endpoint, {method:'POST', redirect:'follow', headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({action, uid, idToken:await user.getIdToken(true)}), signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw Error('service-unavailable');
  const data = await response.json();
  if (data.ok !== true || !notificationLabels[data.state]) throw Error('service-unavailable');
  // Whitelist output; the server never returns contact details or credentials.
  return {state:data.state, retryable:data.retryable === true, messageId:typeof data.messageId === 'string' ? data.messageId : ''};
}
export const notificationLabels = Object.freeze({
  pending:'بانتظار الإرسال', processing:'قيد المعالجة', sent:'قَبِل مزود واتساب الرسالة',
  delivered:'تم التسليم وفق سجل المزود', read:'تمت القراءة وفق سجل المزود',
  failed:'تعذّر الإرسال', unknown:'نتيجة الإرسال غير مؤكدة — يلزم التحقق قبل أي إعادة',
  historical_review:'قبول سابق — يحتاج مطابقة سجل سند، ولن يُرسل تلقائيًا',
  not_configured:'الإرسال التلقائي غير مفعّل بعد', source_invalid:'مصدر التفعيل يحتاج مراجعة'
});
