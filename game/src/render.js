// Drawing only: world state + screen in, pixels out. Camera follows Mara;
// the view is a 1280x720 window onto the 3600x2600 city, scaled to the window.
import { VIEW, WORLD, ROADS_X, ROADS_Y, ROAD_W, DISTRICTS, PALETTE, FONT, WEAPONS, PLAYER } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_LEGEND = 'legend';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, camX: 900, camY: 850 };
  const fonts = new Map();
  function font(size) { if (!fonts.has(size)) fonts.set(size, 'bold ' + size + 'px ' + FONT); return fonts.get(size); }
  function text(v, x, y, size, color, align) {
    ctx.font = font(size); ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(v, x, y);
  }
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    view.x = (canvas.width - VIEW.width * view.scale) / 2;
    view.y = (canvas.height - VIEW.height * view.scale) / 2;
  }
  function districtAt(x, y) {
    for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
    return DISTRICTS[0];
  }
  function drawCar(c) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-34, -19, 68, 38);
    ctx.fillStyle = c.dead ? '#222' : c.color;
    ctx.beginPath(); ctx.roundRect(-32, -16, 64, 32, 8); ctx.fill();
    ctx.fillStyle = c.police ? '#ffffff' : 'rgba(20,24,32,0.85)';
    ctx.fillRect(-6, -13, 16, 26);
    ctx.fillStyle = c.police ? '#111' : 'rgba(255,255,255,0.75)';
    ctx.fillRect(20, -12, 4, 24);
    if (c.police) { ctx.fillStyle = '#ff2e63'; ctx.fillRect(-26, -14, 10, 6); ctx.fillStyle = '#2f6df6'; ctx.fillRect(-26, 8, 10, 6); text('VCPD', -14, 5, 9, '#fff', 'left'); }
    if (c.rival) text('COBRA', -24, 5, 9, '#fff', 'left');
    ctx.restore();
    if (!c.dead && c.hp < 60) {
      ctx.fillStyle = '#111'; ctx.fillRect(c.x - 20, c.y - 30, 40, 5);
      ctx.fillStyle = c.hp < 25 ? '#e63946' : '#ffd166'; ctx.fillRect(c.x - 20, c.y - 30, 40 * Math.max(0, c.hp) / 100, 5);
    }
  }
  function drawWorld(state) {
    const p = state.player;
    view.camX += (p.x - view.camX) * 0.12; view.camY += (p.y - view.camY) * 0.12;
    const camX = Math.max(VIEW.width / 2, Math.min(WORLD.width - VIEW.width / 2, view.camX));
    const camY = Math.max(VIEW.height / 2, Math.min(WORLD.height - VIEW.height / 2, view.camY));
    const ox = camX - VIEW.width / 2, oy = camY - VIEW.height / 2;
    ctx.save();
    ctx.translate(-ox, -oy);
    // Ground by district.
    for (const d of DISTRICTS) { ctx.fillStyle = d.ground; ctx.fillRect(d.x, d.y, d.w, d.h); }
    // Beach sand strip + sea at the south-east corner.
    ctx.fillStyle = '#c2a878'; ctx.fillRect(1500, 2300, 2100, 300);
    ctx.fillStyle = '#2e6f8e'; ctx.fillRect(1500, 2520, 2100, 80);
    // Roads.
    ctx.fillStyle = PALETTE.road;
    for (const x of ROADS_X) ctx.fillRect(x - ROAD_W / 2, 0, ROAD_W, WORLD.height);
    for (const y of ROADS_Y) ctx.fillRect(0, y - ROAD_W / 2, WORLD.width, ROAD_W);
    ctx.fillStyle = PALETTE.roadLine;
    for (const x of ROADS_X) for (let y = 0; y < WORLD.height; y += 90) ctx.fillRect(x - 2, y, 4, 44);
    for (const y of ROADS_Y) for (let x = 0; x < WORLD.width; x += 90) ctx.fillRect(x, y - 2, 44, 4);
    // Buildings.
    for (const b of state.buildings) {
      const d = districtAt(b.x + b.w / 2, b.y + b.h / 2);
      ctx.fillStyle = d.block;
      ctx.globalAlpha = b.shade;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,214,102,0.55)';
      for (let wy = b.y + 14; wy < b.y + b.h - 12; wy += 30) for (let wx = b.x + 12; wx < b.x + b.w - 12; wx += 26) ctx.fillRect(wx, wy, 10, 12);
    }
    // District labels.
    text('DOWNTOWN', 700, 260, 26, 'rgba(255,255,255,0.28)', 'center');
    text('HARBOR', 700, 1700, 26, 'rgba(255,255,255,0.28)', 'center');
    text('OLD TOWN', 2050, 260, 26, 'rgba(255,255,255,0.28)', 'center');
    text('THE HILLS', 3100, 260, 26, 'rgba(255,255,255,0.28)', 'center');
    text('BEACH', 2500, 1700, 26, 'rgba(255,255,255,0.28)', 'center');
    // Pickups.
    for (const pk of state.pickups) {
      if (pk.taken) continue;
      ctx.fillStyle = pk.kind === 'health' ? '#3ddc84' : '#ffd166';
      ctx.beginPath(); ctx.arc(pk.x, pk.y, 13, 0, Math.PI * 2); ctx.fill();
      text(pk.kind === 'health' ? '+' : 'A', pk.x, pk.y + 5, 15, '#111', 'center');
    }
    // Mission marker.
    if (state.mission) {
      const st = state.mission.stages[state.stage];
      let tx = null, ty = null;
      if (st && st.x !== undefined) { tx = st.x; ty = st.y; }
      else if (state.rivalCar) { tx = state.rivalCar.x; ty = state.rivalCar.y; }
      if (tx !== null) {
        const bob = Math.sin(state.time * 4) * 6;
        ctx.fillStyle = '#ffd166';
        ctx.beginPath(); ctx.moveTo(tx, ty - 46 + bob); ctx.lineTo(tx - 12, ty - 70 + bob); ctx.lineTo(tx + 12, ty - 70 + bob); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,209,102,0.7)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(tx, ty, 46 + bob * 0.4, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
      }
    }
    // Peds.
    for (const ped of state.peds) {
      if (ped.dead) continue;
      ctx.save(); ctx.translate(ped.x, ped.y); ctx.rotate(ped.angle);
      ctx.fillStyle = ped.enemy ? '#c0392b' : ped.color;
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(7, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (ped.enemy) { ctx.fillStyle = '#e63946'; ctx.fillRect(ped.x - 14, ped.y - 22, 28, 4); ctx.fillStyle = '#fff'; ctx.fillRect(ped.x - 14, ped.y - 22, 28 * Math.max(0, ped.hp) / 60, 4); }
    }
    for (const c of state.cars) drawCar(c);
    // Bullets + particles.
    for (const b of state.bullets) { ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill(); }
    for (const pt of state.particles) { ctx.globalAlpha = Math.max(0, pt.life / pt.max); ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    // Player.
    if (!p.dead) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      if (p.inCar) { /* drawn as part of the car */ }
      else {
        ctx.fillStyle = '#ff2e63'; ctx.beginPath(); ctx.arc(0, 0, PLAYER.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(8, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = WEAPONS[p.weapon].color; ctx.fillRect(6, -3, 18, 6);
      }
      ctx.restore();
      // Aim line when armed on foot.
      if (!p.inCar && p.weapon > 0) {
        ctx.strokeStyle = 'rgba(255,224,102,0.5)'; ctx.beginPath();
        ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(p.angle) * 70, p.y + Math.sin(p.angle) * 70); ctx.stroke();
      }
    }
    ctx.restore();
    return { ox, oy };
  }
  function drawMinimap(state) {
    const mw = 200, mh = 144, mx = VIEW.width - mw - 16, my = 16;
    ctx.fillStyle = 'rgba(10,12,18,0.8)'; ctx.fillRect(mx, my, mw, mh);
    const sx = mw / WORLD.width, sy = mh / WORLD.height;
    for (const d of DISTRICTS) { ctx.fillStyle = d.ground; ctx.fillRect(mx + d.x * sx, my + d.y * sy, d.w * sx, d.h * sy); }
    ctx.fillStyle = '#888';
    for (const x of ROADS_X) ctx.fillRect(mx + x * sx - 1, my, 2, mh);
    for (const y of ROADS_Y) ctx.fillRect(mx, my + y * sy - 1, mw, 2);
    if (state.mission) {
      const st = state.mission.stages[state.stage];
      if (st && st.x !== undefined) { ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(mx + st.x * sx, my + st.y * sy, 5, 0, Math.PI * 2); ctx.fill(); }
      else if (state.rivalCar) { ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.arc(mx + state.rivalCar.x * sx, my + state.rivalCar.y * sy, 5, 0, Math.PI * 2); ctx.fill(); }
    }
    for (const c of state.cars) if (c.police && !c.dead) { ctx.fillStyle = '#2f6df6'; ctx.fillRect(mx + c.x * sx - 2, my + c.y * sy - 2, 4, 4); }
    const p = state.player;
    ctx.fillStyle = '#ff2e63'; ctx.beginPath(); ctx.arc(mx + p.x * sx, my + p.y * sy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.strokeRect(mx, my, mw, mh);
  }
  function drawHud(state, best) {
    const p = state.player;
    ctx.fillStyle = PALETTE.panel; ctx.fillRect(12, 12, 300, 132);
    ctx.fillStyle = PALETTE.text;
    text('MARA VOSS', 24, 38, 20, PALETTE.text, 'left');
    text('$' + p.money, 300, 38, 20, PALETTE.gold, 'right');
    text('HEALTH', 24, 66, 14, PALETTE.muted, 'left');
    ctx.fillStyle = '#222'; ctx.fillRect(100, 54, 200, 14);
    ctx.fillStyle = PALETTE.health; ctx.fillRect(100, 54, 200 * Math.max(0, p.health) / 100, 14);
    text('WANTED', 24, 94, 14, PALETTE.muted, 'left');
    for (let i = 0; i < 5; i++) text(i < p.wanted ? '★' : '☆', 100 + i * 26, 96, 20, i < p.wanted ? '#ff2e63' : '#666', 'left');
    const w = WEAPONS[p.weapon];
    text(w.name + (p.weapon === 0 ? '' : '  ' + p.ammo[p.weapon] + ' ammo'), 24, 112, 15, w.color, 'left');
    if (p.inCar) text('CAR HP ' + Math.max(0, Math.round(p.inCar.hp)), 24, 134, 14, '#8ecae6', 'left');
    drawMinimap(state);
    if (state.mission) {
      const st = state.mission.stages[state.stage];
      ctx.fillStyle = PALETTE.panel; ctx.fillRect(12, 176, 430, 54);
      text(state.mission.name.toUpperCase(), 24, 198, 16, PALETTE.gold, 'left');
      text(st ? st.text : '', 24, 222, 15, PALETTE.text, 'left');
      if (st && st.type === 'hold') { ctx.fillStyle = '#222'; ctx.fillRect(24, 228, 200, 6); ctx.fillStyle = PALETTE.gold; ctx.fillRect(24, 228, 200 * Math.min(1, state.holdTimer / st.hold), 6); }
      if (st && st.type === 'escape') text(Math.max(0, Math.ceil(st.time - state.stageTimer)) + 's', 420, 222, 16, '#ff2e63', 'right');
    } else if (!state.legend) {
      text('Press M to start mission ' + (state.missionIndex + 1) + ' of 4', 16, 200, 16, PALETTE.muted, 'left');
    } else {
      text('CITY LEGEND — all 4 missions complete!', 16, 200, 16, PALETTE.gold, 'left');
    }
    if (state.message && state.time < state.messageUntil) {
      text(state.message, VIEW.width / 2, 260, 22, PALETTE.gold, 'center');
    }
    if (state.dialogue && state.time < state.dialogueUntil) {
      ctx.fillStyle = PALETTE.panel; ctx.fillRect(140, VIEW.height - 130, VIEW.width - 280, 92);
      ctx.strokeStyle = PALETTE.accent; ctx.strokeRect(140, VIEW.height - 130, VIEW.width - 280, 92);
      text(state.dialogue.speaker, 164, VIEW.height - 100, 16, PALETTE.accent, 'left');
      wrapText(state.dialogue.text, 164, VIEW.height - 74, VIEW.width - 330, 17);
    }
    text('WASD move · Shift run · E enter/exit car · Click shoot · 1/2/3 weapons · M mission · P pause', VIEW.width / 2, VIEW.height - 12, 13, PALETTE.muted, 'center');
  }
  function wrapText(str, x, y, maxW, size) {
    ctx.font = font(size); ctx.fillStyle = PALETTE.text; ctx.textAlign = 'left';
    const words = str.split(' '); let line = '', yy = y;
    for (const wd of words) {
      if (ctx.measureText(line + wd + ' ').width > maxW) { ctx.fillText(line, x, yy); line = ''; yy += 22; }
      line += wd + ' ';
    }
    ctx.fillText(line, x, yy);
  }
  function drawPanel(title, lines, prompt, accent) {
    const w = 640, h = 150 + lines.length * 32;
    const x = (VIEW.width - w) / 2, y = (VIEW.height - h) / 2;
    ctx.fillStyle = PALETTE.panel; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = accent || PALETTE.accent; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h); ctx.lineWidth = 1;
    text(title, VIEW.width / 2, y + 64, 44, accent || PALETTE.accent, 'center');
    lines.forEach((ln, i) => text(ln, VIEW.width / 2, y + 112 + i * 32, 19, PALETTE.muted, 'center'));
    text(prompt, VIEW.width / 2, y + h - 28, 20, PALETTE.gold, 'center');
  }
  function draw(state, screen, best) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    if (screen === SCREEN_TITLE) {
      drawWorld(state);
      ctx.fillStyle = 'rgba(8,8,14,0.55)'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      text('VERMILION', VIEW.width / 2, 140, 84, '#ff2e63', 'center');
      text('HEAT', VIEW.width / 2, 220, 84, PALETTE.gold, 'center');
      drawPanel('MARA VOSS IS BACK', ['Steal cars. Lose the cops. Run 4 story missions.', 'Best haul: $' + best + '   ·   Missions done: ' + state.completed + ' / 4'], 'Press Space or click to start', '#ff2e63');
      return;
    }
    drawWorld(state);
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) drawPanel('PAUSED', ['Vermilion City waits for no one.'], 'Press P to resume');
    else if (screen === SCREEN_OVER) drawPanel('BUSTED', ['The VCPD finally caught up with Mara.', 'Money: $' + state.player.money + '   ·   Missions done: ' + state.completed + ' / 4   ·   Best haul: $' + best], 'Press Space to try again', '#2f6df6');
    else if (screen === SCREEN_LEGEND) drawPanel('CITY LEGEND', ['All four missions complete. Vermilion City is yours, Mara.', 'Final haul: $' + state.player.money], 'Press Space to keep cruising', PALETTE.gold);
  }
  resize();
  window.addEventListener('resize', resize);
  return { draw, get view() { return view; } };
}
