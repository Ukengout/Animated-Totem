(function (global) {
  var STORAGE_KEY = "totemLayout";
  var MOBILE_BP = 768;
  var PHONE_SHELL_ID = "phoneSim";

  function getStored() {
    var v = localStorage.getItem(STORAGE_KEY);
    return v === "mobile" || v === "desktop" ? v : null;
  }

  function setMode(mode) {
    if (mode !== "mobile" && mode !== "desktop") return;
    localStorage.setItem(STORAGE_KEY, mode);
    apply();
  }

  function isMobile() {
    var stored = getStored();
    if (stored === "mobile") return true;
    if (stored === "desktop") return false;
    return window.innerWidth <= MOBILE_BP;
  }

  function shouldPhoneSim() {
    return isMobile() && window.innerWidth > MOBILE_BP;
  }

  function isOutsidePhoneShell(node) {
    if (!node || node.nodeType !== 1) return false;
    return (
      node.classList.contains("layout-switcher") || node.classList.contains("lang-switcher")
    );
  }

  function unwrapPhoneShell(shell) {
    var parent = shell.parentNode;
    if (!parent) return;
    while (shell.firstChild) {
      parent.insertBefore(shell.firstChild, shell);
    }
    shell.remove();
  }

  function updatePhoneShell() {
    var shell = document.getElementById(PHONE_SHELL_ID);
    var need = shouldPhoneSim();

    document.documentElement.classList.toggle("phone-sim-active", need);

    if (!need) {
      if (shell) unwrapPhoneShell(shell);
      return;
    }

    if (shell) return;

    shell = document.createElement("div");
    shell.id = PHONE_SHELL_ID;
    shell.className = "phone-sim";

    var kids = [];
    for (var i = 0; i < document.body.childNodes.length; i++) {
      kids.push(document.body.childNodes[i]);
    }
    for (var k = 0; k < kids.length; k++) {
      var node = kids[k];
      if (node.nodeType === 1 && isOutsidePhoneShell(node)) continue;
      shell.appendChild(node);
    }
    document.body.appendChild(shell);
  }

  function apply() {
    var mobile = isMobile();
    document.documentElement.classList.toggle("layout-mobile-active", mobile);
    document.documentElement.classList.toggle("layout-desktop-active", !mobile);
    updatePhoneShell();
    global.dispatchEvent(new CustomEvent("totem-layout-changed", { detail: { mobile: mobile } }));
    if (typeof global.__totemMarqueeRebuild === "function") {
      global.__totemMarqueeRebuild();
    }
  }

  function updateSwitcher() {
    var box = document.querySelector(".layout-switcher");
    if (!box) return;
    var active = isMobile() ? "mobile" : "desktop";
    box.querySelectorAll("[data-layout]").forEach(function (btn) {
      var on = btn.dataset.layout === active;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  var switcherReady = false;

  function initSwitcher() {
    var box = document.querySelector(".layout-switcher");
    if (!box) return;
    if (global.TotemI18n) {
      box.setAttribute("aria-label", global.TotemI18n.t("layout.switcher"));
    }
    if (!switcherReady) {
      switcherReady = true;
      box.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-layout]");
        if (!btn) return;
        setMode(btn.dataset.layout);
        updateSwitcher();
      });
    }
    updateSwitcher();
  }

  function boot() {
    apply();
    initSwitcher();
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (!getStored()) apply();
        else {
          updatePhoneShell();
          if (typeof global.__totemMarqueeRebuild === "function") global.__totemMarqueeRebuild();
        }
      }, 120);
    });
    global.addEventListener("totem-i18n-applied", function () {
      if (document.querySelector(".layout-switcher") && global.TotemI18n) {
        document.querySelector(".layout-switcher").setAttribute("aria-label", global.TotemI18n.t("layout.switcher"));
      }
    });
  }

  global.TotemLayout = {
    getMode: function () {
      return getStored() || (isMobile() ? "mobile" : "desktop");
    },
    setMode: setMode,
    isMobile: isMobile,
    shouldPhoneSim: shouldPhoneSim,
    getMarqueeRoot: function () {
      return document.getElementById(PHONE_SHELL_ID) || document.body;
    },
    apply: apply,
    boot: boot,
    initSwitcher: initSwitcher,
  };

  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})(window);
