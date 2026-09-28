import { describe, expect, it, beforeEach } from "vitest";
import {
  LEGACY_V2_STORAGE_KEY,
  STORAGE_KEY,
  clearAllStoredAppData,
  loadAppState,
  persistAppState,
} from "@/lib/storage";

describe("app storage boundary", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads sanitized current state from localStorage", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        storageVersion: 4,
        cycleSettings: null,
        periodEntries: [
          { id: "bad", startDate: "not-a-date", periodLengthDays: 5 },
          { id: "ok", startDate: "2026-05-04", periodLengthDays: 5 },
        ],
        trips: [],
        locale: "pl",
        horizonMonths: 4,
        pastMonths: 0,
        holidayCountry: "PL",
        visibleLayers: {
          period: true,
          fertile: true,
          ovulation: true,
          trips: true,
          holidays: true,
        },
      }),
    );

    expect(loadAppState("en")).toMatchObject({
      state: {
        locale: "pl",
        periodEntries: [
          { id: "ok", startDate: "2026-05-04", periodLengthDays: 5 },
        ],
      },
      usedLegacyState: false,
      hasCurrentState: true,
    });
  });

  it("migrates legacy state through the same boundary", () => {
    localStorage.setItem(
      LEGACY_V2_STORAGE_KEY,
      JSON.stringify({
        storageVersion: 2,
        cycle: {
          lastPeriodStart: "2026-05-04",
          cycleLengthDays: 28,
          periodLengthDays: 5,
        },
        trips: [],
        locale: "pl",
        horizonMonths: 6,
        visibleLayers: {
          period: true,
          fertile: true,
          ovulation: true,
          trips: true,
        },
      }),
    );

    expect(loadAppState("en")).toMatchObject({
      state: {
        storageVersion: 4,
        locale: "pl",
        horizonMonths: 4,
      },
      usedLegacyState: true,
      hasCurrentState: false,
    });
  });

  it("persists and clears app data without throwing", () => {
    const loaded = loadAppState("en").state;

    expect(persistAppState(loaded)).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    clearAllStoredAppData();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
