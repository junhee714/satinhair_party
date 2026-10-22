/*
  첫 화면 인트로 (mp4 대체) — "첫 화면 인트로 새 모션 테스트 v9" 를 게임에 붙인 것.
    1) 분홍 새틴 커튼 배경(assets/intro/curtain.webp)은 <img> 가 보여주고, 이 파일은 그 위 캔버스에 봉투/편지지만 그린다.
    2) 닫힌 봉투가 왼쪽에서 기울어진 채 날아와 자리 잡고, 뚜껑이 정면에서(원근) 열리며, 편지지가 입장 조건 박스까지 올라온다.
    3) 편지지가 멈추면 진짜 버튼 "초대장 받기"(#btnInvite)가 같은 자리에서 활성화된다. 클릭 동작은 script.js 에서 연결 (→ 너드 지나 1).
  API: IntroScene.play() 처음부터 재생 / IntroScene.showEnd() 마지막 장면으로 바로 / IntroScene.stop() 멈춤
  레이어(뒤→앞): 열린 뚜껑 / 봉투 안쪽 / 편지지(+버튼) / 봉투 몸통 / 닫힌 뚜껑(접히는 중)
*/
(() => {
  "use strict";
  const DIR = "assets/intro/", VER = "?v=30";
  const FILES = {
    closed_body: "closed-body.webp", closed_flap: "closed-flap.webp",
    open_flap: "open-flap.webp", open_interior: "open-interior.webp", open_panels: "open-panels.webp",
    letter: "letter.webp", btn: "btn-invite.webp",
  };
  const W = 804, H = 1748, S = 2;                    // the 402x874 frame, drawn at 2x
  let EX = 0, EY = 0, CW = W, CH = H;                // extra canvas margin around the frame (canvas px, each side) so nothing is cut off at the frame edge
  let lastT = -1;
  const cv = document.getElementById("introCanvas"); const ctx = cv.getContext("2d");
  const invite = document.getElementById("btnInvite");

  // ---- timeline (ms)
  // 전체 속도 배율 (data.js 의 introSpeed: 1 = 이전 속도, 1.25 = 25% 빠르게). 아래 값은 1배속 기준 시간(ms)
  const SPD = Math.max(0.5, Math.min(2, (window.GAME_DATA && window.GAME_DATA.introSpeed) || 1));
  const FLY0 = 250 / SPD, FLY = 1350 / SPD;               // envelope flies in from the left and lands
  const FLAP0 = 1480 / SPD, FLAP = 1050 / SPD;            // 봉투가 멈추는 순간(착지 감속 끝자락)에 바로 뚜껑이 열리기 시작             // flap opens (frontal)
  const LET0 = 2150 / SPD, LET = 1950 / SPD;      // 뚝 끊기지 않게: 뚜껑이 70% 쯤 열렸을 때 편지가 스르르 올라오기 시작              // letter is pulled up out of the envelope
  const DROP0 = 2300 / SPD, DROP = 1800 / SPD;            // envelope sinks to the bottom while the letter rises
  const TOTAL = 4150 / SPD;
  const WIND2 = ((window.GAME_DATA && window.GAME_DATA.introWindLetterMs) || 2700) / SPD;   // 2nd wind sound: starts as the flap finishes opening, peaks while the letter is pulled out (ms after the intro starts)
  const START_X = -350, START_Y = -240, START_ROT = 24 * Math.PI / 180, START_SCALE = 1.14;   // like the mp4: enters from the left edge, tilted clockwise, flap pointing down-right

  // ---- envelope layers are pre-scaled by K (frame px -> canvas px); frame = the frontal open envelope photo (1143x1080)
  const K = 0.668;
  const R = 1.097;                                    // vertical stretch used when the layers were built
  const PVT = { x: 571.5 * K, y: 743 * R * K };           // pivot = centre of the envelope body (layer px)
  const HING = 409 * R * K;                               // hinge line (layer px)
  const PIV_OFF = (743 - 409) * R * K / S;                // hinge -> pivot, design px
  const ENV_CX = 201, ENVW = 1133 * K / S, ENVH = (1077 - 409) * R * K / S;   // centre x / width / body height of the envelope (design px)
  const HY0 = 385, HY1 = 509;
  const LC = 356.93043600000004, LO = 299.045564, DCAM = 2500;       // flap lengths (layer px, hinge -> tip) and camera distance for the fold's perspective                         // hinge y: when it lands / when the letter is out (design px)

  // ---- letter (design px): width 330, final top 175 (upright, centred)
  const LW = 356, LET_X = (402 - LW) / 2, LET_TOP = 174, LET_PEEK = 110, PAD = 2;   // LET_PEEK: 편지가 처음에 봉투 입구 아래로 깊이 숨어 있다가 스르르 올라옴 (이전 14 는 시작하자마자 하얀 조각이 툭 나타났음)
  // button on the letter (design px, relative to the letter's top): 162.6 x 41.8, under the "입장 조건" box
  const BW = 138.2, BH = 35.6, BTN_DY = 350.8;
  const BS = 1.0;                                       // the button is drawn / shown 1.0x about its centre (keep in sync with HOTSPOT_RECTS.introInvite)
  const BTN_IMG_W = 770 / 5.1955, BTN_IMG_H = 237 / 5.1955, BTN_PAD = 26 / 5.1955;   // button image carries its own soft shadow (baked in), so the canvas copy and the real button are pixel-identical
  let btnLive = false;                                  // true once the real <button> has taken over from the canvas copy        // centre of the blank margin under the 입장 조건 box (box bottom y457 .. ornaments y552 -> centre 507)

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const easeOutBack = (u, s = 0.8) => { u = clamp01(u) - 1; return 1 + u * u * ((s + 1) * u + s); };
  const easeInOut = (u) => { u = clamp01(u); return 0.5 - 0.5 * Math.cos(Math.PI * u); };
  const easeLetter = (u) => { u = clamp01(u); const a = 0.5 - 0.5 * Math.cos(Math.PI * u); return 0.82 * a + 0.18 * (1 - Math.pow(1 - u, 2.4)); };   // 시작은 부드럽게(속도 0 에서 출발), 끝은 천천히 멈춤
  const smooth01 = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
  const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
  let img = {};

  function makeShade() {                       // inner wall: flat paper tone, a bit darker towards the mouth
    const w = img.open_interior.width, hh = img.open_interior.height;
    const c = document.createElement("canvas"); c.width = w; c.height = hh; const x = c.getContext("2d");
    x.drawImage(img.open_interior, 0, 0);
    x.globalCompositeOperation = "source-atop";
    const g = x.createLinearGradient(0, 295, 0, 505);
    g.addColorStop(0, "rgb(224,186,196)"); g.addColorStop(1, "rgb(234,200,208)");
    x.fillStyle = g; x.fillRect(0, 0, w, hh);
    img.interior_shade = c;
    // opened flap: flat paper tone (no fold shadow band), lightest at the tip and exactly the interior's tone at the hinge -> no visible hinge line
    const fw = img.open_flap.width, fh = img.open_flap.height;
    const f = document.createElement("canvas"); f.width = fw; f.height = fh; const fx = f.getContext("2d");
    fx.drawImage(img.open_flap, 0, 0);
    fx.globalCompositeOperation = "source-atop";
    const gf = fx.createLinearGradient(0, HING - LO, 0, HING + 2);
    gf.addColorStop(0, "rgb(228,194,201)"); gf.addColorStop(1, "rgb(224,186,196)");
    fx.fillStyle = gf; fx.fillRect(0, 0, fw, fh);
    img.flap_shade = f;
  }

  function pose(t) {
    const u = clamp01((t - FLY0) / FLY);
    const ex = 1 - Math.pow(1 - u, 2.6);                       // glides in fast, decelerates
    const er = easeOutBack(u, 0.9);                            // tilt unwinds with a tiny overshoot
    const ey = 1 - Math.pow(1 - u, 2.0);
    return {
      x: START_X * (1 - ex),
      y: START_Y * (1 - ey),
      rot: START_ROT * (1 - er),
      sc: 1 + (START_SCALE - 1) * (1 - ex)
    };
  }
  function hingeY(t) { return HY0 + (HY1 - HY0) * easeInOut((t - DROP0) / DROP); }
  function envTransform(p, hy) {
    ctx.translate((ENV_CX + p.x) * S, (hy + PIV_OFF + p.y) * S);
    ctx.rotate(p.rot); ctx.scale(p.sc, p.sc);
    ctx.translate(-PVT.x, -PVT.y);
  }
  // frontal fold with perspective: the flap swings about the hinge (y = HING) through the viewer's side;
  // every row of the flap gets its own screen height and width scale (strips).
  const STRIP = 2;
  const flapCan = document.createElement("canvas"); flapCan.width = CW; flapCan.height = CH; const flapCtx = flapCan.getContext("2d"); flapCtx.imageSmoothingQuality = "high";
  function foldFlap(c, layer, open, phi) {
    const w = layer.width, hh = layer.height;
    const L = open ? LC + (LO - LC) * clamp01((phi - Math.PI / 2) / (Math.PI / 2)) : LC;
    const cs = Math.cos(phi), sn = Math.sin(phi);
    const map = (y) => {                                           // layer row -> {screen y, width scale}
      const d = open ? (HING - y) : (y - HING);
      const f = d / (open ? LO : LC);
      const dd = f * L;
      const z = dd * sn;
      const sc = DCAM / (DCAM - z);
      return { y: PVT.y + (HING + dd * cs - PVT.y) * sc, sc };
    };
    const y0 = open ? 0 : 0, y1 = open ? Math.ceil(HING) + 1 : hh;
    for (let y = y0; y < y1; y += STRIP) {
      const hs = Math.min(STRIP, y1 - y);
      const a = map(y), b = map(y + hs), m = map(y + hs / 2);
      const dh = b.y - a.y; if (dh < 0.02) continue;
      const dw = w * m.sc;
      c.drawImage(layer, 0, y, w, hs, PVT.x + (0 - PVT.x) * m.sc, a.y, dw, dh + 0.7);
    }
  }
  const FW = 0.10;                                                  // (rad) 뚜껑이 수직이 되는 지점 앞뒤로 앞/뒷면을 겹쳐 바꾸는 폭
  function drawEnvelope(p, t, alpha, full) {
    const hy = full ? hingeY(t) : HY0;
    const phi = full ? Math.PI * easeInOut((t - FLAP0) / FLAP) : 0;
    const lp = full ? easeLetter((t - LET0) / LET) : 0;
    ctx.save(); ctx.globalAlpha = alpha;
    // ---- back parts: opened flap (behind), the envelope's inside
    ctx.save(); envTransform(p, hy);
    if (phi > 0) {
      if (phi > Math.PI / 2 - FW) {                                // 뚜껑이 수직(옆면)이 되는 순간 앞면→뒷면이 뚝 바뀌지 않게 서로 겹쳐서 바꿔 줌
        const oa = smooth01((phi - (Math.PI / 2 - FW)) / (2 * FW));
        ctx.save(); ctx.globalAlpha = alpha * oa; foldFlap(ctx, img.flap_shade, true, phi); ctx.restore();
      }
      // the inside starts exactly at the hinge: its top edge must never peek out above the lifting flap (that was the thin band along the top edge)
      const lift = 4 * (1 - smooth01((phi - Math.PI / 3) / (Math.PI / 6)));
      ctx.save(); ctx.beginPath(); ctx.rect(-20, HING + lift, img.open_interior.width + 40, img.open_interior.height + 40); ctx.clip();
      ctx.save(); ctx.globalAlpha = alpha * smooth01(phi / 0.12); ctx.drawImage(img.open_interior, 0, 0); ctx.restore();
      ctx.save(); ctx.globalAlpha = alpha * smooth01(phi / (Math.PI * 0.8)); ctx.drawImage(img.interior_shade, 0, 0); ctx.restore();
      ctx.restore();
    }
    ctx.restore();
    // ---- letter + button (screen space, clipped at the envelope's mouth)
    if (lp > 0) {
      const e = lp;
      const top = hy + LET_PEEK - (HY1 + LET_PEEK - LET_TOP) * e;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, hy * S);                                              // everything above the hinge line
      ctx.rect((ENV_CX - ENVW / 2) * S, hy * S, ENVW * S, ENVH * S);         // and whatever is inside the envelope body (never below its bottom edge)
      ctx.clip();
      ctx.shadowColor = "rgba(100,36,64,0.34)"; ctx.shadowBlur = 14 * S; ctx.shadowOffsetY = 3 * S;
      ctx.drawImage(img.letter, LET_X * S - PAD, top * S - PAD);
      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      if (!btnLive) {                                                          // button rides on the letter until the real button takes over
        const ba = smooth01((lp - 0.3) / 0.5);
        if (ba > 0) {
          ctx.globalAlpha = alpha * ba;
          ctx.drawImage(img.btn, (LET_X + LW / 2 - (BW / 2 + BTN_PAD) * BS) * S, (top + BTN_DY + BH / 2 - (BH / 2 + BTN_PAD) * BS) * S, BTN_IMG_W * BS * S, BTN_IMG_H * BS * S);
        }
      }
      ctx.restore();
    }
    // ---- front parts: body (one layer, one set of creases), then the closing flap
    ctx.save(); envTransform(p, hy);
    const shA = full ? smooth01((t - LET0) / (LET * 0.22)) : 0;     // 몸통 그림자도 편지가 올라오기 시작할 때 툭 생기지 않고 서서히 진해짐
    if (shA > 0) {
      ctx.shadowColor = "rgba(95,40,65," + (0.26 * shA).toFixed(3) + ")"; ctx.shadowBlur = 7 * S; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = -1 * S;
    }
    // closed: the ORIGINAL closed-envelope photo (body + flap, nothing else on top -> no doubled lines).
    // as the flap starts to lift the body hands over to the opened-envelope body (closed body fades out over the first ~8 degrees, on top of a solid body so nothing shows through)
    const hand = smooth01(phi / (8 * Math.PI / 180));
    if (hand >= 1) {
      ctx.drawImage(img.open_panels, 0, 0);
    } else if (hand > 0) {                                           // 닫힌 몸통 위에 열린 몸통을 서서히 덮어 가며 바꿈 (가장자리 선이 툭 바뀌지 않게)
      ctx.save(); ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.drawImage(img.closed_body, 0, 0);
      ctx.globalAlpha = alpha * hand; ctx.drawImage(img.open_panels, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(img.closed_body, 0, 0);
    }
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    if (phi <= Math.PI / 2 + FW) {
      if (phi === 0) {
        ctx.drawImage(img.closed_flap, 0, 0);
      } else {
        // draw the folding flap on a scratch canvas (same transform), tint it a little as it turns away, then composite once (no strip banding)
        const m = ctx.getTransform();
        flapCtx.setTransform(1, 0, 0, 1, 0, 0); flapCtx.globalCompositeOperation = "source-over"; flapCtx.clearRect(0, 0, CW, CH);
        flapCtx.setTransform(m);
        foldFlap(flapCtx, img.closed_flap, false, phi);
        flapCtx.setTransform(1, 0, 0, 1, 0, 0);
        flapCtx.globalCompositeOperation = "source-atop"; flapCtx.fillStyle = "rgba(120,48,84," + (0.26 * Math.sin(phi)).toFixed(3) + ")"; flapCtx.fillRect(0, 0, CW, CH);
        const ca = 1 - smooth01((phi - (Math.PI / 2 - FW)) / (2 * FW));       // 수직 근처에서 앞면 뚜껑이 서서히 사라짐
        const k0 = smooth01(phi / 0.06);                                       // 열리기 시작하는 첫 프레임: 원본 사진 → 접히는 뚜껑으로 서서히 바뀜
        if (k0 < 1) ctx.drawImage(img.closed_flap, 0, 0);
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha * ca * k0; ctx.drawImage(flapCan, 0, 0); ctx.restore();
      }
    }
    ctx.restore();
    ctx.restore();
  }
  function draw(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, CW, CH);
    lastT = t;
    if (t < FLY0) return;
    ctx.setTransform(1, 0, 0, 1, EX, EY);                  // everything below is drawn in frame coordinates
    const p = pose(t);
    const u = clamp01((t - FLY0) / FLY);
    const speed = Math.max(0, 1 - Math.pow(u, 0.55));
    if (u < 1 && speed > 0.05) {                           // faint motion trail while it flies fast
      for (let k = 3; k >= 1; k--) {
        if (t - k * 28 < FLY0) continue;
        drawEnvelope(pose(t - k * 28), t, 0.16 * speed * (1 - (k - 1) * 0.28), false);
      }
    }
    drawEnvelope(p, t, 1, true);
    ctx.globalAlpha = 1;
  }


  let raf = 0, token = 0, pulseTimer = 0, ready = null;
  function preload() {
    if (ready) return ready;
    ready = Promise.all(Object.keys(FILES).map((k) => new Promise((res) => {
      const i = new Image();
      i.onload = () => { img[k] = i; res(); };
      i.onerror = () => res();
      i.src = DIR + FILES[k] + VER;
    }))).then(() => { if (img.open_interior && img.open_flap) makeShade(); ctx.imageSmoothingQuality = "high"; });
    return ready;
  }
  function stop() { token++; cancelAnimationFrame(raf); raf = 0; clearTimeout(pulseTimer); }
  function hideButton() { btnLive = false; invite.classList.remove("show", "pulse"); }
  function showButton(pulseNow) {
    btnLive = true;
    invite.classList.add("show");
    clearTimeout(pulseTimer);
    if (pulseNow) invite.classList.add("pulse"); else pulseTimer = setTimeout(() => invite.classList.add("pulse"), 600);
  }
  function play() {
    stop(); hideButton();
    const my = token;
    preload().then(() => {
      if (my !== token) return;
      if (!img.open_panels) { ctx.clearRect(0, 0, CW, CH); showButton(true); return; }   // art failed to load: never block the game
      const t0 = performance.now();
      if (api.onStart) api.onStart();                      // (the game plays the wind sound here)
      let shown = false, wind2 = false;
      const tick = (now) => {
        if (my !== token) return;
        const t = now - t0;
        if (!wind2 && t >= WIND2) { wind2 = true; if (api.onLetter) api.onLetter(); }   // (the game plays the second wind sound here)
        if (!shown && t >= LET0 + LET) { shown = true; showButton(false); }           // letter stopped: the real button takes over in the same frame (same spot, same pixels)
        draw(Math.min(t, TOTAL));
        if (t < TOTAL) raf = requestAnimationFrame(tick); else raf = 0;
      };
      raf = requestAnimationFrame(tick);
    });
  }
  // coming back with "뒤로 가기": no need to replay — park on the final scene with the button ready
  function showEnd() {
    stop(); hideButton();
    const my = token;
    preload().then(() => {
      if (my !== token) return;
      showButton(true);
      if (img.open_panels) draw(TOTAL); else ctx.clearRect(0, 0, CW, CH);
    });
  }
  // Called by script.js whenever the scene is laid out: sc = css px per design px, left/top = where the 402x874 frame sits in the scene.
  // The canvas is made big enough to reach the scene edges, so the envelope flies in from the real screen edge instead of being cut at the frame.
  const layerEl = document.getElementById("introLayer");
  function layout(o) {
    const exd = Math.min(260, Math.max(0, Math.ceil(o.left / o.sc) + 2)), eyd = Math.min(260, Math.max(0, Math.ceil(o.top / o.sc) + 2));
    const nex = exd * S, ney = eyd * S;
    layerEl.style.left = "0px"; layerEl.style.top = "0px"; layerEl.style.width = `${o.boxW}px`; layerEl.style.height = `${o.boxH}px`;
    cv.style.left = `${o.left - exd * o.sc}px`; cv.style.top = `${o.top - eyd * o.sc}px`;
    cv.style.width = `${(402 + 2 * exd) * o.sc}px`; cv.style.height = `${(874 + 2 * eyd) * o.sc}px`;
    if (nex !== EX || ney !== EY) {
      EX = nex; EY = ney; CW = W + 2 * EX; CH = H + 2 * EY;
      cv.width = CW; cv.height = CH; flapCan.width = CW; flapCan.height = CH;
      ctx.imageSmoothingQuality = "high";
      if (img.open_panels && lastT >= 0 && !raf) draw(lastT);
    }
  }
  const api = { play, showEnd, stop, preload, layout, onStart: null, onLetter: null };
  window.IntroScene = api;
  preload();
})();
