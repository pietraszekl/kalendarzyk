import {
  AppState,
  Locale,
  defaultAppState,
  migrateStoredState,
} from "@/lib/cycle";

export const STORAGE_KEY = "kalendarzyk.settings.v4";
export const LEGACY_V3_STORAGE_KEY = "kalendarzyk.settings.v3";
export const LEGACY_V2_STORAGE_KEY = "kalendarzyk.settings.v2";
export const LEGACY_STORAGE_KEY = "kalendarzyk.settings.v1";
export const LOCALE_KEY = "kalendarzyk.locale";
export const PANEL_TAB_KEY = "kalendarzyk.panelTab";

export interface LoadAppStateResult {
  state: AppState;
  usedLegacyState: boolean;
  hasCurrentState: boolean;
}

function parseStoredJson(value: string | null): unknown {
  if (!value) return null;
  return JSON.parse(value) as unknown;
}

export function getStoredLocale(): Locale | null {
  const value = localStorage.getItem(LOCALE_KEY);
  return value === "pl" || value === "en" ? value : null;
}

export function saveStoredLocale(locale: Locale) {
  localStorage.setItem(LOCALE_KEY, locale);
}

export function getStoredPanelTab(): string | null {
  return localStorage.getItem(PANEL_TAB_KEY);
}

export function saveStoredPanelTab(tab: string) {
  localStorage.setItem(PANEL_TAB_KEY, tab);
}

export function hasCurrentStoredState(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export function loadAppState(fallbackLocale: Locale): LoadAppStateResult {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const legacyV3 = localStorage.getItem(LEGACY_V3_STORAGE_KEY);
    const legacyV2 = localStorage.getItem(LEGACY_V2_STORAGE_KEY);
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    const rawState = current
      ? parseStoredJson(current)
      : legacyV3
        ? parseStoredJson(legacyV3)
      : legacyV2
        ? parseStoredJson(legacyV2)
        : parseStoredJson(legacy);
    const restored = migrateStoredState(rawState);

    return {
      state: restored ?? defaultAppState(fallbackLocale),
      usedLegacyState: !current && (!!legacyV3 || !!legacyV2 || !!legacy) && !!restored,
      hasCurrentState: !!current,
    };
  } catch {
    clearStoredAppState();
    return {
      state: defaultAppState(fallbackLocale),
      usedLegacyState: false,
      hasCurrentState: false,
    };
  }
}

export function persistAppState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearLegacyStoredAppState() {
  localStorage.removeItem(LEGACY_V3_STORAGE_KEY);
  localStorage.removeItem(LEGACY_V2_STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function clearStoredAppState() {
  localStorage.removeItem(STORAGE_KEY);
  clearLegacyStoredAppState();
}

export function clearAllStoredAppData(extraKeys: string[] = []) {
  clearStoredAppState();
  localStorage.removeItem(LOCALE_KEY);
  localStorage.removeItem(PANEL_TAB_KEY);
  for (const key of extraKeys) localStorage.removeItem(key);
}
