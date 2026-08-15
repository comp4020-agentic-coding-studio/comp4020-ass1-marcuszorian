export type Camera = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const FULL: Camera = { x: 0, y: 0, width: 100, height: 66 };
const MIN_WIDTH = 30;
const MAX_WIDTH = FULL.width;

/** A pointer has to travel this far (CSS px) before we call it a drag, not a tap. */
const DRAG_THRESHOLD_PX = 6;

export function initialCamera(): Camera {
  return { ...FULL };
}

function clamp(camera: Camera): Camera {
  return {
    ...camera,
    x: Math.min(FULL.width - camera.width, Math.max(0, camera.x)),
    y: Math.min(FULL.height - camera.height, Math.max(0, camera.y)),
  };
}

export function zoomCamera(camera: Camera, factor: number): Camera {
  const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, camera.width * factor));
  const height = width * (FULL.height / FULL.width);
  const centerX = camera.x + camera.width / 2;
  const centerY = camera.y + camera.height / 2;
  return clamp({ x: centerX - width / 2, y: centerY - height / 2, width, height });
}

/** Shift the camera by a delta already expressed in viewBox units. */
export function panCamera(camera: Camera, dx: number, dy: number): Camera {
  return clamp({ ...camera, x: camera.x + dx, y: camera.y + dy });
}

export function applyCamera(svg: SVGSVGElement, camera: Camera): void {
  svg.setAttribute("viewBox", `${camera.x} ${camera.y} ${camera.width} ${camera.height}`);
}

type GestureHandlers = {
  onZoom: (factor: number) => void;
  /** Deltas are in CSS pixels; the caller scales them by the current camera. */
  onPan: (dxPx: number, dyPx: number) => void;
};

/**
 * One pointer drags the canvas, two pinch to zoom. A drag that passes the
 * threshold swallows the click that follows it, so panning across a link
 * doesn't also break that link.
 */
export function wireGestures(svg: SVGSVGElement, { onZoom, onPan }: GestureHandlers): void {
  const pointers = new Map<number, { x: number; y: number }>();
  let lastDistance: number | null = null;
  let travelled = 0;
  let suppressClick = false;

  function distance(): number | null {
    if (pointers.size < 2) return null;
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function release(event: PointerEvent) {
    pointers.delete(event.pointerId);
    lastDistance = distance();
    if (pointers.size === 0) {
      suppressClick = travelled > DRAG_THRESHOLD_PX;
      travelled = 0;
    }
  }

  svg.addEventListener("pointerdown", (event) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    lastDistance = distance();
    if (pointers.size === 1) {
      travelled = 0;
    }
  });

  svg.addEventListener("pointermove", (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    travelled += Math.hypot(dx, dy);

    const current = distance();
    if (current !== null && lastDistance !== null) {
      onZoom(lastDistance / current);
      lastDistance = current;
      return;
    }
    lastDistance = current;

    if (pointers.size === 1 && travelled > DRAG_THRESHOLD_PX) {
      onPan(dx, dy);
    }
  });

  svg.addEventListener("pointerup", release);
  svg.addEventListener("pointercancel", release);

  // Capture phase: get in before the link-toggle handler on the same element.
  svg.addEventListener(
    "click",
    (event) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.stopPropagation();
      event.preventDefault();
    },
    true,
  );
}
