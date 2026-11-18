// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, the renderer paints what is there. Screens: title, play, paused,
// busted, legend. ?seed=N fixes the city; ?shot=start|drive|chase|mission stages
// that scene instead of running the loop, paints it twice and sets __shotReady.
// A tiny debug handle (window.__vh) exposes the live state for automated tests.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BUSTED, EVENT_MISSION } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_LEGEND, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch {}
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    // Paint many times so the follow camera settles on the player before the shot.
    if (painted < 40) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  window.__vh = { world, get screen() { return screen; }, input };
  function announce(m) { status.textContent = m; }
  function startGame() {
    world.reset(); accumulator = 0; screen = SCREEN_PLAY;
    announce('Playing. Mara Voss in Vermilion City. Press M for a mission.');
  }
  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.player.money > best) { best = world.state.player.money; saveBest(best); }
    announce('Busted. Money $' + world.state.player.money + '. Best $' + best + '.');
  }
  function handleActions() {
    const actions = input.takeActions();
    // The loop owns confirm/pause only; everything else (E, M, weapon keys)
    // goes back in the queue for the world step to consume.
    input.requeue(actions & ~(ACTION_CONFIRM | ACTION_PAUSE));
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_LEGEND)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
    else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
  }
  function aimWorld() {
    const v = renderer.view;
    const p = world.state.player;
    const camX = Math.max(640, Math.min(3600 - 640, p.x));
    const camY = Math.max(360, Math.min(2600 - 360, p.y));
    const lx = (input.mouseX / v.scale) - v.x / v.scale;
    const ly = (input.mouseY / v.scale) - v.y / v.scale;
    input.aimWorldX = camX - 640 + lx;
    input.aimWorldY = camY - 360 + ly;
  }
  function step() {
    aimWorld();
    const events = world.step(STEP, input, audio);
    if (events & EVENT_BUSTED) endGame();
    else if (events & EVENT_MISSION && world.state.legend) screen = SCREEN_LEGEND;
  }
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY || screen === SCREEN_LEGEND) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY || screen === SCREEN_LEGEND)) {
        if (screen === SCREEN_TITLE) { aimWorld(); world.step(STEP, input, null); }
        else step();
        accumulator -= STEP;
      }
    } else accumulator = 0;
    renderer.draw(world.state, screen, best);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });
  canvas.addEventListener('pointerdown', () => audio.unlock());
  window.addEventListener('keydown', () => audio.unlock());
  announce('Vermilion Heat. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
