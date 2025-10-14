// Math & helpers
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const length = (x, y) => Math.hypot(x, y);
export const normalize = (x, y) => {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len, len };
};
export const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
export const dist2 = (ax, ay, bx, by) => {
  const dx = bx - ax,
    dy = by - ay;
  return dx * dx + dy * dy;
};

export const now = () => performance.now();

export function pickNearest(origin, targets) {
  let best = null;
  let bestD2 = Infinity;
  for (const t of targets) {
    const d2 = dist2(origin.x, origin.y, t.x, t.y);
    if (d2 < bestD2) {
      bestD2 = d2;
      best = t;
    }
  }
  return best;
}
