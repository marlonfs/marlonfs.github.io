(function () {
  "use strict";

  var STORAGE_LANG = "site-lang";
  var STORAGE_TAB = "site-tab";
  var VALID_TABS = ["about", "research", "publications", "extension", "teaching"];

  function applyLanguage(lang) {
    var dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    document.documentElement.setAttribute("lang", lang);

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] !== undefined) {
        el.innerHTML = dict[key];
      }
    });

    document.querySelectorAll(".lang-opt").forEach(function (el) {
      el.classList.toggle("is-active", el.getAttribute("data-lang") === lang);
    });

    document.title = dict.brand_name + (lang === "pt" ? " — Página pessoal" : " — Personal site");

    try { localStorage.setItem(STORAGE_LANG, lang); } catch (e) {}
  }

  function currentLanguage() {
    try {
      var saved = localStorage.getItem(STORAGE_LANG);
      if (saved === "en" || saved === "pt") return saved;
    } catch (e) {}
    return "en";
  }

  function showTab(tab) {
    if (VALID_TABS.indexOf(tab) === -1) tab = "about";

    document.querySelectorAll(".tab-panel").forEach(function (el) {
      el.classList.toggle("is-active", el.id === tab);
    });
    document.querySelectorAll(".tab-btn").forEach(function (el) {
      el.classList.toggle("is-active", el.getAttribute("data-tab") === tab);
    });

    try { localStorage.setItem(STORAGE_TAB, tab); } catch (e) {}

    var tabs = document.querySelector(".tabs");
    if (tabs) tabs.classList.remove("is-open");
    var navToggle = document.getElementById("nav-toggle");
    if (navToggle) navToggle.setAttribute("aria-expanded", "false");
  }

  function initialTab() {
    var hash = window.location.hash.replace("#", "");
    if (VALID_TABS.indexOf(hash) !== -1) return hash;
    try {
      var saved = localStorage.getItem(STORAGE_TAB);
      if (VALID_TABS.indexOf(saved) !== -1) return saved;
    } catch (e) {}
    return "about";
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyLanguage(currentLanguage());
    showTab(initialTab());

    document.querySelectorAll(".tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tab = btn.getAttribute("data-tab");
        history.replaceState(null, "", "#" + tab);
        showTab(tab);
      });
    });

    var langToggle = document.getElementById("lang-toggle");
    if (langToggle) {
      langToggle.addEventListener("click", function () {
        applyLanguage(currentLanguage() === "en" ? "pt" : "en");
      });
    }

    var navToggle = document.getElementById("nav-toggle");
    var tabs = document.querySelector(".tabs");
    if (navToggle && tabs) {
      navToggle.addEventListener("click", function () {
        var open = tabs.classList.toggle("is-open");
        navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    window.addEventListener("hashchange", function () {
      var hash = window.location.hash.replace("#", "");
      if (VALID_TABS.indexOf(hash) !== -1) showTab(hash);
    });
  });
})();
