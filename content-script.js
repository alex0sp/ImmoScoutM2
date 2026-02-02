(() => {
  const RESULT_CONTAINER_SELECTOR = "#result-list-content";
  const IMAGE_SELECTOR = "img.gallery__image";
  const BADGE_CLASS = "immo-price-badge";
  const CONTAINER_CLASS = "immo-badge-container";

  const numberFormatter = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 0
  });

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

  const ensureBadge = (img) => {
    const card = findCardRoot(img);
    if (!card) return;
    if (card.dataset.immoBadge === "1") return;

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
    const container = img.closest("a") || img.parentElement;
    if (!container) return;

    container.classList.add(CONTAINER_CLASS);
    if (container.querySelector(`.${BADGE_CLASS}`)) {
      card.dataset.immoBadge = "1";
      return;
    }

    const badge = document.createElement("div");
    badge.className = BADGE_CLASS;
    badge.textContent = badgeText;
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
