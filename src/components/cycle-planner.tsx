"use client";

import { toPng } from "html-to-image";
import {
  CalendarDays,
  ChevronDown,
  Download,
  Droplets,
  Info,
  Leaf,
  LockKeyhole,
  Pencil,
  Plane,
  Sparkles,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
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
  isTripVisible,
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

function detectLocale(): Locale {
  return navigator.language.toLowerCase().startsWith("pl") ? "pl" : "en";
}

function persistState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createTripId() {
  return globalThis.crypto?.randomUUID?.() ?? `trip-${Date.now()}`;
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
}: {
  month: string;
  predictions: CyclePrediction[];
  trips: Trip[];
  layers: VisibleLayers;
  locale: Locale;
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
  const title = formatDate(month, locale, { month: "long", year: "numeric" });

  return (
    <section className="month-card" aria-label={title}>
      <h4>{title}</h4>
      <div className="calendar-grid weekday-row" aria-hidden="true">
        {t.weekdays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((value, index) => {
          if (!value) return <span className="day blank" key={`blank-${index}`} />;
          const cycleLayers = layersForDate(value, predictions).filter(
            (layer) => layers[layer],
          );
          const matchingTrips = layers.trips ? tripsForDate(value, trips) : [];
          const active: Layer[] = matchingTrips.length
            ? [...cycleLayers, "trips"]
            : cycleLayers;
          const description = [
            ...cycleLayers.map((layer) => layerName(locale, layer)),
            ...matchingTrips.map((trip) => `${t.trips}: ${trip.name}`),
          ].join(", ");
          return (
            <span
              aria-label={
                description
                  ? `${formatDate(value, locale)}: ${description}`
                  : formatDate(value, locale)
              }
              className={`day ${active.map((layer) => `is-${layer}`).join(" ")}`}
              key={value}
            >
              {parseDateKey(value).getDate()}
              {cycleLayers.includes("ovulation") && <i aria-hidden="true" />}
              {matchingTrips.length > 0 && <b aria-hidden="true" />}
            </span>
          );
        })}
      </div>
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
            <LayerIcon layer={layer} />
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
  const reportRef = useRef<HTMLDivElement>(null);

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
    // Browser-only preferences are available only after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApp(initialState);
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

  const window = useMemo(
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
  const visibleTrips = (app?.trips ?? []).filter((trip) =>
    isTripVisible(trip, window),
  );
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
  }

  function editTrip(trip: Trip) {
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
    const reset = defaultAppState(detectLocale());
    setApp(reset);
    setCycleForm(EMPTY_CYCLE_FORM);
    setTripForm(EMPTY_TRIP_FORM);
    setEditingTripId(null);
    setCycleErrors([]);
    setTripErrors([]);
    setShowDelete(false);
  }

  async function downloadImage() {
    if (!reportRef.current) return;
    setExporting(true);
    setExportError(false);
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
      setExporting(false);
    }
  }

  if (!ready || !app) return <main className="loading-shell" aria-label="Kalendarzyk" />;

  const nextPeriod = forecast?.upcoming[0] ?? null;
  const nextOvulation = forecast ? nextEvent(forecast, today, "ovulation") : null;
  const nextFertile = forecast ? nextEvent(forecast, today, "fertile") : null;

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
      <section className="intro">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </section>
      <div className="workspace">
        <div className="sidebar">
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
              <div className="two-inputs">
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
              <button className="primary-button" type="submit">{app.cycle ? t.update : t.calculate}</button>
            </form>
            <p className="privacy-note"><LockKeyhole size={16} />{t.privacy}</p>
          </aside>
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
              <div className="two-inputs">
                <label>
                  {t.tripStart}
                  <input type="date" min={editingTripId ? undefined : today} value={tripForm.startDate} onChange={(event) => setTripForm({ ...tripForm, startDate: event.target.value })} />
                </label>
                <label>
                  {t.tripEnd}
                  <input type="date" min={tripForm.startDate || today} value={tripForm.endDate} onChange={(event) => setTripForm({ ...tripForm, endDate: event.target.value })} />
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
              {categorizedTrips.planned.length === 0 ? (
                <p className="no-trips">{t.noTrips}</p>
              ) : (
                <ul className="trip-list">
                  {categorizedTrips.planned.map((trip) => (
                    <TripItem key={trip.id} trip={trip} locale={locale} window={window} overlap={forecast ? tripOverlapLayers(trip, predictions) : []} onEdit={editTrip} onRemove={removeTrip} />
                  ))}
                </ul>
              )}
            </section>
            {categorizedTrips.past.length > 0 && (
              <details className="past-trips">
                <summary><ChevronDown size={15} />{t.pastTrips} ({categorizedTrips.past.length})</summary>
                <ul className="trip-list">
                  {categorizedTrips.past.map((trip) => (
                    <TripItem key={trip.id} trip={trip} locale={locale} window={window} overlap={forecast ? tripOverlapLayers(trip, predictions) : []} onEdit={editTrip} onRemove={removeTrip} />
                  ))}
                </ul>
              </details>
            )}
          </aside>
        </div>
        <section className="results" aria-live="polite">
          <div className="result-toolbar">
            <div>
              <p className="eyebrow">{hasData ? t.saved : t.calendar}</p>
              <h2>{app.cycle ? t.forecastTitle : t.plannerTitle}</h2>
            </div>
            <div className="toolbar-actions">
              {hasData && <button type="button" onClick={() => setShowExport(true)}><Download size={16} />{t.export}</button>}
              {hasData && <button className="delete-button" type="button" onClick={() => setShowDelete(true)}><Trash2 size={16} />{t.delete}</button>}
            </div>
          </div>
          <div className="controls">
            <fieldset>
              <legend>{t.showMonths}</legend>
              <div className="segmented">
                {([6, 12] as HorizonMonths[]).map((months) => (
                  <button aria-pressed={app.horizonMonths === months} className={app.horizonMonths === months ? "active" : ""} key={months} onClick={() => updateSettings({ horizonMonths: months })} type="button">
                    {months === 6 ? t.months6 : t.months12}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="layer-toggles">
              <legend>{t.layers}</legend>
              {(app.cycle ? (["period", "fertile", "ovulation", "trips"] as Layer[]) : (["trips"] as Layer[])).map((layer) => (
                <label className={`toggle toggle-${layer}`} key={layer}>
                  <input checked={app.visibleLayers[layer]} onChange={() => toggleLayer(layer)} type="checkbox" />
                  {layerName(locale, layer)}
                </label>
              ))}
            </fieldset>
          </div>
          <div className="forecast-report" ref={reportRef}>
            <div className="export-header">
              <strong>{t.appName}</strong>
              <span>{formatRange(window.viewStart, window.viewEnd, locale)}</span>
            </div>
            {forecast ? (
              <>
                <div className="highlights">
                  {app.visibleLayers.period && <article><Droplets size={18} /><span>{t.nextPeriod}</span><strong>{nextPeriod ? formatRange(nextPeriod.periodStart, nextPeriod.periodEnd, locale) : "-"}</strong></article>}
                  {app.visibleLayers.ovulation && <article><Sparkles size={18} /><span>{t.nextOvulation}</span><strong>{nextOvulation ? formatDate(nextOvulation.start, locale) : "-"}</strong></article>}
                  {app.visibleLayers.fertile && <article><Leaf size={18} /><span>{t.nextFertile}</span><strong>{nextFertile ? formatRange(nextFertile.start, nextFertile.end, locale) : "-"}</strong></article>}
                </div>
                {validation?.atypicalCycle && <div className="warning" role="note"><Info size={18} /><p>{t.atypical}</p></div>}
                <div className="disclaimer" role="note"><Info size={18} /><div><strong>{t.disclaimerTitle}</strong><p>{t.disclaimer}</p></div></div>
              </>
            ) : (
              <div className="calendar-note" role="note"><Plane size={18} /><div><strong>{t.noCycleTitle}</strong><p>{t.noCycleText}</p></div></div>
            )}
            <div className="calendar-header">
              <h3>{t.calendar}</h3>
              <Legend locale={locale} layers={app.visibleLayers} hasCycle={!!app.cycle} />
            </div>
            <div className="months">
              {window.months.map((month) => (
                <CalendarMonth key={month} month={month} predictions={predictions} trips={app.trips} layers={app.visibleLayers} locale={locale} />
              ))}
            </div>
            {app.visibleLayers.trips && visibleTrips.length > 0 && (
              <section className="export-trips">
                <h3>{t.plannedTrips}</h3>
                <ul>
                  {visibleTrips.map((trip) => <li key={trip.id}><strong>{trip.name}</strong><span>{formatRange(trip.startDate, trip.endDate, locale)}</span></li>)}
                </ul>
              </section>
            )}
            {forecast && (
              <section className="upcoming">
                <h3>{t.upcoming}</h3>
                {!app.visibleLayers.period ? <p>{t.noPeriodLayer}</p> : (
                  <ol>{forecast.upcoming.map((prediction) => <li key={prediction.periodStart}><span>{formatDate(prediction.periodStart, locale, { month: "long", year: "numeric" })}</span><strong>{formatRange(prediction.periodStart, prediction.periodEnd, locale)}</strong></li>)}</ol>
                )}
              </section>
            )}
            <p className="export-footnote"><LockKeyhole size={14} />{forecast ? t.disclaimer : t.travelOnlyNote}</p>
          </div>
        </section>
      </div>
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
