(function (global) {
  var STORAGE_KEY = "totemLang";
  var dict = { ru: global.TOTEM_LANG_RU, en: global.TOTEM_LANG_EN };

  function getLang() {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "ru";
  }

  function setLang(lang) {
    localStorage.setItem(STORAGE_KEY, lang === "en" ? "en" : "ru");
  }

  function t(key, params) {
    var parts = key.split(".");
    var node = dict[getLang()];
    for (var i = 0; i < parts.length; i++) {
      if (node == null) return key;
      node = node[parts[i]];
    }
    if (Array.isArray(node)) return node;
    if (typeof node !== "string") return key;
    if (!params) return node;
    return node.replace(/\{(\w+)\}/g, function (_, name) {
      return params[name] != null ? String(params[name]) : "";
    });
  }

  function apply(root) {
    if (!root) root = document;
    var lang = getLang();
    document.documentElement.lang = lang;

    var pageTitleKey = document.body.dataset.i18nPage;
    if (pageTitleKey) document.title = t("page." + pageTitleKey);

    root.querySelectorAll("[data-i18n]").forEach(function (el) {
      if (el.dataset.i18nVertical) return;
      el.textContent = t(el.dataset.i18n);
    });

    root.querySelectorAll("[data-i18n-vertical]").forEach(function (el) {
      var text = t(el.dataset.i18nVertical);
      var label = el.getAttribute("aria-label") || t("support.btn");
      el.setAttribute("aria-label", label);
      el.textContent = "";
      for (var i = 0; i < text.length; i++) {
        if (text.charAt(i) === " ") continue;
        var line = document.createElement("span");
        line.className = "btn-support-vertical__char";
        line.textContent = text.charAt(i);
        el.appendChild(line);
      }
    });
    root.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    root.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      el.title = t(el.dataset.i18nTitle);
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    root.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.dataset.i18nAria));
    });
    root.querySelectorAll("meta[data-i18n-meta]").forEach(function (el) {
      el.setAttribute("content", t(el.dataset.i18nMeta));
    });

    global.dispatchEvent(new CustomEvent("totem-i18n-applied", { detail: { lang: lang } }));
  }

  function updateLangSwitcher() {
    var box = document.querySelector(".lang-switcher");
    if (!box) return;
    box.querySelectorAll("[data-lang]").forEach(function (btn) {
      var active = btn.dataset.lang === getLang();
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function initLangSwitcher() {
    var box = document.querySelector(".lang-switcher");
    if (box) {
      box.setAttribute("aria-label", t("lang.switcher"));
      box.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-lang]");
        if (!btn) return;
        setLang(btn.dataset.lang);
        apply();
        updateLangSwitcher();
      });
    }
    apply();
    updateLangSwitcher();
  }

  function boot() {
    if (document.querySelector(".lang-switcher")) initLangSwitcher();
    else apply();
  }

  global.TotemI18n = { getLang: getLang, setLang: setLang, t: t, apply: apply, boot: boot, initLangSwitcher: initLangSwitcher };
})(window);
