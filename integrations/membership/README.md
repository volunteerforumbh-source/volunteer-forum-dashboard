# Membership activation WhatsApp — private transport preparation

## Verified on 18 November 2026

Based on `ae36ea49c937fa360518ebdb033d8248c6d8b534` from the existing repository.
The Sanad account `JWpqvSmfgfac35fabPLX` shows `forum_membership_activated_ar`
as **Active**, Arabic, Utility. Its body has one variable, mapped to `contact.name`,
and the “فتح البوابة” button displays the existing GitHub Pages portal URL.
The URL-type selector failed to resolve in the UI; its static/dynamic setting is
not yet independently established. No template was changed.

The existing Apps Script only has the old pilot dispatch settings and Firebase
identity lookup; no membership Sanad transport credential is configured.
`WF_FORUM_NOTIFICATIONS` remains a draft. This integration does not publish it
or use contact updates/tags to trigger a workflow.

**No live send has been performed by this change. The HTTP adapter contract is
not certified by the local tests. Keep both sending gates closed until verified.**

## Durable design

`membership-activation.mjs` runs the existing acceptance/member/audit writes in a
single Firestore transaction, re-reading the actor's active manager membership.
It rejects self acceptance and a repeated accepted state creates no new audits.
Existing member roles, teams and sections are preserved. New members receive only
`role=member` and `portalSections=['volunteer-space']`.

The immutable paired audit records are the durable event source. No browser
callback or stored Firebase ID token is needed for recovery. The GitHub worker
scans the authoritative source through the private Apps Script service, validates
the audit pair and fresh manager/recipient membership, and uses one permanent
key per UID (`membership-activated-v1:UID`) in the private existing ledger.
This intentionally sends at most one activation message per member lifetime.

The service never writes applications, members, contacts, tags, or workflows.
It reserves/flushed `processing` **before** the outbound API call. A timeout,
process interruption, HTTP error or success response without a message ID becomes
`unknown` and is never automatically retried. Only pre-send validation failures
are retryable. Membership remains accepted/active after any notification failure.

Old paired acceptances before `MEMBERSHIP_START_AT` are held for human reconciliation.
Source records without sufficient evidence are blocked. This is not a completed
audit of historical sends; provider logs must still be checked per member.

## Installation in the existing service

1. Back up both current `.gs` files and current published deployment version.
2. Add `MembershipWhatsApp.gs` containing `core.js` followed by `MembershipWhatsApp.gs`.
3. At the start of the existing `doPost(event)`, before the current notification
   router and old pilot code, add:
   ```js
   if (membershipWhatsAppOwns_(event)) return membershipWhatsAppHandle_(event);
   ```
   Do not replace the existing ForumNotifications code or the old pilot handler.
4. Run `testMembershipPolicyClosed`. It performs three synthetic policy checks,
   reads the closed enable flag, and sends nothing.
5. With the owner's separate Google approval, retain existing OAuth scopes and add
   `https://www.googleapis.com/auth/datastore` to the existing manifest. The owner
   must already have Firestore IAM read access. Do not change IAM or Firestore Rules.
   Run `testMembershipBackgroundRead` as `volunteerforumbh@gmail.com`; it logs
   aggregate counts only and performs no write/send.
6. Update only the existing notification-service deployment, preserving its URL.
   Do not change registration, receipt email service, unrelated Apps Script projects,
   Meta templates, news/media distribution workflows or their schedules.

## Credentials (never put their values in this repository or chat)

In existing service **Project Settings → Script Properties**:

| Property | Purpose |
|---|---|
| `MEMBERSHIP_SEND_ENABLED` | Must remain `false` until actual transport test and operational readiness are verified. |
| `MEMBERSHIP_TEMPLATE_CONTRACT_VERIFIED` | Must remain `false` until template ID, variable substitution and button type are proven. |
| `MEMBERSHIP_WORKER_TOKEN` | New random secret, at least 32 characters; same value in GitHub Actions secret. |
| `MEMBERSHIP_SANAD_TOKEN` | Authorized sub-account private integration token, limited to required contact/message read and message-send scopes. |
| `MEMBERSHIP_TEMPLATE_ID` | Provider's actual usable template ID; template name alone is not sufficient. |
| `MEMBERSHIP_START_AT` | Immutable UTC launch cutoff, set once after historical audit. Do not backdate it to send old records. |

In existing repository **Settings → Secrets and variables → Actions**:
`MEMBERSHIP_SERVICE_URL` = existing service `/exec` URL;
`MEMBERSHIP_WORKER_TOKEN` = the same new secret above.
Do not copy/extract the existing pilot/news credentials or assume they apply.
Creating the credential / granting new scope needs the owner's action-time approval.

The GitHub `membership-whatsapp.yml` scheduler polls every five minutes, subject
to GitHub scheduling delays. It processes at most one recipient per tick. It logs
only a fixed state, never a response body, name, phone, UID or provider message.
Its optional manual input is an opaque diagnostic UUID, not a recipient or retry override.
GitHub may disable scheduled workflows after inactivity in a public repository;
monitor scheduling as part of operations. No Apps Script trigger is installed.

## Provider contract and remaining live tests

Official API references:
- [Send a new message](https://marketplace.gohighlevel.com/docs/ghl/conversations/send-a-new-message/)
- [Search contacts](https://marketplace.gohighlevel.com/docs/ghl/contacts/search-contacts-advanced/)
- [WhatsApp workflow action](https://help.gohighlevel.com/support/solutions/articles/155000003531/)

The adapter uses only official `POST /contacts/search` (exact phone filter) and
`POST /conversations/messages` (`type=WhatsApp`, `contactId`, `templateId`, `status=pending`).
The public send-message documentation does **not** establish a per-request override
for the WhatsApp body parameter. Thus the adapter requires the existing CRM name
to match the application name exactly and never edits the CRM to make it match.
Its `templateId` behavior must be verified with the provider before opening the gate.

The separately authorized single Jaafar test requires a **clear test name**.
Do not substitute the existing contact name, modify Jaafar's contact/member profile,
or reuse the fixed-recipient old pilot. First establish a documented request-scoped
template variable mechanism (or isolated sanctioned workflow action mapping).
Then run exactly one GitHub-driven test to the authorized number, record its
provider message ID, inspect recipient/name/button/status in Sanad, and check rerun
deduplication. Capture evidence in the private ledger, not public Actions logs.

Unknown results require provider-log reconciliation. No override from `unknown`
to `pending` exists. A provider message ID must be tied to the exact outbound
recipient, content, template and attempt time before recording delivery/read.
If the provider cannot prove whether it accepted a request, keep it unknown.

## Tests and rollout

`node --test tests/membership-whatsapp.test.cjs tests/speaker-profiles.test.cjs`
(restricted Windows: add `--test-isolation=none`). All network/storage in these
tests is synthetic. They test the actual client transaction and server adapters,
durability from paired audits, authority, consent, historical holds, preflight
failure, timeout/unknown, and repeated recovery. They do not prove delivery.

Before merging: complete the Google background-read authorization, verify the
provider contract, perform the authorized single live test, inspect historical
accepted applications/provider logs, and test the authenticated UI on mobile.
Keep this branch unmerged until those prerequisites are satisfied. Rollback:
leave the sending flag false and retain the current main and current published
service version. Restoring code must never erase the private deduplication ledger.
