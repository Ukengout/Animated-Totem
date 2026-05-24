(function () {
  var TOTEM_COUNT = 41;
  var SKIP = { 31: true };
  var COLUMN_COUNT = 6;

  var TOTEM_PATHS = [];
  for (var i = 0; i < TOTEM_COUNT; i++) {
    if (!SKIP[i]) TOTEM_PATHS.push("assets/totem" + i + ".png");
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

  function buildColumn(direction, paths) {
    var col = document.createElement("div");
    col.className = "totem-marquee-col totem-marquee-col--" + direction;

    var track = document.createElement("div");
    track.className = "totem-marquee-track totem-marquee-track--loading";

    var stripPaths = paths.length > 0 ? paths : shuffleArray(TOTEM_PATHS);
    var loopPaths = stripPaths.concat(stripPaths);
    for (var p = 0; p < loopPaths.length; p++) {
      track.appendChild(createTotemItem(loopPaths[p]));
    }

    col.appendChild(track);
    return col;
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

  function syncMarqueeLoop(track) {
    var items = track.querySelectorAll(".totem-marquee-item");
    var half = items.length / 2;
    if (!half || !items[half]) return;

    var shift = Math.round(items[half].offsetTop - items[0].offsetTop);
    if (shift <= 0) return;

    track.style.setProperty("--marquee-shift", shift + "px");

    var anim = getComputedStyle(track).animationName;
    if (anim && anim !== "none") {
      track.style.animation = "none";
      void track.offsetHeight;
      track.style.animation = "";
    }
  }

  function initMarqueeLoops() {
    var tracks = document.querySelectorAll(".totem-marquee-track");
    var trackList = [];
    for (var i = 0; i < tracks.length; i++) trackList.push(tracks[i]);

    Promise.all(trackList.map(whenTrackImagesReady)).then(function () {
      for (var t = 0; t < trackList.length; t++) {
        syncMarqueeLoop(trackList[t]);
        trackList[t].classList.remove("totem-marquee-track--loading");
      }

      var resizeTimer;
      window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          for (var r = 0; r < trackList.length; r++) syncMarqueeLoop(trackList[r]);
        }, 120);
      });
    });
  }

  function init() {
    if (!document.body.classList.contains("landing-with-marquee")) return;

    var buckets = partitionForColumns(COLUMN_COUNT);
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

    document.body.insertBefore(left, document.body.firstChild);
    document.body.appendChild(right);
    initMarqueeLoops();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
