# Release Notes

## Unreleased - Comfort-Aware Travel Planning

This release expands Cycle Compass / Kalendarzyk from a simple cycle calendar into a private travel-planning map for cycle-aware comfort.

### Brand And Interface

- Unified the brand to `Kompas Cyklu` in Polish and `Cycle Compass` in English. The diminutive "Kalendarzyk" working name has been retired from the user surface; storage keys and source identifiers stay as-is so existing users keep their data.
- Re-positioned around the travel-first USP. The hero tagline is now `Considered travel planning` / `Świadome planowanie podróży`, the H1 sits in the topbar with the brand name + tagline, and the Summary intro headline became `Your season, on your terms` / `Twój sezon, na Twoich warunkach`.
- Switched the privacy framing from defensive (`never sent to third parties or processed by AI/LLM`) to confident (`No accounts, no cloud — just you and this browser`).
- Added a Summary-tab landing narrative: a "How it works" eyebrow above a three-pillar trio (Knows your cycle / Plans your trips / Stays on this device) so returning users and tour-skippers still see the value statement in one glance. Restrained editorial typography, no card decoration.
- Rewrote the site footer with an italic-serif manifesto line above a meta row, replaced the buried "Open source on GitHub" link with a visible `● Open source` badge next to the Digital Habitat credit so the open-source nature is a glanceable trust signal instead of nerd-only text.
- Added subtle motion polish (all under 220 ms, ease-out): trip cards lift 1 px on hover with a soft sage shadow, modals fade-and-scale in, the mobile drawer rises 12 px on open. Everything is suppressed for users with `prefers-reduced-motion: reduce`.
- Wove the compass metaphor into brand moments without medicalising functional copy: the tagline became `Navigate your year` / `Twój kompas miesięcy`, the onboarding welcome step now starts with `A few quick steps to set your bearing` / `Kilka kroków, żeby wyznaczyć kierunek`, and the final tour step closes with `Bearing set. The map is yours.` / `Kurs wyznaczony. Mapa jest Twoja.`. UI labels stay clean.
- Added a Summary-tab teaser card that previews the comfort-plan feature with a small sample energy gradient + a "Plan a trip" / "Zaplanuj wyjazd" CTA. It is shown only when the user has cycle data but has not added a trip yet, so the killer feature stops being buried two clicks deep.
- Added a persistent green-dot trust badge (`● Local only` / `● Lokalnie`) next to the language picker, visible on every screen.
- Refined empty states across the app — `Your trips will appear here` / `Tu pojawią się Twoje wyjazdy`, `Add a period to start your forecast` / `Dodaj swoją pierwszą miesiączkę, żeby zacząć prognozę`.
- Onboarding welcome and "Done" steps were rewritten in a calmer, more confident voice; the welcome step in Polish now uses the new brand name (`Witaj w Kompasie Cyklu`).
- Separated the brand-accent colour (deep sage-teal) from the fertile-layer green (clearly fresher, with a hint of yellow) so the two are no longer visually conflated.
- Added a subtle italic-serif `Cycle Compass` mark to PNG exports — invisible in the live UI, visible only in the exported file so shared screenshots carry quiet attribution.
- Redesigned the logo as a compass disc with a blood-drop needle pointing north, reinforcing the brand identity. The same visual is used as the app icon/favicons.
- Moved supporting controls and explanatory content into a tabbed sidebar/drawer: `Summary`, `Trips`, and `Cycle`.
- Kept the calendar as the primary view, with compact forecast chips in the calendar header for next period, estimated ovulation, and fertile window.
- Updated selected marker controls and forecast chips to use tonal text colors that match their soft backgrounds.

### Onboarding

- Added an interactive product tour for first-time users, powered by `driver.js`.
- The tour starts automatically on the first visit (no existing cycle data) and walks the user through 8 steps: welcome, data panel, Cycle tab, cycle-length and bleeding-length inputs, first day of period, Trips tab, and a completion screen.
- On mobile the tour auto-opens the drawer before highlighting tabs and form fields; on desktop it switches sidebar tabs automatically.
- The spotlight overlay dims the rest of the screen and highlights the active element. Users can click highlighted elements or use Next/Back/Skip buttons.
- Completing or skipping the tour saves a flag so it never shows again. The flag is cleared when all app data is reset.
- All tour strings are available in Polish and English.

### Summary Tab UX

- When no cycle data has been entered, the Summary tab now shows a prominent prompt at the top directing the user to add cycle details, with a direct link to the Cycle tab.

### Comfort-Aware Trip Planning

- Added a collapsible `Comfort plan` to each trip card when cycle data is available. The plan shows the trip's dominant character (rest, discovery, social, cozy), per-day energy on a 5-dot scale, grouped activity suggestions for consecutive days, and an accommodation needs checklist.
- Added `Gentle mode` (on by default, can be turned off in the Cycle tab) that dims suggested intensity during the luteal phase and the first menstrual days and adds rest-oriented hints such as a buffer day and a quiet, dark room.
- Comfort suggestions are presented as heuristics with a visible disclaimer that they are not medical advice.
- Replaced the calendar day-cell comfort dots with a single battery icon (lucide `Battery` / `BatteryLow` / `BatteryMedium` / `BatteryFull`) whose fill variant and stroke colour both reflect the energy level — very low / low / medium → empty/low/medium battery in red/terracotta/mustard; high → full battery in sage; peak → full battery in accent teal. On the "today" cell the battery stays white for legibility.
- In the sidebar Comfort plan, the day-by-day energy is now a single flat gradient strip with weekday letters and day numbers under each segment, replacing the earlier varying-height bar chart.
- Reworked the trip card layout into four stacked sections — header (trip name + date row with inline overlap icons), vibe ("Suggested activity" eyebrow above a prominent vibe headline), the gradient energy strip with day labels (visual hero), and a quiet confidence footer ("Confidence" + signal bars on one line). No grid mismatch, no nested boxes, no dividers.
- The edit/delete actions in the trip card are now absolutely positioned in the top-right corner, so the gradient energy strip and every other section inside the card take the full available width.
- Bumped typography for readability: trip name 1.05rem, vibe value 1.05rem, eyebrow labels (Suggested activity / Confidence) and date 0.82–0.85rem, day numbers 0.82rem, weekday letters 0.7rem. Eyebrow labels were later bumped to 0.875rem to meet WCAG body-text minimum.
- Trips that extend past the active forecast range are now rendered honestly. The gradient strip carries the trip's full length, days inside the horizon keep their energy colour, and the tail outside the horizon shows as the neutral sage tint with the day-number labels faded. A quiet italic note under the strip points the user to the Summary tab to extend the range. Trips that fall entirely outside the horizon hide the vibe / strip / confidence sections instead of showing misleading data.
- Past trips no longer show forward-looking metadata. The vibe (Suggested activity), the energy gradient strip, and the confidence footer are hidden for trips whose end date has already passed, so the card shows only the trip identity (name, dates and any saved overlap icons).
- Recoloured the forecast-confidence signal bars onto a neutral grayscale ramp (low / medium = darker sage tints, high = accent) so they are visually distinct from the warm energy palette and "low confidence" no longer looks like a red alarm.
- Replaced the calendar-strip weekday narrow letters with curated 2-letter abbreviations (Pn / Wt / Śr… and Mo / Tu / We…), eliminating the ambiguous "S S M T W T F S" / "p w ś c p s n" row under the gradient.
- The energy battery in calendar day cells now uses `BatteryCharging` for the peak (L5) level, giving every level a distinct icon shape on top of its colour. Added a small drop-shadow on the battery for legibility over cycle/holiday bars and the "today" cell, and shrank the icon to 13px on viewports up to 480px.
- Atypical cycle warning ("outside 21–35 day range") now appears whenever cycle settings are set, even before the first period entry is saved.
- Added a "Replay the tour" button in the Cycle panel so returning users can re-run the onboarding without clearing localStorage.
- Onboarding: dedicated `manageTextDesktop` copy for the desktop sidebar step (no "open the panel" instruction), and the cycle-form step now scrolls the form into view before highlighting fields.
- Trip card additions: a "{count} days" subtitle inline with the "Suggested activity" eyebrow, a hint under "Outside current view" telling the user to change the Summary forecast range, and a small note under the gentle-mode toggle explaining it affects trip cards. Period entries now use the same absolute-action layout as trip cards.
- Added `ConfidenceBars` aria-label so screen readers announce "Forecast confidence: low/medium/high" instead of nothing.
- Loading shell: while the app hydrates, a centred pulsing Cycle Compass logo is shown instead of an empty white screen.
- Sentence-case throughout — eyebrows and values inside the trip card use natural casing and a 0.7–1.0 rem type scale: trip name 1.0rem bold, vibe headline 0.95rem bold accent, date 0.78rem muted, eyebrow labels 0.7rem muted, day numbers 0.76rem foreground, weekday letters 0.62rem muted.
- Refined the trip card chrome: softer sage-tinted background, hairline teal border, fully-rounded pill gradient strip, and consistent 16px section rhythm.
- Replaced the textual trip-readiness lines with a single graphic indicator: forecast confidence as a 3-step signal-strength bar (low / medium / high mapped to red / amber / accent). The textual preparation hints were removed.
- Removed the prescriptive "day-by-day ideas" section — the Comfort plan no longer instructs how to spend each day.
- All comfort copy is available in Polish and English.

### CSS Fixes

- Fixed vertical alignment of number-input labels in the Cycle tab so they stay aligned when label text wraps to two lines (common in Polish).
- Fixed text centering inside the "Add cycle details" action button.

### Cycle History And Forecasting

- Added a local period history so users can save, edit, and delete actual period starts.
- New period entries can be added up to 3 months in the past; older saved entries remain available until manually removed.
- Forecasts now use saved history when possible, falling back to typical cycle settings when history is limited.
- Added a past-month selector `0 / 1 / 2 / 3` and a future range selector `2 / 4 / 8 / 12`.

### Trips And Readiness

- Trips can be planned with or without cycle data.
- Trip items now show neutral readiness context instead of judging dates as good or bad.
- Readiness includes cycle overlaps, public-holiday overlaps, forecast confidence, and practical preparation prompts.
- Trip forms keep the improved flow where selecting the start date moves focus to the end date.

### Holidays And Days Off

- Added offline country-level public/bank holidays through `date-holidays`.
- Polish browser locale defaults to Poland; users can select another supported country.
- Holidays are available as a visible marker layer alongside period, fertile window, ovulation, and trips.
- The UI notes that country-level holiday data may not include regional differences.
- Holiday markers are included in PNG and `.ics` exports only when the holiday layer is enabled.

### Calendar And Export

- Calendar days use high cells with icon-based range bars and overflow indicators.
- Month grids use compact 5- or 6-week layouts with blank placeholders rather than adjacent-month date numbers.
- Mobile users can tap a day to see full event details, including hidden overflow events.
- PNG export captures the simplified calendar view without sidebar controls.
- `.ics` export respects the current visible range and enabled marker layers.

### Security

- Added strict response headers via `next.config.ts` — Content-Security-Policy (default-src self, no third-party scripts/connect/fonts/frames), X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy no-referrer, Permissions-Policy disabling geolocation/camera/mic/USB/FLoC/Topics and other unused browser features, plus Strict-Transport-Security with preload.
- Hardened ICS export against calendar-injection: trip names and other text fields are now escaped per RFC 5545 §3.3.11 (`\\`, `;`, `,`, newlines), long lines are folded at 75 characters per RFC 5545 §3.1, and the PRODID + UID domain were neutralised so the exported file does not brand itself to whoever imports it.
- Storage migration now caps `trips` and `periodEntries` at 1000 each and validates `holidayCountry` against an ISO 3166-1 alpha-2 regex, so a tampered or runaway `localStorage` entry cannot freeze the app on hydration or pass unexpected values to the holidays library.
- Trip name input is now bounded to 200 characters (validation + `isTrip` migration guard).
- `persistState` swallows quota / disabled-storage errors instead of crashing the React tree (relevant in Safari private mode and policy-restricted browsers).
- driver.js renders popover text via `innerHTML`; all tour copy must come from static i18n constants. Added `assertStaticTourText` that throws when raw HTML tags appear in the tour copy, plus a SECURITY comment documenting the invariant for future contributors.
- PNG and ICS exports now use the neutral filename `calendar-${date}.{png,ics}` so the Downloads folder, cloud-sync history and screenshot tools do not advertise the app.

### Privacy And Safety

- All cycle data, trips, preferences, holiday country settings, and UI choices remain in the current browser via `localStorage`.
- Removed the Gentle mode and Privacy sections from the Cycle tab sidebar. The luteal/menstrual energy dimming that the gentle toggle controlled is now always on inside `dailyEnergy`/`buildComfortPlan` (the appropriate default for travel planning), and the discreet-title + panic-clear hotkey UI was removed along with their localStorage keys and i18n strings.
- The intro copy now explicitly states that data is not sent to third parties and is not processed by AI/LLM models.
- Safety copy remains visible: cycle, ovulation, and fertility dates are estimates and are not contraception or medical advice.

### Developer Notes

- Storage was migrated to support period history, past months, holiday country settings, and the holiday layer.
- Added domain and component coverage for period-history migration, holiday generation, trip readiness, marker visibility, exports, and forecast chips.
- Added `driver.js` as a dependency for the onboarding tour (~5 KB, zero transitive dependencies).
- Onboarding logic is isolated in `src/lib/onboarding.ts` with a structural `OnboardingCopy` interface to keep PL/EN i18n type-safe.
- Comfort-aware planning lives in `src/lib/cycle-comfort.ts` as pure functions over the existing forecast output. Gentle-mode preference is stored under `kalendarzyk.gentle.v1` and cleared by the `Delete everything` action.
- Introduced a design-tokens block at the top of `src/app/globals.css`: radius scale (`--r-sm/md/lg/xl/pill`, 5 steps), type scale (`--fs-micro/xs/sm/base/md/lg/xl`, 7 steps) and 4-px modular spacing scale (`--s-1`–`--s-6`). Key surfaces (topbar, brand text, privacy badge, trip card, energy strip, comfort teaser, sidebar panels) were migrated to use the tokens; remaining surfaces will migrate incrementally.
- Promoted the energy palette to CSS tokens (`--energy-1`–`--energy-5`, `--energy-off`) and shifted level 4 from `#6fa68b` to `#7da890` so it no longer echoes the fertile-layer green. `ENERGY_HEX` in `cycle-comfort.ts` mirrors the same values for inline-gradient consumers.
- Icon system: consolidated `lucide-react` icon sizes onto a canonical ladder (10 / 14 / 18 / 24 / 56 px), removed mid-step values (12 / 13 / 15 / 19), and documented the policy at the top of the lucide import block in `cycle-planner.tsx`.
- The app remains deployable on Vercel without environment variables, secrets, backend services, or live holiday APIs.
