// Physical motion helpers: springs that start from the on-screen value and carry velocity,
// momentum projection, and rubber-banding. Shared by gesture-driven surfaces (drawers).

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Animates `from` → `to` with a spring described the way Apple tunes them:
 * `response` (seconds, how quickly it gets there) and `damping` (1 = no overshoot, < 1 = bounce).
 * Starts with `velocity` (px/s) so a released drag continues without a seam. Returns a cancel function;
 * cancelling mid-flight and starting a new spring from the current value is how it stays interruptible.
 */
export function spring({ from, to, velocity = 0, response = 0.35, damping = 1, onUpdate, onComplete }) {
  const stiffness = (2 * Math.PI / response) ** 2;
  const friction = (4 * Math.PI * damping) / response;
  let x = from;
  let v = velocity;
  let last = performance.now();
  let raf = requestAnimationFrame(function frame(now) {
    const dt = Math.min(0.064, (now - last) / 1000);
    last = now;
    // A few semi-implicit Euler substeps keep stiff springs stable on slow frames.
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      const a = -stiffness * (x - to) - friction * v;
      v += a * (dt / steps);
      x += v * (dt / steps);
    }
    if (Math.abs(v) < 4 && Math.abs(x - to) < 0.5) {
      onUpdate(to, 0);
      raf = 0;
      onComplete?.();
      return;
    }
    onUpdate(x, v);
    raf = requestAnimationFrame(frame);
  });
  return () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
}

/** Distance a flick would travel before coming to rest (Apple's scroll deceleration model). */
export function project(velocity, decelerationRate = 0.99) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Progressive resistance past a boundary: the further it is pulled, the less it follows. */
export function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Release velocity (px/s) from recent pointer samples [{ x, t }], ignoring anything older than 100 ms. */
export function releaseVelocity(samples) {
  const now = samples.length ? samples[samples.length - 1].t : 0;
  const recent = samples.filter((s) => now - s.t <= 100);
  if (recent.length < 2) return 0;
  const first = recent[0];
  const lastS = recent[recent.length - 1];
  const dt = (lastS.t - first.t) / 1000;
  return dt > 0 ? (lastS.x - first.x) / dt : 0;
}
