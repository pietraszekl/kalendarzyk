import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toPng } from "html-to-image";
import CyclePlanner from "@/components/cycle-planner";
import { addDays, toDateKey } from "@/lib/cycle";

vi.mock("html-to-image", () => ({
  toPng: vi.fn().mockResolvedValue("data:image/png;base64,test"),
}));

const storageKey = "kalendarzyk.settings.v2";

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

function addTrip(name = "Urlop", startOffset = 5, endOffset = 7) {
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

describe("CyclePlanner", () => {
  it("shows a trip calendar and stores a trip without cycle data", async () => {
    render(<CyclePlanner />);
    expect(await screen.findByText("Kalendarz planów")).toBeInTheDocument();
    expect(screen.getByText("Dodaj cykl, aby porównać terminy")).toBeInTheDocument();

    addTrip("Majówka");
    expect(screen.getAllByText("Majówka").length).toBeGreaterThanOrEqual(2);
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    expect(saved.cycle).toBeNull();
    expect(saved.trips[0].name).toBe("Majówka");
  });

  it("renders forecast and trip ranges as bars and hides a toggled layer", async () => {
    const { container } = render(<CyclePlanner />);
    fireEvent.change(screen.getByLabelText("Pierwszy dzień ostatniej miesiączki"), {
      target: { value: today(-23) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Pokaż prognozę" }));
    expect(await screen.findByText("Prognoza cyklu")).toBeInTheDocument();
    addTrip("Wyjazd na okres", 5, 6);

    expect(container.querySelector(".calendar-bar.bar-period")).toBeInTheDocument();
    expect(container.querySelector(".calendar-bar.bar-fertile")).toBeInTheDocument();
    expect(container.querySelector(".calendar-bar.bar-ovulation")).toBeInTheDocument();
    expect(container.querySelector(".calendar-bar.bar-period")).toHaveTextContent("M.");
    expect(container.querySelector(".calendar-bar.bar-fertile")).toHaveTextContent("Pł.");
    expect(container.querySelector(".calendar-bar.bar-ovulation")).toHaveTextContent("Ow.");
    expect(container.querySelector(".calendar-bar.bar-trips")).toHaveTextContent("Wyjazd na okres");
    expect(screen.getByTitle("Miesiączka")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Miesiączka"));
    expect(screen.getByTitle("Miesiączka")).toBeInTheDocument();
    expect(container.querySelector(".calendar-bar.bar-period")).not.toBeInTheDocument();

    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    expect(saved.visibleLayers.period).toBe(false);
  });

  it("edits and removes a planned trip", async () => {
    render(<CyclePlanner />);
    await screen.findByText("Kalendarz planów");
    addTrip("Weekend");
    fireEvent.click(screen.getByLabelText("Edytuj: Weekend"));
    fireEvent.change(screen.getByLabelText("Nazwa wyjazdu"), {
      target: { value: "Długi weekend" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Zapisz zmiany" }));
    expect(screen.getAllByText("Długi weekend").length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByLabelText("Usuń: Długi weekend"));
    expect(screen.queryByText("Długi weekend")).not.toBeInTheDocument();
  });

  it("moves focus from trip start to end without overwriting the end date", async () => {
    render(<CyclePlanner />);
    await screen.findByText("Kalendarz planów");
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

  it("moves focus between trip dates inside the mobile drawer", async () => {
    setMobileViewport(true);
    render(<CyclePlanner />);
    fireEvent.click(await screen.findByRole("button", { name: "Zarządzaj planami" }));
    const end = screen.getByLabelText("Do");
    fireEvent.change(screen.getByLabelText("Od"), { target: { value: today(4) } });
    expect(end).toHaveFocus();
    expect(end).toHaveValue("");
  });

  it("keeps management behind a mobile drawer and closes it after saving a trip", async () => {
    setMobileViewport(true);
    render(<CyclePlanner />);

    expect(await screen.findByRole("button", { name: "Zarządzaj planami" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Nazwa wyjazdu")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Zarządzaj planami" }));
    expect(screen.getByRole("dialog", { name: "Zarządzaj danymi" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nazwa wyjazdu")).toBeInTheDocument();

    addTrip("Mobilny wyjazd");
    expect(screen.queryByRole("dialog", { name: "Zarządzaj danymi" })).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/Wyjazdy: Mobilny wyjazd/).length).toBeGreaterThan(0);
  });

  it("supports mobile cycle tab, validation, escape and backdrop closing", async () => {
    setMobileViewport(true);
    const { container } = render(<CyclePlanner />);
    fireEvent.click(await screen.findByRole("button", { name: "Zarządzaj planami" }));
    fireEvent.click(screen.getByRole("tab", { name: "Cykl" }));
    fireEvent.click(screen.getByRole("button", { name: "Pokaż prognozę" }));
    expect(screen.getByText("Podaj pierwszy dzień ostatniej miesiączki.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Zarządzaj planami" }));
    fireEvent.mouseDown(container.querySelector(".drawer-backdrop") as HTMLElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("migrates stored v1 settings and supports keeping trips while deleting the cycle", async () => {
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
    expect(await screen.findByText("Prognoza cyklu")).toBeInTheDocument();
    addTrip("Lato");
    fireEvent.click(screen.getByRole("button", { name: "Usuń dane" }));
    fireEvent.click(screen.getByRole("button", { name: "Usuń cykl, zachowaj wyjazdy" }));

    expect(screen.getByText("Kalendarz planów")).toBeInTheDocument();
    expect(screen.getAllByText("Lato").length).toBeGreaterThanOrEqual(2);
    expect(JSON.parse(localStorage.getItem(storageKey) ?? "{}").cycle).toBeNull();
  });

  it("exports trips locally and excludes them from the report when hidden", async () => {
    const download = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const { container } = render(<CyclePlanner />);
    await screen.findByText("Kalendarz planów");
    addTrip("Góry");
    expect(container.querySelector(".forecast-report")?.textContent).toContain("Góry");

    fireEvent.click(screen.getByLabelText("Wyjazdy"));
    expect(container.querySelector(".forecast-report")?.textContent).not.toContain("Góry");
    fireEvent.click(screen.getByLabelText("Wyjazdy"));
    fireEvent.click(screen.getByRole("button", { name: "Eksportuj PNG" }));
    expect(screen.getByText("Pobrać prywatną prognozę?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pobierz PNG" }));

    await waitFor(() => expect(toPng).toHaveBeenCalled());
    expect(download).toHaveBeenCalled();
    download.mockRestore();
  });

  it("reveals mobile-only hidden trip details during PNG capture", async () => {
    setMobileViewport(true);
    const download = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    vi.mocked(toPng).mockImplementationOnce(async (node) => {
      expect((node as HTMLElement).classList).toContain("export-capture");
      expect((node as HTMLElement).textContent).toContain("Morski urlop");
      return "data:image/png;base64,test";
    });
    render(<CyclePlanner />);
    fireEvent.click(await screen.findByRole("button", { name: "Zarządzaj planami" }));
    addTrip("Morski urlop");
    fireEvent.click(screen.getByRole("button", { name: "Eksportuj PNG" }));
    fireEvent.click(screen.getByRole("button", { name: "Pobierz PNG" }));

    await waitFor(() => expect(toPng).toHaveBeenCalled());
    download.mockRestore();
  });

  it("switches language and deletes all locally stored data", async () => {
    render(<CyclePlanner />);
    await screen.findByText("Kalendarz planów");
    addTrip("Urlop");
    fireEvent.change(screen.getByLabelText("Język"), { target: { value: "en" } });
    expect(screen.getByText("Plans calendar")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete data" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete everything" }));

    await waitFor(() => expect(localStorage.getItem(storageKey)).toBeNull());
    expect(screen.queryByText("Urlop")).not.toBeInTheDocument();
  });
});
