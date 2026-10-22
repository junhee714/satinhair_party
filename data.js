/*
  ============================================================================
  GAME CONTENT DATA
  ============================================================================
  The route/style screens are now driven by full composite photos you supply
  (character + background + item cards + the top-left control icons, all
  baked into one 402x874 image). The engine just:
    1. shows the right image for the current state, and
    2. lays invisible buttons exactly on top of the baked-in cards/icons.

  HOTSPOT_RECTS below are the shared click zones, as fractions (0-1) of the
  ORIGINAL 402x874 canvas. They were measured directly against the images
  you sent, and are reused across every screen because your composites all
  share the same layout (top-left icon row, bottom-left/right item cards).
  If a future screen uses a different layout, add a new rect key here rather
  than changing these.
  ============================================================================
*/

window.HOTSPOT_RECTS = {
  ctrlBack: { x: 0.087065, y: 0.038902, w: 0.119403, h: 0.054920 },
  ctrlMute: { x: 0.281095, y: 0.038902, w: 0.119403, h: 0.054920 },
  ctrlUndo: { x: 0.475124, y: 0.038902, w: 0.119403, h: 0.054920 },
  cardLeft:  { x: 0.034826, y: 0.749428, w: 0.450249, h: 0.223112 },
  cardRight: { x: 0.514925, y: 0.749428, w: 0.450249, h: 0.223112 },
  // ---- 너드 지나 스토리 화면 (1675x3642 원본 이미지에서 실측, 0~1 비율) ----
  storyFull:      { x: 0, y: 0, w: 1, h: 1 },
  // 와이드 캔버스(520x874) 전체: 기준 화면(402x874) 좌우로 여분 배경(bleed)이 있는 그림 위에 얹는 레이어용
  storyWide:      { x: -0.146766, y: 0, w: 1.293532, h: 1 },
  storyBack:      { x: 0.0917, y: 0.0405, w: 0.1240, h: 0.0580 },
  storyMute:      { x: 0.2500, y: 0.0405, w: 0.1240, h: 0.0580 },
  storyUndo:      { x: 0.3986, y: 0.0405, w: 0.1240, h: 0.0580 },
  storyCardL:     { x: 0.1821, y: 0.7545, w: 0.3099, h: 0.2210 },   // 블라썸 던 (분홍 튜브)
  storyCardR:     { x: 0.5069, y: 0.7543, w: 0.3093, h: 0.2213 },   // 선셋 허니 (노랑 튜브)
  // 음악 아이콘의 '사선'을 가려주는 패치 (음악 재생 중일 때 보임)
  storyMutePatch: { x: 0.238806, y: 0.035695, w: 0.149254, h: 0.068644 },
  // 편지 화면의 선물받기 / 다시하기 버튼 (145x42px, 가로 가운데, 145x42px)
  letterLayer: { x: -0.397985, y: -0.068650, w: 1.795970, h: 1.137300 },   // 편지 캔버스 (기준 화면보다 사방으로 PAD 만큼 큼: letter.js PADX 160 / PADY 60)
  letterIcons: { x: -0.024397, y: 0.049969, w: 0.469778, h: 0.073307 },
  letterOrn: { x: -0.146766, y: 0, w: 1.293532, h: 1 },   // 편지 화면 네 모서리 장식 (다른 장면과 같은 위치: 와이드 그림 전체 = 520x874)   // 편지 화면 위쪽 동그란 아이콘 3개 (블썸, 402x874 기준 비율)
  letterGift:  { x: 0.29801, y: 0.77513, w: 0.40398, h: 0.05382 },
  letterRetry: { x: 0.29801, y: 0.84643, w: 0.40398, h: 0.05382 },
  // 첫 화면 인트로의 '초대장 받기' 버튼: 편지지의 입장 조건 박스 아래, 봉투 입구 안쪽 여백 (138.2x35.5px / 402x874). 선물받기 버튼(145x42)보다 약간 작게
  introInvite: { x: 0.31567, y: 0.594733, w: 0.36866, h: 0.052174 },   // 버튼 본체 138.2x35.6 + 둘레 5px 그림자 여백 (이미지에 그림자가 구워져 있음)
};

window.GAME_DATA = {
  // 첫 화면(봉투+편지지)의 크기: 1 = 화면 폭에 거의 꽉 참(402 기준 원래 디자인), 작을수록 좌우 여백이 커짐 (지금 0.88)
  introScale: 0.88,
  // 첫 화면 두 번째 바람 소리(봉투가 열리고 편지지를 꺼낼 때)가 시작되는 시점 — 인트로 시작 후 ms (편지지가 올라오기 시작하는 3050ms 보다 약간 앞)
  introWindLetterMs: 2700,
  // 첫 화면 인트로(봉투가 날아와 열리고 편지지가 올라오는 모션) 전체 속도: 1 = 원래 속도, 1.25 = 25% 빠르게, 1.5 = 50% 빠르게
  introSpeed: 1.3,
  // 2번째 버튼으로 끄고 켤 수 있어요. 파일이 없으면 조용히 무시됩니다.
  // 배경음악 (왼쪽 위 ♪ 버튼으로 끄고 켬).  intro = 첫 화면(초대장), story = 너드 지나부터 편지 화면 직전까지.
  //   fadeInMs / fadeOutMs : 페이드 시간(ms).  story.fadeOutMs 는 마지막 화면(선물받기/다시하기)에 들어갈 때의 페이드아웃,
  //   switchFadeMs : 다른 곡으로 넘어가며 이전 곡이 사라지는 시간 (뒤로 가기 등)
  music: {
    intro: { src: "assets/audio/intro-bgm.mp3?v=30", volume: 0.7, fadeInMs: 2000, fadeOutMs: 1200 },
    story: { src: "assets/audio/story-bgm.mp3?v=30", volume: 0.7, fadeInMs: 2500, fadeOutMs: 4500 },
    switchFadeMs: 900,
  // 효과음 (♪ 음악 끄기 상태에서는 함께 꺼집니다).  volume 0~1, 파일은 assets/audio/sfx/
  //   click: 너드 지나부터 모든 버튼   magic: 루트 선택(블라썸1/선셋1) · 변신(11, 18)   comb: 꼬리빗 선택
  //   shine: 커튼이 닫혔다 열릴 때(커튼 속도에 맞춰 1.9초)   wind: 편지 화면에서 초대장이 날아올 때(날아오는 속도에 맞춘 바람)
  sfx: {
    click: { src: "assets/audio/sfx/click.mp3?v=30", volume: 0.6 },
    magic: { src: "assets/audio/sfx/magic.mp3?v=30", volume: 0.8 },
    comb:  { src: "assets/audio/sfx/comb.mp3?v=30",  volume: 0.9 },
    shine: { src: "assets/audio/sfx/shine.mp3?v=30", volume: 0.8 },
    wind:  { src: "assets/audio/sfx/wind.mp3?v=30",  volume: 1.0, delayMs: 100 },   // delayMs: 편지 화면의 흰 페이드가 걷히며 날아오는 모습이 보이는 시점에 맞춤
    glow:  { src: "assets/audio/sfx/glow.mp3?v=30",  volume: 0.8 },
    stick: { src: "assets/audio/sfx/stick2.mp3?v=57", volume: 1.0 },                // 블썸 17: 카드가 앞에서 날아와 뒤로 붙을 때 (쉬잉 + 톡)                 // 머리 반짝임(고데기로 빗은 뒤) 효과 때
  },
  crossFadeMs: 1800,          // "초대장 받기" → 너드 지나: 첫 곡이 사라지는 시간 (두 번째 곡 페이드인과 겹침)
  },

  // 화면 전환 베일: 흰색으로 은은하게 (peak = 가장 진할 때의 투명도 0~1)
  transition: { color: "#ffffff", peak: 0.85, inMs: 280, outMs: 480 },
  // 너드지나 → 블썸지나 1 로 넘어갈 때만 쓰는 부드러운 페이드 (완전히 하얘졌다가 천천히 걷힘)
  //   inMs 하얘지는 시간 / holdMs 하얀 상태 유지(이때 화면 교체) / outMs 걷히는 시간
  //   textDelayMs 걷히기 시작한 뒤 자막 첫 글자까지 / petalDelayMs 걷히기 시작한 뒤 꽃잎 모션 시작까지
  softTransitionFast: { peak: 1, inMs: 300, holdMs: 40, outMs: 420, textDelayMs: 0, petalDelayMs: 0, fxDelayMs: 120 },
  softTransition: { peak: 1, inMs: 520, holdMs: 140, outMs: 950, textDelayMs: 420, petalDelayMs: 90 },

  // 초대장 받기 → 너드 지나 → (블라썸 던 선택) → 블라썸 지나 스토리.
  story: {
    fadeMs: 380,            // 화면 간 크로스페이드
    hoverFadeMs: 110,       // 카드에 마우스를 올렸을 때 눌림 효과 전환
    pressHoldMs: 220,       // 카드를 누른 뒤 눌린 모습을 보여주고 넘어가기까지
    endToast: "다음 화면 이미지를 기다리는 중이에요",
    // 마지막 화면 "선물받기" 버튼을 누르면 새 탭으로 열리는 주소
    giftUrl: "https://narka.co.kr/product/detail.html?product_no=135#none",
    // 1-2 / 3-4 는 사용자가 탭하기 전까지 두 포즈를 번갈아 보여주며 좌우로 흔들림
    sway: { holdMs: 520, fadeMs: 150 },
    // 자막 타자기: 글자 하나당 ms, 띄어쓰기 때 추가 대기, 줄바꿈 대기, 글자 페이드인
    typing: { glyphMs: 34, spaceMs: 38, lineGapMs: 90, fadeInMs: 60, startDelayMs: 80, afterFadeMs: 380 },

    // 블라썸 1: 꽃잎·장미가 자연스럽게 움직이다 사라짐 (움직임 1.5~2.1초 + 시작 시차)
    petals: { driftMinMs: 1500, driftMaxMs: 2100, commonMs: 1700, staggerMs: 260 },
    // 블라썸 4·5 (오답): 빠직 마크가 팝! 하고 나타난 뒤 계속 쿵쿵 흔들림 (loopMs = 한 번 왕복)
    marks: { popMs: 420, staggerMs: 150, startDelayMs: 160, loopMs: 1040 },
    // 블라썸 9: 머리 광택(밝은 띠)이 위에서 아래로 머리를 따라 도는 모션 — 자막이 처음 나올 때 함께 시작.
    //  startDelayMs 시작 대기(자막 시작 기준), sweepMs 한 번 훑는 시간, gapMs 사이 쉬는 시간, passes 반복 횟수,
    //  from/to 띠의 위치(그림 높이 %), strength 밝기(0~1), holdAfterMs 끝난 뒤 머무는 시간
    gloss: { startDelayMs: 0, sweepMs: 1500, gapMs: 250, passes: 1, from: 12, to: 66, strength: 0.5, holdAfterMs: 900 },

    // 화면 이미지 (assets/scenes/<key>.webp). 블라썸 7번(눌린 카드)은 이미지 대신 카드 패치로 처리해서 없음.
    images: [
      "nerd-1", "nerd-2", "nerd-3", "nerd-4", "nerd-5", "nerd-6", "nerd-7",
      "bl-1", "bl-2", "bl-3", "bl-4", "bl-5", "bl-8a", "bl-8b", "bl-9", "bl-10",
      "bl-12", "bl-12bg", "bl-13", "bl-15", "bl-15d", "bl-16", "bl-16p", "bl-19", "bl-19c", "bl-20", "bl-22", "bl-23", "bl-24",
      "sw-1", "sw-2", "sw-3", "sw-4", "sw-5", "sw-8a", "sw-8b", "sw-9", "sw-10",   // 선셋 허니 루트 (와이드)
      "sw-12", "sw-12bg", "sw-13", "sw-15b", "sw-15c", "sw-16",                         // 선셋 11~16 (드레스룸, 와이드)
      "sw-19n", "sw-19cn", "sw-20", "sw-22", "sw-23", "sw-24",                             // 선셋 18~24 (와이드)
    ],
    // 와이드 캔버스 그림: 가로로 여분 배경(bleed)이 있는 이미지.  canvasW = 그림 전체 폭, frameX = 기준 화면(402x874)이 시작하는 x 위치 (그림 단위)
    //  → 기준 화면(402x874)은 지금까지처럼 화면에 맞추고, 그 바깥의 여분 배경은 화면 가장자리까지 이어서 보여줍니다.
    wide: { canvasW: 520, frameX: 59, keys: ["nerd-1", "nerd-2", "nerd-3", "nerd-4", "nerd-5", "nerd-6", "nerd-7",
                                                 "bl-1", "bl-2", "bl-3", "bl-4", "bl-5", "bl-8a", "bl-8b", "bl-9", "bl-10", "bl-12", "bl-12bg", "bl-13", "bl-15", "bl-15d", "bl-16", "bl-16p", "bl-19", "bl-19c", "bl-20", "bl-22", "bl-23", "bl-24",
                                                 "sw-1", "sw-2", "sw-3", "sw-4", "sw-5", "sw-8a", "sw-8b", "sw-9", "sw-10", "sw-12", "sw-12bg", "sw-13", "sw-15b", "sw-15c", "sw-16", "sw-19n", "sw-19cn", "sw-20", "sw-22", "sw-23", "sw-24"] },
    // 루트별 설정: fill = 와이드 화면 옆 배경을 만들 때 쓰는 이미지, mute = 음악 아이콘 사선 가림 패치
    routes: {
      // nerd: 넓은 그림(와이드 캔버스)을 쓰는 루트. rects = 이 루트에서만 쓰는 버튼/카드 위치 (402x874 기준 0~1 비율; 위의 HOTSPOT_RECTS 를 덮어씀)
      nerd:    { prefix: "nerd", fill: "nerd-1", wide: true, mute: "assets/scenes/mute-on-patch-nerd.png?v=30",
                 rects: { storyBack: { x: -0.002908, y: 0.059857, w: 0.121175, h: 0.054091 },
                          storyMute: { x: 0.152292, y: 0.059857, w: 0.120578, h: 0.054091 },
                          storyUndo: { x: 0.303911, y: 0.059857, w: 0.120578, h: 0.054091 },
                          storyMutePatch: { x: 0.152292, y: 0.059857, w: 0.120578, h: 0.054091 },
                          storyCardL: { x: 0.165425, y: 0.75453, w: 0.327114, h: 0.221307 },
                          storyCardR: { x: 0.506268, y: 0.754256, w: 0.3104, h: 0.221582 } } },
      // blossom: 블썸 1~10 (와이드 그림). 버튼/카드 위치는 너드 루트와 같은 템플릿이라 rects 를 그대로 씁니다.
      blossom: { prefix: "bl",   fill: "bl-3",   wide: true, mute: "assets/scenes/mute-on-patch-pink2.png?v=31", rects: null },
      party:   { prefix: "bl",   fill: "bl-13",  wide: true, mute: "assets/scenes/mute-on-patch-pink2.png?v=31", rects: null },   // 블썸 12~20 (드레스룸, 와이드)
      sunset:  { prefix: "sw",   fill: "sw-3",   wide: true, mute: "assets/scenes/mute-on-patch-gold2.png?v=46", rects: null },   // 선셋 허니 루트 (와이드)
      sparty:  { prefix: "sw",   fill: "sw-13",  wide: true, mute: "assets/scenes/mute-on-patch-gold2.png?v=46", rects: null },   // 선셋 11~16 (드레스룸, 와이드)
      shall:   { prefix: "sw",   fill: "sw-22",  wide: true, mute: "assets/scenes/mute-on-patch-gold2.png?v=46", rects: null },   // 선셋 22~24 (파티장, 와이드)
      hall:    { prefix: "bl",   fill: "bl-22",  wide: true, mute: "assets/scenes/mute-on-patch-pink2.png?v=31", rects: null },   // 블썸 22~24 (파티장, 와이드)
    },
    // 블썸 11: "지나 뒤 변신 효과" (behind-transform test v7). 자막 없이 반짝임 소용돌이가 지나 뒤→앞으로 훑고 사라지면 자동으로 다음 화면.
    //  delayMs  흰 페이드가 걷히기 시작한 뒤 효과 시작까지 / strength 반짝임 세기 / totalMs 효과 전체 길이
    //  afterFx: 반짝임이 끝난 직후 다음 화면(자막)이 올라오는 속도 (크로스페이드 ms / 타자 시작 대기 ms)
    afterFx: { fadeMs: 180, textDelayMs: 40 },
    //  sparkleStyle: "classic" = 선셋 18→19 에서 쓰던 반짝임(나선 빛이 지나 뒤에서 피어오르고 빛줄기가 한 번 훑고 지나감, 2.2초) 을 모든 변신에 사용.  "new" = 나선 빛 올라가며 사라지는 효과(아래 sparkle 설정)
    sparkleStyle: "classic",
    //  pouchCard: 블썸 17(스크런치 자막) — 자막이 올라올 때 카드 사진이 "앞에서 날아와 지나 뒤로 붙는" 모션.
    //   pouchCards: 장면별(스텝에 pouch: "키") 카드 그림·최종 위치 rect(402x874 기준 비율)·char(지나 누끼: 카드가 지나 '뒤'에 오도록 위에 한 장 더 덮음)·clipTop·처음 위치/기울기.  pouchCard: 공통 모션 값 (charRect = 와이드 그림 전체)
    //   delayMs 반짝임이 끝난 뒤 카드가 날아오기까지 / textAfterMs 카드가 날아오기 시작한 뒤 자막 시작까지 (순서: 반짝임 → 카드 → 자막) / clipTop(장면별) 자막 상자 윗선(그림 높이 0~1) — 카드·지나 다리가 이 선 아래(자막 상자)로 내려오지 않게 자름 / durMs 전체 시간 / startScale·startX·startY 처음 크기(앞)·중심 위치(화면 비율) / startRot 처음 기울기(도)
    //   sinkAt 뒤로 쑥 들어가는 시점(0~1)·sinkScale 그때 크기 / frontOffAt~frontOnAt 지나가 카드 앞으로 올라오는 구간(0~1)
    pouchCards: {
      // 블썸 17 (스크런치 자막)
      p15: { src: "assets/fx/bl-pouchcard.webp?v=52", rect: { x: -0.0662, y: 0.12655, w: 0.5527, h: 0.3162 },
             char: "assets/fx/w4-char14b.webp?v=50", clipTop: 0.565, startX: 0.52, startY: 0.56, startRot: 10 },
      // 블썸 21 (파우치 자막)
      p19: { src: "assets/fx/bl-pouchcard19b.webp?v=64", rect: { x: 0.44366, y: 0.25181, w: 0.7215, h: 0.35512 },
             char: "assets/fx/w4-char18.webp?v=45", clipTop: 0.598, startX: 0.48, startY: 0.56, startRot: -10 },
      // 선셋 17 (스크런치 자막) / 선셋 21 (파우치 자막)
      sp15: { src: "assets/fx/sw-pouchcard17.webp?v=55", rect: { x: -0.14677, y: 0.14332, w: 0.70974, h: 0.33551 },
              char: "assets/fx/sw-char14.webp?v=46", clipTop: 0.565, startX: 0.52, startY: 0.56, startRot: 10 },
      sp19: { src: "assets/fx/sw-pouchcard21b.webp?v=64", rect: { x: 0.5224, y: 0.262, w: 0.4882, h: 0.2798 }, anchorRight: true, visRight: 0.968, edgeMargin: 0.025,
              char: "assets/fx/sw-char18b.webp?v=55", clipTop: 0.598, startX: 0.48, startY: 0.56, startRot: -10 },
    },
    pouchCard: { charRect: { x: -0.146766, y: 0, w: 1.293532, h: 1 },
                 delayMs: 60, durMs: 1500, textAfterMs: 1350, textFadeMs: 130, textGlyphMs: 25, startScale: 1.7,
                 sinkAt: 0.66, sinkScale: 0.94, frontOffAt: 0.5, frontOnAt: 0.74, sfx: "stick" },
    //  routeStart: 너드 지나 5 의 카드(go:"@...")를 누르면 처음 들어가는 화면
    routeStart: { "@blossom": "bl1", "@sunset": "sn1" },
    // 블썸 11 (와이드 반짝임 그림): 빛이 차오르고(bloomMs) → 밝은 띠가 아래→위로 한 번 훑고(bandMs, 그림 높이 비율 bandFrom→bandTo, 폭 bandHalf) → 사라짐(fadeMs).  totalMs 는 아래 transform 과 같이 씀
    //  baseGain 빛 전체 세기(1 = 디자인 원본 밝기), bandGain 띠가 지나갈 때 더해지는 밝기
    sparkle: { sfxDelayMs: 40, totalMs: 1700, bloomDelayMs: 220, bloomMs: 650, strength: 0.9,
               //  첨부한 나선 빛(assets/fx/sparkle-light.webp)을 지나 '뒤'에만 깔고, 빛 한 줄기가 아래→위로 훑고(band*), 위로 지워지며 사라짐(wipeMs).
               //  layout = 나선 그림 안에서 고리가 시작/끝나는 높이 비율(loopsTop/Bot)·중심축(axisX)·가로 늘림(widthK). 각 화면의 spiral{cx,top,bot} = 지나 기준 위치(장면 비율)
               //  lightMask = 이 높이 구간에서 빛이 서서히 잘림(발 아래·카드 트레이 보호). hud = 왼쪽 위 동그란 버튼 중심(장면 비율)·hudR = 선명하게 유지할 반지름(가로 비율, 안쪽/바깥쪽)
               layout: { loopsTop: 0.23, loopsBot: 0.90, axisX: 0.505, widthK: 0.8 },
               lightMask: [0.62, 0.79],
               hud: [[0.1606, 0.0892], [0.2827, 0.0892], [0.4019, 0.0892]], hudR: [0.054, 0.066],
               bandMs: [100, 1250], bandFrom: 0.8, bandTo: -0.1, bandHalf: 0.13, bandGain: 0.45,
               //  wipeMs = 빛이 아래→위로 지워지며 화면 맨 위 끝까지 올라가 사라지는 구간(wipeSoft = 지워지는 경계의 부드러움, 화면 높이 비율)
               //  legsMs/endMs/boxRows/plate = 끝에 자막 상자가 나타날 때: 상자 자리(boxRows)의 다리가 먼저 빈 방(plate)으로 바뀌고, 그 위로 다음 화면이 자연스럽게 나타남 (흰색 페이드 없음)
               wipeMs: [850, 1650], wipeSoft: 0.5, fadeMs: [820, 1650], fadePow: 2.2,
               legsMs: [1250, 1380], endMs: [1290, 1530], boxRows: [0.598, 0.728], plate: "bl-12bg",
               rampMs: [0, 1040], rampFrom: 0.97, rampTo: -0.1, rampHalf: 0.16 },
    transform: { sfxDelayMs: 250, delayMs: 300, strength: 0.72, totalMs: 2200, light: "assets/fx/sparkle-light.webp", char: "assets/fx/sparkle-char.png" },
    // 블썸 21→22: 커튼이 닫혀 있다가(fadeInMs 로 덮임) holdMs 뒤 양옆으로 걷히며(openMs) 파티장이 나타남. 자막은 커튼이 거의 걷힌 뒤 시작.
    curtain: { sfxPeakMs: 300, fadeInMs: 260, holdMs: 200, openMs: 1050, ease: "cubic-bezier(.5,0,.3,1)", textAtOpenFrac: 0.7 },

    // 화면 구성
    //  kind   : dialogue(탭하면 다음) / choice(카드 2장) / wrong(오답: 흔들림+빠직) / gloss(머리 반짝임, 끝나면 ▶) / transform(변신 반짝임 후 자동) / result
    //  frames : 이미지들 (2장 이상 + sway:true 면 탭 전까지 번갈아 흔들림)
    //  text   : 자막 그룹(assets/text/text-<id>.png),  arrow : 타자기가 끝나면 깜빡이는 ▶ (assets/text/arrow-<id>.png)
    //  cards  : L / R = {hoverImg 또는 patch(자동), go: 다음 화면, again: 오답 다시 누름}
    steps: {
      // ---- 너드 지나 ----
      invite: { route: "nerd", kind: "dialogue", frames: ["nerd-1", "nerd-2"], sway: true, text: "NA", arrow: "NA", next: "help" },
      help:   { route: "nerd", kind: "dialogue", frames: ["nerd-3", "nerd-4"], sway: true, text: "NB", arrow: "NA", next: "choice" },
      choice: { route: "nerd", kind: "choice",   frames: ["nerd-5"], text: "NC",
                cards: { L: { hoverImg: "nerd-6", go: "@blossom", route: "blossom" },
                         R: { hoverImg: "nerd-7", go: "@sunset", route: "sunset" } } },
      result: { route: "nerd", kind: "result",   frames: ["nerd-7"] },

      // ---- 선셋 허니 지나 (블라썸과 똑같은 동작: 흰 페이드 / 꽃잎 / 타자 속도 / 빠직 / ▶ / 머리 광택 / 반짝임 변신) ----
      sn1: { route: "sunset", kind: "dialogue", frames: ["sw-1"], text: "XD", arrow: "X", fx: "petals", next: "sn2" },
      sn2: { route: "sunset", kind: "dialogue", frames: ["sw-2"], text: "XE", arrow: "X", next: "sn3" },
      // 고데기 브러쉬(왼쪽) = 정답, 꼬리빗(오른쪽) = 오답
      sn3: { route: "sunset", kind: "choice",   frames: ["sw-3"], text: "XF", cardSet: "S",
             cards: { L: { go: "sn8" }, R: { go: "snwrong", sfx: "comb" } } },
      snwrong: { route: "sunset", kind: "wrong", frames: ["sw-4", "sw-5"], sway: true, text: "XRA", arrow: "X", fx: "marks", next: "snwrong2", cardSet: "S",
                 cards: { L: { go: "sn8" }, R: { again: true, sfx: "comb" } } },
      snwrong2: { route: "sunset", kind: "wrong", frames: ["sw-4", "sw-5"], sway: true, text: "XR", fx: "marks", keepFx: true, cardSet: "S",
                  cards: { L: { go: "sn8" }, R: { again: true, sfx: "comb" } } },
      sn8:  { route: "sunset", kind: "dialogue", frames: ["sw-8a", "sw-8b"], sway: true, text: "XG", arrow: "X", next: "sn9" },
      sn9:  { route: "sunset", kind: "gloss",    frames: ["sw-9"], text: "XH", arrow: "X", next: "sn10" },
      sn10: { route: "sunset", kind: "dialogue", frames: ["sw-10"], text: "XI", arrow: "X", next: "sp11" },

      // ---- 선셋 11~16 (와이드 드레스룸) → 18~24 는 예전 그림 ----
      sp11: { route: "sparty", kind: "transform", frames: ["sw-12"], from: "sw-12bg", plate: "sw-12bg", tint: "gold", char: "assets/fx/sw-char12.webp?v=46", spiral: { cx: 0.498, top: 0.19, bot: 0.74 }, veil: "fast", transient: true, next: "sp13" },
      sp13: { route: "sparty", kind: "choice", frames: ["sw-13"], text: "XJ", arrow: "X", cardSet: "S2", cards: { L: { go: "sp14" } } },
      sp14: { route: "sparty", kind: "transform", frames: ["sw-15c"], plate: "sw-12bg", tint: "gold", char: "assets/fx/sw-char14.webp?v=46", spiral: { cx: 0.487, top: 0.19, bot: 0.74 }, veil: "fast", transient: true, next: "sp15" },
      sp15: { route: "sparty", kind: "dialogue", frames: ["sw-15b"], text: "XK", arrow: "X", fx: "pouchcard", pouch: "sp15", next: "sp16" },
      sp16: { route: "sparty", kind: "choice", frames: ["sw-16"], text: "XL", arrow: "X", cardSet: "S2", cards: { R: { go: "sp18" } } },
      sp18: { route: "sparty", kind: "transform", frames: ["sw-19cn"], tint: "gold", char: "assets/fx/sw-char18b.webp?v=55", spiral: { cx: 0.4744, top: 0.19, bot: 0.74 }, veil: "fast", transient: true, next: "sp19" },
      sp19: { route: "sparty", kind: "dialogue", frames: ["sw-19n"], text: "XM", arrow: "X", fx: "pouchcard", pouch: "sp19", next: "sp20" },
      sp20: { route: "sparty", kind: "dialogue", frames: ["sw-20"], text: "XN", arrow: "X", next: "sh22" },
      sh22: { route: "shall", kind: "dialogue", frames: ["sw-22"], curtain: true, text: "XO", arrow: "XZ", next: "sh23" },
      sh23: { route: "shall", kind: "dialogue", frames: ["sw-23"], text: "XP", arrow: "XZ", next: "sh24" },
      // 24: ▶ → 흰 페이드로 편지 화면(letter.js, 금색 테마)
      sh24: { route: "shall", kind: "dialogue", frames: ["sw-24"], text: "XQ", arrow: "XZ", next: null, toLetter: true },

      // ---- 블라썸 지나 ----
      bl1: { route: "blossom", kind: "dialogue", frames: ["bl-1"], text: "WD", arrow: "W", fx: "petals", next: "bl2" },
      bl2: { route: "blossom", kind: "dialogue", frames: ["bl-2"], text: "WE", arrow: "W", next: "bl3" },
      // 고데기 브러쉬(왼쪽) = 정답, 꼬리빗(오른쪽) = 오답
      bl3: { route: "blossom", kind: "choice",   frames: ["bl-3"], text: "WF",
             cards: { L: { go: "bl8" }, R: { go: "wrong", sfx: "comb" } } },
      // 오답: 지나가 좌우로 흔들리고 빠직 마크가 계속 움직이며 "이게 아니야! 이 꼬리빗만으로는 어려워!" 자막(▶)이 나옴.
      //  ▶ 탭 → 같은 화면에서 자막만 "다른 아이템을 선택해 볼까?" 로 바뀜 (흔들림·빠직은 끊기지 않고 이어짐, keepFx).
      //  두 자막 모두 왼쪽 카드를 누르면 바로 정답으로, 오른쪽 카드를 또 누르면 빠직이 다시 팝!
      wrong: { route: "blossom", kind: "wrong",  frames: ["bl-4", "bl-5"], sway: true, text: "WRA", arrow: "W", fx: "marks", next: "wrong2",
               cards: { L: { go: "bl8" }, R: { again: true, sfx: "comb" } } },
      wrong2: { route: "blossom", kind: "wrong", frames: ["bl-4", "bl-5"], sway: true, text: "WR", fx: "marks", keepFx: true,
               cards: { L: { go: "bl8" }, R: { again: true, sfx: "comb" } } },
      // 8: 포즈 2장(8a ⇄ 8b)이 탭하기 전까지 번갈아 보이며 좌우로 흔들림
      bl8: { route: "blossom", kind: "dialogue", frames: ["bl-8a", "bl-8b"], sway: true, text: "WG", arrow: "W", next: "bl9" },
      // 9: 자막과 함께 머리 광택이 위에서 아래로 흐르고, 자막·광택이 끝나면 ▶ 깜빡임 → 탭하면 11로
      bl9: { route: "blossom", kind: "gloss",    frames: ["bl-9"], text: "WH", arrow: "W", next: "bl10" },
      // 10: ▶ → 탭하면 흰 페이드로 11 (변신 효과) 로
      bl10: { route: "blossom", kind: "dialogue", frames: ["bl-10"], text: "WI", arrow: "W", next: "p11" },
      // 11: 변신 반짝임 (자막 없음, 끝나면 자동으로 13). veil = 흰색 부드러운 페이드로 들어옴, transient = 되돌리기 때 건너뜀
      p11: { route: "party", kind: "transform", frames: ["bl-12"], from: "bl-12bg", char: "assets/fx/w4-char12.webp?v=45", spiral: { cx: 0.498, top: 0.19, bot: 0.74 }, veil: "fast", transient: true, next: "p13" },
      // 13: 스크런치(왼쪽)를 먼저 고르는 화면 — 오른쪽 파우치 카드는 아직 안 눌림.  왼쪽 카드를 누르면 → 14 (스크런치 포즈로 변신)
      p13: { route: "party", kind: "choice", frames: ["bl-13"], text: "WJ", arrow: "W", cardSet: "B", cards: { L: { go: "p14" } } },
      // 14(=블썸 16 반짝임): 눌린 카드 화면에서 스크런치 포즈로 아래→위로 변신, 끝나면 자동으로 15 자막
      p14: { route: "party", kind: "transform", frames: ["bl-15d"], char: "assets/fx/w4-char14b.webp?v=50", spiral: { cx: 0.475, top: 0.19, bot: 0.74 }, veil: "fast", transient: true, next: "p15" },
      p15: { route: "party", kind: "dialogue", frames: ["bl-15"], text: "WK", arrow: "W", fx: "pouchcard", pouch: "p15", next: "p16" },
      // 16: 이번엔 파우치(오른쪽)를 고름
      p16: { route: "party", kind: "choice", frames: ["bl-16"], text: "WL", arrow: "W", cardSet: "B", cards: { R: { go: "p18" } } },
      // 18(=블썸 20 반짝임): 파우치 포즈로 변신, 끝나면 자동으로 19 자막
      p18: { route: "party", kind: "transform", frames: ["bl-19c"], char: "assets/fx/w4-char18.webp?v=45", spiral: { cx: 0.477, top: 0.19, bot: 0.74 }, veil: "fast", transient: true, next: "p19" },
      p19: { route: "party", kind: "dialogue", frames: ["bl-19"], text: "WM", arrow: "W", fx: "pouchcard", pouch: "p19", next: "p20" },
      p20: { route: "party", kind: "dialogue", frames: ["bl-20"], text: "WN", arrow: "W", next: "h22" },
      // 23(커튼) → 22: 커튼이 열리며 파티장
      h22: { route: "hall", kind: "dialogue", frames: ["bl-22"], curtain: true, text: "WO", arrow: "WZ", next: "h23" },
      h23: { route: "hall", kind: "dialogue", frames: ["bl-23"], text: "WP", arrow: "WZ", next: "h24" },
      // 24: ▶ → 흰 페이드로 편지 화면(letter.js)
      h24: { route: "hall", kind: "dialogue", frames: ["bl-24"], text: "WQ", arrow: "WZ", next: null, toLetter: true },
    },
  },

  // Screen: nerd Jina + route choice.
  // Left card (pink tube) = Blossom Dawn, right card (yellow tube) = Sunset
  // Honey — this is what the photo actually shows; your note said the
  // opposite (Blossom = right / Sunset = left), so flag it if that was
  // intentional and I'll swap the click targets.
  routeChoice: {
    img: "assets/scenes/route-nerd.jpg",
  },

  // Both routes share the same structure and the same card side (curler =
  // left/correct, comb = right/wrong) — confirmed in both photos.
  routes: {
    blossom: {
      id: "blossom",
      label: "블라썸 던",
      accent: "#c96d80",
      style: {
        img: "assets/scenes/style-blossom.jpg",
        // A dedicated baked-in "wrong click" composite exists for this
        // route (with the Notice popup + anger marks already drawn in) —
        // use it directly instead of the generic CSS fallback.
        wrongImg: "assets/scenes/style-blossom-wrong-ref.jpg",
        correctSide: "cardLeft",
        wrongSide: "cardRight",
        correctBubble: "이제 거의 다 됐다! 날 꾸며줄 다른 아이템도 보러가볼까?",
      },
    },
    sunset: {
      id: "sunset",
      label: "선셋 허니",
      accent: "#d3a24a",
      style: {
        img: "assets/scenes/style-sunset.jpg",
        // No dedicated wrong-click composite yet for this route — the
        // engine draws a generic Notice popup + card tint on top of the
        // base image instead. Swap in a real composite here later the
        // same way blossom's was added.
        wrongImg: null,
        wrongBubble: "이게 아니야! 이걸론 내 반곱슬 머리를 필 수 없어!",
        correctSide: "cardLeft",
        wrongSide: "cardRight",
        correctBubble: "이제 거의 다 됐다! 날 꾸며줄 다른 아이템도 보러가볼까?",
      },
    },
  },

  // Not yet supplied as photos — placeholders keep the flow testable.
  accessory: {
    prompt: "다음 화면 이미지를 기다리는 중이에요",
  },
  curtain: {
    fallbackColor: "#a8495e",
  },
  ending: {
    thankYouBubble: "덕분에 파티에 갈 수 있게 됐어 고마워!",
    retryLabel: "다시하기",
  },

  timedMedia: [
    // { after: "style:correct", src: "assets/media/sparkle-transform.mp4", type: "video" },
  ],
};

// 블썸(와이드) 루트들은 너드 루트와 같은 버튼/카드 템플릿 → 같은 클릭 영역
(function () { const R = window.GAME_DATA.story.routes; R.blossom.rects = R.party.rects = R.hall.rects = R.sunset.rects = R.sparty.rects = R.shall.rects = R.nerd.rects; })();
