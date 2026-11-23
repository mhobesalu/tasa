# TASA app changelog

What changed in each version of the TASA app. The same list (in Estonian, for parents) is shown in the app under
Lapsevanem → „Mis on uut“ and comes from `src/changelog.ts`.

Rules for whoever changes the app (people and coding agents):

- Every change that reaches a build gets a line in `src/changelog.ts` and here, in the newest version.
- When a build goes to TestFlight / Google Play with new changes, raise `version` in `app.json` and start a new entry with the same number (a test checks they match).
- Write for parents, in plain words. Describe security and privacy fixes only in general terms ("Turva- ja privaatsusparandused"), never how a weakness worked.

## 0.2.1 (November 2026)

- Adding from the e-diary now suggests a screenshot first, and the "Ekraanipildilt" button comes first.
- The privacy notes in the parent view say more exactly how tasks get into TASA.

## 0.3.0 (November 2026)

- New: backup file. The parent can save all TASA data to one file and restore it on a new phone ("Andmed ja privaatsus"). The PIN and the student's mood answers are not put in the file.
- Android no longer copies TASA data to the automatic Google backup: the data is only on the phone and in the backup file, if the parent saves one. (iPhone: the phone's own iCloud backup may still include it.)

## 0.2.0 (November 2026)

- Student name takes a full name (first and last name).
- Text read from screenshots no longer breaks sentences at the screen's line ends.
- A message or lesson text with "Kodutöö tähtajaga …" is added as homework with that deadline (not automatically for tomorrow).
- After adding a task from a message, its deadline and links can be changed right away.
- Several links can be added to a task at once: paste a text and every address in it is taken.
- Short addresses in pasted text (e.g. opiq.ee/kit/12) also become tappable links.
- New: "Mis on uut" in the parent view, and a note on what happens to the data if the app is deleted.

## 0.1.0 (3–19 November 2026)

- First test version: only today, one step at a time, ~25-minute steps, celebrations.
- Adding homework from the e-diary by copying or from a screenshot (read on the phone).
- Test revision, retakes, reading tasks page by page, timetable from a screenshot.
- Parent view behind a PIN, reward without money, daily reminder.
- Dark mode, student's end-of-day mood check, lighter day after a heavy one.
- Tasks can be changed after adding, links on tasks, students 13+ can add their own homework.
- Security and privacy fixes: the app asks the phone for fewer permissions.
