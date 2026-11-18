// Vermilion Heat — the simulation. One fixed-step world: a road-grid city,
// traffic, stealable cars, police wanted levels, four story missions, combat.
// step() advances one fixed step and returns bit flags for what happened.
import { WORLD, ROADS_X, ROADS_Y, ROAD_W, PLAYER, CAR, WEAPONS, MISSION_REWARDS } from './config.js';
import { pick, range } from './random.js';

export const EVENT_BUSTED = 1;
export const EVENT_MISSION = 2;
export const EVENT_CRIME = 4;
export const EVENT_CASH = 8;

const CAR_COLORS = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#8d99ae', '#6d28d9', '#06d6a0', '#ef476f'];
const PED_COLORS = ['#f1fa8c', '#ffb703', '#8ecae6', '#ffafcc', '#cdb4db', '#90be6d'];

const MISSIONS = [
  {
    name: '1. The Pickup', giver: 'DEX',
    intro: 'DEX: Mara, Lena is stuck at the Harbor Bar. Fetch her, then drop her at the Neon Palms. No cops, no drama.',
    stages: [
      { type: 'goto', x: 620, y: 2050, text: 'Pick up Lena at the Harbor Bar' },
      { type: 'goto', x: 1180, y: 620, text: 'Drop Lena at the Neon Palms, Downtown' },
    ],
  },
  {
    name: '2. Hot Package', giver: 'LENA',
    intro: 'LENA: A package is waiting in Old Town. Grab it and run it up to the Hills house. The cops are already sniffing around.',
    stages: [
      { type: 'goto', x: 1980, y: 620, text: 'Collect the package in Old Town' },
      { type: 'goto', x: 2950, y: 620, text: 'Deliver the package to the Hills house' },
    ],
    wantedOnStart: 2,
  },
  {
    name: '3. Rival Takedown', giver: 'BIG SAL',
    intro: 'BIG SAL: The Cobras are running product through my streets. Wreck their lead car and their boys. Make it loud.',
    stages: [{ type: 'chase', text: 'Destroy the Cobra lead car' }],
  },
  {
    name: '4. The Vermilion Job', giver: 'DEX',
    intro: 'DEX: Last one. The Vermilion Bank, downtown. Get in, get the cash, and lose the heat on the Beach. Four stars, minimum.',
    stages: [
      { type: 'goto', x: 1180, y: 1120, text: 'Reach the Vermilion Bank' },
      { type: 'hold', x: 1180, y: 1120, hold: 3, text: 'Crack the vault — stay close!' },
      { type: 'escape', x: 2950, y: 2100, time: 90, text: 'Escape to the Beach with the cash!' },
    ],
    wantedOnStart: 4,
  },
];

function rectsOverlap(ax, ay, aw, ah, b) {
  return ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y;
}
function circleHitsRect(x, y, r, b) {
  const cx = Math.max(b.x, Math.min(x, b.x + b.w));
  const cy = Math.max(b.y, Math.min(y, b.y + b.h));
  return (x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r;
}

export function createWorld(rand) {
  const state = {};
  function buildBuildings() {
    const list = [];
    for (let i = 0; i < ROADS_X.length - 1; i++) {
      for (let j = 0; j < ROADS_Y.length - 1; j++) {
        const x0 = ROADS_X[i] + ROAD_W / 2 + 24, x1 = ROADS_X[i + 1] - ROAD_W / 2 - 24;
        const y0 = ROADS_Y[j] + ROAD_W / 2 + 24, y1 = ROADS_Y[j + 1] - ROAD_W / 2 - 24;
        if (x1 - x0 < 90 || y1 - y0 < 90) continue;
        const n = 1 + Math.floor(rand() * 3);
        for (let k = 0; k < n; k++) {
          const w = range(rand, 90, Math.min(220, (x1 - x0) / n - 20));
          const h = range(rand, 80, Math.min(200, y1 - y0 - 20));
          const x = range(rand, x0, Math.max(x0 + 1, x1 - w));
          const y = range(rand, y0, Math.max(y0 + 1, y1 - h));
          const b = { x, y, w, h, shade: 0.85 + rand() * 0.3 };
          if (!list.some((o) => rectsOverlap(b.x - 14, b.y - 14, b.w + 28, b.h + 28, o))) list.push(b);
        }
      }
    }
    return list;
  }
  function spawnCar(x, y, opts) {
    const c = Object.assign({ x, y, angle: 0, speed: 0, hp: CAR.hp, color: pick(rand, CAR_COLORS), traffic: false, police: false, rival: false, dead: false, axis: 'x', dir: 1, lane: 0 }, opts || {});
    state.cars.push(c);
    return c;
  }
  function spawnPed(x, y, enemy) {
    const p = { x, y, angle: rand() * Math.PI * 2, hp: enemy ? 60 : 30, speed: enemy ? 150 : 55, color: pick(rand, PED_COLORS), enemy: !!enemy, dead: false, shootCd: 0, wander: rand() * Math.PI * 2 };
    state.peds.push(p);
    return p;
  }
  function hitsBuilding(x, y, r) {
    for (const b of state.buildings) if (circleHitsRect(x, y, r, b)) return true;
    return false;
  }
  function reset() {
    state.buildings = buildBuildings();
    state.cars = []; state.peds = []; state.bullets = []; state.particles = []; state.pickups = [];
    state.player = { x: 900, y: 850, angle: -Math.PI / 2, health: PLAYER.maxHealth, money: 250, wanted: 0, weapon: 0, ammo: [Infinity, 36, 90], inCar: null, fireCd: 0, hurtCd: 0, dead: false };
    state.time = 0; state.wantedTimer = 0;
    state.missionIndex = 0; state.mission = null; state.stage = 0; state.stageTimer = 0; state.holdTimer = 0;
    state.dialogue = null; state.dialogueUntil = 0; state.message = ''; state.messageUntil = 0;
    state.rivalCar = null; state.completed = 0; state.kills = 0; state.legend = false;
    spawnCar(960, 900, { angle: 0 });
    spawnCar(840, 960, { angle: Math.PI, color: '#2a9d8f' });
    spawnCar(1560, 900, { angle: Math.PI / 2, color: '#e9c46a' });
    spawnCar(620, 1450, { angle: 0, color: '#ef476f' });
    spawnCar(2150, 1450, { angle: -Math.PI / 2 });
    spawnCar(2950, 2000, { angle: Math.PI, color: '#06d6a0' });
    for (let i = 0; i < 14; i++) {
      const vertical = rand() < 0.5;
      const road = vertical ? pick(rand, ROADS_X) : pick(rand, ROADS_Y);
      const along = range(rand, 100, (vertical ? WORLD.height : WORLD.width) - 100);
      spawnCar(vertical ? road : along, vertical ? along : road, {
        traffic: true, axis: vertical ? 'y' : 'x', dir: rand() < 0.5 ? 1 : -1,
        lane: (rand() < 0.5 ? -1 : 1) * 26, speed: range(rand, 130, 210),
        angle: vertical ? (rand() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rand() < 0.5 ? 0 : Math.PI),
      });
    }
    for (let i = 0; i < 18; i++) spawnPed(range(rand, 200, WORLD.width - 200), range(rand, 200, WORLD.height - 200), false);
    state.pickups.push({ x: 1050, y: 700, kind: 'health' }, { x: 2400, y: 1700, kind: 'health' }, { x: 700, y: 2200, kind: 'ammo' });
  }
  function say(speaker, text, secs) {
    state.dialogue = { speaker, text };
    state.dialogueUntil = state.time + (secs || 5);
  }
  function flash(text, secs) { state.message = text; state.messageUntil = state.time + (secs || 3); }
  function addWanted(n, audio) {
    const p = state.player;
    const before = p.wanted;
    p.wanted = Math.max(0, Math.min(5, p.wanted + n));
    state.wantedTimer = 0;
    if (p.wanted > before) { if (audio) audio.setSiren(true); return EVENT_CRIME; }
    return 0;
  }
  function explode(x, y, audio) {
    for (let i = 0; i < 26; i++) state.particles.push({ x, y, vx: range(rand, -260, 260), vy: range(rand, -260, 260), life: range(rand, 0.3, 0.8), max: 0.8, color: pick(rand, ['#ff9f1c', '#e63946', '#ffd166', '#555555']) });
    if (audio) audio.crash();
  }
  function startMission(audio) {
    if (state.mission || state.missionIndex >= MISSIONS.length) return false;
    const def = MISSIONS[state.missionIndex];
    state.mission = def; state.stage = 0; state.stageTimer = 0; state.holdTimer = 0;
    say(def.giver, def.intro, 6);
    if (def.wantedOnStart) { state.player.wanted = def.wantedOnStart; if (audio) audio.setSiren(true); }
    if (state.missionIndex === 2) {
      state.rivalCar = spawnCar(2100, 1400, { rival: true, color: '#c0392b', hp: 220, speed: 0 });
      spawnPed(2050, 1450, true); spawnPed(2160, 1350, true); spawnPed(2100, 1500, true);
    }
    if (audio) audio.mission();
    return true;
  }
  function completeMission(audio) {
    const reward = MISSION_REWARDS[state.missionIndex];
    state.player.money += reward;
    state.completed += 1; state.missionIndex += 1;
    flash('MISSION COMPLETE  +$' + reward, 4);
    say('DEX', state.missionIndex >= MISSIONS.length ? 'That is the whole set, Mara. Vermilion City is yours now.' : 'Clean work. Press M when you want the next one.', 5);
    state.mission = null;
    if (state.missionIndex >= MISSIONS.length) state.legend = true;
    if (audio) audio.cash();
    return EVENT_MISSION | EVENT_CASH;
  }
  function damagePlayer(amount, audio) {
    const p = state.player;
    if (p.hurtCd > 0 || p.dead) return 0;
    p.health -= amount; p.hurtCd = 0.5;
    if (p.health <= 0) { p.health = 0; p.dead = true; if (audio) audio.busted(); return EVENT_BUSTED; }
    return 0;
  }
  function fireBullet(x, y, angle, damage, fromPlayer, audio) {
    const w = WEAPONS[state.player.weapon];
    const a = angle + (rand() - 0.5) * (w.spread * 2);
    state.bullets.push({ x: x + Math.cos(a) * 24, y: y + Math.sin(a) * 24, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, life: w.range / w.speed, damage, fromPlayer });
    if (fromPlayer && audio) audio.shot();
  }
  function tryShoot(input, audio) {
    const p = state.player;
    if (p.inCar || p.fireCd > 0) return;
    const w = WEAPONS[p.weapon];
    if (p.weapon === 0) {
      p.fireCd = w.rate;
      const tx = p.x + Math.cos(p.angle) * 40, ty = p.y + Math.sin(p.angle) * 40;
      let hit = false;
      for (const ped of state.peds) {
        if (!ped.dead && Math.hypot(ped.x - tx, ped.y - ty) < 42) {
          ped.hp -= w.damage; hit = true;
          if (ped.hp <= 0) { ped.dead = true; state.kills += 1; if (ped.enemy) state.player.money += 50; else addWanted(1, audio); }
        }
      }
      for (const car of state.cars) {
        if (!car.dead && Math.hypot(car.x - tx, car.y - ty) < 55) { car.hp -= w.damage; hit = true; }
      }
      if (hit && audio) audio.punch();
      return;
    }
    if (p.ammo[p.weapon] <= 0) { p.fireCd = 0.4; flash('OUT OF AMMO — grab an ammo pickup', 2); return; }
    p.ammo[p.weapon] -= 1; p.fireCd = w.rate;
    fireBullet(p.x, p.y, p.angle, w.damage, true, audio);
  }
  function nearestCar(x, y, maxD) {
    let best = null, bd = maxD;
    for (const c of state.cars) {
      if (c.dead) continue;
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  function enterExitCar(audio) {
    const p = state.player;
    if (p.inCar) {
      const car = p.inCar; p.inCar = null;
      p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 44; p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 44;
      car.speed = 0; return;
    }
    const car = nearestCar(p.x, p.y, 90);
    if (!car) { flash('No car close by — walk to one and press E', 2); return; }
    p.inCar = car; car.traffic = false;
    if (!car.police) { addWanted(1, audio); flash('Car stolen! Wanted level up.', 2.5); }
    if (audio) audio.pickup();
  }
  function spawnPolice() {
    const p = state.player;
    const want = Math.min(5, p.wanted);
    let have = state.cars.filter((c) => c.police && !c.dead).length;
    let guard = 0;
    while (have < want && guard < 12) {
      guard += 1;
      const a = rand() * Math.PI * 2, d = range(rand, 420, 700);
      const x = Math.max(80, Math.min(WORLD.width - 80, p.x + Math.cos(a) * d));
      const y = Math.max(80, Math.min(WORLD.height - 80, p.y + Math.sin(a) * d));
      spawnCar(x, y, { police: true, color: '#2f6df6', hp: 140, speed: 0 });
      have += 1;
    }
  }
  function step(dt, input, audio) {
    let events = 0;
    state.time += dt;
    const p = state.player;
    if (p.dead) return events;
    p.fireCd = Math.max(0, p.fireCd - dt);
    p.hurtCd = Math.max(0, p.hurtCd - dt);
    if (state.dialogue && state.time > state.dialogueUntil) state.dialogue = null;
    const acts = input.takeActions();
    if (acts & 64) {
      if (!state.mission) {
        if (startMission(audio)) flash(state.mission.name + ' started', 3);
        else if (state.legend) flash('All missions done — Vermilion City is yours!', 3);
      }
    }
    if (acts & 4) enterExitCar(audio);
    if (acts & 8) p.weapon = 0;
    if (acts & 16) p.weapon = 1;
    if (acts & 32) p.weapon = 2;
    const aimX = input.aimWorldX !== undefined ? input.aimWorldX : p.x + Math.cos(p.angle) * 100;
    const aimY = input.aimWorldY !== undefined ? input.aimWorldY : p.y + Math.sin(p.angle) * 100;
    const mx = input.moveX(), my = input.moveY();
    if (p.inCar) {
      const car = p.inCar;
      const fwd = my < 0 ? 1 : my > 0 ? -0.6 : 0;
      if (fwd !== 0) car.speed += (fwd > 0 ? CAR.accel : CAR.brake * 0.8) * dt;
      else car.speed *= Math.pow(0.4, dt);
      if (mx !== 0 && Math.abs(car.speed) > 20) car.angle += mx * CAR.turn * dt * Math.sign(car.speed);
      car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      if (!hitsBuilding(nx, car.y, 26) && nx > 40 && nx < WORLD.width - 40) car.x = nx;
      else { if (Math.abs(car.speed) > 260) { car.hp -= 18; if (audio) audio.crash(); } car.speed *= -0.25; }
      if (!hitsBuilding(car.x, ny, 26) && ny > 40 && ny < WORLD.height - 40) car.y = ny;
      else { if (Math.abs(car.speed) > 260) { car.hp -= 18; if (audio) audio.crash(); } car.speed *= -0.25; }
      p.x = car.x; p.y = car.y; p.angle = car.angle;
      if (car.hp <= 0 && !car.dead) {
        car.dead = true; explode(car.x, car.y, audio);
        p.inCar = null; p.x = car.x + 60; p.y = car.y + 60;
        events |= damagePlayer(30, audio);
      }
      if (audio) audio.setEngine(Math.abs(car.speed) / CAR.maxSpeed);
      for (const ped of state.peds) {
        if (!ped.dead && Math.abs(car.speed) > 120 && Math.hypot(ped.x - car.x, ped.y - car.y) < 40) {
          ped.dead = true; state.kills += 1; events |= addWanted(1, audio);
        }
      }
    } else {
      const sp = input.run() ? PLAYER.runSpeed : PLAYER.walkSpeed;
      const len = Math.hypot(mx, my) || 1;
      const nx = p.x + (mx / len) * sp * dt * (mx || my ? 1 : 0);
      const ny = p.y + (my / len) * sp * dt * (mx || my ? 1 : 0);
      if (!hitsBuilding(nx, p.y, PLAYER.radius)) p.x = nx;
      if (!hitsBuilding(p.x, ny, PLAYER.radius)) p.y = ny;
      p.x = Math.max(30, Math.min(WORLD.width - 30, p.x));
      p.y = Math.max(30, Math.min(WORLD.height - 30, p.y));
      if (mx || my) p.angle = Math.atan2(my, mx);
      else p.angle = Math.atan2(aimY - p.y, aimX - p.x);
      if (input.firing) tryShoot(input, audio);
      if (audio) audio.setEngine(0);
    }
    for (const car of state.cars) {
      if (car.dead || !car.traffic) continue;
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      if (nx < 60 || nx > WORLD.width - 60 || ny < 60 || ny > WORLD.height - 60 || hitsBuilding(nx, ny, 24)) {
        car.angle += Math.PI / 2;
        car.x = Math.max(60, Math.min(WORLD.width - 60, car.x)); car.y = Math.max(60, Math.min(WORLD.height - 60, car.y));
      } else { car.x = nx; car.y = ny; }
      const nearX = ROADS_X.some((r) => Math.abs(car.x - r) < 70);
      const nearY = ROADS_Y.some((r) => Math.abs(car.y - r) < 70);
      if (nearX && nearY && rand() < 0.01) car.angle += (rand() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    }
    if (p.wanted > 0) {
      spawnPolice();
      state.wantedTimer += dt;
      if (state.wantedTimer > 18) { p.wanted -= 1; state.wantedTimer = 0; if (p.wanted === 0 && audio) audio.setSiren(false); }
    }
    for (const car of state.cars) {
      if (car.dead || !car.police) continue;
      const d = Math.hypot(p.x - car.x, p.y - car.y);
      const want = Math.atan2(p.y - car.y, p.x - car.x);
      let da = want - car.angle;
      while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      car.angle += Math.max(-2.8 * dt, Math.min(2.8 * dt, da));
      const target = 300 + p.wanted * 32;
      car.speed += (target - car.speed) * dt * 0.8;
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      if (!hitsBuilding(nx, ny, 26)) { car.x = nx; car.y = ny; }
      if (d < 52) {
        if (p.inCar) {
          p.inCar.hp -= 44 * dt; car.hp -= 8 * dt; car.speed *= 0.6;
        } else {
          events |= damagePlayer(28 * dt, audio);
          car.speed *= 0.4;
        }
        state.wantedTimer = 0;
      }
      if (car.hp <= 0) { car.dead = true; explode(car.x, car.y, audio); events |= addWanted(1, audio); }
    }
    if (state.rivalCar && !state.rivalCar.dead) {
      const rc = state.rivalCar;
      const flee = Math.atan2(rc.y - p.y, rc.x - p.x);
      let da = flee - rc.angle;
      while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      rc.angle += Math.max(-2.2 * dt, Math.min(2.2 * dt, da));
      rc.speed = Math.min(380, rc.speed + 300 * dt);
      const nx = rc.x + Math.cos(rc.angle) * rc.speed * dt, ny = rc.y + Math.sin(rc.angle) * rc.speed * dt;
      if (!hitsBuilding(nx, ny, 26) && nx > 60 && nx < WORLD.width - 60 && ny > 60 && ny < WORLD.height - 60) { rc.x = nx; rc.y = ny; }
      else rc.angle += Math.PI / 2;
      if (rc.hp <= 0) {
        rc.dead = true; explode(rc.x, rc.y, audio);
        state.rivalCar = null;
        if (state.mission) events |= completeMission(audio);
      }
    }
    for (const ped of state.peds) {
      if (ped.dead) continue;
      if (ped.enemy) {
        const d = Math.hypot(p.x - ped.x, p.y - ped.y);
        ped.angle = Math.atan2(p.y - ped.y, p.x - ped.x);
        if (d > 220) { ped.x += Math.cos(ped.angle) * ped.speed * dt; ped.y += Math.sin(ped.angle) * ped.speed * dt; }
        ped.shootCd -= dt;
        if (d < 520 && ped.shootCd <= 0) {
          ped.shootCd = 1.1;
          state.bullets.push({ x: ped.x, y: ped.y, vx: Math.cos(ped.angle) * 620, vy: Math.sin(ped.angle) * 620, life: 0.9, damage: 7, fromPlayer: false });
          if (audio) audio.shot();
        }
      } else {
        ped.wander += (rand() - 0.5) * 2 * dt;
        const nx = ped.x + Math.cos(ped.wander) * ped.speed * dt;
        const ny = ped.y + Math.sin(ped.wander) * ped.speed * dt;
        if (!hitsBuilding(nx, ny, 10) && nx > 40 && nx < WORLD.width - 40 && ny > 40 && ny < WORLD.height - 40) { ped.x = nx; ped.y = ny; }
        else ped.wander += Math.PI / 2;
      }
    }
    for (const b of state.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < 0 || b.y < 0 || b.x > WORLD.width || b.y > WORLD.height) { b.life = -1; continue; }
      if (hitsBuilding(b.x, b.y, 2)) { b.life = -1; state.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.15, max: 0.15, color: '#ffd166' }); continue; }
      if (b.fromPlayer) {
        for (const ped of state.peds) {
          if (!ped.dead && Math.hypot(ped.x - b.x, ped.y - b.y) < 16) {
            ped.hp -= b.damage; b.life = -1;
            if (ped.hp <= 0) {
              ped.dead = true; state.kills += 1;
              if (ped.enemy) { state.player.money += 50; flash('+$50', 1.5); }
              else events |= addWanted(1, audio);
            }
            break;
          }
        }
        if (b.life > 0) for (const car of state.cars) {
          if (!car.dead && Math.hypot(car.x - b.x, car.y - b.y) < 34) {
            car.hp -= b.damage; b.life = -1;
            if (car.hp <= 0) { car.dead = true; explode(car.x, car.y, audio); if (car.police) events |= addWanted(1, audio); }
            break;
          }
        }
      } else if (Math.hypot(p.x - b.x, p.y - b.y) < (p.inCar ? 34 : 15)) {
        b.life = -1;
        if (p.inCar) p.inCar.hp -= b.damage; else events |= damagePlayer(b.damage, audio);
      }
    }
    state.bullets = state.bullets.filter((b) => b.life > 0);
    for (const pt of state.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt; }
    state.particles = state.particles.filter((pt) => pt.life > 0);
    for (const pk of state.pickups) {
      if (pk.taken) continue;
      if (Math.hypot(p.x - pk.x, p.y - pk.y) < 34) {
        pk.taken = true;
        if (pk.kind === 'health') { p.health = Math.min(PLAYER.maxHealth, p.health + 50); flash('+50 HEALTH', 2); }
        else { p.ammo[1] += 24; p.ammo[2] += 60; flash('+AMMO', 2); }
        if (audio) audio.pickup();
      }
    }
    if (p.wanted === 0 && p.health > 0 && p.health < PLAYER.maxHealth) p.health = Math.min(PLAYER.maxHealth, p.health + 2 * dt);
    if (state.mission) {
      const st = state.mission.stages[state.stage];
      if (st) {
        if (st.type === 'goto' && Math.hypot(p.x - st.x, p.y - st.y) < 80) {
          state.stage += 1;
          if (audio) audio.pickup();
          if (state.stage >= state.mission.stages.length) events |= completeMission(audio);
          else flash(state.mission.stages[state.stage].text, 3);
        } else if (st.type === 'hold') {
          if (Math.hypot(p.x - st.x, p.y - st.y) < 90) {
            state.holdTimer += dt;
            if (state.holdTimer >= st.hold) { state.stage += 1; state.holdTimer = 0; if (audio) audio.cash(); flash('Vault cracked! RUN to the Beach!', 3); }
          } else state.holdTimer = 0;
        } else if (st.type === 'escape') {
          state.stageTimer += dt;
          if (Math.hypot(p.x - st.x, p.y - st.y) < 90) events |= completeMission(audio);
          else if (state.stageTimer > st.time) { flash('Too slow — the heat closed in. Mission failed.', 4); state.mission = null; state.player.wanted = Math.max(state.player.wanted, 3); }
        }
      }
    }
    return events;
  }
  reset();
  return { state, reset, step, startMission, MISSIONS };
}
