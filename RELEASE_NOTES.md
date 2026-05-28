# Release Notes

## Unreleased - Comfort-Aware Travel Planning

This release expands Cycle Compass / Kalendarzyk from a simple cycle calendar into a private travel-planning map for cycle-aware comfort.

### Brand And Interface

- Introduced the `Cycle Compass` English name while keeping `Kalendarzyk` for Polish users.
- Redesigned the logo as a compass disc with a blood-drop needle pointing north, reinforcing the "Cycle Compass" identity. The same visual is used as the app icon/favicons.
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

### Privacy And Safety

- All cycle data, trips, preferences, holiday country settings, and UI choices remain in the current browser via `localStorage`.
- The intro copy now explicitly states that data is not sent to third parties and is not processed by AI/LLM models.
- Safety copy remains visible: cycle, ovulation, and fertility dates are estimates and are not contraception or medical advice.

### Developer Notes

- Storage was migrated to support period history, past months, holiday country settings, and the holiday layer.
- Added domain and component coverage for period-history migration, holiday generation, trip readiness, marker visibility, exports, and forecast chips.
- Added `driver.js` as a dependency for the onboarding tour (~5 KB, zero transitive dependencies).
- Onboarding logic is isolated in `src/lib/onboarding.ts` with a structural `OnboardingCopy` interface to keep PL/EN i18n type-safe.
- The app remains deployable on Vercel without environment variables, secrets, backend services, or live holiday APIs.
