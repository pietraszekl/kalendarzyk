export type Locale = "pl" | "en";
export type HorizonMonths = 2 | 4 | 8 | 12;
export type PastMonths = 0 | 1 | 2 | 3;
export type CycleLayer = "period" | "fertile" | "ovulation";
export type Layer = CycleLayer | "trips" | "holidays";

export type VisibleLayers = Record<Layer, boolean>;
type LegacyVisibleLayers = Record<CycleLayer, boolean>;

export interface CycleInput {
  lastPeriodStart: string;
  cycleLengthDays: number;
  periodLengthDays: number;
}

export interface CycleSettings {
  cycleLengthDays: number;
  periodLengthDays: number;
}

export interface PeriodEntry {
  id: string;
  startDate: string;
  periodLengthDays: number;
}

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface LegacySettings extends CycleInput {
  storageVersion: 1;
  locale: Locale;
  horizonMonths: HorizonMonths;
  visibleLayers: LegacyVisibleLayers;
}

export interface LegacyAppStateV2 {
  storageVersion: 2;
  cycle: CycleInput | null;
  trips: Trip[];
  locale: Locale;
  horizonMonths: HorizonMonths;
  visibleLayers: VisibleLayers;
}

export interface LegacyAppStateV3 {
  storageVersion: 3;
  cycleSettings: CycleSettings | null;
  periodEntries: PeriodEntry[];
  trips: Trip[];
  locale: Locale;
  horizonMonths: HorizonMonths;
  pastMonths: PastMonths;
  visibleLayers: Omit<VisibleLayers, "holidays">;
}

export interface AppState {
  storageVersion: 4;
  cycleSettings: CycleSettings | null;
  periodEntries: PeriodEntry[];
  trips: Trip[];
  locale: Locale;
  horizonMonths: HorizonMonths;
  pastMonths: PastMonths;
  holidayCountry: string | null;
  visibleLayers: VisibleLayers;
}

export interface CyclePrediction {
  periodStart: string;
  periodEnd: string;
  ovulation: string;
  fertileStart: string;
  fertileEnd: string;
  observed?: boolean;
}

export interface CalendarWindow {
  viewStart: string;
  viewEnd: string;
  months: string[];
}

export interface CalendarBarEvent {
  id: string;
  layer: Layer;
  label: string;
  startDate: string;
  endDate: string;
}

export interface HolidayCountry {
  code: string;
  name: string;
}

export interface HolidayEvent {
  id: string;
  countryCode: string;
  name: string;
  date: string;
  type: "public" | "bank";
}

export type ForecastConfidence = "high" | "medium" | "low";
export type PreparationHint =
  | "periodKit"
  | "comfortItems"
  | "backupSupplies"
  | "travelTiming";

export interface TripReadiness {
  tripId: string;
  cycleOverlaps: CycleLayer[];
  observedPeriodOverlap: boolean;
  predictedPeriodOverlap: boolean;
  holidayOverlaps: HolidayEvent[];
  forecastConfidence: ForecastConfidence;
  preparationHints: PreparationHint[];
}

export interface CalendarBarSegment extends CalendarBarEvent {
  week: number;
  column: number;
  span: number;
  lane: number;
  showLabel: boolean;
  startsRange: boolean;
  endsRange: boolean;
}

export interface CalendarBarLayout {
  segments: CalendarBarSegment[];
  hiddenByDate: Record<string, CalendarBarEvent[]>;
}

export const MAX_VISIBLE_CALENDAR_LANES = 4;

export interface Forecast extends CalendarWindow {
  predictions: CyclePrediction[];
  upcoming: CyclePrediction[];
}

export interface ValidationResult {
  errors: string[];
  atypicalCycle: boolean;
}

export interface PeriodEntryValidationResult {
  errors: string[];
}

export interface TripValidationResult {
  errors: string[];
}

export const DEFAULT_LAYERS: VisibleLayers = {
  period: true,
  fertile: true,
  ovulation: true,
  trips: true,
  holidays: true,
};

export function defaultAppState(locale: Locale): AppState {
  return {
    storageVersion: 4,
    cycleSettings: null,
    periodEntries: [],
    trips: [],
    locale,
    horizonMonths: 4,
    pastMonths: 0,
    holidayCountry: locale === "pl" ? "PL" : null,
    visibleLayers: { ...DEFAULT_LAYERS },
  };
}

export function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(value: string, days: number): string {
  const date = parseDateKey(value);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function addMonths(value: string, months: number): string {
  const date = parseDateKey(value);
  date.setMonth(date.getMonth() + months);
  return toDateKey(date);
}

export function startOfMonth(value: string): string {
  const date = parseDateKey(value);
  date.setDate(1);
  return toDateKey(date);
}

export function endOfMonth(value: string): string {
  const date = parseDateKey(value);
  date.setMonth(date.getMonth() + 1, 0);
  return toDateKey(date);
}

export function monthKeys(
  today: string,
  horizon: HorizonMonths,
  pastMonths: PastMonths = 0,
): string[] {
  const first = addMonths(startOfMonth(today), -pastMonths);
  return Array.from(
    { length: horizon + pastMonths },
    (_, index) => addMonths(first, index),
  );
}

export function createCalendarWindow(
  today: string,
  horizon: HorizonMonths,
  pastMonths: PastMonths = 0,
): CalendarWindow {
  const months = monthKeys(today, horizon, pastMonths);
  return {
    months,
    viewStart: months[0],
    viewEnd: endOfMonth(months[months.length - 1]),
  };
}

export function isInRange(value: string, start: string, end: string): boolean {
  return value >= start && value <= end;
}

function daysBetween(start: string, end: string): number {
  return Math.round(
    (parseDateKey(end).getTime() - parseDateKey(start).getTime()) /
      (24 * 60 * 60 * 1000),
  );
}

function rangesIntersect(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
): boolean {
  return firstStart <= secondEnd && secondStart <= firstEnd;
}

export function validateCycleInput(
  input: CycleInput,
  today: string,
): ValidationResult {
  const errors: string[] = [];
  if (!input.lastPeriodStart) errors.push("lastPeriodRequired");
  if (input.lastPeriodStart && input.lastPeriodStart > today) {
    errors.push("futureStart");
  }
  if (
    !Number.isInteger(input.cycleLengthDays) ||
    input.cycleLengthDays < 15 ||
    input.cycleLengthDays > 90
  ) {
    errors.push("cycleRange");
  }
  if (
    !Number.isInteger(input.periodLengthDays) ||
    input.periodLengthDays < 1 ||
    input.periodLengthDays > 14
  ) {
    errors.push("periodRange");
  }
  if (input.periodLengthDays > input.cycleLengthDays) {
    errors.push("periodLongerThanCycle");
  }
  return {
    errors,
    atypicalCycle:
      input.cycleLengthDays < 21 || input.cycleLengthDays > 35,
  };
}

export function validateCycleSettings(
  settings: CycleSettings,
): ValidationResult {
  const errors: string[] = [];
  if (
    !Number.isInteger(settings.cycleLengthDays) ||
    settings.cycleLengthDays < 15 ||
    settings.cycleLengthDays > 90
  ) {
    errors.push("cycleRange");
  }
  if (
    !Number.isInteger(settings.periodLengthDays) ||
    settings.periodLengthDays < 1 ||
    settings.periodLengthDays > 14
  ) {
    errors.push("periodRange");
  }
  if (settings.periodLengthDays > settings.cycleLengthDays) {
    errors.push("periodLongerThanCycle");
  }
  return {
    errors,
    atypicalCycle:
      settings.cycleLengthDays < 21 || settings.cycleLengthDays > 35,
  };
}

export function validatePeriodEntry(
  entry: Pick<PeriodEntry, "startDate" | "periodLengthDays">,
  today: string,
  existingEntries: PeriodEntry[] = [],
  editingId: string | null = null,
  allowOldStart = false,
): PeriodEntryValidationResult {
  const errors: string[] = [];
  if (!entry.startDate) errors.push("periodStartRequired");
  if (entry.startDate && entry.startDate > today) errors.push("futureStart");
  if (
    entry.startDate &&
    !allowOldStart &&
    entry.startDate < addMonths(today, -3)
  ) {
    errors.push("periodStartTooOld");
  }
  if (
    !Number.isInteger(entry.periodLengthDays) ||
    entry.periodLengthDays < 1 ||
    entry.periodLengthDays > 14
  ) {
    errors.push("periodRange");
  }
  if (
    entry.startDate &&
    existingEntries.some(
      (stored) =>
        stored.startDate === entry.startDate && stored.id !== editingId,
    )
  ) {
    errors.push("periodDuplicate");
  }
  return { errors };
}

/**
 * Maximum number of characters allowed in a trip name. Bounded to prevent
 * a single ICS line from blowing past the RFC limit (even after folding),
 * to keep PNG export memory predictable, and to avoid layout DoS in lists.
 */
export const TRIP_NAME_MAX_LENGTH = 200;

/**
 * Maximum number of trips and period entries we will keep in storage.
 * Tampered or runaway data is silently truncated on load (see
 * `migrateStoredState`) so the app stays responsive on hydration.
 */
export const MAX_TRIPS = 1000;
export const MAX_PERIOD_ENTRIES = 1000;

export function validateTrip(
  trip: Pick<Trip, "name" | "startDate" | "endDate">,
  today: string,
  allowPastStart = false,
): TripValidationResult {
  const errors: string[] = [];
  const trimmedName = trip.name.trim();
  if (!trimmedName) errors.push("tripNameRequired");
  if (trimmedName.length > TRIP_NAME_MAX_LENGTH) errors.push("tripNameTooLong");
  if (!trip.startDate) errors.push("tripStartRequired");
  if (!trip.endDate) errors.push("tripEndRequired");
  if (!allowPastStart && trip.startDate && trip.startDate < today) {
    errors.push("tripStartPast");
  }
  if (
    trip.startDate &&
    trip.endDate &&
    trip.endDate < trip.startDate
  ) {
    errors.push("tripEndBeforeStart");
  }
  return { errors };
}

export function sortPeriodEntries(entries: PeriodEntry[]): PeriodEntry[] {
  return [...entries].sort((first, second) =>
    first.startDate.localeCompare(second.startDate),
  );
}

export function effectiveCycleLength(
  settings: CycleSettings,
  entries: PeriodEntry[],
): number {
  const sorted = sortPeriodEntries(entries);
  const intervals: number[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const interval = daysBetween(
      sorted[index - 1].startDate,
      sorted[index].startDate,
    );
    if (interval >= 15 && interval <= 90) intervals.push(interval);
  }
  if (intervals.length === 0) return settings.cycleLengthDays;
  return Math.round(
    intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length,
  );
}

export function pastMonthsForDate(
  date: string,
  today: string,
): PastMonths {
  const current = parseDateKey(startOfMonth(today));
  const target = parseDateKey(startOfMonth(date));
  const diff =
    (current.getFullYear() - target.getFullYear()) * 12 +
    current.getMonth() -
    target.getMonth();
  if (diff <= 0) return 0;
  if (diff >= 3) return 3;
  return diff as PastMonths;
}

export function generateForecast(
  settings: CycleSettings,
  entries: PeriodEntry[],
  today: string,
  horizon: HorizonMonths,
  pastMonths: PastMonths = 0,
): Forecast {
  const window = createCalendarWindow(today, horizon, pastMonths);
  const predictions: CyclePrediction[] = [];
  const sortedEntries = sortPeriodEntries(entries);
  const cycleLength = effectiveCycleLength(settings, sortedEntries);

  for (let index = 0; index < sortedEntries.length; index += 1) {
    const entry = sortedEntries[index];
    const nextStart =
      sortedEntries[index + 1]?.startDate ??
      addDays(entry.startDate, cycleLength);
    const prediction: CyclePrediction = {
      periodStart: entry.startDate,
      periodEnd: addDays(entry.startDate, entry.periodLengthDays - 1),
      ovulation: addDays(nextStart, -14),
      fertileStart: addDays(nextStart, -19),
      fertileEnd: addDays(nextStart, -13),
      observed: true,
    };
    if (
      rangesIntersect(
        prediction.periodStart,
        prediction.periodEnd,
        window.viewStart,
        window.viewEnd,
      )
    ) {
      predictions.push(prediction);
    }
  }

  const latestEntry = sortedEntries[sortedEntries.length - 1];
  if (!latestEntry) return { ...window, predictions, upcoming: [] };

  let periodStart = addDays(latestEntry.startDate, cycleLength);
  const periodLength = latestEntry.periodLengthDays || settings.periodLengthDays;

  for (let iteration = 0; iteration < 3000; iteration += 1) {
    const nextPeriodStart = addDays(periodStart, cycleLength);
    const prediction: CyclePrediction = {
      periodStart,
      periodEnd: addDays(periodStart, periodLength - 1),
      ovulation: addDays(nextPeriodStart, -14),
      fertileStart: addDays(nextPeriodStart, -19),
      fertileEnd: addDays(nextPeriodStart, -13),
    };
    const appearsInView =
      rangesIntersect(
        prediction.periodStart,
        prediction.periodEnd,
        window.viewStart,
        window.viewEnd,
      ) ||
      rangesIntersect(
        prediction.fertileStart,
        prediction.fertileEnd,
        window.viewStart,
        window.viewEnd,
      );

    if (appearsInView) predictions.push(prediction);
    if (periodStart > window.viewEnd) break;
    periodStart = nextPeriodStart;
  }

  const upcoming = predictions.filter(
    (prediction) =>
      !prediction.observed &&
      prediction.periodStart > today &&
      prediction.periodStart <= window.viewEnd,
  );

  return { ...window, predictions, upcoming };
}

export function layersForDate(
  value: string,
  predictions: CyclePrediction[],
): CycleLayer[] {
  const layers: CycleLayer[] = [];
  if (
    predictions.some((prediction) =>
      isInRange(value, prediction.periodStart, prediction.periodEnd),
    )
  ) {
    layers.push("period");
  }
  if (
    predictions.some((prediction) =>
      !prediction.observed &&
      isInRange(value, prediction.fertileStart, prediction.fertileEnd),
    )
  ) {
    layers.push("fertile");
  }
  if (
    predictions.some(
      (prediction) => !prediction.observed && prediction.ovulation === value,
    )
  ) {
    layers.push("ovulation");
  }
  return layers;
}

export function tripsForDate(value: string, trips: Trip[]): Trip[] {
  return trips.filter((trip) => isInRange(value, trip.startDate, trip.endDate));
}

export function segmentCalendarBar(
  month: string,
  event: CalendarBarEvent,
  lane = 0,
): CalendarBarSegment[] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  if (!rangesIntersect(event.startDate, event.endDate, monthStart, monthEnd)) {
    return [];
  }

  const visibleStart =
    event.startDate > monthStart ? event.startDate : monthStart;
  const visibleEnd = event.endDate < monthEnd ? event.endDate : monthEnd;
  const leadingDays = (parseDateKey(monthStart).getDay() + 6) % 7;
  const firstCell = leadingDays + daysBetween(monthStart, visibleStart);
  const lastCell = leadingDays + daysBetween(monthStart, visibleEnd);
  const segments: CalendarBarSegment[] = [];

  for (
    let startCell = firstCell;
    startCell <= lastCell;
    startCell = Math.floor(startCell / 7) * 7 + 7
  ) {
    const endCell = Math.min(lastCell, Math.floor(startCell / 7) * 7 + 6);
    const segmentStart = addDays(
      monthStart,
      startCell - leadingDays,
    );
    const segmentEnd = addDays(monthStart, endCell - leadingDays);
    segments.push({
      ...event,
      week: Math.floor(startCell / 7),
      column: (startCell % 7) + 1,
      span: endCell - startCell + 1,
      lane,
      showLabel: startCell === firstCell,
      startsRange: segmentStart === event.startDate,
      endsRange: segmentEnd === event.endDate,
    });
  }

  return segments;
}

export function packCalendarBarLanes(
  month: string,
  events: CalendarBarEvent[],
): CalendarBarSegment[] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const laneEnds: string[] = [];
  const visibleEvents = [...events]
    .filter((event) =>
      rangesIntersect(event.startDate, event.endDate, monthStart, monthEnd),
    )
    .sort(
      (first, second) =>
        first.startDate.localeCompare(second.startDate) ||
        first.endDate.localeCompare(second.endDate) ||
        first.id.localeCompare(second.id),
    );

  return visibleEvents.flatMap((event) => {
    const clippedStart =
      event.startDate > monthStart ? event.startDate : monthStart;
    const clippedEnd = event.endDate < monthEnd ? event.endDate : monthEnd;
    let lane = laneEnds.findIndex((end) => end < clippedStart);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(clippedEnd);
    } else {
      laneEnds[lane] = clippedEnd;
    }
    return segmentCalendarBar(month, event, lane);
  });
}

const BAR_LAYER_PRIORITY: Record<Layer, number> = {
  period: 0,
  fertile: 1,
  ovulation: 2,
  trips: 3,
  holidays: 4,
};

export function layoutCalendarBars(
  month: string,
  events: CalendarBarEvent[],
  maxLanes = MAX_VISIBLE_CALENDAR_LANES,
): CalendarBarLayout {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const laneEnds: string[] = [];
  const hiddenByDate: Record<string, CalendarBarEvent[]> = {};
  const sorted = [...events]
    .filter((event) =>
      rangesIntersect(event.startDate, event.endDate, monthStart, monthEnd),
    )
    .sort(
      (first, second) =>
        BAR_LAYER_PRIORITY[first.layer] - BAR_LAYER_PRIORITY[second.layer] ||
        first.startDate.localeCompare(second.startDate) ||
        first.endDate.localeCompare(second.endDate) ||
        first.label.localeCompare(second.label) ||
        first.id.localeCompare(second.id),
    );

  const segments = sorted.flatMap((event) => {
    const clippedStart =
      event.startDate > monthStart ? event.startDate : monthStart;
    const clippedEnd = event.endDate < monthEnd ? event.endDate : monthEnd;
    let lane = laneEnds.findIndex((end) => end < clippedStart);

    if (lane === -1 && laneEnds.length < maxLanes) {
      lane = laneEnds.length;
      laneEnds.push(clippedEnd);
    } else if (lane !== -1) {
      laneEnds[lane] = clippedEnd;
    }

    if (lane === -1) {
      for (
        let date = clippedStart;
        date <= clippedEnd;
        date = addDays(date, 1)
      ) {
        hiddenByDate[date] = [...(hiddenByDate[date] ?? []), event];
      }
      return [];
    }

    return segmentCalendarBar(month, event, lane);
  });

  return { segments, hiddenByDate };
}

export function sortTrips(trips: Trip[]): Trip[] {
  return [...trips].sort(
    (first, second) =>
      first.startDate.localeCompare(second.startDate) ||
      first.endDate.localeCompare(second.endDate) ||
      first.name.localeCompare(second.name),
  );
}

export function splitTrips(
  trips: Trip[],
  today: string,
): { planned: Trip[]; past: Trip[] } {
  const sorted = sortTrips(trips);
  return {
    planned: sorted.filter((trip) => trip.endDate >= today),
    past: sorted.filter((trip) => trip.endDate < today),
  };
}

export function isTripVisible(trip: Trip, window: CalendarWindow): boolean {
  return rangesIntersect(
    trip.startDate,
    trip.endDate,
    window.viewStart,
    window.viewEnd,
  );
}

export function tripOverlapLayers(
  trip: Trip,
  predictions: CyclePrediction[],
): CycleLayer[] {
  const overlap = new Set<CycleLayer>();
  for (const prediction of predictions) {
    if (
      !prediction.observed &&
      rangesIntersect(
        trip.startDate,
        trip.endDate,
        prediction.periodStart,
        prediction.periodEnd,
      )
    ) {
      overlap.add("period");
    }
    if (
      rangesIntersect(
        trip.startDate,
        trip.endDate,
        prediction.fertileStart,
        prediction.fertileEnd,
      )
    ) {
      overlap.add("fertile");
    }
    if (
      !prediction.observed &&
      isInRange(prediction.ovulation, trip.startDate, trip.endDate)
    ) {
      overlap.add("ovulation");
    }
  }
  return ["period", "fertile", "ovulation"].filter((layer) =>
    overlap.has(layer as CycleLayer),
  ) as CycleLayer[];
}

export function forecastConfidence(
  settings: CycleSettings | null,
  entries: PeriodEntry[],
): ForecastConfidence {
  if (!settings || entries.length < 2) return "low";
  const sorted = sortPeriodEntries(entries);
  const intervals: number[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const interval = daysBetween(
      sorted[index - 1].startDate,
      sorted[index].startDate,
    );
    if (interval >= 15 && interval <= 90) intervals.push(interval);
  }
  if (intervals.length < 1) return "low";
  const spread = Math.max(...intervals) - Math.min(...intervals);
  if (intervals.length >= 2 && spread <= 4) return "high";
  if (spread <= 8) return "medium";
  return "low";
}

export function tripReadiness(
  trip: Trip,
  predictions: CyclePrediction[],
  holidays: HolidayEvent[],
  settings: CycleSettings | null,
  entries: PeriodEntry[],
): TripReadiness {
  const cycleOverlaps = tripOverlapLayers(trip, predictions);
  const observedPeriodOverlap = predictions.some(
    (prediction) =>
      !!prediction.observed &&
      rangesIntersect(
        trip.startDate,
        trip.endDate,
        prediction.periodStart,
        prediction.periodEnd,
      ),
  );
  const predictedPeriodOverlap = predictions.some(
    (prediction) =>
      !prediction.observed &&
      rangesIntersect(
        trip.startDate,
        trip.endDate,
        prediction.periodStart,
        prediction.periodEnd,
      ),
  );
  const holidayOverlaps = holidays.filter((holiday) =>
    isInRange(holiday.date, trip.startDate, trip.endDate),
  );
  const preparationHints = new Set<PreparationHint>();
  if (observedPeriodOverlap || predictedPeriodOverlap) {
    preparationHints.add("periodKit");
    preparationHints.add("comfortItems");
    preparationHints.add("backupSupplies");
  }
  if (holidayOverlaps.length > 0) preparationHints.add("travelTiming");
  if (forecastConfidence(settings, entries) === "low" && cycleOverlaps.length > 0) {
    preparationHints.add("backupSupplies");
  }

  return {
    tripId: trip.id,
    cycleOverlaps,
    observedPeriodOverlap,
    predictedPeriodOverlap,
    holidayOverlaps,
    forecastConfidence: forecastConfidence(settings, entries),
    preparationHints: Array.from(preparationHints),
  };
}

export interface IcsEvent {
  uid: string;
  summary: string;
  startDate: string;
  endDate: string;
}

/**
 * Escape user-controlled text for safe insertion into an iCalendar TEXT field
 * (RFC 5545 §3.3.11). Without this, a trip name containing a newline followed
 * by `BEGIN:VEVENT` could inject a fake event into the exported file that
 * appears in the user's calendar after import.
 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Fold a content line so it is at most 75 octets long, per RFC 5545 §3.1.
 * Continuation lines start with a single SPACE; receivers join them by
 * removing the CRLF+space sequence.
 *
 * We fold by character count (not octet count) — for the kinds of input
 * this app produces (date stamps + ASCII labels + occasional Polish letters)
 * the difference is irrelevant in practice and the simpler implementation
 * avoids surface area for UTF-8 splitting bugs.
 */
function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let cursor = 0;
  while (cursor < line.length) {
    const chunk = cursor === 0 ? 75 : 74;
    parts.push(line.slice(cursor, cursor + chunk));
    cursor += chunk;
  }
  return parts.join("\r\n ");
}

export function generateIcsCalendar(events: IcsEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    // Neutral PRODID so the file does not advertise the app to whomever
    // imports it; calendar viewers display this in event metadata.
    "PRODID:-//Cycle Compass//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const event of events) {
    const dtStart = event.startDate.replace(/-/g, "");
    const dtEnd = addDays(event.endDate, 1).replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      foldIcsLine(`UID:${escapeIcsText(event.uid)}`),
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      foldIcsLine(`SUMMARY:${escapeIcsText(event.summary)}`),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function isLocale(value: unknown): value is Locale {
  return value === "pl" || value === "en";
}

function normalizeHorizon(value: unknown): HorizonMonths | null {
  if (value === 2 || value === 4 || value === 8 || value === 12) return value;
  if (value === 3) return 2;
  if (value === 6) return 4;
  if (value === 9) return 8;
  return null;
}

function normalizePastMonths(value: unknown): PastMonths | null {
  if (value === 0 || value === 1 || value === 2 || value === 3) return value;
  return null;
}

function isCycle(value: unknown): value is CycleInput {
  if (!value || typeof value !== "object") return false;
  const cycle = value as Partial<CycleInput>;
  return (
    typeof cycle.lastPeriodStart === "string" &&
    typeof cycle.cycleLengthDays === "number" &&
    typeof cycle.periodLengthDays === "number"
  );
}

function isCycleSettings(value: unknown): value is CycleSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Partial<CycleSettings>;
  return (
    typeof settings.cycleLengthDays === "number" &&
    typeof settings.periodLengthDays === "number"
  );
}

function isPeriodEntry(value: unknown): value is PeriodEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<PeriodEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.startDate === "string" &&
    typeof entry.periodLengthDays === "number"
  );
}

function isTrip(value: unknown): value is Trip {
  if (!value || typeof value !== "object") return false;
  const trip = value as Partial<Trip>;
  return (
    typeof trip.id === "string" &&
    typeof trip.name === "string" &&
    trip.name.length <= TRIP_NAME_MAX_LENGTH &&
    typeof trip.startDate === "string" &&
    typeof trip.endDate === "string"
  );
}

/**
 * Accept only ISO 3166-1 alpha-2 country codes (e.g. "PL", "GB") or null.
 * Prevents a tampered localStorage value like "../../etc/passwd" from
 * reaching the `date-holidays` library and causing crashes or surprises.
 */
function isHolidayCountry(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  return typeof value === "string" && /^[A-Z]{2}$/.test(value);
}

function isLayers(
  value: unknown,
  includeTrips: boolean,
  includeHolidays = false,
): boolean {
  if (!value || typeof value !== "object") return false;
  const layers = value as Partial<VisibleLayers>;
  return (
    typeof layers.period === "boolean" &&
    typeof layers.fertile === "boolean" &&
    typeof layers.ovulation === "boolean" &&
    (!includeTrips || typeof layers.trips === "boolean") &&
    (!includeHolidays || typeof layers.holidays === "boolean")
  );
}

export function migrateStoredState(value: unknown): AppState | null {
  if (!value || typeof value !== "object") return null;
  const current = value as Partial<AppState>;
  const currentHorizon = normalizeHorizon(current.horizonMonths);
  const currentPastMonths = normalizePastMonths(current.pastMonths);
  if (
    current.storageVersion === 4 &&
    (current.cycleSettings === null ||
      isCycleSettings(current.cycleSettings)) &&
    Array.isArray(current.periodEntries) &&
    current.periodEntries.every(isPeriodEntry) &&
    Array.isArray(current.trips) &&
    current.trips.every(isTrip) &&
    isLocale(current.locale) &&
    currentHorizon !== null &&
    currentPastMonths !== null &&
    isHolidayCountry(current.holidayCountry) &&
    isLayers(current.visibleLayers, true, true)
  ) {
    return {
      ...current,
      horizonMonths: currentHorizon,
      pastMonths: currentPastMonths,
      holidayCountry: current.holidayCountry ?? null,
      // Truncate runaway arrays so a tampered localStorage entry cannot freeze
      // the app on hydration with a million synthetic trips or entries.
      periodEntries: sortPeriodEntries(
        current.periodEntries.slice(0, MAX_PERIOD_ENTRIES),
      ),
      trips: current.trips.slice(0, MAX_TRIPS),
      visibleLayers: current.visibleLayers as VisibleLayers,
    } as AppState;
  }

  const previousV3 = value as Partial<LegacyAppStateV3>;
  const previousV3Horizon = normalizeHorizon(previousV3.horizonMonths);
  const previousV3PastMonths = normalizePastMonths(previousV3.pastMonths);
  if (
    previousV3.storageVersion === 3 &&
    (previousV3.cycleSettings === null ||
      isCycleSettings(previousV3.cycleSettings)) &&
    Array.isArray(previousV3.periodEntries) &&
    previousV3.periodEntries.every(isPeriodEntry) &&
    Array.isArray(previousV3.trips) &&
    previousV3.trips.every(isTrip) &&
    isLocale(previousV3.locale) &&
    previousV3Horizon !== null &&
    previousV3PastMonths !== null &&
    isLayers(previousV3.visibleLayers, true)
  ) {
    return {
      storageVersion: 4,
      cycleSettings: previousV3.cycleSettings,
      periodEntries: sortPeriodEntries(previousV3.periodEntries),
      trips: previousV3.trips,
      locale: previousV3.locale,
      horizonMonths: previousV3Horizon,
      pastMonths: previousV3PastMonths,
      holidayCountry: previousV3.locale === "pl" ? "PL" : null,
      visibleLayers: {
        ...(previousV3.visibleLayers as Omit<VisibleLayers, "holidays">),
        holidays: true,
      },
    };
  }

  const previous = value as Partial<LegacyAppStateV2>;
  const previousHorizon = normalizeHorizon(previous.horizonMonths);
  if (
    previous.storageVersion === 2 &&
    (previous.cycle === null || isCycle(previous.cycle)) &&
    Array.isArray(previous.trips) &&
    previous.trips.every(isTrip) &&
    isLocale(previous.locale) &&
    previousHorizon !== null &&
    isLayers(previous.visibleLayers, true)
  ) {
    return {
      storageVersion: 4,
      cycleSettings: previous.cycle
        ? {
            cycleLengthDays: previous.cycle.cycleLengthDays,
            periodLengthDays: previous.cycle.periodLengthDays,
          }
        : null,
      periodEntries: previous.cycle
        ? [
            {
              id: `period-${previous.cycle.lastPeriodStart}`,
              startDate: previous.cycle.lastPeriodStart,
              periodLengthDays: previous.cycle.periodLengthDays,
            },
          ]
        : [],
      trips: previous.trips,
      locale: previous.locale,
      horizonMonths: previousHorizon,
      pastMonths: 0,
      holidayCountry: previous.locale === "pl" ? "PL" : null,
      visibleLayers: {
        ...(previous.visibleLayers as Omit<VisibleLayers, "holidays">),
        holidays: true,
      },
    };
  }

  const legacy = value as Partial<LegacySettings>;
  const legacyHorizon = normalizeHorizon(legacy.horizonMonths);
  const legacyCycle = {
    lastPeriodStart: legacy.lastPeriodStart,
    cycleLengthDays: legacy.cycleLengthDays,
    periodLengthDays: legacy.periodLengthDays,
  };
  if (
    legacy.storageVersion === 1 &&
    isCycle(legacyCycle) &&
    isLocale(legacy.locale) &&
    legacyHorizon !== null &&
    isLayers(legacy.visibleLayers, false)
  ) {
    return {
      storageVersion: 4,
      cycleSettings: {
        cycleLengthDays: legacyCycle.cycleLengthDays,
        periodLengthDays: legacyCycle.periodLengthDays,
      },
      periodEntries: [
        {
          id: `period-${legacyCycle.lastPeriodStart}`,
          startDate: legacyCycle.lastPeriodStart,
          periodLengthDays: legacyCycle.periodLengthDays,
        },
      ],
      trips: [],
      locale: legacy.locale,
      horizonMonths: legacyHorizon,
      pastMonths: 0,
      holidayCountry: legacy.locale === "pl" ? "PL" : null,
      visibleLayers: {
        ...legacy.visibleLayers,
        trips: true,
        holidays: true,
      } as VisibleLayers,
    };
  }
  return null;
}
