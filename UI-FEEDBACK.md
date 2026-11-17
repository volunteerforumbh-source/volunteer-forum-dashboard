# Mohammed Nooh interface feedback

Independent branch: `ui/mohammed-nooh-feedback`, based on main commit `6f6a051`.

## Changes

- Keep the existing `portal-logout` control and handler; place it in the physical top-left header column, with a flexible brand column to its right. Move the two existing workspace shortcuts to their own row. Mobile brand sizing and 44px minimum touch targets prevent overlap.
- Put the renamed portal guide first inside the existing section tree. All six top-level disclosure controls share one vertical column, dimensions, alignment, spacing and borders. Existing disclosure behavior and the initially open meetings branch remain intact.
- Move the existing home updates container after the sections, keeping search above sections. Preserve its ID, data, links and chronological selection.
- Render each update title and date as separate right-aligned blocks; explicitly use Gregorian Arabic month names and Latin digits, for example `13 نوفمبر 2026`. The machine-readable ISO date remains unchanged. This formatting applies to existing update feeds too.
- Apply the requested six display names. The news group was already called `المستجدات والأخبار`; keep it. Update related meetings navigation labels, while preserving historical/report prose.

No section IDs, navigation URLs, control IDs, membership logic, Firebase configuration/rules, central workbook, WhatsApp integration, workflows, or PR 4 files are changed. No live deployment or messaging operation is part of this branch.

## Verification

Export the baseline from the main commit used for this branch, then run:

```powershell
git show 6f6a051:index.html | Set-Content baseline-index.html -Encoding utf8
node tests/ui-feedback.test.cjs baseline-index.html
```

Keep the temporary baseline file out of commits. All five comparative checks pass: IDs/routes, authentication and access logic, update/search data and ordering, exact date formatting, and classic script syntax. The inline module script also parsed successfully with Node's `SourceTextModule` without executing it. Main had no general UI test suite or package manifest; existing manually dispatched sending workflows were not run.

Browser checks used a **local-only synthetic Firebase SDK fixture**, not production Firebase sessions. The fixture and screenshots are outside the repository and are never deployed. It supplies a synthetic active member, blocks every write, and exercises the unchanged actual login/logout handler. Real Firebase authentication and server rules were not retested or altered by this visual change.

Observed browser results:

- Six disclosure controls open and close successfully; all 19 section links navigate to the expected visible section. These are navigation checks, not tests of private workflows inside each section.
- Search returns the existing results; Escape clears them. Opening an update preserves its description and related link.
- Logout locks the gate and hides the main content/search/logout control; synthetic sign-in restores access.
- At viewport widths 320, 375, 390, 430, 768 and 1440px: the home page has no horizontal overflow, logout sits left of the brand without overlap, all six top-level controls have equal width/height and minimum 44px targets, and order is search → sections → updates.
- At all six widths, update dates occupy a separate block below titles and share their right edge. Desktop and mobile screenshots were saved; disclosure branches were collapsed in comparison screenshots to show the overall layout. The default meetings-open behavior remains unchanged.

The desktop/mobile preview is evidence of the candidate branch only. Merge and live publication remain pending review.
