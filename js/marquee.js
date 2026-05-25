(function () {
  var MOBILE_BP = 768;
  var TOTEM_COUNT = 41;
  var SKIP = { 31: true };
  var DESKTOP_COLUMNS = 6;

  var TOTEM_PATHS = [];
  for (var i = 0; i < TOTEM_COUNT; i++) {
    if (!SKIP[i]) TOTEM_PATHS.push("assets/totem" + i + ".png");
  }

  function isMobile() {
    if (window.TotemLayout) return window.TotemLayout.isMobile();
    return window.innerWidth <= MOBILE_BP;
  }

  function getRoot() {
    if (window.TotemLayout && window.TotemLayout.getMarqueeRoot) {
      return window.TotemLayout.getMarqueeRoot();
    }
    return document.body;
  }

  function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function partitionForColumns(columns) {
    var shuffled = shuffleArray(TOTEM_PATHS);
    var buckets = [];
    for (var c = 0; c < columns; c++) buckets[c] = [];
    for (var n = 0; n < shuffled.length; n++) {
      buckets[n % columns].push(shuffled[n]);
    }
    for (var b = 0; b < buckets.length; b++) {
      buckets[b] = shuffleArray(buckets[b]);
    }
    return buckets;
  }

  function createTotemItem(src) {
    var item = document.createElement("div");
    item.className = "totem-marquee-item";
    var img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.width = 16;
    img.height = 16;
    img.loading = "eager";
    img.decoding = "async";
    img.draggable = false;
    item.appendChild(img);
    return item;
  }

  function fillTrack(track, paths) {
    var stripPaths = paths.length > 0 ? paths : shuffleArray(TOTEM_PATHS);
    var loopPaths = stripPaths.concat(stripPaths);
    for (var p = 0; p < loopPaths.length; p++) {
      track.appendChild(createTotemItem(loopPaths[p]));
    }
  }

  function buildColumn(direction, paths) {
    var col = document.createElement("div");
    col.className = "totem-marquee-col totem-marquee-col--" + direction;

    var track = document.createElement("div");
    track.className = "totem-marquee-track totem-marquee-track--loading";
    fillTrack(track, paths);

    col.appendChild(track);
    return col;
  }

  function buildHorizontalTrack(direction, paths) {
    var track = document.createElement("div");
    track.className =
      "totem-marquee-track totem-marquee-track--horizontal totem-marquee-track--loading totem-marquee-track--" +
      direction;
    fillTrack(track, paths);
    return track;
  }

  function buildPanel(side, columnDefs) {
    var panel = document.createElement("aside");
    panel.className = "totem-marquee-panel totem-marquee-panel--" + side;
    panel.setAttribute("aria-hidden", "true");

    var inner = document.createElement("div");
    inner.className = "totem-marquee-panel__inner";

    var cols = document.createElement("div");
    cols.className = "totem-marquee-panel__cols";

    for (var d = 0; d < columnDefs.length; d++) {
      cols.appendChild(buildColumn(columnDefs[d].direction, columnDefs[d].paths));
    }

    inner.appendChild(cols);
    panel.appendChild(inner);
    return panel;
  }

  function buildBand(position, direction, paths) {
    var band = document.createElement("div");
    band.className = "totem-marquee-band totem-marquee-band--" + position;
    band.setAttribute("aria-hidden", "true");
    band.appendChild(buildHorizontalTrack(direction, paths));
    return band;
  }

  function destroyMarquees() {
    var root = getRoot();
    var nodes = root.querySelectorAll(".totem-marquee-panel, .totem-marquee-band");
    for (var i = 0; i < nodes.length; i++) nodes[i].remove();
    var bodyNodes = document.body.querySelectorAll(":scope > .totem-marquee-panel, :scope > .totem-marquee-band");
    for (var j = 0; j < bodyNodes.length; j++) bodyNodes[j].remove();
  }

  function whenTrackImagesReady(track) {
    var imgs = track.querySelectorAll("img");
    var waits = [];
    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        if (img.complete) {
          waits.push(Promise.resolve());
        } else {
          waits.push(
            new Promise(function (resolve) {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
            })
          );
        }
      })(imgs[i]);
    }
    return Promise.all(waits);
  }

  function syncMarqueeLoop(track, soft) {
    var items = track.querySelectorAll(".totem-marquee-item");
    var half = items.length / 2;
    if (!half || !items[half]) return;

    var horizontal = track.classList.contains("totem-marquee-track--horizontal");
    var shift = horizontal
      ? Math.round(items[half].offsetLeft - items[0].offsetLeft)
      : Math.round(items[half].offsetTop - items[0].offsetTop);
    if (shift <= 0) return;

    var shiftPx = shift + "px";
    var prev = track.style.getPropertyValue("--marquee-shift");
    if (prev === shiftPx) return;

    track.style.setProperty("--marquee-shift", shiftPx);
    if (soft || prev) return;

    var anim = getComputedStyle(track).animationName;
    if (anim && anim !== "none") {
      track.style.animation = "none";
      void track.offsetHeight;
      track.style.animation = "";
    }
  }

  function resyncMarqueeLoopsOnly() {
    var root = getRoot();
    var tracks = root.querySelectorAll(".totem-marquee-track");
    for (var i = 0; i < tracks.length; i++) {
      syncMarqueeLoop(tracks[i], true);
    }
  }

  function initMarqueeLoops() {
    var root = getRoot();
    var tracks = root.querySelectorAll(".totem-marquee-track");
    var trackList = [];
    for (var i = 0; i < tracks.length; i++) trackList.push(tracks[i]);

    Promise.all(trackList.map(whenTrackImagesReady)).then(function () {
      for (var t = 0; t < trackList.length; t++) {
        syncMarqueeLoop(trackList[t]);
        trackList[t].classList.remove("totem-marquee-track--loading");
      }
    });
  }

  var loopResizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(loopResizeTimer);
    loopResizeTimer = setTimeout(resyncMarqueeLoopsOnly, 200);
  });

  function buildDesktop(root) {
    var buckets = partitionForColumns(DESKTOP_COLUMNS);
    var bucketIndex = 0;

    var left = buildPanel("left", [
      { direction: "up", paths: buckets[bucketIndex++] },
      { direction: "down", paths: buckets[bucketIndex++] },
      { direction: "up", paths: buckets[bucketIndex++] },
    ]);

    var right = buildPanel("right", [
      { direction: "up", paths: buckets[bucketIndex++] },
      { direction: "down", paths: buckets[bucketIndex++] },
      { direction: "up", paths: buckets[bucketIndex++] },
    ]);

    root.insertBefore(left, root.firstChild);
    root.appendChild(right);
  }

  function buildMobile(root) {
    var pool = shuffleArray(TOTEM_PATHS);
    var topPaths = pool.slice(0, 10);
    var bottomPaths = shuffleArray(TOTEM_PATHS).slice(0, 10);

    root.insertBefore(buildBand("top", "left", topPaths), root.firstChild);
    root.appendChild(buildBand("bottom", "right", bottomPaths));
  }

  function shouldShowMarquee() {
    if (document.body.classList.contains("editor-page")) return false;
    return document.body.classList.contains("landing-with-marquee");
  }

  var lastBuiltMode = null;
  var lastBuiltWidth = 0;
  var WIDTH_REBUILD_DELTA = 48;

  function layoutWidth() {
    return Math.round((window.visualViewport && window.visualViewport.width) || window.innerWidth);
  }

  function currentMode() {
    return isMobile() ? "mobile" : "desktop";
  }

  function hasMarqueeNodes(root) {
    return !!root.querySelector(".totem-marquee-panel, .totem-marquee-band");
  }

  function needsFullRebuild() {
    if (!shouldShowMarquee()) return false;
    var mode = currentMode();
    var width = layoutWidth();
    if (lastBuiltMode !== mode) return true;
    if (!hasMarqueeNodes(getRoot())) return true;
    if (Math.abs(width - lastBuiltWidth) >= WIDTH_REBUILD_DELTA) return true;
    return false;
  }

  function init(force) {
    if (!shouldShowMarquee()) {
      destroyMarquees();
      lastBuiltMode = null;
      lastBuiltWidth = 0;
      return;
    }

    var root = getRoot();
    if (!force && !needsFullRebuild()) {
      resyncMarqueeLoopsOnly();
      lastBuiltWidth = layoutWidth();
      return;
    }

    destroyMarquees();
    if (isMobile()) buildMobile(root);
    else buildDesktop(root);
    lastBuiltMode = currentMode();
    lastBuiltWidth = layoutWidth();
    initMarqueeLoops();
  }

  window.__totemMarqueeRebuild = function (force) {
    init(!!force);
  };
  window.__totemMarqueeResync = resyncMarqueeLoopsOnly;

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      init(false);
    }, 220);
  });

  window.addEventListener("totem-layout-changed", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      init(needsFullRebuild());
    }, 50);
  });

  function start() {
    if (window.TotemLayout && document.readyState !== "loading") {
      window.TotemLayout.apply();
    }
    init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
