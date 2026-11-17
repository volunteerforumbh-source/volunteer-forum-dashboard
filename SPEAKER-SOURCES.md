# Speaker profiles: source matching and verification

The seven profiles use the supplied forum speaker folders. Each survey was read from its native Google Doc dated **6 November 2026**, not from a Windows `.lnk` file. Only aggregate counts are published; administrative Forms links, identifiable comments and private correspondence are excluded.

| Speaker / URL anchor | Survey responses | Report source used |
| --- | ---: | --- |
| أحمد يوسف طاهر / `speaker-ahmad-yusuf-taher` | 55 | `3المتحدث المهندس أحمد يوسف طاهر.docx` |
| أحمد العلوي / `speaker-ahmad-alalawi` | 56 | `1المتحدث السيد أحمد العلوي.docx` |
| بدر الغريفي / `speaker-badr-alghuraifi` | 41 | `ملخص تنفيذي.docx`; original `تحديات الاستدامة في العمل الخيري` supplied separately |
| صفية محمد القارئ / `speaker-safiya-alqari` | 72 | `2المتحدثة الأستاذة صفية محمد القارئ.docx` |
| عباس صالح الخاطر / `speaker-abbas-alkhater` | 49 | `4المتحدث عباس صالح الخاطر.docx` |
| عقيل خلف / `speaker-aqeel-khalaf` | 30 | `7المتحدث سيد عقيل خلف.docx` |
| محمد إبراهيم آل طوق / `speaker-mohammed-altooq` | 39 | `5المتحدث محمد إبراهيم آل طوق.docx` |

## Biography and media provenance

- Portraits were matched from each speaker's dedicated photo folder and inspected together. Badr's supplied image is his illustrated identification card; no separate portrait was supplied. It is displayed intact and labelled accordingly.
- Qualifications for Taher, Alalawi, Alghuraifi, Alqari and Alkhater are stated **according to their supplied forum identification cards**, inspected visually. Certificate scans and independent detailed CVs were not supplied; the profiles state that limitation. No degree is invented for Khalaf or Altooq.
- Khalaf's supplied identification card names him as chairman of the Manama Charity Association. A PDF named `ورقة المتحدث احمد خلف.pdf` contained an email wrapper; the matched report was used instead, and the wrapper and email addresses were not published.
- Altooq's existing biography and original anchor IDs are preserved. The legacy duplicate list of speaker links is consolidated into the seven complete profiles.
- Alkhater's original report cover says 30 October, while the forum took place on 31 October 2026. The original PDF is retained and the visible report note explains the discrepancy.
- The local, one-minute **نبض جمعية توبلي** video belongs to Alqari's project material. It is labelled as a project video, not a recording of her complete paper. No complete presentation recording was supplied for the other profiles.

## Data and rendering

`speaker-profiles.json` contains only public biography/report text and aggregate survey results. Each question retains its own answer count and the source's percentage denominator. The 35 quantitative questions are shown as horizontal coloured bars; seven free-text questions show counts only. Responses are explicitly distinguished from unique people. Research samples discussed within papers are distinct from the post-presentation audience surveys.

`tools/build-speakers.mjs` generates the static, escaped HTML between the speaker markers in `index.html`. Rebuild with `node tools/build-speakers.mjs`. The accordion enhancement only handles speaker navigation; it has no authentication, tracking, messaging or server write path. News remains public. Native `details` names and a scoped sibling fallback keep one speaker, panel and report axis open at each level without closing ancestors. Clicking a heading updates its URL fragment; existing Altooq links remain valid.

## Checks performed

- `node tests/speaker-profiles.test.cjs`: six checks pass, covering seven independent datasets/assets, all 35 quantitative totals and percentages, unique/preserved anchors, genuine PDF downloads, local video ownership and exclusion of private/prohibited links.
- All report PDFs parsed successfully and their first pages were rendered and inspected. The seven download URLs returned HTTP 200 with PDF content, and the actual Alalawi download button produced the expected PDF in the browser.
- All seven profiles, their panels and report sibling behavior were exercised in the browser. All 35 report-axis deep links opened the correct profile and ancestors with one axis open.
- At 320, 375, 430 and 1440px, all seven survey/report views had no horizontal overflow; portraits loaded and report text kept a fixed gutter rather than recursive indentation.
- The local video played in-browser with a duration of 60.03 seconds, 1024×576 dimensions and no playback error; it was paused after verification.
- Existing Firebase/portal authentication logic, memberships, central Sheets, Sanad integrations and sending workflows are outside this change. No real WhatsApp message is sent by these checks.

Missing source material remains visible in the relevant profiles: independent CV/certificate scans, separate Badr portrait/coverage report, and full presentation recordings. These gaps do not substitute another speaker's content.
