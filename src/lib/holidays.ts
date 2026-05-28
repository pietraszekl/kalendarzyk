import Holidays from "date-holidays";
import {
  CalendarWindow,
  HolidayCountry,
  HolidayEvent,
  Locale,
  isInRange,
  parseDateKey,
} from "@/lib/cycle";

type DateHoliday = {
  date: string;
  name: string;
  type: string;
};

const HOLIDAY_TYPES = new Set(["public", "bank"]);

function holidayLanguage(locale: Locale): string {
  return locale === "pl" ? "pl" : "en";
}

function dateKeyFromHoliday(value: string): string {
  return value.slice(0, 10);
}

function yearsInWindow(window: CalendarWindow): number[] {
  const start = parseDateKey(window.viewStart).getFullYear();
  const end = parseDateKey(window.viewEnd).getFullYear();
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function holidayCountries(locale: Locale): HolidayCountry[] {
  const holidays = new Holidays();
  const countries = holidays.getCountries(holidayLanguage(locale));
  return Object.entries(countries)
    .map(([code, name]) => ({ code, name }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

export function holidayEventsForWindow(
  countryCode: string | null,
  window: CalendarWindow,
  locale: Locale,
): HolidayEvent[] {
  if (!countryCode) return [];
  const holidays = new Holidays(countryCode);
  const seen = new Set<string>();
  return yearsInWindow(window)
    .flatMap((year) =>
      (holidays.getHolidays(year, holidayLanguage(locale)) as DateHoliday[])
        .filter((holiday) => HOLIDAY_TYPES.has(holiday.type))
        .map((holiday) => {
          const date = dateKeyFromHoliday(holiday.date);
          return {
            id: `holiday-${countryCode}-${date}-${holiday.name}`,
            countryCode,
            name: holiday.name,
            date,
            type: holiday.type as HolidayEvent["type"],
          };
        }),
    )
    .filter((holiday) => isInRange(holiday.date, window.viewStart, window.viewEnd))
    .filter((holiday) => {
      const key = `${holiday.countryCode}-${holiday.date}-${holiday.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (first, second) =>
        first.date.localeCompare(second.date) ||
        first.name.localeCompare(second.name),
    );
}
