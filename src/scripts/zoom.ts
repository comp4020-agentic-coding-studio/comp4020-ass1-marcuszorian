export type Camera = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const FULL: Camera = { x: 0, y: 0, width: 100, height: 60 };
const MIN_WIDTH = 30;
const MAX_WIDTH = FULL.width;

export function initialCamera(): Camera {
  return { ...FULL };
}

export function zoomCamera(camera: Camera, factor: number): Camera {
  const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, camera.width * factor));
  const height = width * (FULL.height / FULL.width);
  const centerX = camera.x + camera.width / 2;
  const centerY = camera.y + camera.height / 2;
  const x = Math.min(FULL.width - width, Math.max(0, centerX - width / 2));
  const y = Math.min(FULL.height - height, Math.max(0, centerY - height / 2));
  return { x, y, width, height };
}

export function applyCamera(svg: SVGSVGElement, camera: Camera): void {
  svg.setAttribute("viewBox", `${camera.x} ${camera.y} ${camera.width} ${camera.height}`);
}

export function wirePinchZoom(svg: SVGSVGElement, onZoom: (factor: number) => void): void {
  const pointers = new Map<number, { x: number; y: number }>();
  let lastDistance: number | null = null;

  function distance(): number | null {
    if (pointers.size < 2) return null;
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function release(event: PointerEvent) {
    pointers.delete(event.pointerId);
    lastDistance = distance();
  }

  svg.addEventListener("pointerdown", (event) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    lastDistance = distance();
  });
  svg.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const current = distance();
    if (current !== null && lastDistance !== null) {
      onZoom(lastDistance / current);
    }
    lastDistance = current;
  });
  svg.addEventListener("pointerup", release);
  svg.addEventListener("pointercancel", release);
}
