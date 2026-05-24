(function () {
  var m = sessionStorage.getItem("totemLayout");
  var mob = m === "mobile" || (m !== "desktop" && window.innerWidth <= 768);
  document.documentElement.classList.toggle("layout-mobile-active", mob);
  document.documentElement.classList.toggle("layout-desktop-active", !mob);
})();
