(() => {
  "use strict";

  const app = document.getElementById("app");
  const D = window.GAME_DATA;
  const RECTS = window.HOTSPOT_RECTS;

  const state = {
    route: null,
    stylePicked: null,
    accessoryPicked: new Set(),
    history: [],
    muted: false,
  };

  function currentSceneId() {
    const visible = document.querySelector(".scene:not(.hidden)");
    return visible ? visible.dataset.scene : null;
  }

  function currentRoute() {
    return D.routes[state.route] || D.routes.blossom;
  }

  // ==========================================================================
  // GENERIC PHOTO-SCENE HOTSPOT LAYOUT
  // ==========================================================================
  //
  // Every photo scene = one full 402x874 composite image (<img class=
  // "scene-bg">) shown with object-fit:contain, plus a set of invisible
  // buttons (.hotspot[data-rect]) that this function positions in exact
  // pixels over the corresponding fraction of the ORIGINAL image — so they
  // always sit precisely on the baked-in cards/icons regardless of screen
  // size (see HOTSPOT_RECTS in data.js for how those fractions were
  // measured).

  const photoScenes = Array.from(document.querySelectorAll(".photo-scene"));

  // Routes whose pictures have a different layout (e.g. the wide nerd pictures) override some click-zone rects (data.js: routes.<name>.rects).
  let rectOverride = null, wideRoute = false;
  const rectOf = (sceneEl, key) => (rectOverride && sceneEl && (sceneEl.id === "scene-story" || sceneEl.id === "scene-letter") && rectOverride[key]) || RECTS[key];
  const WIDE = (window.GAME_DATA && window.GAME_DATA.story && window.GAME_DATA.story.wide) || null;   // wide-canvas pictures (bleed on both sides)

  // --------------------------------------------------------------------------
  // SIDE FILL: on screens wider than 402:874 (e.g. phones with a browser bar)
  // the image can't cover the full width without cropping the top/bottom, so
  // the left/right bars used to be black. Instead, the outermost strip of the
  // image (wallpaper / baseboard / floor only — no ornaments, no character) is
  // mirrored outward again and again, so the wallpaper simply keeps going.
  // The mirror makes the seam invisible.
  // --------------------------------------------------------------------------
  const SIDE_STRIP = 0.058;   // fraction of image width used as the repeating strip (the part of the wallpaper left of the dialogue box / icons)

  // A clean wallpaper strip taken from the left / right edge of the picture. The corner ornaments (top ≈ 0–9.5 %, bottom ≈ 89.5–100 %)
  // are painted over with wallpaper rows from just below / above, so no ornament pieces get mirrored into the side bars.
  function sideStrip(img, right, patch) {
    const key = [img.currentSrc, right, patch].join("|");
    if (img._strips && img._strips[key]) return img._strips[key];
    const nw = img.naturalWidth, nh = img.naturalHeight, sw = Math.max(8, Math.round(nw * SIDE_STRIP));
    const cv = document.createElement("canvas");
    cv.width = sw; cv.height = nh;
    const c = cv.getContext("2d");
    const sx = right ? nw - sw : 0;
    c.drawImage(img, sx, 0, sw, nh, 0, 0, sw, nh);
    if (patch) {
      const t = Math.round(nh * 0.095), b = Math.round(nh * 0.895), hb = nh - b;
      c.drawImage(img, sx, t, sw, t, 0, 0, sw, t);
    }
    (img._strips = img._strips || {})[key] = cv;
    return cv;
  }

  // Side bars are two small canvases (just the bars, not the whole screen) → much less memory / redraw work than a full-screen canvas.
  // Colours of the page edge above / below the picture (shown through the browser's translucent status bar / toolbar on phones).
  function avgColor(img, x0, y0, x1, y1) {
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const cv = document.createElement("canvas"); cv.width = 16; cv.height = 8;
    const c = cv.getContext("2d");
    c.drawImage(img, x0 * nw, y0 * nh, (x1 - x0) * nw, (y1 - y0) * nh, 0, 0, 16, 8);
    const d = c.getImageData(0, 0, 16, 8).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
  }
  function applyEdgeColors(sceneEl, img) {
    if (sceneEl.classList.contains("hidden") || !img.complete || !img.naturalWidth) return;
    try {
      if (!img._edge) {
        const plain = img.id === "introBg";          // (the curtain picture has no corner ornaments)
        img._edge = {
          top: plain ? avgColor(img, 0, 0, 1, 0.02) : img.dataset.wide ? avgColor(img, 0, 0.125, 1, 0.145) : avgColor(img, 0, 0.10, 1, 0.12),
          bottom: avgColor(img, 0.3, 0.975, 0.7, 0.995),
        };
      }
      const root = document.documentElement.style;
      root.setProperty("--edge-top", img._edge.top);
      root.setProperty("--edge-bottom", img._edge.bottom);
    } catch (e) { /* canvas read blocked (e.g. file://) → keep the default dark colour */ }
  }

  function drawSideFill(sceneEl, img, L) {
    if (img.tagName !== "IMG") return;
    if (img.dataset.cover) {                           // plain picture that covers the whole screen (blossom letter): no side bars to fill
      sceneEl.querySelectorAll(":scope > .scene-fill").forEach((c) => { c.style.display = "none"; });
      return;
    }
    applyEdgeColors(sceneEl, img);
    if (img.id === "introBg") {                        // the intro curtain covers the whole screen: no side bars to fill
      sceneEl.querySelectorAll(":scope > .scene-fill").forEach((c) => { c.style.display = "none"; });
      return;
    }
    if (img.dataset.wide && WIDE) {                    // the picture itself already covers the bleed: only fill what is left beyond its edges
      const bleed = WIDE.frameX * (L.renderW / 402);
      L = { ...L, offsetX: Math.max(0, L.offsetX - bleed), renderW: WIDE.canvasW * (L.renderW / 402) };
    }
    const old = sceneEl.querySelector(":scope > canvas.scene-fill:not(.fill-l):not(.fill-r)");
    if (old) old.remove();
    let cvL = sceneEl.querySelector(":scope > .scene-fill.fill-l"), cvR = sceneEl.querySelector(":scope > .scene-fill.fill-r");
    if (L.offsetX < 1 || L.offsetY > 1) {              // no side bars (or top/bottom bars): nothing to fill
      if (cvL) cvL.style.display = "none";
      if (cvR) cvR.style.display = "none";
      return;
    }
    if (!img.complete || !img.naturalWidth) {
      if (!img._fillWait) { img._fillWait = true; img.addEventListener("load", () => { img._fillWait = false; layoutPhotoScene(sceneEl); }, { once: true }); }
      return;
    }
    if (!cvL) {
      cvL = document.createElement("canvas"); cvL.className = "scene-fill fill-l";
      cvR = document.createElement("canvas"); cvR.className = "scene-fill fill-r";
      sceneEl.insertBefore(cvR, sceneEl.firstChild); sceneEl.insertBefore(cvL, sceneEl.firstChild);
    }
    const patch = img.id !== "introBg";                  // (the intro curtain picture has no corner ornaments)
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const key = [L.boxW, L.boxH, L.offsetX, L.renderW, dpr, img.currentSrc].join("|");
    cvL.style.display = cvR.style.display = "block";
    if (cvL._key === key) return;
    cvL._key = key;
    const nw = img.naturalWidth;
    const k = L.renderW / nw;                            // css px per image px
    const stripL = sideStrip(img, false, patch), stripR = sideStrip(img, true, patch);
    // Two bands: the wallpaper (top) can use a wide strip; the lower part (baseboard / floor) must use a narrower one,
    // because the pedestal skirt and the dialogue box start close to the picture edge there.
    const bands = patch ? [[0, 0.70, 1], [0.70, 1, 0.5]] : [[0, 1, 1]];
    const setup = (cv, left) => {
      cv.width = Math.max(1, Math.round(L.offsetX * dpr)); cv.height = Math.round(L.renderH * dpr);
      cv.style.left = `${left}px`; cv.style.top = `${L.offsetY}px`;
      cv.style.width = `${L.offsetX}px`; cv.style.height = `${L.renderH}px`;
      const ctx = cv.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return ctx;
    };
    const cl = setup(cvL, 0), cr = setup(cvR, L.offsetX + L.renderW);
    for (const [y0, y1, frac] of bands) {
      const srcW = Math.max(4, Math.round(stripL.width * frac));
      const tileW = srcW * k;
      const tiles = Math.ceil(L.offsetX / tileW) + 1;
      const sy = Math.floor(y0 * stripL.height), sh = Math.ceil((y1 - y0) * stripL.height);
      const dy = y0 * L.renderH, dh = (y1 - y0) * L.renderH;
      for (let i = 0; i < tiles; i++) {
        const flipped = i % 2 === 0;                     // tile 0 is the mirrored strip right next to the seam
        drawStrip(cl, stripL, 0, sy, srcW, sh, L.offsetX - (i + 1) * tileW, dy, tileW, dh, flipped);
        drawStrip(cr, stripR, stripR.width - srcW, sy, srcW, sh, L.offsetX * 0 + i * tileW, dy, tileW, dh, flipped);
      }
    }
  }

  function drawStrip(ctx, strip, sx, sy, sw, sh, dx, dy, dw, dh, flip) {
    ctx.save();
    if (flip) {
      ctx.translate(dx + dw, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(strip, sx, sy, sw, sh, 0, dy, dw + 0.5, dh + 0.5);
    } else {
      ctx.drawImage(strip, sx, sy, sw, sh, dx, dy, dw + 0.5, dh + 0.5);
    }
    ctx.restore();
  }

  function layoutPhotoScene(sceneEl) {
    const img = sceneEl.querySelector(".scene-bg");
    if (!img) return;
    const fillImg = sceneEl._fillImg || img;        // story scene: wallpaper source differs per route
    const naturalW = Number(img.dataset.naturalW) || img.naturalWidth;
    const naturalH = Number(img.dataset.naturalH) || img.naturalHeight;
    if (!naturalW || !naturalH) return;

    const boxW = sceneEl.clientWidth;
    const boxH = sceneEl.clientHeight;
    if (!boxW || !boxH) return;

    const naturalRatio = naturalW / naturalH;
    const boxRatio = boxW / boxH;
    let renderW, renderH, offsetX, offsetY;
    if (boxRatio > naturalRatio) {
      renderH = boxH; renderW = renderH * naturalRatio;
      offsetX = (boxW - renderW) / 2; offsetY = 0;
    } else {
      renderW = boxW; renderH = renderW / naturalRatio;
      offsetX = 0; offsetY = (boxH - renderH) / 2;
    }
    // First screen (envelope intro): the design (402x874) is scaled to the screen WIDTH, like on a 402-wide phone, and centred vertically; the
    // curtain picture behind it covers the whole screen. If the screen is too short for the envelope + letter, the content is shrunk to fit.
    if (sceneEl.id === "scene-envelope") {
      const CT = 170, CH = 590;                                   // design px: top of the letter .. bottom of the envelope
      const sc = Math.min((boxW / 402) * (D.introScale || 0.88), (boxH - 24) / CH);   // introScale (data.js): 1 = letter nearly edge to edge, smaller = more side margin
      renderW = 402 * sc; renderH = 874 * sc;
      offsetX = (boxW - renderW) / 2; offsetY = (boxH - renderH) / 2;
      const bottom = offsetY + (CT + CH) * sc;
      if (bottom > boxH - 12) offsetY -= bottom - (boxH - 12);
      const top = offsetY + CT * sc;
      if (top < 12) offsetY += 12 - top;
    }
    // Wide-canvas route on a narrow screen: grow the frame a little (cutting at most 3 % of its width on each side) instead of leaving bars above / below.
    if (wideRoute && sceneEl.id === "scene-story") {
      const sC = Math.min(boxW / 402, boxH / 874), sM = boxW / (402 * 0.94);
      const sw = Math.max(sC, Math.min(boxH / 874, sM));
      renderW = 402 * sw; renderH = 874 * sw;
      offsetX = (boxW - renderW) / 2; offsetY = (boxH - renderH) / 2;
    }
    // Wide-canvas pictures: the 402x874 frame is fitted as before; the extra background around it is shown out to the screen edges.
    if (WIDE) {
      const s = renderW / 402;
      sceneEl.querySelectorAll(".scene-bg[data-wide]").forEach((im) => {
        im.style.right = "auto"; im.style.bottom = "auto";
        im.style.left = `${offsetX - WIDE.frameX * s}px`; im.style.top = `${offsetY}px`;
        im.style.width = `${WIDE.canvasW * s}px`; im.style.height = `${renderH}px`;
        im.style.objectFit = "fill";
      });
    }
    drawSideFill(sceneEl, fillImg, { offsetX, offsetY, renderW, renderH, boxW, boxH });

    sceneEl.querySelectorAll("[data-rect]").forEach((el) => {
      const r = rectOf(sceneEl, el.dataset.rect);
      if (!r) return;
      el.style.left = `${offsetX + r.x * renderW}px`;
      el.style.top = `${offsetY + r.y * renderH}px`;
      el.style.width = `${r.w * renderW}px`;
      el.style.height = `${r.h * renderH}px`;
      // Buttons that draw their own label scale the font with their box.
      if (el.dataset.fitText) el.style.fontSize = `${r.h * renderH * 0.4}px`;
    });

    if (sceneEl.id === "scene-envelope" && window.IntroScene && window.IntroScene.layout) {
      window.IntroScene.layout({ sc: renderW / 402, left: offsetX, top: offsetY, boxW, boxH });
    }
    return { offsetX, offsetY, renderW, renderH };
  }

  function layoutAllPhotoScenes() {
    photoScenes.forEach(layoutPhotoScene);
  }

  function setSceneImage(sceneEl, src) {
    const img = sceneEl.querySelector(".scene-bg");
    if (img.src.endsWith(src)) { layoutPhotoScene(sceneEl); return; }
    img.onload = () => layoutPhotoScene(sceneEl);
    img.src = src;
  }

  // Places a decorative/fx element (card tint, correct ring, notice popup)
  // using the same fractional rects as the hotspots, so it lines up with
  // the baked-in card exactly.
  function positionOnRect(sceneEl, el, rectKey) {
    const layout = layoutPhotoScene(sceneEl);
    if (!layout) return;
    const r = rectOf(sceneEl, rectKey);
    el.style.left = `${layout.offsetX + r.x * layout.renderW}px`;
    el.style.top = `${layout.offsetY + r.y * layout.renderH}px`;
    el.style.width = `${r.w * layout.renderW}px`;
    el.style.height = `${r.h * layout.renderH}px`;
  }

  window.addEventListener("resize", layoutAllPhotoScenes);
  window.addEventListener("orientationchange", layoutAllPhotoScenes);
  if (window.ResizeObserver) {
    photoScenes.forEach((s) => new ResizeObserver(() => layoutPhotoScene(s)).observe(s));
  }

  // ==========================================================================
  // TRANSITIONS
  // ==========================================================================

  const overlay = document.getElementById("transitionOverlay");
  // white veil between screens: color / peak opacity / speed live in data.js (transition)
  overlay.style.setProperty("--veil-color", D.transition.color);
  overlay.style.setProperty("--veil-peak", D.transition.peak);
  overlay.style.setProperty("--veil-in", `${D.transition.inMs}ms`);
  overlay.style.setProperty("--veil-out", `${D.transition.outMs}ms`);

  function transitionTo(nextSceneId, setupFn, soft) {
    const T = soft || { peak: D.transition.peak, inMs: D.transition.inMs, holdMs: 0, outMs: D.transition.outMs };
    overlay.style.setProperty("--veil-peak", T.peak);
    overlay.style.setProperty("--veil-in", `${T.inMs}ms`);
    overlay.style.setProperty("--veil-out", `${T.outMs}ms`);
    overlay.style.setProperty("--veil-ease", soft ? "ease-in-out" : "");
    overlay.classList.add("cover");
    window.setTimeout(() => {
      const prevId = currentSceneId();
      if (prevId && prevId !== nextSceneId) state.history.push(prevId);
      showSceneRaw(nextSceneId);
      if (typeof setupFn === "function") setupFn();
      overlay.classList.remove("cover");
      if (soft) window.setTimeout(() => {
        overlay.style.setProperty("--veil-peak", D.transition.peak);
        overlay.style.setProperty("--veil-in", `${D.transition.inMs}ms`);
        overlay.style.setProperty("--veil-out", `${D.transition.outMs}ms`);
        overlay.style.setProperty("--veil-ease", "");
      }, T.outMs + 50);
    }, T.inMs + (T.holdMs || 0));
  }

  // Scenes with their own baked-in control icons (route, style, ...) hide
  // the generic CSS control bar; scenes that are still plain-color
  // placeholders (accessory, curtain, ending) show it instead.
  const SCENES_WITH_BAKED_CONTROLS = new Set(["story", "style", "letter"]);
  const SCENES_WITH_GENERIC_CONTROLS = new Set(["accessory", "curtain", "ending"]);

  // PC 배경(분홍/금색 새틴)은 CSS(body::before / body::after)에 있고, 여기서는 클래스만 바꾼다. 모바일에서는 보이지 않는다.
  function setPcTheme(sun) { document.body.classList.toggle("sun-bg", !!sun); }

  function showSceneRaw(id) {
    document.querySelectorAll(".scene").forEach((el) => {
      el.classList.toggle("hidden", el.dataset.scene !== id);
    });
    document.getElementById("controlBar").classList.toggle("hidden", !SCENES_WITH_GENERIC_CONTROLS.has(id));
    if (id !== "envelope" && window.IntroScene) window.IntroScene.stop();
    if (id === "envelope") setPcTheme(false);          // 첫 화면으로 돌아오면 PC 배경도 분홍으로
    if (SCENES_WITH_BAKED_CONTROLS.has(id) || id === "envelope") {
      requestAnimationFrame(() => layoutAllPhotoScenes());
    }
  }

  // ==========================================================================
  // SHARED TOAST / FX HELPERS
  // ==========================================================================

  const globalToast = document.getElementById("globalToast");
  const globalToastText = document.getElementById("globalToastText");
  let toastTimer = null;

  function showToast(text, ms = 2400, pos = "bottom") {
    globalToastText.textContent = text;
    globalToast.classList.toggle("top", pos === "top");
    globalToast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => globalToast.classList.remove("show"), ms);
  }

  function showBubble(bubbleEl, textEl, text, { autoHideMs } = {}) {
    textEl.textContent = text;
    bubbleEl.classList.add("show");
    if (autoHideMs) {
      window.clearTimeout(bubbleEl._hideTimer);
      bubbleEl._hideTimer = window.setTimeout(() => hideBubble(bubbleEl), autoHideMs);
    }
  }
  function hideBubble(bubbleEl) { bubbleEl.classList.remove("show"); }

  // ==========================================================================
  // TIMED GIF / MP4 OVERLAY (unchanged capability, ready to use anywhere)
  // ==========================================================================

  const mediaOverlay = document.getElementById("timedMediaOverlay");
  const mediaVideo = document.getElementById("timedVideo");
  const mediaGif = document.getElementById("timedGif");

  function showTimedMedia({ type, src, delayAfterEndMs = 3000, fixedDelayMs = null }) {
    return new Promise((resolve) => {
      mediaOverlay.classList.remove("hidden");
      requestAnimationFrame(() => mediaOverlay.classList.add("show"));
      const finish = () => {
        mediaOverlay.classList.remove("show");
        window.setTimeout(() => {
          mediaOverlay.classList.add("hidden");
          mediaVideo.pause();
          mediaVideo.removeAttribute("src");
          mediaVideo.classList.add("hidden");
          mediaGif.removeAttribute("src");
          mediaGif.classList.add("hidden");
          resolve();
        }, 350);
      };
      if (type === "video") {
        mediaGif.classList.add("hidden");
        mediaVideo.classList.remove("hidden");
        mediaVideo.src = src;
        mediaVideo.currentTime = 0;
        mediaVideo.play().catch(() => {});
        if (fixedDelayMs) window.setTimeout(finish, fixedDelayMs);
        else mediaVideo.onended = () => window.setTimeout(finish, delayAfterEndMs);
      } else {
        mediaVideo.classList.add("hidden");
        mediaGif.classList.remove("hidden");
        mediaGif.src = src;
        window.setTimeout(finish, fixedDelayMs || delayAfterEndMs);
      }
    });
  }
  window.PartyGame = window.PartyGame || {};
  window.PartyGame.showTimedMedia = showTimedMedia;

  // ---- background music: 두 곡 (intro = 첫 화면, story = 너드 지나 ~ 편지 화면 직전), 페이드 인/아웃, ♪ 버튼으로 끄고 켬 ----
  // 소리 크기 변화는 WebAudio GainNode 로 한다 (iOS 사파리는 audio.volume 을 무시하기 때문). WebAudio 가 없으면 audio.volume 으로 대신한다.
  // 브라우저는 사용자가 한 번 터치하기 전에는 소리를 못 내므로, 첫 터치에서 두 곡을 모두 "잠금 해제"해 두고 그때부터 재생한다.
  const Music = (() => {
    const CFG = D.music;
    // 주의: 파일(file://)로 직접 열면 브라우저가 WebAudio 로 흘려보낸 소리를 무음 처리한다 → 그때는 audio.volume 으로 페이드한다.
    //       (배포 주소 http/https 에서는 WebAudio 사용: iOS 사파리도 페이드가 먹는다)
    const AC = /^https?:$/.test(location.protocol) ? (window.AudioContext || window.webkitAudioContext) : null;
    let ac = null, ticker = 0, desired = null, muted = false;
    const T = {};
    const clamp01 = (x) => Math.max(0, Math.min(1, x));
    function ensureCtx() {
      if (!ac && AC) {
        try {
          ac = new AC();
          // 자동 재생이 허용돼서 컨텍스트가 늦게 켜지면, 페이드 인을 처음부터 다시 시작
          ac.addEventListener("statechange", () => {
            if (ac.state === "running" && desired && !muted) { const t = T[desired.name]; if (t) { setVol(t, 0); startEl(t, desired.fadeInMs, false); } }
          });
        } catch (e) { ac = null; }
      }
      return ac;
    }
    // 소리 크기 설정. 페이드는 WebAudio 사용 시 오디오 스레드에 "예약"해서 한다 →
    // 화면 전환 중 메인 스레드가 잠깐 멈춰도 소리가 뚝 끊기거나 튀지 않는다.
    function setVol(t, v, keepSched) {
      t.v = clamp01(v);
      if (t.gain) { if (!keepSched) { try { t.gain.gain.cancelScheduledValues(0); } catch (e) {} t.gain.gain.value = t.v; } }
      else t.el.volume = t.v;
    }
    const EASE = (() => { const n = 48, a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = 0.5 - 0.5 * Math.cos(Math.PI * i / (n - 1)); return a; })();
    function schedule(t, from, to, ms) {
      const g = t.gain.gain, now = ac.currentTime;
      try {
        g.cancelScheduledValues(0);
        g.setValueAtTime(from, now);
        if (ms > 0 && from !== to) {
          const c = new Float32Array(EASE.length);
          for (let i = 0; i < c.length; i++) c[i] = from + (to - from) * EASE[i];
          g.setValueCurveAtTime(c, now + 0.01, ms / 1000);
        } else g.setValueAtTime(to, now);
      } catch (e) { g.value = to; }
    }
    function make(name) {
      if (T[name]) return T[name];
      const c = CFG[name], el = new Audio();
      el.loop = true; el.preload = "auto"; el.setAttribute("playsinline", ""); el.src = c.src;
      const t = { name, el, gain: null, v: 0, ramp: null, blocked: false, broken: false };
      el.addEventListener("error", () => { t.broken = true; });
      if (ensureCtx()) {
        try {
          const src = ac.createMediaElementSource(el);
          t.gain = ac.createGain(); t.gain.gain.value = 0;
          src.connect(t.gain); t.gain.connect(ac.destination);
        } catch (e) { t.gain = null; }
      }
      setVol(t, 0);
      T[name] = t;
      return t;
    }
    function tick() {
      const now = performance.now();
      let any = false;
      Object.values(T).forEach((t) => {
        const r = t.ramp; if (!r) return;
        const u = r.ms <= 0 ? 1 : clamp01((now - r.t0) / r.ms);
        const e = 0.5 - 0.5 * Math.cos(Math.PI * u);                 // smooth in and out
        setVol(t, r.from + (r.to - r.from) * e, !!t.gain);           // (WebAudio 는 이미 예약돼 있으니 값만 기록)
        if (u >= 1) { t.ramp = null; if (r.then) r.then(); } else any = true;
      });
      if (!any) { window.clearInterval(ticker); ticker = 0; }
    }
    function valueNow(t) {                                          // 진행 중인 페이드의 "지금 값" (메인 스레드가 밀렸어도 시간으로 계산)
      const r = t.ramp; if (!r) return t.v;
      const u = r.ms <= 0 ? 1 : clamp01((performance.now() - r.t0) / r.ms);
      return r.from + (r.to - r.from) * (0.5 - 0.5 * Math.cos(Math.PI * u));
    }
    function ramp(t, to, ms, then) {
      const from = valueNow(t);
      t.v = from;
      t.ramp = { from, to, t0: performance.now(), ms, then };
      if (t.gain && ac) schedule(t, from, to, ms);
      if (!ticker) ticker = window.setInterval(tick, 30);
      tick();
    }
    function startEl(t, fadeMs, restart) {
      if (t.broken) return;
      if (restart) { try { t.el.currentTime = 0; } catch (e) {} }
      const p = t.el.play();
      if (p && typeof p.catch === "function") p.catch(() => { t.blocked = true; ramp(t, 0, 0); });
      else if (p && typeof p.then === "function") p.then(() => { t.unlocked = true; if (ac && ac.state === "suspended") ac.resume().catch(() => {}); });
      t.blocked = false;
      ramp(t, CFG[t.name].volume, fadeMs);
    }
    function stopEl(t, ms) { ramp(t, 0, ms, () => { if (!(desired && desired.name === t.name && !muted)) t.el.pause(); }); }

    // name 곡을 (페이드인으로) 튼다. 다른 곡은 switchFadeMs 동안 줄어들며 멈춘다.
    function play(name, { fadeInMs, restart = false, outMs } = {}) {
      if (!CFG[name]) return;
      const t = make(name);
      desired = { name, fadeInMs: fadeInMs != null ? fadeInMs : CFG[name].fadeInMs, restart };
      Object.values(T).forEach((o) => { if (o !== t) stopEl(o, outMs != null ? outMs : CFG.switchFadeMs); });
      if (muted) return;
      startEl(t, desired.fadeInMs, restart);
    }
    // name 곡을 페이드아웃으로 끝낸다 (다시 play 하기 전까지 조용)
    function fadeOut(name, ms) {
      const t = T[name]; if (!t) return;
      if (desired && desired.name === name) desired = null;
      stopEl(t, ms != null ? ms : CFG[name].fadeOutMs);
    }
    // 첫 사용자 터치: 오디오 잠금 해제 (두 곡 모두) + 보류된 곡 시작
    function kick() {
      const c = ensureCtx(), sus = !!(c && c.state === "suspended");
      if (sus) c.resume().catch(() => {});
      Object.keys(CFG).forEach((name) => {
        if (!CFG[name] || !CFG[name].src) return;
        const t = make(name);
        if (t.unlocked || (desired && desired.name === name)) return;
        const p = t.el.play();                                     // 소리 0 으로 잠깐 재생했다 멈춰서 iOS 잠금을 풀어 둔다 (실제로 재생되면 완료 처리)
        if (p && typeof p.then === "function") p.then(() => { t.unlocked = true; if (!(desired && desired.name === name)) t.el.pause(); }).catch(() => {});
      });
      if (desired && !muted) {
        const t = make(desired.name);
        if (t.blocked || t.el.paused || sus) { setVol(t, 0); startEl(t, desired.fadeInMs, false); }   // (소리가 막혀 있던 동안 지나간 페이드를 다시 처음부터)
      }
    }
    function setMuted(m) {
      muted = !!m;
      if (muted) Object.values(T).forEach((t) => stopEl(t, 220));
      else if (desired) startEl(make(desired.name), 700, false);
    }
    // 탭이 가려지면 멈추고, 돌아오면 이어서 (모바일에서 백그라운드 재생 방지)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) Object.values(T).forEach((t) => { t.el.pause(); });
      else if (desired && !muted) startEl(make(desired.name), 600, false);
    });
    make("intro"); make("story");                                  // 미리 불러 두기
    const debug = () => ({ desired: desired && desired.name, muted, ctx: ac && ac.state, tracks: Object.values(T).map((t) => ({ name: t.name, paused: t.el.paused, vol: +t.v.toFixed(3), g: t.gain ? +t.gain.gain.value.toFixed(3) : null, time: +t.el.currentTime.toFixed(1), broken: t.broken })) });
    return { play, fadeOut, kick, setMuted, debug, ctx: () => ac, get muted() { return muted; } };
  })();

  // ---- 효과음: 짧은 소리를 겹쳐 재생 (WebAudio 버퍼, 파일로 직접 열었을 땐 <audio>). ♪ 음악 끄기 중에는 소리를 내지 않는다 ----
  const Sfx = (() => {
    const CFG = D.music.sfx || {};
    const bufs = {}, active = new Set();
    let loading = false;
    function load() {                                              // WebAudio 가 있으면 미리 불러와 디코딩해 둔다 (지연 없이 재생)
      const ac = Music.ctx();
      if (!ac || loading) return;
      loading = true;
      Object.keys(CFG).forEach((name) => {
        fetch(CFG[name].src).then((r) => r.arrayBuffer()).then((ab) => new Promise((ok, no) => ac.decodeAudioData(ab, ok, no))).then((b) => { bufs[name] = b; }).catch(() => {});
      });
    }
    function play(name, delayMs, opts) {
      const c = CFG[name];
      if (!c || Music.muted) return;
      if (opts && opts.onlyIfRunning) {                              // (e.g. the intro wind: skip instead of playing late when the browser has not unlocked audio yet)
        const a0 = Music.ctx();
        if (!a0 || a0.state !== "running" || !bufs[name]) return;
      }
      const wait = (delayMs != null ? delayMs : c.delayMs) || 0;
      if (wait > 0) { window.setTimeout(() => play(name, -1), wait); return; }
      const ac = Music.ctx();
      if (ac && bufs[name]) {
        if (ac.state === "suspended") ac.resume().catch(() => {});
        const src = ac.createBufferSource(), g = ac.createGain();
        src.buffer = bufs[name]; g.gain.value = c.volume != null ? c.volume : 1;
        src.connect(g); g.connect(ac.destination);
        const h = { stop() { try { g.gain.cancelScheduledValues(0); g.gain.setTargetAtTime(0, ac.currentTime, 0.02); src.stop(ac.currentTime + 0.1); } catch (e) {} } };
        active.add(h); src.onended = () => active.delete(h);
        src.start();
      } else if (!ac) {                                            // file:// 등: <audio> 로 대신 재생
        const a = new Audio(c.src); a.volume = c.volume != null ? c.volume : 1;
        const h = { stop() { try { a.pause(); } catch (e) {} } };
        active.add(h); a.addEventListener("ended", () => active.delete(h));
        const p = a.play(); if (p && p.catch) p.catch(() => active.delete(h));
      }
    }
    function stopAll() { active.forEach((h) => h.stop()); active.clear(); }
    load();
    return { play, stopAll };
  })();
  window.PartyGame.sfx = Sfx;

  // ==========================================================================
  // SCENE 1: 첫 화면 인트로 (intro.js — 봉투가 날아와 열리고 편지지가 올라옴) + 초대장 받기 버튼
  // ==========================================================================
  //
  // 편지지가 멈추면 intro.js 가 '초대장 받기' 버튼을 켜 주고, 누르면 음악을 켜고 너드 지나 1 로 넘어갑니다.

  const btnInvite = document.getElementById("btnInvite");

  // 처음부터 다시 재생 (첫 로드, "다시하기", 처음부터 되돌리기)
  function resetEnvelopeScene() { window.IntroScene.play(); Music.play("intro", { restart: true }); }
  // "뒤로 가기" 로 돌아왔을 때: 다시 재생하지 않고 편지지가 나온 마지막 장면 + 버튼
  function showIntroEnd() { window.IntroScene.showEnd(); Music.play("intro", { restart: true }); }

  // 초대장 받기 → 흰색 소프트 페이드 → 너드 지나 1.  페이드가 차오르는 동안 첫 장면 이미지(+흔들림용 두 번째 장)를 미리 디코딩해서,
  // 장면이 바뀌는 순간 그림 해석 때문에 끊기지 않게 한다.
  let introLeaving = false;
  btnInvite.addEventListener("click", () => {
    if (introLeaving) return;
    introLeaving = true;
    startMusic();
    Sfx.play("click");                                // 초대장 받기 버튼음
    // 첫 곡은 페이드아웃, 두 번째 곡은 같은 순간부터 페이드인(크로스페이드) → 화면이 하얗게 넘어가는 동안 소리가 끊기지 않는다
    Music.play("story", { restart: true, outMs: D.music.crossFadeMs });
    btnInvite.classList.remove("pulse");
    prewarmStoryStart();
    const SOFT = D.softTransition;
    transitionTo("story", () => {
      introLeaving = false;
      startStory({ instant: true, textDelayMs: SOFT.textDelayMs });
    }, SOFT);
  });

  // 첫 화면: 봉투가 날아오기 시작할 때 바람 소리 (오디오가 아직 잠겨 있으면 늦게 틀지 않고 건너뜀 — 아이폰은 화면을 한 번 터치해야 소리가 열려요)
  window.IntroScene.onStart = () => Sfx.play("wind", 0, { onlyIfRunning: true });
  window.IntroScene.onLetter = () => Sfx.play("wind", 0, { onlyIfRunning: true });   // 봉투 뚜껑이 열리고 편지지가 올라올 때 한 번 더
  resetEnvelopeScene();

  // ==========================================================================
  // SCENE: 지나 스토리 (photo scene — nerd route → blossom route, stacked composite images)
  // ==========================================================================
  //
  // Everything is driven by D.story.steps (data.js). A step is one screen:
  //
  //   dialogue : frames (1 image, or 2 that sway until tapped), typed text, blinking ▶, tap → next
  //   choice   : two item cards; hovering / pressing shows the pressed look, click picks it
  //   wrong    : sway + 빠직 marks until the player taps / presses a card
  //   gloss    : text typed while the hair-shine travels down the hair, then auto → next
  //   result   : (sunset route only, until its images arrive) pressed image + toast
  //
  // The speech-box text is NOT part of the shipped images: the images are text-free,
  // and the text lives in assets/text/text-<id>.png with a glyph map
  // (assets/text/dialogue-map.js) so it can be typed one letter at a time on a
  // <canvas>. Petals / 빠직 marks / card "pressed" looks are separate sprites
  // (assets/fx, positions in assets/fx/fx-map.js). Offline tools in /tools make them.
  //
  // The three top-left icons are baked into every image; invisible hotspots
  // sit on them: 1 뒤로가기 / 2 음악 끄기·켜기 / 3 되돌리기(인트로부터 다시).

  const sceneStory = document.getElementById("scene-story");
  const storyTap = document.getElementById("storyTap");
  const cardBtns = { L: document.getElementById("cardL"), R: document.getElementById("cardR") };
  const typeCanvas = document.getElementById("typeCanvas");
  const typeCtx = typeCanvas.getContext("2d");
  const arrowMark = document.getElementById("arrowMark");
  const mutePatch = document.getElementById("mutePatch");
  const storyFx = document.getElementById("storyFx");
  const glossLayer = document.getElementById("glossLayer");
  const glossCanvas = document.getElementById("glossCanvas");
  const glossCtx = glossCanvas.getContext("2d");
  const glossTmp = document.createElement("canvas");
  glossTmp.width = glossCanvas.width; glossTmp.height = glossCanvas.height;
  const glossTmpCtx = glossTmp.getContext("2d");
  const glossImgs = { soft: new Image(), glint: new Image() };
  glossImgs.soft.src = (window.FX_MAP && window.FX_MAP.hairMask) || "assets/fx/hair-mask.png";
  glossImgs.glint.src = (window.FX_MAP && window.FX_MAP.hairGlint) || "assets/fx/hair-glint.png";
  // 선셋 허니 루트: 자기 머리 모양 마스크
  const glossImgsSun = { soft: new Image(), glint: new Image() };
  glossImgsSun.soft.src = (window.FX_MAP_SUN && window.FX_MAP_SUN.hairMask) || "assets/fx/sn-hair-mask.png";
  glossImgsSun.glint.src = (window.FX_MAP_SUN && window.FX_MAP_SUN.hairGlint) || "assets/fx/sn-hair-glint.png";
  const ST = D.story;
  const TY = ST.typing;
  const STEPS = ST.steps;
  const MAP = window.DIALOGUE_MAP || { text: {}, arrows: {} };
  const FX = window.FX_MAP || { petals: [], marks: {}, cards: {} };
  const FX_SUN = window.FX_MAP_SUN || { petals: [], marks: {}, cards: {} };
  // petals / marks / card patches / hair mask are cut from the pictures of each route
  const SUN_ROUTES = new Set(["sunset", "sparty", "shall"]);
  const fxFor = (route) => (SUN_ROUTES.has(route) ? FX_SUN : FX);

  sceneStory.style.setProperty("--story-fade", `${ST.fadeMs}ms`);
  sceneStory.style.setProperty("--hover-fade", `${ST.hoverFadeMs}ms`);

  const story = {
    phase: null, route: null, ready: false, locked: false, timers: [], fadeToken: 0, swayTimer: 0,
    hover: null, textGid: null, stack: [], petals: [], marks: [], patchTimer: 0,
  };

  // ---- the stack of composite images (created here so the HTML stays small) ----
  const imgByKey = {};
  const imgSrc = (key) => `assets/scenes/${key}.webp?v=45`;
  ST.images.forEach((key) => {
    const im = document.createElement("img");
    im.className = "scene-bg story-img";
    im.alt = ""; im.draggable = false; im.decoding = "async";
    im.dataset.key = key; im.dataset.naturalW = "402"; im.dataset.naturalH = "874";   // (= the 402x874 frame; wide pictures extend beyond it)
    if (WIDE && WIDE.keys.indexOf(key) >= 0) im.dataset.wide = "1";
    sceneStory.insertBefore(im, glossLayer);
    imgByKey[key] = im;
    if (key.startsWith("nerd")) im.src = imgSrc(key);       // blossom images are fetched a bit later (warmRoute)
  });
  const warmed = {};
  function warmRoute(route) {
    if (warmed[route]) return;
    warmed[route] = true;
    ST.images.filter((k) => ST.routes[route].prefix && k.startsWith(ST.routes[route].prefix + "-")).forEach((k) => {
      if (!imgByKey[k].src) imgByKey[k].src = imgSrc(k);
    });
  }
  warmed.nerd = true;
  // After the page has settled, fetch both routes' pictures in the background (instead of waiting for the choice screen),
  // so no screen has to be downloaded while the player is tapping through.
  function warmAllRoutes() { ["blossom", "sunset", "sparty"].forEach((r, i) => window.setTimeout(() => warmRoute(r), i * 1500)); }
  (function () {
    const go = () => window.setTimeout(warmAllRoutes, 2500);
    if (document.readyState === "complete") go(); else window.addEventListener("load", go, { once: true });
  })();

  // ---- preload the text / arrow / fx layers ----
  const layerImgs = {};
  function layerImg(path) {
    if (!layerImgs[path]) { const im = new Image(); im.src = path; layerImgs[path] = im; }
    return layerImgs[path];
  }
  Object.values(MAP.text).forEach((t) => layerImg(t.png));
  Object.values(MAP.arrows).forEach((a) => layerImg(a.png));

  // fx sprites live in one layer that exactly covers the picture, so they use % of the picture
  function fxSprite(src, rect, cls, parent) {
    const el = document.createElement("img");
    el.className = `fx-sprite ${cls}`;
    el.src = src; el.alt = ""; el.draggable = false;
    el.style.left = `${rect.x * 100}%`; el.style.top = `${rect.y * 100}%`;
    el.style.width = `${rect.w * 100}%`; el.style.height = `${rect.h * 100}%`;
    (parent || storyFx).appendChild(el);
    return el;
  }
  const patchSets = { A: {}, B: {}, S: {}, S2: {} };
  [["A", FX.cards], ["B", FX.cards2], ["S", FX_SUN.cards], ["S2", FX_SUN.cards2]].forEach(([set, cards]) => {
    ["L", "R"].forEach((s) => { if (cards && cards[s]) patchSets[set][s] = fxSprite(cards[s].src, cards[s].rect, "card-patch"); });
  });
  story.cardSet = "A";
  Object.values(ST.pouchCards || {}).forEach((p) => { layerImg(p.src); layerImg(p.char); });
  [FX, FX_SUN].forEach((F) => {
    (F.petals || []).forEach((p) => layerImg(p.src));
    Object.values(F.marks || {}).forEach((m) => layerImg(m.src));
  });

  function clearStoryTimers() {
    story.timers.forEach((t) => window.clearTimeout(t));
    story.timers = [];
  }
  function storyLater(fn, ms) { story.timers.push(window.setTimeout(fn, ms)); }

  // Show image `key`. Fade = new image fades in ON TOP of the old one, so the
  // background never dips through while both are semi-transparent.
  // Decode the pictures that can come next while the player is reading (large pictures otherwise decode on first paint → hitch).
  const decodedKeys = new Set();
  function predecodeNext(cfg) {
    window.setTimeout(() => {
      const keys = [];
      const addStep = (sid) => {
        const st = sid && STEPS[sid];
        if (st && st.frames) { keys.push(st.frames[0]); if (st.from) keys.push(st.from); }
      };
      if (cfg.next) addStep(cfg.next);
      if (cfg.cards) ["L", "R"].forEach((side) => {
        const c = cfg.cards[side];
        if (!c) return;
        if (c.hoverImg) keys.push(c.hoverImg);
        if (c.go) addStep(c.go.startsWith("@") ? (ST.routeStart || {})[c.go] : c.go);
      });
      keys.forEach((k) => {
        const im = imgByKey[k];
        if (!k || decodedKeys.has(k) || !im || !im.src || !im.decode) return;
        decodedKeys.add(k);
        im.decode().catch(() => decodedKeys.delete(k));
      });
      // the next screen is a sparkle: also push its pictures through a tiny canvas once so the first effect frame doesn't stall on upload
      const nxt = [cfg.next, ...(cfg.cards ? ["L", "R"].map((sd) => cfg.cards[sd] && cfg.cards[sd].go) : [])].map((sid) => sid && STEPS[sid]).filter((st) => st && st.spiral);
      nxt.forEach((st) => {
        const L = spLight(st.char);
        const warm = () => {
          try {
            const wc = SP.warmCv || (SP.warmCv = document.createElement("canvas")); wc.width = wc.height = 4;
            const wx = wc.getContext("2d");
            [L, imgByKey[st.frames[0]], st.from && imgByKey[st.from]].forEach((im) => { if (im && im.complete && im.naturalWidth) wx.drawImage(im, 0, 0, 4, 4); });
          } catch (e) {}
        };
        (L.decode ? L.decode() : Promise.resolve()).then(() => window.setTimeout(warm, 300)).catch(() => {});
      });
    }, 500);
  }

  function storyShow(key, { fade = true, ms = ST.fadeMs } = {}) {
    const target = imgByKey[key];
    if (!target) return;
    const imgs = Object.values(imgByKey);
    const token = ++story.fadeToken;
    imgs.forEach((i) => { if (i !== target) i.classList.remove("incoming", "fading"); });
    const cur = imgs.find((i) => i.classList.contains("cur"));
    if (cur === target) { target.classList.remove("incoming", "fading"); return; }
    if (!fade || !cur) {
      imgs.forEach((i) => i.classList.remove("cur", "incoming", "fading"));
      target.classList.add("cur");
      refillSides();
      return;
    }
    sceneStory.style.setProperty("--story-fade", `${ms}ms`);
    target.classList.add("incoming");
    void target.offsetWidth;           // commit opacity:0 before animating
    target.classList.add("fading");
    window.setTimeout(() => {
      if (token !== story.fadeToken) return;
      imgs.forEach((i) => i.classList.remove("cur", "incoming", "fading"));
      target.classList.add("cur");
    }, ms + 30);
  }

  // The mirrored wallpaper on wide screens is taken from one fixed picture per route
  function setRoute(route) {
    if (story.route === route) return;
    story.route = route;
    setPcTheme(SUN_ROUTES.has(route));            // PC 배경: 선셋 루트는 금색 새틴
    warmRoute(route);
    const R = ST.routes[route];
    sceneStory._fillImg = imgByKey[R.fill];
    if (window.LetterScene && (route === "hall" || route === "shall")) window.LetterScene.preload(route === "shall" ? "sunset" : "blossom");   // the letter screen comes after 24
    mutePatch.src = R.mute;
    rectOverride = R.rects || null;
    wideRoute = !!R.wide;
    layoutPhotoScene(sceneStory);
  }
  function refillSides() { layoutPhotoScene(sceneStory); }

  function setStoryActive({ tap = false, cards = null }) {
    storyTap.classList.toggle("active", tap);
    cardBtns.L.classList.toggle("active", !!(cards && cards.L));
    cardBtns.R.classList.toggle("active", !!(cards && cards.R));
    if (tap || cards) layoutPhotoScene(sceneStory);
  }

  // ==========================================================================
  // TYPEWRITER (speech-box text, one letter at a time)
  // ==========================================================================

  const typer = { gid: null, raf: 0, events: [], total: 0, start: 0, done: true, onDone: null, hideTimer: 0 };

  function buildTimeline(map) {
    const ev = [];
    let t = 0;
    map.lines.forEach((line, li) => {
      const chars = Array.from(line.text.replace(/\s/g, ""));
      line.glyphs.forEach((g, gi) => {
        ev.push({ t, li, gi });
        const punct = /[.,!?~]/.test(chars[gi] || "");
        t += (typer.glyph || TY.glyphMs) * (punct ? 1.9 : 1) + (g.space ? TY.spaceMs : 0);
      });
      t += TY.lineGapMs;
    });
    return { ev, total: t };
  }

  function typerDraw(now) {
    const map = MAP.text[typer.gid];
    if (!map) return;
    typeCtx.clearRect(0, 0, typeCanvas.width, typeCanvas.height);
    const img = layerImg(map.png);
    for (const e of typer.events) {
      if (e.t > now) break;
      const line = map.lines[e.li], g = line.glyphs[e.gi];
      const a = Math.min(1, (now - e.t) / (typer.fade || TY.fadeInMs));
      const w = g.x1 - g.x0, h = line.y1 - line.y0;
      typeCtx.globalAlpha = a;
      typeCtx.drawImage(img, g.x0, line.y0, w, h, g.x0, line.y0, w, h);
    }
    typeCtx.globalAlpha = 1;
  }

  function typerFinish() {
    window.cancelAnimationFrame(typer.raf);
    typer.raf = 0;
    typerDraw(1e9);
    typer.done = true;
    const cb = typer.onDone; typer.onDone = null;
    if (cb) cb();
  }

  function typerCancel() {
    window.cancelAnimationFrame(typer.raf);
    typer.raf = 0;
    window.clearTimeout(typer.hideTimer);
    typer.onDone = null;
  }

  // Put text group `gid` on screen. instant = no typing (already read / coming back).
  function typerShow(gid, { instant = false, onDone = null, fadeInMs = 0, glyphMs = 0 } = {}) {
    const map = MAP.text[gid];
    typerCancel();
    if (!map) { typer.done = true; if (onDone) onDone(); return; }
    // same text still on screen → keep it (no retyping)
    if (story.textGid === gid && typer.gid === gid && typer.done) { if (onDone) onDone(); return; }
    typer.gid = gid;
    typer.fade = fadeInMs || 0;
    typer.glyph = glyphMs || 0;
    story.textGid = gid;
    typeCanvas.width = map.w;
    typeCanvas.height = map.h;
    HOTSPOT_RECTS.typeText = map.rect;
    typeCanvas.classList.remove("fade-out");
    layoutPhotoScene(sceneStory);
    const built = buildTimeline(map);
    typer.events = built.ev;
    typer.total = built.total;
    typer.onDone = onDone;
    typer.done = false;
    if (instant) { typerFinish(); return; }
    typeCtx.clearRect(0, 0, typeCanvas.width, typeCanvas.height);
    typer.start = performance.now() + TY.startDelayMs;
    const tick = () => {
      const now = performance.now() - typer.start;
      typerDraw(Math.max(0, now));
      if (now >= typer.total + (typer.fade || TY.fadeInMs)) { typerFinish(); return; }
      typer.raf = window.requestAnimationFrame(tick);
    };
    typer.raf = window.requestAnimationFrame(tick);
  }

  // Remove the text (fades out, then clears).
  function typerHide({ instant = false } = {}) {
    typerCancel();
    typer.done = true;
    story.textGid = null;
    typer.gid = null;
    if (instant) {
      typeCanvas.classList.remove("fade-out");
      typeCtx.clearRect(0, 0, typeCanvas.width, typeCanvas.height);
      return;
    }
    typeCanvas.classList.add("fade-out");
    typer.hideTimer = window.setTimeout(() => {
      if (!typer.gid) typeCtx.clearRect(0, 0, typeCanvas.width, typeCanvas.height);
    }, 260);
  }

  function showArrow(id) {
    const a = MAP.arrows[id];
    if (!a) return;
    if (!arrowMark.src.endsWith(a.png)) arrowMark.src = a.png;
    HOTSPOT_RECTS.typeArrow = a.rect;
    layoutPhotoScene(sceneStory);
    arrowMark.classList.add("show");
  }
  function hideArrow() { arrowMark.classList.remove("show"); }

  // ==========================================================================
  // SWAY (two poses alternate until the player taps)
  // ==========================================================================

  function stopSway() {
    window.clearInterval(story.swayTimer);
    story.swayTimer = 0;
  }
  function startSway(frames) {
    stopSway();
    let i = 0;
    story.swayTimer = window.setInterval(() => {
      i = (i + 1) % frames.length;
      storyShow(frames[i], { ms: ST.sway.fadeMs });
    }, ST.sway.holdMs);
  }

  // ==========================================================================
  // FX: petals around Jina (blossom 1), 빠직 marks (wrong answer), pressed-card patches, hair gloss
  // ==========================================================================

  const rnd = (a, b) => a + Math.random() * (b - a);

  // petals / roses: drift a little (each its own way), then vanish — after ~1.5–2.3 s
  function clearPetals(soft) {
    // soft: leaving early → the petals just finish their flight 4x faster (they fade at the end)
    story.petals.forEach((a) => { try { if (soft && a.playState === "running") a.playbackRate = 4; else a.cancel(); } catch (e) {} });
    story.petals = [];
    if (!soft) storyFx.querySelectorAll(".petal").forEach((el) => el.remove());
  }
  function spawnPetals() {
    clearPetals();
    const L = layoutPhotoScene(sceneStory);
    if (!L) return;
    const P = ST.petals, W = L.renderW, H = L.renderH;
    fxFor(story.route).petals.forEach((p) => {
      const rose = p.kind === "rose";
      const el = fxSprite(p.src, p.rect, rose ? "petal rose" : "petal");
      const side = p.cx < 0.5 ? -1 : 1;
      let dur = P.commonMs || rnd(P.driftMinMs, P.driftMaxMs);          // all pieces (roses included) end together, none lingers alone
      const delay = 0;                                  // no standing still: every petal is moving from the first frame
      let dx = rose ? side * rnd(0.004, 0.012) * W : (side * rnd(0.008, 0.04) + rnd(-0.015, 0.015)) * W;
      let dy = rose ? rnd(0.004, 0.014) * H : rnd(0.02, 0.055) * H;
      let rot = rose ? rnd(-8, 8) : rnd(-38, 38);
      let sw = rnd(-0.012, 0.012) * W;
      let s1 = rose ? 1.04 : 1, s2 = rose ? 1.07 : 0.98, s3 = rose ? 1.02 : 0.94;
      const M = p.motion;
      if (M) { dur = M.dur; dx = M.dx * W; dy = M.dy * H; rot = M.rot; sw = M.sw * W; [s1, s2, s3] = M.s; }   // precomputed collision-free path (sunset): pieces never cross each other
      const kf = [
        { transform: "translate(0px,0px) rotate(0deg) scale(1)", opacity: 1, offset: 0 },
        { transform: `translate(${dx * 0.35 + sw}px,${dy * 0.3}px) rotate(${rot * 0.4}deg) scale(${s1})`, opacity: 1, offset: 0.3 },
        { transform: `translate(${dx * 0.7 - sw * 0.7}px,${dy * 0.68}px) rotate(${rot * 0.8}deg) scale(${s2})`, opacity: 1, offset: 0.66 },
        { transform: `translate(${dx}px,${dy}px) rotate(${rot}deg) scale(${s3})`, opacity: 0, offset: 1 },
      ];
      const anim = el.animate(kf, { duration: dur, delay, easing: "cubic-bezier(0.22, 0.45, 0.5, 1)", fill: "both" });
      anim.onfinish = () => el.remove();
      story.petals.push(anim);
    });
  }

  // 빠직 marks: pop in with a bounce, then keep throbbing (and wobbling between the two
  // positions of the original two frames) until the player moves on
  function stopMarks(soft) {
    const els = Array.from(storyFx.querySelectorAll(".mark"));
    if (soft && els.length) {
      const olds = story.marks;                       // keep throbbing while fading out
      els.forEach((el) => el.classList.add("leaving"));
      window.setTimeout(() => { olds.forEach((a) => { try { a.cancel(); } catch (e) {} }); els.forEach((el) => el.remove()); }, 260);
    } else {
      story.marks.forEach((a) => { try { a.cancel(); } catch (e) {} });
      els.forEach((el) => el.remove());
    }
    story.marks = [];
  }
  function startMarks({ pop = true } = {}) {
    stopMarks();
    const L = layoutPhotoScene(sceneStory);
    if (!L) return;
    const M = ST.marks;
    ["big", "small"].forEach((name, i) => {
      const m = fxFor(story.route).marks[name];
      if (!m) return;
      const el = fxSprite(m.src, m.rect, `mark mark-${name}`);
      const dx = m.to5.dx * L.renderW, dy = m.to5.dy * L.renderH;
      const loop = () => {
        const a = el.animate([
          { transform: "translate(0px,0px) scale(1) rotate(0deg)", offset: 0 },
          { transform: `translate(${dx * 0.5}px,${dy * 0.5}px) scale(1.13) rotate(4deg)`, offset: 0.25 },
          { transform: `translate(${dx}px,${dy}px) scale(1) rotate(-1deg)`, offset: 0.5 },
          { transform: `translate(${dx * 0.5}px,${dy * 0.5}px) scale(1.13) rotate(-4deg)`, offset: 0.75 },
          { transform: "translate(0px,0px) scale(1) rotate(0deg)", offset: 1 },
        ], { duration: M.loopMs, iterations: Infinity, easing: "ease-in-out" });
        story.marks.push(a);
      };
      if (!pop) { loop(); return; }
      const popAnim = el.animate([
        { transform: "scale(0.1) rotate(-30deg)", opacity: 0, offset: 0 },
        { transform: "scale(1.4) rotate(8deg)", opacity: 1, offset: 0.55 },
        { transform: "scale(0.9) rotate(-3deg)", opacity: 1, offset: 0.8 },
        { transform: "scale(1) rotate(0deg)", opacity: 1, offset: 1 },
      ], { duration: M.popMs, delay: i * M.staggerMs, easing: "cubic-bezier(.2,.8,.3,1)", fill: "both" });
      popAnim.onfinish = () => { popAnim.cancel(); loop(); };
      story.marks.push(popAnim);
    });
  }

  // 블썸 17: 카드 사진이 앞에서 날아와 지나 '뒤'로 붙는다. (카드 → 지나 누끼 순서로 두 장을 얹고, 지나 쪽이 모션 끝에서 카드 앞으로 올라옴)
  story.pcard = [];
  function stopPouchCard(soft) {
    const els = Array.from(storyFx.querySelectorAll(".pcard-wrap"));
    const anims = story.pcard; story.pcard = [];
    if (soft && els.length) {
      els.forEach((el) => el.classList.add("leaving"));
      window.setTimeout(() => { anims.forEach((a) => { try { a.cancel(); } catch (e) {} }); els.forEach((el) => el.remove()); }, 260);
    } else {
      anims.forEach((a) => { try { a.cancel(); } catch (e) {} });
      els.forEach((el) => el.remove());
    }
  }
  // 카드·그림자·지나 누끼를 미리 만들어(투명) 그림을 해독해 둔다 → 날아오는 순간에 처음 그리느라 뚝 끊기지 않게
  //   전체를 자막 상자 윗선(clipTop)에서 자르는 상자 하나(overflow:hidden — clip-path 보다 가볍다)에 담는다. 좌우는 PC 의 넓은 화면을 위해 SIDE 만큼 여유를 둔다.
  const PC_SIDE = 0.25;
  function buildPouchCard(key, settled) {
    stopPouchCard();
    const P = ST.pouchCard && ST.pouchCards && ST.pouchCards[key] ? { ...ST.pouchCard, ...ST.pouchCards[key] } : null;
    if (!P) return null;
    const wrap = document.createElement("div");
    wrap.className = "pcard-wrap";
    wrap.style.left = `${-PC_SIDE * 100}%`; wrap.style.width = `${(1 + 2 * PC_SIDE) * 100}%`;
    wrap.style.top = "0"; wrap.style.height = `${P.clipTop * 100}%`;
    storyFx.appendChild(wrap);
    const place = (el, r) => {
      el.style.left = `${((r.x + PC_SIDE) / (1 + 2 * PC_SIDE)) * 100}%`; el.style.top = `${(r.y / P.clipTop) * 100}%`;
      el.style.width = `${(r.w / (1 + 2 * PC_SIDE)) * 100}%`; el.style.height = `${(r.h / P.clipTop) * 100}%`;
    };
    const img = (src, r, cls) => { const el = document.createElement("img"); el.className = `fx-sprite pcard ${cls}`; el.src = src; el.alt = ""; el.draggable = false; place(el, r); wrap.appendChild(el); return el; };
    // 그림자: 카드 아래에 깔리는 부드러운 어두운 얼룩 (filter 없이 그라데이션 — transform/opacity 만 움직인다)
    let shadow = null;
    if (!settled) { shadow = document.createElement("div"); shadow.className = "pcard pcard-shadow"; place(shadow, P.rect); shadow.style.opacity = "0"; wrap.appendChild(shadow); }
    const card = img(P.src, P.rect, "pcard-card");
    const girl = img(P.char, P.charRect, "pcard-girl");
    if (!settled) { card.style.opacity = "0"; girl.style.opacity = "0"; }
    const ready = settled ? Promise.resolve() : Promise.all([card, girl].map((el) => (el.decode ? el.decode().catch(() => {}) : Promise.resolve())));
    return { key, P, wrap, card, shadow, girl, ready };
  }
  function startPouchCard({ settled = false, key = null } = {}) {
    let o = story.pcPrep && story.pcPrep.key === key && story.pcPrep.wrap.isConnected ? story.pcPrep : null;
    story.pcPrep = null;
    if (!o) o = buildPouchCard(key, settled);
    if (!o) return;
    if (settled) return;                                        // 되돌아왔을 때: 이미 붙어 있는 모습 그대로
    const { P, card, shadow, girl } = o;
    const run = () => {
    const cx = P.rect.x + P.rect.w / 2, cy = P.rect.y + P.rect.h / 2;
    const dx = ((P.startX - cx) / P.rect.w) * 100, dy = ((P.startY - cy) / P.rect.h) * 100;     // % of the card's own size
    const sk = P.sinkAt, Z = P.sinkScale;
    const ease = "cubic-bezier(.22,.75,.3,1)";
    // 그림자는 카드 아래에 깔아 둔 어두운 복사본(고정 블러) — 모션 중에 filter 값을 바꾸지 않고 transform/opacity 만 움직여서 휴대폰에서도 끊기지 않게
    const T = (x, y, sc, r) => `translate(${x}%,${y}%) scale(${sc}) rotate(${r}deg)`;
    const k = [
      { x: dx, y: dy, sc: P.startScale, r: P.startRot, o: 0, so: 0, off: 0 },
      { x: dx * 0.93, y: dy * 0.93, sc: P.startScale * 1.03, r: P.startRot * 0.9, o: 1, so: 0.34, off: 0.1 },
      { x: -1.5, y: -1, sc: Z, r: -3, o: 1, so: 0.1, off: sk },
      { x: 0.4, y: 0.3, sc: 1.035, r: 0.8, o: 1, so: 0.05, off: sk + (1 - sk) * 0.5 },
      { x: 0, y: 0, sc: 1, r: 0, o: 1, so: 0, off: 1 },
    ];
    const frames = (shadowPass) => k.map((f, i) => ({
      transform: shadowPass ? T(f.x + 1, f.y + 2 + f.so * 30, f.sc, f.r) : T(f.x, f.y, f.sc, f.r),
      opacity: shadowPass ? f.so * f.o : f.o,
      offset: f.off, easing: i === 0 ? "ease-out" : i === 1 ? ease : i === 2 ? "ease-in-out" : "ease-out",
    }));
    const a1 = card.animate(frames(false), { duration: P.durMs, fill: "both" });
    const a3 = shadow ? shadow.animate(frames(true), { duration: P.durMs, fill: "both" }) : null;
    const a2 = girl.animate([
      { opacity: 0, offset: 0 }, { opacity: 0, offset: P.frontOffAt }, { opacity: 1, offset: P.frontOnAt }, { opacity: 1, offset: 1 },
    ], { duration: P.durMs, fill: "both" });
    story.pcard.push(a1, a2); if (a3) story.pcard.push(a3);
    if (P.sfx) Sfx.play(P.sfx, P.sfxDelayMs || 0);
    };
    o.ready.then(() => { if (o.wrap.isConnected) run(); });
  }

  // "pressed" look of a card as a patch over the picture (hover / press / locked-in)
  function showPatch(side) { const el = patchSets[story.cardSet][side]; if (el) el.classList.add("on"); }
  function hidePatch(side) { Object.values(patchSets).forEach((set) => { if (set[side]) set[side].classList.remove("on"); }); }
  function hidePatches() { ["L", "R"].forEach(hidePatch); }

  // hair gloss: a soft bright band travels top → bottom along the hair (drawn only through the
  // hair-shaped mask, stronger on the light strands), `passes` times
  const gloss = { raf: 0, token: 0 };
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  // one band (skewed a little), clipped to the hair shape of `img`, drawn into the main canvas
  function glossBand(img, f, hFrac, stops, alpha) {
    if (!img.complete || !img.naturalWidth || alpha <= 0.002) return;
    const W = glossCanvas.width, H = glossCanvas.height, bh = hFrac * H;
    const t = glossTmpCtx;
    t.globalCompositeOperation = "source-over";
    t.clearRect(0, 0, W, H);
    t.save();
    t.translate(W / 2, (f / 100) * H);
    t.transform(1, Math.tan((-5 * Math.PI) / 180), 0, 1, 0, 0);
    const g = t.createLinearGradient(0, -bh / 2, 0, bh / 2);
    stops.forEach(([p, c]) => g.addColorStop(p, c));
    t.fillStyle = g;
    t.fillRect(-W * 0.6, -bh / 2, W * 1.2, bh);
    t.restore();
    t.globalCompositeOperation = "destination-in";
    t.drawImage(img, 0, 0, W, H);
    glossCtx.globalAlpha = alpha;
    glossCtx.drawImage(glossTmp, 0, 0);
    glossCtx.globalAlpha = 1;
  }
  const SOFT_STOPS = [[0, "rgba(255,238,208,0)"], [0.2, "rgba(255,240,212,.22)"], [0.4, "rgba(255,246,228,.62)"], [0.5, "rgba(255,252,240,.95)"], [0.6, "rgba(255,246,228,.62)"], [0.8, "rgba(255,240,212,.22)"], [1, "rgba(255,238,208,0)"]];
  const GLINT_STOPS = [[0, "rgba(255,255,255,0)"], [0.38, "rgba(255,255,255,.55)"], [0.5, "#fff"], [0.62, "rgba(255,255,255,.55)"], [1, "rgba(255,255,255,0)"]];
  function glossFront(f, op) {
    glossCtx.clearRect(0, 0, glossCanvas.width, glossCanvas.height);
    const gi = story.route === "sunset" ? glossImgsSun : glossImgs;
    glossBand(gi.soft, f, 0.30, SOFT_STOPS, op);
    glossBand(gi.glint, f, 0.22, GLINT_STOPS, op);
  }
  function glossStop() {
    gloss.token++;
    window.cancelAnimationFrame(gloss.raf);
    glossLayer.classList.remove("on");
  }
  function glossRun(onEnd) {
    glossStop();
    const G = ST.gloss, my = gloss.token;
    glossLayer.classList.add("on");
    layoutPhotoScene(sceneStory);
    glossFront(G.from, 0);
    Sfx.play("glow");                                        // 머리 반짝임이 흐르기 시작할 때
    const t0 = performance.now() + G.startDelayMs;
    const cycle = G.sweepMs + G.gapMs;
    const total = G.passes * cycle - G.gapMs;
    const tick = (now) => {
      if (my !== gloss.token) return;
      const el = now - t0;
      if (el < 0) { gloss.raf = window.requestAnimationFrame(tick); return; }
      if (el >= total) {
        glossLayer.classList.remove("on");
        glossFront(G.from, 0);
        if (onEnd) onEnd();
        return;
      }
      const inPass = el % cycle;
      if (inPass > G.sweepMs) { glossFront(G.to, 0); }
      else {
        const t = inPass / G.sweepMs;
        const f = G.from + (G.to - G.from) * easeInOut(t);
        const o = Math.min(1, t / 0.14, (1 - t) / 0.2) * G.strength;
        glossFront(f, Math.max(0, o));
      }
      gloss.raf = window.requestAnimationFrame(tick);
    };
    gloss.raf = window.requestAnimationFrame(tick);
  }

  // ==========================================================================
  // 블썸 11: 변신 반짝임 ("지나 뒤 변신 효과" behind-transform test v7)
  //   a spiral of light blooms behind Jina, ONE bright stream runs up and swings to the front, then it melts away;
  //   the picture ends exactly as the clean screen. Everything is drawn on a canvas that covers the picture.
  // ==========================================================================
  const xfLayer = document.getElementById("xfLayer");
  const xfCanvas = document.getElementById("xfCanvas");
  const xfCtx = xfCanvas.getContext("2d");
  const XF = { raf: 0, token: 0, built: null, light: new Image(), charImg: new Image(), chars: {} };
  XF.light.src = ST.transform.light;
  XF.charImg.src = ST.transform.char;
  XF.chars[ST.transform.char] = XF.charImg;
  // other silhouette masks (e.g. the pouch pose of 블썸 18) are loaded on demand
  function xfCharFor(src) {
    src = src || ST.transform.char;
    if (!XF.chars[src]) { const im = new Image(); im.src = src; XF.chars[src] = im; }
    return XF.chars[src];
  }
  const XF_TINTS = { rose: "rgba(255,214,236,0.28)", gold: "rgba(255,226,150,0.30)" };   // faint tint so the white light blends with the room
  const XW = 804, XH = 1748, XS = 2;
  const XC = {
    scaleX: 0.56, scaleY: 0.69, mapY0: -25, assetY0: 100,
    anchor: { ax: 531, ay: 860, sx: 201, sy: 335 }, spiralY0: 60, spiralY1: 1030,
    startDelay: 200, bloomMs: 500, stream: [200, 1400], fade: [1350, 2150],
  };
  const xfClamp = (x) => Math.max(0, Math.min(1, x));
  const xfSmooth = (x) => { x = xfClamp(x); return x * x * (3 - 2 * x); };
  const xfCanvasOf = (w) => { const c = document.createElement("canvas"); c.width = w || XW; c.height = XH; return c; };

  // The classic sparkle (the one of 선셋 18→19) works on both picture kinds:
  //   narrow (804 px = the 402x874 frame, xfCanvas)   or   wide (1040 px = the 520x874 canvas, spCanvas); `sp` = what is different for the wide one
  function xfSpecFor(baseImg, cfg) {
    const wide = !!(baseImg && baseImg.dataset && baseImg.dataset.wide && WIDE);
    if (!wide) return { wide: false, cw: XW, ox: 0, layer: xfLayer, canvas: xfCanvas, ctx: xfCtx, cx: null, hud: null };
    const cw = WIDE.canvasW * XS;
    return { wide: true, cw, ox: WIDE.frameX * XS, layer: spLayer, canvas: spCanvas, ctx: spCtx, cx: cfg && cfg.spiral ? cfg.spiral.cx * cw : null, hud: ST.sparkle.hud, hudR: ST.sparkle.hudR };
  }

  function xfBuild(base, charImg, tint, sp) {
    const light = XF.light, CW = sp.cw;
    const L = { sp };
    L.base = base;
    L.tinted = document.createElement("canvas"); L.tinted.width = light.naturalWidth; L.tinted.height = light.naturalHeight;
    let g = L.tinted.getContext("2d");
    g.drawImage(light, 0, 0);
    g.globalCompositeOperation = "source-atop";             // faint tint so the white light blends with the room
    g.fillStyle = XF_TINTS[tint] || XF_TINTS.rose; g.fillRect(0, 0, L.tinted.width, L.tinted.height);

    L.charLayer = xfCanvasOf(CW);
    let c = L.charLayer.getContext("2d");
    c.imageSmoothingQuality = "high";
    c.drawImage(base, 0, 0, CW, XH);
    c.globalCompositeOperation = "destination-in";
    c.drawImage(charImg, 0, 0, CW, XH);

    // the three top-left buttons stay crisp above the light
    L.btnLayer = xfCanvasOf(CW);
    const bl = L.btnLayer.getContext("2d");
    bl.drawImage(base, 0, 0, CW, XH);
    const m2 = xfCanvasOf(CW), mc = m2.getContext("2d");
    const BTNS = sp.wide ? sp.hud.map(([x, y]) => [x * CW, y * XH, sp.hudR[0] * CW, sp.hudR[1] * CW]) : [[59, 63], [126, 63], [184, 63]].map(([x, y]) => [x * XS, y * XS, 22 * XS, 27 * XS]);
    BTNS.forEach(([x, y, r0, r1]) => {
      const gr = mc.createRadialGradient(x, y, r0, x, y, r1);
      gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      mc.fillStyle = gr; mc.fillRect(0, 0, CW, XH);
    });
    bl.globalCompositeOperation = "destination-in"; bl.drawImage(m2, 0, 0);

    L.glowLayer = xfCanvasOf(CW);
    const gl = L.glowLayer.getContext("2d");
    gl.drawImage(L.charLayer, 0, 0);
    const hg = gl.createLinearGradient(0, 0, 0, XH);        // keep head / face out of the glow
    hg.addColorStop(0, "rgba(0,0,0,1)"); hg.addColorStop(60 / 874, "rgba(0,0,0,1)");
    hg.addColorStop(190 / 874, "rgba(0,0,0,0)"); hg.addColorStop(1, "rgba(0,0,0,0)");
    gl.globalCompositeOperation = "destination-out"; gl.fillStyle = hg; gl.fillRect(0, 0, CW, XH);

    L.headLayer = xfCanvasOf(CW);
    const hl = L.headLayer.getContext("2d");
    hl.drawImage(L.charLayer, 0, 0);
    const hg2 = hl.createLinearGradient(0, 0, 0, XH);       // head / face area goes back over the front light
    hg2.addColorStop(0, "rgba(0,0,0,1)"); hg2.addColorStop(105 / 874, "rgba(0,0,0,1)");
    hg2.addColorStop(185 / 874, "rgba(0,0,0,0)"); hg2.addColorStop(1, "rgba(0,0,0,0)");
    hl.globalCompositeOperation = "destination-in"; hl.fillStyle = hg2; hl.fillRect(0, 0, CW, XH);

    // the light only exists from Jina's feet up to the top of the screen
    L.lightMask = xfCanvasOf(CW);
    const lm = L.lightMask.getContext("2d");
    const lg = lm.createLinearGradient(0, 0, 0, XH);
    lg.addColorStop(0, "rgba(0,0,0,1)"); lg.addColorStop(500 / 874, "rgba(0,0,0,1)");
    lg.addColorStop(560 / 874, "rgba(0,0,0,0.78)"); lg.addColorStop(620 / 874, "rgba(0,0,0,0.42)");
    lg.addColorStop(670 / 874, "rgba(0,0,0,0.12)"); lg.addColorStop(710 / 874, "rgba(0,0,0,0)"); lg.addColorStop(1, "rgba(0,0,0,0)");
    lm.fillStyle = lg; lm.fillRect(0, 0, CW, XH);
    L.lightBuf = xfCanvasOf(CW);
    L.streamBuf = xfCanvasOf(CW);
    return L;
  }

  function xfPlaceLight(target, img, L) {
    const kx = XC.scaleX * XS, ky = XC.scaleY * XS;
    const cx = L && L.sp.cx != null ? L.sp.cx : XC.anchor.sx * XS + (L ? L.sp.ox : 0);   // wide: the light winds around the girl's own centre line
    const y0 = (XC.mapY0 - XC.assetY0 * XC.scaleY) * XS;
    target.drawImage(img, cx - XC.anchor.ax * kx, y0, XF.light.naturalWidth * kx, XF.light.naturalHeight * ky);
  }

  function xfDraw(L, t) {
    const ctx = L.sp.ctx, STR = ST.transform.strength, CW = L.sp.cw;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(L.base, 0, 0, CW, XH);
    const m = t - XC.startDelay;
    if (m <= 0 || m >= XC.fade[1]) return;                  // clean picture before / after

    const bloom = xfSmooth(m / XC.bloomMs);
    const fade = 1 - xfSmooth((m - XC.fade[0]) / (XC.fade[1] - XC.fade[0]));
    const g = bloom * fade * STR;

    // 1) the spiral of light, behind the girl
    ctx.globalAlpha = g;
    const lb = L.lightBuf.getContext("2d");
    lb.globalCompositeOperation = "source-over"; lb.clearRect(0, 0, CW, XH);
    xfPlaceLight(lb, L.tinted, L);
    lb.globalCompositeOperation = "destination-in"; lb.drawImage(L.lightMask, 0, 0);
    ctx.drawImage(L.lightBuf, 0, 0);

    // the one bright stream: runs bottom -> top once, swinging from behind her to in front of her
    const q = xfClamp((m - XC.stream[0]) / (XC.stream[1] - XC.stream[0]));
    const streamOn = q > 0 && q < 1;
    let front = 0, bump = 0;
    if (streamOn) {
      const sctx = L.streamBuf.getContext("2d");
      const yAsset = XC.spiralY1 + (XC.spiralY0 - XC.spiralY1) * xfSmooth(q);
      const yc = (XC.mapY0 + (yAsset - XC.assetY0) * XC.scaleY) * XS;
      sctx.globalCompositeOperation = "source-over";
      sctx.clearRect(0, 0, CW, XH);
      xfPlaceLight(sctx, XF.light, L);
      const half = 160 * XS;
      const grad = sctx.createLinearGradient(0, yc - half, 0, yc + half);
      grad.addColorStop(0, "rgba(0,0,0,0)"); grad.addColorStop(0.5, "rgba(0,0,0,1)"); grad.addColorStop(1, "rgba(0,0,0,0)");
      sctx.globalCompositeOperation = "destination-in";
      sctx.fillStyle = grad; sctx.fillRect(0, 0, CW, XH);
      sctx.drawImage(L.lightMask, 0, 0);
      front = xfSmooth((q - 0.25) / 0.4);                   // 0 = behind her ... 1 = in front of her
      bump = Math.sin(Math.PI * q);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = fade * bloom * 0.6 * bump * (1 - front);
      ctx.drawImage(L.streamBuf, 0, 0);                     // behind part of the stream
    }

    // 2) the girl on top
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(L.charLayer, 0, 0);

    // 3) the stream swings round to the FRONT and sweeps over her; face stays calm, body glows only faintly
    if (streamOn) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = fade * bloom * 0.6 * bump * front;
      ctx.drawImage(L.streamBuf, 0, 0);
      ctx.globalAlpha = fade * 0.07 * bump;
      ctx.drawImage(L.glowLayer, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.8 * front * bump;
      ctx.drawImage(L.headLayer, 0, 0);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(L.btnLayer, 0, 0);                        // buttons sit above the light
  }

  function xfStop() {
    XF.token++;
    window.cancelAnimationFrame(XF.raf);
    xfLayer.classList.remove("on");
    spLayer.classList.remove("on");
  }
  function xfRun(onEnd, baseKey, charSrc, tint, cfg) {
    xfStop();
    const my = XF.token;
    const baseImg = imgByKey[baseKey || "bl-12"];
    const charImg = xfCharFor(charSrc);
    const t0 = performance.now();
    const waitReady = () => {
      if (my !== XF.token) return;
      const ok = baseImg.complete && baseImg.naturalWidth && XF.light.complete && XF.light.naturalWidth && charImg.complete && charImg.naturalWidth;
      if (!ok) {
        if (performance.now() - t0 > 3000) { if (onEnd) onEnd(); return; }       // assets missing: just move on
        XF.raf = window.requestAnimationFrame(waitReady);
        return;
      }
      const sp = xfSpecFor(baseImg, cfg);
      const cxKey = sp.cx == null ? "" : Math.round(sp.cx);
      if (sp.wide && (sp.canvas.width !== sp.cw || sp.canvas.height !== XH)) { sp.canvas.width = sp.cw; sp.canvas.height = XH; }
      if (!XF.built || XF.built.base !== baseImg || XF.built.charImg !== charImg || XF.built.tint !== tint || XF.built.cxKey !== cxKey) { XF.built = xfBuild(baseImg, charImg, tint, sp); XF.built.charImg = charImg; XF.built.tint = tint; XF.built.cxKey = cxKey; }
      const L = XF.built;
      sp.layer.classList.add("on");
      layoutPhotoScene(sceneStory);
      const TOTAL = ST.transform.totalMs;
      const tStart = performance.now();
      Sfx.play("magic", ST.transform.sfxDelayMs);            // 반짝임이 실제로 차오르는 시점(약 0.8초에 가장 밝음)에 소리의 하이라이트를 맞춤
      const tick = (now) => {
        if (my !== XF.token) return;
        const t = now - tStart;
        xfDraw(L, Math.min(t, TOTAL));
        if (t < TOTAL) { XF.raf = window.requestAnimationFrame(tick); return; }
        sp.layer.classList.remove("on");
        if (onEnd) onEnd();
      };
      XF.raf = window.requestAnimationFrame(tick);
    };
    waitReady();
  }

  // ==========================================================================
  // 블썸 11 (와이드 그림 버전): 디자이너가 만든 반짝임 그림을 그대로 씁니다.
  //   assets/fx/w2-sparkle*.webp = (반짝임 있는 그림 - 깨끗한 그림) 의 '빛 레이어'. 지나 뒤에서만 빛나고 지나 위(0)는 비어 있습니다.
  //   깨끗한 그림 위에 빛이 서서히 차오르고(bloom), 밝은 띠가 아래→위로 한 번 훑고 지나가며, 마지막에 서서히 사라집니다 (data.js story.sparkle).
  // ==========================================================================
  const spLayer = document.getElementById("spLayer");
  const spCanvas = document.getElementById("spCanvas");
  const spCtx = spCanvas.getContext("2d");
  const SP = { raf: 0, token: 0, lights: {}, buf: null };
  function spLight(src) { return xfCharFor(src); }      // (the cut-outs of the girl are shared by both sparkle styles)
  // the light layers of the sparkle screens are fetched + decoded ahead of time, so the effect never waits for them
  window.setTimeout(() => Object.values(STEPS).forEach((c) => { if (c.spiral && c.char) { const im = spLight(c.char); if (im.decode) im.decode().catch(() => {}); } }), 3500);
  function spStop() {
    SP.token++;
    window.cancelAnimationFrame(SP.raf);
    spLayer.classList.remove("on");
  }
  // the spiral of light (assets/fx/sparkle-light.webp, tinted once) – shared by all blossom sparkle screens
  function spTinted(tint) {
    tint = tint || "rose";
    SP.tintedBy = SP.tintedBy || {};
    if (SP.tintedBy[tint]) return SP.tintedBy[tint];
    const L = XF.light, c = document.createElement("canvas");
    c.width = L.naturalWidth; c.height = L.naturalHeight;
    const g = c.getContext("2d");
    g.drawImage(L, 0, 0);
    g.globalCompositeOperation = "source-atop";             // faint rose tint so the white light blends with the pink room
    g.fillStyle = XF_TINTS[tint] || XF_TINTS.rose; g.fillRect(0, 0, c.width, c.height);
    SP.tintedBy[tint] = c;
    return c;
  }
  // cfg = the step (frames[0] = picture that is shown, char = cut-out of the girl, spiral = where the light winds around her, from = empty room for the fade-in)
  function spRun(onEnd, cfg) {
    spStop();
    const my = SP.token, C = ST.sparkle;
    const baseKey = cfg.frames[0], base = imgByKey[baseKey], charImg = spLight(cfg.char);
    const from = cfg.from ? imgByKey[cfg.from] : null, plate = imgByKey[cfg.plate || C.plate];
    const endKey = cfg.next && STEPS[cfg.next] ? STEPS[cfg.next].frames[0] : null, endImg = endKey ? imgByKey[endKey] : null;
    const t0 = performance.now();
    const waitReady = () => {
      if (my !== SP.token) return;
      const L = XF.light;
      const ok = base.complete && base.naturalWidth && charImg.complete && charImg.naturalWidth && L.complete && L.naturalWidth && (!from || (from.complete && from.naturalWidth));
      if (!ok) {
        if (performance.now() - t0 > 3000) { if (onEnd) onEnd(); return; }       // assets missing: just move on
        SP.raf = window.requestAnimationFrame(waitReady);
        return;
      }
      const W = base.naturalWidth, H = base.naturalHeight;
      if (spCanvas.width !== W || spCanvas.height !== H) { spCanvas.width = W; spCanvas.height = H; }
      const cv = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
      // --- the light, placed around the girl and cut off below her feet (the cards tray stays untouched)
      const S = cfg.spiral, ld = ST.sparkle.layout;
      const dh = (S.bot - S.top) * H / (ld.loopsBot - ld.loopsTop), dw = dh * (L.naturalWidth / L.naturalHeight) * ld.widthK;
      const px = S.cx * W - ld.axisX * dw, py = S.top * H - ld.loopsTop * dh;
      const place = (src) => {
        const c = cv(), g = c.getContext("2d");
        g.drawImage(src, px, py, dw, dh);
        const gr = g.createLinearGradient(0, H * C.lightMask[0], 0, H * C.lightMask[1]);
        gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
        g.globalCompositeOperation = "destination-in"; g.fillStyle = gr; g.fillRect(0, 0, W, H);
        return c;
      };
      const spT = place(spTinted(cfg.tint)), spR = place(L);
      // --- the three round buttons top-left stay crisp above the light
      const hud = cv(), hg = hud.getContext("2d");
      hg.drawImage(base, 0, 0, W, H);
      const hm = cv(), hmc = hm.getContext("2d");
      C.hud.forEach(([x, y]) => {
        const r = hmc.createRadialGradient(x * W, y * H, C.hudR[0] * W, x * W, y * H, C.hudR[1] * W);
        r.addColorStop(0, "rgba(0,0,0,1)"); r.addColorStop(1, "rgba(0,0,0,0)");
        hmc.fillStyle = r; hmc.fillRect(0, 0, W, H);
      });
      hg.globalCompositeOperation = "destination-in"; hg.drawImage(hm, 0, 0);
      const bandBuf = cv(), bb = bandBuf.getContext("2d"), lightBuf = cv(), lb = lightBuf.getContext("2d");
      const rampBuf = from ? cv() : null, rb = rampBuf ? rampBuf.getContext("2d") : null;
      spLayer.classList.add("on");
      layoutPhotoScene(sceneStory);
      const TOTAL = C.totalMs;
      const tStart = performance.now();
      Sfx.play("magic", C.sfxDelayMs);
      const draw = (t) => {
        const ctx = spCtx;
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
        const rq = from ? xfClamp((t - C.rampMs[0]) / (C.rampMs[1] - C.rampMs[0])) : 1;
        ctx.drawImage(from && rq < 1 ? from : base, 0, 0, W, H);                   // the room (the girl is part of it, but she is drawn again on top below)
        const bloom = xfSmooth((t - C.bloomDelayMs) / C.bloomMs);                  // the light fades IN softly (after the girl has started to show) instead of popping up first
        // the light is wiped away from the bottom up to the very top edge of the screen (instead of just dimming)
        const wp = xfSmooth((t - C.wipeMs[0]) / (C.wipeMs[1] - C.wipeMs[0]));
        const fx = xfClamp((t - C.fadeMs[0]) / (C.fadeMs[1] - C.fadeMs[0]));
        const fo = Math.pow(1 - fx, C.fadePow);                   // opacity: drops quickly at first, then a long soft tail that melts to nothing (no sudden cut)
        const yE = H * (1 - wp) * (1 + C.wipeSoft), soft = H * C.wipeSoft;
        const wipe = (g) => {
          if (wp <= 0) return;
          const gr = g.createLinearGradient(0, yE - soft, 0, yE);
          gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
          g.globalCompositeOperation = "destination-in"; g.fillStyle = gr; g.fillRect(0, 0, W, H);
        };
        if (fo > 0.002) {
          // 1) the spiral of light, BEHIND the girl
          lb.globalCompositeOperation = "source-over"; lb.globalAlpha = 1;
          lb.clearRect(0, 0, W, H);
          lb.drawImage(spT, 0, 0);
          wipe(lb);
          ctx.globalAlpha = C.strength * bloom * fo;        // dims while it is wiped upward, so nothing is left lingering at the top
          ctx.drawImage(lightBuf, 0, 0);
          // 2) one brighter stream that runs up the spiral (bottom -> top), also behind her
          const q = xfClamp((t - C.bandMs[0]) / (C.bandMs[1] - C.bandMs[0]));
          if (q > 0 && q < 1) {
            const yc = H * (C.bandFrom + (C.bandTo - C.bandFrom) * xfSmooth(q)), half = H * C.bandHalf;
            bb.globalCompositeOperation = "source-over"; bb.globalAlpha = 1;
            bb.clearRect(0, 0, W, H);
            bb.drawImage(spR, 0, 0);
            const gr = bb.createLinearGradient(0, yc - half, 0, yc + half);
            gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
            bb.globalCompositeOperation = "destination-in"; bb.fillStyle = gr; bb.fillRect(0, 0, W, H);
            wipe(bb);
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = C.bandGain * bloom * fo * Math.sin(Math.PI * q);
            ctx.drawImage(bandBuf, 0, 0);
          }
        }
        // 3) the girl on top (fades in from her feet up while the room is still empty)
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
        if (from && rq < 1) {
          const e = 1 - Math.pow(1 - rq, 1.4);
          const yf = H * (C.rampFrom + (C.rampTo - C.rampFrom) * e), hf = H * C.rampHalf;
          rb.globalCompositeOperation = "source-over"; rb.globalAlpha = 1;
          rb.clearRect(0, 0, W, H);
          rb.drawImage(charImg, 0, 0, W, H);
          const g2 = rb.createLinearGradient(0, yf - hf, 0, yf + hf);
          g2.addColorStop(0, "rgba(0,0,0,0)"); g2.addColorStop(1, "rgba(0,0,0,1)");
          rb.globalCompositeOperation = "destination-in"; rb.fillStyle = g2; rb.fillRect(0, 0, W, H);
          ctx.drawImage(rampBuf, 0, 0);
        } else {
          ctx.drawImage(charImg, 0, 0, W, H);
        }
        ctx.drawImage(hud, 0, 0);
        // 4) the next screen's text box appears: first the legs behind the box's area give way to the empty room (so the half-transparent box never shows legs through it), then the picture of the next screen melts in
        if (endImg && endImg.complete && endImg.naturalWidth && t > C.legsMs[0]) {
          ctx.globalCompositeOperation = "source-over";
          if (plate && plate.complete && plate.naturalWidth) {
            ctx.save();
            ctx.beginPath(); ctx.rect(0, H * C.boxRows[0], W, H * (C.boxRows[1] - C.boxRows[0])); ctx.clip();
            ctx.globalAlpha = xfSmooth((t - C.legsMs[0]) / (C.legsMs[1] - C.legsMs[0]));
            ctx.drawImage(plate, 0, 0, W, H);
            ctx.restore();
          }
          ctx.globalAlpha = xfSmooth((t - C.endMs[0]) / (C.endMs[1] - C.endMs[0]));
          ctx.drawImage(endImg, 0, 0, W, H);
          ctx.globalAlpha = 1;
        }
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      };
      draw(0);
      const tick = (now) => {
        if (my !== SP.token) return;
        const t = now - tStart;
        draw(Math.min(t, TOTAL));
        if (t < TOTAL) { SP.raf = window.requestAnimationFrame(tick); return; }
        if (endImg) storyShow(endKey, { fade: false });          // the picture underneath already is the final one before the layer goes away
        spLayer.classList.remove("on");
        if (onEnd) onEnd();
      };
      SP.raf = window.requestAnimationFrame(tick);
    };
    waitReady();
  }

  // ==========================================================================
  // 블썸 21 → 22: the curtain closes over the picture, then its two halves gather to the sides
  // ==========================================================================
  const curtainLayer = document.getElementById("curtainLayer");
  const curtainHalves = [document.getElementById("curtainL"), document.getElementById("curtainR")];
  const curtain = { token: 0, anims: [], timers: [] };
  function curtainClear() {
    curtain.timers.forEach((t) => window.clearTimeout(t)); curtain.timers = [];
    curtain.anims.forEach((a) => { try { a.cancel(); } catch (e) {} }); curtain.anims = [];
  }
  function curtainStop() {
    curtain.token++;
    curtainClear();
    curtainLayer.classList.remove("show", "on", "instant");
  }
  function curtainOpenTo(id) {
    const C = ST.curtain;
    curtainStop();
    const my = curtain.token;
    const later = (fn, ms) => curtain.timers.push(window.setTimeout(() => { if (my === curtain.token) fn(); }, ms));
    story.locked = true;
    hideArrow();
    stopSway();
    // 커튼이 활짝 열리기 시작하는 순간(닫힘 페이드 + 대기 뒤)에 소리의 하이라이트가 오도록 시작을 늦춘다
    Sfx.play("shine", Math.max(0, C.fadeInMs + 30 + C.holdMs - C.sfxPeakMs));
    const curSrc = SUN_ROUTES.has(STEPS[id].route) ? "assets/scenes/sw-curtain.webp?v=47" : "assets/scenes/bl-curtain.webp?v=45";      // the closed curtain of the route
    curtainHalves.forEach((h) => { const im = h.querySelector("img"); if (im && !im.src.endsWith(curSrc)) im.src = curSrc; });
    layoutPhotoScene(sceneStory);
    curtainLayer.style.setProperty("--cur-in", `${C.fadeInMs}ms`);
    curtainLayer.classList.add("on");
    void curtainLayer.offsetWidth;
    curtainLayer.classList.add("show");                      // 1) closed curtain fades in over the current picture
    later(() => {
      story.stack.push(story.phase);                         // 2) under the curtain: swap to the party hall (no text yet)
      const textAt = C.holdMs + Math.round(C.openMs * C.textAtOpenFrac);
      enterStep(id, { instant: true, textDelayMs: textAt });
      story.locked = true;
    }, C.fadeInMs + 30);
    later(() => {                                            // 3) after a short pause the two halves gather to the sides
      const left = [{ transform: "translateX(0) scaleX(1)", filter: "brightness(1)" }, { transform: "translateX(-20%) scaleX(.30)", filter: "brightness(.86)" }];
      const right = [{ transform: "translateX(0) scaleX(1)", filter: "brightness(1)" }, { transform: "translateX(20%) scaleX(.30)", filter: "brightness(.86)" }];
      const opt = { duration: C.openMs, easing: C.ease, fill: "both" };
      curtain.anims = [curtainHalves[0].animate(left, opt), curtainHalves[1].animate(right, opt)];
    }, C.fadeInMs + 30 + C.holdMs);
    later(() => {                                            // 4) done: take the curtain away
      curtainLayer.classList.add("instant");
      curtainLayer.classList.remove("show", "on");
      curtainClear();
      story.locked = false;
      window.setTimeout(() => curtainLayer.classList.remove("instant"), 30);
    }, C.fadeInMs + 30 + C.holdMs + C.openMs + 40);
  }

  // ==========================================================================
  // STEPS
  // ==========================================================================

  function stopFxAll(soft) {
    clearPetals(soft);
    stopMarks(soft);
    stopPouchCard(soft);
    glossStop();
    xfStop();
    spStop();
  }

  function enterStep(id, { settled = false, instant = false, textDelayMs = null, fxDelayMs = null, fadeMs = null } = {}) {
    const cfg = STEPS[id];
    if (!cfg) return;
    clearStoryTimers();
    // keepFx: the same wobbling poses + 빠직 marks go on across two captions (오답: "이게 아니야!" → "다른 아이템을 선택해 볼까?")
    const prevCfg = story.phase && STEPS[story.phase];
    const keep = !!(cfg.keepFx && prevCfg && prevCfg.fx === cfg.fx && prevCfg.route === cfg.route && !settled && !instant && story.marks.length);
    if (!keep) { stopSway(); stopFxAll(!instant); }
    window.clearTimeout(story.patchTimer);
    story.phase = id;
    story.ready = false;
    story.locked = false;
    story.hover = null;
    hideArrow();
    setRoute(cfg.route);
    if (cfg.route === "nerd" && id === "choice") { warmRoute("blossom"); warmRoute("sunset"); }

    const isTap = cfg.kind !== "result";           // tap on the picture: skip typing (and go on when it is a dialogue)
    setStoryActive({ tap: isTap, cards: cfg.cards || null });
    if (cfg.kind !== "choice" && cfg.kind !== "wrong") state.route = null;

    // cards that stay "pressed" in the new picture: drop the patch once the picture has faded in
    const keepPatch = Object.values(patchSets).some((set) => Object.values(set).some((el) => el.classList.contains("on")));
    story.cardSet = cfg.cardSet || "A";
    if (keepPatch) story.patchTimer = window.setTimeout(hidePatches, instant ? 0 : ST.fadeMs + 60);

    const frames = cfg.frames;
    // reveal: the picture first shows frames[0] (e.g. with sparkles), then slowly melts into reveal.to
    const RV = cfg.reveal || null;
    if (!keep) storyShow(RV && settled ? RV.to : (cfg.kind === "transform" && cfg.from && !settled && ST.sparkleStyle !== "classic" ? cfg.from : frames[0]), { fade: !instant, ms: fadeMs != null ? fadeMs : ST.fadeMs });
    let revealTextDelay = null;
    if (RV && !settled) {
      const base = instant ? 0 : ST.fadeMs;
      storyLater(() => storyShow(RV.to, { ms: RV.ms }), base + RV.holdMs);
      revealTextDelay = base + RV.holdMs + Math.round(RV.ms * 0.55);
    }

    if (story.textGid && story.textGid !== cfg.text) typerHide({ instant });
    predecodeNext(cfg);

    // gloss steps: the hair shine starts together with the first letters; the step moves on
    // once BOTH the text and the shine are finished
    const live = (cfg.kind === "gloss" || cfg.kind === "transform") && !settled;
    let textDone = false, glossDone = !live;
    const tryFinish = () => {
      if (!textDone || !glossDone) return;
      story.ready = true;
      if (cfg.arrow) showArrow(cfg.arrow);                       // ▶ after the text (and the shine) are done
      else if (live) storyLater(() => advance(cfg), cfg.kind === "transform" ? 0 : ST.gloss.holdAfterMs);   // no ▶ → move on by itself
    };
    const done = () => {
      textDone = true;
      tryFinish();
    };
    if (live && cfg.kind === "gloss") {
      storyLater(() => glossRun(() => { glossDone = true; tryFinish(); }), instant ? 0 : TY.afterFadeMs);
    }
    if (live && cfg.kind === "transform") {
      storyLater(() => (cfg.spiral && ST.sparkleStyle !== "classic" ? spRun(() => { glossDone = true; tryFinish(); }, cfg) : xfRun(() => { glossDone = true; tryFinish(); }, cfg.frames[0], cfg.char, cfg.tint, cfg)), fxDelayMs != null ? fxDelayMs : 0);
    }
    if (cfg.text) {
      if (settled) typerShow(cfg.text, { instant: true, onDone: done });
      else {
        const pcHold = cfg.fx === "pouchcard" && ST.pouchCard ? (ST.pouchCard.delayMs || 0) + (ST.pouchCard.textAfterMs || 0) : 0;      // 반짝임 → 카드 → 자막: 카드가 자리를 잡을 때쯤 자막 시작
        const td = (textDelayMs != null ? textDelayMs : revealTextDelay != null ? revealTextDelay : instant ? 0 : TY.afterFadeMs) + pcHold;
        storyLater(() => typerShow(cfg.text, { onDone: done, fadeInMs: cfg.fx === "pouchcard" && ST.pouchCard ? ST.pouchCard.textFadeMs || 0 : 0, glyphMs: cfg.fx === "pouchcard" && ST.pouchCard ? ST.pouchCard.textGlyphMs || 0 : 0 }), td);
      }
    } else {
      done();
    }

    if (cfg.sway && frames.length > 1 && !keep) startSway(frames);
    if (cfg.fx === "petals" && !settled) storyLater(spawnPetals, fxDelayMs != null ? fxDelayMs : instant ? 120 : 200);
    if (cfg.fx === "marks" && !keep) storyLater(() => startMarks({ pop: !settled }), settled ? 0 : ST.marks.startDelayMs);
    if (cfg.fx === "pouchcard") {
      const pcDelay = settled ? 0 : (textDelayMs != null ? textDelayMs : instant ? 0 : TY.afterFadeMs) + ((ST.pouchCard && ST.pouchCard.delayMs) || 0);
      if (!settled) story.pcPrep = buildPouchCard(cfg.pouch, false);          // 미리 만들어 그림을 해독해 둔다
      storyLater(() => startPouchCard({ settled, key: cfg.pouch }), pcDelay);
    }
    if (cfg.kind === "result") storyLater(() => showToast(ST.endToast, 2600, "top"), 1100);
  }

  // forward: remember where we came from (for the back button)
  function goto(id, opts) {
    if (story.phase) story.stack.push(story.phase);
    enterStep(id, opts);
  }

  // next screen: normally a cross-fade; some screens come in through the soft white veil (veil) or a curtain (curtain)
  function gotoNext(id, afterFx) {
    const to = STEPS[id];
    if (to && to.veil) {
      const SOFT = to.veil === "fast" ? D.softTransitionFast : D.softTransition;   // "fast": the white clears sooner
      story.locked = true;
      transitionTo("story", () => {
        story.stack.push(story.phase);
        enterStep(id, { instant: true, fxDelayMs: to.fxDelayMs != null ? to.fxDelayMs : SOFT.fxDelayMs != null ? SOFT.fxDelayMs : ST.transform.delayMs });
      }, SOFT);
    } else if (to && to.curtain) {
      curtainOpenTo(id);
    } else if (afterFx && ST.afterFx) {
      goto(id, { fadeMs: ST.afterFx.fadeMs, textDelayMs: ST.afterFx.textDelayMs });   // right after a sparkle: the caption comes up quickly
    } else {
      goto(id);
    }
  }

  // 블썸 24 ▶ : soft white fade → letter screen (envelope flies in, letter rises, 선물받기 / 다시하기)
  function enterLetter() {
    story.locked = true; story.ready = false; hideArrow(); stopSway();
    const SOFT = D.softTransition;
    transitionTo("letter", () => {
      Music.fadeOut("story");                                // 마지막 화면(선물받기/다시하기): 음악 페이드아웃
      resetStoryText();                                    // (story.phase stays on 24 so ← can come back to it)
      Sfx.play("wind");                                      // 초대장이 날아오는 속도에 맞춘 바람 소리
      window.LetterScene.play(250, SUN_ROUTES.has(STEPS[story.phase].route) ? "sunset" : "blossom");   // gold for 선셋, pink for 블라썸
    }, SOFT);
  }
  function letterBack() {
    Sfx.play("click");
    transitionTo("story", () => {
      Music.play("story", { fadeInMs: 1500 });               // 24 로 돌아오면 음악도 다시 페이드인
      window.LetterScene.stop();
      story.locked = false;
      enterStep(story.phase, { settled: true, instant: true });          // back to 24 of the same route
    });
  }

  function advance(cfg) {
    if (cfg.toLetter) { enterLetter(); return; }
    if (cfg.next) { story.ready = false; stopSway(); hideArrow(); gotoNext(cfg.next, cfg.kind === "transform"); return; }
    // last screen delivered so far
    showToast(ST.endToast, 2600, "top");
    story.ready = true;
  }

  // tap = skip the typing first; tap again (once ready / ▶ visible) = next screen
  storyTap.addEventListener("click", (ev) => {
    const cfg = STEPS[story.phase];
    if (!cfg || story.locked) return;
    if (cfg.kind === "result") return;
    if (!typer.done) { typerFinish(); return; }
    if (cfg.kind === "choice" && cfg.tapGo && story.ready) {                    // ▶ visible: tap on the picture = the one possible answer
      const r = storyTap.getBoundingClientRect();
      if ((ev.clientY - r.top) / r.height < 0.76) pickCard(cfg.tapGo, true);          // (not on the card tray: a tap on the wrong card stays a no-op)
      return;
    }
    if (cfg.kind === "choice" || (cfg.kind === "wrong" && !cfg.next) || !story.ready) return;
    advance(cfg);                                           // (자막 탭에는 효과음 없음 — 버튼에만)
  });

  // ---- cards: hover / press shows the pressed look, only a real click moves on ----
  function hoverCard(side) {
    const cfg = STEPS[story.phase];
    if (!cfg || !cfg.cards || !cfg.cards[side] || story.locked || story.hover === side) return;
    story.hover = side;
    const c = cfg.cards[side];
    if (c.hoverImg) storyShow(c.hoverImg, { ms: ST.hoverFadeMs });
    else showPatch(side);
  }
  function unhoverCard(side) {
    const cfg = STEPS[story.phase];
    if (!cfg || !cfg.cards || !cfg.cards[side] || story.locked || story.hover !== side) return;
    story.hover = null;
    const c = cfg.cards[side];
    if (c.hoverImg) storyShow(cfg.frames[0], { ms: ST.hoverFadeMs });
    else hidePatch(side);
  }
  function pickCard(side, quiet) {
    const cfg = STEPS[story.phase];
    if (!cfg || !cfg.cards || !cfg.cards[side] || story.locked) return;
    const c = cfg.cards[side];
    story.locked = true;
    if (!quiet) Sfx.play("click");                          // 버튼음 (카드 버튼을 직접 눌렀을 때만)
    if (c.sfx) Sfx.play(c.sfx);                             // 꼬리빗(오답) 선택음
    stopSway();
    hideArrow();
    if (c.hoverImg) storyShow(c.hoverImg, { ms: ST.hoverFadeMs }); else showPatch(side);
    if (c.again) { story.locked = false; startMarks({ pop: true }); return; }   // wrong answer picked again
    storyLater(() => {
      state.route = c.route || state.route;
      if (c.go && c.go.charAt(0) === "@") {                 // start of a route (블라썸 / 선셋 허니): same soft white fade, same petals
        const SOFT = D.softTransition, first = ST.routeStart[c.go];
        Sfx.play("magic");                                  // 너드 지나 → 블라썸 1 / 선셋 1
        transitionTo("story", () => {
          story.stack.push(story.phase);
          enterStep(first, { instant: true, textDelayMs: SOFT.textDelayMs, fxDelayMs: SOFT.petalDelayMs });
        }, SOFT);
      } else if (c.go) {
        gotoNext(c.go);
      }
    }, ST.pressHoldMs);
  }
  function wireCard(side) {
    const btn = cardBtns[side];
    btn.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") hoverCard(side); });
    btn.addEventListener("pointerdown", () => hoverCard(side));
    btn.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch") unhoverCard(side); });
    btn.addEventListener("pointercancel", () => unhoverCard(side));
    btn.addEventListener("click", () => pickCard(side));
  }
  wireCard("L");
  wireCard("R");

  // Leaving the story scene: forget the typed text so it types again next time.
  function resetStoryText() {
    clearStoryTimers();
    stopSway();
    stopFxAll();
    curtainStop();
    hideArrow();
    hidePatches();
    typerHide({ instant: true });
  }

  function startStory(opts) {
    story.stack = [];
    story.phase = null;
    enterStep("invite", opts);
  }

  // 큰 이미지(1206x2622)는 처음 화면에 그려질 때 디코딩하느라 한 번 끊길 수 있어서, 첫 장면에 쓰이는 이미지들을 미리 디코딩해 둔다.
  // (인트로가 재생되는 동안 한 번, 초대장 받기를 누를 때 한 번 더)
  let prewarmP = null;
  function prewarmStoryStart() {
    const dec = (im) => (im && im.decode ? im.decode().catch(() => {}) : Promise.resolve());
    const keys = [];
    ["invite", "help"].forEach((id) => (STEPS[id].frames || []).forEach((k) => keys.push(k)));
    const list = keys.map((k) => dec(imgByKey[k]));
    list.push(dec(sceneStory._fillImg || imgByKey[ST.routes.nerd.fill]));
    ["invite"].forEach((id) => { const c = STEPS[id]; if (c.text && MAP.text[c.text]) list.push(dec(layerImg(MAP.text[c.text].png))); if (c.arrow && MAP.arrows[c.arrow]) list.push(dec(layerImg(MAP.arrows[c.arrow].png))); });
    prewarmP = Promise.all(list);
    return prewarmP;
  }
  window.setTimeout(prewarmStoryStart, 400);

  // 1st button — back one step (first dialogue goes back to the intro).
  function storyBack() {
    Sfx.play("click");
    let prev = story.stack.pop();
    while (prev && STEPS[prev] && STEPS[prev].transient) prev = story.stack.pop();   // auto screens (변신 효과) are skipped
    if (!prev) {
      resetStoryText();
      story.phase = null;
      state.history = [];
      transitionTo("envelope", showIntroEnd);
      return;
    }
    const to = STEPS[prev], from = STEPS[story.phase];
    if (to.route !== from.route) {
      transitionTo("story", () => enterStep(prev, { settled: true, instant: true }));
    } else {
      enterStep(prev, { settled: true });
    }
  }
  // 3rd button — back to the very start: the invitation-flies-in intro again.
  function storyUndo() {
    Sfx.play("click");
    resetStoryText();
    story.phase = null; story.stack = [];
    state.route = null; state.stylePicked = null; state.accessoryPicked = new Set(); state.history = [];
    transitionTo("envelope", () => { window.LetterScene.stop(); resetEnvelopeScene(); });
  }
  const sceneLetter = document.getElementById("scene-letter");
  document.getElementById("letterBg").addEventListener("load", () => layoutPhotoScene(sceneLetter));
  window.LetterScene.onTheme = () => layoutPhotoScene(sceneLetter);
  document.getElementById("letterBack").addEventListener("click", letterBack);
  document.getElementById("letterMute").addEventListener("click", toggleMute);
  document.getElementById("letterUndo").addEventListener("click", storyUndo);
  // 선물받기: 버튼음 + 상품 페이지(D.story.giftUrl)를 새 탭으로 연다 (새 탭이 막히면 같은 탭에서 이동)
  window.LetterScene.onGift = () => {
    Sfx.play("click");
    const url = ST.giftUrl;
    if (!url) return;
    const w = window.open(url, "_blank", "noopener");
    if (!w) window.location.href = url;
  };
  window.LetterScene.onRetry = storyUndo;                                   // 다시하기: the whole game from the start
  document.getElementById("storyBack").addEventListener("click", storyBack);
  document.getElementById("storyMute").addEventListener("click", toggleMute);
  document.getElementById("storyUndo").addEventListener("click", storyUndo);

  // ==========================================================================
  // SCENE: styling-tool puzzle (photo scene)
  // ==========================================================================

  const sceneStyle = document.getElementById("scene-style");
  const styleImg = document.getElementById("styleImg");
  const styleFxLayer = document.getElementById("styleFxLayer");
  const styleWrongBtn = document.getElementById("styleWrongBtn");
  const styleCorrectBtn = document.getElementById("styleCorrectBtn");
  const styleNextBtn = document.getElementById("styleNextBtn");

  function initStyleScene() {
    const route = currentRoute();
    state.stylePicked = null;
    styleFxLayer.innerHTML = "";
    styleNextBtn.classList.add("hidden");
    styleWrongBtn.classList.remove("disabled");
    styleCorrectBtn.classList.remove("disabled");
    setSceneImage(sceneStyle, route.style.img);
  }

  function spawnSparkMarks() {
    const positions = [{ x: 0.62, y: 0.10 }, { x: 0.38, y: 0.17 }];
    positions.forEach((p, i) => {
      const el = document.createElement("span");
      el.className = "spark-mark";
      el.textContent = "✺";
      el.style.left = `calc(${p.x * 100}% - 11px)`;
      el.style.top = `calc(${p.y * 100}% - 11px)`;
      el.style.animationDelay = `${i * 70}ms`;
      styleFxLayer.appendChild(el);
      window.setTimeout(() => el.remove(), 700);
    });
  }

  function showNoticePopup(text) {
    const popup = document.createElement("div");
    popup.className = "notice-popup";
    popup.innerHTML = `<span class="notice-tab">Notice</span><p>${text}</p>`;
    styleFxLayer.appendChild(popup);
    requestAnimationFrame(() => popup.classList.add("show"));
    window.setTimeout(() => {
      popup.classList.remove("show");
      window.setTimeout(() => popup.remove(), 350);
    }, 1900);
  }

  function tintWrongCard() {
    const tint = document.createElement("div");
    tint.className = "card-tint";
    tint.dataset.rect = "cardRight";
    styleFxLayer.appendChild(tint);
    positionOnRect(sceneStyle, tint, "cardRight");
    requestAnimationFrame(() => tint.classList.add("show"));
    window.setTimeout(() => {
      tint.classList.remove("show");
      window.setTimeout(() => tint.remove(), 300);
    }, 1900);
  }

  function ringCorrectCard() {
    const ring = document.createElement("div");
    ring.className = "correct-ring";
    ring.dataset.rect = "cardLeft";
    styleFxLayer.appendChild(ring);
    positionOnRect(sceneStyle, ring, "cardLeft");
    requestAnimationFrame(() => ring.classList.add("show"));
  }

  styleWrongBtn.addEventListener("click", () => {
    if (state.stylePicked === "correct") return;
    const route = currentRoute();
    spawnSparkMarks();

    if (route.style.wrongImg) {
      // A dedicated composite exists (art + Notice popup already baked in)
      const base = route.style.img;
      setSceneImage(sceneStyle, route.style.wrongImg);
      window.setTimeout(() => {
        if (currentSceneId() === "style" && state.stylePicked !== "correct") {
          setSceneImage(sceneStyle, base);
        }
      }, 1900);
    } else {
      // No dedicated composite yet for this route — draw the feedback.
      tintWrongCard();
      showNoticePopup(route.style.wrongBubble);
    }
  });

  styleCorrectBtn.addEventListener("click", () => {
    if (state.stylePicked === "correct") return;
    state.stylePicked = "correct";
    const route = currentRoute();
    ringCorrectCard();
    showToast(route.style.correctBubble, 3200);
    styleWrongBtn.classList.add("disabled");
    styleCorrectBtn.classList.add("disabled");
    styleNextBtn.classList.remove("hidden");
  });

  styleNextBtn.addEventListener("click", () => transitionTo("accessory", initAccessoryScene));

  sceneStyle.querySelector('[data-rect="ctrlMute"]').addEventListener("click", toggleMute);
  sceneStyle.querySelector('[data-rect="ctrlBack"]').addEventListener("click", goBack);
  sceneStyle.querySelector('[data-rect="ctrlUndo"]').addEventListener("click", () => {
    if (currentSceneId() === "style") initStyleScene();
  });

  // ==========================================================================
  // SCENE: accessory collection — placeholder until real photos arrive
  // ==========================================================================

  const accessoryBg = document.getElementById("accessoryBg");
  const accessoryPlaceholderLabel = document.getElementById("accessoryPlaceholderLabel");
  const accessoryBubble = document.getElementById("accessoryBubble");
  const accessoryBubbleText = document.getElementById("accessoryBubbleText");
  const accessoryButtons = document.getElementById("accessoryButtons");
  const accessoryNextBtn = document.getElementById("accessoryNextBtn");

  const PLACEHOLDER_ACCESSORIES = [
    { id: "scrunchie", label: "스크런치", bubble: "마음에 들어! 이건 파우치로도 쓸 수 있나봐! 다른 것도 봐볼까?" },
    { id: "diary", label: "다이어리 파우치", bubble: "이제 파티에 갈 준비 끝이야!" },
  ];

  function initAccessoryScene() {
    const route = currentRoute();
    accessoryBg.className = "stage-bg textured";
    accessoryBg.style.backgroundColor = route.accent;
    accessoryPlaceholderLabel.textContent = D.accessory.prompt;
    state.accessoryPicked = new Set();
    hideBubble(accessoryBubble);
    accessoryNextBtn.classList.add("hidden");
    accessoryButtons.innerHTML = "";
    PLACEHOLDER_ACCESSORIES.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "item-btn";
      btn.innerHTML = `<span class="item-swatch"></span><span class="item-label">${item.label}</span>`;
      btn.dataset.itemId = item.id;
      btn.addEventListener("click", () => pickAccessory(item));
      accessoryButtons.appendChild(btn);
    });
  }

  function pickAccessory(item) {
    if (state.accessoryPicked.has(item.id)) return;
    state.accessoryPicked.add(item.id);
    showBubble(accessoryBubble, accessoryBubbleText, item.bubble);
    const btn = accessoryButtons.querySelector(`[data-item-id="${item.id}"]`);
    if (btn) btn.classList.add("disabled", "selected");
    if (state.accessoryPicked.size >= PLACEHOLDER_ACCESSORIES.length) {
      window.setTimeout(() => accessoryNextBtn.classList.remove("hidden"), 500);
    }
  }

  accessoryNextBtn.addEventListener("click", () => transitionTo("curtain", initCurtainScene));

  // ==========================================================================
  // SCENE: curtain reveal
  // ==========================================================================

  const curtainScene = document.getElementById("scene-curtain");
  const curtainBg = document.getElementById("curtainBg");

  function initCurtainScene() {
    curtainScene.classList.remove("opened");
    curtainBg.className = "stage-bg";
    curtainBg.style.backgroundColor = D.curtain.fallbackColor;
    window.setTimeout(() => {
      curtainScene.classList.add("opened");
      window.setTimeout(() => transitionTo("ending", initEndingScene), 1000);
    }, 600);
  }

  // ==========================================================================
  // SCENE: ending + retry — placeholder until real photos arrive
  // ==========================================================================

  const endingBg = document.getElementById("endingBg");
  const endingBubble = document.getElementById("endingBubble");
  const endingBubbleText = document.getElementById("endingBubbleText");
  const btnRetry = document.getElementById("btnRetry");

  function initEndingScene() {
    const route = currentRoute();
    endingBg.className = "stage-bg textured";
    endingBg.style.backgroundColor = route.accent;
    hideBubble(endingBubble);
    btnRetry.classList.remove("show");
    btnRetry.classList.add("hidden");
    btnRetry.textContent = D.ending.retryLabel;
    window.setTimeout(() => {
      showBubble(endingBubble, endingBubbleText, D.ending.thankYouBubble, { autoHideMs: 3000 });
      window.setTimeout(() => {
        btnRetry.classList.remove("hidden");
        requestAnimationFrame(() => btnRetry.classList.add("show"));
      }, 3000);
    }, 500);
  }

  btnRetry.addEventListener("click", () => {
    state.route = null;
    state.stylePicked = null;
    state.accessoryPicked = new Set();
    state.history = [];
    transitionTo("envelope", resetEnvelopeScene);
  });

  // ==========================================================================
  // TOP-LEFT CONTROLS: back / mute / undo-this-screen
  // ==========================================================================
  // Route & style scenes use the baked-in icons (hotspots above); accessory/
  // curtain/ending (still placeholders) use the generic floating control bar.

  const btnBack = document.getElementById("btnBack");
  const btnMute = document.getElementById("btnMute");
  const btnUndo = document.getElementById("btnUndo");
  const muteGlyph = document.getElementById("muteGlyph");

  const SCENE_INIT = {
    envelope: showIntroEnd,
    story: () => { story.stack = []; story.phase = null; enterStep("invite", { settled: true, instant: true }); },
    style: initStyleScene,
    accessory: initAccessoryScene,
    curtain: initCurtainScene,
    ending: initEndingScene,
  };

  function goBack() {
    const prev = state.history.pop();
    if (!prev) return;
    showSceneRaw(prev);
    if (SCENE_INIT[prev]) SCENE_INIT[prev]();
  }

  window.PartyGame = window.PartyGame || {};
  window.PartyGame.music = Music;                        // (테스트/디버그용)
  window.PartyGame.story = story;                        // (테스트/디버그용)
  function startMusic() { Music.kick(); }
  // Browsers only allow audio after a user gesture → start on the first touch.
  // 화면 로드 시 자동 재생을 먼저 시도하고(브라우저가 허용하면 바로 재생), 막혀 있으면 첫 터치/클릭/키/스크롤 순간에 시작한다.
  // (터치는 pointerdown 이 아니라 touchend/click 시점에 '사용자 동작'으로 인정되므로 여러 이벤트를 모두 듣는다. kick 은 이미 재생 중이면 아무것도 안 한다.)
  ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "mouseup", "click", "keydown", "wheel"].forEach((ev) =>
    document.addEventListener(ev, startMusic, { capture: true, passive: true }));
  window.addEventListener("load", startMusic);
  window.addEventListener("pageshow", startMusic);

  function toggleMute() {
    state.muted = !state.muted;
    app.classList.toggle("muted", state.muted);
    muteGlyph.textContent = state.muted ? "✕" : "♪";
    const label = state.muted ? "음악 켜기" : "음악 끄기";
    btnMute.setAttribute("aria-label", label);
    document.getElementById("storyMute").setAttribute("aria-label", label);
    document.getElementById("letterMute").setAttribute("aria-label", label);
    Music.setMuted(state.muted);
    if (state.muted) Sfx.stopAll(); else Sfx.play("click");
  }

  function undoCurrentScreen() {
    const id = currentSceneId();
    if (SCENE_INIT[id]) SCENE_INIT[id]();
  }

  btnBack.addEventListener("click", goBack);
  btnMute.addEventListener("click", toggleMute);
  btnUndo.addEventListener("click", undoCurrentScreen);

})();
