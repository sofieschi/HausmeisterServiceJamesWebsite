"use strict";

(() => {
  const root = document.documentElement;
  const storageKey = "james-color-theme";
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  let preference = null;
  let toggle = null;

  const validTheme = (value) => value === "light" || value === "dark";
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (validTheme(stored)) preference = stored;
  } catch {
    // Storage may be unavailable in private or restricted browsing contexts.
  }

  const applyTheme = () => {
    const theme = preference || (systemTheme.matches ? "dark" : "light");
    root.dataset.theme = theme;
    if (toggle) {
      toggle.setAttribute("aria-checked", String(theme === "dark"));
      toggle.querySelector(".theme-toggle-value").textContent = theme === "dark" ? "Dunkel" : "Hell";
    }
  };

  // Run in the head, before styles and content, to avoid a light-theme flash.
  applyTheme();

  const mountToggle = () => {
    const footer = document.querySelector(".desktop-menu-panel .offcanvas-footer");
    if (!footer) return;
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "theme-toggle";
    toggle.setAttribute("role", "switch");
    toggle.setAttribute("aria-label", "Dunkler Modus");
    toggle.innerHTML = `
      <svg class="theme-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.5 13.1A8.5 8.5 0 0 1 10.9 3.5a8.5 8.5 0 1 0 9.6 9.6Z" />
      </svg>
      <span class="theme-toggle-label">Darstellung<span class="theme-toggle-value"></span></span>
      <span class="theme-toggle-track" aria-hidden="true"><span></span></span>
    `;
    toggle.addEventListener("click", () => {
      preference = root.dataset.theme === "dark" ? "light" : "dark";
      try { window.localStorage.setItem(storageKey, preference); } catch { /* The toggle still works without storage. */ }
      applyTheme();
    });
    footer.prepend(toggle);
    applyTheme();
  };

  const onSystemChange = () => { if (!preference) applyTheme(); };
  if (systemTheme.addEventListener) systemTheme.addEventListener("change", onSystemChange);
  else systemTheme.addListener(onSystemChange);
  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey && event.key !== null) return;
    preference = validTheme(event.newValue) ? event.newValue : null;
    applyTheme();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountToggle, { once: true });
  } else {
    mountToggle();
  }
})();
