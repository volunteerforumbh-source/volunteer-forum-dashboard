/* Shared, deterministic policy. No I/O, tokens or personal records embedded. */
var MembershipWhatsAppCore = (() => {
  'use strict';
  const portal = 'https://volunteerforumbh-source.github.io/volunteer-forum-dashboard/';
  const template = 'forum_membership_activated_ar';
  const eventKey = uid => {
    if (typeof uid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw Error('invalid-source');
    return 'membership-activated-v1:' + uid;
  };
  const name = value => String(value || '').trim().replace(/\s+/g,' ');
  const phone = value => {
    const p = String(value || '').replace(/[\s()-]/g,'');
    if (!/^\+[1-9]\d{7,14}$/.test(p)) throw Error('invalid-phone');
    return p;
  };
  function prove({uid, application, member, audits, actors, startAt}) {
    eventKey(uid);
    if (application?.state !== 'accepted' || member?.state !== 'active') throw Error('inactive-source');
    // Immutable audit pairs, written at the same server timestamp by the same actor.
    // Scan all audit pairs rather than only current auditId (later edits replace auditId).
    const pairs = audits.filter(a => a.group === 'applications' && a.targetId === uid && a.operation === 'update' && a.actorId !== uid &&
      audits.some(m => m.group === 'members' && m.targetId === uid && m.actorId === a.actorId &&
        ['create','update'].includes(m.operation) && m.timestamp === a.timestamp));
    pairs.sort((a,b) => a.timestamp.localeCompare(b.timestamp));
    if (!pairs.length) throw Error('missing-activation-audit');
    const first = pairs[0];
    if (!Number.isFinite(Date.parse(first.timestamp)) || !Number.isFinite(Date.parse(startAt))) throw Error('invalid-cutoff');
    // Old acceptances are never enrolled by changing the launch cutoff or a later edit.
    if (Date.parse(first.timestamp) < Date.parse(startAt)) return {historical:true, eventKey:eventKey(uid)};
    const actor = actors[first.actorId];
    if (actor?.state !== 'active' || actor?.role !== 'manager') throw Error('actor-not-authorized');
    if (application.consent !== 'yes') throw Error('missing-consent');
    const title = name(application.title);
    if (!title || title.length > 200 || /[\r\n{}]/.test(application.title)) throw Error('invalid-name');
    return {eventKey:eventKey(uid), uid, title, phone:phone(application.phone), auditId:first.id, actorId:first.actorId, activatedAt:first.timestamp, template, portal};
  }
  function contact(source, contacts, locationId) {
    const matches = contacts.filter(c => c.locationId === locationId && phone(c.phone) === source.phone);
    if (matches.length !== 1) throw Error(matches.length ? 'ambiguous-contact' : 'missing-contact');
    const c = matches[0];
    if (typeof c.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(c.id)) throw Error('invalid-contact-id');
    const contactName = name(c.name || c.contactName || [c.firstName,c.lastName].filter(Boolean).join(' '));
    // The approved template maps {{1}} to contact.name. Do not silently update CRM.
    if (contactName !== source.title) throw Error('template-name-mismatch');
    if (c.dnd === true || ['active','permanent'].includes(c.dndSettings?.WhatsApp?.status) ||
      ['active','permanent'].includes(c.dndSettings?.whatsapp?.status)) throw Error('recipient-dnd');
    return c;
  }
  function outcome(http, body) {
    const id = body?.messageId || body?.message?.id;
    if (http >= 200 && http < 300 && typeof id === 'string' && /^[A-Za-z0-9_.:-]{1,256}$/.test(id)) {
      return {state:'sent', messageId:id, definitiveNoSend:false};
    }
    // An HTTP rejection is retained as uncertain until provider logs prove no enqueue.
    // In particular, 5xx/timeouts/2xx-without-ID must never be automatically retried.
    return {state:'unknown', messageId:'', definitiveNoSend:false, reason:'provider-result-needs-reconciliation'};
  }
  function retry(record, manager) {
    if (!manager || record?.state !== 'failed' || record.definitiveNoSend !== true || record.externalAttemptAt) throw Error('retry-denied');
    return {...record, state:'pending', reason:'', retryRequested:true};
  }
  function publicStatus(record) {
    if (!record) return {ok:true,state:'pending',retryable:false};
    return {ok:true,state:record.state,messageId:record.messageId || '',retryable:record.state === 'failed' && record.definitiveNoSend === true && !record.externalAttemptAt};
  }
  return {portal, template, eventKey, name, phone, prove, contact, outcome, retry, publicStatus};
})();
if (typeof module !== 'undefined') module.exports = MembershipWhatsAppCore;
