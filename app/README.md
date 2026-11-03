# TASA app (iPhone + Android)

The real TASA app, built with Expo / React Native. Same look and rules as the demo at tasaplan.ee/demo.

## What works in version 0.1

- First launch: the parent enters the child's name and class, sets a 4-digit PIN, and can start with sample homework.
- **Täna**: only today. A "Tee seda nüüd" card, ~25-minute steps, a focus timer, a celebration on every tick and a big one when the day is done.
- Yesterday and tomorrow can be peeked at with the arrows. Unfinished steps move to the next day, first in line.
- **Nädal**: the next 7 days, for a look ahead.
- **Lapsevanem** (PIN): add homework, big projects, tests (prep starts up to 7 days before), books (exact pages per day), retakes (tap the wrong problem numbers, spread over 2–3 days), and fixed required times. Excuse a step when the child is ill. Set the one reward and mark it paid. Weekly stats. Delete all data.
- Everything is stored only on the phone. No account, no server, no cost.

Not yet: eKool / Stuudium import (needs school permission), reading wrong problems from a test photo, reminders, parent and child on separate phones.

## Try it

You need Node.js 20+ on a computer and the free **Expo Go** app on the phone (same Wi-Fi).

```bash
cd app
npm install
npx expo start
```

Scan the QR code: on iPhone with the Camera app, on Android inside Expo Go.

## Install as a real app (later)

`eas.json` is ready. With a free Expo account:

- Android test build (APK, installs without Google Play): `npx eas-cli build -p android --profile preview`
- Store builds need the developer accounts: Apple 99 USD a year, Google Play 25 USD once.

## Checks

```bash
npm run typecheck
npm test
```
