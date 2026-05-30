"use client";

import { toPng } from "html-to-image";
/**
 * ICON SYSTEM
 * -----------
 * Every icon here carries semantic load (no decorative-only usage).
 * Canonical sizes are 10 / 14 / 18 / 24 / 56:
 *   - 10 — inside calendar bar segments (lane height)
 *   - 14 — inline icons (overlap, legend, layer toggles, trip actions, battery)
 *   - 18 — action-panel buttons, info chip, mobile manage button, modal close
 *   - 24 — PNG export brand mark
 *   - 56 — topbar brand logo
 * Battery / BatteryLow / BatteryMedium / BatteryFull / BatteryCharging are
 * deliberate: each one renders a different fill level (L1–L5 of the energy
 * scale) so the shape carries one extra channel of meaning beyond colour.
 */
import {
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  Download,
  Droplets,
  Info,
  Leaf,
  LockKeyhole,
  Pencil,
  Plane,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AppState,
  CalendarBarEvent,
  CalendarBarSegment,
  CalendarWindow,
  CycleSettings,
  CycleLayer,
  CyclePrediction,
  Forecast,
  ForecastConfidence,
  HolidayEvent,
  HorizonMonths,
  Layer,
  Locale,
  PastMonths,
  PeriodEntry,
  Trip,
  VisibleLayers,
  addDays,
  addMonths,
  createCalendarWindow,
  defaultAppState,
  effectiveCycleLength,
  generateForecast,
  generateIcsCalendar,
  IcsEvent,
  isInRange,
  isTripVisible,
  layoutCalendarBars,
  layersForDate,
  migrateStoredState,
  pastMonthsForDate,
  parseDateKey,
  sortPeriodEntries,
  splitTrips,
  toDateKey,
  tripOverlapLayers,
  tripReadiness,
  tripsForDate,
  validateCycleSettings,
  validatePeriodEntry,
  validateTrip,
} from "@/lib/cycle";
import {
  buildComfortPlan,
  buildEnergyGradient,
  dailyEnergy,
} from "@/lib/cycle-comfort";
import { holidayCountries, holidayEventsForWindow } from "@/lib/holidays";
import { copy, dateLocale, layerName } from "@/lib/i18n";
import {
  ONBOARDING_KEY,
  hasCompletedOnboarding,
  markOnboardingComplete,
  startOnboarding,
} from "@/lib/onboarding";

const STORAGE_KEY = "kalendarzyk.settings.v4";
const LEGACY_V3_STORAGE_KEY = "kalendarzyk.settings.v3";
const LEGACY_V2_STORAGE_KEY = "kalendarzyk.settings.v2";
const LEGACY_STORAGE_KEY = "kalendarzyk.settings.v1";
const LOCALE_KEY = "kalendarzyk.locale";
const PANEL_TAB_KEY = "kalendarzyk.panelTab";
const MOBILE_QUERY = "(max-width: 820px)";

type PanelTab = "summary" | "trips" | "cycle";

interface CycleFormValues {
  cycleLengthDays: string;
  periodLengthDays: string;
}

interface PeriodFormValues {
  startDate: string;
  periodLengthDays: string;
}

interface TripFormValues {
  name: string;
  startDate: string;
  endDate: string;
}

interface CalendarDayCell {
  date: string;
  isOutsideMonth: boolean;
}

function MoonBloomLogo({ size = 56 }: { size?: number }) {
  const p = "kl";
  return (
    <svg
      aria-hidden="true"
      className="cycle-compass-logo"
      focusable="false"
      height={size}
      width={size}
      viewBox="0 0 56 56"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Compass disc — soft sage gradient */}
        <radialGradient id={`${p}-disc`} cx="38%" cy="30%" r="62%">
          <stop offset="0%" stopColor="#e1ede5" />
          <stop offset="55%" stopColor="#c4dccf" />
          <stop offset="100%" stopColor="#a4c4b5" />
        </radialGradient>

        {/* Top-left specular highlight */}
        <radialGradient id={`${p}-spec`} cx="32%" cy="26%" r="32%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* Bottom-right rim shadow */}
        <radialGradient id={`${p}-rimShadow`} cx="78%" cy="82%" r="35%">
          <stop offset="0%" stopColor="#5a8576" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#5a8576" stopOpacity="0" />
        </radialGradient>

        {/* Drop / needle gradient — wine to deep rose */}
        <linearGradient id={`${p}-drop`} x1="0.3" y1="0.1" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#d05266" />
          <stop offset="55%" stopColor="#a83048" />
          <stop offset="100%" stopColor="#732038" />
        </linearGradient>

        {/* Drop glassy highlight */}
        <radialGradient id={`${p}-shine`} cx="34%" cy="40%" r="28%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* Drop depth shading */}
        <radialGradient id={`${p}-deep`} cx="50%" cy="92%" r="38%">
          <stop offset="0%" stopColor="#4a1224" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4a1224" stopOpacity="0" />
        </radialGradient>

        {/* Compass disc shadow */}
        <filter id={`${p}-sh`} colorInterpolationFilters="sRGB" x="-18%" y="-12%" width="136%" height="134%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.4" floodColor="#3a6258" floodOpacity="0.16" />
          <feDropShadow dx="0" dy="0.5" stdDeviation="0.4" floodColor="#ffffff" floodOpacity="0.4" />
        </filter>

        {/* Drop shadow — tighter */}
        <filter id={`${p}-dropSh`} colorInterpolationFilters="sRGB" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0.8" stdDeviation="0.8" floodColor="#5a1828" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* ── Compass disc ── */}
      <g filter={`url(#${p}-sh)`}>
        <circle cx="28" cy="28" r="25" fill={`url(#${p}-disc)`} />
        <circle cx="28" cy="28" r="25" fill={`url(#${p}-rimShadow)`} />
        <circle cx="28" cy="28" r="25" fill={`url(#${p}-spec)`} />
        {/* Polished inner edge */}
        <circle cx="28" cy="28" r="24.5" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="0.6" />
        {/* Outer rim */}
        <circle cx="28" cy="28" r="25" fill="none" stroke="#7aa092" strokeWidth="0.4" opacity="0.4" />
      </g>

      {/* ── Compass face ── */}
      {/* Outer compass ring */}
      <circle cx="28" cy="28" r="20" fill="none" stroke="#5a8576" strokeWidth="0.5" opacity="0.4" />
      {/* Inner compass ring */}
      <circle cx="28" cy="28" r="14" fill="none" stroke="#5a8576" strokeWidth="0.35" opacity="0.28" />

      {/* Cardinal direction ticks — long */}
      <g stroke="#3a6e62" strokeWidth="1.3" strokeLinecap="round">
        <line x1="49" y1="28" x2="46" y2="28" opacity="0.55" />
        <line x1="28" y1="49" x2="28" y2="46" opacity="0.55" />
        <line x1="7" y1="28" x2="10" y2="28" opacity="0.55" />
      </g>

      {/* N tick (slightly emphasized) */}
      <line x1="28" y1="7" x2="28" y2="11" stroke="#3a6e62" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />

      {/* N label */}
      <text
        x="28"
        y="17.6"
        textAnchor="middle"
        fontSize="4.6"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fill="#2d5a4f"
        opacity="0.7"
      >
        N
      </text>

      {/* Intercardinal dots */}
      <g fill="#3a6e62" opacity="0.42">
        <circle cx="43.4" cy="12.6" r="1" />
        <circle cx="43.4" cy="43.4" r="1" />
        <circle cx="12.6" cy="43.4" r="1" />
        <circle cx="12.6" cy="12.6" r="1" />
      </g>

      {/* ── Needle = blood drop pointing North ── */}
      <g filter={`url(#${p}-dropSh)`}>
        <path
          d="M 28 19 C 24 24, 23 30.5, 28 33.5 C 33 30.5, 32 24, 28 19 Z"
          fill={`url(#${p}-drop)`}
        />
        <path
          d="M 28 19 C 24 24, 23 30.5, 28 33.5 C 33 30.5, 32 24, 28 19 Z"
          fill={`url(#${p}-deep)`}
        />
        <path
          d="M 28 19 C 24 24, 23 30.5, 28 33.5 C 33 30.5, 32 24, 28 19 Z"
          fill={`url(#${p}-shine)`}
        />
        <path
          d="M 28 19 C 24 24, 23 30.5, 28 33.5 C 33 30.5, 32 24, 28 19 Z"
          fill="none"
          stroke="#4a1224"
          strokeWidth="0.4"
          opacity="0.25"
        />

        {/* Compass pivot — center hub */}
        <circle cx="28" cy="33" r="2.4" fill="#8aae9f" />
        <circle cx="28" cy="33" r="2.4" fill="none" stroke="#5a8576" strokeWidth="0.4" />
        <circle cx="28" cy="33" r="0.9" fill="#3a6e62" opacity="0.8" />
      </g>
    </svg>
  );
}

const EMPTY_CYCLE_FORM: CycleFormValues = {
  cycleLengthDays: "28",
  periodLengthDays: "5",
};

const EMPTY_PERIOD_FORM: PeriodFormValues = {
  startDate: "",
  periodLengthDays: "5",
};

const EMPTY_TRIP_FORM: TripFormValues = {
  name: "",
  startDate: "",
  endDate: "",
};

function isLocale(value: unknown): value is Locale {
  return value === "pl" || value === "en";
}

function isPanelTab(value: unknown): value is PanelTab {
  return value === "summary" || value === "trips" || value === "cycle";
}

function detectLocale(): Locale {
  return navigator.language.toLowerCase().startsWith("pl") ? "pl" : "en";
}

function persistState(state: AppState): boolean {
  // `setItem` throws when the browser quota is exceeded (e.g. Safari private
  // mode has a 0-byte quota) or when localStorage is disabled by policy.
  // We swallow the error rather than crashing the React tree — the next save
  // attempt will try again, and the in-memory state is still accurate.
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function createTripId() {
  return globalThis.crypto?.randomUUID?.() ?? `trip-${Date.now()}`;
}

function createPeriodId(startDate: string) {
  return globalThis.crypto?.randomUUID?.() ?? `period-${startDate}-${Date.now()}`;
}

function subscribeToMobileViewport(callback: () => void) {
  const media = window.matchMedia?.(MOBILE_QUERY);
  if (!media) return () => undefined;
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getMobileViewportSnapshot() {
  return window.matchMedia?.(MOBILE_QUERY).matches ?? false;
}

function formatDate(
  value: string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(
    dateLocale(locale),
    options ?? { day: "numeric", month: "long", year: "numeric" },
  ).format(parseDateKey(value));
}

function formatWeekdayShort(value: string, locale: Locale): string {
  // Use the curated 2-letter abbreviations from copy[locale].weekdaysShort —
  // Intl "narrow" produces ambiguous single letters (M T W T F S S in English)
  // and lowercase letters in Polish, both of which read poorly under the strip.
  const labels = copy[locale].weekdaysShort;
  const dayIndex = (parseDateKey(value).getDay() + 6) % 7;
  return labels[dayIndex];
}

function formatRange(start: string, end: string, locale: Locale) {
  if (start === end) return formatDate(start, locale);
  return `${formatDate(start, locale, { day: "numeric", month: "short" })} - ${formatDate(end, locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

function nextEvent(
  forecast: Forecast,
  today: string,
  layer: "fertile" | "ovulation",
) {
  const starts = forecast.predictions
    .filter((prediction) => !prediction.observed)
    .map((prediction) =>
      layer === "ovulation" ? prediction.ovulation : prediction.fertileStart,
    )
    .filter((date) => date >= today && date <= forecast.viewEnd)
    .sort();
  const start = starts[0];
  if (!start) return null;
  if (layer === "ovulation") return { start, end: start };
  const match = forecast.predictions.find(
    (prediction) => !prediction.observed && prediction.fertileStart === start,
  );
  return match ? { start, end: match.fertileEnd } : null;
}

function LayerIcon({ layer, size = 14 }: { layer: Layer; size?: number }) {
  if (layer === "period") return <Droplets size={size} />;
  if (layer === "fertile") return <Leaf size={size} />;
  if (layer === "ovulation") return <Sparkles size={size} />;
  if (layer === "holidays") return <CalendarDays size={size} />;
  return <Plane size={size} />;
}

function EnergyBattery({ level }: { level: 1 | 2 | 3 | 4 | 5 }) {
  const size = 14;
  // Thicker stroke than other inline icons — the battery is a tiny indicator
  // in a busy calendar cell and needs to read as "stamped on" rather than
  // "sketched in".
  const strokeWidth = 2.4;
  if (level === 1) return <Battery size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
  if (level === 2) return <BatteryLow size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
  if (level === 3) return <BatteryMedium size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
  if (level === 4) return <BatteryFull size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
  // Peak energy: charging icon adds shape variation on top of colour for L5.
  return <BatteryCharging size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}

/**
 * Editorial preview of the comfort-plan feature, shown on the Summary tab
 * when the user has cycle data but has not added a trip yet. The strip uses
 * synthetic levels so the preview reads as an example, not a real forecast.
 * Clicking the CTA takes the user to the Trips tab where the real planner lives.
 */
function ComfortTeaser({
  locale,
  onCta,
}: {
  locale: Locale;
  onCta: () => void;
}) {
  const t = copy[locale];
  const exampleLevels: (1 | 2 | 3 | 4 | 5)[] = [4, 5, 5, 4, 3, 2, 2, 3];
  const previewGradient = buildEnergyGradient(exampleLevels);
  return (
    <aside className="comfort-teaser" aria-label={t.comfort.teaserTitle}>
      <p className="comfort-teaser-eyebrow">{t.comfort.teaserEyebrow}</p>
      <h3 className="comfort-teaser-title">{t.comfort.teaserTitle}</h3>
      <div
        className="energy-strip comfort-teaser-strip"
        role="img"
        aria-label={t.comfort.teaserPreviewAria}
        style={{ background: previewGradient }}
      />
      <p className="comfort-teaser-text">{t.comfort.teaserText}</p>
      <button
        className="comfort-teaser-cta"
        onClick={onCta}
        type="button"
      >
        {t.comfort.teaserCta} <ChevronDown size={14} className="comfort-teaser-arrow" />
      </button>
    </aside>
  );
}

/**
 * Three-pillar editorial block under the Summary intro — the closest thing
 * this app has to a "landing narrative". Cycle-aware planning + travel-first
 * positioning + privacy promise, each in one line. Always visible: it costs
 * little, gives returning users context, and lets first-time visitors who
 * skip the tour still understand what the product is for.
 */
function HowItWorks({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const steps = [
    { icon: <Droplets size={18} aria-hidden="true" />, title: t.howStep1Title, text: t.howStep1Text },
    { icon: <Plane size={18} aria-hidden="true" />, title: t.howStep2Title, text: t.howStep2Text },
    { icon: <LockKeyhole size={18} aria-hidden="true" />, title: t.howStep3Title, text: t.howStep3Text },
  ];
  return (
    <aside className="how-it-works" aria-label={t.howItWorksEyebrow}>
      <p className="how-it-works-eyebrow">{t.howItWorksEyebrow}</p>
      <ol className="how-it-works-grid">
        {steps.map((step) => (
          <li className="how-it-works-step" key={step.title}>
            <span className="how-it-works-icon">{step.icon}</span>
            <strong className="how-it-works-title">{step.title}</strong>
            <p className="how-it-works-text">{step.text}</p>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function ConfidenceBars({
  level,
  ariaLabel,
}: {
  level: ForecastConfidence;
  ariaLabel?: string;
}) {
  return (
    <span
      className={`confidence-bars confidence-${level}`}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <span className="bar" />
      <span className="bar" />
      <span className="bar" />
    </span>
  );
}

function CalendarMonth({
  month,
  predictions,
  trips,
  holidays,
  layers,
  locale,
  today,
  isMobile,
  selectedDate,
  onSelectDate,
  cycleLength,
}: {
  month: string;
  predictions: CyclePrediction[];
  trips: Trip[];
  holidays: HolidayEvent[];
  layers: VisibleLayers;
  locale: Locale;
  today: string;
  isMobile: boolean;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  cycleLength: number | null;
}) {
  const t = copy[locale];
  const date = parseDateKey(month);
  const leadingDays = (date.getDay() + 6) % 7;
  const daysInMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();
  const monthEnd = addDays(month, daysInMonth - 1);
  const firstVisibleDate = addDays(month, -leadingDays);
  const visibleCellCount = leadingDays + daysInMonth > 35 ? 42 : 35;
  const cells: CalendarDayCell[] = Array.from({ length: visibleCellCount }, (_, index) => {
    const value = addDays(firstVisibleDate, index);
    return {
      date: value,
      isOutsideMonth: value < month || value > monthEnd,
    };
  });
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
  const title = formatDate(month, locale, { month: "long", year: "numeric" });
  const cycleEvents: CalendarBarEvent[] = predictions.flatMap(
    (prediction, index) => {
      const periodEvent = {
        id: `period-${index}`,
        layer: "period",
        label: t.periodShort,
        startDate: prediction.periodStart,
        endDate: prediction.periodEnd,
      } satisfies CalendarBarEvent;
      if (prediction.observed) return [periodEvent];
      return [
        periodEvent,
      {
        id: `fertile-${index}`,
        layer: "fertile",
        label: t.fertileShort,
        startDate: prediction.fertileStart,
        endDate: prediction.fertileEnd,
      },
      {
        id: `ovulation-${index}`,
        layer: "ovulation",
        label: t.ovulationShort,
        startDate: prediction.ovulation,
        endDate: prediction.ovulation,
      },
      ];
    },
  );
  const visibleEvents: CalendarBarEvent[] = [
    ...cycleEvents.filter((event) => layers[event.layer]),
    ...(layers.trips
      ? trips.map((trip) => ({
          id: `trip-${trip.id}`,
          layer: "trips" as const,
          label: trip.name,
          startDate: trip.startDate,
          endDate: trip.endDate,
        }))
      : []),
    ...(layers.holidays
      ? holidays.map((holiday) => ({
          id: holiday.id,
          layer: "holidays" as const,
          label: holiday.name,
          startDate: holiday.date,
          endDate: holiday.date,
        }))
      : []),
  ];
  const layout = layoutCalendarBars(month, visibleEvents);

  function renderSegment(segment: CalendarBarSegment) {
    const accessibleLabel =
      segment.layer === "trips"
        ? `${t.trips}: ${segment.label}`
        : segment.layer === "holidays"
          ? `${t.holidays}: ${segment.label}`
        : layerName(locale, segment.layer);
    return (
      <span
        aria-label={`${accessibleLabel}: ${formatRange(segment.startDate, segment.endDate, locale)}`}
        className={`calendar-bar bar-${segment.layer} ${segment.startsRange ? "starts-range" : "continues-left"} ${segment.endsRange ? "ends-range" : "continues-right"}`}
        data-layer={segment.layer}
        key={`${segment.id}-${segment.week}-${segment.column}`}
        style={{
          gridColumn: `${segment.column} / span ${segment.span}`,
        }}
      >
        <LayerIcon layer={segment.layer} size={10} />
        {segment.showLabel && <span>{segment.label}</span>}
      </span>
    );
  }

  const isCurrent = today >= month && today <= monthEnd;
  const selectedEvents =
    selectedDate && selectedDate >= month && selectedDate <= monthEnd
      ? visibleEvents.filter((event) =>
          isInRange(selectedDate, event.startDate, event.endDate),
        )
      : [];

  return (
    <section className={`month-card${isCurrent ? " month-current" : ""}`} aria-label={title}>
      <h4>{title}</h4>
      <div className="calendar-grid weekday-row" aria-hidden="true">
        {t.weekdays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-weeks">
        {weeks.map((week, weekIndex) => (
          <div className="calendar-week" key={`week-${weekIndex}`}>
            <div className="calendar-grid">
              {week.map((cell, index) => {
                const isWeekend = index >= 5;
                const value = cell.date;
                if (cell.isOutsideMonth) {
                  return (
                    <span
                      aria-hidden="true"
                      className="day day-placeholder"
                      key={value}
                    />
                  );
                }
                const cycleLayers = layersForDate(value, predictions).filter(
                  (layer) => layers[layer],
                );
                const matchingTrips = layers.trips ? tripsForDate(value, trips) : [];
                const matchingHolidays = layers.holidays
                  ? holidays.filter((holiday) => holiday.date === value)
                  : [];
                const energy =
                  matchingTrips.length > 0 && cycleLength
                    ? dailyEnergy(value, predictions, cycleLength)
                    : null;
                const description = [
                  ...cycleLayers.map((layer) => layerName(locale, layer)),
                  ...matchingTrips.map((trip) => `${t.trips}: ${trip.name}`),
                  ...matchingHolidays.map((holiday) => `${t.holidays}: ${holiday.name}`),
                  energy ? `${t.comfort.energyTitle}: ${t.comfort.energyLabels[energy.level]}` : null,
                ]
                  .filter(Boolean)
                  .join(", ");
                const isToday = value === today;
                const dayLabel = description
                  ? `${formatDate(value, locale)}: ${description}`
                  : formatDate(value, locale);
                const dayClassName = `day${isToday ? " day-today" : ""}${isWeekend ? " day-weekend" : ""}`;
                const dayInner = (
                  <>
                    <span className="day-number">{parseDateKey(value).getDate()}</span>
                    {energy && (
                      <span
                        className={`day-comfort energy-${energy.level}`}
                        aria-hidden="true"
                        title={t.comfort.energyLabels[energy.level]}
                      >
                        <EnergyBattery level={energy.level} />
                      </span>
                    )}
                    {(layout.hiddenByDate[value]?.length ?? 0) > 0 && (
                      <small className="day-overflow">+{layout.hiddenByDate[value].length}</small>
                    )}
                  </>
                );
                // On mobile, tapping a day expands a details panel — render an
                // actual <button> so it carries the right semantics, focus
                // ring and pointer cursor. On desktop there is nothing to
                // activate (all info is already visible in the bars below),
                // so we render a non-interactive <div role="gridcell"> instead.
                // That removes the misleading pointer cursor and the empty
                // click target.
                return isMobile ? (
                  <button
                    aria-expanded={selectedDate === value}
                    aria-label={dayLabel}
                    className={dayClassName}
                    key={value}
                    onClick={() => onSelectDate(value)}
                    type="button"
                  >
                    {dayInner}
                  </button>
                ) : (
                  <div
                    aria-label={dayLabel}
                    className={dayClassName}
                    key={value}
                    role="gridcell"
                  >
                    {dayInner}
                  </div>
                );
              })}
            </div>
            <div className="calendar-bars">
              {Array.from({ length: 4 }, (_, lane) => {
                const weekSegments = layout.segments.filter(
                  (segment) => segment.week === weekIndex && segment.lane === lane,
                );
                return (
                  <div className="bar-lane" key={`lane-${lane}`}>
                    {weekSegments.map(renderSegment)}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {isMobile && selectedDate && selectedEvents.length > 0 && (
        <section className="day-details" aria-label={t.selectedDay}>
          <strong>{formatDate(selectedDate, locale)}</strong>
          <ul>
            {selectedEvents.map((event) => (
              <li className={`detail-${event.layer}`} key={event.id}>
                <LayerIcon layer={event.layer} size={14} />
                {event.layer === "trips" || event.layer === "holidays" ? event.label : layerName(locale, event.layer)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

function Legend({
  locale,
  layers,
  hasCycle,
  hasHolidays,
}: {
  locale: Locale;
  layers: VisibleLayers;
  hasCycle: boolean;
  hasHolidays: boolean;
}) {
  const listed: Layer[] = [
    ...(hasCycle
      ? (["period", "fertile", "ovulation", "trips"] as Layer[])
      : (["trips"] as Layer[])),
    ...(hasHolidays ? (["holidays"] as Layer[]) : []),
  ];
  return (
    <ul className="legend" aria-label={copy[locale].layers}>
      {listed
        .filter((layer) => layers[layer])
        .map((layer) => (
          <li className={`legend-${layer}`} key={layer}>
            <LayerIcon layer={layer} size={14} />
            {layerName(locale, layer)}
          </li>
        ))}
    </ul>
  );
}

function ForecastChips({
  locale,
  nextPeriod,
  nextOvulation,
  nextFertile,
}: {
  locale: Locale;
  nextPeriod: CyclePrediction | null;
  nextOvulation: ReturnType<typeof nextEvent>;
  nextFertile: ReturnType<typeof nextEvent>;
}) {
  const t = copy[locale];
  if (!nextPeriod && !nextOvulation && !nextFertile) return null;

  const chips = [
    {
      key: "period",
      label: t.nextPeriod,
      value: nextPeriod ? formatRange(nextPeriod.periodStart, nextPeriod.periodEnd, locale) : "-",
      icon: <Droplets size={14} />,
    },
    {
      key: "ovulation",
      label: t.nextOvulation,
      value: nextOvulation ? formatDate(nextOvulation.start, locale) : "-",
      icon: <Sparkles size={14} />,
    },
    {
      key: "fertile",
      label: t.nextFertile,
      value: nextFertile ? formatRange(nextFertile.start, nextFertile.end, locale) : "-",
      icon: <Leaf size={14} />,
    },
  ];

  return (
    <div className="forecast-chips" role="list">
      {chips.map((chip) => {
        const accessibleLabel = `${chip.label}: ${chip.value}`;
        return (
          <span
            aria-label={accessibleLabel}
            className={`forecast-chip forecast-chip-${chip.key}`}
            key={chip.key}
            role="listitem"
            title={accessibleLabel}
          >
            {chip.icon}
            <span className="forecast-chip-label">{chip.label}</span>
            <strong>{chip.value}</strong>
          </span>
        );
      })}
    </div>
  );
}

function TripItem({
  trip,
  locale,
  window,
  overlap,
  readiness,
  predictions,
  cycleLength,
  isPast,
  onEdit,
  onRemove,
}: {
  trip: Trip;
  locale: Locale;
  window: CalendarWindow;
  overlap: CycleLayer[];
  readiness: ReturnType<typeof tripReadiness> | null;
  predictions: CyclePrediction[];
  cycleLength: number | null;
  isPast: boolean;
  onEdit: (trip: Trip) => void;
  onRemove: (trip: Trip) => void;
}) {
  const t = copy[locale];
  // Past trips: never show forward-looking metadata (vibe / strip / confidence).
  // It would be misleading to display a forecast for dates that already passed.
  const comfortPlan = useMemo(
    () =>
      !isPast && predictions.length > 0 && cycleLength
        ? buildComfortPlan(trip, predictions, cycleLength)
        : null,
    [trip, predictions, cycleLength, isPast],
  );
  return (
    <li className="trip-item">
      <div className="trip-details">
        <header className="trip-header">
          <strong className="trip-name">{trip.name}</strong>
          <div className="trip-date-row">
            <span className="trip-date">{formatRange(trip.startDate, trip.endDate, locale)}</span>
            {overlap.length > 0 && (
              <span className="overlap-icons" aria-label={t.overlapsWith}>
                {overlap.map((layer) => (
                  <span className={`overlap-${layer}`} key={layer} title={layerName(locale, layer)}>
                    <LayerIcon layer={layer} size={14} />
                    <span className="sr-only">{layerName(locale, layer)}</span>
                  </span>
                ))}
              </span>
            )}
            {readiness && readiness.holidayOverlaps.length > 0 && (
              <span className="overlap-icons" aria-label={t.holidayOverlaps}>
                {readiness.holidayOverlaps.slice(0, 3).map((holiday) => (
                  <span className="overlap-holidays" key={holiday.id} title={holiday.name}>
                    <CalendarDays size={14} />
                    <span className="sr-only">{holiday.name}</span>
                  </span>
                ))}
              </span>
            )}
          </div>
          {!isTripVisible(trip, window) && (
            <small className="outside-view">
              {t.outsideView} <span className="outside-view-hint">— {t.outsideViewHint}</span>
            </small>
          )}
        </header>

        {comfortPlan && (
          <section className="trip-vibe">
            <span className="trip-eyebrow">
              {t.comfort.suggestedActivity}
              <span aria-hidden="true"> · </span>
              <span className="trip-vibe-days">
                {t.comfort.dayCount.replace(
                  "{count}",
                  String(comfortPlan.daily.length),
                )}
              </span>
            </span>
            <p className="trip-vibe-value">{t.comfort.vibes[comfortPlan.vibe]}</p>
          </section>
        )}

        {comfortPlan && (
          <section className="trip-strip" aria-label={t.comfort.energyAriaStrip}>
            <div
              className="energy-strip"
              role="img"
              aria-label={t.comfort.energyAriaStrip}
              style={{
                background: buildEnergyGradient(
                  comfortPlan.daily.map((day) => day.energy?.level ?? null),
                ),
              }}
            />
            <div className="energy-strip-labels">
              {comfortPlan.daily.map((day) => {
                const isUnknown = day.energy === null;
                const dayLabel = formatDate(day.date, locale, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                });
                return (
                  <div
                    className={`energy-label${isUnknown ? " energy-label-unknown" : ""}`}
                    key={day.date}
                    title={
                      isUnknown
                        ? `${dayLabel} — ${t.comfort.beyondHorizonShort}`
                        : `${dayLabel} — ${t.comfort.energyLabels[day.energy!.level]}`
                    }
                  >
                    <span className="energy-weekday">
                      {formatWeekdayShort(day.date, locale)}
                    </span>
                    <span className="energy-daynum">
                      {parseDateKey(day.date).getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
            {comfortPlan.beyondHorizon > 0 && (
              <p className="trip-strip-beyond">{t.comfort.beyondHorizon}</p>
            )}
          </section>
        )}

        {!isPast && readiness && (
          <footer
            className="trip-confidence"
            title={t.readinessConfidence.replace(
              "{level}",
              t.forecastConfidence[readiness.forecastConfidence],
            )}
          >
            <span className="trip-eyebrow">{t.readinessConfidenceShort}</span>
            <ConfidenceBars
              level={readiness.forecastConfidence}
              ariaLabel={t.readinessConfidence.replace(
                "{level}",
                t.forecastConfidence[readiness.forecastConfidence],
              )}
            />
          </footer>
        )}
      </div>
      <div className="trip-actions">
        <button aria-label={`${t.editTrip}: ${trip.name}`} onClick={() => onEdit(trip)} type="button">
          <Pencil size={14} />
        </button>
        <button aria-label={`${t.removeTrip}: ${trip.name}`} onClick={() => onRemove(trip)} type="button">
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

function PeriodItem({
  entry,
  locale,
  onEdit,
  onRemove,
}: {
  entry: PeriodEntry;
  locale: Locale;
  onEdit: (entry: PeriodEntry) => void;
  onRemove: (entry: PeriodEntry) => void;
}) {
  const t = copy[locale];
  return (
    <li className="period-item">
      <div className="trip-details">
        <strong>{formatDate(entry.startDate, locale)}</strong>
        <span>
          {entry.periodLengthDays} {t.days}
        </span>
      </div>
      <div className="trip-actions">
        <button aria-label={`${t.editPeriod}: ${formatDate(entry.startDate, locale)}`} onClick={() => onEdit(entry)} type="button">
          <Pencil size={14} />
        </button>
        <button aria-label={`${t.removePeriod}: ${formatDate(entry.startDate, locale)}`} onClick={() => onRemove(entry)} type="button">
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

export default function CyclePlanner() {
  const today = useMemo(() => toDateKey(new Date()), []);
  const [ready, setReady] = useState(false);
  const [app, setApp] = useState<AppState | null>(null);
  const [cycleForm, setCycleForm] = useState<CycleFormValues>(EMPTY_CYCLE_FORM);
  const [periodForm, setPeriodForm] = useState<PeriodFormValues>(EMPTY_PERIOD_FORM);
  const [tripForm, setTripForm] = useState<TripFormValues>(EMPTY_TRIP_FORM);
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [cycleErrors, setCycleErrors] = useState<string[]>([]);
  const [periodErrors, setPeriodErrors] = useState<string[]>([]);
  const [tripErrors, setTripErrors] = useState<string[]>([]);
  const [showExport, setShowExport] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("summary");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const tripEndRef = useRef<HTMLInputElement>(null);
  const isMobile = useSyncExternalStore(
    subscribeToMobileViewport,
    getMobileViewportSnapshot,
    () => false,
  );

  useEffect(() => {
    const preferred = localStorage.getItem(LOCALE_KEY);
    const fallbackLocale = isLocale(preferred) ? preferred : detectLocale();
    let restored: AppState | null = null;
    let usedLegacyState = false;
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      const legacyV3 = localStorage.getItem(LEGACY_V3_STORAGE_KEY);
      const legacyV2 = localStorage.getItem(LEGACY_V2_STORAGE_KEY);
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      restored = migrateStoredState(
        current
          ? JSON.parse(current)
          : legacyV3
            ? JSON.parse(legacyV3)
          : legacyV2
            ? JSON.parse(legacyV2)
            : legacy
              ? JSON.parse(legacy)
              : null,
      );
      usedLegacyState = !current && (!!legacyV3 || !!legacyV2 || !!legacy) && !!restored;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_V3_STORAGE_KEY);
      localStorage.removeItem(LEGACY_V2_STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    const initialState = restored ?? defaultAppState(fallbackLocale);
    const savedPanelTab = localStorage.getItem(PANEL_TAB_KEY);
    // Browser-only preferences are available only after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApp(initialState);
    if (isPanelTab(savedPanelTab)) setPanelTab(savedPanelTab);
    if (initialState.cycleSettings) {
      setCycleForm({
        cycleLengthDays: String(initialState.cycleSettings.cycleLengthDays),
        periodLengthDays: String(initialState.cycleSettings.periodLengthDays),
      });
    }
    if (usedLegacyState) {
      persistState(initialState);
      localStorage.removeItem(LEGACY_V3_STORAGE_KEY);
      localStorage.removeItem(LEGACY_V2_STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    setReady(true);
  }, []);

  const locale = app?.locale ?? "pl";
  const t = copy[locale];
  const onboardingStartedRef = useRef(false);

  useEffect(() => {
    if (ready) document.documentElement.lang = locale;
  }, [locale, ready]);


  function launchOnboarding() {
    startOnboarding({
      t,
      isMobile,
      openDrawer: (tab) => openDrawer(tab),
      closeDrawer: () => setDrawerOpen(false),
      selectPanelTab: (tab) => selectPanelTab(tab),
      onComplete: markOnboardingComplete,
    });
  }

  useEffect(() => {
    if (!ready) return;
    if (onboardingStartedRef.current) return;
    if (hasCompletedOnboarding()) return;
    // Skip if the user already has saved cycle data (returning user without flag).
    if (localStorage.getItem(STORAGE_KEY)) {
      markOnboardingComplete();
      return;
    }
    onboardingStartedRef.current = true;
    launchOnboarding();
    // Re-running only changes the language of an in-flight tour, which we
    // don't support. The ref above guards against duplicate launches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, isMobile, t]);

  useEffect(() => {
    if (!drawerOpen || !isMobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerCloseRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [drawerOpen, isMobile]);

  const calendarWindow = useMemo(
    () => createCalendarWindow(today, app?.horizonMonths ?? 4, app?.pastMonths ?? 0),
    [app?.horizonMonths, app?.pastMonths, today],
  );
  const holidayCountryOptions = useMemo(
    () => holidayCountries(locale),
    [locale],
  );
  const holidayEvents = useMemo(
    () =>
      holidayEventsForWindow(
        app?.holidayCountry ?? null,
        calendarWindow,
        locale,
      ),
    [app?.holidayCountry, calendarWindow, locale],
  );
  const forecast = useMemo(
    () =>
      app?.cycleSettings && app.periodEntries.length > 0
        ? generateForecast(
            app.cycleSettings,
            app.periodEntries,
            today,
            app.horizonMonths,
            app.pastMonths,
          )
        : null,
    [app, today],
  );
  const predictions = forecast?.predictions ?? [];
  const categorizedTrips = splitTrips(app?.trips ?? [], today);
  const sortedPeriodEntries = sortPeriodEntries(app?.periodEntries ?? []);
  const hasCycleData = !!app?.cycleSettings && sortedPeriodEntries.length > 0;
  const currentCycleLength = app?.cycleSettings
    ? effectiveCycleLength(app.cycleSettings, sortedPeriodEntries)
    : null;
  const hasData =
    !!app?.cycleSettings ||
    sortedPeriodEntries.length > 0 ||
    (app?.trips.length ?? 0) > 0;

  function updateApp(updater: (previous: AppState) => AppState) {
    setApp((previous) => {
      if (!previous) return previous;
      const next = updater(previous);
      persistState(next);
      return next;
    });
  }

  function changeLocale(nextLocale: Locale) {
    localStorage.setItem(LOCALE_KEY, nextLocale);
    updateApp((previous) => ({ ...previous, locale: nextLocale }));
  }

  function selectPanelTab(tab: PanelTab) {
    setPanelTab(tab);
    localStorage.setItem(PANEL_TAB_KEY, tab);
  }

  function openDrawer(tab?: PanelTab) {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    if (tab) selectPanelTab(tab);
    setDrawerOpen(true);
  }

  function submitCycle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const settings: CycleSettings = {
      cycleLengthDays: Number(cycleForm.cycleLengthDays),
      periodLengthDays: Number(cycleForm.periodLengthDays),
    };
    const result = validateCycleSettings(settings);
    setCycleErrors(result.errors);
    if (result.errors.length) return;
    updateApp((previous) => ({ ...previous, cycleSettings: settings }));
  }

  function submitPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!app) return;
    const settings: CycleSettings = {
      cycleLengthDays: Number(cycleForm.cycleLengthDays),
      periodLengthDays: Number(cycleForm.periodLengthDays),
    };
    const settingsResult = validateCycleSettings(settings);
    const entryBase = {
      startDate: periodForm.startDate,
      periodLengthDays: Number(periodForm.periodLengthDays || cycleForm.periodLengthDays),
    };
    const original = editingPeriodId
      ? app.periodEntries.find((entry) => entry.id === editingPeriodId)
      : null;
    const entryResult = validatePeriodEntry(
      entryBase,
      today,
      app.periodEntries,
      editingPeriodId,
      !!original && original.startDate === entryBase.startDate,
    );
    setCycleErrors(settingsResult.errors);
    setPeriodErrors(entryResult.errors);
    if (settingsResult.errors.length || entryResult.errors.length) return;

    const entry: PeriodEntry = {
      id: editingPeriodId ?? createPeriodId(entryBase.startDate),
      ...entryBase,
    };
    const neededPastMonths = pastMonthsForDate(entry.startDate, today);
    updateApp((previous) => ({
      ...previous,
      cycleSettings: settings,
      periodEntries: sortPeriodEntries(
        editingPeriodId
          ? previous.periodEntries.map((stored) =>
              stored.id === editingPeriodId ? entry : stored,
            )
          : [...previous.periodEntries, entry],
      ),
      pastMonths:
        neededPastMonths > previous.pastMonths
          ? neededPastMonths
          : previous.pastMonths,
    }));
    setPeriodForm({ ...EMPTY_PERIOD_FORM, periodLengthDays: String(entry.periodLengthDays) });
    setEditingPeriodId(null);
    setCycleErrors([]);
    setPeriodErrors([]);
    if (isMobile) setDrawerOpen(false);
  }

  function submitTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateTrip(tripForm, today, editingTripId !== null).errors;
    setTripErrors(errors);
    if (errors.length) return;
    const trip: Trip = {
      id: editingTripId ?? createTripId(),
      name: tripForm.name.trim(),
      startDate: tripForm.startDate,
      endDate: tripForm.endDate,
    };
    updateApp((previous) => ({
      ...previous,
      trips: editingTripId
        ? previous.trips.map((stored) => (stored.id === editingTripId ? trip : stored))
        : [...previous.trips, trip],
    }));
    setTripForm(EMPTY_TRIP_FORM);
    setEditingTripId(null);
    setTripErrors([]);
    if (isMobile) setDrawerOpen(false);
  }

  function editTrip(trip: Trip) {
    selectPanelTab("trips");
    setEditingTripId(trip.id);
    setTripForm({
      name: trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
    });
    setTripErrors([]);
  }

  function editPeriod(entry: PeriodEntry) {
    selectPanelTab("cycle");
    setEditingPeriodId(entry.id);
    setPeriodForm({
      startDate: entry.startDate,
      periodLengthDays: String(entry.periodLengthDays),
    });
    setPeriodErrors([]);
  }

  function removePeriod(entry: PeriodEntry) {
    updateApp((previous) => ({
      ...previous,
      periodEntries: previous.periodEntries.filter((stored) => stored.id !== entry.id),
    }));
    if (editingPeriodId === entry.id) {
      setEditingPeriodId(null);
      setPeriodForm(EMPTY_PERIOD_FORM);
    }
  }

  function removeTrip(trip: Trip) {
    updateApp((previous) => ({
      ...previous,
      trips: previous.trips.filter((stored) => stored.id !== trip.id),
    }));
    if (editingTripId === trip.id) {
      setEditingTripId(null);
      setTripForm(EMPTY_TRIP_FORM);
    }
  }

  function updateSettings(patch: Partial<Pick<AppState, "horizonMonths" | "pastMonths" | "visibleLayers">>) {
    updateApp((previous) => ({ ...previous, ...patch }));
  }

  function toggleLayer(layer: Layer) {
    if (!app) return;
    updateSettings({
      visibleLayers: {
        ...app.visibleLayers,
        [layer]: !app.visibleLayers[layer],
      },
    });
  }

  function changeHolidayCountry(countryCode: string) {
    updateApp((previous) => ({
      ...previous,
      holidayCountry: countryCode || null,
      visibleLayers: {
        ...previous.visibleLayers,
        holidays: countryCode ? previous.visibleLayers.holidays : false,
      },
    }));
  }

  function clearCycleOnly() {
    updateApp((previous) => ({
      ...previous,
      cycleSettings: null,
      periodEntries: [],
    }));
    setCycleForm(EMPTY_CYCLE_FORM);
    setPeriodForm(EMPTY_PERIOD_FORM);
    setEditingPeriodId(null);
    setCycleErrors([]);
    setPeriodErrors([]);
    setShowDelete(false);
  }

  function clearEverything() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_V3_STORAGE_KEY);
    localStorage.removeItem(LEGACY_V2_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(LOCALE_KEY);
    localStorage.removeItem(PANEL_TAB_KEY);
    localStorage.removeItem(ONBOARDING_KEY);
    const reset = defaultAppState(detectLocale());
    setApp(reset);
    setCycleForm(EMPTY_CYCLE_FORM);
    setPeriodForm(EMPTY_PERIOD_FORM);
    setTripForm(EMPTY_TRIP_FORM);
    setEditingPeriodId(null);
    setEditingTripId(null);
    setCycleErrors([]);
    setPeriodErrors([]);
    setTripErrors([]);
    setPanelTab("summary");
    setSelectedDate(null);
    setShowDelete(false);
  }

  async function downloadImage() {
    if (!reportRef.current) return;
    setExporting(true);
    setExportError(false);
    reportRef.current.classList.add("export-capture");
    try {
      const dataUrl = await toPng(reportRef.current, {
        backgroundColor: "#fbf8f5",
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      // Neutral filename — does not advertise the app to anyone watching
      // the Downloads folder, cloud-sync history, or screenshot tools.
      link.download = `calendar-${today}.png`;
      link.href = dataUrl;
      link.click();
      setShowExport(false);
    } catch {
      setExportError(true);
    } finally {
      reportRef.current?.classList.remove("export-capture");
      setExporting(false);
    }
  }

  function downloadIcs() {
    if (!app) return;
    const t = copy[app.locale];
    const events: IcsEvent[] = [];
    if (forecast) {
      for (const prediction of forecast.predictions) {
        events.push({
          uid: `period-${prediction.periodStart}@local.invalid`,
          summary: t.period,
          startDate: prediction.periodStart,
          endDate: prediction.periodEnd,
        });
        if (prediction.observed) continue;
        events.push({
          uid: `fertile-${prediction.fertileStart}@local.invalid`,
          summary: t.fertile,
          startDate: prediction.fertileStart,
          endDate: prediction.fertileEnd,
        });
        events.push({
          uid: `ovulation-${prediction.ovulation}@local.invalid`,
          summary: t.ovulation,
          startDate: prediction.ovulation,
          endDate: prediction.ovulation,
        });
      }
    }
    for (const trip of app.trips.filter((item) => isTripVisible(item, calendarWindow))) {
      events.push({
        uid: `trip-${trip.id}@local.invalid`,
        summary: `${t.trips}: ${trip.name}`,
        startDate: trip.startDate,
        endDate: trip.endDate,
      });
    }
    if (app.visibleLayers.holidays) {
      for (const holiday of holidayEvents) {
        events.push({
          uid: `${holiday.id}@local.invalid`,
          summary: `${t.holidays}: ${holiday.name}`,
          startDate: holiday.date,
          endDate: holiday.date,
        });
      }
    }
    const ics = generateIcsCalendar(events);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.download = `calendar-${today}.ics`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (!ready || !app) {
    return (
      <main className="loading-shell" aria-label="Kalendarzyk" role="status">
        <div className="loading-shell-inner">
          <MoonBloomLogo size={56} />
          <span className="sr-only">Cycle Compass</span>
        </div>
      </main>
    );
  }

  const nextPeriod = forecast?.upcoming[0] ?? null;
  const nextOvulation = forecast ? nextEvent(forecast, today, "ovulation") : null;
  const nextFertile = forecast ? nextEvent(forecast, today, "fertile") : null;

  function renderCyclePanel() {
    const minPeriodDate = addMonths(today, -3);
    const periodLengthValue =
      periodForm.periodLengthDays || cycleForm.periodLengthDays;
    return (
      <aside className="form-panel">
        <div className="section-heading">
          <h2>{t.formTitle}</h2>
          <p>{t.formIntro}</p>
        </div>
        <form onSubmit={submitCycle} noValidate>
          <h3 className="form-subtitle">{t.cycleSettingsTitle}</h3>
          <div className="two-inputs number-inputs">
            <label>
              {t.cycleLength}
              <span className="number-field">
                <input type="number" min={15} max={90} value={cycleForm.cycleLengthDays} onChange={(event) => setCycleForm({ ...cycleForm, cycleLengthDays: event.target.value })} />
                <small>{t.days}</small>
              </span>
            </label>
            <label>
              {t.defaultPeriodLength}
              <span className="number-field">
                <input type="number" min={1} max={14} value={cycleForm.periodLengthDays} onChange={(event) => setCycleForm({ ...cycleForm, periodLengthDays: event.target.value })} />
                <small>{t.days}</small>
              </span>
            </label>
          </div>
          {cycleErrors.length > 0 && (
            <div className="form-errors" role="alert">
              {cycleErrors.map((error) => <p key={error}>{t.validation[error as keyof typeof t.validation]}</p>)}
            </div>
          )}
          <button className="secondary-button" type="submit">{t.saveCycleSettings}</button>
        </form>
        <form className="period-form" onSubmit={submitPeriod} noValidate>
          <div className="form-subtitle-row">
            <h3 className="form-subtitle">{t.periodHistoryTitle}</h3>
            <small>{t.periodHistoryLimit}</small>
          </div>
          <label>
            {t.periodStart}
            <input
              type="date"
              min={editingPeriodId ? undefined : minPeriodDate}
              max={today}
              value={periodForm.startDate}
              onChange={(event) => setPeriodForm({ ...periodForm, startDate: event.target.value })}
            />
          </label>
          <label>
            {t.entryPeriodLength}
            <span className="number-field">
              <input
                type="number"
                min={1}
                max={14}
                value={periodLengthValue}
                onChange={(event) => setPeriodForm({ ...periodForm, periodLengthDays: event.target.value })}
              />
              <small>{t.days}</small>
            </span>
          </label>
          {periodErrors.length > 0 && (
            <div className="form-errors" role="alert">
              {periodErrors.map((error) => <p key={error}>{t.validation[error as keyof typeof t.validation]}</p>)}
            </div>
          )}
          <div className="trip-form-actions">
            <button className="primary-button" type="submit">{editingPeriodId ? t.savePeriod : t.addPeriod}</button>
            {editingPeriodId && (
              <button className="secondary-button" type="button" onClick={() => { setEditingPeriodId(null); setPeriodForm(EMPTY_PERIOD_FORM); setPeriodErrors([]); }}>
                {t.stopEditing}
              </button>
            )}
          </div>
        </form>
        <section className="period-list-section">
          <h3>{t.savedPeriods}</h3>
          {sortedPeriodEntries.length > 0 ? (
            <ul className="trip-list">
              {sortedPeriodEntries.map((entry) => (
                <PeriodItem key={entry.id} entry={entry} locale={locale} onEdit={editPeriod} onRemove={removePeriod} />
              ))}
            </ul>
          ) : (
            <p className="no-trips">{t.noPeriods}</p>
          )}
        </section>

        <section className="reset-onboarding">
          <h3>{t.onboarding.resetTitle}</h3>
          <p>{t.onboarding.resetText}</p>
          <button
            className="secondary-button"
            onClick={() => launchOnboarding()}
            type="button"
          >
            {t.onboarding.resetTitle}
          </button>
        </section>


      </aside>
    );
  }

  function renderTripPanel() {
    return (
      <aside className="trip-panel">
        <div className="section-heading">
          <h2>{t.tripSection}</h2>
          <p>{t.tripSectionIntro}</p>
        </div>
        <form className="trip-form" onSubmit={submitTrip} noValidate>
          <label>
            {t.tripName}
            <input placeholder={t.tripNamePlaceholder} value={tripForm.name} onChange={(event) => setTripForm({ ...tripForm, name: event.target.value })} />
          </label>
          <div className="trip-date-inputs">
            <label>
              {t.tripStart}
              <input
                type="date"
                min={editingTripId ? undefined : today}
                value={tripForm.startDate}
                onChange={(event) => {
                  const startDate = event.target.value;
                  setTripForm({ ...tripForm, startDate });
                  if (startDate) tripEndRef.current?.focus();
                }}
              />
            </label>
            <label>
              {t.tripEnd}
              <input ref={tripEndRef} type="date" min={tripForm.startDate || today} value={tripForm.endDate} onChange={(event) => setTripForm({ ...tripForm, endDate: event.target.value })} />
            </label>
          </div>
          {tripErrors.length > 0 && (
            <div className="form-errors" role="alert">
              {tripErrors.map((error) => <p key={error}>{t.validation[error as keyof typeof t.validation]}</p>)}
            </div>
          )}
          <div className="trip-form-actions">
            <button className="primary-button" type="submit">{editingTripId ? t.saveTrip : t.addTrip}</button>
            {editingTripId && (
              <button className="secondary-button" type="button" onClick={() => { setEditingTripId(null); setTripForm(EMPTY_TRIP_FORM); setTripErrors([]); }}>
                {t.stopEditing}
              </button>
            )}
          </div>
        </form>
        <section className="trip-list-section">
          <h3>{t.plannedTrips}</h3>
          {categorizedTrips.planned.length > 0 ? (
            <ul className="trip-list">
              {categorizedTrips.planned.map((trip) => (
                <TripItem
                  key={trip.id}
                  trip={trip}
                  locale={locale}
                  window={calendarWindow}
                  overlap={forecast ? tripOverlapLayers(trip, predictions) : []}
                  readiness={tripReadiness(trip, predictions, holidayEvents, app?.cycleSettings ?? null, sortedPeriodEntries)}
                  predictions={predictions}
                  cycleLength={currentCycleLength}
                  isPast={false}
                  onEdit={editTrip}
                  onRemove={removeTrip}
                />
              ))}
            </ul>
          ) : (
            <p className="no-trips">{t.noTrips}</p>
          )}
          {categorizedTrips.past.length > 0 && (
            <details className="past-trips">
              <summary><ChevronDown size={14} />{t.pastTrips} ({categorizedTrips.past.length})</summary>
              <ul className="trip-list">
                {categorizedTrips.past.map((trip) => (
                  <TripItem
                    key={trip.id}
                    trip={trip}
                    locale={locale}
                    window={calendarWindow}
                    overlap={forecast ? tripOverlapLayers(trip, predictions) : []}
                    readiness={tripReadiness(trip, predictions, holidayEvents, app?.cycleSettings ?? null, sortedPeriodEntries)}
                    predictions={predictions}
                    cycleLength={currentCycleLength}
                      isPast={true}
                    onEdit={editTrip}
                    onRemove={removeTrip}
                  />
                ))}
              </ul>
            </details>
          )}
        </section>
      </aside>
    );
  }

  function goToCycle() {
    if (isMobile) openDrawer("cycle");
    else selectPanelTab("cycle");
  }

  function goToTrips() {
    if (isMobile) openDrawer("trips");
    else selectPanelTab("trips");
  }

  function renderSummaryPanel() {
    const current = app!;
    const horizonLabels: Record<HorizonMonths, string> = {
      2: t.months2,
      4: t.months4,
      8: t.months8,
      12: t.months12,
    };
    const pastLabels: Record<PastMonths, string> = {
      0: t.pastMonths0,
      1: t.pastMonths1,
      2: t.pastMonths2,
      3: t.pastMonths3,
    };
    return (
      <section className="summary-panel">
        <div className="summary-intro">
          <p className="eyebrow">{t.eyebrow}</p>
          <h2>{t.title}</h2>
          <p>{t.subtitle}</p>
        </div>
        <HowItWorks locale={locale} />

        {!forecast && (
          <div className="calendar-note" role="note">
            <Droplets size={18} />
            <div>
              <strong>{t.noCycleTitle}</strong>
              <p>{t.noCycleText}</p>
              <button className="cycle-action" onClick={goToCycle} type="button">
                {t.addCycleDetails}
              </button>
            </div>
          </div>
        )}
        {forecast && categorizedTrips.planned.length === 0 && (
          <ComfortTeaser locale={locale} onCta={goToTrips} />
        )}
        <fieldset>
          <legend>{t.showMonths}</legend>
          <div className="segmented horizon-picker">
            {([2, 4, 8, 12] as HorizonMonths[]).map((months) => (
              <button aria-label={horizonLabels[months]} aria-pressed={current.horizonMonths === months} className={current.horizonMonths === months ? "active" : ""} key={months} onClick={() => updateSettings({ horizonMonths: months })} type="button">
                {months}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t.showPastMonths}</legend>
          <div className="segmented horizon-picker">
            {([0, 1, 2, 3] as PastMonths[]).map((months) => (
              <button aria-label={pastLabels[months]} aria-pressed={current.pastMonths === months} className={current.pastMonths === months ? "active" : ""} key={months} onClick={() => updateSettings({ pastMonths: months })} type="button">
                {months}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="layer-toggles">
          <legend>{t.layers}</legend>
          {(hasCycleData ? (["period", "fertile", "ovulation", "trips"] as Layer[]) : (["trips"] as Layer[])).map((layer) => (
            <label className={`toggle toggle-${layer}`} key={layer}>
              <input checked={current.visibleLayers[layer]} onChange={() => toggleLayer(layer)} type="checkbox" />
              <LayerIcon layer={layer} size={14} />
              {layerName(locale, layer)}
            </label>
          ))}
          <div className="holiday-settings">
            <label>
              {t.holidayCountry}
              <select value={current.holidayCountry ?? ""} onChange={(event) => changeHolidayCountry(event.target.value)}>
                <option value="">{t.noHolidayCountry}</option>
                {holidayCountryOptions.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="toggle toggle-holidays">
              <input
                checked={current.visibleLayers.holidays}
                disabled={!current.holidayCountry}
                onChange={() => toggleLayer("holidays")}
                type="checkbox"
              />
              <LayerIcon layer="holidays" size={14} />
              {t.showHolidays}
            </label>
            <p>{t.holidayDisclaimer}</p>
          </div>
        </fieldset>
        {currentCycleLength !== null && (currentCycleLength < 21 || currentCycleLength > 35) && (
          <div className="warning" role="note">
            <Info size={18} />
            <p>{t.atypical}</p>
          </div>
        )}
        {hasData && (
          <div className="actions-panel">
            <button aria-label={t.exportAria} onClick={() => setShowExport(true)} title={t.exportAria} type="button"><Download size={18} /></button>
            <button aria-label={t.exportIcsAria} onClick={downloadIcs} title={t.exportIcsAria} type="button"><CalendarPlus size={18} /></button>
            <button aria-label={t.deleteAria} className="delete-button" onClick={() => setShowDelete(true)} title={t.deleteAria} type="button"><Trash2 size={18} /></button>
          </div>
        )}
      </section>
    );
  }

  function renderPanelTabs(prefix: string) {
    const labels: Record<PanelTab, string> = {
      summary: t.manageSummaryTab,
      trips: t.manageTripsTab,
      cycle: t.manageCycleTab,
    };
    return (
      <div aria-label={t.managePanelTitle} className="panel-tabs" role="tablist">
        {(Object.keys(labels) as PanelTab[]).map((tab) => (
          <button aria-controls={`${prefix}-panel-${tab}`} aria-selected={panelTab === tab} id={`${prefix}-tab-${tab}`} key={tab} onClick={() => selectPanelTab(tab)} role="tab" type="button">
            {labels[tab]}
          </button>
        ))}
      </div>
    );
  }

  function renderPanelContent(prefix: string) {
    return (
      <div aria-labelledby={`${prefix}-tab-${panelTab}`} className="panel-content" id={`${prefix}-panel-${panelTab}`} role="tabpanel">
        {panelTab === "summary" && renderSummaryPanel()}
        {panelTab === "trips" && renderTripPanel()}
        {panelTab === "cycle" && renderCyclePanel()}
      </div>
    );
  }

  return (
    <main className="planner">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <MoonBloomLogo />
          </span>
          <div className="brand-text">
            <h1 className="brand-name">{t.appName}</h1>
            <p className="brand-tagline">{t.appTagline}</p>
          </div>
        </div>
        <div className="topbar-meta">
          <span
            className="privacy-badge"
            title={t.privacyBadgeTitle}
            aria-label={t.privacyBadgeTitle}
          >
            <span aria-hidden="true" className="privacy-badge-dot" />
            {t.privacyBadge}
          </span>
          <label className="language-picker">
            <span>{t.language}</span>
            <select aria-label={t.language} value={locale} onChange={(event) => changeLocale(event.target.value as Locale)}>
              <option value="pl">{t.polish}</option>
              <option value="en">{t.english}</option>
            </select>
          </label>
        </div>
      </header>
      <div className="workspace">
        {!isMobile && (
          <aside className="sidebar-panel desktop-sidebar">
            {renderPanelTabs("desktop")}
            {renderPanelContent("desktop")}
          </aside>
        )}
        <section className="results" aria-live="polite">
          <div className="result-toolbar">
            <h2>{t.calendar}</h2>
            <ForecastChips
              locale={locale}
              nextFertile={nextFertile}
              nextOvulation={nextOvulation}
              nextPeriod={forecast ? nextPeriod : null}
            />
            <button className="mobile-manage-button" onClick={() => openDrawer()} type="button" aria-label={t.managePlans}><Settings2 size={18} /><span>{t.managePlans}</span></button>
          </div>
          <div className="forecast-report" ref={reportRef}>
            <div aria-hidden="true" className="capture-header"><h2>{t.calendar}</h2></div>
            <div className="months">
              {calendarWindow.months.map((month) => (
                <CalendarMonth key={month} month={month} predictions={predictions} trips={app.trips} holidays={holidayEvents} layers={app.visibleLayers} locale={locale} today={today} isMobile={isMobile} selectedDate={selectedDate} onSelectDate={(date) => setSelectedDate((selected) => selected === date ? null : date)} cycleLength={currentCycleLength} />
              ))}
            </div>
            <Legend locale={locale} layers={app.visibleLayers} hasCycle={hasCycleData} hasHolidays={!!app.holidayCountry} />

             <p className="privacy-note"><LockKeyhole size={14} />{t.privacy} {t.calendarFootnote}</p>
            {/* Subtle brand mark visible only in PNG export — quiet
                attribution that turns shared screenshots into discovery
                without putting the brand on the live UI. */}
            <div aria-hidden="true" className="export-brand">
              <MoonBloomLogo size={24} />
              <span>{t.appName}</span>
            </div>
          </div>
        </section>
      </div>
      {isMobile && drawerOpen && (
        <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrawerOpen(false); }}>
          <section aria-labelledby="drawer-title" aria-modal="true" className="mobile-drawer" ref={drawerRef} role="dialog">
            <header className="drawer-header">
              <h2 id="drawer-title">{t.managePanelTitle}</h2>
              <button aria-label={t.closePanel} onClick={() => setDrawerOpen(false)} ref={drawerCloseRef} type="button"><X size={18} /></button>
            </header>
            {renderPanelTabs("drawer")}
            {renderPanelContent("drawer")}
          </section>
        </div>
      )}
      {showExport && (
        <div className="modal-backdrop">
          <section aria-labelledby="export-title" aria-modal="true" className="modal" role="dialog">
            <h2 id="export-title">{t.exportTitle}</h2>
            <p>{t.exportPrivacy}</p>
            {exportError && <p className="modal-error">{t.exportError}</p>}
            <div className="modal-actions">
              <button type="button" onClick={() => setShowExport(false)}>{t.cancel}</button>
              <button className="primary-button" disabled={exporting} onClick={downloadImage} type="button">{t.download}</button>
            </div>
          </section>
        </div>
      )}
      {showDelete && (
        <div className="modal-backdrop">
          <section aria-labelledby="delete-title" aria-modal="true" className="modal" role="dialog">
            <h2 id="delete-title">{t.removeTitle}</h2>
            <p>{t.removeText}</p>
            <div className="modal-actions delete-options">
              <button type="button" onClick={() => setShowDelete(false)}>{t.cancel}</button>
              {(app.cycleSettings || app.periodEntries.length > 0) && <button type="button" onClick={clearCycleOnly}>{t.deleteCycle}</button>}
              <button className="danger" onClick={clearEverything} type="button">{t.deleteAll}</button>
            </div>
          </section>
        </div>
      )}
      <footer className="site-footer">
        <p className="site-footer-manifesto">{t.manifesto}</p>
        <div className="site-footer-meta">
          <a
            className="oss-badge"
            href="https://github.com/pietraszekl/kalendarzyk"
            rel="noopener noreferrer"
            target="_blank"
          >
            <span aria-hidden="true" className="oss-badge-dot" />
            {t.openSourceBadge}
          </a>
          <span className="footer-separator" aria-hidden="true">·</span>
          <span>{t.madeWith} <span aria-label="love">&#10084;&#65039;</span> {t.by}{" "}
            <a href="https://digitalhabitat.it/" target="_blank" rel="noopener noreferrer">Digital Habitat</a></span>
        </div>
      </footer>
    </main>
  );
}
