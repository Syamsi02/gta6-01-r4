// Keyboard + mouse input. Held keys are read every frame; one-shot presses
// (confirm, pause, enter-car, weapon keys, mission) are queued as flags.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_WEAPON1 = 8;
export const ACTION_WEAPON2 = 16;
export const ACTION_WEAPON3 = 32;
export const ACTION_MISSION = 64;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 640, mouseY = 360, firing = false;
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) { keys.add(e.code); return; }
    keys.add(e.code);
    if (e.code === 'Space' || e.code === 'Enter') actions |= ACTION_CONFIRM;
    else if (e.code === 'KeyP' || e.code === 'Escape') actions |= ACTION_PAUSE;
    else if (e.code === 'KeyE') actions |= ACTION_ENTER;
    else if (e.code === 'Digit1') actions |= ACTION_WEAPON1;
    else if (e.code === 'Digit2') actions |= ACTION_WEAPON2;
    else if (e.code === 'Digit3') actions |= ACTION_WEAPON3;
    else if (e.code === 'KeyM') actions |= ACTION_MISSION;
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); firing = false; });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouseX = (e.clientX - r.left) * (canvas.width / r.width);
    mouseY = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) firing = true; });
  window.addEventListener('mouseup', () => { firing = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  return {
    moveX() { return (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0); },
    moveY() { return (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0); },
    run() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    get firing() { return firing; },
    get mouseX() { return mouseX; },
    get mouseY() { return mouseY; },
    takeActions() { const t = actions; actions = 0; return t; },
    // Put bits back for the world to consume (the loop only owns confirm/pause).
    requeue(bits) { actions |= bits; },
    // Test / autopilot hooks: pretend keys are held.
    press(code) { keys.add(code); },
    release(code) { keys.delete(code); },
    setMouse(x, y) { mouseX = x; mouseY = y; },
    setFiring(v) { firing = v; },
  };
}
