(function () {
  "use strict";

  const VISITED = [
    { code: "PT", name: "Portugal" },
    { code: "FR", name: "France" },
    { code: "DE", name: "Germany" },
    { code: "IS", name: "Iceland" },
    { code: "IT", name: "Italy" },
    { code: "MT", name: "Malta" },
    { code: "ES", name: "Spain" },
    { code: "VA", name: "Vatican City" },
    { code: "CA", name: "Canada" },
    { code: "US", name: "United States" },
    { code: "MX", name: "Mexico" },
    { code: "AW", name: "Aruba" },
    { code: "BS", name: "Bahamas" },
    { code: "BB", name: "Barbados" },
    { code: "BZ", name: "Belize" },
    { code: "DO", name: "Dominican Republic" }
  ];

  const visitedCodes = VISITED.map((country) => country.code);
  const countryByCode = Object.fromEntries(VISITED.map((country) => [country.code, country]));
  const manifest = Array.isArray(window.PHOTO_MANIFEST) ? window.PHOTO_MANIFEST : [];

  function photoIsValid(photo) {
    return photo &&
      typeof photo.src === "string" &&
      typeof photo.alt === "string" &&
      photo.alt.trim().length > 0 &&
      typeof photo.countryCode === "string" &&
      countryByCode[photo.countryCode.toUpperCase()];
  }

  const photos = manifest
    .filter(photoIsValid)
    .map((photo) => ({ ...photo, countryCode: photo.countryCode.toUpperCase() }));

  function countFor(code) {
    return photos.filter((photo) => photo.countryCode === code).length;
  }

  function setupMenu() {
    const button = document.querySelector(".menu-toggle");
    const menu = document.getElementById("primary-nav");
    if (!button || !menu) return;

    button.addEventListener("click", () => {
      const isOpen = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!isOpen));
      button.lastElementChild.textContent = isOpen ? "+" : "−";
      menu.classList.toggle("open", !isOpen);
    });

    menu.addEventListener("click", (event) => {
      if (!event.target.closest("a") || window.innerWidth > 620) return;
      button.setAttribute("aria-expanded", "false");
      button.lastElementChild.textContent = "+";
      menu.classList.remove("open");
    });
  }

  function setupYear() {
    document.querySelectorAll("[data-current-year]").forEach((element) => {
      element.textContent = String(new Date().getFullYear());
    });
  }

  function createMap(selector, onSelect) {
    const element = document.querySelector(selector);
    if (!element || typeof window.jsVectorMap !== "function") return null;

    return new window.jsVectorMap({
      selector,
      map: "world_merc",
      backgroundColor: "transparent",
      zoomButtons: true,
      zoomOnScroll: false,
      draggable: true,
      selectedRegions: visitedCodes,
      regionsSelectable: false,
      regionStyle: {
        initial: { fill: "#8f9bb7", stroke: "#c9d5eb", strokeWidth: 0.35 },
        hover: { fill: "#60619c", cursor: "default" },
        selected: { fill: "#3d4f97" },
        selectedHover: { fill: "#f68d1f", cursor: "pointer" }
      },
      markers: [
        { name: "Malta", coords: [35.9375, 14.3754] },
        { name: "Vatican City", coords: [41.9029, 12.4534] }
      ],
      markerStyle: {
        initial: { fill: "#f68d1f", stroke: "#ffffff", strokeWidth: 1, r: 5 },
        hover: { fill: "#ecab37", stroke: "#21242e", r: 6 }
      },
      onRegionTooltipShow(event, tooltip, code) {
        if (!countryByCode[code]) return;
        const count = countFor(code);
        tooltip.text(`${countryByCode[code].name} · ${count} photo${count === 1 ? "" : "s"}`);
      },
      onRegionClick(event, code) {
        if (!countryByCode[code]) return;
        event.preventDefault();
        onSelect(code);
      },
      onMarkerClick(event, index) {
        const code = index === 0 ? "MT" : "VA";
        onSelect(code);
      }
    });
  }

  function setupHomeMap() {
    const status = document.getElementById("home-map-status");
    const link = document.querySelector(".world-layout .button");
    if (!status || !link) return;

    createMap("#home-map", (code) => {
      const country = countryByCode[code];
      const count = countFor(code);
      status.textContent = `${country.name} selected · ${count || "No"} photo${count === 1 ? "" : "s"} indexed`;
      link.href = `photos.html?country=${encodeURIComponent(code)}`;
      link.textContent = `Open ${country.name} archive →`;
    });
  }

  function setupPhotoArchive() {
    const gallery = document.getElementById("gallery");
    if (!gallery) return;

    const empty = document.getElementById("empty-gallery");
    const filters = document.getElementById("photo-filters");
    const countryButtons = document.getElementById("country-buttons");
    const selectedCountry = document.getElementById("selected-country");
    const selectedCount = document.getElementById("selected-count");
    const selectionLabel = document.getElementById("map-selection-label");
    const archiveCount = document.getElementById("archive-count");
    const clearButton = document.getElementById("clear-country");
    const total = document.getElementById("photo-total");
    const placeTotal = document.getElementById("place-total");
    let activeCode = "ALL";

    total.textContent = String(photos.length);
    placeTotal.textContent = String(new Set(photos.map((photo) => photo.location).filter(Boolean)).size);
    const allFilterCount = filters.querySelector('[data-country="ALL"] span');
    if (allFilterCount) allFilterCount.textContent = String(photos.length);

    function createFilter(country) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "filter-chip";
      button.dataset.country = country.code;
      button.setAttribute("aria-pressed", "false");
      button.innerHTML = `${country.name} <span>${countFor(country.code)}</span>`;
      button.addEventListener("click", () => selectCountry(country.code));
      return button;
    }

    VISITED.forEach((country) => {
      if (countFor(country.code) > 0) filters.appendChild(createFilter(country));

      const button = document.createElement("button");
      button.type = "button";
      button.className = "country-button";
      button.dataset.country = country.code;
      button.innerHTML = `${country.name} <span>${countFor(country.code)}</span>`;
      button.setAttribute("aria-label", `${country.name}: ${countFor(country.code)} photographs`);
      button.addEventListener("click", () => selectCountry(country.code));
      countryButtons.appendChild(button);
    });

    function makePhotoCard(photo) {
      const figure = document.createElement("figure");
      figure.className = "photo-card";

      const image = document.createElement("img");
      image.src = photo.src;
      image.alt = photo.alt;
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener("error", () => {
        const error = document.createElement("div");
        error.className = "photo-error";
        error.textContent = "Image unavailable";
        image.replaceWith(error);
      }, { once: true });

      const caption = document.createElement("figcaption");
      const heading = document.createElement("h2");
      heading.textContent = photo.location || countryByCode[photo.countryCode].name;
      caption.appendChild(heading);

      if (photo.caption) {
        const copy = document.createElement("p");
        copy.textContent = photo.caption;
        caption.appendChild(copy);
      }
      if (photo.date) {
        const date = document.createElement("p");
        date.className = "micro-label";
        date.textContent = photo.date;
        caption.appendChild(date);
      }

      figure.append(image, caption);
      return figure;
    }

    function render() {
      const visible = activeCode === "ALL"
        ? photos
        : photos.filter((photo) => photo.countryCode === activeCode);

      gallery.replaceChildren(...visible.map(makePhotoCard));
      gallery.hidden = visible.length === 0;
      empty.hidden = visible.length > 0;
      archiveCount.textContent = `${visible.length} RESULT${visible.length === 1 ? "" : "S"}`;

      const country = countryByCode[activeCode];
      selectedCountry.textContent = country ? country.name : "All places";
      selectedCount.textContent = `${visible.length} photograph${visible.length === 1 ? "" : "s"} indexed`;
      selectionLabel.textContent = country ? country.name.toUpperCase() : "ALL VISITED COUNTRIES";

      document.querySelectorAll("[data-country]").forEach((button) => {
        const active = button.dataset.country === activeCode;
        button.classList.toggle("active", active);
        if (button.classList.contains("filter-chip")) {
          button.setAttribute("aria-pressed", String(active));
        }
      });
    }

    function selectCountry(code) {
      activeCode = countryByCode[code] ? code : "ALL";
      render();
      const url = new URL(window.location.href);
      if (activeCode === "ALL") url.searchParams.delete("country");
      else url.searchParams.set("country", activeCode);
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }

    clearButton.addEventListener("click", () => selectCountry("ALL"));
    createMap("#photo-map", selectCountry);

    const requested = new URLSearchParams(window.location.search).get("country");
    selectCountry(requested ? requested.toUpperCase() : "ALL");
  }

  setupMenu();
  setupYear();
  setupHomeMap();
  setupPhotoArchive();
})();
