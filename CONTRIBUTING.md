# Contributing to Kalendarzyk

Thank you for considering a contribution! This guide will help you get started.

## Development setup

```bash
node --version   # must be >=20.9.0
npm install
npm run dev      # http://localhost:3000
```

## Before submitting a pull request

1. Run the full check suite:

```bash
npm run lint
npm run test
npm run build
```

2. Keep all 27+ tests passing. If you change behaviour, update or add tests.
3. The app is bilingual (Polish and English). UI copy lives in `src/lib/i18n.ts` — update both languages when adding or changing strings.
4. Cycle logic is in `src/lib/cycle.ts` with unit tests in `src/lib/cycle.test.ts`. Keep logic and UI separated.

## Code style

- TypeScript strict mode, no `any`.
- CSS lives in `src/app/globals.css` (no CSS modules or utility classes beyond Tailwind base).
- One main component in `src/components/cycle-planner.tsx` with small helpers extracted as inner functions.

## Privacy first

Kalendarzyk stores all data in `localStorage`. Never add network calls, analytics, tracking pixels, or third-party scripts. If a feature requires a server, it does not belong in this project.

## Reporting issues

Open a GitHub issue with:
- steps to reproduce,
- expected vs. actual behaviour,
- browser and OS version.

## License

By contributing you agree that your changes will be licensed under the [GPL-3.0](LICENSE).
