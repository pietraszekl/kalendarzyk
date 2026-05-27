# Kalendarzyk

Private cycle forecast and trip planner. All data stays in your browser.

Bilingual travel calendar with end forecast decision - data remains local in the recipe.

## Features

- Forecast 2,4,8or 12 months ahead based on your last period and typical cycle length
- Add, edit and remove trips — works with or without cycle data
- Visual overlay of trips on the cycle forecast with overlap indicators
- Period, fertile window and ovulation markers — each layer can be toggled
- Polish and English interface
- Export the calendar view to PNG or .ics (iCalendar)
- No accounts, no backend, no tracking — `localStorage` only

## Getting started

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

Standard Next.js App Router application, deployable on Vercel or any Node.js host with no environment variables or external services required.

## Privacy

Kalendarzyk does not send data anywhere. Cycle settings, trips and preferences are stored exclusively in `localStorage`. There are no analytics, cookies or third-party scripts.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

Copyright 2026 [Digital Habitat](https://digitalhabitat.it/)
