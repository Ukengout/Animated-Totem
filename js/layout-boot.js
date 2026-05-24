(function () {
  var mobile = window.innerWidth <= 768;
  document.documentElement.classList.toggle("layout-mobile-active", mobile);
  document.documentElement.classList.toggle("layout-desktop-active", !mobile);
})();
