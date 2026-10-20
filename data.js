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
  storyBack:      { x: 0.0917, y: 0.0405, w: 0.1240, h: 0.0580 },
  storyMute:      { x: 0.2500, y: 0.0405, w: 0.1240, h: 0.0580 },
  storyUndo:      { x: 0.3986, y: 0.0405, w: 0.1240, h: 0.0580 },
  storyCardL:     { x: 0.1821, y: 0.7545, w: 0.3099, h: 0.2210 },   // 블라썸 던 (분홍 튜브)
  storyCardR:     { x: 0.5069, y: 0.7543, w: 0.3093, h: 0.2213 },   // 선셋 허니 (노랑 튜브)
  // 음악 아이콘의 '사선'을 가려주는 패치 (음악 재생 중일 때 보임)
  storyMutePatch: { x: 0.238806, y: 0.035695, w: 0.149254, h: 0.068644 },
  // 편지 화면의 선물받기 / 다시하기 버튼 (145x42px, 가로 가운데, 145x42px)
  letterGift:  { x: 0.319652, y: 0.7495, w: 0.360697, h: 0.048055 },
  letterRetry: { x: 0.319652, y: 0.8150, w: 0.360697, h: 0.048055 },
  // 첫 화면 인트로의 '초대장 받기' 버튼: 편지지의 입장 조건 박스 아래, 봉투 입구 안쪽 여백 (138.2x35.5px / 402x874). 선물받기 버튼(145x42)보다 약간 작게
  introInvite: { x: 0.31566, y: 0.58846, w: 0.36867, h: 0.05219 },   // 버튼 본체 138.2x35.6 + 둘레 5px 그림자 여백 (이미지에 그림자가 구워져 있음)
};

window.GAME_DATA = {
  // 2번째 버튼으로 끄고 켤 수 있어요. 파일이 없으면 조용히 무시됩니다.
  // 배경음악 (왼쪽 위 ♪ 버튼으로 끄고 켬).  intro = 첫 화면(초대장), story = 너드 지나부터 편지 화면 직전까지.
  //   fadeInMs / fadeOutMs : 페이드 시간(ms).  story.fadeOutMs 는 마지막 화면(선물받기/다시하기)에 들어갈 때의 페이드아웃,
  //   switchFadeMs : 다른 곡으로 넘어가며 이전 곡이 사라지는 시간 (뒤로 가기 등)
  music: {
    intro: { src: "assets/audio/intro-bgm.mp3?v=28", volume: 0.7, fadeInMs: 2000, fadeOutMs: 1200 },
    story: { src: "assets/audio/story-bgm.mp3?v=28", volume: 0.7, fadeInMs: 2500, fadeOutMs: 4500 },
    switchFadeMs: 900,
  // 효과음 (♪ 음악 끄기 상태에서는 함께 꺼집니다).  volume 0~1, 파일은 assets/audio/sfx/
  //   click: 너드 지나부터 모든 버튼   magic: 루트 선택(블라썸1/선셋1) · 변신(11, 18)   comb: 꼬리빗 선택
  //   shine: 커튼이 닫혔다 열릴 때(커튼 속도에 맞춰 1.9초)   wind: 편지 화면에서 초대장이 날아올 때(날아오는 속도에 맞춘 바람)
  sfx: {
    click: { src: "assets/audio/sfx/click.mp3?v=28", volume: 0.6 },
    magic: { src: "assets/audio/sfx/magic.mp3?v=28", volume: 0.8 },
    comb:  { src: "assets/audio/sfx/comb.mp3?v=28",  volume: 0.9 },
    shine: { src: "assets/audio/sfx/shine.mp3?v=28", volume: 0.8 },
    wind:  { src: "assets/audio/sfx/wind.mp3?v=28",  volume: 1.0, delayMs: 100 },   // delayMs: 편지 화면의 흰 페이드가 걷히며 날아오는 모습이 보이는 시점에 맞춤
    glow:  { src: "assets/audio/sfx/glow.mp3?v=28",  volume: 0.8 },                 // 머리 반짝임(고데기로 빗은 뒤) 효과 때
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
    petals: { driftMinMs: 1500, driftMaxMs: 2100, staggerMs: 260 },
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
      "bl-12", "bl-13", "bl-15", "bl-16", "bl-18c", "bl-19", "bl-20", "bl-22", "bl-23", "bl-24",
      "sn-1", "sn-2", "sn-3", "sn-4", "sn-5", "sn-8a", "sn-8b", "sn-9", "sn-10", "sn-fill",   // 선셋 허니 루트
      "sn-12", "sn-13", "sn-15", "sn-16", "sn-18c", "sn-19", "sn-20", "sn-21", "sn-22", "sn-23", "sn-24",   // 선셋 11~24
    ],
    // 루트별 설정: fill = 와이드 화면 옆 배경을 만들 때 쓰는 이미지, mute = 음악 아이콘 사선 가림 패치
    routes: {
      nerd:    { prefix: "nerd", fill: "nerd-1", mute: "assets/scenes/mute-on-patch.png" },
      blossom: { prefix: "bl",   fill: "bl-3",   mute: "assets/scenes/mute-on-patch-pink.png" },
      party:   { prefix: "bl",   fill: "bl-12",  mute: "assets/scenes/mute-on-patch-pink.png" },   // 블썸 11~20 (드레스룸)
      sunset:  { prefix: "sn",   fill: "sn-fill",   mute: "assets/scenes/mute-on-patch-gold.png" },     // 선셋 허니 루트
      sparty:  { prefix: "sn",   fill: "sn-12",     mute: "assets/scenes/mute-on-patch-gold.png" },     // 선셋 11~20 (드레스룸)
      shall:   { prefix: "sn",   fill: "sn-22",     mute: "assets/scenes/mute-on-patch-gold.png" },     // 선셋 22~24 (파티장)
      hall:    { prefix: "bl",   fill: "bl-22",  mute: "assets/scenes/mute-on-patch-pink.png" },   // 블썸 22~24 (파티장)
    },
    // 블썸 11: "지나 뒤 변신 효과" (behind-transform test v7). 자막 없이 반짝임 소용돌이가 지나 뒤→앞으로 훑고 사라지면 자동으로 다음 화면.
    //  delayMs  흰 페이드가 걷히기 시작한 뒤 효과 시작까지 / strength 반짝임 세기 / totalMs 효과 전체 길이
    //  afterFx: 반짝임이 끝난 직후 다음 화면(자막)이 올라오는 속도 (크로스페이드 ms / 타자 시작 대기 ms)
    afterFx: { fadeMs: 180, textDelayMs: 40 },
    //  routeStart: 너드 지나 5 의 카드(go:"@...")를 누르면 처음 들어가는 화면
    routeStart: { "@blossom": "bl1", "@sunset": "sn1" },
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
      invite: { route: "nerd", kind: "dialogue", frames: ["nerd-1", "nerd-2"], sway: true, text: "A", arrow: "A", next: "help" },
      help:   { route: "nerd", kind: "dialogue", frames: ["nerd-3", "nerd-4"], sway: true, text: "B", arrow: "B", next: "choice" },
      choice: { route: "nerd", kind: "choice",   frames: ["nerd-5"], text: "C",
                cards: { L: { hoverImg: "nerd-6", go: "@blossom", route: "blossom" },
                         R: { hoverImg: "nerd-7", go: "@sunset", route: "sunset" } } },
      result: { route: "nerd", kind: "result",   frames: ["nerd-7"] },

      // ---- 선셋 허니 지나 (블라썸과 같은 동작: 흰 페이드 / 꽃잎 / 타자 속도 / 빠직 / ▶ / 머리 광택) ----
      sn1: { route: "sunset", kind: "dialogue", frames: ["sn-1"], text: "SD", arrow: "SD", fx: "petals", next: "sn2" },
      sn2: { route: "sunset", kind: "dialogue", frames: ["sn-2"], text: "SE", arrow: "SE", next: "sn3" },
      // 고데기 브러쉬(왼쪽) = 정답, 꼬리빗(오른쪽) = 오답
      sn3: { route: "sunset", kind: "choice",   frames: ["sn-3"], text: "SF", cardSet: "S",
             cards: { L: { go: "sn8" }, R: { go: "snwrong", sfx: "comb" } } },
      snwrong: { route: "sunset", kind: "wrong", frames: ["sn-4", "sn-5"], sway: true, text: "SR", fx: "marks", cardSet: "S",
                 cards: { L: { go: "sn8" }, R: { again: true, sfx: "comb" } } },
      sn8:  { route: "sunset", kind: "dialogue", frames: ["sn-8a", "sn-8b"], sway: true, text: "SG", arrow: "SG", next: "sn9" },
      sn9:  { route: "sunset", kind: "gloss",    frames: ["sn-9"], text: "SH", arrow: "SE", next: "sn10" },
      // 10: ▶ → 다음 화면(이미지) 대기 중
      sn10: { route: "sunset", kind: "dialogue", frames: ["sn-10"], text: "SI", arrow: "SD", next: "sp11" },

      // ---- 선셋 11~24 (블라썸 11~24 와 같은 동작: 11/18 반짝임 변신, 카드 눌림, 커튼 열림, 타자 속도, ▶) ----
      sp11: { route: "sparty", kind: "transform", frames: ["sn-12"], char: "assets/fx/sn-char12.png", tint: "gold", veil: "fast", transient: true, next: "sp13" },
      sp13: { route: "sparty", kind: "choice", frames: ["sn-13"], text: "SJ", cardSet: "S2", cards: { L: { go: "sp15" } } },
      sp15: { route: "sparty", kind: "dialogue", frames: ["sn-15"], text: "SK", arrow: "SAK", next: "sp16" },
      sp16: { route: "sparty", kind: "choice", frames: ["sn-16"], text: "SL", arrow: "SAL", tapGo: "R", cardSet: "S2", cards: { R: { go: "sp18" } } },
      sp18: { route: "sparty", kind: "transform", frames: ["sn-18c"], char: "assets/fx/sn-char18.png", tint: "gold", veil: "fast", transient: true, next: "sp19" },
      sp19: { route: "sparty", kind: "dialogue", frames: ["sn-19"], text: "SM", arrow: "SAK", next: "sp20" },
      sp20: { route: "sparty", kind: "dialogue", frames: ["sn-20"], text: "SN", arrow: "SAK", next: "sh22" },
      sh22: { route: "shall", kind: "dialogue", frames: ["sn-22"], curtain: true, text: "SO", arrow: "SAZ", next: "sh23" },
      sh23: { route: "shall", kind: "dialogue", frames: ["sn-23"], text: "SP", arrow: "SAZ", next: "sh24" },
      // 24: ▶ → 흰 페이드로 편지 화면(letter.js, 금색 테마)
      sh24: { route: "shall", kind: "dialogue", frames: ["sn-24"], text: "SQ", arrow: "SAZ", next: null, toLetter: true },

      // ---- 블라썸 지나 ----
      bl1: { route: "blossom", kind: "dialogue", frames: ["bl-1"], text: "D", arrow: "D", fx: "petals", next: "bl2" },
      bl2: { route: "blossom", kind: "dialogue", frames: ["bl-2"], text: "E", arrow: "E", next: "bl3" },
      // 고데기 브러쉬(왼쪽) = 정답, 꼬리빗(오른쪽) = 오답
      bl3: { route: "blossom", kind: "choice",   frames: ["bl-3"], text: "F",
             cards: { L: { go: "bl8" }, R: { go: "wrong", sfx: "comb" } } },
      // 오답: 지나가 좌우로 흔들리고 빠직 마크가 계속 움직이며 "다른 아이템을 선택해 볼까?" 자막이 나옴.
      // 왼쪽 카드를 누르면 바로 정답으로, 오른쪽 카드를 또 누르면 빠직이 다시 팝!
      wrong: { route: "blossom", kind: "wrong",  frames: ["bl-4", "bl-5"], sway: true, text: "R", fx: "marks",
               cards: { L: { go: "bl8" }, R: { again: true, sfx: "comb" } } },
      // 8: 포즈 2장(8a ⇄ 8b)이 탭하기 전까지 번갈아 보이며 좌우로 흔들림
      bl8: { route: "blossom", kind: "dialogue", frames: ["bl-8a", "bl-8b"], sway: true, text: "G", arrow: "G", next: "bl9" },
      // 9: 자막과 함께 머리 광택이 위에서 아래로 흐르고, 자막·광택이 끝나면 ▶ 깜빡임 → 탭하면 11로
      bl9: { route: "blossom", kind: "gloss",    frames: ["bl-9"], text: "H", arrow: "E", next: "bl10" },
      // 10: ▶ → 탭하면 흰 페이드로 11 (변신 효과) 로
      bl10: { route: "blossom", kind: "dialogue", frames: ["bl-10"], text: "I", arrow: "D", next: "p11" },
      // 11: 변신 반짝임 (자막 없음, 끝나면 자동으로 13). veil = 흰색 부드러운 페이드로 들어옴, transient = 되돌리기 때 건너뜀
      p11: { route: "party", kind: "transform", frames: ["bl-12"], veil: "fast", transient: true, next: "p13" },
      // 13: 스크런치(왼쪽)를 먼저 고르는 화면 — 오른쪽 파우치 카드는 아직 안 눌림
      p13: { route: "party", kind: "choice", frames: ["bl-13"], text: "J", cardSet: "B", cards: { L: { go: "p15" } } },
      p15: { route: "party", kind: "dialogue", frames: ["bl-15"], text: "K", arrow: "E", next: "p16" },
      // 16: 이번엔 파우치(오른쪽)를 고름
      p16: { route: "party", kind: "choice", frames: ["bl-16"], text: "L", arrow: "D", tapGo: "R", cardSet: "B", cards: { R: { go: "p18" } } },
      // 18→19: 반짝임이 있는 18 에서 반짝임이 서서히 걷히며(reveal) 19 로, 그 뒤 자막
      // 블썸 18: 파우치 포즈에 반짝임 소용돌이 (11번과 같은 효과, 자막 없이 끝나면 자동으로 19번 자막 화면)
      p18: { route: "party", kind: "transform", frames: ["bl-18c"], char: "assets/fx/sparkle-char2.png", veil: "fast", transient: true, next: "p19" },
      p19: { route: "party", kind: "dialogue", frames: ["bl-19"], text: "M", arrow: "E", next: "p20" },
      p20: { route: "party", kind: "dialogue", frames: ["bl-20"], text: "N", arrow: "E", next: "h22" },
      // 21(커튼) → 22: 커튼이 열리며 파티장
      h22: { route: "hall", kind: "dialogue", frames: ["bl-22"], curtain: true, text: "O", arrow: "Z", next: "h23" },
      h23: { route: "hall", kind: "dialogue", frames: ["bl-23"], text: "P", arrow: "Z", next: "h24" },
      // 24: 지금까지 만든 마지막 화면 (다음 이미지가 오기 전까지는 안내 토스트)
      // 24: ▶ → 흰 페이드로 편지 화면(letter.js)
      h24: { route: "hall", kind: "dialogue", frames: ["bl-24"], text: "Q", arrow: "Z", next: null, toLetter: true },
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
