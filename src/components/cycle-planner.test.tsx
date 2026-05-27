import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toPng } from "html-to-image";
import CyclePlanner from "@/components/cycle-planner";
import { addDays, toDateKey } from "@/lib/cycle";

vi.mock("html-to-image", () => ({
  toPng: vi.fn().mockResolvedValue("data:image/png;base64,test"),
}));

const storageKey = "kalendarzyk.settings.v2";
const panelTabKey = "kalendarzyk.panelTab";

beforeEach(() => {
  Object.defineProperty(window.navigator, "language", {
    configurable: true,
    value: "pl-PL",
  });
  setMobileViewport(false);
  vi.mocked(toPng).mockClear();
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
  fireEvent.change(screen.getByLabelText("Pierwszy dzień ostatniej miesiączki"), {
    target: { value: today(-23) },
  });
  fireEvent.click(screen.getByRole("button", { name: "Pokaż prognozę" }));
}

describe("CyclePlanner", () => {
  it("places information in a tabbed sidebar and keeps the calendar compact", async () => {
    const { container } = render(<CyclePlanner />);
    expect(await screen.findByRole("tab", { name: "Podsumowanie" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Dodaj cykl, aby porównać terminy")).toBeInTheDocument();
    expect(container.querySelector(".forecast-report")).not.toHaveTextContent(
      "Zakres prognozy",
    );
    expect(screen.getByRole("heading", { name: "Kalendarz" })).toBeInTheDocument();
    expect(container.querySelector(".month-card .day")).toBeInTheDocument();
    expect(container.querySelectorAll(".calendar-week .bar-lane")).not.toHaveLength(0);
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
    fireEvent.click(screen.getByLabelText("Miesiączka"));
    expect(container.querySelector(".calendar-bar.bar-period")).not.toBeInTheDocument();
    expect(screen.getByText("Następna miesiączka")).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Pokaż prognozę" }));
    expect(screen.getByText("Podaj pierwszy dzień ostatniej miesiączki.")).toBeInTheDocument();
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
    chooseTab("Wyjazdy");
    addTrip("Lato");
    chooseTab("Podsumowanie");
    fireEvent.click(screen.getByRole("button", { name: "Usuń dane" }));
    fireEvent.click(screen.getByRole("button", { name: "Usuń cykl, zachowaj wyjazdy" }));
    expect(JSON.parse(localStorage.getItem(storageKey) ?? "{}").cycle).toBeNull();
    chooseTab("Wyjazdy");
    expect(screen.getAllByText("Lato").length).toBeGreaterThan(0);
    chooseTab("Podsumowanie");
    fireEvent.click(screen.getByRole("button", { name: "Usuń dane" }));
    fireEvent.click(screen.getByRole("button", { name: "Usuń wszystko" }));
    expect(localStorage.getItem(panelTabKey)).toBeNull();
  });

  it("exports only the simplified calendar and respects a disabled trips layer", async () => {
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
    fireEvent.click(screen.getByLabelText("Wyjazdy"));
    vi.mocked(toPng).mockImplementationOnce(async (node) => {
      const report = node as HTMLElement;
      expect(report).toHaveClass("export-capture");
      expect(report).toHaveTextContent("Kalendarz");
      expect(report).toHaveTextContent("Góry");
      expect(report).not.toHaveTextContent("Nazwa wyjazdu");
      return "data:image/png;base64,test";
    });
    fireEvent.click(screen.getByRole("button", { name: "Eksportuj PNG" }));
    fireEvent.click(screen.getByRole("button", { name: "Pobierz PNG" }));
    await waitFor(() => expect(toPng).toHaveBeenCalled());
    expect(download).toHaveBeenCalled();
    download.mockRestore();
  });
});
