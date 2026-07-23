/**
 * Shared chart helpers for sport analytics trend widgets.
 */

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export const hoverCapable = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/**
 * Monotone cubic (Fritsch-Carlson) smoothing — a soft curve that never
 * overshoots past its neighboring points.
 */
export function smoothPath(points: Array<{ x: number; y: number }>): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M${points[0].x},${points[0].y}`;
  if (n === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const deltaX = points[i + 1].x - points[i].x;
    dx.push(deltaX);
    slope.push(deltaX !== 0 ? (points[i + 1].y - points[i].y) / deltaX : 0);
  }

  const m: number[] = new Array(n).fill(0);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }

  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const alpha = m[i] / slope[i];
    const beta = m[i + 1] / slope[i];
    const h = alpha * alpha + beta * beta;
    if (h > 9) {
      const tau = 3 / Math.sqrt(h);
      m[i] = tau * alpha * slope[i];
      m[i + 1] = tau * beta * slope[i];
    }
  }

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cp1x = p0.x + dx[i] / 3;
    const cp1y = p0.y + (m[i] * dx[i]) / 3;
    const cp2x = p1.x - dx[i] / 3;
    const cp2y = p1.y - (m[i + 1] * dx[i]) / 3;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
  }
  return d;
}

export function areaPath(points: Array<{ x: number; y: number }>, baseline: number): string {
  if (points.length === 0) return "";
  const line = smoothPath(points);
  const first = points[0];
  const last = points.at(-1)!;
  return `${line} L${last.x},${baseline} L${first.x},${baseline} Z`;
}
