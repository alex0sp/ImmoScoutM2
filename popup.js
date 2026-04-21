(() => {
  const STORAGE_KEY = "immoBadgeColorSettings";
  const PERSIST_DEBOUNCE_MS = 220;

  const DEFAULT_SETTINGS = {
    colorsEnabled: true,
    thresholds: [
      { maxPrice: 4500, color: "#22c55e" },
      { maxPrice: 6500, color: "#f59e0b" }
    ],
    aboveColor: "#ef4444"
  };

  const listEl = document.getElementById("threshold-list");
  const aboveColorEl = document.getElementById("above-color");
  const colorsEnabledEl = document.getElementById("colors-enabled");
  const addBtn = document.getElementById("add-threshold");
  const statusEl = document.getElementById("status");

  let settings = structuredClone(DEFAULT_SETTINGS);
  let loading = true;
  let persistTimer = null;

  const showStatus = (message, isError = false) => {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", isError);
    if (!message) return;
    window.setTimeout(() => {
      if (statusEl.textContent === message) {
        statusEl.textContent = "";
        statusEl.classList.remove("error");
      }
    }, 4000);
  };

  const createRow = (maxPrice, color) => {
    const row = document.createElement("div");
    row.className = "threshold-row";

    const label = document.createElement("label");
    label.htmlFor = "";
    label.textContent = "Bis €/m²";

    const maxInput = document.createElement("input");
    maxInput.type = "number";
    maxInput.min = "0";
    maxInput.step = "1";
    maxInput.value = String(maxPrice);
    maxInput.setAttribute("aria-label", "Maximaler Preis pro Quadratmeter in Euro");

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = color;
    colorInput.setAttribute("aria-label", "Farbe für diesen Bereich");

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove";
    removeBtn.textContent = "Entfernen";
    removeBtn.addEventListener("click", () => {
      row.remove();
      if (!listEl.querySelector(".threshold-row")) {
        addThresholdRow(4500, "#22c55e");
      }
      requestPersist(true);
    });

    row.append(label, maxInput, colorInput, removeBtn);
    return row;
  };

  const addThresholdRow = (maxPrice, color) => {
    listEl.appendChild(createRow(maxPrice, color));
  };

  const readRowsFromDom = () => {
    const rows = Array.from(listEl.querySelectorAll(".threshold-row"));
    return rows
      .map((row) => {
        const maxInput = row.querySelector('input[type="number"]');
        const colorInput = row.querySelector('input[type="color"]');
        const maxPrice = Number.parseFloat(maxInput?.value ?? "");
        const color = colorInput?.value ?? "#000000";
        return { maxPrice, color };
      })
      .filter((t) => Number.isFinite(t.maxPrice) && t.maxPrice >= 0);
  };

  const render = () => {
    listEl.replaceChildren();
    const sorted = [...settings.thresholds].sort(
      (a, b) => a.maxPrice - b.maxPrice
    );
    if (sorted.length === 0) {
      addThresholdRow(4500, "#22c55e");
    } else {
      sorted.forEach((t) => addThresholdRow(t.maxPrice, t.color));
    }
    aboveColorEl.value = settings.aboveColor || DEFAULT_SETTINGS.aboveColor;
    colorsEnabledEl.checked = settings.colorsEnabled !== false;
  };

  const buildPayload = () => {
    const colorsEnabled = colorsEnabledEl.checked;
    const raw = readRowsFromDom();

    let thresholds;
    if (colorsEnabled) {
      if (raw.length === 0) {
        return null;
      }
      thresholds = [...raw]
        .sort((a, b) => a.maxPrice - b.maxPrice)
        .map((t) => ({ maxPrice: t.maxPrice, color: t.color }));
    } else {
      thresholds =
        raw.length > 0
          ? [...raw]
              .sort((a, b) => a.maxPrice - b.maxPrice)
              .map((t) => ({ maxPrice: t.maxPrice, color: t.color }))
          : structuredClone(settings.thresholds).length > 0
            ? structuredClone(settings.thresholds)
            : structuredClone(DEFAULT_SETTINGS.thresholds);
    }

    return {
      colorsEnabled,
      thresholds,
      aboveColor: aboveColorEl.value
    };
  };

  const persistFromDom = () => {
    if (loading) return;

    const payload = buildPayload();
    if (!payload) {
      return;
    }

    chrome.storage.sync.set({ [STORAGE_KEY]: payload }, () => {
      if (chrome.runtime.lastError) {
        showStatus(chrome.runtime.lastError.message, true);
        return;
      }
      settings = payload;
      statusEl.textContent = "";
      statusEl.classList.remove("error");
    });
  };

  const requestPersist = (immediate = false) => {
    if (loading) return;
    window.clearTimeout(persistTimer);
    persistTimer = null;
    if (immediate) {
      persistFromDom();
      return;
    }
    persistTimer = window.setTimeout(() => {
      persistTimer = null;
      persistFromDom();
    }, PERSIST_DEBOUNCE_MS);
  };

  listEl.addEventListener("input", (e) => {
    if (!e.target.closest(".threshold-row")) return;
    requestPersist(e.target.type === "color");
  });

  listEl.addEventListener("change", (e) => {
    if (e.target.closest(".threshold-row")) {
      requestPersist(true);
    }
  });

  colorsEnabledEl.addEventListener("change", () => requestPersist(true));

  aboveColorEl.addEventListener("input", () => requestPersist());
  aboveColorEl.addEventListener("change", () => requestPersist(true));

  addBtn.addEventListener("click", () => {
    addThresholdRow(8000, "#94a3b8");
    requestPersist(true);
  });

  const load = () => {
    loading = true;
    chrome.storage.sync.get([STORAGE_KEY], (data) => {
      const stored = data[STORAGE_KEY];
      if (stored && typeof stored === "object") {
        settings = {
          colorsEnabled: stored.colorsEnabled !== false,
          thresholds: Array.isArray(stored.thresholds)
            ? stored.thresholds.map((t) => ({
                maxPrice: Number(t.maxPrice),
                color: String(t.color || "#000000")
              }))
            : structuredClone(DEFAULT_SETTINGS.thresholds),
          aboveColor:
            typeof stored.aboveColor === "string"
              ? stored.aboveColor
              : DEFAULT_SETTINGS.aboveColor
        };
      } else {
        settings = structuredClone(DEFAULT_SETTINGS);
      }
      render();
      loading = false;
    });
  };

  load();
})();
