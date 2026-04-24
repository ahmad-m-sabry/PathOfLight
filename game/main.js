/**
 * Sprite sheet: ../Assets/Sprite Sheet.png — 290×290 cells, 6×5 grid.
 * Idle: r0. Blink: r1. Pre-jump: r2 cols 3–5. Run: r3. Jump loop + landing: r4 (0–2 loop, 3–5 land).
 */

const FRAME = 290;
const IDLE_ROW = 0;
const IDLE_COUNT = 4;
const BLINK_ROW = 1;
const BLINK_COUNT = 4;
const PREJUMP_ROW = 2;
const PREJUMP_COL = 3;
const PREJUMP_COUNT = 3;
const RUN_ROW = 3;
const RUN_COUNT = 6;
const JUMP_ROW = 4;
const JUMP_LOOP_COL = 0;
const JUMP_LOOP_COUNT = 3;
const LANDING_COL = 3;
const LANDING_COUNT = 3;

const DEBUG_DRAW = false;

const JUMP_VELOCITY = -700;

function randBlinkDelay() {
  return 2 + Math.random() * 3;
}

/** World units are screen pixels; sprites are scaled by this factor. */
const SPRITE_SCALE = 0.35;

const SHEET_URL = new URL("../Assets/Sprite%20Sheet.png", import.meta.url).href;
const COLLECT_BEADS_URL = new URL("../Assets/Collectibles/Beads.png", import.meta.url).href;
const COLLECT_BOOK_URL = new URL("../Assets/Collectibles/Book.png", import.meta.url).href;
const COLLECT_PAPER_URL = new URL("../Assets/Collectibles/Paper.png", import.meta.url).href;
const EXIT_CLOSED_URL = new URL("../Assets/Exit%20-%20Closed.png", import.meta.url).href;
const EXIT_OPEN_URL = new URL("../Assets/Exit%20-%20Open.png", import.meta.url).href;
const EXTERIOR_URL = new URL("../Assets/Exterior.png", import.meta.url).href;
const QUESTIONS_URL = new URL("../Assets/questions.json", import.meta.url).href;
const TITLE_SCREEN_URL = new URL("../Assets/Title%20Screen.png", import.meta.url).href;
const START_TEXT_URL = new URL("../Assets/start%20text.png", import.meta.url).href;

/** 1-based index matching `Assets/Levels/level_NN.json`. */
let currentLevelIndex = 1;
/** Highest level index with a present `level_NN.json` (probed at boot). */
let maxLevelIndex = 1;
let levelSwitchInProgress = false;
/** Set on boot; used as BG fallback when a level has no background image. */
let exteriorImg = null;

/** Collectible draw heights (width keeps aspect ratio). */
const BEADS_MAX_H = 48;
const BOOK_MAX_H = 52;
const PAPER_MAX_H = 46;
/** Exit door draw height (width from aspect ratio); matches collectible anchor (bottom-center in level JSON). */
const EXIT_MAX_H = 120 * 1.1;
/** Next level loads when player bottom-center is within this distance (world px) of exit bottom-center. */
const EXIT_TRIGGER_MAX_DIST_PX = 20;
/** Collectible float: pixels peak-to-center; sine motion eases at top/bottom. */
const COLLECTIBLE_BOB_AMPLITUDE = 5;
/** Radians per second (full cycle ≈ 2π / this). */
const COLLECTIBLE_BOB_ANGULAR = (Math.PI * 2) / 2.4;
/** Soft sparkle around each pickup: radial-gradient dots drifting outward and fading. */
const COLLECTIBLE_PARTICLE_SPAWN_INTERVAL = 0.1;
/** Seconds before the particle becomes visible (uniform random in [min, max]). */
const COLLECTIBLE_PARTICLE_APPEAR_DELAY_MIN = 0.3;
const COLLECTIBLE_PARTICLE_APPEAR_DELAY_MAX = 0.4;
/** Duration of the visible phase (after delay), until removal. */
const COLLECTIBLE_PARTICLE_LIFE_MIN = 1.0;
const COLLECTIBLE_PARTICLE_LIFE_RANGE = 1.2;
const COLLECTIBLE_PARTICLE_SPEED_MIN = 26;
const COLLECTIBLE_PARTICLE_SPEED_MAX = 46;
const COLLECTIBLE_PARTICLE_R0_MIN = 5;
const COLLECTIBLE_PARTICLE_R0_RANGE = 6;
const COLLECTIBLE_PARTICLE_MAX_PER_ITEM = 20;
/** Pickup VFX: sprite rises/scales/fades; label is placeholder until copy is final. */
const COLLECTIBLE_PICKUP_DURATION = 0.6;
const COLLECTIBLE_PICKUP_RISE_PX = 100;
/** Scale at end of pickup = 1 + this (ease-out). */
const COLLECTIBLE_PICKUP_SCALE_EXTRA = 0.2;
const COLLECTIBLE_PICKUP_LABEL_PLACEHOLDER = "حصلتَ على شيء!";
/**
 * Bead buffs: jump mul starts at 1 (add per jump-bead); lantern at LANTERN_GLOW_RADIUS_MUL (add per light-bead).
 * Gravity-bead: full `gravity`; one-time max downward speed (terminal cap). Extra gravity-beads do nothing.
 * Reveal-bead: lantern radius eases up to peak over BEAD_REVEAL_GROW_SEC, then eases down over BEAD_REVEAL_SHRINK_SEC.
 * Every bead pickup adds BEAD_POINTS_AMOUNT to `score`.
 */
const BEAD_JUMP_ADD_PER = 0.15;
const BEAD_LIGHT_RADIUS_ADD_PER = 0.6;
/** Applied once when the first gravity-bead is taken (px/s downward vy cap). */
const BEAD_TERMINAL_FALL_VY = 250;
const BEAD_REVEAL_GROW_SEC = 1;
const BEAD_REVEAL_HOLD_SEC = 3;
const BEAD_REVEAL_SHRINK_SEC = 3;
/** Peak multiplier on base lantern radius at end of grow phase. */
const BEAD_REVEAL_RADIUS_MUL = 5;
const BEAD_POINTS_AMOUNT = 10;
/** Score added when picking up a book (inventory also increases). */
const BOOK_PICKUP_SCORE = 20;
/** Seconds after pickup: label fade-in (0 → full opacity). */
const COLLECTIBLE_PICKUP_TEXT_FADE_IN_SEC = 0.08;
/** Seconds after pickup when label begins fading out (e.g. 4 = hold ~4s at full after fade-in). */
const COLLECTIBLE_PICKUP_TEXT_FADE_START_SEC = 0.58;
/** Seconds for label fade-out after fade start. */
const COLLECTIBLE_PICKUP_TEXT_FADE_DURATION_SEC = 4;
const COLLECTIBLE_PICKUP_TEXT_SCREEN_PAD = 6;
/** Bottom-left HUD: book above paper; exit door to the right of that column (icon height; width from aspect ratio). */
const LEFT_HUD_PAD_X = 28;
const LEFT_HUD_PAD_Y = 14;
const LEFT_HUD_ICON_H = 40;
const LEFT_HUD_GAP = 10;
/** Vertical gap between book row and paper row. */
const LEFT_HUD_STACK_GAP = 10;
/** Horizontal gap between book/paper column and exit door. */
const LEFT_HUD_EXIT_GAP = 10;
/** Bottom-right: level, score, correct — baselines spaced by `SCORE_HUD_LINE_STEP`. */
const SCORE_HUD_PAD_X = 18;
const SCORE_HUD_PAD_Y = 17;
/** ~15% more than previous 24px step. */
const SCORE_HUD_LINE_STEP = 28;
/** Extra space between the level line and the score line (px). */
const SCORE_HUD_LEVEL_EXTRA_GAP = 10;
const SCORE_HUD_FONT_LEVEL_PX = 18;
/** Score + correct-answer lines: 20% smaller than level. */
const SCORE_HUD_FONT_STAT_PX = Math.round(SCORE_HUD_FONT_LEVEL_PX * 0.8);
const SCORE_HUD_FONT_LEVEL = `600 ${SCORE_HUD_FONT_LEVEL_PX}px "Rooyin", system-ui, sans-serif`;
const SCORE_HUD_FONT_STAT = `600 ${SCORE_HUD_FONT_STAT_PX}px "Rooyin", system-ui, sans-serif`;
/** Bottom-center: elapsed time this level (wall clock; resets each `initializeLevel`). */
const LEVEL_TIMER_PAD_Y = 18; 
const LEVEL_TIMER_FONT = `600 16px "Rooyin", system-ui, sans-serif`;
const SCORE_POINTS_PER_CORRECT = 100;
/** Default par time (seconds) when level JSON omits `parTimeSec`. */
const DEFAULT_LEVEL_PAR_TIME_SEC = 120;
/** Full time bonus if finish time ≤ par; each second over par costs this many points until 0. */
const TIME_BONUS_MAX_POINTS = 50;
const TIME_BONUS_LOSS_PER_SEC_OVER_PAR = 1;
/** HUD row pulse: duration (s) and peak scale = 1 + this. */
const HUD_PULSE_DURATION_SEC = 0.38;
const HUD_PULSE_PEAK_EXTRA = 0.3;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const questionOverlay = document.getElementById("question-overlay");
const questionTextEl = document.getElementById("question-text");
const questionOptionsEl = document.getElementById("question-options");
const questionFeedbackEl = document.getElementById("question-feedback");
const questionContinueBtn = document.getElementById("question-continue");
const questionHintBookBtn = document.getElementById("question-hint-book");
const questionHintTextEl = document.getElementById("question-hint-text");
const levelCompleteOverlay = document.getElementById("level-complete-overlay");
const levelCompleteTitleEl = document.getElementById("level-complete-title");
const levelCompleteStatsEl = document.getElementById("level-complete-stats");
const levelCompleteActionBtn = document.getElementById("level-complete-action");
const levelSelectOverlay = document.getElementById("level-select-overlay");
const levelSelectGrid = document.getElementById("level-select-grid");
const levelSelectCloseBtn = document.getElementById("level-select-close");
const tutorialOverlay = document.getElementById("tutorial-overlay");
const tutorialContinueBtn = document.getElementById("tutorial-continue");
const tutorialCloseBtn = document.getElementById("tutorial-close");
const controlsHintEl = document.getElementById("controls-hint");
const fullscreenPromptOverlay = document.getElementById("fullscreen-prompt-overlay");
const fullscreenPromptYesBtn = document.getElementById("fullscreen-prompt-yes");
const fullscreenPromptNoBtn = document.getElementById("fullscreen-prompt-no");
/** Wrapper used for touch: hold left/right edges to move, swipe up to jump. */
const gameViewportEl = canvas.closest(".game-viewport");

/** Viewport (16:9 canvas); world is wider (21:9 at same height) for horizontal scroll. */
const VIEW_W = canvas.width;
const VIEW_H = canvas.height;
let WORLD_W = Math.round(VIEW_H * (21 / 9));
/** Left edge margin for default player spawn. */
const PLAYER_START_X = 48;
const PLATFORM_THICKNESS = 16;

const drawW = FRAME * SPRITE_SCALE;
const drawH = FRAME * SPRITE_SCALE;
/** Player collision box is intentionally smaller than visual sprite bounds. */
const HITBOX_W = drawW * 0.4;
const HITBOX_H = drawH * 0.86;
/** Offset from sprite top-left to hitbox top-left (origin: sprite bottom-center). */
const HITBOX_OX = (drawW - HITBOX_W) * 0.5;
const HITBOX_OY = drawH - HITBOX_H;
/** Max ledge height that can be stepped up without jumping. */
const STEP_UP_HEIGHT = 20;
/** When support is too narrow under feet, gently slide off. */
const EDGE_SLIDE_MIN_SUPPORT_FRAC = 0.35;
const EDGE_SLIDE_SPEED = 90;
/** Solid collision: only treat as floor/ceiling when crossing that face (avoids side overlap snapping). */
const SOLID_FACE_EPS = 2;
const floorY = VIEW_H - 48;
let cameraX = 0;
const gravity = 2200;
let beadJumpVelocityMul = 1;
/** Max downward vy when falling; Infinity = uncapped (default). First gravity-bead sets a cap once. */
let beadTerminalFallVy = Number.POSITIVE_INFINITY;
/** `performance.now()` when reveal radius anim started; 0 = idle. Picks up another reveal restarts the anim. */
let revealRadiusAnimStartMs = 0;

/** Lantern vs sprite center (facing-right space); flip handled with `player.facing`. Nudge if needed. */
const LANTERN_ANCHOR_X_FRAC = 0.22;
const LANTERN_ANCHOR_Y_FRAC = 0.1;
/** Glow radius as a multiple of the larger sprite dimension. */
const LANTERN_GLOW_RADIUS_MUL = 1.25;
/** Runtime lantern radius multiplier (can be changed later by gameplay systems). */
let lanternLightRadiusMul = LANTERN_GLOW_RADIUS_MUL;
/** Core radius `r` = max(drawW, drawH) * lanternLightRadiusMul; darkness gradient uses these factors (must match drawLanternGlow). */
const LANTERN_DARKNESS_INNER_R_MUL = 0.25;
const LANTERN_DARKNESS_OUTER_R_MUL = 1.9;
const LANTERN_WARM_GLOW_R_MUL = 0.9;

const keys = new Set();
let jumpQueued = false;

/**
 * Map a key event to `KeyboardEvent.code`-style strings. Prefer `e.key` for space
 * and WASD so tablet / attachable keyboards that omit or misreport `code` still work.
 */
function canonicalKbdCode(e) {
  const k = e.key;
  if (k === " " || k === "Spacebar") return "Space";
  if (k.length === 1) {
    const lower = k.toLowerCase();
    if (lower === "w") return "KeyW";
    if (lower === "a") return "KeyA";
    if (lower === "d") return "KeyD";
  }
  if (e.code) return e.code;
  if (k === "ArrowLeft" || k === "ArrowRight" || k === "ArrowUp" || k === "ArrowDown") return k;
  if (k === "Enter") return "Enter";
  if (k === "Escape") return "Escape";
  return "";
}

window.addEventListener("keydown", (e) => {
  if (appScreen === "fullscreen_prompt") {
    if ((e.code === "Enter" || e.code === "Space") && !e.repeat) {
      e.preventDefault();
      fullscreenPromptYesBtn?.click();
      return;
    }
    if (e.code === "Escape") {
      e.preventDefault();
      fullscreenPromptNoBtn?.click();
      return;
    }
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) {
      e.preventDefault();
    }
    return;
  }
  if (appScreen === "title") {
    if ((e.code === "Enter" || e.code === "Space") && !e.repeat) {
      e.preventDefault();
      openLevelSelectFromTitle();
      return;
    }
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) {
      e.preventDefault();
    }
    return;
  }
  if (appScreen === "level_select") {
    if (e.code === "Escape") {
      e.preventDefault();
      closeLevelSelectToTitle();
      return;
    }
    const digitToLevel = {
      Digit1: 1,
      Digit2: 2,
      Digit3: 3,
      Digit4: 4,
      Digit5: 5,
      Digit6: 6,
      Numpad1: 1,
      Numpad2: 2,
      Numpad3: 3,
      Numpad4: 4,
      Numpad5: 5,
      Numpad6: 6,
    };
    const picked = digitToLevel[e.code];
    if (picked != null) {
      e.preventDefault();
      const btn = levelSelectGrid?.querySelector(`[data-level="${picked}"]`);
      if (btn && !btn.disabled) btn.click();
      return;
    }
    return;
  }
  if (appScreen === "tutorial") {
    if (e.code === "Escape") {
      e.preventDefault();
      backFromTutorialToLevelSelect();
      return;
    }
    if ((e.code === "Enter" || e.code === "Space") && !e.repeat) {
      e.preventDefault();
      tutorialContinueBtn?.click();
      return;
    }
    return;
  }
  if (isLevelCompleteScreenOpen) {
    if (e.code === "Enter" || e.code === "Space") {
      e.preventDefault();
      levelCompleteActionBtn.click();
    }
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) {
      e.preventDefault();
    }
    return;
  }
  if (isQuestionOpen) {
    if (e.code === "Escape" && !questionContinueBtn.hidden) {
      e.preventDefault();
      closeQuestionOverlay();
      return;
    }
    if (!questionContinueBtn.hidden && (e.code === "Enter" || e.code === "Space")) {
      e.preventDefault();
      questionContinueBtn.click();
      return;
    }
    const optionBtns = [...questionOptionsEl.querySelectorAll("button:not(:disabled)")];
    if (optionBtns.length > 0) {
      const n = optionBtns.length;
      const isMcq = questionOptionsEl.classList.contains("question-options--mcq");
      /** RTL grid: next DOM index is drawn to the *left*; swap so arrows match screen east/west. */
      const rtlOptions = questionOverlay.getAttribute("dir") === "rtl";
      // Space is jump in-game; if a paper is collected while Space is held/repeating, it must not pick an answer.
      if (e.code === "Enter") {
        e.preventDefault();
        const b = optionBtns[questionKbdFocusIndex];
        if (b) b.click();
        return;
      }
      if (e.code === "ArrowRight") {
        e.preventDefault();
        questionKbdFocusIndex = rtlOptions
          ? (questionKbdFocusIndex - 1 + n) % n
          : (questionKbdFocusIndex + 1) % n;
        updateQuestionKbdFocus();
        return;
      }
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        questionKbdFocusIndex = rtlOptions
          ? (questionKbdFocusIndex + 1) % n
          : (questionKbdFocusIndex - 1 + n) % n;
        updateQuestionKbdFocus();
        return;
      }
      if (e.code === "ArrowDown") {
        e.preventDefault();
        if (isMcq) {
          questionKbdFocusIndex = Math.min(n - 1, questionKbdFocusIndex + 2);
        } else {
          questionKbdFocusIndex = (questionKbdFocusIndex + 1) % n;
        }
        updateQuestionKbdFocus();
        return;
      }
      if (e.code === "ArrowUp") {
        e.preventDefault();
        if (isMcq) {
          questionKbdFocusIndex = Math.max(0, questionKbdFocusIndex - 2);
        } else {
          questionKbdFocusIndex = (questionKbdFocusIndex - 1 + n) % n;
        }
        updateQuestionKbdFocus();
        return;
      }
    }
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) {
      e.preventDefault();
    }
    return;
  }
  const cg = canonicalKbdCode(e);
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(cg)) {
    e.preventDefault();
  }
  if ((cg === "Space" || cg === "ArrowUp" || cg === "KeyW") && !e.repeat) {
    jumpQueued = true;
  }
  if (cg) keys.add(cg);
});

window.addEventListener("keyup", (e) => {
  const cg = canonicalKbdCode(e);
  if (cg) keys.delete(cg);
});

/** Invisible zones: hold left/right; swipe up (anywhere) for jump. */
const POINTER_ZONE_LEFT_FRAC = 0.42;
const POINTER_ZONE_RIGHT_FRAC = 0.58;
const SWIPE_UP_MIN_PX = 56;
const SWIPE_MAX_DURATION_MS = 450;
/** Require mostly vertical motion: |dy| >= |dx| * ratio. */
const SWIPE_VERTICAL_DOMINANCE = 1.12;
/** While the contact stays near this vertical band, swipe origin tracks it (walk then flick still counts as a fresh swipe). */
const SWIPE_BASELINE_FOLLOW_PX = 12;

/** @type {Map<number, { x0: number, y0: number, t0: number, zone: "left" | "right" | null, swipeJumpConsumed: boolean }>} */
const activeTouchPointers = new Map();

function updateSwipeBaseline(rec, clientX, clientY, now) {
  if (clientY >= rec.y0 - SWIPE_BASELINE_FOLLOW_PX) {
    rec.x0 = clientX;
    rec.y0 = clientY;
    rec.t0 = now;
  }
}

function trySwipeUpJumpFromRec(rec, clientX, clientY, now) {
  if (rec.swipeJumpConsumed) return;
  const dt = now - rec.t0;
  const dx = clientX - rec.x0;
  const dy = clientY - rec.y0;
  const upDist = -dy;
  if (
    upDist >= SWIPE_UP_MIN_PX &&
    dt <= SWIPE_MAX_DURATION_MS &&
    Math.abs(dy) >= Math.abs(dx) * SWIPE_VERTICAL_DOMINANCE
  ) {
    jumpQueued = true;
    rec.swipeJumpConsumed = true;
  }
}

/** After a swipe jump, allow another once the contact moves back to/below the stroke origin (still holding). */
function maybeRearmSwipeJump(rec, clientY) {
  if (rec.swipeJumpConsumed && clientY >= rec.y0 - 6) {
    rec.swipeJumpConsumed = false;
  }
}

function applyTouchMoveZone(zone, down) {
  if (zone === "left") {
    if (down) keys.add("ArrowLeft");
    else keys.delete("ArrowLeft");
  } else if (zone === "right") {
    if (down) keys.add("ArrowRight");
    else keys.delete("ArrowRight");
  }
}

function touchZoneFromLocalX(localX, width) {
  if (localX < width * POINTER_ZONE_LEFT_FRAC) return "left";
  if (localX > width * POINTER_ZONE_RIGHT_FRAC) return "right";
  return null;
}

function clearTouchPointerInput() {
  for (const rec of activeTouchPointers.values()) {
    applyTouchMoveZone(rec.zone, false);
  }
  activeTouchPointers.clear();
}

function onGamePointerDown(e) {
  if (!gameViewportEl || e.button !== 0) return;
  if (appScreen !== "gameplay" || isQuestionOpen || isLevelCompleteScreenOpen) return;
  const rect = gameViewportEl.getBoundingClientRect();
  const lx = e.clientX - rect.left;
  const ly = e.clientY - rect.top;
  if (lx < 0 || ly < 0 || lx > rect.width || ly > rect.height) return;
  const zone = touchZoneFromLocalX(lx, rect.width);
  applyTouchMoveZone(zone, true);
  activeTouchPointers.set(e.pointerId, {
    x0: e.clientX,
    y0: e.clientY,
    t0: performance.now(),
    zone,
    swipeJumpConsumed: false,
  });
  try {
    gameViewportEl.setPointerCapture(e.pointerId);
  } catch (_) {
    /* ignore */
  }
  e.preventDefault();
}

function onGamePointerMove(e) {
  if (!gameViewportEl) return;
  const rec = activeTouchPointers.get(e.pointerId);
  if (!rec) return;
  if (appScreen !== "gameplay" || isQuestionOpen || isLevelCompleteScreenOpen) return;
  const now = performance.now();
  updateSwipeBaseline(rec, e.clientX, e.clientY, now);
  maybeRearmSwipeJump(rec, e.clientY);
  trySwipeUpJumpFromRec(rec, e.clientX, e.clientY, now);
}

function onGamePointerUp(e) {
  if (!gameViewportEl) return;
  const rec = activeTouchPointers.get(e.pointerId);
  if (rec) {
    trySwipeUpJumpFromRec(rec, e.clientX, e.clientY, performance.now());
    applyTouchMoveZone(rec.zone, false);
    activeTouchPointers.delete(e.pointerId);
    try {
      if (gameViewportEl.hasPointerCapture(e.pointerId)) {
        gameViewportEl.releasePointerCapture(e.pointerId);
      }
    } catch (_) {
      /* ignore */
    }
    if (appScreen === "gameplay" && !isQuestionOpen && !isLevelCompleteScreenOpen) {
      e.preventDefault();
    }
  }
}

function onGamePointerCancel(e) {
  if (!gameViewportEl) return;
  const rec = activeTouchPointers.get(e.pointerId);
  if (rec) {
    applyTouchMoveZone(rec.zone, false);
    activeTouchPointers.delete(e.pointerId);
    try {
      if (gameViewportEl.hasPointerCapture(e.pointerId)) {
        gameViewportEl.releasePointerCapture(e.pointerId);
      }
    } catch (_) {
      /* ignore */
    }
  }
}

if (gameViewportEl) {
  gameViewportEl.addEventListener("pointerdown", onGamePointerDown, { passive: false });
  gameViewportEl.addEventListener("pointermove", onGamePointerMove);
  gameViewportEl.addEventListener("pointerup", onGamePointerUp, { passive: false });
  gameViewportEl.addEventListener("pointercancel", onGamePointerCancel);
}

function syncLevelSelectButtons() {
  if (!levelSelectGrid) return;
  for (const btn of levelSelectGrid.querySelectorAll(".level-select-btn")) {
    const n = parseInt(btn.getAttribute("data-level"), 10);
    btn.disabled = n > maxLevelIndex;
  }
}

function focusPreferredLevelButton() {
  if (!levelSelectGrid) return;
  const clamped = Math.min(6, Math.max(1, pendingStartLevelIndex));
  let btn = levelSelectGrid.querySelector(`[data-level="${clamped}"]`);
  if (!btn || btn.disabled) {
    btn = levelSelectGrid.querySelector(".level-select-btn:not(:disabled)");
  }
  if (btn) btn.focus();
}

function hideLevelSelect() {
  if (!levelSelectOverlay) return;
  levelSelectOverlay.hidden = true;
  levelSelectOverlay.setAttribute("aria-hidden", "true");
}

function hideFullscreenPrompt() {
  if (!fullscreenPromptOverlay) return;
  fullscreenPromptOverlay.hidden = true;
  fullscreenPromptOverlay.setAttribute("aria-hidden", "true");
}

async function requestGameFullscreen() {
  const root = document.documentElement;
  if (document.fullscreenElement) return true;
  try {
    if (root.requestFullscreen) {
      await root.requestFullscreen();
      return true;
    }
    if (root.webkitRequestFullscreen) {
      root.webkitRequestFullscreen();
      return true;
    }
  } catch (e) {
    console.warn("Fullscreen request failed:", e);
  }
  return false;
}

async function resolveFullscreenPrompt(shouldEnterFullscreen) {
  if (appScreen !== "fullscreen_prompt") return;
  if (shouldEnterFullscreen) {
    await requestGameFullscreen();
  }
  hideFullscreenPrompt();
  appScreen = "title";
}

fullscreenPromptYesBtn?.addEventListener("click", () => {
  resolveFullscreenPrompt(true);
});

fullscreenPromptNoBtn?.addEventListener("click", () => {
  resolveFullscreenPrompt(false);
});

function openLevelSelectFromTitle() {
  if (appScreen !== "title" || !levelSelectOverlay) return;
  appScreen = "level_select";
  syncLevelSelectButtons();
  levelSelectOverlay.hidden = false;
  levelSelectOverlay.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => focusPreferredLevelButton());
}

function closeLevelSelectToTitle() {
  hideLevelSelect();
  appScreen = "title";
}

function onLevelChosen(levelIndex) {
  selectedLevelForPlay = levelIndex;
  pendingStartLevelIndex = levelIndex;
  hideLevelSelect();
  openTutorial();
}

function openTutorial() {
  appScreen = "tutorial";
  if (tutorialOverlay) {
    tutorialOverlay.hidden = false;
    tutorialOverlay.setAttribute("aria-hidden", "false");
  }
  requestAnimationFrame(() => tutorialContinueBtn?.focus());
}

function closeTutorial() {
  if (!tutorialOverlay) return;
  tutorialOverlay.hidden = true;
  tutorialOverlay.setAttribute("aria-hidden", "true");
}

function backFromTutorialToLevelSelect() {
  closeTutorial();
  appScreen = "level_select";
  if (levelSelectOverlay) {
    levelSelectOverlay.hidden = false;
    levelSelectOverlay.setAttribute("aria-hidden", "false");
  }
  syncLevelSelectButtons();
  requestAnimationFrame(() => focusPreferredLevelButton());
}

let gameplayLoadInProgress = false;

async function beginGameplayFromTutorial() {
  if (appScreen !== "tutorial" || gameplayLoadInProgress) return;
  gameplayLoadInProgress = true;
  try {
    await loadLevelFromIndex(selectedLevelForPlay);
    closeTutorial();
    appScreen = "gameplay";
    if (controlsHintEl) controlsHintEl.hidden = false;
  } catch (err) {
    console.error(err);
  } finally {
    gameplayLoadInProgress = false;
  }
}

if (levelSelectGrid) {
  for (const btn of levelSelectGrid.querySelectorAll(".level-select-btn")) {
    btn.addEventListener("click", () => {
      if (btn.disabled || appScreen !== "level_select") return;
      const n = parseInt(btn.getAttribute("data-level"), 10);
      onLevelChosen(n);
    });
  }
}

levelSelectCloseBtn?.addEventListener("click", () => {
  if (appScreen !== "level_select") return;
  closeLevelSelectToTitle();
});

tutorialCloseBtn?.addEventListener("click", () => {
  if (appScreen !== "tutorial") return;
  backFromTutorialToLevelSelect();
});

tutorialContinueBtn?.addEventListener("click", () => {
  beginGameplayFromTutorial();
});

canvas.addEventListener("click", () => {
  if (appScreen === "title") openLevelSelectFromTitle();
});

const player = {
  x: PLAYER_START_X,
  y: floorY - drawH,
  vx: 0,
  vy: 0,
  facing: 1,
  anim: "idle",
  frameIndex: 0,
  frameTime: 0,
  blinkCountdown: randBlinkDelay(),
  /** Set from `resolveVertical` each frame (stale during e.g. prejump until next physics tick). */
  grounded: false,
};

let sheet;
let bgImg;
/** Optional level foreground (transparent outside props); lantern affects this layer only. */
let fgImg;
let titleScreenImg;
let startTextImg;
let fgLayerCanvas;
let fgLayerCtx;
let beadsImg;
let bookImg;
let paperImg;
let exitClosedImg;
let exitOpenImg;
/** World-space axis-aligned rect for the exit door, or null if the level has no exit asset. */
let levelExitRect = null;
/** True if the player was overlapping the exit zone last frame (edge-trigger next level). */
let wasInExitZone = false;
/** World-space pickups from level JSON; each has x,y,w,h, kind, img, collected. */
let collectibles = [];
/** Count of `paper` collectibles in the current level (denominator for HUD). */
let levelPaperTotal = 0;
/** Paper questions the player has submitted an answer for this level. */
let levelPaperAnswered = 0;
/** `performance.now()` when the current level started; `null` until first `initializeLevel`. */
let levelTimerStartMs = null;
/** When set, HUD timer shows this value (seconds) instead of wall clock — e.g. level-complete overlay. */
let levelTimerFrozenElapsedSec = null;
/** Books picked up this level (inventory — not spent yet). */
let booksHeld = 0;
/** Total score (answers, beads, books, time bonus at exit); persists across levels. */
let score = 0;
/** Lifetime: papers that opened a question (`questionsBank` non-empty); persists across levels. */
let questionsCollectedTotal = 0;
/** Lifetime: correct answers submitted; persists across levels. */
let questionsCorrectTotal = 0;
/** HUD pulse: elapsed time since trigger, or -1 when idle. */
let hudPulseBookT = -1;
let hudPulsePaperT = -1;
let hudPulseScoreT = -1;
/** Validated entries from `Assets/questions.json`; empty if load failed. */
let questionsBank = [];
let isQuestionOpen = false;
/** Index into `#question-options` buttons for keyboard navigation. */
let questionKbdFocusIndex = 0;
let isLevelCompleteScreenOpen = false;
/** Beads picked up this level (count). */
let levelBeadsCollected = 0;
/** Books picked up this level (count). */
let levelBooksCollected = 0;
/** Correct paper answers this level (count). */
let levelQuestionsCorrect = 0;
/** Par time for the current level (from JSON `parTimeSec`). */
let levelParTimeSec = DEFAULT_LEVEL_PAR_TIME_SEC;
let levelCompleteIsFinal = false;
let worldToLevelScaleX = 1;
let worldToLevelScaleY = 1;
let solidRects = [];
let oneWayPlatforms = [];
let lastTs = 0;
let collectibleAnimTime = 0;
/** Flow: title → level select → tutorial → gameplay. */
let appScreen = "fullscreen_prompt";
let pendingStartLevelIndex = 1;
/** Level chosen in the menu; loaded when the player confirms the tutorial. */
let selectedLevelForPlay = 1;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

async function loadLevelData(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load level data: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  if (!data || !Array.isArray(data.levels) || data.levels.length === 0) {
    throw new Error("Level data is missing a non-empty levels array.");
  }
  return data;
}

/** `?level=2` loads `level_02.json`. Omitted or invalid → `1`. */
function parseLevelFromQuery() {
  const raw = new URLSearchParams(window.location.search).get("level");
  if (raw == null || raw === "") return 1;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function levelJsonUrl(levelIndex) {
  const n = Math.max(1, Math.floor(levelIndex));
  return new URL(`../Assets/Levels/level_${String(n).padStart(2, "0")}.json`, import.meta.url).href;
}

/** First missing `level_NN.json` ends the scan; returns at least `1` if level 1 exists. */
async function discoverMaxLevelIndex() {
  let last = 0;
  for (let n = 1; n <= 99; n++) {
    const r = await fetch(levelJsonUrl(n));
    if (!r.ok) break;
    last = n;
  }
  return Math.max(1, last);
}

function syncLevelInUrl(levelIndex) {
  const n = Math.max(1, Math.floor(levelIndex));
  const url = new URL(window.location.href);
  if (url.searchParams.get("level") === String(n)) return;
  url.searchParams.set("level", String(n));
  history.replaceState(null, "", url);
}

/**
 * Loads `level_NN.json`, level images, and `initializeLevel`. Updates `?level=` and `currentLevelIndex`.
 * Safe to call from gameplay (e.g. exits). Exposed as `window.goToLevel` for dev/testing.
 */
async function loadLevelFromIndex(levelIndex) {
  if (levelSwitchInProgress) return;
  const n = Math.max(1, Math.floor(levelIndex));
  levelSwitchInProgress = true;
  try {
    const data = await loadLevelData(levelJsonUrl(n));
    const level0 = data.levels[0];
    const bgSpec = level0?.background;
    const basePath = bgSpec?.background ?? bgSpec?.image;
    const foregroundPath = bgSpec?.foreground;
    let levelBg = null;
    let levelFg = null;
    if (basePath) {
      try {
        levelBg = await loadImage(resolveProjectAssetUrl(basePath));
      } catch (e) {
        console.warn("Level background image failed, using fallback:", e);
      }
    }
    if (foregroundPath) {
      try {
        levelFg = await loadImage(resolveProjectAssetUrl(foregroundPath));
      } catch (e) {
        console.warn("Level foreground image failed:", e);
      }
    }
    bgImg = levelBg ?? exteriorImg;
    fgImg = levelFg;

    if (isQuestionOpen) closeQuestionOverlay();
    jumpQueued = false;
    clearTouchPointerInput();

    currentLevelIndex = n;
    syncLevelInUrl(n);
    initializeLevel(data);
  } finally {
    levelSwitchInProgress = false;
  }
}

function normalizeQuestions(data) {
  const raw = data?.questions;
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const q of raw) {
    if (!q || typeof q.prompt !== "string") continue;
    const hint = typeof q.hint === "string" ? q.hint.trim() : "";
    const comment = typeof q.comment === "string" ? q.comment.trim() : "";
    if (q.type === "mcq" && Array.isArray(q.choices) && q.choices.length >= 2) {
      const ci = q.correctIndex;
      if (typeof ci !== "number" || ci < 0 || ci >= q.choices.length) continue;
      out.push({ type: "mcq", prompt: q.prompt, choices: q.choices.slice(), correctIndex: ci, hint, comment });
    } else if (q.type === "tf" && typeof q.answer === "boolean") {
      out.push({ type: "tf", prompt: q.prompt, answer: q.answer, hint, comment });
    }
  }
  return out;
}

async function loadQuestionsBank(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return normalizeQuestions(data);
  } catch (e) {
    console.warn("Questions file not loaded:", e);
    return [];
  }
}

/** Resolve paths like `Assets/Levels/level_01.png` from repo root (same as other `new URL(..., import.meta.url)` assets). */
function resolveProjectAssetUrl(relativePath) {
  const normalized = String(relativePath).replace(/^\//, "").replace(/\\/g, "/");
  return new URL(`../${normalized}`, import.meta.url).href;
}

function toWorldX(levelX) {
  return levelX * worldToLevelScaleX;
}

function toWorldYBottom(levelY) {
  return VIEW_H - levelY * worldToLevelScaleY;
}

function platformToRect(platform) {
  const x = toWorldX(platform.x);
  const yTop = toWorldYBottom(platform.y);
  return {
    x,
    y: yTop,
    w: platform.length * worldToLevelScaleX,
    h: PLATFORM_THICKNESS,
  };
}

function blockToRect(block) {
  const x = toWorldX(block.x);
  const w = block.width * worldToLevelScaleX;
  const h = block.height * worldToLevelScaleY;
  const y = toWorldYBottom(block.y) - h;
  return { x, y, w, h };
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function playerHitboxAt(x, y) {
  const ox = player.facing === 1 ? HITBOX_OX : drawW - HITBOX_OX - HITBOX_W;
  return {
    x: x + ox,
    y: y + HITBOX_OY,
    w: HITBOX_W,
    h: HITBOX_H,
  };
}

function resolveHorizontal(nextX) {
  const ox = player.facing === 1 ? HITBOX_OX : drawW - HITBOX_OX - HITBOX_W;
  const currentRect = playerHitboxAt(player.x, player.y);
  const rect = playerHitboxAt(nextX, player.y);
  for (const s of solidRects) {
    if (!overlap(rect, s)) continue;
    if (player.vy >= 0 && !overlap(currentRect, s)) {
      const currentBottom = currentRect.y + currentRect.h;
      const stepHeight = currentBottom - s.y;
      const canStepUp = stepHeight > 0 && stepHeight <= STEP_UP_HEIGHT;
      if (canStepUp) {
        const steppedY = s.y - HITBOX_OY - HITBOX_H;
        const steppedRect = playerHitboxAt(nextX, steppedY);
        let blocked = false;
        for (const other of solidRects) {
          if (overlap(steppedRect, other)) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          player.y = steppedY;
          rect.x = steppedRect.x;
          rect.y = steppedRect.y;
          continue;
        }
      }
    }
    if (player.vx > 0) {
      nextX = s.x - ox - HITBOX_W;
    } else if (player.vx < 0) {
      nextX = s.x + s.w - ox;
    }
    rect.x = nextX + ox;
    player.vx = 0;
  }
  return nextX;
}

function resolveVertical(nextY, prevBottom) {
  let grounded = false;
  const rect = playerHitboxAt(player.x, nextY);
  let bottom = rect.y + rect.h;
  const prevTop = prevBottom - HITBOX_H;
  const eps = SOLID_FACE_EPS;

  for (const s of solidRects) {
    if (!overlap(rect, s)) continue;

    if (player.vy > 0) {
      const crossedTop = prevBottom <= s.y + eps && bottom >= s.y - eps;
      if (!crossedTop) continue;
      nextY = s.y - HITBOX_OY - HITBOX_H;
      grounded = true;
    } else if (player.vy < 0) {
      const blockBottom = s.y + s.h;
      const crossedBottom = prevTop >= blockBottom - eps && rect.y < blockBottom + eps;
      if (!crossedBottom) continue;
      nextY = s.y + s.h - HITBOX_OY;
    } else {
      const restingOnTop =
        bottom >= s.y - eps &&
        bottom <= s.y + 10 &&
        rect.x < s.x + s.w &&
        rect.x + rect.w > s.x;
      if (!restingOnTop) continue;
      nextY = s.y - HITBOX_OY - HITBOX_H;
      grounded = true;
    }
    rect.y = nextY + HITBOX_OY;
    player.vy = 0;
    bottom = rect.y + rect.h;
  }

  if (player.vy >= 0) {
    for (const p of oneWayPlatforms) {
      const withinX = rect.x < p.x + p.w && rect.x + rect.w > p.x;
      const crossedTop = prevBottom <= p.y && bottom >= p.y;
      if (withinX && crossedTop) {
        nextY = p.y - HITBOX_OY - HITBOX_H;
        rect.y = nextY + HITBOX_OY;
        player.vy = 0;
        grounded = true;
        bottom = rect.y + rect.h;
      }
    }
  }

  return { y: nextY, grounded };
}

function applyEdgeSlide(dt, grounded) {
  if (!grounded || Math.abs(player.vx) > 0.5) return;
  const hb = playerHitboxAt(player.x, player.y);
  const footY = hb.y + hb.h;
  const yEps = 1.5;
  let best = null;

  for (const s of solidRects) {
    if (Math.abs(s.y - footY) > yEps) continue;
    const overlapW = Math.min(hb.x + hb.w, s.x + s.w) - Math.max(hb.x, s.x);
    if (overlapW <= 0) continue;
    if (!best || overlapW > best.overlapW) best = { overlapW, centerX: s.x + s.w * 0.5 };
  }

  for (const p of oneWayPlatforms) {
    if (Math.abs(p.y - footY) > yEps) continue;
    const overlapW = Math.min(hb.x + hb.w, p.x + p.w) - Math.max(hb.x, p.x);
    if (overlapW <= 0) continue;
    if (!best || overlapW > best.overlapW) best = { overlapW, centerX: p.x + p.w * 0.5 };
  }

  if (!best || best.overlapW >= hb.w * EDGE_SLIDE_MIN_SUPPORT_FRAC) return;

  const hbCenterX = hb.x + hb.w * 0.5;
  const dir = hbCenterX < best.centerX ? -1 : 1;
  const nextX = player.x + dir * EDGE_SLIDE_SPEED * dt;
  player.x = Math.max(-12, Math.min(WORLD_W - HITBOX_W + 12, resolveHorizontal(nextX)));
}

function initializeLevel(levelData) {
  const level = levelData.levels[0];
  if (!level || !level.background) {
    throw new Error("Level data is missing level[0].background.");
  }

  WORLD_W = Math.round((level.background.width / level.background.height) * VIEW_H);
  worldToLevelScaleX = WORLD_W / level.background.width;
  worldToLevelScaleY = VIEW_H / level.background.height;

  oneWayPlatforms = (level.platforms || []).map(platformToRect);
  solidRects = (level.solidBlocks || []).map(blockToRect);

  const spawn = level.playerStart;
  if (spawn && Number.isFinite(spawn.x) && Number.isFinite(spawn.y)) {
    player.x = toWorldX(spawn.x) - drawW / 2;
    player.y = toWorldYBottom(spawn.y) - drawH;
  } else {
    player.x = PLAYER_START_X;
    player.y = floorY - drawH;
  }

  const rawPar = level.parTimeSec;
  levelParTimeSec =
    Number.isFinite(rawPar) && rawPar > 0 ? Math.floor(rawPar) : DEFAULT_LEVEL_PAR_TIME_SEC;

  rebuildCollectiblesFromLevel(level);
  levelPaperTotal = collectibles.filter((c) => c.kind === "paper").length;
  levelPaperAnswered = 0;
  levelBeadsCollected = 0;
  levelBooksCollected = 0;
  levelQuestionsCorrect = 0;
  wasInExitZone = false;

  levelExitRect = null;
  const exitSpec = level.exit;
  const exitImgForSize = exitClosedImg?.naturalHeight ? exitClosedImg : exitOpenImg;
  if (exitSpec && exitImgForSize?.naturalHeight && Number.isFinite(exitSpec.x) && Number.isFinite(exitSpec.y)) {
    const nh = exitImgForSize.naturalHeight;
    const scale = EXIT_MAX_H / nh;
    const dw = exitImgForSize.naturalWidth * scale;
    const dh = EXIT_MAX_H;
    levelExitRect = {
      x: toWorldX(exitSpec.x) - dw / 2,
      y: toWorldYBottom(exitSpec.y) - dh,
      w: dw,
      h: dh,
    };
  }

  beadJumpVelocityMul = 1;
  beadTerminalFallVy = Number.POSITIVE_INFINITY;
  revealRadiusAnimStartMs = 0;
  lanternLightRadiusMul = LANTERN_GLOW_RADIUS_MUL;

  player.vx = 0;
  player.vy = 0;
  player.anim = "idle";
  player.frameIndex = 0;
  player.frameTime = 0;
  player.blinkCountdown = randBlinkDelay();

  levelTimerStartMs = performance.now();
  levelTimerFrozenElapsedSec = null;
}

/** Golden angle in radians — successive indices land ~137° apart on the phase circle (strong desync). */
const COLLECTIBLE_BOB_GOLDEN = Math.PI * (3 - Math.sqrt(5));

function wrapBobPhase(p) {
  const t = p % (Math.PI * 2);
  return t < 0 ? t + Math.PI * 2 : t;
}

function collectibleBobPhase(seq, levelX, levelY) {
  const base = seq * COLLECTIBLE_BOB_GOLDEN;
  const jitter =
    Math.sin(levelX * 0.041) * 1.1 + Math.cos(levelY * 0.037) * 1.3 + Math.sin((levelX + levelY) * 0.019) * 0.9;
  return wrapBobPhase(base + jitter);
}

function getCollectibleBobOffset(c) {
  return Math.sin(collectibleAnimTime * COLLECTIBLE_BOB_ANGULAR + c.bobPhase) * COLLECTIBLE_BOB_AMPLITUDE;
}

function applyBeadBuff(buff) {
  if (buff === "jump") beadJumpVelocityMul += BEAD_JUMP_ADD_PER;
  else if (buff === "light") lanternLightRadiusMul += BEAD_LIGHT_RADIUS_ADD_PER;
  else if (buff === "gravity" && !Number.isFinite(beadTerminalFallVy)) beadTerminalFallVy = BEAD_TERMINAL_FALL_VY;
  else if (buff === "reveal") revealRadiusAnimStartMs = performance.now();
}

function pickupLabelForCollectible(c) {
  if (c.kind === "paper") return "سؤال جديد";
  if (c.kind === "book") return "وسيلة مساعدة";
  if (c.kind === "beads") {
    if (c.buff === "jump") return "قفز أعلى";
    if (c.buff === "light") return "ضوء أكثر";
    if (c.buff === "gravity") return "جاذبية أقل";
    if (c.buff === "reveal") return "كشف كامل!";
    return "حصلت على سبحة!";
  }
  return COLLECTIBLE_PICKUP_LABEL_PLACEHOLDER;
}

function rebuildCollectiblesFromLevel(level) {
  collectibles = [];
  collectibleAnimTime = 0;
  const data = level.collectibles;
  if (!data) return;

  let bobSeq = 0;
  const pushItems = (items, kind, img, maxH) => {
    if (!img || !Array.isArray(items)) return;
    const nh = img.naturalHeight;
    if (!nh) return;
    const scale = maxH / nh;
    const dw = img.naturalWidth * scale;
    const dh = maxH;
    for (const it of items) {
      if (!Number.isFinite(it.x) || !Number.isFinite(it.y)) continue;
      const x = toWorldX(it.x) - dw / 2;
      const y = toWorldYBottom(it.y) - dh;
      collectibles.push({
        kind,
        id: it.id,
        x,
        y,
        w: dw,
        h: dh,
        collected: false,
        img,
        bobPhase: collectibleBobPhase(bobSeq++, it.x, it.y),
        particles: [],
        particleSpawnAcc: Math.random() * COLLECTIBLE_PARTICLE_SPAWN_INTERVAL,
        buff: kind === "beads" && typeof it.buff === "string" ? it.buff.trim().toLowerCase() : undefined,
      });
    }
  };

  pushItems(data.beads, "beads", beadsImg, BEADS_MAX_H);
  pushItems(data.book, "book", bookImg, BOOK_MAX_H);
  pushItems(data.paper, "paper", paperImg, PAPER_MAX_H);
}

function animFps(name) {
  switch (name) {
    case "run":
      return 10;
    case "blink":
      return 10;
    case "prejump":
      return 22;
    case "jump":
      return 10;
    case "landing":
      return 20;
    default:
      return 5;
  }
}

function animRow(name) {
  switch (name) {
    case "run":
      return RUN_ROW;
    case "blink":
      return BLINK_ROW;
    case "prejump":
      return PREJUMP_ROW;
    case "jump":
    case "landing":
      return JUMP_ROW;
    default:
      return IDLE_ROW;
  }
}

function sheetCol(name) {
  if (name === "prejump") return PREJUMP_COL + player.frameIndex;
  if (name === "jump") return JUMP_LOOP_COL + player.frameIndex;
  if (name === "landing") return LANDING_COL + player.frameIndex;
  return player.frameIndex;
}

function isGroundedAnim() {
  return player.anim === "idle" || player.anim === "blink" || player.anim === "run";
}

function advanceAnimFrames(dt, animName, count, loop) {
  const fps = animFps(animName);
  const step = 1 / fps;
  player.frameTime += dt;
  while (player.frameTime >= step) {
    player.frameTime -= step;
    if (loop) {
      player.frameIndex = (player.frameIndex + 1) % count;
    } else {
      player.frameIndex += 1;
      if (player.frameIndex >= count) {
        return true;
      }
    }
  }
  return false;
}

function update(dt) {
  const left = keys.has("ArrowLeft") || keys.has("KeyA");
  const right = keys.has("ArrowRight") || keys.has("KeyD");

  const speed = 300;
  let input = 0;
  if (left) input -= 1;
  if (right) input += 1;

  player.vx = input * speed;
  if (input !== 0) {
    player.facing = input > 0 ? 1 : -1;
  }

  const wantJump = jumpQueued;
  jumpQueued = false;

  const moving = Math.abs(player.vx) > 0.5;

  if (player.anim === "prejump") {
    player.vy = 0;
    const nextX = player.x + player.vx * dt;
    player.x = Math.max(-12, Math.min(WORLD_W - HITBOX_W + 12, resolveHorizontal(nextX)));

    const done = advanceAnimFrames(dt, "prejump", PREJUMP_COUNT, false);
    if (done) {
      player.anim = "jump";
      player.frameIndex = 0;
      player.frameTime = 0;
      player.vy = JUMP_VELOCITY * beadJumpVelocityMul;
    }
    return;
  }

  player.vy += gravity * dt;
  if (Number.isFinite(beadTerminalFallVy) && player.vy > beadTerminalFallVy) player.vy = beadTerminalFallVy;
  const prevBottom = player.y + HITBOX_OY + HITBOX_H;
  const nextX = player.x + player.vx * dt;
  player.x = Math.max(-12, Math.min(WORLD_W - HITBOX_W + 12, resolveHorizontal(nextX)));
  const vertical = resolveVertical(player.y + player.vy * dt, prevBottom);
  player.y = vertical.y;
  player.grounded = vertical.grounded;
  applyEdgeSlide(dt, vertical.grounded);

  if (wantJump && vertical.grounded && player.anim !== "prejump") {
    player.anim = "prejump";
    player.frameIndex = 0;
    player.frameTime = 0;
    player.vy = 0;
    return;
  }

  if (player.anim === "landing") {
    const landed = advanceAnimFrames(dt, "landing", LANDING_COUNT, false);
    if (landed) {
      player.anim = moving ? "run" : "idle";
      player.frameIndex = 0;
      player.frameTime = 0;
      if (player.anim === "idle") {
        player.blinkCountdown = randBlinkDelay();
      }
    }
    return;
  }

  if (player.anim === "jump") {
    if (vertical.grounded) {
      player.anim = "landing";
      player.frameIndex = 0;
      player.frameTime = 0;
      return;
    }
    advanceAnimFrames(dt, "jump", JUMP_LOOP_COUNT, true);
    return;
  }

  if (!vertical.grounded) {
    player.anim = "jump";
    player.frameIndex = 0;
    player.frameTime = 0;
    advanceAnimFrames(dt, "jump", JUMP_LOOP_COUNT, true);
    return;
  }

  if (moving) {
    if (player.anim !== "run") {
      player.anim = "run";
      player.frameIndex = 0;
      player.frameTime = 0;
    }
  } else {
    if (player.anim === "run") {
      player.anim = "idle";
      player.frameIndex = 0;
      player.frameTime = 0;
      player.blinkCountdown = randBlinkDelay();
    }
    if (player.anim === "idle") {
      player.blinkCountdown -= dt;
      if (player.blinkCountdown <= 0) {
        player.anim = "blink";
        player.frameIndex = 0;
        player.frameTime = 0;
      }
    }
  }

  const fps = animFps(player.anim);
  const step = 1 / fps;
  player.frameTime += dt;

  if (player.anim === "run") {
    while (player.frameTime >= step) {
      player.frameTime -= step;
      player.frameIndex = (player.frameIndex + 1) % RUN_COUNT;
    }
  } else if (player.anim === "idle") {
    while (player.frameTime >= step) {
      player.frameTime -= step;
      player.frameIndex = (player.frameIndex + 1) % IDLE_COUNT;
    }
  } else if (player.anim === "blink") {
    while (player.frameTime >= step) {
      player.frameTime -= step;
      player.frameIndex += 1;
      if (player.frameIndex >= BLINK_COUNT) {
        player.anim = "idle";
        player.frameIndex = 0;
        player.blinkCountdown = randBlinkDelay();
        break;
      }
    }
  }
}

function getLanternWorldPosition() {
  const cx = player.x + drawW / 2;
  const cy = player.y + drawH / 2;
  const ox = LANTERN_ANCHOR_X_FRAC * drawW;
  const oy = LANTERN_ANCHOR_Y_FRAC * drawH;
  return {
    x: cx + player.facing * ox,
    y: cy + oy,
  };
}

function getLanternScreenPosition() {
  const w = getLanternWorldPosition();
  return { x: w.x - cameraX, y: w.y };
}

function smoothstep01(t) {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
}

/** 1 = no reveal boost; ramps to BEAD_REVEAL_RADIUS_MUL then back to 1. Clears start time when finished. */
function getRevealRadiusMulNow() {
  if (revealRadiusAnimStartMs <= 0) return 1;
  const elapsed = performance.now() - revealRadiusAnimStartMs;
  const growMs = BEAD_REVEAL_GROW_SEC * 1000;
  const holdMs = BEAD_REVEAL_HOLD_SEC * 1000;
  const shrinkMs = BEAD_REVEAL_SHRINK_SEC * 1000;
  if (elapsed >= growMs + holdMs + shrinkMs) {
    revealRadiusAnimStartMs = 0;
    return 1;
  }
  const peak = BEAD_REVEAL_RADIUS_MUL;
  if (elapsed < growMs) return 1 + (peak - 1) * smoothstep01(elapsed / growMs);
  if (elapsed < growMs + holdMs) return peak;
  return peak + (1 - peak) * smoothstep01((elapsed - growMs - holdMs) / shrinkMs);
}

function getLanternLightRadius() {
  const base = Math.max(drawW, drawH) * lanternLightRadiusMul;
  return base * getRevealRadiusMulNow();
}

/** Max distance for collectible fade-in; matches darkness gradient outer edge. */
function getLanternRevealRadius() {
  return getLanternLightRadius() * LANTERN_DARKNESS_OUTER_R_MUL;
}

function collectibleLightOverlapRatio(c, drawY, lightWorldX, lightWorldY, lightR) {
  // Level anchor is bottom-center; match that in world space with lantern world position.
  const ax = c.x + c.w * 0.5;
  const ay = drawY + c.h;
  const dx = ax - lightWorldX;
  const dy = ay - lightWorldY;
  const d = Math.hypot(dx, dy);
  if (d >= lightR) return 0;
  return (lightR - d) / lightR;
}

function collectibleOpacityFromLightOverlap(overlap01) {
  if (overlap01 <= 0) return 0;
  // 0% overlap -> 0 alpha, 30% overlap -> full alpha.
  return Math.min(1, overlap01 / 0.3);
}

function spawnCollectibleParticleAt(cx, cy) {
  const ang = Math.random() * Math.PI * 2;
  const sp =
    COLLECTIBLE_PARTICLE_SPEED_MIN +
    Math.random() * (COLLECTIBLE_PARTICLE_SPEED_MAX - COLLECTIBLE_PARTICLE_SPEED_MIN);
  const appearDelay =
    COLLECTIBLE_PARTICLE_APPEAR_DELAY_MIN +
    Math.random() * (COLLECTIBLE_PARTICLE_APPEAR_DELAY_MAX - COLLECTIBLE_PARTICLE_APPEAR_DELAY_MIN);
  const visibleLife =
    COLLECTIBLE_PARTICLE_LIFE_MIN + Math.random() * COLLECTIBLE_PARTICLE_LIFE_RANGE;
  return {
    x: cx,
    y: cy,
    vx: Math.cos(ang) * sp,
    vy: Math.sin(ang) * sp,
    t: 0,
    appearDelay,
    life: appearDelay + visibleLife,
    r0: COLLECTIBLE_PARTICLE_R0_MIN + Math.random() * COLLECTIBLE_PARTICLE_R0_RANGE,
  };
}

function updateCollectibleParticles(dt) {
  if (collectibles.length === 0) return;
  for (const c of collectibles) {
    const dy = getCollectibleBobOffset(c);
    const drawY = c.y + dy;
    const cx = c.x + c.w * 0.5;
    const cy = drawY + c.h * 0.5;
    // Once picked up: no new particles; existing ones keep simulating in world space (not parented to pickup motion).
    if (!c.collected) {
      c.particleSpawnAcc += dt;
      while (
        c.particleSpawnAcc >= COLLECTIBLE_PARTICLE_SPAWN_INTERVAL &&
        c.particles.length < COLLECTIBLE_PARTICLE_MAX_PER_ITEM
      ) {
        c.particles.push(spawnCollectibleParticleAt(cx, cy));
        c.particleSpawnAcc -= COLLECTIBLE_PARTICLE_SPAWN_INTERVAL;
      }
    }
    for (let i = c.particles.length - 1; i >= 0; i--) {
      const p = c.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.t += dt;
      if (p.t >= p.life) c.particles.splice(i, 1);
    }
  }
}

function getCollectiblePickupPhaseTotalSec() {
  return Math.max(
    COLLECTIBLE_PICKUP_DURATION,
    COLLECTIBLE_PICKUP_TEXT_FADE_START_SEC + COLLECTIBLE_PICKUP_TEXT_FADE_DURATION_SEC
  );
}

function updateCollectiblePickupAnims(dt) {
  const total = getCollectiblePickupPhaseTotalSec();
  for (const c of collectibles) {
    if (!c.collected || c.pickupAnimT == null) continue;
    c.pickupAnimT += dt;
    if (c.pickupAnimT >= total) c.pickupAnimT = null;
  }
}

function drawCollectibleParticles(renderCtx, c, overlap01) {
  if (c.particles.length === 0) return;
  const lightAlpha = collectibleOpacityFromLightOverlap(overlap01);
  if (lightAlpha <= 0.001) return;
  for (const p of c.particles) {
    if (p.t < p.appearDelay) continue;
    const phaseLen = p.life - p.appearDelay;
    if (phaseLen <= 0) continue;
    const uv = (p.t - p.appearDelay) / phaseLen;
    if (uv >= 1) continue;
    const fSize = 1 - uv;
    const r = p.r0 * (0.1 + 0.9 * fSize);
    const fadeIn = Math.min(1, uv / 0.12);
    const fadeOut = (1 - uv) * (1 - uv);
    const fade = fadeIn * fadeOut;
    const a = fade * lightAlpha * 0.85;
    const rOuter = Math.max(0.25, r);
    const rInner = Math.min(rOuter * 0.18, rOuter - 0.15);
    const g = renderCtx.createRadialGradient(p.x, p.y, rInner, p.x, p.y, rOuter);
    g.addColorStop(0, `rgba(255, 248, 228, ${0.95 * a})`);
    g.addColorStop(0.22, `rgba(255, 220, 150, ${0.5 * a})`);
    g.addColorStop(0.5, `rgba(255, 185, 100, ${0.12 * a})`);
    g.addColorStop(1, "rgba(255, 160, 80, 0)");
    renderCtx.fillStyle = g;
    renderCtx.beginPath();
    renderCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
    renderCtx.fill();
  }
}

/**
 * @param {boolean} [clipToExistingAlpha] When true (foreground buffer), lantern only affects pixels
 *   already drawn (fg/player/collectibles). Transparent areas stay clear so the dimmed BG shows through.
 */
function drawLanternGlowOnContext(surface, vw, vh, clipToExistingAlpha = false) {
  const { x, y } = getLanternScreenPosition();
  const r = getLanternLightRadius();

  surface.save();
  if (clipToExistingAlpha) {
    surface.globalCompositeOperation = "source-atop";
  }

  // Darkness mask: transparent near lantern, dark farther away.
  const darkness = surface.createRadialGradient(
    x,
    y,
    r * LANTERN_DARKNESS_INNER_R_MUL,
    x,
    y,
    r * LANTERN_DARKNESS_OUTER_R_MUL
  );
  darkness.addColorStop(0, "rgba(0, 0, 0, 0)");
  darkness.addColorStop(0.45, "rgba(8, 10, 16, 0.25)");
  darkness.addColorStop(0.75, "rgba(8, 10, 16, 0.62)");
  darkness.addColorStop(1, "rgba(8, 10, 16, 0.86)");
  surface.fillStyle = darkness;
  surface.fillRect(0, 0, vw, vh);

  // Subtle warm lantern tint without washing out details.
  const warm = surface.createRadialGradient(x, y, 0, x, y, r * LANTERN_WARM_GLOW_R_MUL);
  warm.addColorStop(0, "rgba(255, 222, 158, 0.15)");
  warm.addColorStop(0.6, "rgba(255, 190, 96, 0.08)");
  warm.addColorStop(1, "rgba(255, 160, 80, 0)");
  surface.fillStyle = warm;
  surface.fillRect(Math.floor(x - r), Math.floor(y - r), Math.ceil(r * 2), Math.ceil(r * 2));

  surface.restore();
}

function drawLanternGlow() {
  drawLanternGlowOnContext(ctx, VIEW_W, VIEW_H);
}

function ensureFgLayer() {
  if (!fgLayerCanvas) {
    fgLayerCanvas = document.createElement("canvas");
    fgLayerCanvas.width = VIEW_W;
    fgLayerCanvas.height = VIEW_H;
    fgLayerCtx = fgLayerCanvas.getContext("2d");
  }
}

function drawPlayer(renderCtx = ctx) {
  const row = animRow(player.anim);
  const col = sheetCol(player.anim);
  const sx = col * FRAME;
  const sy = row * FRAME;

  renderCtx.save();
  const cx = player.x + drawW / 2;
  const cy = player.y + drawH / 2;
  renderCtx.translate(cx, cy);
  renderCtx.scale(player.facing, 1);
  renderCtx.drawImage(
    sheet,
    sx,
    sy,
    FRAME,
    FRAME,
    -drawW / 2,
    -drawH / 2,
    drawW,
    drawH
  );
  renderCtx.restore();
}

/** Background scaled to cover the full world width (call inside world transform). */
function drawBackgroundWorld(renderCtx = ctx) {
  if (!bgImg) {
    renderCtx.fillStyle = "#24283b";
    renderCtx.fillRect(0, 0, WORLD_W, VIEW_H);
    return;
  }
  const iw = bgImg.naturalWidth;
  const ih = bgImg.naturalHeight;
  const scale = Math.max(WORLD_W / iw, VIEW_H / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (WORLD_W - dw) / 2;
  const dy = (VIEW_H - dh) / 2;
  renderCtx.drawImage(bgImg, dx, dy, dw, dh);
}

/** Foreground art (transparent outside objects); same placement as background. */
function drawForegroundWorld(renderCtx = ctx) {
  if (!fgImg) return;
  const iw = fgImg.naturalWidth;
  const ih = fgImg.naturalHeight;
  if (!iw || !ih) return;
  const scale = Math.max(WORLD_W / iw, VIEW_H / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (WORLD_W - dw) / 2;
  const dy = (VIEW_H - dh) / 2;
  renderCtx.drawImage(fgImg, dx, dy, dw, dh);
}

function drawDebugColliders(renderCtx = ctx) {
  renderCtx.save();
  renderCtx.strokeStyle = "#ff0000";
  renderCtx.lineWidth = 2;
  renderCtx.globalAlpha = 0.95;
  for (const s of solidRects) {
    renderCtx.strokeRect(s.x, s.y, s.w, s.h);
  }
  for (const p of oneWayPlatforms) {
    renderCtx.beginPath();
    renderCtx.moveTo(p.x, p.y + 0.5);
    renderCtx.lineTo(p.x + p.w, p.y + 0.5);
    renderCtx.stroke();
  }
  renderCtx.strokeStyle = "#00e5ff";
  const hb = playerHitboxAt(player.x, player.y);
  renderCtx.strokeRect(hb.x, hb.y, hb.w, hb.h);
  renderCtx.restore();
}

function updateCamera() {
  const target = player.x + drawW / 2 - VIEW_W / 2;
  cameraX = Math.max(0, Math.min(WORLD_W - VIEW_W, target));
}

function clearQuestionKbdFocus() {
  for (const b of questionOptionsEl.querySelectorAll("button")) {
    b.classList.remove("question-option--kbd-focus");
  }
}

function updateQuestionKbdFocus() {
  const btns = [...questionOptionsEl.querySelectorAll("button:not(:disabled)")];
  clearQuestionKbdFocus();
  if (btns.length === 0) return;
  questionKbdFocusIndex = Math.max(0, Math.min(questionKbdFocusIndex, btns.length - 1));
  btns[questionKbdFocusIndex].classList.add("question-option--kbd-focus");
}

function syncQuestionKbdFocusFromButton(btn) {
  if (!btn || btn.disabled) return;
  const all = [...questionOptionsEl.querySelectorAll("button:not(:disabled)")];
  const i = all.indexOf(btn);
  if (i >= 0) {
    questionKbdFocusIndex = i;
    updateQuestionKbdFocus();
  }
}

/**
 * Nth paper answered this level is `paperOrdinal1Based` (1 = first pickup after prior answers).
 * Levels 1–5: 1 → MCQ, 2 → T/F (same index as level − 1 in bank order).
 * Level 6: MCQ, T/F, then MCQ — 13 unique questions total with the current bank.
 */
function getQuestionForLevelPaper(levelIndex, paperOrdinal1Based) {
  const mcqs = questionsBank.filter((q) => q.type === "mcq");
  const tfs = questionsBank.filter((q) => q.type === "tf");
  const L = Math.max(1, Math.floor(levelIndex));
  const p = Math.max(1, Math.floor(paperOrdinal1Based));

  if (L >= 1 && L <= 5) {
    if (p === 1) return mcqs[L - 1] ?? null;
    if (p === 2) return tfs[L - 1] ?? null;
    return null;
  }
  if (L === 6) {
    if (p === 1) return mcqs[5] ?? null;
    if (p === 2) return tfs[5] ?? null;
    if (p === 3) return mcqs[6] ?? null;
    return null;
  }
  return null;
}

function closeQuestionOverlay() {
  clearQuestionKbdFocus();
  questionOverlay.hidden = true;
  questionOverlay.setAttribute("aria-hidden", "true");
  isQuestionOpen = false;
  questionOptionsEl.innerHTML = "";
  questionFeedbackEl.hidden = true;
  questionContinueBtn.hidden = true;
  questionFeedbackEl.classList.remove("is-correct-msg");
  questionHintTextEl.hidden = true;
  questionHintTextEl.textContent = "";
  questionHintBookBtn.hidden = true;
  questionHintBookBtn.disabled = false;
  questionHintBookBtn.onclick = null;
}

function showRandomQuestion() {
  clearTouchPointerInput();
  if (questionsBank.length === 0) return;
  const paperOrdinal = levelPaperAnswered + 1;
  let q = getQuestionForLevelPaper(currentLevelIndex, paperOrdinal);
  if (!q) {
    console.warn(
      `No question mapped for level ${currentLevelIndex}, paper ${paperOrdinal}; using random pick.`,
    );
    q = questionsBank[Math.floor(Math.random() * questionsBank.length)];
  }
  isQuestionOpen = true;
  questionTextEl.textContent = q.prompt;
  questionFeedbackEl.hidden = true;
  questionFeedbackEl.classList.remove("is-correct-msg");
  questionContinueBtn.hidden = true;
  questionOptionsEl.innerHTML = "";
  questionOptionsEl.className = "question-options";

  questionHintTextEl.hidden = true;
  questionHintTextEl.textContent = "";
  const hintStr = q.hint || "";
  if (hintStr) {
    questionHintBookBtn.hidden = false;
    questionHintBookBtn.disabled = booksHeld <= 0;
    questionHintBookBtn.title =
      booksHeld > 0 ? "تلميح (يستهلك كتابًا واحدًا)" : "لا تملك كتبًا";
    questionHintBookBtn.setAttribute(
      "aria-label",
      booksHeld > 0 ? "استخدم كتابًا لإظهار التلميح" : "لا توجد كتب لاستخدام التلميح",
    );
    questionHintBookBtn.onclick = () => {
      if (booksHeld <= 0 || questionHintBookBtn.disabled) return;
      booksHeld -= 1;
      questionHintTextEl.textContent = hintStr;
      questionHintTextEl.hidden = false;
      questionHintBookBtn.hidden = true;
      questionHintBookBtn.onclick = null;
    };
  } else {
    questionHintBookBtn.hidden = true;
    questionHintBookBtn.onclick = null;
  }

  const afterAnswer = (correct) => {
    clearQuestionKbdFocus();
    questionHintBookBtn.hidden = true;
    questionHintBookBtn.onclick = null;
    if (correct) {
      score += SCORE_POINTS_PER_CORRECT;
      questionsCorrectTotal += 1;
      levelQuestionsCorrect += 1;
    }
    levelPaperAnswered = Math.min(levelPaperTotal, levelPaperAnswered + 1);
    hudPulsePaperT = 0;
    if (correct) hudPulseScoreT = 0;
    questionFeedbackEl.hidden = false;
    const baseFeedback = correct ? "إجابة صحيحة!" : "إجابة خاطئة.";
    const commentStr = q.comment || "";
    questionFeedbackEl.textContent = commentStr ? `${baseFeedback}\n${commentStr}` : baseFeedback;
    if (correct) questionFeedbackEl.classList.add("is-correct-msg");
    questionContinueBtn.hidden = false;
  };

  if (q.type === "mcq") {
    questionOptionsEl.classList.add("question-options--mcq");
    q.choices.forEach((label, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.tabIndex = -1;
      btn.textContent = label;
      btn.dataset.idx = String(idx);
      btn.addEventListener("click", () => {
        if (questionOptionsEl.querySelector("button:disabled")) return;
        const ok = idx === q.correctIndex;
        for (const b of questionOptionsEl.querySelectorAll("button")) {
          b.disabled = true;
          const bi = Number(b.dataset.idx);
          if (bi === q.correctIndex) b.classList.add("is-correct");
          else if (bi === idx && !ok) b.classList.add("is-wrong");
        }
        if (!ok) questionOptionsEl.classList.add("question-options--picked-wrong");
        afterAnswer(ok);
      });
      btn.addEventListener("mouseenter", () => syncQuestionKbdFocusFromButton(btn));
      questionOptionsEl.appendChild(btn);
    });
  } else {
    questionOptionsEl.classList.add("question-options--tf");
    for (const val of [true, false]) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.tabIndex = -1;
      btn.textContent = val ? "صحيح" : "خطأ";
      btn.dataset.tf = val ? "1" : "0";
      btn.addEventListener("click", () => {
        if (questionOptionsEl.querySelector("button:disabled")) return;
        const ok = val === q.answer;
        for (const b of questionOptionsEl.querySelectorAll("button")) {
          b.disabled = true;
          const bv = b.dataset.tf === "1";
          if (bv === q.answer) b.classList.add("is-correct");
          else if (bv === val && !ok) b.classList.add("is-wrong");
        }
        if (!ok) questionOptionsEl.classList.add("question-options--picked-wrong");
        afterAnswer(ok);
      });
      btn.addEventListener("mouseenter", () => syncQuestionKbdFocusFromButton(btn));
      questionOptionsEl.appendChild(btn);
    }
  }

  questionOverlay.hidden = false;
  questionOverlay.setAttribute("aria-hidden", "false");
  questionKbdFocusIndex = 0;
  updateQuestionKbdFocus();
}

questionContinueBtn.addEventListener("click", closeQuestionOverlay);

function isExitUnlocked() {
  return levelPaperTotal === 0 || levelPaperAnswered >= levelPaperTotal;
}

function checkCollectibles() {
  if (collectibles.length === 0 || isQuestionOpen) return;
  const hb = playerHitboxAt(player.x, player.y);
  for (const c of collectibles) {
    if (c.collected || !c.img) continue;
    const dy = getCollectibleBobOffset(c);
    const y = c.y + dy;
    if (
      hb.x < c.x + c.w &&
      hb.x + hb.w > c.x &&
      hb.y < y + c.h &&
      hb.y + hb.h > y
    ) {
      c.collected = true;
      c.pickupAnimT = 0;
      c.pickupLabel = pickupLabelForCollectible(c);
      if (c.kind === "beads") {
        score += BEAD_POINTS_AMOUNT;
        levelBeadsCollected += 1;
        hudPulseScoreT = 0;
        applyBeadBuff(c.buff);
      }
      if (c.kind === "paper") {
        if (questionsBank.length > 0) questionsCollectedTotal += 1;
        showRandomQuestion();
      } else if (c.kind === "book") {
        booksHeld += 1;
        levelBooksCollected += 1;
        score += BOOK_PICKUP_SCORE;
        hudPulseBookT = 0;
        hudPulseScoreT = 0;
      }
    }
  }
}

function checkExit() {
  if (!levelExitRect || isQuestionOpen || !isExitUnlocked()) {
    wasInExitZone = false;
    return;
  }
  const r = levelExitRect;
  const doorCx = r.x + r.w * 0.5;
  const doorBy = r.y + r.h;
  const px = player.x + drawW * 0.5;
  const py = player.y + drawH;
  const d = Math.hypot(px - doorCx, py - doorBy);
  const closeEnough = d <= EXIT_TRIGGER_MAX_DIST_PX;
  const canExitHere = closeEnough && player.grounded;
  if (canExitHere && !wasInExitZone) {
    const elapsedSec = getLevelElapsedSec();
    const timeBonus = computeTimeBonusPoints(elapsedSec, levelParTimeSec);
    score += timeBonus;
    if (timeBonus > 0) hudPulseScoreT = 0;
    const snapshot = {
      completedLevel: currentLevelIndex,
      elapsedSec,
      timeBonus,
      beads: levelBeadsCollected,
      books: levelBooksCollected,
      papersAnswered: levelPaperAnswered,
      papersTotal: levelPaperTotal,
      questionsCorrect: levelQuestionsCorrect,
      totalScore: score,
    };
    const isFinal = currentLevelIndex >= maxLevelIndex;
    openLevelCompleteScreen(isFinal, snapshot);
  }
  wasInExitZone = canExitHere;
}

function drawExit(renderCtx = ctx) {
  if (!levelExitRect) return;
  const img = isExitUnlocked() ? exitOpenImg : exitClosedImg;
  if (!img?.naturalHeight) return;
  const { x, y, w, h } = levelExitRect;
  renderCtx.drawImage(img, x, y, w, h);
}

function drawCollectibles(renderCtx = ctx) {
  const { x: lightWorldX, y: lightWorldY } = getLanternWorldPosition();
  const lightR = getLanternRevealRadius();
  for (const c of collectibles) {
    if (!c.img) continue;
    const dy = getCollectibleBobOffset(c);
    const drawY = c.y + dy;
    const overlap01 = collectibleLightOverlapRatio(c, drawY, lightWorldX, lightWorldY, lightR);
    if (!c.collected) {
      const alpha = collectibleOpacityFromLightOverlap(overlap01);
      if (alpha <= 0.001) continue;
      renderCtx.save();
      renderCtx.globalAlpha = alpha;
      renderCtx.drawImage(c.img, c.x, drawY, c.w, c.h);
      renderCtx.restore();
      drawCollectibleParticles(renderCtx, c, overlap01);
    } else if (c.pickupAnimT != null) {
      // Draw lingering particles first at world positions; pickup sprite/text use their own transform only.
      drawCollectibleParticles(renderCtx, c, overlap01);
      const t = c.pickupAnimT;
      const dur = COLLECTIBLE_PICKUP_DURATION;
      const tSprite = Math.min(1, t / dur);
      const ease = 1 - (1 - tSprite) ** 3;
      const rise = ease * COLLECTIBLE_PICKUP_RISE_PX;
      const scale = 1 + ease * COLLECTIBLE_PICKUP_SCALE_EXTRA;
      const fade = 1 - tSprite;
      const cx = c.x + c.w * 0.5;
      const cy = drawY + c.h * 0.5 - rise;
      if (t < dur) {
        renderCtx.save();
        renderCtx.globalAlpha = fade;
        renderCtx.translate(cx, cy);
        renderCtx.scale(scale, scale);
        renderCtx.drawImage(c.img, -c.w * 0.5, -c.h * 0.5, c.w, c.h);
        renderCtx.restore();
      }
      renderCtx.save();
      const textFadeIn = Math.min(1, t / Math.max(0.001, COLLECTIBLE_PICKUP_TEXT_FADE_IN_SEC));
      let textFadeOut = 1;
      if (t >= COLLECTIBLE_PICKUP_TEXT_FADE_START_SEC) {
        const u =
          (t - COLLECTIBLE_PICKUP_TEXT_FADE_START_SEC) /
          Math.max(0.001, COLLECTIBLE_PICKUP_TEXT_FADE_DURATION_SEC);
        textFadeOut = 1 - Math.min(1, Math.max(0, u));
      }
      renderCtx.globalAlpha = textFadeIn * textFadeOut * 0.96;
      renderCtx.font = '600 15px "Rooyin", system-ui, sans-serif';
      renderCtx.fillStyle = "rgba(255, 245, 220, 0.95)";
      renderCtx.textBaseline = "middle";
      renderCtx.direction = "rtl";
      const label = c.pickupLabel || COLLECTIBLE_PICKUP_LABEL_PLACEHOLDER;
      const tw = renderCtx.measureText(label).width;
      const halfScaledW = (c.w * scale) * 0.5;
      const margin = 10;
      const viewL = cameraX + COLLECTIBLE_PICKUP_TEXT_SCREEN_PAD;
      const viewR = cameraX + VIEW_W - COLLECTIBLE_PICKUP_TEXT_SCREEN_PAD;
      let textX = cx + halfScaledW + margin;
      let textAlign = "left";
      let fits = textX >= viewL && textX + tw <= viewR;
      if (!fits) {
        textAlign = "right";
        textX = cx - halfScaledW - margin;
        fits = textX - tw >= viewL && textX <= viewR;
        if (!fits) {
          textAlign = "left";
          textX = Math.min(viewR - tw, Math.max(viewL, cx + halfScaledW + margin));
          if (textX + tw > viewR) textX = Math.max(viewL, viewR - tw);
        }
      }
      renderCtx.textAlign = textAlign;
      renderCtx.fillText(label, textX, cy);
      renderCtx.direction = "ltr";
      renderCtx.restore();
    } else if (c.particles.length > 0) {
      drawCollectibleParticles(renderCtx, c, overlap01);
    }
  }
}

function hudPulseScale(elapsed) {
  if (elapsed < 0 || elapsed >= HUD_PULSE_DURATION_SEC) return 1;
  const u = elapsed / HUD_PULSE_DURATION_SEC;
  return 1 + HUD_PULSE_PEAK_EXTRA * Math.sin(Math.PI * u);
}

function updateHudPulses(dt) {
  const step = (t) => {
    if (t < 0) return t;
    const next = t + dt;
    return next >= HUD_PULSE_DURATION_SEC ? -1 : next;
  };
  hudPulseBookT = step(hudPulseBookT);
  hudPulsePaperT = step(hudPulsePaperT);
  hudPulseScoreT = step(hudPulseScoreT);
}

function drawLeftHud() {
  const padX = LEFT_HUD_PAD_X;
  const bottomY = VIEW_H - LEFT_HUD_PAD_Y;
  const hasPaper = levelPaperTotal > 0 && paperImg?.naturalHeight;
  const hasBook = bookImg?.naturalHeight;
  const yPaper = bottomY - LEFT_HUD_ICON_H;
  const yBook = hasPaper ? yPaper - LEFT_HUD_STACK_GAP - LEFT_HUD_ICON_H : yPaper;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = '600 18px "Rooyin", system-ui, sans-serif';
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  let colW = 0;
  if (hasBook) {
    const nh = bookImg.naturalHeight;
    const scale = LEFT_HUD_ICON_H / nh;
    const iw = bookImg.naturalWidth * scale;
    const tw = ctx.measureText(`× ${booksHeld}`).width;
    colW = Math.max(colW, iw + LEFT_HUD_GAP + tw);
  }
  if (hasPaper) {
    const nh = paperImg.naturalHeight;
    const scale = LEFT_HUD_ICON_H / nh;
    const iw = paperImg.naturalWidth * scale;
    const tw = ctx.measureText(`${levelPaperAnswered}/${levelPaperTotal}`).width;
    colW = Math.max(colW, iw + LEFT_HUD_GAP + tw);
  }

  let exitImg = isExitUnlocked() ? exitOpenImg : exitClosedImg;
  if (!exitImg?.naturalHeight) exitImg = exitClosedImg || exitOpenImg;
  let exitIw = 0;
  let exitIh = LEFT_HUD_ICON_H;
  let exitX = padX;
  if (exitImg?.naturalHeight) {
    const nh = exitImg.naturalHeight;
    const scale = 0.5;
    exitIw = exitImg.naturalWidth * scale;
    exitIh = exitImg.naturalHeight * scale;
    exitX = colW > 0 ? padX + colW + LEFT_HUD_EXIT_GAP : padX;
  }

  const blockTop = hasBook ? yBook : hasPaper ? yPaper : bottomY - LEFT_HUD_ICON_H;
  const yExit = (blockTop + bottomY) * 0.5 - exitIh * 0.5;

  if (hasBook) {
    const nh = bookImg.naturalHeight;
    const scale = LEFT_HUD_ICON_H / nh;
    const iw = bookImg.naturalWidth * scale;
    const ih = LEFT_HUD_ICON_H;
    const label = `× ${booksHeld}`;
    const tw = ctx.measureText(label).width;
    const cx = padX + (iw + LEFT_HUD_GAP + tw) * 0.5;
    const cy = yBook + ih * 0.5;
    const ps = hudPulseScale(hudPulseBookT);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(ps, ps);
    ctx.translate(-cx, -cy);
    ctx.fillStyle = "#c0caf5";
    ctx.drawImage(bookImg, padX, yBook, iw, ih);
    ctx.fillText(label, padX + iw + LEFT_HUD_GAP, yBook + ih * 0.5);
    ctx.restore();
  }

  if (hasPaper) {
    const nh = paperImg.naturalHeight;
    const scale = LEFT_HUD_ICON_H / nh;
    const iw = paperImg.naturalWidth * scale;
    const ih = LEFT_HUD_ICON_H;
    const label = `${levelPaperAnswered}/${levelPaperTotal}`;
    const tw = ctx.measureText(label).width;
    const cx = padX + (iw + LEFT_HUD_GAP + tw) * 0.5;
    const cy = yPaper + ih * 0.5;
    const ps = hudPulseScale(hudPulsePaperT);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(ps, ps);
    ctx.translate(-cx, -cy);
    const allDone = levelPaperAnswered >= levelPaperTotal;
    ctx.fillStyle = allDone ? "#9ece6a" : "#c0caf5";
    ctx.drawImage(paperImg, padX, yPaper, iw, ih);
    ctx.fillText(label, padX + iw + LEFT_HUD_GAP, yPaper + ih * 0.5);
    ctx.restore();
  }

  if (exitImg?.naturalHeight) {
    ctx.drawImage(exitImg, exitX, yExit, exitIw, exitIh);
  }

  ctx.restore();
}

function drawRightHud() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textBaseline = "bottom";
  ctx.textAlign = "right";
  const xRight = VIEW_W - SCORE_HUD_PAD_X;
  const yCorrect = VIEW_H - SCORE_HUD_PAD_Y;
  const yScore = yCorrect - SCORE_HUD_LINE_STEP;
  const yLevel = yScore - SCORE_HUD_LINE_STEP - SCORE_HUD_LEVEL_EXTRA_GAP;

  let pct = 0;
  const correctLabel =
    questionsCollectedTotal === 0
      ? "إجابات صحيحة: 0 / 0"
      : `إجابات صحيحة: ${questionsCorrectTotal} / ${questionsCollectedTotal}`;
  if (questionsCollectedTotal > 0) {
    pct = (100 * questionsCorrectTotal) / questionsCollectedTotal;
  }

  ctx.font = SCORE_HUD_FONT_STAT;
  const scoreLabel = `نقاط: ${score}`;
  const mScore = ctx.measureText(scoreLabel);

  let correctLabelColor = "#c0caf5";
  if (questionsCollectedTotal > 0) {
    if (pct >= 85) correctLabelColor = "#9ece6a";
    else if (pct >= 60) correctLabelColor = "#e0af68";
    else correctLabelColor = "#ff9e9e";
  }
  ctx.fillStyle = correctLabelColor;
  ctx.fillText(correctLabel, xRight, yCorrect);

  ctx.fillStyle = "#c0caf5";
  const tw = mScore.width;
  const ascent = mScore.actualBoundingBoxAscent ?? 4;
  const descent = mScore.actualBoundingBoxDescent ?? 4;
  const cx = xRight - tw * 0.5;
  const cy = yScore - (ascent + descent) * 0.5;
  const ps = hudPulseScale(hudPulseScoreT);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(ps, ps);
  ctx.translate(-cx, -cy);
  ctx.fillText(scoreLabel, xRight, yScore);
  ctx.restore();

  ctx.font = SCORE_HUD_FONT_LEVEL;
  ctx.fillStyle = "#c0caf5";
  ctx.fillText(`المستوى: ${currentLevelIndex}`, xRight, yLevel);
  ctx.restore();
}

/** Elapsed seconds this level (float); for future time bonus scoring. */
function getLevelElapsedSec() {
  if (levelTimerFrozenElapsedSec != null) return levelTimerFrozenElapsedSec;
  if (levelTimerStartMs == null) return 0;
  return (performance.now() - levelTimerStartMs) / 1000;
}

/** `m:ss.cc` from fractional seconds (centisecond precision). */
function formatLevelTime(elapsedSec) {
  if (!Number.isFinite(elapsedSec) || elapsedSec < 0) elapsedSec = 0;
  const cs = Math.min(35999999, Math.floor(elapsedSec * 100));
  const m = Math.floor(cs / 6000);
  const s = Math.floor((cs % 6000) / 100);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function computeTimeBonusPoints(elapsedSec, parSec) {
  const over = Math.max(0, elapsedSec - parSec);
  return Math.max(
    0,
    Math.round(TIME_BONUS_MAX_POINTS - TIME_BONUS_LOSS_PER_SEC_OVER_PAR * over),
  );
}

function closeLevelCompleteScreen() {
  isLevelCompleteScreenOpen = false;
  levelCompleteIsFinal = false;
  levelCompleteOverlay.hidden = true;
  levelCompleteOverlay.setAttribute("aria-hidden", "true");
  levelCompleteActionBtn.tabIndex = -1;
}

function fillLevelCompleteStats(container, snapshot, isFinal) {
  container.replaceChildren();

  const addSummaryRow = (label, valueText, points) => {
    const row = document.createElement("div");
    row.className = "level-complete-stat-row";
    const left = document.createElement("span");
    left.className = "level-complete-stat-left";
    left.textContent = `${label}: ${valueText}`;
    const right = document.createElement("span");
    right.className = "level-complete-stat-right";
    right.textContent = `+\u200E${points} نقطة`;
    row.appendChild(left);
    row.appendChild(right);
    container.appendChild(row);
  };

  const beadPts = snapshot.beads * BEAD_POINTS_AMOUNT;
  const bookPts = snapshot.books * BOOK_PICKUP_SCORE;
  const ansPts = snapshot.questionsCorrect * SCORE_POINTS_PER_CORRECT;

  addSummaryRow("الوقت", formatLevelTime(snapshot.elapsedSec), snapshot.timeBonus);
  addSummaryRow("سبحة", String(snapshot.beads), beadPts);
  addSummaryRow("كتاب", String(snapshot.books), bookPts);
  if (snapshot.papersTotal > 0 && questionsBank.length > 0) {
    addSummaryRow("إجابات صحيحة", String(snapshot.questionsCorrect), ansPts);
  }

  const divider = document.createElement("div");
  divider.className = "level-complete-stats-divider";
  divider.setAttribute("role", "separator");
  container.appendChild(divider);

  if (questionsCollectedTotal > 0) {
    const journey = document.createElement("p");
    journey.className = "level-complete-stat-line";
    journey.textContent = `إجابات صحيحة (كل الرحلة): ${questionsCorrectTotal} / ${questionsCollectedTotal}`;
    container.appendChild(journey);
  }

  const overall = document.createElement("p");
  overall.className = "level-complete-stat-line level-complete-stat-line--highlight";
  overall.textContent = `النقاط الإجمالية: ${snapshot.totalScore}`;
  container.appendChild(overall);

  //if (isFinal) {
    //const fin = document.createElement("p");
    //fin.className = "level-complete-stat-line";
    //fin.textContent = `أنهيتَ ${maxLevelIndex} مستوى — أحسنت!`;
    //container.appendChild(fin);
  //}
}

function openLevelCompleteScreen(isFinal, snapshot) {
  clearTouchPointerInput();
  levelTimerFrozenElapsedSec = snapshot.elapsedSec;
  isLevelCompleteScreenOpen = true;
  levelCompleteIsFinal = isFinal;
  if (isFinal) {
    levelCompleteTitleEl.textContent = "مبروك! أكملتَ اللعبة";
    levelCompleteActionBtn.textContent = "العب من جديد";
  } else {
    levelCompleteTitleEl.textContent = `أكملتَ المستوى ${snapshot.completedLevel}`;
    levelCompleteActionBtn.textContent = "المستوى التالي";
  }
  fillLevelCompleteStats(levelCompleteStatsEl, snapshot, isFinal);
  levelCompleteOverlay.hidden = false;
  levelCompleteOverlay.setAttribute("aria-hidden", "false");
  levelCompleteActionBtn.tabIndex = 0;
  levelCompleteActionBtn.focus();
}

function returnToTitleFromFinalWin() {
  clearTouchPointerInput();
  score = 0;
  booksHeld = 0;
  questionsCollectedTotal = 0;
  questionsCorrectTotal = 0;
  levelTimerFrozenElapsedSec = null;
  closeLevelCompleteScreen();
  hideLevelSelect();
  closeTutorial();
  if (controlsHintEl) controlsHintEl.hidden = true;
  appScreen = "title";
  pendingStartLevelIndex = 1;
  selectedLevelForPlay = 1;
  const url = new URL(window.location.href);
  if (url.searchParams.has("level")) {
    url.searchParams.delete("level");
    history.replaceState(null, "", url);
  }
}

levelCompleteActionBtn.addEventListener("click", async () => {
  if (!isLevelCompleteScreenOpen) return;
  if (levelCompleteIsFinal) {
    returnToTitleFromFinalWin();
    return;
  }
  const next = currentLevelIndex + 1;
  try {
    await loadLevelFromIndex(next);
  } catch (e) {
    console.warn("Next level load failed:", e);
    return;
  }
  closeLevelCompleteScreen();
});

function drawLevelTimer() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = LEVEL_TIMER_FONT;
  ctx.textBaseline = "bottom";
  ctx.textAlign = "center";
  ctx.fillStyle = "#c0caf5";
  const t = getLevelElapsedSec();
  const timeStr = formatLevelTime(t);
  // LTR embed so digits stay left-to-right next to Arabic label.
  const label = `\u200E${timeStr} - الوقت`;
  ctx.fillText(label, VIEW_W * 0.5, VIEW_H - LEVEL_TIMER_PAD_Y);
  ctx.restore();
}

function drawDebugPlayerPos() {
  ctx.save();
  ctx.font = "14px monospace";
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(10, VIEW_H - 34, 210, 24);
  ctx.fillStyle = "#c0caf5";
  ctx.textBaseline = "top";
  ctx.fillText(`x: ${player.x.toFixed(1)}  y: ${player.y.toFixed(1)}`, 16, VIEW_H - 30);
  ctx.restore();
}

function frame(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000) || 0;
  lastTs = ts;
  collectibleAnimTime += dt;

  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  if (
    appScreen === "fullscreen_prompt" ||
    appScreen === "title" ||
    appScreen === "level_select" ||
    appScreen === "tutorial"
  ) {
    if (titleScreenImg) {
      ctx.drawImage(titleScreenImg, 0, 0, VIEW_W, VIEW_H);
    }
    if (appScreen === "title" && startTextImg) {
      // Strong pulse: ~10% opacity at trough, full opacity at peak.
      const pulse = 0.1 + 0.9 * (0.5 + 0.5 * Math.sin(ts * 0.0035));
      const startW = Math.min(startTextImg.width, VIEW_W * 0.42);
      const startH = startW * (startTextImg.height / Math.max(1, startTextImg.width));
      const x = Math.round((VIEW_W - startW) * 0.5);
      const y = Math.round(VIEW_H - startH - 44);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.drawImage(startTextImg, x, y, startW, startH);
      ctx.restore();
    }
    requestAnimationFrame(frame);
    return;
  }

  if (!isQuestionOpen && !isLevelCompleteScreenOpen) {
    update(dt);
    checkCollectibles();
    checkExit();
    updateCollectibleParticles(dt);
  }
  updateCollectiblePickupAnims(dt);
  updateHudPulses(dt);
  updateCamera();

  ctx.save();
  ctx.translate(-cameraX, 0);
  drawBackgroundWorld();
  ctx.restore();

  if (fgImg) {
    ensureFgLayer();
    fgLayerCtx.setTransform(1, 0, 0, 1, 0, 0);
    fgLayerCtx.clearRect(0, 0, VIEW_W, VIEW_H);
    fgLayerCtx.save();
    fgLayerCtx.translate(-cameraX, 0);
    drawForegroundWorld(fgLayerCtx);
    if (DEBUG_DRAW) drawDebugColliders(fgLayerCtx);
    drawCollectibles(fgLayerCtx);
    drawExit(fgLayerCtx);
    drawPlayer(fgLayerCtx);
    fgLayerCtx.restore();
    drawLanternGlowOnContext(fgLayerCtx, VIEW_W, VIEW_H, true);
    ctx.drawImage(fgLayerCanvas, 0, 0);
  } else {
    ctx.save();
    ctx.translate(-cameraX, 0);
    if (DEBUG_DRAW) drawDebugColliders();
    drawCollectibles();
    drawExit();
    drawPlayer();
    ctx.restore();
    drawLanternGlow();
  }

  if (DEBUG_DRAW) drawDebugPlayerPos();

  drawLeftHud();
  drawRightHud();
  drawLevelTimer();

  requestAnimationFrame(frame);
}

Promise.all([
  loadImage(SHEET_URL),
  loadQuestionsBank(QUESTIONS_URL),
  loadImage(TITLE_SCREEN_URL).catch((e) => {
    console.warn(e);
    return null;
  }),
  loadImage(START_TEXT_URL).catch((e) => {
    console.warn(e);
    return null;
  }),
  loadImage(COLLECT_BEADS_URL).catch((e) => {
    console.warn(e);
    return null;
  }),
  loadImage(COLLECT_BOOK_URL).catch((e) => {
    console.warn(e);
    return null;
  }),
  loadImage(COLLECT_PAPER_URL).catch((e) => {
    console.warn(e);
    return null;
  }),
  loadImage(EXIT_CLOSED_URL).catch((e) => {
    console.warn(e);
    return null;
  }),
  loadImage(EXIT_OPEN_URL).catch((e) => {
    console.warn(e);
    return null;
  }),
  loadImage(EXTERIOR_URL).catch((e) => {
    console.warn(e);
    return null;
  }),
])
  .then(async ([sheetImg, qb, titleImg, startImg, beads, book, paper, exitClosed, exitOpen, exterior]) => {
    sheet = sheetImg;
    questionsBank = qb;
    titleScreenImg = titleImg;
    startTextImg = startImg;
    beadsImg = beads;
    bookImg = book;
    paperImg = paper;
    exitClosedImg = exitClosed;
    exitOpenImg = exitOpen;
    exteriorImg = exterior;

    try {
      maxLevelIndex = await discoverMaxLevelIndex();
      const fromQuery = parseLevelFromQuery();
      pendingStartLevelIndex = Math.min(maxLevelIndex, Math.max(1, fromQuery));
      selectedLevelForPlay = pendingStartLevelIndex;
    } catch (err) {
      console.error(err);
      ctx.fillStyle = "#f7768e";
      ctx.font = "16px system-ui";
      ctx.fillText("تعذّر تحميل المستوى أو الأصول.", 24, 40);
      ctx.fillText(String(err?.message ?? err), 24, 64);
      ctx.fillText("استخدم ?level=1 أو ?level=2 مع Assets/Levels/level_NN.json", 24, 88);
      ctx.fillText("افتح index.html عبر خادم محلي إن لزم الأمر.", 24, 112);
      return;
    }

    requestAnimationFrame(frame);
  })
  .catch((err) => {
    console.error(err);
    ctx.fillStyle = "#f7768e";
    ctx.font = "16px system-ui";
    ctx.fillText("تعذّر تحميل ملف الشخصيات.", 24, 40);
    ctx.fillText("افتح index.html عبر خادم محلي إن لزم الأمر.", 24, 64);
  });

window.goToLevel = (n) => {
  hideLevelSelect();
  closeTutorial();
  loadLevelFromIndex(n)
    .then(() => {
      appScreen = "gameplay";
      selectedLevelForPlay = n;
      pendingStartLevelIndex = n;
      if (controlsHintEl) controlsHintEl.hidden = false;
    })
    .catch((e) => console.warn("goToLevel failed:", e));
};
