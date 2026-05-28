import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toPng } from "html-to-image";
import CyclePlanner from "@/components/cycle-planner";
import { addDays, addMonths, startOfMonth, toDateKey } from "@/lib/cycle";

vi.mock("html-to-image", () => ({
  toPng: vi.fn().mockResolvedValue("data:image/png;base64,test"),
}));

const storageKey = "kalendarzyk.settings.v4";
const panelTabKey = "kalendarzyk.panelTab";

beforeEach(() => {
  Object.defineProperty(window.navigator, "language", {
    configurable: true,
    value: "pl-PL",
  });
  setMobileViewport(false);
  vi.mocked(toPng).mockClear();
  // Skip the first-visit onboarding tour in unit tests — it's covered by
  // manual/preview verification, and starting it here interferes with the
  // DOM assertions in other test cases.
  localStorage.setItem("kalendarzyk.onboarded.v1", "true");
});

afterEach(() => {
  vi.useRealTimers();
});

function setMobileViewport(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: matches && query === "(max-width: 820px)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function today(offset = 0) {
  return addDays(toDateKey(new Date()), offset);
}

function chooseTab(name: "Podsumowanie" | "Wyjazdy" | "Cykl") {
  fireEvent.click(screen.getByRole("tab", { name }));
}

function addTrip(name = "Urlop", startOffset = 5, endOffset = 7) {
  if (!screen.queryByLabelText("Nazwa wyjazdu")) chooseTab("Wyjazdy");
  fireEvent.change(screen.getByLabelText("Nazwa wyjazdu"), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText("Od"), {
    target: { value: today(startOffset) },
  });
  fireEvent.change(screen.getByLabelText("Do"), {
    target: { value: today(endOffset) },
  });
  fireEvent.click(screen.getByRole("button", { name: "Dodaj wyjazd" }));
}

function addCycle() {
  chooseTab("Cykl");
  fireEvent.change(screen.getByLabelText("Pierwszy dzień miesiączki"), {
    target: { value: today(-23) },
  });
  fireEvent.click(screen.getByRole("button", { name: "Dodaj miesiączkę" }));
}

describe("CyclePlanner", () => {
  it("places information in a tabbed sidebar and keeps the calendar compact", async () => {
    vi.setSystemTime(new Date(2026, 4, 27, 12));
    const { container } = render(<CyclePlanner />);
    expect(await screen.findByRole("tab", { name: "Podsumowanie" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Dodaj cykl, aby porównać terminy")).toBeInTheDocument();
    expect(
      screen.getByText(/Twoje dane są zapisywane wyłącznie w tej przeglądarce/),
    ).toHaveTextContent("modele AI/LLM");
    expect(container.querySelector(".cycle-compass-logo")).toBeInTheDocument();
    expect(container.querySelector(".brand-mark svg")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".forecast-report")).not.toHaveTextContent(
      "Zakres prognozy",
    );
    expect(screen.getByRole("heading", { name: "Kalendarz" })).toBeInTheDocument();
    expect(container.querySelector(".month-card .day")).toBeInTheDocument();
    expect(container.querySelectorAll(".calendar-week .bar-lane")).not.toHaveLength(0);
    const months = container.querySelectorAll(".month-card");
    expect(months[0].querySelectorAll(".calendar-week")).toHaveLength(5);
    expect(months[0].querySelectorAll(".day")).toHaveLength(35);
    expect(months[3].querySelectorAll(".calendar-week")).toHaveLength(6);
    expect(months[3].querySelectorAll(".day")).toHaveLength(42);
  });

  it("renders adjacent-month positions as empty placeholders without duplicated events", async () => {
    vi.setSystemTime(new Date(2026, 5, 10, 12));
    setMobileViewport(true);
    const { container } = render(<CyclePlanner />);
    const nextMonth = addMonths(startOfMonth(today()), 1);

    fireEvent.click(await screen.findByRole("button", { name: "Zarządzaj planami" }));
    chooseTab("Wyjazdy");
    fireEvent.change(screen.getByLabelText("Nazwa wyjazdu"), {
      target: { value: "Pierwszy dzień miesiąca" },
    });
    fireEvent.change(screen.getByLabelText("Od"), {
      target: { value: nextMonth },
    });
    fireEvent.change(screen.getByLabelText("Do"), {
      target: { value: nextMonth },
    });
    fireEvent.click(screen.getByRole("button", { name: "Dodaj wyjazd" }));

    const months = container.querySelectorAll(".month-card");
    const placeholders = months[0].querySelectorAll(".day-placeholder");
    expect(placeholders.length).toBeGreaterThan(0);
    placeholders.forEach((placeholder) => {
      expect(placeholder).toHaveAttribute("aria-hidden", "true");
      expect(placeholder).toBeEmptyDOMElement();
      expect(placeholder).not.toHaveAttribute("aria-label");
    });
    expect(months[0].querySelector(".bar-trips")).not.toBeInTheDocument();
    expect(months[1].querySelector(".bar-trips")).toBeInTheDocument();

    fireEvent.click(placeholders[0]);
    expect(screen.queryByLabelText("Szczegóły dnia")).not.toBeInTheDocument();
  });

  it("keeps dates and events in a month that requires its sixth week", async () => {
    vi.setSystemTime(new Date(2026, 2, 10, 12));
    const { container } = render(<CyclePlanner />);
    await screen.findByRole("tab", { name: "Podsumowanie" });
    chooseTab("Wyjazdy");
    fireEvent.change(screen.getByLabelText("Nazwa wyjazdu"), {
      target: { value: "Koniec marca" },
    });
    fireEvent.change(screen.getByLabelText("Od"), {
      target: { value: "2026-03-30" },
    });
    fireEvent.change(screen.getByLabelText("Do"), {
      target: { value: "2026-03-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Dodaj wyjazd" }));

    const march = container.querySelector(".month-card") as HTMLElement;
    expect(march.querySelectorAll(".calendar-week")).toHaveLength(6);
    expect(march.querySelectorAll(".day")).toHaveLength(42);
    expect(march).toHaveTextContent("30");
    expect(march).toHaveTextContent("31");
    expect(march.querySelector(".bar-trips")).toHaveTextContent("Koniec marca");
  });

  it("switches between 2, 4, 8 and 12 months and stores the selected horizon", async () => {
    const { container } = render(<CyclePlanner />);
    await screen.findByRole("tab", { name: "Podsumowanie" });

    for (const [label, expected] of [
      ["2 miesiące", 2],
      ["4 miesiące", 4],
      ["8 miesięcy", 8],
      ["12 miesięcy", 12],
    ] as const) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(container.querySelectorAll(".month-card")).toHaveLength(expected);
      expect(JSON.parse(localStorage.getItem(storageKey) ?? "{}").horizonMonths).toBe(
        expected,
      );
    }

    fireEvent.click(screen.getByRole("button", { name: "2 miesiące wstecz" }));
    expect(container.querySelectorAll(".month-card")).toHaveLength(14);
    expect(JSON.parse(localStorage.getItem(storageKey) ?? "{}").pastMonths).toBe(2);
  });

  it("selects a holiday country and shows holidays as a removable calendar layer", async () => {
    vi.setSystemTime(new Date(2026, 0, 1, 12));
    const { container } = render(<CyclePlanner />);
    await screen.findByRole("tab", { name: "Podsumowanie" });

    expect(screen.getByText(/Daty regionalne mogą się różnić/)).toBeInTheDocument();
    expect(screen.getByLabelText("Kraj świąt")).toHaveValue("PL");
    expect(container.querySelector(".bar-holidays")).toBeInTheDocument();
    expect(container.querySelector(".forecast-report")).toHaveTextContent("Nowy Rok");

    fireEvent.click(screen.getByLabelText("Pokaż święta w kalendarzu"));
    expect(container.querySelector(".bar-holidays")).not.toBeInTheDocument();
    expect(container.querySelector(".forecast-report")).not.toHaveTextContent("Nowy Rok");

    fireEvent.change(screen.getByLabelText("Kraj świąt"), { target: { value: "GB" } });
    fireEvent.click(screen.getByLabelText("Pokaż święta w kalendarzu"));
    expect(JSON.parse(localStorage.getItem(storageKey) ?? "{}").holidayCountry).toBe("GB");
    expect(container.querySelector(".bar-holidays")).toBeInTheDocument();
  });

  it("stores and restores the chosen panel tab separately from private data", async () => {
    const { unmount } = render(<CyclePlanner />);
    await screen.findByRole("tab", { name: "Podsumowanie" });
    chooseTab("Wyjazdy");
    expect(localStorage.getItem(panelTabKey)).toBe("trips");
    unmount();
    render(<CyclePlanner />);
    expect(await screen.findByRole("tab", { name: "Wyjazdy" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("renders icon bars for forecast and trips and hides toggled layers", async () => {
    const { container } = render(<CyclePlanner />);
    await screen.findByRole("tab", { name: "Cykl" });
    addCycle();
    chooseTab("Wyjazdy");
    addTrip("Wyjazd na okres");
    chooseTab("Podsumowanie");

    expect(container.querySelector(".calendar-bar.bar-period")).toHaveTextContent("Miesiączka");
    expect(container.querySelector(".calendar-bar.bar-fertile")).toHaveTextContent("Płodne");
    expect(container.querySelector(".calendar-bar.bar-ovulation")).toHaveTextContent("Owulacja");
    expect(container.querySelector(".calendar-bar.bar-trips")).toHaveTextContent("Wyjazd na okres");
    expect(container.querySelector(".calendar-bar.bar-period svg")).toBeInTheDocument();
    expect(container.querySelector(".summary-panel")).not.toHaveTextContent("Następna miesiączka");
    const toolbar = within(container.querySelector(".result-toolbar") as HTMLElement);
    expect(toolbar.getByText("Następna miesiączka")).toBeInTheDocument();
    expect(toolbar.getByLabelText(/Następna miesiączka:/)).toHaveClass("forecast-chip");
    expect(toolbar.getByLabelText(/Szacowana owulacja:/)).toHaveClass("forecast-chip");
    expect(toolbar.getByLabelText(/Okno płodne:/)).toHaveClass("forecast-chip");
    fireEvent.click(screen.getByLabelText("Miesiączka"));
    expect(container.querySelector(".calendar-bar.bar-period")).not.toBeInTheDocument();
    expect(screen.getByText("Następna miesiączka")).toBeInTheDocument();
  });

  it("localizes forecast chips in the calendar toolbar and hides them without cycle data", async () => {
    const { container } = render(<CyclePlanner />);
    await screen.findByRole("tab", { name: "Podsumowanie" });
    expect(container.querySelector(".forecast-chips")).not.toBeInTheDocument();

    addCycle();
    let toolbar = within(container.querySelector(".result-toolbar") as HTMLElement);
    expect(toolbar.getByLabelText(/Następna miesiączka:/)).toHaveAttribute(
      "title",
      expect.stringMatching(/^Następna miesiączka:/),
    );

    fireEvent.change(screen.getByLabelText("Język"), { target: { value: "en" } });
    toolbar = within(container.querySelector(".result-toolbar") as HTMLElement);
    expect(toolbar.getByLabelText(/Next period:/)).toHaveAttribute(
      "title",
      expect.stringMatching(/^Next period:/),
    );
    expect(toolbar.getByLabelText(/Estimated ovulation:/)).toBeInTheDocument();
    expect(toolbar.getByLabelText(/Fertile window:/)).toBeInTheDocument();
  });

  it("adds, edits and removes saved periods while revealing past months", async () => {
    vi.setSystemTime(new Date(2026, 4, 27, 12));
    const { container } = render(<CyclePlanner />);
    await screen.findByRole("tab", { name: "Cykl" });
    chooseTab("Cykl");

    fireEvent.change(screen.getByLabelText("Pierwszy dzień miesiączki"), {
      target: { value: "2026-03-10" },
    });
    fireEvent.change(screen.getByLabelText(/Długość tej miesiączki/), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Dodaj miesiączkę" }));

    expect(screen.getByText("10 marca 2026")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(storageKey) ?? "{}").pastMonths).toBe(2);
    expect(container.querySelectorAll(".month-card")).toHaveLength(6);

    fireEvent.click(screen.getByLabelText("Edytuj miesiączkę: 10 marca 2026"));
    fireEvent.change(screen.getByLabelText(/Długość tej miesiączki/), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Zapisz miesiączkę" }));
    expect(screen.getByText("5 dni")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Usuń miesiączkę: 10 marca 2026"));
    expect(screen.getByText("Nie masz jeszcze zapisanych miesiączek.")).toBeInTheDocument();
  });

  it("moves focus from trip start to end when adding and editing", async () => {
    render(<CyclePlanner />);
    await screen.findByRole("tab", { name: "Wyjazdy" });
    chooseTab("Wyjazdy");
    const end = screen.getByLabelText("Do");
    fireEvent.change(end, { target: { value: today(9) } });
    fireEvent.change(screen.getByLabelText("Od"), { target: { value: today(5) } });
    expect(end).toHaveFocus();
    expect(end).toHaveValue(today(9));

    addTrip("Skupienie", 5, 9);
    fireEvent.click(screen.getByLabelText("Edytuj: Skupienie"));
    fireEvent.change(screen.getByLabelText("Od"), { target: { value: today(6) } });
    expect(screen.getByLabelText("Do")).toHaveFocus();
    expect(screen.getByLabelText("Do")).toHaveValue(today(9));
  });

  it("uses the three-tab mobile drawer and reveals full day details after tapping a bar day", async () => {
    setMobileViewport(true);
    const { container } = render(<CyclePlanner />);
    expect(await screen.findByRole("button", { name: "Zarządzaj planami" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Nazwa wyjazdu")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Zarządzaj planami" }));
    expect(screen.getByRole("tab", { name: "Podsumowanie" })).toBeInTheDocument();
    chooseTab("Wyjazdy");
    addTrip("Mobilny wyjazd");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container.querySelector(".calendar-bar.bar-trips")).toBeInTheDocument();

    const activeDay = screen.getAllByLabelText(/Wyjazdy: Mobilny wyjazd/)[0];
    fireEvent.click(activeDay);
    expect(screen.getByLabelText("Szczegóły dnia")).toHaveTextContent("Mobilny wyjazd");
  });

  it("keeps validation in the mobile drawer and closes it with Escape and backdrop", async () => {
    setMobileViewport(true);
    const { container } = render(<CyclePlanner />);
    fireEvent.click(await screen.findByRole("button", { name: "Zarządzaj planami" }));
    chooseTab("Cykl");
    fireEvent.click(screen.getByRole("button", { name: "Dodaj miesiączkę" }));
    expect(screen.getByText("Podaj pierwszy dzień miesiączki.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Zarządzaj planami" }));
    fireEvent.mouseDown(container.querySelector(".drawer-backdrop") as HTMLElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("migrates v1, keeps trips when removing a cycle, and clears tab preference on full reset", async () => {
    localStorage.setItem(
      "kalendarzyk.settings.v1",
      JSON.stringify({
        storageVersion: 1,
        lastPeriodStart: today(-23),
        cycleLengthDays: 28,
        periodLengthDays: 5,
        locale: "pl",
        horizonMonths: 6,
        visibleLayers: { period: true, fertile: true, ovulation: true },
      }),
    );
    render(<CyclePlanner />);
    await screen.findByRole("tab", { name: "Podsumowanie" });
    expect(screen.getByRole("button", { name: "4 miesiące" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    chooseTab("Wyjazdy");
    addTrip("Lato");
    chooseTab("Podsumowanie");
    fireEvent.click(screen.getByRole("button", { name: "Usuń dane" }));
    fireEvent.click(screen.getByRole("button", { name: "Usuń cykl, zachowaj wyjazdy" }));
    expect(JSON.parse(localStorage.getItem(storageKey) ?? "{}").cycleSettings).toBeNull();
    expect(JSON.parse(localStorage.getItem(storageKey) ?? "{}").periodEntries).toEqual([]);
    chooseTab("Wyjazdy");
    expect(screen.getAllByText("Lato").length).toBeGreaterThan(0);
    chooseTab("Podsumowanie");
    fireEvent.click(screen.getByRole("button", { name: "Usuń dane" }));
    fireEvent.click(screen.getByRole("button", { name: "Usuń wszystko" }));
    expect(localStorage.getItem(panelTabKey)).toBeNull();
  });

  it("uses compact icon actions with localized accessible labels", async () => {
    const { container } = render(<CyclePlanner />);
    await screen.findByRole("tab", { name: "Wyjazdy" });
    chooseTab("Wyjazdy");
    addTrip("Akcje");
    chooseTab("Podsumowanie");

    const actions = container.querySelector(".actions-panel");
    expect(actions).not.toHaveTextContent("Eksportuj");
    expect(screen.getByRole("button", { name: "Eksportuj obraz PNG" })).toHaveAttribute(
      "title",
      "Eksportuj obraz PNG",
    );
    expect(screen.getByRole("button", { name: "Eksportuj do kalendarza (.ics)" })).toHaveAttribute(
      "title",
      "Eksportuj do kalendarza (.ics)",
    );
    expect(screen.getByRole("button", { name: "Usuń dane" })).toHaveAttribute(
      "title",
      "Usuń dane",
    );

    fireEvent.change(screen.getByLabelText("Język"), { target: { value: "en" } });
    expect(
      screen.getByText(/Your data is stored only in this browser/),
    ).toHaveTextContent("never sent to third parties or processed by AI/LLM models");
    expect(screen.getAllByText("Cycle Compass").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Export PNG image" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export to calendar (.ics)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete data" })).toBeInTheDocument();
  });

  it("exports only the simplified calendar and respects disabled trip and holiday layers", async () => {
    const download = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const { container } = render(<CyclePlanner />);
    await screen.findByRole("tab", { name: "Wyjazdy" });
    chooseTab("Wyjazdy");
    addTrip("Góry");
    chooseTab("Podsumowanie");
    expect(container.querySelector(".forecast-report")).toHaveTextContent("Góry");
    fireEvent.click(screen.getByLabelText("Wyjazdy"));
    expect(container.querySelector(".forecast-report")).not.toHaveTextContent("Góry");
    fireEvent.click(screen.getByLabelText("Pokaż święta w kalendarzu"));
    expect(container.querySelector(".bar-holidays")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Wyjazdy"));
    fireEvent.click(screen.getByLabelText("Pokaż święta w kalendarzu"));
    vi.mocked(toPng).mockImplementationOnce(async (node) => {
      const report = node as HTMLElement;
      expect(report).toHaveClass("export-capture");
      expect(report).toHaveTextContent("Kalendarz");
      expect(report).toHaveTextContent("Góry");
      expect(report.querySelector(".bar-holidays")).toBeInTheDocument();
      expect(report).not.toHaveTextContent("Nazwa wyjazdu");
      expect(report.querySelector(".day-placeholder")).toBeEmptyDOMElement();
      return "data:image/png;base64,test";
    });
    fireEvent.click(screen.getByRole("button", { name: "Eksportuj obraz PNG" }));
    fireEvent.click(screen.getByRole("button", { name: "Pobierz PNG" }));
    await waitFor(() => expect(toPng).toHaveBeenCalled());
    expect(download).toHaveBeenCalled();
    download.mockRestore();
  });
});
