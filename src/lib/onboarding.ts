import { driver, type DriveStep } from "driver.js";

export type PanelTab = "summary" | "trips" | "cycle";

/**
 * Structural shape of the onboarding strings. Matched by both
 * `copy.pl.onboarding` and `copy.en.onboarding` in `src/lib/i18n.ts`.
 */
export interface OnboardingCopy {
  next: string;
  prev: string;
  skip: string;
  done: string;
  welcomeTitle: string;
  welcomeText: string;
  manageTitle: string;
  manageText: string;
  manageTextDesktop: string;
  resetTitle: string;
  resetText: string;
  cycleTabTitle: string;
  cycleTabText: string;
  cycleLengthTitle: string;
  cycleLengthText: string;
  periodLengthTitle: string;
  periodLengthText: string;
  firstDayTitle: string;
  firstDayText: string;
  tripsTitle: string;
  tripsText: string;
  doneTitle: string;
  doneText: string;
}

export interface OnboardingContext {
  t: { onboarding: OnboardingCopy };
  isMobile: boolean;
  openDrawer: (tab?: PanelTab) => void;
  closeDrawer: () => void;
  selectPanelTab: (tab: PanelTab) => void;
  onComplete: () => void;
}

const ONBOARDING_KEY = "kalendarzyk.onboarded.v1";

export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function markOnboardingComplete(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_KEY, "true");
}

export function resetOnboarding(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ONBOARDING_KEY);
}

/**
 * Returns the appropriate selector for a tab button depending on whether the
 * desktop sidebar or the mobile drawer is currently mounted.
 */
function tabSelector(prefix: "desktop" | "drawer", tab: PanelTab): string {
  return `#${prefix}-tab-${tab}`;
}

/**
 * Wait for an element to appear in the DOM. Driver.js's nextStep can be called
 * before React has re-rendered after opening the drawer or switching tab, so
 * we briefly poll for the selector before advancing.
 */
function waitForSelector(selector: string, timeoutMs = 1200): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (document.querySelector(selector)) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

/**
 * SECURITY — driver.js v1 renders popover title and description via
 * `element.innerHTML`, so any HTML in the string will be parsed.
 *
 * All tour copy MUST come from `copy[locale].onboarding` (a static i18n
 * constant). Do NOT interpolate user-controlled values (trip names,
 * period dates, anything from `localStorage` or the UI) into these strings —
 * doing so introduces an XSS that exfiltrates the whole `localStorage`
 * (which includes the cycle history).
 *
 * The guard below makes that contract explicit at runtime by failing fast
 * if a non-static string sneaks in via mutation in dev. It is a thin
 * helper, not a sanitiser — the goal is to keep the call sites obvious.
 */
function assertStaticTourText(value: string): string {
  if (/[<>]/.test(value)) {
    // Catches the most obvious mistake — an actual HTML tag in the copy.
    // We do NOT silently sanitise: a stripped tag would hide the bug while
    // still being insecure if attackers found a bypass. Throw instead so
    // the bad copy never ships.
    throw new Error("Onboarding text must not contain raw HTML tags.");
  }
  return value;
}

export function startOnboarding(ctx: OnboardingContext): void {
  const { t, isMobile, openDrawer, closeDrawer, selectPanelTab, onComplete } =
    ctx;
  const o: OnboardingCopy = t.onboarding;
  const prefix: "desktop" | "drawer" = isMobile ? "drawer" : "desktop";

  // Make sure the panel is in a known starting state.
  if (isMobile) closeDrawer();
  else selectPanelTab("summary");

  const ensureManageOpen = async () => {
    if (isMobile) {
      openDrawer("summary");
      await waitForSelector(tabSelector("drawer", "summary"));
    } else {
      selectPanelTab("summary");
    }
  };

  const ensureCycleTab = async () => {
    if (isMobile) {
      openDrawer("cycle");
      await waitForSelector(tabSelector("drawer", "cycle"));
    } else {
      selectPanelTab("cycle");
    }
    await waitForSelector(".two-inputs.number-inputs label:nth-child(1) input");
    // Scroll the cycle form into view so driver.js highlights an element the
    // user can actually see (the form sits below section headings).
    const target = document.querySelector(
      ".two-inputs.number-inputs",
    ) as HTMLElement | null;
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const ensureTripsTab = async () => {
    if (isMobile) {
      openDrawer("trips");
      await waitForSelector(tabSelector("drawer", "trips"));
    } else {
      selectPanelTab("trips");
    }
  };

  // Wrapper that fails fast if any of the tour copy contains raw HTML — a
  // belt-and-braces guard against the driver.js innerHTML sink (see comment
  // on assertStaticTourText above).
  const safe = assertStaticTourText;

  const steps: DriveStep[] = [
    // 1. Welcome — centered, no element
    {
      popover: {
        title: safe(o.welcomeTitle),
        description: safe(o.welcomeText),
      },
    },
    // 2. Manage button / desktop sidebar
    {
      element: isMobile ? ".mobile-manage-button" : ".desktop-sidebar",
      popover: {
        title: safe(o.manageTitle),
        description: safe(isMobile ? o.manageText : o.manageTextDesktop),
        side: isMobile ? "bottom" : "right",
        align: "start",
      },
      onHighlightStarted: () => {
        // On desktop the sidebar is already visible; on mobile we keep the
        // drawer closed so the user sees the button itself.
        if (isMobile) closeDrawer();
      },
    },
    // 3. Cycle tab
    {
      element: tabSelector(prefix, "cycle"),
      popover: {
        title: safe(o.cycleTabTitle),
        description: safe(o.cycleTabText),
        side: isMobile ? "bottom" : "right",
      },
      onHighlightStarted: () => {
        void ensureManageOpen();
      },
    },
    // 4. Typical cycle length input
    {
      element: ".two-inputs.number-inputs label:nth-child(1) .number-field",
      popover: {
        title: safe(o.cycleLengthTitle),
        description: safe(o.cycleLengthText),
        side: isMobile ? "bottom" : "right",
      },
      onHighlightStarted: () => {
        void ensureCycleTab();
      },
    },
    // 5. Typical bleeding length input
    {
      element: ".two-inputs.number-inputs label:nth-child(2) .number-field",
      popover: {
        title: safe(o.periodLengthTitle),
        description: safe(o.periodLengthText),
        side: isMobile ? "bottom" : "right",
      },
    },
    // 6. First day of period
    {
      element: '.period-form input[type="date"]',
      popover: {
        title: safe(o.firstDayTitle),
        description: safe(o.firstDayText),
        side: isMobile ? "top" : "right",
      },
    },
    // 7. Trips tab
    {
      element: tabSelector(prefix, "trips"),
      popover: {
        title: safe(o.tripsTitle),
        description: safe(o.tripsText),
        side: isMobile ? "bottom" : "right",
      },
      onHighlightStarted: () => {
        void ensureTripsTab();
      },
    },
    // 8. Done (centered)
    {
      popover: {
        title: safe(o.doneTitle),
        description: safe(o.doneText),
      },
    },
  ];

  const driverObj = driver({
    showProgress: true,
    allowClose: true,
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 10,
    smoothScroll: true,
    nextBtnText: o.next,
    prevBtnText: o.prev,
    doneBtnText: o.done,
    progressText: "{{current}} / {{total}}",
    steps,
    onDestroyStarted: () => {
      // Called whenever the user closes the tour (X, Skip, Escape, Done).
      onComplete();
      driverObj.destroy();
    },
    onDestroyed: () => {
      // After driver fully tears down, return UI to a clean state.
      // Deferred so it runs after any in-flight highlight callbacks settle.
      window.setTimeout(() => {
        if (isMobile) closeDrawer();
        else selectPanelTab("summary");
      }, 0);
    },
  });

  driverObj.drive();
}

export { ONBOARDING_KEY };
