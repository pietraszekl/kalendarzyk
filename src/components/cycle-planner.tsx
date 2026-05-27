"use client";

import { toPng } from "html-to-image";
import {
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
  CycleLayer,
  CyclePrediction,
  Forecast,
  HorizonMonths,
  Layer,
  Locale,
  Trip,
  VisibleLayers,
  addDays,
  createCalendarWindow,
  defaultAppState,
  generateForecast,
  generateIcsCalendar,
  IcsEvent,
  isInRange,
  isTripVisible,
  layoutCalendarBars,
  layersForDate,
  migrateStoredState,
  parseDateKey,
  splitTrips,
  toDateKey,
  tripOverlapLayers,
  tripsForDate,
  validateCycleInput,
  validateTrip,
} from "@/lib/cycle";
import { copy, dateLocale, layerName } from "@/lib/i18n";

const STORAGE_KEY = "kalendarzyk.settings.v2";
const LEGACY_STORAGE_KEY = "kalendarzyk.settings.v1";
const LOCALE_KEY = "kalendarzyk.locale";
const PANEL_TAB_KEY = "kalendarzyk.panelTab";
const MOBILE_QUERY = "(max-width: 820px)";

type PanelTab = "summary" | "trips" | "cycle";

interface CycleFormValues {
  lastPeriodStart: string;
  cycleLengthDays: string;
  periodLengthDays: string;
}

interface TripFormValues {
  name: string;
  startDate: string;
  endDate: string;
}

const EMPTY_CYCLE_FORM: CycleFormValues = {
  lastPeriodStart: "",
  cycleLengthDays: "28",
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

function persistState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createTripId() {
  return globalThis.crypto?.randomUUID?.() ?? `trip-${Date.now()}`;
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
    .map((prediction) =>
      layer === "ovulation" ? prediction.ovulation : prediction.fertileStart,
    )
    .filter((date) => date >= today && date <= forecast.viewEnd)
    .sort();
  const start = starts[0];
  if (!start) return null;
  if (layer === "ovulation") return { start, end: start };
  const match = forecast.predictions.find(
    (prediction) => prediction.fertileStart === start,
  );
  return match ? { start, end: match.fertileEnd } : null;
}

function LayerIcon({ layer, size = 15 }: { layer: Layer; size?: number }) {
  if (layer === "period") return <Droplets size={size} />;
  if (layer === "fertile") return <Leaf size={size} />;
  if (layer === "ovulation") return <Sparkles size={size} />;
  return <Plane size={size} />;
}

function CalendarMonth({
  month,
  predictions,
  trips,
  layers,
  locale,
  today,
  isMobile,
  selectedDate,
  onSelectDate,
}: {
  month: string;
  predictions: CyclePrediction[];
  trips: Trip[];
  layers: VisibleLayers;
  locale: Locale;
  today: string;
  isMobile: boolean;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  const t = copy[locale];
  const date = parseDateKey(month);
  const leadingDays = (date.getDay() + 6) % 7;
  const daysInMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();
  const cells = Array.from({ length: leadingDays + daysInMonth }, (_, index) =>
    index < leadingDays ? null : addDays(month, index - leadingDays),
  );
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
  const title = formatDate(month, locale, { month: "long", year: "numeric" });
  const cycleEvents: CalendarBarEvent[] = predictions.flatMap(
    (prediction, index) => [
      {
        id: `period-${index}`,
        layer: "period",
        label: t.periodShort,
        startDate: prediction.periodStart,
        endDate: prediction.periodEnd,
      },
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
    ],
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
  ];
  const layout = layoutCalendarBars(month, visibleEvents);

  function renderSegment(segment: CalendarBarSegment) {
    const accessibleLabel =
      segment.layer === "trips"
        ? `${t.trips}: ${segment.label}`
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

  const isCurrent = today >= month && today <= addDays(month, daysInMonth - 1);
  const selectedEvents =
    selectedDate && selectedDate >= month && selectedDate <= addDays(month, daysInMonth - 1)
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
              {week.map((value, index) => {
                const isWeekend = index >= 5;
                if (!value) return <span className={`day blank${isWeekend ? " day-weekend" : ""}`} key={`blank-${weekIndex}-${index}`} />;
                const cycleLayers = layersForDate(value, predictions).filter(
                  (layer) => layers[layer],
                );
                const matchingTrips = layers.trips ? tripsForDate(value, trips) : [];
                const description = [
                  ...cycleLayers.map((layer) => layerName(locale, layer)),
                  ...matchingTrips.map((trip) => `${t.trips}: ${trip.name}`),
                ].join(", ");
                const isToday = value === today;
                return (
                  <button
                    aria-label={
                      description
                        ? `${formatDate(value, locale)}: ${description}`
                        : formatDate(value, locale)
                    }
                    aria-expanded={isMobile ? selectedDate === value : undefined}
                    className={`day${isToday ? " day-today" : ""}${isWeekend ? " day-weekend" : ""}`}
                    key={value}
                    onClick={() => isMobile && onSelectDate(value)}
                    type="button"
                  >
                    <span className="day-number">{parseDateKey(value).getDate()}</span>
                    {(layout.hiddenByDate[value]?.length ?? 0) > 0 && (
                      <small className="day-overflow">+{layout.hiddenByDate[value].length}</small>
                    )}
                  </button>
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
                {event.layer === "trips" ? event.label : layerName(locale, event.layer)}
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
}: {
  locale: Locale;
  layers: VisibleLayers;
  hasCycle: boolean;
}) {
  const listed: Layer[] = hasCycle
    ? ["period", "fertile", "ovulation", "trips"]
    : ["trips"];
  return (
    <ul className="legend" aria-label={copy[locale].layers}>
      {listed
        .filter((layer) => layers[layer])
        .map((layer) => (
          <li className={`legend-${layer}`} key={layer}>
            <LayerIcon layer={layer} size={12} />
            {layerName(locale, layer)}
          </li>
        ))}
    </ul>
  );
}

function TripItem({
  trip,
  locale,
  window,
  overlap,
  onEdit,
  onRemove,
}: {
  trip: Trip;
  locale: Locale;
  window: CalendarWindow;
  overlap: CycleLayer[];
  onEdit: (trip: Trip) => void;
  onRemove: (trip: Trip) => void;
}) {
  const t = copy[locale];
  return (
    <li className="trip-item">
      <div className="trip-details">
        <strong>{trip.name}</strong>
        <span>{formatRange(trip.startDate, trip.endDate, locale)}</span>
        {!isTripVisible(trip, window) && (
          <small className="outside-view">{t.outsideView}</small>
        )}
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

export default function CyclePlanner() {
  const today = useMemo(() => toDateKey(new Date()), []);
  const [ready, setReady] = useState(false);
  const [app, setApp] = useState<AppState | null>(null);
  const [cycleForm, setCycleForm] = useState<CycleFormValues>(EMPTY_CYCLE_FORM);
  const [tripForm, setTripForm] = useState<TripFormValues>(EMPTY_TRIP_FORM);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [cycleErrors, setCycleErrors] = useState<string[]>([]);
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
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      restored = migrateStoredState(
        current ? JSON.parse(current) : legacy ? JSON.parse(legacy) : null,
      );
      usedLegacyState = !current && !!legacy && !!restored;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    const initialState = restored ?? defaultAppState(fallbackLocale);
    const savedPanelTab = localStorage.getItem(PANEL_TAB_KEY);
    // Browser-only preferences are available only after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApp(initialState);
    if (isPanelTab(savedPanelTab)) setPanelTab(savedPanelTab);
    if (initialState.cycle) {
      setCycleForm({
        lastPeriodStart: initialState.cycle.lastPeriodStart,
        cycleLengthDays: String(initialState.cycle.cycleLengthDays),
        periodLengthDays: String(initialState.cycle.periodLengthDays),
      });
    }
    if (usedLegacyState) {
      persistState(initialState);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    setReady(true);
  }, []);

  const locale = app?.locale ?? "pl";
  const t = copy[locale];

  useEffect(() => {
    if (ready) document.documentElement.lang = locale;
  }, [locale, ready]);

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
    () => createCalendarWindow(today, app?.horizonMonths ?? 6),
    [app?.horizonMonths, today],
  );
  const forecast = useMemo(
    () =>
      app?.cycle
        ? generateForecast(app.cycle, today, app.horizonMonths)
        : null,
    [app, today],
  );
  const predictions = forecast?.predictions ?? [];
  const validation = app?.cycle ? validateCycleInput(app.cycle, today) : null;
  const categorizedTrips = splitTrips(app?.trips ?? [], today);
  const hasData = !!app?.cycle || (app?.trips.length ?? 0) > 0;

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
    const cycle = {
      lastPeriodStart: cycleForm.lastPeriodStart,
      cycleLengthDays: Number(cycleForm.cycleLengthDays),
      periodLengthDays: Number(cycleForm.periodLengthDays),
    };
    const result = validateCycleInput(cycle, today);
    setCycleErrors(result.errors);
    if (result.errors.length) return;
    updateApp((previous) => ({ ...previous, cycle }));
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

  function updateSettings(patch: Partial<Pick<AppState, "horizonMonths" | "visibleLayers">>) {
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

  function clearCycleOnly() {
    updateApp((previous) => ({ ...previous, cycle: null }));
    setCycleForm(EMPTY_CYCLE_FORM);
    setCycleErrors([]);
    setShowDelete(false);
  }

  function clearEverything() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(LOCALE_KEY);
    localStorage.removeItem(PANEL_TAB_KEY);
    const reset = defaultAppState(detectLocale());
    setApp(reset);
    setCycleForm(EMPTY_CYCLE_FORM);
    setTripForm(EMPTY_TRIP_FORM);
    setEditingTripId(null);
    setCycleErrors([]);
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
      link.download = `kalendarzyk-${today}.png`;
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
          uid: `period-${prediction.periodStart}@kalendarzyk`,
          summary: t.period,
          startDate: prediction.periodStart,
          endDate: prediction.periodEnd,
        });
        events.push({
          uid: `fertile-${prediction.fertileStart}@kalendarzyk`,
          summary: t.fertile,
          startDate: prediction.fertileStart,
          endDate: prediction.fertileEnd,
        });
        events.push({
          uid: `ovulation-${prediction.ovulation}@kalendarzyk`,
          summary: t.ovulation,
          startDate: prediction.ovulation,
          endDate: prediction.ovulation,
        });
      }
    }
    for (const trip of app.trips) {
      events.push({
        uid: `trip-${trip.id}@kalendarzyk`,
        summary: `${t.trips}: ${trip.name}`,
        startDate: trip.startDate,
        endDate: trip.endDate,
      });
    }
    const ics = generateIcsCalendar(events);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.download = `kalendarzyk-${today}.ics`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (!ready || !app) return <main className="loading-shell" aria-label="Kalendarzyk" />;

  const nextPeriod = forecast?.upcoming[0] ?? null;
  const nextOvulation = forecast ? nextEvent(forecast, today, "ovulation") : null;
  const nextFertile = forecast ? nextEvent(forecast, today, "fertile") : null;

  function renderCyclePanel() {
    return (
      <aside className="form-panel">
        <div className="section-heading">
          <h2>{t.formTitle}</h2>
          <p>{t.formIntro}</p>
        </div>
        <form onSubmit={submitCycle} noValidate>
          <label>
            {t.lastPeriod}
            <input type="date" max={today} value={cycleForm.lastPeriodStart} onChange={(event) => setCycleForm({ ...cycleForm, lastPeriodStart: event.target.value })} />
          </label>
          <div className="two-inputs number-inputs">
            <label>
              {t.cycleLength}
              <span className="number-field">
                <input type="number" min={15} max={90} value={cycleForm.cycleLengthDays} onChange={(event) => setCycleForm({ ...cycleForm, cycleLengthDays: event.target.value })} />
                <small>{t.days}</small>
              </span>
            </label>
            <label>
              {t.periodLength}
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
          <button className="primary-button" type="submit">{forecast ? t.update : t.calculate}</button>
        </form>
        <p className="privacy-note"><LockKeyhole size={15} />{t.privacy}</p>
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
                <TripItem key={trip.id} trip={trip} locale={locale} window={calendarWindow} overlap={forecast ? tripOverlapLayers(trip, predictions) : []} onEdit={editTrip} onRemove={removeTrip} />
              ))}
            </ul>
          ) : (
            <p className="no-trips">{t.noTrips}</p>
          )}
          {categorizedTrips.past.length > 0 && (
            <details className="past-trips">
              <summary><ChevronDown size={15} />{t.pastTrips} ({categorizedTrips.past.length})</summary>
              <ul className="trip-list">
                {categorizedTrips.past.map((trip) => (
                  <TripItem key={trip.id} trip={trip} locale={locale} window={calendarWindow} overlap={forecast ? tripOverlapLayers(trip, predictions) : []} onEdit={editTrip} onRemove={removeTrip} />
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

  function renderSummaryPanel() {
    const current = app!;
    return (
      <section className="summary-panel">
        <div className="summary-intro">
          <p className="eyebrow">{t.eyebrow}</p>
          <h2>{t.appName}</h2>
          <p>{t.subtitle}</p>
        </div>
        <fieldset>
          <legend>{t.showMonths}</legend>
          <div className="segmented">
            {([6, 12] as HorizonMonths[]).map((months) => (
              <button aria-pressed={current.horizonMonths === months} className={current.horizonMonths === months ? "active" : ""} key={months} onClick={() => updateSettings({ horizonMonths: months })} type="button">
                {months === 6 ? t.months6 : t.months12}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="layer-toggles">
          <legend>{t.layers}</legend>
          {(current.cycle ? (["period", "fertile", "ovulation", "trips"] as Layer[]) : (["trips"] as Layer[])).map((layer) => (
            <label className={`toggle toggle-${layer}`} key={layer}>
              <input checked={current.visibleLayers[layer]} onChange={() => toggleLayer(layer)} type="checkbox" />
              <LayerIcon layer={layer} size={14} />
              {layerName(locale, layer)}
            </label>
          ))}
        </fieldset>
        {forecast ? (
          <>
            <div className="summary-highlights">
              <article><Droplets size={17} /><span>{t.nextPeriod}</span><strong>{nextPeriod ? formatRange(nextPeriod.periodStart, nextPeriod.periodEnd, locale) : "-"}</strong></article>
              <article><Sparkles size={17} /><span>{t.nextOvulation}</span><strong>{nextOvulation ? formatDate(nextOvulation.start, locale) : "-"}</strong></article>
              <article><Leaf size={17} /><span>{t.nextFertile}</span><strong>{nextFertile ? formatRange(nextFertile.start, nextFertile.end, locale) : "-"}</strong></article>
            </div>
            {validation?.atypicalCycle && <div className="warning" role="note"><Info size={18} /><p>{t.atypical}</p></div>}
            <div className="disclaimer" role="note"><Info size={18} /><div><strong>{t.disclaimerTitle}</strong><p>{t.disclaimer}</p></div></div>
          </>
        ) : (
          <div className="calendar-note" role="note"><Plane size={18} /><div><strong>{t.noCycleTitle}</strong><p>{t.noCycleText}</p><button className="cycle-action" onClick={goToCycle} type="button">{t.addCycleDetails}</button></div></div>
        )}
        {hasData && (
          <div className="actions-panel">
            <button type="button" onClick={() => setShowExport(true)}><Download size={16} />{t.export}</button>
            <button type="button" onClick={downloadIcs}><CalendarPlus size={16} />{t.exportIcs}</button>
            <button className="delete-button" type="button" onClick={() => setShowDelete(true)}><Trash2 size={16} />{t.delete}</button>
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
            <CalendarDays size={18} />
          </span>
          <strong>{t.appName}</strong>
        </div>
        <label className="language-picker">
          <span>{t.language}</span>
          <select aria-label={t.language} value={locale} onChange={(event) => changeLocale(event.target.value as Locale)}>
            <option value="pl">{t.polish}</option>
            <option value="en">{t.english}</option>
          </select>
        </label>
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
            <button className="mobile-manage-button" onClick={() => openDrawer()} type="button" aria-label={t.managePlans}><Settings2 size={18} /><span>{t.managePlans}</span></button>
          </div>
          <div className="forecast-report" ref={reportRef}>
            <div aria-hidden="true" className="capture-header"><h2>{t.calendar}</h2></div>
            <div className="months">
              {calendarWindow.months.map((month) => (
                <CalendarMonth key={month} month={month} predictions={predictions} trips={app.trips} layers={app.visibleLayers} locale={locale} today={today} isMobile={isMobile} selectedDate={selectedDate} onSelectDate={(date) => setSelectedDate((selected) => selected === date ? null : date)} />
              ))}
            </div>
            <Legend locale={locale} layers={app.visibleLayers} hasCycle={!!app.cycle} />
            <p className="calendar-footnote"><LockKeyhole size={14} />{t.calendarFootnote}</p>
          </div>
        </section>
      </div>
      {isMobile && drawerOpen && (
        <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrawerOpen(false); }}>
          <section aria-labelledby="drawer-title" aria-modal="true" className="mobile-drawer" ref={drawerRef} role="dialog">
            <header className="drawer-header">
              <h2 id="drawer-title">{t.managePanelTitle}</h2>
              <button aria-label={t.closePanel} onClick={() => setDrawerOpen(false)} ref={drawerCloseRef} type="button"><X size={19} /></button>
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
              {app.cycle && <button type="button" onClick={clearCycleOnly}>{t.deleteCycle}</button>}
              <button className="danger" onClick={clearEverything} type="button">{t.deleteAll}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
