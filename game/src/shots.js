// Screenshot scenes behind ?shot=start|drive|chase|mission. Each one plays the
// real rules forward from a fresh seeded world with a simple autopilot that
// steers along the road grid toward waypoints, so the frame is what a short game
// really looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function fakeInput() {
  const inp = { mx: 0, my: 0, firing: false, aimWorldX: 0, aimWorldY: 0, _acts: 0,
    moveX() { return this.mx; }, moveY() { return this.my; }, run() { return false; },
    takeActions() { const t = this._acts; this._acts = 0; return t; } };
  return inp;
}
function driveRoute(world, waypoints, secondsPerLeg) {
  const inp = fakeInput();
  for (const wp of waypoints) {
    for (let i = 0; i < secondsPerLeg / STEP; i++) {
      const s = world.state, p = s.player;
      const dx = wp[0] - p.x, dy = wp[1] - p.y;
      if (Math.hypot(dx, dy) < 80) break;
      const want = Math.atan2(dy, dx);
      let da = want - p.angle;
      while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      inp.mx = da > 0.3 ? 1 : da < -0.3 ? -1 : 0;
      inp.my = -1;
      inp.aimWorldX = p.x + Math.cos(p.angle) * 100; inp.aimWorldY = p.y + Math.sin(p.angle) * 100;
      world.step(STEP, inp, null);
      if (s.player.dead) return inp;
    }
  }
  return inp;
}
function stealCar(world) {
  const inp = fakeInput(); inp._acts = 4; // E: steal the parked car by spawn
  world.step(STEP, inp, null);
  return inp;
}
export function stageShot(name, world) {
  world.reset();
  if (name === 'drive') {
    stealCar(world);
    driveRoute(world, [[2100, 850], [2700, 850]], 12);
    return { screen: SCREEN_PLAY, best: 250 };
  }
  if (name === 'chase') {
    stealCar(world);
    world.state.player.wanted = 3;
    driveRoute(world, [[1500, 850], [1500, 1400]], 10);
    return { screen: SCREEN_PLAY, best: 250 };
  }
  if (name === 'mission') {
    const inp = fakeInput(); inp._acts = 64; // M: start mission 1
    world.step(STEP, inp, null);
    stealCar(world);
    // Road route to the Harbor Bar: east on 850, south on 900, west on 1950.
    driveRoute(world, [[900, 1950], [620, 1950], [620, 2050]], 14);
    return { screen: SCREEN_PLAY, best: 250 };
  }
  // start: title over a live city backdrop.
  const inp = fakeInput();
  for (let i = 0; i < 5 / STEP; i++) world.step(STEP, inp, null);
  return { screen: SCREEN_TITLE, best: 0 };
}
