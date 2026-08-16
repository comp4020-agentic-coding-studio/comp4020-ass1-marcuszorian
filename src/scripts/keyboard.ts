import { focusOrder, moveFocus, type FocusTarget } from "../lib/focus";
import type { Level } from "../data/levels";

function levelFocusGraph(level: Level) {
  return {
    nodes: level.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y })),
    edges: level.edges,
  };
}

export function handleDiagramKeydown(
  event: KeyboardEvent,
  level: Level,
  currentFocus: FocusTarget | null,
  onFocusChange: (target: FocusTarget) => void,
  onToggle: (linkId: string) => void,
): void {
  const order = focusOrder(levelFocusGraph(level));

  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      event.preventDefault();
      onFocusChange(moveFocus(order, currentFocus, "next"));
      break;
    case "ArrowLeft":
    case "ArrowUp":
      event.preventDefault();
      onFocusChange(moveFocus(order, currentFocus, "prev"));
      break;
    case " ":
    case "Enter":
      if (currentFocus?.kind === "link") {
        event.preventDefault();
        onToggle(currentFocus.id);
      }
      break;
    default:
      break;
  }
}

export function focusSelectorFor(target: FocusTarget): string {
  return target.kind === "node" ? `[data-node-id="${target.id}"]` : `[data-link-id="${target.id}"]`;
}
