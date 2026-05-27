export type Locale = "pl" | "en";
export type HorizonMonths = 6 | 12;
export type CycleLayer = "period" | "fertile" | "ovulation";
export type Layer = CycleLayer | "trips";

export type VisibleLayers = Record<Layer, boolean>;
type LegacyVisibleLayers = Record<CycleLayer, boolean>;

export interface CycleInput {
  lastPeriodStart: string;
  cycleLengthDays: number;
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

export interface AppState {
  storageVersion: 2;
  cycle: CycleInput | null;
  trips: Trip[];
  locale: Locale;
  horizonMonths: HorizonMonths;
  visibleLayers: VisibleLayers;
}

export interface CyclePrediction {
  periodStart: string;
  periodEnd: string;
  ovulation: string;
  fertileStart: string;
  fertileEnd: string;
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

export interface CalendarBarSegment extends CalendarBarEvent {
  week: number;
  column: number;
  span: number;
  lane: number;
  showLabel: boolean;
  startsRange: boolean;
  endsRange: boolean;
}

export interface Forecast extends CalendarWindow {
  predictions: CyclePrediction[];
  upcoming: CyclePrediction[];
}

export interface ValidationResult {
  errors: string[];
  atypicalCycle: boolean;
}

export interface TripValidationResult {
  errors: string[];
}

export const DEFAULT_LAYERS: VisibleLayers = {
  period: true,
  fertile: true,
  ovulation: true,
  trips: true,
};

export function defaultAppState(locale: Locale): AppState {
  return {
    storageVersion: 2,
    cycle: null,
    trips: [],
    locale,
    horizonMonths: 6,
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

export function monthKeys(today: string, horizon: HorizonMonths): string[] {
  const first = startOfMonth(today);
  return Array.from({ length: horizon }, (_, index) => addMonths(first, index));
}

export function createCalendarWindow(
  today: string,
  horizon: HorizonMonths,
): CalendarWindow {
  const months = monthKeys(today, horizon);
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

export function validateTrip(
  trip: Pick<Trip, "name" | "startDate" | "endDate">,
  today: string,
  allowPastStart = false,
): TripValidationResult {
  const errors: string[] = [];
  if (!trip.name.trim()) errors.push("tripNameRequired");
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

export function generateForecast(
  input: CycleInput,
  today: string,
  horizon: HorizonMonths,
): Forecast {
  const window = createCalendarWindow(today, horizon);
  const predictions: CyclePrediction[] = [];
  let periodStart = input.lastPeriodStart;

  for (let iteration = 0; iteration < 3000; iteration += 1) {
    const nextPeriodStart = addDays(periodStart, input.cycleLengthDays);
    const prediction: CyclePrediction = {
      periodStart,
      periodEnd: addDays(periodStart, input.periodLengthDays - 1),
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
      isInRange(value, prediction.fertileStart, prediction.fertileEnd),
    )
  ) {
    layers.push("fertile");
  }
  if (predictions.some((prediction) => prediction.ovulation === value)) {
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
    if (isInRange(prediction.ovulation, trip.startDate, trip.endDate)) {
      overlap.add("ovulation");
    }
  }
  return ["period", "fertile", "ovulation"].filter((layer) =>
    overlap.has(layer as CycleLayer),
  ) as CycleLayer[];
}

function isLocale(value: unknown): value is Locale {
  return value === "pl" || value === "en";
}

function isHorizon(value: unknown): value is HorizonMonths {
  return value === 6 || value === 12;
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

function isTrip(value: unknown): value is Trip {
  if (!value || typeof value !== "object") return false;
  const trip = value as Partial<Trip>;
  return (
    typeof trip.id === "string" &&
    typeof trip.name === "string" &&
    typeof trip.startDate === "string" &&
    typeof trip.endDate === "string"
  );
}

function isLayers(value: unknown, includeTrips: boolean): boolean {
  if (!value || typeof value !== "object") return false;
  const layers = value as Partial<VisibleLayers>;
  return (
    typeof layers.period === "boolean" &&
    typeof layers.fertile === "boolean" &&
    typeof layers.ovulation === "boolean" &&
    (!includeTrips || typeof layers.trips === "boolean")
  );
}

export function migrateStoredState(value: unknown): AppState | null {
  if (!value || typeof value !== "object") return null;
  const current = value as Partial<AppState>;
  if (
    current.storageVersion === 2 &&
    (current.cycle === null || isCycle(current.cycle)) &&
    Array.isArray(current.trips) &&
    current.trips.every(isTrip) &&
    isLocale(current.locale) &&
    isHorizon(current.horizonMonths) &&
    isLayers(current.visibleLayers, true)
  ) {
    return current as AppState;
  }
  const legacy = value as Partial<LegacySettings>;
  const legacyCycle = {
    lastPeriodStart: legacy.lastPeriodStart,
    cycleLengthDays: legacy.cycleLengthDays,
    periodLengthDays: legacy.periodLengthDays,
  };
  if (
    legacy.storageVersion === 1 &&
    isCycle(legacyCycle) &&
    isLocale(legacy.locale) &&
    isHorizon(legacy.horizonMonths) &&
    isLayers(legacy.visibleLayers, false)
  ) {
    return {
      storageVersion: 2,
      cycle: legacyCycle,
      trips: [],
      locale: legacy.locale,
      horizonMonths: legacy.horizonMonths,
      visibleLayers: { ...legacy.visibleLayers, trips: true } as VisibleLayers,
    };
  }
  return null;
}
