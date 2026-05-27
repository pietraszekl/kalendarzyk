import { describe, expect, it } from "vitest";
import {
  addDays,
  createCalendarWindow,
  generateForecast,
  isTripVisible,
  layersForDate,
  migrateStoredState,
  packCalendarBarLanes,
  segmentCalendarBar,
  splitTrips,
  tripOverlapLayers,
  validateCycleInput,
  validateTrip,
} from "@/lib/cycle";

const input = {
  lastPeriodStart: "2026-05-04",
  cycleLengthDays: 28,
  periodLengthDays: 5,
};

describe("cycle forecasting", () => {
  it("keeps date arithmetic on calendar days across months and years", () => {
    expect(addDays("2026-12-29", 5)).toBe("2027-01-03");
  });

  it("creates bleeding, ovulation and fertile ranges from the cycle model", () => {
    const forecast = generateForecast(input, "2026-05-27", 6);
    const juneCycle = forecast.predictions.find(
      (prediction) => prediction.periodStart === "2026-06-01",
    );

    expect(juneCycle).toEqual({
      periodStart: "2026-06-01",
      periodEnd: "2026-06-05",
      ovulation: "2026-06-15",
      fertileStart: "2026-06-10",
      fertileEnd: "2026-06-16",
    });
    expect(layersForDate("2026-06-15", forecast.predictions)).toEqual([
      "fertile",
      "ovulation",
    ]);
  });

  it("returns the configured month horizon and upcoming period list", () => {
    const short = generateForecast(input, "2026-05-27", 6);
    const long = generateForecast(input, "2026-05-27", 12);

    expect(short.months).toHaveLength(6);
    expect(short.viewEnd).toBe("2026-10-31");
    expect(short.upcoming[0].periodStart).toBe("2026-06-01");
    expect(long.months).toHaveLength(12);
    expect(long.viewEnd).toBe("2027-04-30");
  });

  it("does not call a period starting today the next predicted period", () => {
    const forecast = generateForecast(
      { ...input, lastPeriodStart: "2026-05-27" },
      "2026-05-27",
      6,
    );

    expect(forecast.upcoming[0].periodStart).toBe("2026-06-24");
  });
});

describe("cycle validation", () => {
  it("rejects future dates and values outside hard limits", () => {
    expect(
      validateCycleInput(
        {
          lastPeriodStart: "2026-05-28",
          cycleLengthDays: 14,
          periodLengthDays: 15,
        },
        "2026-05-27",
      ).errors,
    ).toEqual(["futureStart", "cycleRange", "periodRange", "periodLongerThanCycle"]);
  });

  it("allows atypical cycle lengths while requesting a warning", () => {
    const result = validateCycleInput(
      { ...input, cycleLengthDays: 40 },
      "2026-05-27",
    );

    expect(result.errors).toEqual([]);
    expect(result.atypicalCycle).toBe(true);
  });
});

describe("trip planning", () => {
  const trip = {
    id: "trip-1",
    name: "Weekend",
    startDate: "2026-06-01",
    endDate: "2026-06-16",
  };

  it("validates planned trip details and future date rules", () => {
    expect(
      validateTrip(
        { name: "", startDate: "2026-05-26", endDate: "2026-05-25" },
        "2026-05-27",
      ).errors,
    ).toEqual(["tripNameRequired", "tripStartPast", "tripEndBeforeStart"]);
    expect(validateTrip(trip, "2026-05-27").errors).toEqual([]);
  });

  it("detects overlap with each forecast layer without interpreting it", () => {
    const forecast = generateForecast(input, "2026-05-27", 6);
    expect(tripOverlapLayers(trip, forecast.predictions)).toEqual([
      "period",
      "fertile",
      "ovulation",
    ]);
  });

  it("classifies past trips and marks plans outside the current view", () => {
    const groups = splitTrips(
      [
        { ...trip, id: "past", startDate: "2026-05-01", endDate: "2026-05-02" },
        trip,
      ],
      "2026-05-27",
    );
    const window = createCalendarWindow("2026-05-27", 6);

    expect(groups.past[0].id).toBe("past");
    expect(groups.planned[0].id).toBe("trip-1");
    expect(
      isTripVisible({ ...trip, startDate: "2027-01-01", endDate: "2027-01-02" }, window),
    ).toBe(false);
  });

  it("migrates stored cycle settings into state v2 with trips enabled", () => {
    expect(
      migrateStoredState({
        storageVersion: 1,
        ...input,
        locale: "pl",
        horizonMonths: 6,
        visibleLayers: { period: true, fertile: false, ovulation: true },
      }),
    ).toEqual({
      storageVersion: 2,
      cycle: input,
      trips: [],
      locale: "pl",
      horizonMonths: 6,
      visibleLayers: {
        period: true,
        fertile: false,
        ovulation: true,
        trips: true,
      },
    });
  });
});

describe("calendar bar layout", () => {
  const tripBar = {
    id: "holiday",
    layer: "trips" as const,
    label: "Urlop",
    startDate: "2026-06-04",
    endDate: "2026-06-10",
  };

  it("creates a one-day bar and splits a multi-day range between weeks", () => {
    expect(
      segmentCalendarBar("2026-06-01", {
        ...tripBar,
        startDate: "2026-06-03",
        endDate: "2026-06-03",
      }),
    ).toMatchObject([
      {
        week: 0,
        column: 3,
        span: 1,
        showLabel: true,
        startsRange: true,
        endsRange: true,
      },
    ]);
    expect(segmentCalendarBar("2026-06-01", tripBar)).toMatchObject([
      { week: 0, column: 4, span: 4, showLabel: true, endsRange: false },
      { week: 1, column: 1, span: 3, showLabel: false, startsRange: false },
    ]);
  });

  it("clips ranges to the month across a year boundary", () => {
    expect(
      segmentCalendarBar("2027-01-01", {
        ...tripBar,
        startDate: "2026-12-29",
        endDate: "2027-01-03",
      }),
    ).toMatchObject([
      {
        week: 0,
        column: 5,
        span: 3,
        showLabel: true,
        startsRange: false,
        endsRange: true,
      },
    ]);
  });

  it("packs intersecting trips into separate lanes and reuses free lanes", () => {
    const segments = packCalendarBarLanes("2026-06-01", [
      tripBar,
      {
        ...tripBar,
        id: "overlap",
        startDate: "2026-06-09",
        endDate: "2026-06-11",
      },
      {
        ...tripBar,
        id: "later",
        startDate: "2026-06-12",
        endDate: "2026-06-13",
      },
    ]);
    const firstSegments = segments.filter((segment) => segment.showLabel);

    expect(firstSegments.map(({ id, lane }) => ({ id, lane }))).toEqual([
      { id: "holiday", lane: 0 },
      { id: "overlap", lane: 1 },
      { id: "later", lane: 0 },
    ]);
  });

  it("returns no segments for an event outside the displayed month", () => {
    expect(
      segmentCalendarBar("2026-06-01", {
        ...tripBar,
        startDate: "2026-07-01",
        endDate: "2026-07-03",
      }),
    ).toEqual([]);
  });
});
