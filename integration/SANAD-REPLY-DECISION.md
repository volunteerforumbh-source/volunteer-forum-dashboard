# Reply correlation decision — 17 November 2026

**Use a button opening the specific task in the authenticated portal for the first task pilot. Do not enable automatic task updates from WhatsApp quick replies yet.** Exact reply correlation is implemented and tested with simulated receipts, but the native Sanad inbound parent-message contract is unverified. This is a release decision, not a claim that the provider can never expose it.

## Official contracts and account inspection

| Surface | What is established | What it does not establish |
| --- | --- | --- |
| [Get message](https://marketplace.gohighlevel.com/docs/ghl/conversations/get-message/) | Read by CRM ID; returns message ID, alternate ID, contact, conversation, location and direction. Requires `conversations/message.readonly`. | An alternate ID identifies that same message; it is not its parent. No guaranteed WhatsApp parent field is documented in the inspected read schema. |
| [Conversation messages](https://marketplace.gohighlevel.com/docs/ghl/conversations/get-messages/) | Read messages from a conversation, including WhatsApp filtering. | `lastMessageId` is pagination, not an original-message reference. History order cannot select a task. |
| [InboundMessage webhook](https://marketplace.gohighlevel.com/docs/webhook/InboundMessage/index.html) | Incoming message, contact, conversation and location identifiers are documented. | The inspected schema does not guarantee the WhatsApp original-message context. Incoming `messageId` alone cannot identify a task. |
| [Send message](https://marketplace.gohighlevel.com/docs/ghl/conversations/send-a-new-message/) | The send request has `replyMessageId`. | A field supplied while sending does not prove that native incoming WhatsApp replies expose it. No POST/send request was executed. |
| [Workflow integration](https://help.gohighlevel.com/support/solutions/articles/155000001624-whatsapp-workflow-integration) | Customer Replied can be restricted to WhatsApp. | Channel filtering and waiting for a reply do not establish exact parent/task correlation. |

These are official HighLevel platform contracts. Sanad's account UI labels its existing private integration API v2.0; the currently inspected public Conversations reference is v3. A Sanad-specific response/version must be verified before installing any mapping. Do not silently assume equivalence or invent a `context.id` mapping from an unobserved payload.

In the actual Sanad account, the existing private integration already includes conversation/message read scopes. Its token is masked; it was neither rotated nor retrieved, and no scope was changed. The wizard was cancelled. No authenticated Conversations API response or native inbound WhatsApp payload was captured in this examination. Existing read access is therefore present, but successful extraction of `originalMessageId` remains **unverified**. A suitably authorized server-side read using the existing credential, or a provider-confirmed sanitized payload, is the next evidence needed; new permissions are not assumed necessary.

The existing reply Workflow's inspected variable picker exposed body, subject and attachments, without an original ID. Both existing Workflows remain Draft with no live send/task-write action installed. No additional Workflow is needed for this decision.

## Requirements for reconsidering quick replies

The authenticated provider adapter must independently establish the inbound reply ID and original outbound ID, with location/contact/conversation. Bind the outbound receipt's CRM/provider aliases to the immutable event/member/task/revision before accepting replies. Verify the recipient association server-side. Preserve the existing exact-match, assignment, current-role, revision, deduplication and review-only rejection checks. Unknown text or an absent/ambiguous parent goes to review; never use the last task, conversation history, a timestamp or shared mutable Contact fields to infer context.

The checked-in engine previews `تمت المهمة` as `review`, not final completion. Progress and help are also proposals only. No public caller may supply its own trusted-provider assertion. A signed webhook verifier and live callback are not installed.

## Portal button fallback prepared in this draft

Use one button labelled **عرض المهمة وتحديثها** with the existing canonical URL suffix:

`?section=media-committee&view=tasks&task=<taskId>`

The suffix is captured from the authoritative source event, not a mutable Contact field. It contains no phone number, member ID, token, status mutation or access grant. Opening it passes through the existing Google login and active-membership gate. The existing task query reads tasks assigned to the authenticated UID. The draft now selects only the exact linked task from those authorized results; a missing, forwarded, reassigned, invalid or duplicated task parameter displays a generic unavailable message instead of another task. This client selection supplements existing Firebase rules; it does not replace authorization.

URL parameters cannot submit a state change. The member explicitly saves the existing task form, which retains current membership/assignment checks and audited transactions. The existing member form supports progress and submission for reviewer approval. It currently supports help as a written note; a dedicated persisted help flag/responsible-person alert is not wired. Do not advertise that alert as operational. No new identity system or public update endpoint is added.

The actual template button has not been edited or resubmitted in this pass. If the approved template has only quick-reply buttons, revise the existing template to a task URL button and obtain Active status before using this fallback; do not create a duplicate template merely for the pilot.

## Firebase and pilot gates

Previous central-register and Firestore membership/audit read checks are preserved. This follow-up read seven Authentication users and identified a training-labelled candidate with an existing active member-role document. Its membership `auditId` is empty. The portal Google chooser lists only the two previously signed-in accounts; the training candidate has no available signed-in session there. No credentials were requested or permissions changed. Administrative Console reads do not validate a member's Firebase ID token or client security rules. The authenticated integration test remains unverified until that existing test login and designated audited test source are available. No memberships, claims or permissions are created or changed.

For the first controlled `forum_membership_activated_ar` pilot: verify an existing authorized test session/source/audit; confirm template Active; validate the immutable contact/recipient mapping and request-scoped variables; finish an end-to-end dry run and ledger retry check. Its portal button does not need task quick-reply correlation. Only after explicit authorization for a real test recipient and for deploying/activating the tested path may one controlled message be sent. Neither authorization is inferred from these dry-run tests.

Task pilots additionally require testing the exact URL through login and existing Firebase rules using the eligible account, and confirming the template's URL button. The branch remains unmerged and undeployed. No live message has been sent.
