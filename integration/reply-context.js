/* Server-side correlation only. No network, credentials, source writes, or live webhook route. */
var ForumReplyContext = (() => {
  'use strict';
  const core = typeof ForumNotificationCore !== 'undefined' ? ForumNotificationCore : require('./notification-core.js');
  const clone = value => JSON.parse(JSON.stringify(value));
  const id = value => typeof value === 'string' && /^[A-Za-z0-9_.:=+\-]{1,512}$/.test(value);
  const key = (kind, mode, locationId, value) => [kind,'v2',mode,locationId,value].map(encodeURIComponent).join(':');
  function allowed(trust) {
    return trust?.authenticated === true && ['synthetic','live'].includes(trust.mode);
  }
  function bind(ledger, event, receipt, binding, trust, now) {
    if (!allowed(trust) || trust.receiptVerified !== true || trust.memberBindingVerified !== true) throw Error('unverified_provider');
    if (!event || event.template !== core.templates.task_followup || !core.validId(event.memberId) || !core.validId(event.taskId)) throw Error('invalid_event');
    const mode=trust.mode;
    if (mode === 'live' && (event.dryRun !== false || event.status !== 'SENT')) throw Error('live_send_not_verified');
    if (mode === 'synthetic' && (!event.synthetic || !event.dryRun || !event.memberId.startsWith('synthetic-') || !event.taskId.startsWith('synthetic-'))) throw Error('synthetic_only');
    if (!id(receipt?.messageId) || !id(receipt.locationId) || !id(receipt.contactId) || !id(receipt.conversationId) ||
        !['sent','delivered','read'].includes(receipt.status)) throw Error('invalid_receipt');
    if (binding?.memberId !== event.memberId || binding.contactId !== receipt.contactId || binding.locationId !== receipt.locationId) throw Error('recipient_binding_mismatch');
    if (receipt.altIds !== undefined && !Array.isArray(receipt.altIds)) throw Error('invalid_alias');
    const aliases=[...new Set([receipt.messageId,...(receipt.altIds || [])])];
    if (!aliases.every(id) || aliases.length > 4) throw Error('invalid_alias');
    if (mode === 'synthetic' && !aliases.every(value=>value.startsWith('synthetic-'))) throw Error('synthetic_only');
    const contextKey=key('context',mode,receipt.locationId,receipt.messageId);
    const value={schemaVersion:2,mode,eventId:event.eventId,memberId:event.memberId,taskId:event.taskId,
      template:event.template,locationId:receipt.locationId,contactId:receipt.contactId,conversationId:receipt.conversationId,
      messageId:receipt.messageId,aliases,taskRevision:event.revision,status:mode==='synthetic'?'SIMULATED':'SENT'};
    const existing=ledger.get(contextKey);
    if (existing && JSON.stringify(existing.binding)!==JSON.stringify(value)) throw Error('context_collision');
    // Check every alias before writing anything. Incomplete storage writes never become usable contexts.
    for (const alias of aliases) {
      const prior=ledger.get(key('alias',mode,receipt.locationId,alias));
      if (prior && prior.contextKey !== contextKey) throw Error('alias_collision');
    }
    if (existing?.stage === 'COMMITTED') return {status:'duplicate',contextKey};
    ledger.put(contextKey,{stage:'PREPARED',binding:value,createdAt:now});
    for (const alias of aliases) ledger.put(key('alias',mode,receipt.locationId,alias),{contextKey});
    ledger.put(contextKey,{stage:'COMMITTED',binding:value,createdAt:now});
    return {status:'bound',contextKey};
  }
  function process(ledger, incoming, trust, readSource, now) {
    // Trust comes from a provider authenticator on the server, never JSON supplied by a browser/workflow.
    if (!allowed(trust)) throw Error('unverified_provider');
    const mode=trust.mode;
    if (!id(incoming?.replyId) || !id(incoming.locationId)) throw Error('invalid_reply');
    if (mode==='synthetic' && !incoming.replyId.startsWith('synthetic-')) throw Error('synthetic_only');
    const replyKey=key('reply',mode,incoming.locationId,incoming.replyId);
    const prior=ledger.get(replyKey);
    if (prior) return {status:'duplicate',dryRun:true};
    function review(reason) {
      const result={status:'REVIEW_REQUIRED',reason,dryRun:true,mode,replyId:incoming.replyId,createdAt:now};
      ledger.put(replyKey,result); return result;
    }
    if (!id(incoming.originalMessageId)) return review('missing_original_message');
    const alias=ledger.get(key('alias',mode,incoming.locationId,incoming.originalMessageId));
    const stored=alias ? ledger.get(alias.contextKey) : null;
    const context=stored?.stage==='COMMITTED' ? stored.binding : null;
    if (!context || context.mode!==mode || !context.aliases.includes(incoming.originalMessageId)) return review('unknown_original_message');
    if (context.locationId!==incoming.locationId || context.contactId!==incoming.contactId || context.conversationId!==incoming.conversationId) return review('sender_scope_mismatch');
    if ((incoming.memberId && incoming.memberId!==context.memberId) || (incoming.taskId && incoming.taskId!==context.taskId)) return review('claimed_context_mismatch');
    const member=readSource('members',context.memberId);
    const task=readSource('tasks',context.taskId);
    if (!member || member.id!==context.memberId || member.state!=='active' || !['member','lead','manager','deputy'].includes(member.role)) return review('member_not_authorized');
    if (!task || task.id!==context.taskId || task.assigneeId!==context.memberId) return review('task_mismatch');
    if (task.revision!==context.taskRevision) return review('task_revision_changed');
    const reply={replyId:incoming.replyId,messageId:context.messageId,memberId:context.memberId,text:incoming.text,mode};
    const decision=core.replyDecision(reply,context,task,member);
    if (decision.status!=='APPLY') return review(decision.reason);
    const result={...decision,status:'DRY_RUN',dryRun:true,mode,eventId:context.eventId,
      originalMessageId:context.messageId,replyId:incoming.replyId,memberId:context.memberId,taskId:context.taskId,
      expectedTaskRevision:task.revision,createdAt:now,reason:'preview_only_no_source_write'};
    ledger.put(replyKey,result);
    return clone(result);
  }
  return Object.freeze({bind,process,key});
})();
if (typeof module !== 'undefined') module.exports=ForumReplyContext;
