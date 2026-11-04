import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { prefersReducedMotion, project, releaseVelocity, rubberband, spring } from '../lib/motion';

const SPRING = { response: 0.35, damping: 1 }; // critically damped: an edge-anchored panel must not overshoot and show a gap
const SLOP = 10; // px of movement before a touch commits to dragging the drawer (vs. scrolling its content)

/**
 * Edge drawer with a dimming scrim. It enters and leaves along the same edge, and on touch it can be
 * dragged closed: the panel tracks the finger 1:1 from wherever it was grabbed (even mid-animation),
 * resists being pulled past its open position, and on release projects the flick's momentum to decide
 * whether to close, handing the finger's velocity to the spring so there is no seam.
 */
export default function Drawer({ open, onClose, side = 'right', label, className = '', children }) {
  const root = useRef(null);
  const panel = useRef(null);
  const scrim = useRef(null);
  const motion = useRef({ x: null, v: 0, cancel: null });
  const drag = useRef(null);
  const suppressClick = useRef(false);
  const returnFocus = useRef(null);
  const [mounted, setMounted] = useState(open);
  const sign = side === 'right' ? 1 : -1;

  const width = () => panel.current?.offsetWidth || window.innerWidth;
  const closedX = () => sign * width();

  // Visual and scrim change on the same frame, so the dimming always matches the panel's position.
  const paint = (x) => {
    motion.current.x = x;
    if (panel.current) panel.current.style.transform = `translate3d(${x}px,0,0)`;
    if (scrim.current) scrim.current.style.opacity = String(Math.max(0, 1 - Math.abs(x) / width()));
  };

  const stop = () => { motion.current.cancel?.(); motion.current.cancel = null; };

  const animateTo = (target, velocity = 0, done) => {
    stop();
    const from = motion.current.x ?? closedX();
    if (prefersReducedMotion()) {
      // Gentle, non-vestibular equivalent: no slide, just a short cross-fade.
      paint(target);
      panel.current?.animate?.([{ opacity: target === 0 ? 0 : 1 }, { opacity: target === 0 ? 1 : 0 }], { duration: 180 });
      done?.();
      return;
    }
    motion.current.cancel = spring({
      ...SPRING, from, to: target, velocity,
      onUpdate: (x, v) => { motion.current.v = v; paint(x); },
      onComplete: () => { motion.current.cancel = null; done?.(); },
    });
  };

  useEffect(() => { if (open) setMounted(true); }, [open]);

  useLayoutEffect(() => {
    if (!mounted) return;
    if (open) {
      if (motion.current.x == null) paint(closedX());
      returnFocus.current = document.activeElement;
      panel.current?.focus({ preventScroll: true });
      animateTo(0, motion.current.v);
    } else if (motion.current.x != null) {
      animateTo(closedX(), motion.current.v, () => {
        motion.current = { x: null, v: 0, cancel: null };
        setMounted(false);
        if (returnFocus.current?.focus) returnFocus.current.focus({ preventScroll: true });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted]);

  useEffect(() => () => stop(), []);

  useEffect(() => {
    // Closed drawers must not be reachable by keyboard or screen readers.
    if (root.current) root.current.inert = !open;
  }, [open, mounted]);

  const onPointerDown = (e) => {
    if (!open || e.pointerType === 'mouse') return;
    stop(); // grab it mid-flight: continue from where it is on screen, not from where it was going
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, start: motion.current.x ?? 0, state: 'pending', samples: [] };
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (d.state === 'pending') {
      if (Math.abs(dy) > SLOP && Math.abs(dy) > Math.abs(dx)) { drag.current = null; animateTo(0); return; } // it's a scroll
      if (Math.abs(dx) < SLOP) return;
      d.state = 'dragging';
      d.x0 = e.clientX - dx; // keep the original grab point, no jump when the drag commits
      panel.current.setPointerCapture(e.pointerId);
    }
    let x = d.start + dx;
    // Toward the closed edge it moves freely; past the open position it resists.
    if (sign * x < 0) x = rubberband(x, width());
    if (Math.abs(x) > width()) x = closedX();
    d.samples.push({ x, t: e.timeStamp });
    if (d.samples.length > 12) d.samples.shift();
    paint(x);
  };

  const onPointerUp = (e) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || d.state !== 'dragging') {
      if (d && d.state === 'pending') animateTo(0, motion.current.v);
      return;
    }
    suppressClick.current = true;
    const v = releaseVelocity(d.samples);
    const x = motion.current.x ?? 0;
    const projected = x + project(v);
    motion.current.v = v;
    if (sign * projected > width() / 2) onClose();
    else animateTo(0, v);
  };

  const onPointerCancel = () => {
    if (drag.current) { drag.current = null; animateTo(0, motion.current.v); }
  };

  if (!mounted) return null;
  return (
    <div ref={root} className="fixed inset-0 z-50">
      <div ref={scrim} className="absolute inset-0 bg-ink/40" style={{ opacity: 0 }} onClick={onClose} aria-hidden="true" />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`absolute inset-y-0 ${side === 'right' ? 'right-0' : 'left-0'} touch-pan-y outline-none will-change-transform ${className}`}
        style={{ transform: `translate3d(${sign * 100}%,0,0)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClickCapture={(e) => {
          // A drag that ends over a link must not also follow it.
          if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; }
        }}
      >
        {children}
      </aside>
    </div>
  );
}
