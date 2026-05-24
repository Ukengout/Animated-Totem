(function (global) {
  var MOBILE_BP = 768;

  function isMobile() {
    return window.innerWidth <= MOBILE_BP;
  }

  function apply() {
    var mobile = isMobile();
    document.documentElement.classList.toggle("layout-mobile-active", mobile);
    document.documentElement.classList.toggle("layout-desktop-active", !mobile);
    global.dispatchEvent(new CustomEvent("totem-layout-changed", { detail: { mobile: mobile } }));
    if (typeof global.__totemMarqueeRebuild === "function") {
      global.__totemMarqueeRebuild();
    }
  }

  function boot() {
    apply();
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(apply, 120);
    });
  }

  global.TotemLayout = {
    isMobile: isMobile,
    getMarqueeRoot: function () {
      return document.body;
    },
    apply: apply,
    boot: boot,
  };

  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})(window);
