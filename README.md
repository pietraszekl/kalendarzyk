# Cycle Compass / Kompas Cyklu

Considered travel planning that knows your rhythm.

Cycle Compass is a browser-only travel planner that, if you choose, overlays estimated period, ovulation, fertile-window, public-holiday and personal trip dates onto a single calendar. All personal data lives only in the current browser via `localStorage`; the app has no accounts, no backend, no analytics, no cookies, no third-party data sharing, and no AI/LLM processing of user data.

## Product

- `Cycle Compass` is the English product name.
- `Kompas Cyklu` is the Polish product name.
- The logo is a compass disc with a blood-drop needle pointing north. The same visual is used for the app icon and favicons.
- Every screen carries a persistent `● Local only` / `● Lokalnie` trust badge in the topbar so the privacy promise is a visible signal, not just legal copy.
- The UI is available in Polish and English, with the language choice saved locally.

## Features

- First-time users are guided through an interactive onboarding tour (spotlight overlay with step-by-step popovers) that walks through cycle settings, period entry, and trip planning.
- Each trip card is organised as four stacked sections — header (trip name + date with inline overlap icons), vibe (small "Suggested activity" eyebrow above a prominent vibe headline), gradient energy strip with weekday/day labels, and a quiet confidence footer with a 3-step signal bar. Sentence case, sage-tinted background, fully-rounded gradient pill.
- Calendar day cells that overlap a trip show a small battery icon whose fill (`Battery` / `BatteryLow` / `BatteryMedium` / `BatteryFull` / `BatteryCharging`) and colour both reflect the day's energy level.
- Past trips show only their identity (name, dates, overlap icons) — forecast metadata is hidden once a trip has ended.
- Returning users can replay the onboarding tour from the Cycle tab.
- A Summary-tab teaser previews the comfort-plan feature with a sample energy gradient and a "Plan a trip" CTA when the user has cycle data but no trips yet.
- Toggle Gentle mode (on by default) to dim suggested intensity during the luteal phase and the first menstrual days and to add rest-oriented hints.
- Add actual period starts from up to 3 months back and keep a local period history.
- Forecast future period, ovulation, and fertile-window dates from saved history or fallback cycle settings.
- Show a calendar window with configurable past months `0 / 1 / 2 / 3` and future range `2 / 4 / 8 / 12` months.
- Add, edit, and delete trips, including trips that work before any cycle data is entered.
- See trip readiness context: cycle overlaps, public holidays during the trip, forecast confidence, and practical preparation prompts.
- Display cycle phases, trips, and holidays as accessible calendar bars with icons, colors, labels, and mobile day details.
- Toggle visible markers for period, fertile window, ovulation, trips, and holidays.
- Select country-level public/bank holidays offline via `date-holidays`; regional holiday differences are noted in the UI.
- Export the visible calendar to PNG or `.ics` while respecting the selected date range and enabled layers.
- Reset cycle data while keeping trips, or remove all local app data.

## Safety And Privacy

Cycle predictions are estimates. They are intended for orientation and travel preparation only, not contraception, diagnosis, or medical advice.

All cycle entries, trips, preferences, and holiday settings stay in `localStorage` in the current browser. Exported PNG and `.ics` files may contain private information, so users control where those files are saved or shared. Exports use a neutral `calendar-{date}` filename so the Downloads folder does not advertise the app.

Defence-in-depth headers shipped with the app:
- A strict Content-Security-Policy (`default-src 'self'`, no third-party scripts, fetches, fonts, frames or form posts)
- `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
- A `Permissions-Policy` that disables every browser feature the app does not use (geolocation, camera, microphone, USB, FLoC/Topics, and more)
- `Strict-Transport-Security` with preload

ICS exports escape every text field per RFC 5545 and use a neutral PRODID/UID domain so the file does not brand itself to whoever imports it.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Vitest and Testing Library
- `html-to-image` for PNG export
- `date-holidays` for offline country-level public/bank holidays
- `lucide-react` for interface icons
- `driver.js` for the first-visit onboarding tour

## Getting Started

Requires Node.js `>=20.9.0` and npm `>=8.3.0`.

```bash
npm install
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm run lint
npm run test
npm run build
```

## Deployment

This is a standard static-friendly Next.js App Router app. It is ready for Vercel and does not require environment variables, secrets, a database, or external APIs.

## Release Notes

See [RELEASE_NOTES.md](RELEASE_NOTES.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

Copyright 2026 [Digital Habitat](https://digitalhabitat.it/)
