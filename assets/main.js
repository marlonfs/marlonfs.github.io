(function () {
  "use strict";

  var STORAGE_LANG = "site-lang";
  var STORAGE_TAB = "site-tab";
  var VALID_TABS = ["about", "research", "publications", "extension", "teaching"];
  var publicationsData = null;
  var publicationsFailed = false;
  var researchData = null;
  var researchFailed = false;

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

    renderPublications();
    renderResearch();
  }

  function formatTemplate(str, vars) {
    return str.replace(/\{(\w+)\}/g, function (_, key) {
      return vars[key] !== undefined ? vars[key] : "";
    });
  }

  function formatDate(iso, lang) {
    try {
      return new Date(iso).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", {
        year: "numeric", month: "long", day: "numeric"
      });
    } catch (e) {
      return iso;
    }
  }

  function renderPublications() {
    var status = document.getElementById("pub-status");
    var list = document.getElementById("pub-list");
    if (!status || !list) return;

    var dict = TRANSLATIONS[currentLanguage()] || TRANSLATIONS.en;

    if (publicationsFailed) {
      status.textContent = dict.publications_error;
      status.hidden = false;
      list.hidden = true;
      return;
    }

    if (!publicationsData) {
      status.textContent = dict.publications_loading;
      status.hidden = false;
      list.hidden = true;
      return;
    }

    status.textContent = formatTemplate(dict.publications_updated, {
      date: formatDate(publicationsData.generatedAt, currentLanguage()),
      count: publicationsData.items.length
    });
    status.hidden = false;
    list.hidden = false;
    list.innerHTML = "";

    publicationsData.items.forEach(function (pub) {
      var li = document.createElement("li");

      var span = document.createElement("span");
      var strong = document.createElement("strong");
      strong.textContent = pub.title;
      span.appendChild(strong);

      var detailsParts = [];
      if (pub.authors) detailsParts.push(pub.authors);
      if (pub.venue) detailsParts.push(pub.venue);
      if (pub.year) detailsParts.push(pub.year);
      if (detailsParts.length) {
        span.appendChild(document.createTextNode(" — " + detailsParts.join(" · ")));
      }
      if (pub.citedBy > 0) {
        var cited = document.createElement("span");
        cited.className = "pub-cited";
        cited.textContent = " · " + formatTemplate(dict.publications_cited_by, { count: pub.citedBy });
        span.appendChild(cited);
      }

      li.appendChild(span);

      var link = document.createElement("a");
      link.className = "pub-link";
      link.href = pub.link;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = dict.pub_link;
      li.appendChild(link);

      list.appendChild(li);
    });
  }

  function loadPublications() {
    fetch("assets/publications.json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        publicationsData = data;
        renderPublications();
      })
      .catch(function () {
        publicationsFailed = true;
        renderPublications();
      });
  }

  function renderResearch() {
    var status = document.getElementById("research-status");
    var list = document.getElementById("research-list");
    if (!status || !list) return;

    var dict = TRANSLATIONS[currentLanguage()] || TRANSLATIONS.en;

    if (researchFailed) {
      status.textContent = dict.research_error;
      status.hidden = false;
      list.hidden = true;
      return;
    }

    if (!researchData) {
      status.textContent = dict.research_loading;
      status.hidden = false;
      list.hidden = true;
      return;
    }

    status.textContent = formatTemplate(dict.research_updated, {
      date: formatDate(researchData.generatedAt, currentLanguage())
    });
    status.hidden = false;
    list.hidden = false;
    list.innerHTML = "";

    var lang = currentLanguage();

    researchData.items.forEach(function (item) {
      var localized = item[lang] || item.en || item.pt;

      var card = document.createElement("article");
      card.className = "card";

      var badge = document.createElement("span");
      badge.className = "badge " + (item.status === "ongoing" ? "badge-ongoing" : "badge-done");
      badge.textContent = item.status === "ongoing" ? dict.status_ongoing : dict.status_completed;
      card.appendChild(badge);

      var h3 = document.createElement("h3");
      h3.textContent = localized.title;
      card.appendChild(h3);

      if (localized.summary) {
        var p = document.createElement("p");
        p.textContent = localized.summary;
        card.appendChild(p);
      }

      var link = document.createElement("a");
      link.className = "card-link";
      link.href = localized.link;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = dict.research_link;
      card.appendChild(link);

      list.appendChild(card);
    });
  }

  function loadResearch() {
    fetch("assets/research.json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        researchData = data;
        renderResearch();
      })
      .catch(function () {
        researchFailed = true;
        renderResearch();
      });
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
    loadPublications();
    loadResearch();

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
