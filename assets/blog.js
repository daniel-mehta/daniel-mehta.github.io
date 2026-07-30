(function () {
  "use strict";

  const posts = Array.isArray(window.BLOG_POSTS) ? window.BLOG_POSTS : [];
  const grid = document.getElementById("blog-grid");
  const empty = document.getElementById("blog-empty");
  const count = document.getElementById("blog-count");
  const sort = document.getElementById("blog-sort");
  const overlay = document.getElementById("blog-overlay");
  const closeButton = document.getElementById("blog-close");
  const reader = document.querySelector(".blog-reader");
  const readerHead = document.getElementById("blog-reader-head");
  const resizeHandle = document.getElementById("blog-resize-handle");
  const readerTitle = document.getElementById("blog-reader-title");
  const readerDate = document.getElementById("blog-reader-date");
  const readerContent = document.getElementById("blog-reader-content");
  const readerScroll = document.querySelector(".blog-reader-scroll");
  let opener = null;
  let pointerAction = null;

  function formatDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })
      .format(new Date(Date.UTC(year, month - 1, day)));
  }

  function validPost(post) {
    return post && typeof post.id === "string" && typeof post.title === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(post.date) && typeof post.preview === "string" && typeof post.html === "string";
  }

  function openPost(post, button) {
    opener = button;
    readerTitle.textContent = post.title;
    readerDate.textContent = formatDate(post.date);
    // The local generator escapes source HTML and only emits its allowed Markdown elements.
    readerContent.innerHTML = post.html;
    overlay.hidden = false;
    document.body.classList.add("blog-overlay-open");
    readerScroll.scrollTop = 0;
    closeButton.focus();
  }

  function closePost() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove("blog-overlay-open");
    readerContent.replaceChildren();
    if (opener) opener.focus();
    opener = null;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(value, maximum));
  }

  function positionWindow(rect) {
    reader.style.inset = "auto";
    reader.style.margin = "0";
    reader.style.left = `${clamp(rect.left, 7, window.innerWidth - rect.width - 7)}px`;
    reader.style.top = `${clamp(rect.top, 7, window.innerHeight - rect.height - 7)}px`;
    reader.style.width = `${rect.width}px`;
    reader.style.height = `${rect.height}px`;
  }

  function beginPointerAction(event, mode) {
    if (mode === "move" && event.target.closest("button")) return;
    event.preventDefault();
    const rect = reader.getBoundingClientRect();
    positionWindow(rect);
    pointerAction = { mode, startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }

  function moveWindow(event) {
    if (!pointerAction) return;
    const dx = event.clientX - pointerAction.startX;
    const dy = event.clientY - pointerAction.startY;
    if (pointerAction.mode === "move") {
      const width = reader.getBoundingClientRect().width;
      const height = reader.getBoundingClientRect().height;
      reader.style.left = `${clamp(pointerAction.left + dx, 7, window.innerWidth - width - 7)}px`;
      reader.style.top = `${clamp(pointerAction.top + dy, 7, window.innerHeight - height - 7)}px`;
      return;
    }
    const minWidth = Math.min(300, window.innerWidth - pointerAction.left - 14);
    const minHeight = Math.min(240, window.innerHeight - pointerAction.top - 14);
    reader.style.width = `${clamp(pointerAction.width + dx, minWidth, window.innerWidth - pointerAction.left - 7)}px`;
    reader.style.height = `${clamp(pointerAction.height + dy, minHeight, window.innerHeight - pointerAction.top - 7)}px`;
  }

  function cardFor(post, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "blog-card";
    button.setAttribute("aria-label", `Open entry: ${post.title}`);

    const top = document.createElement("span");
    top.className = "blog-card-top";
    const date = document.createElement("span");
    date.textContent = formatDate(post.date);
    const number = document.createElement("span");
    number.className = "blog-card-index";
    number.textContent = String(index + 1).padStart(2, "0");
    top.append(date, number);

    const body = document.createElement("span");
    body.className = "blog-card-body";
    const title = document.createElement("h2");
    title.textContent = post.title;
    const preview = document.createElement("span");
    preview.textContent = post.preview;
    const open = document.createElement("span");
    open.className = "blog-card-open";
    open.innerHTML = "Open entry <span aria-hidden=\"true\">→</span>";
    body.append(title, preview, open);
    button.append(top, body);
    button.addEventListener("click", () => openPost(post, button));
    return button;
  }

  function render() {
    const direction = sort.value === "oldest" ? 1 : -1;
    const entries = posts.filter(validPost).sort((a, b) => direction * a.date.localeCompare(b.date));
    grid.replaceChildren(...entries.map(cardFor));
    grid.hidden = entries.length === 0;
    empty.hidden = entries.length > 0;
    count.textContent = `${entries.length} ENTR${entries.length === 1 ? "Y" : "IES"}`;
  }

  closeButton.addEventListener("click", closePost);
  readerHead.addEventListener("pointerdown", (event) => beginPointerAction(event, "move"));
  resizeHandle.addEventListener("pointerdown", (event) => beginPointerAction(event, "resize"));
  window.addEventListener("pointermove", moveWindow);
  window.addEventListener("pointerup", () => { pointerAction = null; });
  window.addEventListener("resize", () => {
    if (reader.style.left) positionWindow(reader.getBoundingClientRect());
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closePost();
  });
  document.addEventListener("keydown", (event) => {
    if (overlay.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closePost();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = overlay.querySelectorAll("button:not([disabled]), [href], [tabindex]:not([tabindex=\"-1\"])");
    const items = Array.from(focusable);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  sort.addEventListener("change", render);
  render();
})();
