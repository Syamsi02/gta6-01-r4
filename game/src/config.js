// Vermilion Heat — tuning and palette. Logical view 1280x720; the world is a
// 3600x2600 road-grid city. All numbers live here so the sim never hard-codes one.
export const VIEW = { width: 1280, height: 720 };
export const WORLD = { width: 3600, height: 2600 };
export const STEP = 1 / 60;
export const ROADS_X = [300, 900, 1500, 2100, 2700, 3300];
export const ROADS_Y = [300, 850, 1400, 1950, 2300];
export const ROAD_W = 110;
export const PLAYER = { radius: 13, walkSpeed: 235, runSpeed: 330, maxHealth: 100 };
export const CAR = { length: 64, width: 32, accel: 420, brake: 700, maxSpeed: 560, maxReverse: 180, turn: 2.6, hp: 100 };
export const WEAPONS = [
  { name: 'Fists', damage: 12, rate: 0.35, range: 46, spread: 0, speed: 0, ammo: Infinity, auto: false, color: '#ffd166' },
  { name: 'Pistol', damage: 22, rate: 0.28, range: 420, spread: 0.05, speed: 950, ammo: 12, auto: false, color: '#f4d35e' },
  { name: 'SMG', damage: 11, rate: 0.09, range: 360, spread: 0.12, speed: 900, ammo: 30, auto: true, color: '#ff9f1c' },
];
export const DISTRICTS = [
  { name: 'Downtown', x: 0, y: 0, w: 1500, h: 1400, ground: '#3a3f4d', block: '#565d75' },
  { name: 'Harbor', x: 0, y: 1400, w: 1500, h: 1200, ground: '#2e4250', block: '#4a6a7a' },
  { name: 'Old Town', x: 1500, y: 0, w: 1100, h: 1400, ground: '#4d4034', block: '#6e5b45' },
  { name: 'The Hills', x: 2600, y: 0, w: 1000, h: 1400, ground: '#33482f', block: '#4c6b45' },
  { name: 'Beach', x: 1500, y: 1400, w: 2100, h: 1200, ground: '#4d4630', block: '#7a6f45' },
];
export const PALETTE = {
  grass: '#2c3a2e', road: '#23262e', roadLine: '#d8c56a', sidewalk: '#3d414d',
  panel: 'rgba(12,14,20,0.88)', text: '#f2f0e6', muted: '#a8a89e', accent: '#ff2e63',
  gold: '#ffd166', health: '#3ddc84', police: '#2f6df6', rival: '#c0392b',
};
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'vermilion-heat.best';
export const MISSION_REWARDS = [500, 800, 1200, 2500];
