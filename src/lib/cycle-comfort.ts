import {
  addDays,
  parseDateKey,
  type CyclePrediction,
  type Trip,
} from "@/lib/cycle";

/**
 * Comfort-aware trip planning. Pure functions only — no React, no DOM.
 *
 * The energy/phase model is a heuristic, not a clinical claim. We expose
 * 5 levels so the UI can render dots/gradients while keeping the underlying
 * math simple enough to explain.
 */

export type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal";

/** 1 = very low, 5 = peak. */
export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Hex colors for each energy level. Single source of truth used by both the
 * sidebar gradient strip and the in-calendar trip bar gradient.
 */
export const ENERGY_HEX: Record<EnergyLevel, string> = {
  1: "#c97a7a",
  2: "#d8a374",
  3: "#c9b06f",
  4: "#6fa68b",
  5: "#24584f",
};

/**
 * Build a CSS linear-gradient (90deg) where each day takes an equal slice of
 * the width and gets the color matching its energy level. Days outside any
 * known cycle (energy === null) are rendered as a neutral sage tint.
 */
export function buildEnergyGradient(levels: (EnergyLevel | null)[]): string {
  if (levels.length === 0) return "transparent";
  const slice = 100 / levels.length;
  const stops = levels.flatMap((level, index) => {
    const color = level ? ENERGY_HEX[level] : "rgba(36, 88, 79, 0.22)";
    const start = index * slice;
    const end = (index + 1) * slice;
    return [`${color} ${start}%`, `${color} ${end}%`];
  });
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

export type TripVibe = "spa" | "discovery" | "social" | "cozy";

export interface DailyEnergy {
  date: string;
  cycleDay: number; // 1-based day inside the matched cycle
  phase: CyclePhase;
  level: EnergyLevel;
}

export interface ComfortPlan {
  vibe: TripVibe;
  dominantPhase: CyclePhase;
  daily: DailyEnergy[];
}

function daysBetween(start: string, end: string): number {
  return Math.round(
    (parseDateKey(end).getTime() - parseDateKey(start).getTime()) /
      (24 * 60 * 60 * 1000),
  );
}

/**
 * Find the cycle whose [periodStart, nextPeriodStart) window covers the date.
 * Returns null when the date falls outside the forecast horizon.
 */
function locateCycle(
  date: string,
  predictions: CyclePrediction[],
  fallbackCycleLength: number,
): { cycle: CyclePrediction; nextStart: string } | null {
  if (predictions.length === 0) return null;
  const sorted = [...predictions].sort((a, b) =>
    a.periodStart < b.periodStart ? -1 : 1,
  );
  for (let index = 0; index < sorted.length; index += 1) {
    const cycle = sorted[index];
    const next =
      sorted[index + 1]?.periodStart ??
      addDays(cycle.periodStart, fallbackCycleLength);
    if (date >= cycle.periodStart && date < next) {
      return { cycle, nextStart: next };
    }
  }
  return null;
}

/**
 * Heuristic energy curve. Returns null when the date falls outside any known
 * cycle (e.g. trip far past the forecast horizon).
 *
 * The curve always dims the luteal phase and the first two menstrual days
 * by one notch (formerly the opt-in "gentle mode"). This is the
 * appropriate default for travel planning — being too optimistic in those
 * phases causes worse trip experiences than being slightly conservative.
 */
export function dailyEnergy(
  date: string,
  predictions: CyclePrediction[],
  fallbackCycleLength: number,
): DailyEnergy | null {
  const located = locateCycle(date, predictions, fallbackCycleLength);
  if (!located) return null;
  const { cycle, nextStart } = located;

  const cycleDay = daysBetween(cycle.periodStart, date) + 1;
  const cycleLen = Math.max(1, daysBetween(cycle.periodStart, nextStart));
  const periodLen = Math.max(
    1,
    daysBetween(cycle.periodStart, cycle.periodEnd) + 1,
  );
  const ovulationDay = daysBetween(cycle.periodStart, cycle.ovulation) + 1;

  let phase: CyclePhase;
  if (cycleDay <= periodLen) phase = "menstrual";
  else if (cycleDay >= ovulationDay - 1 && cycleDay <= ovulationDay + 1)
    phase = "ovulation";
  else if (cycleDay < ovulationDay) phase = "follicular";
  else phase = "luteal";

  let level: EnergyLevel;
  if (phase === "menstrual") {
    if (cycleDay <= 2) level = 1;
    else if (cycleDay <= Math.min(periodLen, 4)) level = 2;
    else level = 3;
  } else if (phase === "follicular") {
    const folLen = Math.max(1, ovulationDay - periodLen - 1);
    const folPos = cycleDay - periodLen - 1; // 0..folLen
    const ratio = folPos / folLen;
    level = ratio < 0.4 ? 3 : ratio < 0.75 ? 4 : 5;
  } else if (phase === "ovulation") {
    level = 5;
  } else {
    // luteal — ramps down from 4 to 1
    const lutLen = Math.max(1, cycleLen - ovulationDay - 1);
    const lutPos = cycleDay - ovulationDay - 1;
    const ratio = lutPos / lutLen;
    if (ratio < 0.25) level = 4;
    else if (ratio < 0.55) level = 3;
    else if (ratio < 0.8) level = 2;
    else level = 1;
  }

  // Always-on dimming of luteal and the first two menstrual days.
  const dim = phase === "luteal" || (phase === "menstrual" && cycleDay <= 2);
  if (dim) {
    level = Math.max(1, level - 1) as EnergyLevel;
  }

  return {
    date,
    cycleDay,
    phase,
    level,
  };
}

function phaseToVibe(phase: CyclePhase): TripVibe {
  switch (phase) {
    case "menstrual":
      return "spa";
    case "follicular":
      return "discovery";
    case "ovulation":
      return "social";
    case "luteal":
      return "cozy";
  }
}

function dominant<T extends string>(values: T[]): T | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: T = values[0];
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Build a comfort plan for a single trip. Returns null when the trip cannot
 * be located inside the forecast at all (no overlap data).
 */
export function buildComfortPlan(
  trip: Trip,
  predictions: CyclePrediction[],
  fallbackCycleLength: number,
): ComfortPlan | null {
  const daily: DailyEnergy[] = [];
  let cursor = trip.startDate;
  while (cursor <= trip.endDate) {
    const day = dailyEnergy(cursor, predictions, fallbackCycleLength);
    if (day) daily.push(day);
    cursor = addDays(cursor, 1);
  }
  if (daily.length === 0) return null;

  const phases = daily.map((day) => day.phase);
  const dominantPhase = (dominant(phases) ?? "follicular") as CyclePhase;
  const vibe = phaseToVibe(dominantPhase);

  return {
    vibe,
    dominantPhase,
    daily,
  };
}
