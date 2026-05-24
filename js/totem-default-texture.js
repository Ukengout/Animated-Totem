(function (global) {
  var REL_PATH = "assets/default.png";
  /** Встроенная копия assets/default.png — работает при file:// и без сервера */
  var EMBEDDED_PNG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAABUUlEQVR4AZSQP0hCURTGxTlaDCLekEXi4hI2tRQRGNHoGESEBC21tDQ5tLXkGA4hNDqFVC5ZRLUYIeggin+Gh4MKom4K+nscedx7Ny8f937nfOe7957jncy5vB59pY43DOi6RzNQehg/NUBS9WgG2+6g+fwXYNG3BgglCRFoBlKtfLmYvhwNXvvdejn7RkhShWkIRRNXO+tSKlythpuG/XYiV/qlNBg5EE6RCtNwm/oqdJblS/efte/8WK2GOwbmILCspY/s37Bh0wAahJCkqOwkHQMHo9w82mYgseT1gt+qpN8BZDcSJhkIrYpKpWM4eaomY3eZh2cuY5Q0ED4/C0T3VraCeEjyDupNrjczcBAACJ9hrDIlZsqveAEJoALnBQ4B2kv88T/z46JSbIrk7pqBa/DwXT4tICTpVkM0A7EKGlBD4aaB++iPLgGEUOrcfQoAAP///soh4QAAAAZJREFUAwBSC/BNx+KfNgAAAABJRU5ErkJggg==";

  var cached = null;
  var loading = null;
  var SOURCE_KEY = "totemTextureSource";
  var SOURCE_DEFAULT = "default";
  var SOURCE_SKIN = "skin";

  var assetUrls = (function () {
    var urls = [];
    var seen = {};
    function add(url) {
      if (!url || seen[url]) return;
      seen[url] = true;
      urls.push(url);
    }
    try {
      var cs = document.currentScript;
      if (cs && cs.src) add(new URL("../" + REL_PATH, cs.src).href);
    } catch (e) {}
    try {
      add(new URL(REL_PATH, document.baseURI || global.location.href).href);
    } catch (e) {}
    if (global.location && global.location.origin && global.location.origin !== "null") {
      try {
        var base = global.location.pathname.replace(/\/[^/]*$/, "/");
        add(global.location.origin + base + REL_PATH);
      } catch (e2) {}
    }
    add(EMBEDDED_PNG);
    return urls;
  })();

  function loadFromSrc(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var settled = false;
      function finish(ok) {
        if (settled) return;
        settled = true;
        if (ok && img.naturalWidth > 0) {
          cached = img;
          loading = null;
          resolve(img);
        } else {
          reject(new Error("Failed to load default totem texture"));
        }
      }
      img.onload = function () {
        finish(true);
      };
      img.onerror = function () {
        finish(false);
      };
      img.src = src;
    });
  }

  function load() {
    if (cached) return Promise.resolve(cached);
    if (loading) return loading;
    var index = 0;
    loading = new Promise(function (resolve, reject) {
      function tryNext() {
        if (index >= assetUrls.length) {
          loading = null;
          reject(new Error("Failed to load default totem texture"));
          return;
        }
        var src = assetUrls[index++];
        loadFromSrc(src)
          .then(resolve)
          .catch(tryNext);
      }
      tryNext();
    });
    return loading;
  }

  function getImage() {
    return cached;
  }

  function fillCanvas(ctx, canvas, frames) {
    if (!cached) throw new Error("TotemDefaultTexture.load() required");
    var count = Math.min(16, Math.max(2, frames | 0));
    var frameH = count * 16;
    canvas.width = 16;
    canvas.height = frameH;
    ctx.clearRect(0, 0, 16, frameH);
    ctx.imageSmoothingEnabled = false;
    var sw = cached.naturalWidth || cached.width;
    var sh = cached.naturalHeight || cached.height;
    for (var i = 0; i < count; i++) {
      ctx.drawImage(cached, 0, 0, sw, sh, 0, i * 16, 16, 16);
    }
    return count;
  }

  function markSource(mode) {
    if (mode === SOURCE_DEFAULT) {
      sessionStorage.setItem(SOURCE_KEY, SOURCE_DEFAULT);
    } else {
      sessionStorage.setItem(SOURCE_KEY, SOURCE_SKIN);
    }
  }

  function isDefaultSource() {
    return sessionStorage.getItem(SOURCE_KEY) === SOURCE_DEFAULT;
  }

  function applyToEditorCanvas(ctx, canvas, frameCount) {
    return load().then(function () {
      fillCanvas(ctx, canvas, frameCount);
    });
  }

  global.TotemDefaultTexture = {
    load: load,
    getImage: getImage,
    fillCanvas: fillCanvas,
    applyToEditorCanvas: applyToEditorCanvas,
    markSource: markSource,
    isDefaultSource: isDefaultSource,
    SOURCE_DEFAULT: SOURCE_DEFAULT,
    SOURCE_SKIN: SOURCE_SKIN,
  };
})(window);
