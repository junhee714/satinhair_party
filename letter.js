/*
  편지 화면 (블라썸 24 / 선셋 24 → ▶) — "편지 봉투 열리는 효과 테스트 v3 (블라썸 / 선셋 허니)" 를 게임에 붙인 것.
    루트별 테마(THEMES): blossom = 분홍 봉투·새틴, sunset = 금색 봉투·새틴. 모션/타이밍/크기/위치는 두 루트가 완전히 같다.
    1) 새틴 배경(assets/scenes/letter-bg*.webp, 위쪽 아이콘 포함)은 <img> 가 보여주고, 이 파일은 그 위 캔버스에 봉투/편지지만 그린다.
    2) 봉투가 왼쪽 → 오른쪽으로 날아와 자리 잡고, 뚜껑이 뒤로 열리고, 편지지가 봉투 입구에서 위로 올라온다.
    3) 편지지가 다 올라오면 "선물받기"(위) / "다시하기"(아래) 버튼이 차례로 나타난다. 클릭 동작은 script.js 에서 연결(LetterScene.onGift / onRetry).
  레이어(뒤→앞): 열린 뚜껑 / 봉투 안쪽 / 편지지 / 봉투 앞판 / 닫힌 뚜껑
  타이밍·크기·위치 값은 테스트에서 확정한 값 그대로 (아래 TIMELINE / GS·GY).
*/
(() => {
  "use strict";
  const FILES = {
    closed_body: "closed-body.webp", closed_flap: "closed-flap.webp", closed_flap_dark: "closed-flap-dark.webp",
    open_flap: "open-flap.webp", open_interior: "open-interior.webp", open_panels: "open-panels.webp",
    letter: "letter.webp",
  };
  const VER = "?v=45";
  // 테마별 값: 봉투 사진마다 힌지(뚜껑 접히는 선)·모서리 위치와 크기가 달라서, 화면에서 보이는 크기/기울기가 같도록 K·ROT 를 맞춰 둠
  //  K = 레이어 이미지 배율, TL/TR = 힌지 양 끝, BR/BL = 아래쪽 모서리 (닫힌 봉투 사진 기준 px), shade = 열린 봉투 안쪽 색
  const THEMES = {
    blossom: {
      dir: "assets/letter/", bg: "assets/scenes/letter-sat.webp", cover: true, mute: "assets/scenes/mute-on-patch-pink2.png",
      K: 0.82, OY: 400, TL: [86, 2], TR: [1065, 124], ROT: 5, BR: [974, 763], BL: [3, 636],
      shade: { y0: 334, y1: 616, top: "rgb(226,192,201)", bot: "rgb(237,208,215)" },
      shadowLetter: "rgba(100,36,64,0.34)", shadowPanels: "rgba(95,40,65,0.26)",
    },
    sunset: {
      dir: "assets/letter/sun/", bg: "assets/scenes/letter-bg-sun.webp", mute: "assets/scenes/mute-on-patch-gold.png",
      K: 0.8172, OY: 400, TL: [88, 2], TR: [1072, 110], ROT: 5.84, BR: [990, 752], BL: [2, 628],
      shade: { y0: 324, y1: 602, top: "rgb(231,205,155)", bot: "rgb(243,220,165)" },
      shadowLetter: "rgba(104,74,26,0.34)", shadowPanels: "rgba(100,70,24,0.26)",
    },
  };
  let T = THEMES.blossom, themeName = "blossom";
  const W = 804, H = 1748, S = 2;
  // 캔버스는 402x874 기준 화면보다 사방으로 PAD(디자인 px)만큼 더 크게 잡아서, 봉투/편지가 기준 화면 가장자리에서 잘리지 않고 화면 끝까지 보이게 함
  const PADX = 160, PADY = 60;
  const CW = W + 2 * PADX * S, CH = H + 2 * PADY * S;

  const bgImg = document.getElementById("letterBg");
  const icons = document.getElementById("letterIcons");
  const mutePatch = document.getElementById("letterMutePatch");
  const cv = document.getElementById("letterCanvas");
  cv.width = CW; cv.height = CH;
  const ctx = cv.getContext("2d");
  const gift = document.getElementById("letterGift");
  const retry = document.getElementById("letterRetry");
  const layer = document.getElementById("letterLayer");
  const api = { onGift: null, onRetry: null, onTheme: null, playing: false };

  // ---- timeline (ms)
  const FLY0 = 150, FLY = 800;               // envelope flight left -> right
  const FLAP0 = 960, FLAP = 500;             // flap folds open
  const LET0 = 1330, LET = 1230;             // letter rises out of the envelope
  const BTN0 = 2450, BTN_GAP = 150;          // the two buttons appear (second one a moment later)
  const TOTAL = 3000;
  const START_X = -440, START_Y = -46, START_ROT = -9 * Math.PI / 180, START_SCALE = 0.9;
  const PIV = { x: 200, y: 600 };

  // ---- final envelope pose (design px): asset TR corner -> (389,521), scale 0.41, rotated +5 deg
  const ANCH = { x: 389, y: 521 };
  let K, ES, ENV_ROT, TRa, TLa, OY, HINGE_A;
  const a2s = (ax, ay) => {
    const dx = (ax - TRa[0]) * ES, dy = (ay - TRa[1]) * ES;
    return [ANCH.x + dx * Math.cos(ENV_ROT) - dy * Math.sin(ENV_ROT), ANCH.y + dx * Math.sin(ENV_ROT) + dy * Math.cos(ENV_ROT)];
  };
  function applyGeometry() {
    K = T.K; ES = K / S; ENV_ROT = T.ROT * Math.PI / 180; TRa = T.TR; TLa = T.TL; OY = T.OY;
    HINGE_A = Math.atan2(TRa[1] - TLa[1], TRa[0] - TLa[0]);
  }
  applyGeometry();

  // ---- letter (design px): top-left corner (26,164), tilted -4.4 deg; PAD px transparent margin in the image
  const LET_POS = { x: 26, y: 198 }, LET_ROT = -4.4 * Math.PI / 180, LET_D = 504, PAD = 2;   // y 164→198: the paper sits lower, so more of it is covered by the envelope

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const easeOutBack = (u, s = 0.9) => { u = clamp01(u) - 1; return 1 + u * u * ((s + 1) * u + s); };
  const easeLetter = (u) => { u = clamp01(u); const a = 0.5 - 0.5 * Math.cos(Math.PI * u); return 0.4 * a + 0.6 * (1 - Math.pow(1 - u, 2.6)); };
  const easeInOut = (u) => { u = clamp01(u); return 0.5 - 0.5 * Math.cos(Math.PI * u); };
  const smooth01 = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };

  const imgs = {}, loadedBy = {};
  let img = {};                                  // layer images of the current theme
  function ensure(name) {
    name = name || themeName;
    if (loadedBy[name]) return loadedBy[name];
    const th = THEMES[name], set = (imgs[name] = {});
    const bg = new Image(); bg.src = th.bg + VER;                           // warm the cache for the background too
    loadedBy[name] = Promise.all(Object.keys(FILES).map((k) => new Promise((res) => {
      const i = new Image();
      i.onload = () => { set[k] = i; res(); };
      i.onerror = () => res();
      i.src = th.dir + FILES[k] + VER;
    }))).then(() => { if (set.open_interior && set.open_flap) makeShade(set, th); });
    return loadedBy[name];
  }
  // switch everything that differs per route: geometry, layer images, background, buttons, mute patch
  function applyTheme(name) {
    if (!THEMES[name]) name = "blossom";
    themeName = name; T = THEMES[name]; applyGeometry(); img = imgs[name] || {};
    const bgSrc = T.bg + VER;
    // blossom: plain satin picture that covers the whole screen (never cropped, whatever the screen shape) + the three round icons as a separate layer on the 402x874 frame
    if (T.cover) bgImg.dataset.cover = "1"; else delete bgImg.dataset.cover;
    if (icons) icons.style.display = T.cover ? "" : "none";
    if (!bgImg.src.endsWith(bgSrc)) bgImg.src = bgSrc;
    if (api.onTheme) api.onTheme();
    if (!mutePatch.src.endsWith(T.mute)) mutePatch.src = T.mute;
    const gi = gift.querySelector("img"), ri = retry.querySelector("img");
    if (!gi.src.endsWith(T.dir + "btn-gift.webp" + VER)) { gi.src = T.dir + "btn-gift.webp" + VER; ri.src = T.dir + "btn-retry.webp" + VER; }
  }
  function makeShade(img, T) {                   // inner wall of the envelope: flat paper tone, darker at the mouth (depth, no stray crease lines)
    const w = img.open_interior.width, hh = img.open_interior.height;
    const c = document.createElement("canvas"); c.width = w; c.height = hh; const x = c.getContext("2d");
    x.drawImage(img.open_interior, 0, 0);
    x.globalCompositeOperation = "source-atop";
    const g = x.createLinearGradient(0, T.shade.y0, 0, T.shade.y1);
    g.addColorStop(0, T.shade.top); g.addColorStop(1, T.shade.bot);
    x.fillStyle = g; x.fillRect(0, 0, w, hh);
    img.interior_shade = c;
  }

  function pose(t) {
    const u = (t - FLY0) / FLY;
    const e = easeOutBack(u, 0.9);
    const lin = clamp01(u);
    return {
      x: START_X * (1 - e),
      y: START_Y * (1 - e) - 18 * Math.sin(Math.PI * Math.min(lin * 1.25, 1)) * (1 - lin),
      rot: START_ROT * (1 - e),
      sc: START_SCALE + (1 - START_SCALE) * e
    };
  }
  // whole group (envelope + letter): scaled about GP and lifted by GY so it fills the screen above the two buttons
  const GS = 1.17, GP = { x: 201, y: 110 }, GY = -62;
  function flightTransform(p) {
    ctx.translate(0, GY * S); ctx.translate(GP.x * S, GP.y * S); ctx.scale(GS, GS); ctx.translate(-GP.x * S, -GP.y * S);
    ctx.translate((PIV.x + p.x) * S, (PIV.y + p.y) * S);
    ctx.rotate(p.rot); ctx.scale(p.sc, p.sc);
    ctx.translate(-PIV.x * S, -PIV.y * S);
  }
  function envTransform() {
    ctx.translate(ANCH.x * S, ANCH.y * S);
    ctx.rotate(ENV_ROT);
    ctx.translate(-TRa[0] * K, -(TRa[1] + OY) * K);
  }
  function withHinge(s, fn) {
    ctx.save();
    ctx.translate(TLa[0] * K, (TLa[1] + OY) * K);
    ctx.rotate(HINGE_A);
    ctx.scale(1, s);
    ctx.rotate(-HINGE_A);
    ctx.translate(-TLa[0] * K, -(TLa[1] + OY) * K);
    fn();
    ctx.restore();
  }
  function drawEnvelope(p, t, alpha, full) {
    const phi = full ? Math.PI * easeInOut((t - FLAP0) / FLAP) : 0;
    const lp = full ? easeLetter((t - LET0) / LET) : 0;
    const c = smooth01(phi / (40 * Math.PI / 180));
    ctx.save(); ctx.globalAlpha = alpha;
    // ---- back parts: opened flap (behind), the envelope's inside
    ctx.save(); flightTransform(p); envTransform();
    if (phi > 0) {
      if (phi > Math.PI / 2) withHinge(Math.abs(Math.cos(phi)), () => ctx.drawImage(img.open_flap, 0, 0));
      ctx.drawImage(img.open_interior, 0, 0);
      if (img.interior_shade) { ctx.save(); ctx.globalAlpha = alpha * smooth01(phi / (Math.PI * 0.8)); ctx.drawImage(img.interior_shade, 0, 0); ctx.restore(); }
      if (lp <= 0) ctx.drawImage(img.open_panels, 0, 0);
    }
    ctx.restore();
    // ---- letter (screen space, clipped at the envelope's mouth)
    if (lp > 0) {
      ctx.save(); flightTransform(p);
      const TLs = a2s(TLa[0], TLa[1]), TRs = a2s(TRa[0], TRa[1]), BRs = a2s(T.BR[0], T.BR[1]), BLs = a2s(T.BL[0], T.BL[1]);
      const dx = TRs[0] - TLs[0], dy = TRs[1] - TLs[1], n = Math.hypot(dx, dy), dX = dx / n, dY = dy / n;
      const ext = 3000, upX = dY, upY = -dX;
      const P = (x, y) => [x * S, y * S];
      ctx.beginPath();
      const pts = [
        [TLs[0] - ext * dX + ext * upX, TLs[1] - ext * dY + ext * upY],
        [TRs[0] + ext * dX + ext * upX, TRs[1] + ext * dY + ext * upY],
        [TRs[0] + ext * dX, TRs[1] + ext * dY],
        TRs, BRs, BLs, TLs,
        [TLs[0] - ext * dX, TLs[1] - ext * dY]
      ];
      pts.forEach((q, i) => { const [x, y] = P(q[0], q[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath(); ctx.clip();
      ctx.translate(LET_POS.x * S, LET_POS.y * S); ctx.rotate(LET_ROT);
      ctx.translate(0, LET_D * (1 - lp) * S);
      ctx.shadowColor = T.shadowLetter; ctx.shadowBlur = 14 * S; ctx.shadowOffsetY = 3 * S;
      ctx.drawImage(img.letter, -PAD, -PAD);
      ctx.restore();
    }
    // ---- front parts
    ctx.save(); flightTransform(p); envTransform();
    if (lp > 0) {
      ctx.shadowColor = T.shadowPanels; ctx.shadowBlur = 7 * S; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = -1 * S;   // panels cast a soft shadow on the letter
      ctx.drawImage(img.open_panels, 0, 0);
      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    }
    if (c < 1) {
      ctx.save(); ctx.globalAlpha = alpha * (1 - c);
      ctx.drawImage(img.closed_body, 0, 0);
      ctx.restore();
    }
    if (phi <= Math.PI / 2) {
      withHinge(Math.cos(phi), () => {
        ctx.drawImage(img.closed_flap, 0, 0);
        ctx.save(); ctx.globalAlpha = alpha * 0.55 * Math.sin(phi);          // it darkens a little as it turns away
        ctx.drawImage(img.closed_flap_dark, 0, 0);
        ctx.restore();
      });
    }
    ctx.restore();
    ctx.restore();
  }
  function draw(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, CW, CH);                               // the satin background is the <img> underneath
    ctx.translate(PADX * S, PADY * S);
    if (t < FLY0) return;
    const p = pose(t);
    const u = clamp01((t - FLY0) / FLY);
    const speed = Math.max(0, 1 - Math.pow(u, 0.55));
    if (u < 1 && speed > 0.05) {                               // faint motion trail while it flies fast
      for (let k = 3; k >= 1; k--) {
        if (t - k * 26 < FLY0) continue;
        drawEnvelope(pose(t - k * 26), t, 0.16 * speed * (1 - (k - 1) * 0.28), false);
      }
    }
    drawEnvelope(p, t, 1, true);
    ctx.globalAlpha = 1;
  }

  let raf = 0, token = 0, btnTimer = 0, retryTimer = 0, startTimer = 0;
  function clearButtons() {
    clearTimeout(btnTimer); clearTimeout(retryTimer);
    gift.classList.remove("show", "pulse"); retry.classList.remove("show");
  }
  // delayMs: wait before the first frame (so the flight is not hidden under the white fade)
  function play(delayMs, name) {
    const my = ++token;
    if (name) applyTheme(name);
    const th = themeName;
    cancelAnimationFrame(raf); clearTimeout(startTimer); clearButtons();
    api.playing = true;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, CW, CH);
    ensure(th).then(() => {
      if (my !== token) return;
      img = imgs[th];
      startTimer = setTimeout(() => {
        if (my !== token) return;
        const t0 = performance.now();
        let shown = false;
        const tick = (now) => {
          if (my !== token) return;
          const t = now - t0;
          draw(Math.min(t, TOTAL));
          if (!shown && t >= BTN0) {
            shown = true;
            gift.classList.add("show");
            btnTimer = setTimeout(() => { if (my === token) gift.classList.add("pulse"); }, 700);
            retryTimer = setTimeout(() => { if (my === token) retry.classList.add("show"); }, BTN_GAP);
          }
          if (t < TOTAL) raf = requestAnimationFrame(tick); else api.playing = false;
        };
        raf = requestAnimationFrame(tick);
      }, delayMs || 0);
    });
  }
  function stop() {
    token++; cancelAnimationFrame(raf); clearTimeout(startTimer); clearButtons();
    api.playing = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, CW, CH);
  }
  // final pose, no animation (coming back from another screen)
  function showFinal(name) {
    token++; cancelAnimationFrame(raf); clearTimeout(startTimer); clearButtons();
    api.playing = false;
    if (name) applyTheme(name);
    const th = themeName;
    ensure(th).then(() => { img = imgs[th]; draw(TOTAL); gift.classList.add("show", "pulse"); retry.classList.add("show"); });
  }

  gift.addEventListener("click", () => { if (api.onGift) api.onGift(); });
  retry.addEventListener("click", () => { if (api.onRetry) api.onRetry(); });

  api.play = play; api.stop = stop; api.showFinal = showFinal; api.preload = ensure; api.applyTheme = applyTheme; api.draw = (t) => ensure().then(() => { img = imgs[themeName]; draw(t); });
  window.LetterScene = api;
})();
