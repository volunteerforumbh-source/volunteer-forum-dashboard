# Forum notification integration

This change extends the existing Firebase portal and the existing Apps Script pilot. It does not replace membership, task authorization, or the central workbook.

## Current operating state

- `WF_FORUM_NOTIFICATIONS`: draft, one Inbound Webhook and four `event_type` branches. A synthetic mapping request was received and selected in Sanad Boost. No WhatsApp send actions have been saved because all four templates are Pending.
- `WF_FORUM_REPLIES`: draft, Customer Replied restricted to WhatsApp. A trusted message-context callback is still required before any task-write actions can be connected.
- The existing contact/WhatsApp pilots were inspected and left unchanged in Sanad Boost. Their published sending workflows are not called by these tests.
- `ForumNotifications.gs` is added to the existing Apps Script pilot project. The existing `doPost` is extended with `if (forumNotificationOwns_(event)) return forumNotificationHandle_(event);`. The old `sendPilot` handler is preserved.
- Running the new Apps Script test requested additional Google authorization. Authorization was not granted. No new deployment has been activated, and the live portal has not been switched to this branch.

## Data flow

`withNotification` prepares a server-side source snapshot **before** the original Firebase transaction, then commits the notification **after** it. The server uses the user's ephemeral Firebase ID token, the existing project API key in Script Properties, a source re-read, and the existing audit record. Browser-supplied names, template status, or old source data are not trusted.

Prepared and final events use the existing `سجل رسائل المنتدى 2026` tab with its existing `Event_Key`, `State_JSON`, and `Updated_At_UTC` columns. A `FORUM_NOTIFY:` key prefix isolates this integration's records. `State_JSON` holds event/member/task/template identifiers, immutable per-event variables, source revision, status, timestamp and errors/context. No schema changes or new central workbook are needed.

All supported requests are dry runs. There is **no** WhatsApp transport or live task update in the Apps Script adapter. The pure decision function additionally gates future sending on an Active template, source/recipient revalidation, verified request-scoped variables, a verified reply-context mechanism and a published workflow. These checks are prerequisites, not an activation switch.

Task links open the existing authenticated `media-committee&view=tasks` view with the selected task expanded. Access still comes from the existing Firebase rules and filtered queries.

The existing task model requires reviewer approval for completion. A `تمت المهمة` reply therefore proposes `review`, not `completed`. Help replies identify the original task and request an alert; neither a duplicate task nor a final approval is created. Automatic writes remain blocked until a provider-authenticated original-message mapping and a trusted Firebase write adapter are installed and tested.

## Checks actually run

```
node integration/notification-core.test.cjs
node integration/apps-script.test.cjs
node integration/portal-notifications.test.mjs
```

Sixteen tests pass locally. They cover four event types, no-op saves, a second task belonging to the same member, identity mismatch, expired/missing message context, duplicate commits/replies, simulated storage failure, source-write failure, preservation of the original operation during service outages, and immutable recipient snapshots. Apps Script services are mocked in these local checks; they are not proof of a live Google/Firebase/Sanad integration.

`forumRunDryRun()` is an editor-only test that can write four synthetic events, three synthetic replies and a summary to the existing ledger, with stable keys for repeat runs. It performs zero WhatsApp calls and zero source-data writes. Its **remote execution is pending Google authorization**; it has only been run in the local service harness.

## Remaining before live operation

1. Complete the Google authorization for the existing pilot project and run `forumRunDryRun()` twice. Verify the existing ledger entries and idempotency.
2. Verify source/audit reads with authenticated test Firebase records and existing rules. Do not loosen rules to make a test pass.
3. Publish an updated version of the **same** Apps Script deployment only after those checks, then review and merge the portal branch. It still records dry runs only.
4. Wait for the four templates to become Active. Configure each saved Workflow branch using the immutable Inbound Webhook snapshot, not the template's Contact-field defaults.
5. Verify actual outbound provider message IDs and original-message context in a controlled authorized send. Set up a provider-authenticated callback and a trusted Firebase task-write adapter preserving version checks and audit. Unknown/unbound/repeated replies go to review.
6. Configure the follow-up schedule against the actual authorized task source; currently only the manager's manual dry-run preparation is wired. Do not store expiring browser ID tokens for a scheduler.
7. Recheck template status, source/recipient versions, identity, callback signing, deduplication and failure recovery before any publication that can send.

## Cost

The Sanad UI explicitly labels Inbound Webhook as a Premium trigger and warns of per-execution charges. HighLevel's published standard rate is USD 0.01 per premium execution after the eligible free allowance; Sanad's rebilling/markup may differ. No paid plan was purchased and no workflow was published. The single synthetic request was acknowledged as `test request received` while the workflow was a draft. Account billing reconciliation has not been verified.

Sources: [Inbound Webhook](https://help.gohighlevel.com/support/solutions/articles/48001237383), [Premium pricing](https://help.gohighlevel.com/support/solutions/articles/155000005678), [WhatsApp action](https://help.gohighlevel.com/support/solutions/articles/155000003531-action-whatsapp).
