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
  };

  const ensureTripsTab = async () => {
    if (isMobile) {
      openDrawer("trips");
      await waitForSelector(tabSelector("drawer", "trips"));
    } else {
      selectPanelTab("trips");
    }
  };

  const steps: DriveStep[] = [
    // 1. Welcome — centered, no element
    {
      popover: {
        title: o.welcomeTitle,
        description: o.welcomeText,
      },
    },
    // 2. Manage button / desktop sidebar
    {
      element: isMobile ? ".mobile-manage-button" : ".desktop-sidebar",
      popover: {
        title: o.manageTitle,
        description: o.manageText,
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
        title: o.cycleTabTitle,
        description: o.cycleTabText,
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
        title: o.cycleLengthTitle,
        description: o.cycleLengthText,
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
        title: o.periodLengthTitle,
        description: o.periodLengthText,
        side: isMobile ? "bottom" : "right",
      },
    },
    // 6. First day of period
    {
      element: '.period-form input[type="date"]',
      popover: {
        title: o.firstDayTitle,
        description: o.firstDayText,
        side: isMobile ? "top" : "right",
      },
    },
    // 7. Trips tab
    {
      element: tabSelector(prefix, "trips"),
      popover: {
        title: o.tripsTitle,
        description: o.tripsText,
        side: isMobile ? "bottom" : "right",
      },
      onHighlightStarted: () => {
        void ensureTripsTab();
      },
    },
    // 8. Done (centered)
    {
      popover: {
        title: o.doneTitle,
        description: o.doneText,
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
