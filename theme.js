"use strict";

(() => {
  const storageKey = "budget-notifications-theme";
  let saved = "";
  try { saved = localStorage.getItem(storageKey) || ""; } catch { /* Private browsing may block storage. */ }
  const root = document.documentElement;
  root.dataset.theme = saved === "light" ? "light" : "dark";

  const updateControls = () => {
    const dark = root.dataset.theme === "dark";
    const button = document.querySelector("#themeToggleBtn");
    if (button) {
      button.textContent = dark ? "Light mode" : "Dark mode";
      button.setAttribute("aria-label", dark ? "Turn off dark mode" : "Turn on dark mode");
      button.setAttribute("aria-pressed", String(dark));
      button.title = dark ? "Switch to the light color scheme" : "Switch to the dark color scheme";
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0b1422" : "#123b5d");
  };

  document.addEventListener("DOMContentLoaded", () => {
    updateControls();
    document.querySelector("#themeToggleBtn")?.addEventListener("click", () => {
      root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
      try { localStorage.setItem(storageKey, root.dataset.theme); } catch { /* Keep the choice for this page. */ }
      updateControls();
    });
  });
})();
