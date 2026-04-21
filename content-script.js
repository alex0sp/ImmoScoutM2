(() => {
  const RESULT_CONTAINER_SELECTOR = "#result-list-content";
  const IMAGE_SELECTOR = "img.gallery__image";
  const BADGE_CLASS = "immo-price-badge";
  const CONTAINER_CLASS = "immo-badge-container";
  const STORAGE_KEY = "immoBadgeColorSettings";

  const DEFAULT_THRESHOLDS = {
    thresholds: [
      { maxPrice: 4500, color: "#22c55e" },
      { maxPrice: 6500, color: "#f59e0b" }
    ],
    aboveColor: "#ef4444"
  };

  const numberFormatter = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 0
  });

  let colorSettings = { colorsEnabled: true, ...DEFAULT_THRESHOLDS };

  const parseGermanNumber = (text) => {
    if (!text) return null;
    const normalized = text
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.]/g, "");
    const value = Number.parseFloat(normalized);
    return Number.isFinite(value) ? value : null;
  };

  const parseRange = (text) => {
    if (!text) return null;
    if (!text.includes("-")) {
      const value = parseGermanNumber(text);
      return value ? { min: value, max: value } : null;
    }

    const parts = text.split("-").map((part) => parseGermanNumber(part));
    if (parts.length < 2 || !parts[0] || !parts[1]) return null;

    const min = Math.min(parts[0], parts[1]);
    const max = Math.max(parts[0], parts[1]);
    return { min, max };
  };

  const findCardRoot = (img) => {
    return (
      img.closest('[class*="listing-card"]') ||
      img.closest('[class*="cardContainer"]') ||
      img.closest('[class*="HybridViewListView"]') ||
      img.closest('[class*="HybridViewListViewContainer"]') ||
      img.closest("article") ||
      img.parentElement
    );
  };

  const extractPriceAndArea = (card) => {
    const ddNodes = Array.from(card.querySelectorAll("dd"));
    let priceText = null;
    let areaText = null;

    for (const node of ddNodes) {
      const text = node.textContent || "";
      if (!priceText && text.includes("€")) {
        priceText = text;
      }
      if (!areaText && text.includes("m²")) {
        areaText = text;
      }
      if (priceText && areaText) break;
    }

    const price = parseRange(priceText);
    const area = parseRange(areaText);

    if (!price || !area) return null;
    return { price, area };
  };

  const parseThresholdPayload = (raw) => {
    if (!raw || typeof raw !== "object") return null;
    const thresholds = Array.isArray(raw.thresholds)
      ? raw.thresholds
          .map((t) => ({
            maxPrice: Number(t.maxPrice),
            color: typeof t.color === "string" ? t.color : "#000000"
          }))
          .filter((t) => Number.isFinite(t.maxPrice) && t.maxPrice >= 0)
          .sort((a, b) => a.maxPrice - b.maxPrice)
      : [];
    if (thresholds.length === 0) return null;
    const aboveColor =
      typeof raw.aboveColor === "string" && raw.aboveColor.startsWith("#")
        ? raw.aboveColor
        : DEFAULT_THRESHOLDS.aboveColor;
    return { thresholds, aboveColor };
  };

  const resolveColorSettings = (raw) => {
    if (raw === undefined || raw === null) {
      return { colorsEnabled: true, ...DEFAULT_THRESHOLDS };
    }
    if (typeof raw !== "object") {
      return { colorsEnabled: true, ...DEFAULT_THRESHOLDS };
    }
    if (raw.colorsEnabled === false) {
      return { colorsEnabled: false };
    }
    const parsed = parseThresholdPayload(raw);
    if (parsed) {
      return { colorsEnabled: true, ...parsed };
    }
    return { colorsEnabled: true, ...DEFAULT_THRESHOLDS };
  };

  const hexToRgb = (hex) => {
    if (!hex || typeof hex !== "string") return null;
    let h = hex.replace("#", "").trim();
    if (h.length === 3) {
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    }
    if (h.length !== 6) return null;
    const n = Number.parseInt(h, 16);
    if (!Number.isFinite(n)) return null;
    return {
      r: (n >> 16) & 255,
      g: (n >> 8) & 255,
      b: n & 255
    };
  };

  const contrastTextForBackground = (hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return "#000000";
    const linearize = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const r = linearize(rgb.r);
    const g = linearize(rgb.g);
    const b = linearize(rgb.b);
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.179 ? "#000000" : "#ffffff";
  };

  const pickBackgroundColor = (settings, minPerM2) => {
    if (!settings?.colorsEnabled || !settings?.thresholds?.length) return null;
    for (const t of settings.thresholds) {
      if (minPerM2 <= t.maxPrice) return t.color;
    }
    return settings.aboveColor;
  };

  const applyBadgeAppearance = (badge, minPerM2) => {
    if (!colorSettings?.colorsEnabled) {
      badge.style.background = "";
      badge.style.color = "";
      return;
    }
    const bg = pickBackgroundColor(colorSettings, minPerM2);
    if (!bg) {
      badge.style.background = "";
      badge.style.color = "";
      return;
    }
    badge.style.background = bg;
    badge.style.color = contrastTextForBackground(bg);
  };

  const refreshAllBadgeColors = () => {
    document.querySelectorAll(`.${BADGE_CLASS}`).forEach((badge) => {
      const v = Number.parseFloat(badge.dataset.immoPerM2);
      if (Number.isFinite(v)) applyBadgeAppearance(badge, v);
    });
  };

  const loadColorSettings = () => {
    try {
      chrome.storage.sync.get([STORAGE_KEY], (data) => {
        colorSettings = resolveColorSettings(data[STORAGE_KEY]);
        refreshAllBadgeColors();
      });
    } catch {
      colorSettings = resolveColorSettings(null);
      refreshAllBadgeColors();
    }
  };

  if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync" || !changes[STORAGE_KEY]) return;
      colorSettings = resolveColorSettings(changes[STORAGE_KEY].newValue);
      refreshAllBadgeColors();
    });
  }

  loadColorSettings();

  const ensureBadge = (img) => {
    const card = findCardRoot(img);
    if (!card) return;

    const container = img.closest("a") || img.parentElement;
    if (!container) return;

    container.classList.add(CONTAINER_CLASS);

    const values = extractPriceAndArea(card);
    if (!values) return;

    if (values.area.min <= 0 || values.area.max <= 0) return;

    const minPerM2 = values.price.min / values.area.min;
    const maxPerM2 = values.price.max / values.area.max;
    if (!Number.isFinite(minPerM2) || !Number.isFinite(maxPerM2)) return;

    const minFormatted = numberFormatter.format(minPerM2);
    const maxFormatted = numberFormatter.format(maxPerM2);
    const badgeText =
      minFormatted === maxFormatted
        ? `€${minFormatted}/m2`
        : `€${minFormatted} - ${maxFormatted}/m2`;

    if (card.dataset.immoBadge === "1") {
      const badgeInCard = card.querySelector(`.${BADGE_CLASS}`);
      if (badgeInCard) {
        badgeInCard.textContent = badgeText;
        badgeInCard.dataset.immoPerM2 = String(minPerM2);
        applyBadgeAppearance(badgeInCard, minPerM2);
        return;
      }
      delete card.dataset.immoBadge;
    }

    const existing = container.querySelector(`.${BADGE_CLASS}`);
    if (existing) {
      existing.textContent = badgeText;
      existing.dataset.immoPerM2 = String(minPerM2);
      applyBadgeAppearance(existing, minPerM2);
      card.dataset.immoBadge = "1";
      return;
    }

    const badge = document.createElement("div");
    badge.className = BADGE_CLASS;
    badge.textContent = badgeText;
    badge.dataset.immoPerM2 = String(minPerM2);
    applyBadgeAppearance(badge, minPerM2);
    container.appendChild(badge);
    card.dataset.immoBadge = "1";
  };

  const scan = () => {
    const container = document.querySelector(RESULT_CONTAINER_SELECTOR);
    const scope = container || document;
    const images = Array.from(scope.querySelectorAll(IMAGE_SELECTOR));
    images.forEach((img) => ensureBadge(img));
  };

  let scheduled = false;
  const scheduleScan = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  };

  const observer = new MutationObserver(() => scheduleScan());
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  scan();
})();
