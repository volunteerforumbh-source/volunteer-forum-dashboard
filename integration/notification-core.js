/* Shared by the existing Apps Script service and offline tests. No network or credentials. */
var ForumNotificationCore = (() => {
  'use strict';
  const templates = Object.freeze({
    membership_activated: 'forum_membership_activated_ar',
    permission_updated: 'forum_permission_updated_ar',
    task_assigned: 'forum_task_assigned_ar',
    task_followup: 'forum_task_followup_ar'
  });
  const closed = ['completed', 'approved', 'scheduled', 'published', 'archived', 'cancelled'];
  const copy = value => JSON.parse(JSON.stringify(value));
  const sections = row => JSON.stringify([...new Set(row?.portalSections || [])].sort());
  const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
  const validReplyId = value => typeof value === 'string' && /^[A-Za-z0-9_.:=+\-]{1,512}$/.test(value);
  const requireValue = (value, label) => {
    if (typeof value !== 'string' || !value.trim() || value.length > 1000) throw Error('invalid_' + label);
    return value.trim();
  };
  function dueAt(task) {
    const value = task.followupAt || task.due;
    if (!value || typeof value !== 'string') return NaN;
    // Existing tasks use a Bahrain calendar date. No accidental UTC midnight reminder.
    const zoned = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T23:59:59+03:00' :
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value) ? value + '+03:00' : value;
    return Date.parse(zoned);
  }
  function build(input) {
    const {eventType, sourceId, revision, before = null, after, member, now} = input;
    if (!Object.hasOwn(templates, eventType) || !validId(sourceId)) throw Error('invalid_event');
    requireValue(revision, 'revision');
    if (!after || !member || member.state !== 'active' || !validId(member.id)) throw Error('inactive_recipient');
    let changed = false;
    if (eventType === 'membership_activated') {
      changed = after.state === 'active' && before?.state !== 'active' && member.id === sourceId;
    } else if (eventType === 'permission_updated') {
      changed = Boolean(before && after.state === 'active' && member.id === sourceId &&
        (before.role !== after.role || sections(before) !== sections(after)));
    } else if (eventType === 'task_assigned') {
      changed = after.planState === 'accepted' && after.assigneeId === member.id &&
        (before?.planState !== 'accepted' || before?.assigneeId !== after.assigneeId);
    } else {
      changed = after.planState === 'accepted' && after.assigneeId === member.id &&
        !closed.includes(after.state) && Number.isFinite(dueAt(after)) && Date.parse(now) >= dueAt(after);
    }
    if (!changed) return null;
    const task = eventType.startsWith('task_');
    const variables = [requireValue(member.title, 'name')];
    if (task) variables.push(requireValue(after.title, 'task_title'));
    if (eventType === 'permission_updated') {
      variables.push('الدور: ' + requireValue(after.role, 'role') + '؛ المساحات: ' +
        (after.portalSections || []).join('، '));
    }
    const suffix = task ? '?section=media-committee&view=tasks&task=' + encodeURIComponent(sourceId) : '';
    const eventId = [eventType, sourceId, revision, member.id].join(':');
    return copy({
      eventId, eventType, memberId: member.id, taskId: task ? sourceId : '', sourceId, revision,
      template: templates[eventType], language: 'ar', variables, linkSuffix: suffix,
      // An immutable per-event snapshot. Never read Contact fields at execution time.
      sourceSnapshot: task ? {assigneeId: after.assigneeId, state: after.state, planState: after.planState} :
        {state: after.state, role: after.role, portalSections: after.portalSections || []},
      createdAt: now, status: 'DRY_RUN', messageId: '', dryRun: true
    });
  }
  function sendDecision(record, config) {
    if (config.dryRun !== false || record.dryRun !== false) return 'DRY_RUN';
    if (config.templateStatus !== 'Active') return 'BLOCKED_TEMPLATE';
    if (!config.sourceRevalidated || !config.recipientVerified || !config.requestScopedVariablesVerified ||
        !config.replyCorrelationVerified || config.workflowPublished !== true) return 'BLOCKED_CONFIGURATION';
    return 'READY';
  }
  function replyDecision(reply, context, task, member) {
    const review = reason => ({status: 'REVIEW_REQUIRED', reason});
    if (!reply || !validReplyId(reply.replyId) || !reply.messageId) return review('missing_message_context');
    if (!context || context.messageId !== reply.messageId || context.template !== templates.task_followup ||
        !(context.status === 'SENT' || (context.status === 'SIMULATED' && context.mode === 'synthetic' && reply.mode === 'synthetic')) || !context.taskId) return review('unknown_message');
    if (reply.memberId !== context.memberId || !member || member.id !== context.memberId || member.state !== 'active') {
      return review('identity_mismatch');
    }
    if (!task || task.id !== context.taskId || task.assigneeId !== context.memberId || task.planState !== 'accepted') {
      return review('task_mismatch');
    }
    if (closed.includes(task.state)) return review('task_closed');
    if (!['idea', 'preparation', 'production', 'changes', 'review'].includes(task.state)) return review('state_not_editable');
    if (reply.text === 'تمت المهمة') {
      // The existing portal reserves final completion approval for a reviewer.
      return {status: 'APPLY', taskId: task.id, patch: {state: 'review'}, result: 'submitted_for_review'};
    }
    if (reply.text === 'تحت التنفيذ') {
      if (task.state === 'review') return review('already_under_review');
      return {status: 'APPLY', taskId: task.id, patch: {state: 'production'}, result: 'in_progress'};
    }
    if (reply.text === 'أحتاج مساعدة') {
      return {status: 'APPLY', taskId: task.id, patch: {}, result: 'help_requested', alertResponsible: true};
    }
    return review('unknown_reply');
  }
  return Object.freeze({templates, build, sendDecision, replyDecision, validId, validReplyId, dueAt});
})();
if (typeof module !== 'undefined') module.exports = ForumNotificationCore;
