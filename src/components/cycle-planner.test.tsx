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
  vi.mocked(toPng).mockClear();
});

function today(offset = 0) {
  return addDays(toDateKey(new Date()), offset);
}

function createForecast() {
  render(<CyclePlanner />);
  fireEvent.change(screen.getByLabelText("Pierwszy dzień ostatniej miesiączki"), {
    target: { value: today(-23) },
  });
  fireEvent.click(screen.getByRole("button", { name: "Pokaż prognozę" }));
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
    expect(screen.getAllByText("Majówka")).toHaveLength(2);
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    expect(saved.cycle).toBeNull();
    expect(saved.trips[0].name).toBe("Majówka");
  });

  it("creates a cycle forecast and keeps overlap icons after a layer is hidden", async () => {
    createForecast();
    expect(await screen.findByText("Prognoza cyklu")).toBeInTheDocument();
    addTrip("Wyjazd na okres", 5, 6);

    expect(screen.getByTitle("Miesiączka")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Miesiączka"));
    expect(screen.getByTitle("Miesiączka")).toBeInTheDocument();

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
    expect(screen.getAllByText("Długi weekend")).toHaveLength(2);
    fireEvent.click(screen.getByLabelText("Usuń: Długi weekend"));
    expect(screen.queryByText("Długi weekend")).not.toBeInTheDocument();
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
    expect(screen.getAllByText("Lato")).toHaveLength(2);
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
