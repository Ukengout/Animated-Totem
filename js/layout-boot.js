(function (global) {
  var STORAGE_KEY = "totemLayout";
  var MOBILE_BP = 768;

  function detectLayoutMode() {
    if (typeof global.matchMedia === "function") {
      if (global.matchMedia("(pointer: coarse) and (hover: none)").matches) return "mobile";
      if (global.matchMedia("(max-width: " + MOBILE_BP + "px)").matches) return "mobile";
    }
    var ua = global.navigator && global.navigator.userAgent ? global.navigator.userAgent : "";
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)) {
      return "mobile";
    }
    return global.innerWidth <= MOBILE_BP ? "mobile" : "desktop";
  }

  global.__totemDetectLayout = detectLayoutMode;

  var m = global.sessionStorage.getItem(STORAGE_KEY);
  if (m !== "mobile" && m !== "desktop") {
    m = detectLayoutMode();
    global.sessionStorage.setItem(STORAGE_KEY, m);
  }

  var mob = m === "mobile";
  document.documentElement.classList.toggle("layout-mobile-active", mob);
  document.documentElement.classList.toggle("layout-desktop-active", !mob);

  document.addEventListener("click", function (e) {
    var link = e.target.closest("[data-totem-restart]");
    if (!link) return;
    global.sessionStorage.removeItem(STORAGE_KEY);
  });
})();
