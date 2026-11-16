# Forum notification integration — draft PR 4

This extends the existing Firebase portal, existing Apps Script pilot and central workbook. Membership, task authorization and reviewer approval remain authoritative. No live WhatsApp transport, task-write callback, new workflow, credential, or permission grant is installed.

## Verified operating state (17 November 2026, Bahrain)

- `forumRunDryRun()` ran successfully in Google. Its second run retained eight unique synthetic records: four events, three replies and a summary. The seven event/reply records and earlier unrelated ledger records were unchanged.
- `forumRunReplyContextDryRun()` passed twice in the same Google Apps Script project (02:41 and 02:42 Bahrain). It uses two simulated original messages for two tasks assigned to the same simulated member, plus nine reply cases. The existing Sheet retained the same 15 context/alias/reply records on the second run; only its test summary changed. All prior eight synthetic records and unrelated ledger records were preserved. Neither test performs network calls or source writes.
- Firebase Console was inspected using the existing project-owner session, without modifying documents or rules. Existing member records were readable. One member's audit document matched its target ID and update timestamp, and its actor ID was in the existing membership collection. This is an administrative console check, **not** validation of a Firebase test-account ID token through the integration.
- No explicitly designated, already authorized test account was identified in the central membership register or the current `forumCommittees/media/members` records. The current portal session reported no active membership. No new member, invitation or permission was created. Authenticated test-account integration reads therefore remain **unverified**.
- Both existing Sanad workflows remain Draft. `WF_FORUM_NOTIFICATIONS` retains its four event branches and no send actions. `WF_FORUM_REPLIES` retains Customer Replied restricted to WhatsApp; no callback or task-write action has been saved.
- In the actual reply Workflow's Custom Webhook variable picker, the Message category exposed Message Body, Message Subject and Message Attachments. An original-message ID was not available in the inspected picker. The unsaved action was cancelled. This finding does not prove that every Sanad API lacks that ID.
- The four templates were last checked as Pending. The live portal and Apps Script deployment have not been updated.

## Existing source and ledger

`withNotification` prepares a server-side source snapshot before the existing Firebase transaction and commits a dry-run notification afterwards. Source/audit documents are re-read using the user's transient Firebase ID token and existing rules. Browser-supplied names and permissions are not trusted. An integration outage does not change the original transaction's authorization or result.

`inspectNotificationSource(user, group, sourceId)` requests `forumNotificationInspect`. It verifies the current actor and member, reads source revision and audit linkage, and returns a read-only result. It performs no ledger/source writes. Its successful authenticated path is tested with mocked services only until an eligible test login is available.

All integration state uses the existing `سجل رسائل المنتدى 2026` columns `Event_Key`, `State_JSON`, `Updated_At_UTC`, under `FORUM_NOTIFY:` keys. Private names, phone numbers, member IDs, credentials and webhook URLs obtained during inspection are not committed to this repository.

## Original-message and reply correlation

`reply-context.js` provides a server-side binding and preview engine:

1. Bind an authoritative event to a verified outbound receipt and a verified member/contact association. Store CRM ID and provider alternative IDs as aliases of the same immutable context. Include location, conversation, member, task and task revision.
2. Check all aliases for collisions before writing. A context becomes usable only after its final COMMITTED marker. Retries can repair incomplete storage; a message cannot be rebound to another task.
3. Look up replies by the exact original-message alias and location. Never choose the latest task or infer the task from reply text. Contact, conversation, claimed member/task, current membership role, assignment and source revision must match.
4. Deduplicate by inbound reply ID within location and mode. A duplicate produces no ledger/source writes, even if the retried body changes.
5. Unknown/missing original IDs, unknown text, mismatched identity/task, unauthorized roles and stale revisions produce REVIEW_REQUIRED records. They never change a task.

| Button | Prepared result |
| --- | --- |
| تمت المهمة | `state: review` — pending responsible reviewer approval |
| تحت التنفيذ | `state: production`, recorded with processing time |
| أحتاج مساعدة | `help_requested` plus `alertResponsible: true`; no duplicate task |

Every prepared result is DRY_RUN. The responsible-person alert and task patch are recorded proposals; no actual task write or alert delivery is installed. Synthetic bindings use SIMULATED rather than SENT and are isolated from live aliases/replies. The previous synthetic test records are preserved.

The trust argument is an internal server boundary, **not a JSON authentication scheme**. No public action accepts caller-supplied `authenticated`, receipts or bindings. A future live adapter must authenticate the provider and verify the actual receipt/member mapping before calling the engine. That adapter is deliberately not connected without a verified provider context and existing authorized access.

## Provider contract still to verify

The normalized internal reply requires `replyId`, `originalMessageId`, `locationId`, `contactId`, `conversationId` and the button value. Member/task IDs come from stored context, not shared mutable Contact fields. Optional caller-claimed IDs can only cause a mismatch rejection.

Meta contextual replies use their original message context, but that provider ID must be mapped to the exact outbound event. A CRM inbound message ID, a conversation ID, a phone number, a timestamp or body text is not a substitute for the original message ID. The documented HighLevel inbound webhook schema does not guarantee that parent ID. A real authorized sample or existing provider read API must establish the actual Sanad contract. This requires neither a second reply workflow nor a text-based fallback.

Apps Script's documented `doPost(e)` event does not expose raw request headers. Do not pretend to validate a Meta/HighLevel header signature using JSON fields. No unauthenticated direct-provider route is installed. Adding a verifier or a credential requires separate validation and any newly needed access must be approved by the user.

Primary references: [HighLevel inbound webhook](https://marketplace.gohighlevel.com/docs/webhook/InboundMessage/index.html), [message read API](https://marketplace.gohighlevel.com/docs/ghl/conversations/get-message/), [Apps Script request event](https://developers.google.com/apps-script/guides/web).

## Checks

```
node integration/notification-core.test.cjs
node integration/reply-context.test.cjs
node integration/apps-script.test.cjs
node integration/portal-notifications.test.mjs
```

29 local tests cover all four event types, no-op edits, original-operation failures, source/audit and identity checks, immutable snapshots, three buttons, two tasks for one member, alias/context collisions, duplicate and unknown replies, wrong parent/task/sender/conversation/location, reassignment, observer access, stale revisions, partial storage recovery and separation of synthetic/live namespaces. Google/Firebase services are mocked in local tests. Successful Google editor tests verify actual Sheet persistence, but use synthetic member/task/provider fixtures.

Install in the existing Apps Script file in order: `notification-core.js`, `reply-context.js`, `ForumNotifications.gs`. Preserve the existing `doPost` routing and old `sendPilot` handler. Saving editor code does not publish a new deployment.

## Remaining before operation

- Use an already authorized, explicitly designated Firebase test login; read test source/audit records with its ID token, without changing rules or real members/tasks.
- Verify actual Sanad original-message and outbound receipt IDs, provider authentication, and immutable member/contact association. If a real send or new access is needed, stop that step for user approval.
- Wait for Active templates, map request-scoped variables and install a verified callback. Test authorization/version checks before any task-write implementation.
- Configure follow-up scheduling against the authorized source; only manual dry-run preparation exists now.
- Keep both Workflows Draft and PR 4 unmerged. No live portal/Apps Script deployment or messaging activation is authorized by these tests.

## Cost

Sanad labels Inbound Webhook and Custom Webhook as Premium. No paid service was purchased and no workflow was published. The previous synthetic mapping request was captured while Draft; account billing reconciliation and Sanad's own markup remain unverified. [Premium pricing](https://help.gohighlevel.com/support/solutions/articles/155000005678).
