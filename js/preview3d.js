/**
 * 3D-предпросмотр тотема на canvas: каждый пиксель — куб 1×1×1, цвет с текстуры.
 */
(function (global) {
  const previewState = new WeakMap();
  const DEG = Math.PI / 180;

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function readFramePixels(source, frameW, frameH, frameIndex) {
    const canvas = document.createElement("canvas");
    canvas.width = frameW;
    canvas.height = frameH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, frameW, frameH);

    if (source instanceof HTMLCanvasElement) {
      const rowH = frameH;
      const maxFrame = Math.max(0, Math.floor(source.height / rowH) - 1);
      const y0 = clamp(frameIndex, 0, maxFrame) * rowH;
      ctx.drawImage(source, 0, y0, frameW, rowH, 0, 0, frameW, frameH);
    } else if (source instanceof HTMLImageElement) {
      const y0 = frameIndex * frameH;
      ctx.drawImage(source, 0, y0, frameW, frameH, 0, 0, frameW, frameH);
    }

    return ctx.getImageData(0, 0, frameW, frameH);
  }

  function cacheFrames(state) {
    state.frames = [];
    for (let i = 0; i < state.totalFrames; i++) {
      state.frames.push(readFramePixels(state.source, state.frameW, state.frameH, i));
    }
  }

  function rotatePoint(x, y, z, rotX, rotY) {
    const cy = Math.cos(rotY);
    const sy = Math.sin(rotY);
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;

    const cx = Math.cos(rotX);
    const sx = Math.sin(rotX);
    const y2 = y * cx - z1 * sx;
    const z2 = y * sx + z1 * cx;

    return { x: x1, y: -y2, z: z2 };
  }

  function pushFace(faces, corners, color, rotX, rotY) {
    const projected = corners.map((c) => rotatePoint(c[0], c[1], c[2], rotX, rotY));
    const depth = projected.reduce((sum, p) => sum + p.z, 0) / projected.length;
    faces.push({ projected, color, depth });
  }

  function addCubeFaces(faces, x, y, w, h, unit, color, rotX, rotY) {
    const ox = (x - w / 2 + 0.5) * unit;
    const oy = (h / 2 - y - 0.5) * unit;
    const s = unit;
    const z0 = -unit / 2;
    const z1 = unit / 2;

    pushFace(faces, [[ox, oy, z0], [ox + s, oy, z0], [ox + s, oy + s, z0], [ox, oy + s, z0]], color, rotX, rotY);
    pushFace(faces, [[ox + s, oy, z1], [ox, oy, z1], [ox, oy + s, z1], [ox + s, oy + s, z1]], color, rotX, rotY);
    pushFace(faces, [[ox, oy, z1], [ox + s, oy, z1], [ox + s, oy, z0], [ox, oy, z0]], color, rotX, rotY);
    pushFace(faces, [[ox + s, oy + s, z1], [ox, oy + s, z1], [ox, oy + s, z0], [ox + s, oy + s, z0]], color, rotX, rotY);
    pushFace(faces, [[ox, oy + s, z1], [ox + s, oy + s, z1], [ox + s, oy + s, z0], [ox, oy + s, z0]], color, rotX, rotY);
    pushFace(faces, [[ox, oy, z1], [ox, oy + s, z1], [ox, oy + s, z0], [ox, oy, z0]], color, rotX, rotY);
    pushFace(faces, [[ox + s, oy, z1], [ox + s, oy + s, z1], [ox + s, oy + s, z0], [ox + s, oy, z0]], color, rotX, rotY);
  }

  function buildFaces(imageData, w, h, unit, rotX, rotY) {
    const faces = [];
    const data = imageData.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data[i + 3] < 8) continue;
        const color = `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`;
        addCubeFaces(faces, x, y, w, h, unit, color, rotX, rotY);
      }
    }

    faces.sort((a, b) => a.depth - b.depth);
    return faces;
  }

  function draw(state) {
    const { ctx, canvas, frameW: w, frameH: h, unit, frames, frameIndex, rotX, rotY, viewSize } = state;
    const imageData = frames[frameIndex];
    if (!imageData) return;

    const faces = buildFaces(imageData, w, h, unit, rotX * DEG, rotY * DEG);
    faces.sort((a, b) => a.depth - b.depth);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(viewSize / 2, viewSize / 2);

    for (const face of faces) {
      const pts = face.projected;
      ctx.fillStyle = face.color;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  function ensureHost(stack, viewSize) {
    let host = stack.querySelector(".totem-preview-host");
    if (!host) {
      stack.innerHTML = "";
      stack.classList.add("totem-voxel-stack");
      host = document.createElement("div");
      host.className = "totem-preview-host";
      const canvas = document.createElement("canvas");
      host.appendChild(canvas);
      stack.appendChild(host);
    }
    host.style.width = `${viewSize}px`;
    host.style.height = `${viewSize}px`;
    const canvas = host.querySelector("canvas");
    canvas.width = viewSize;
    canvas.height = viewSize;
    return { host, canvas, ctx: canvas.getContext("2d") };
  }

  function resolveSource(source) {
    if (source instanceof HTMLCanvasElement || source instanceof HTMLImageElement) {
      return Promise.resolve(source);
    }
    if (typeof source === "string") {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = source;
      });
    }
    return Promise.reject(new Error("Unsupported texture source"));
  }

  async function build(stack, source, options = {}) {
    const resolved = await resolveSource(source);
    const frameW = options.frameW ?? resolved.width;
    const frameH = options.frameH ?? (resolved instanceof HTMLImageElement ? resolved.width : options.frameH ?? 16);

    let totalFrames = options.totalFrames;
    if (!totalFrames) {
      totalFrames = Math.max(1, Math.floor(resolved.height / frameH));
    }

    const pixelSize = options.pixelSize ?? 14;
    const unit = options.unit ?? pixelSize;
    const stackLimit = Math.min(stack.clientWidth || 0, stack.clientHeight || 0);
    const modelSpan = Math.max(frameW, frameH) * pixelSize * 1.25;
    const viewSize =
      options.viewSize ??
      (stackLimit > 0 ? Math.min(stackLimit, modelSpan) : Math.max(180, modelSpan));
    const { canvas, ctx } = ensureHost(stack, viewSize);

    const state = {
      source: resolved,
      frameW,
      frameH,
      totalFrames,
      unit,
      viewSize,
      canvas,
      ctx,
      rotX: options.rotX ?? 0,
      rotY: options.rotY ?? 0,
      frameIndex: options.frameIndex ?? 0,
      drawPending: false,
    };

    cacheFrames(state);
    previewState.set(stack, state);
    draw(state);
    return state;
  }

  function scheduleDraw(state) {
    if (state.drawPending) return;
    state.drawPending = true;
    requestAnimationFrame(() => {
      state.drawPending = false;
      draw(state);
    });
  }

  function setFrame(stack, frameIndex) {
    const state = previewState.get(stack);
    if (!state) return;
    state.frameIndex = ((frameIndex % state.totalFrames) + state.totalFrames) % state.totalFrames;
    scheduleDraw(state);
  }

  function setRotation(stack, rotX, rotY) {
    const state = previewState.get(stack);
    if (!state) return;
    state.rotX = clamp(rotX, -65, 65);
    state.rotY = rotY;
    scheduleDraw(state);
  }

  function rebuild(stack) {
    const state = previewState.get(stack);
    if (!state) return;
    cacheFrames(state);
    scheduleDraw(state);
  }

  function syncTexture(stack, source) {
    const state = previewState.get(stack);
    if (!state) return Promise.resolve();
    return resolveSource(source).then((resolved) => {
      state.source = resolved;
      cacheFrames(state);
      scheduleDraw(state);
    });
  }

  /** Перетаскивание мышью/пальцем. hooks: { onDragStart, onDragEnd } */
  function setupDragRotation(scene, stack, rotation, hooks = {}) {
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    scene.style.touchAction = "none";
    scene.style.cursor = "grab";

    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      hooks.onDragStart?.();
      scene.setPointerCapture(e.pointerId);
      scene.style.cursor = "grabbing";
      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!dragging) return;
      rotation.rotY += (e.clientX - lastX) * 0.8;
      rotation.rotX = clamp(rotation.rotX + (e.clientY - lastY) * 0.8, -65, 65);
      setRotation(stack, rotation.rotX, rotation.rotY);
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onPointerEnd = (e) => {
      if (!dragging) return;
      dragging = false;
      hooks.onDragEnd?.();
      scene.style.cursor = "grab";
      if (scene.hasPointerCapture(e.pointerId)) {
        scene.releasePointerCapture(e.pointerId);
      }
    };

    scene.addEventListener("pointerdown", onPointerDown);
    scene.addEventListener("pointermove", onPointerMove);
    scene.addEventListener("pointerup", onPointerEnd);
    scene.addEventListener("pointercancel", onPointerEnd);
    scene.addEventListener("lostpointercapture", () => {
      dragging = false;
      scene.style.cursor = "grab";
    });
  }

  global.TotemPreview3D = { build, setFrame, setRotation, rebuild, syncTexture, setupDragRotation };
})(typeof window !== "undefined" ? window : globalThis);
