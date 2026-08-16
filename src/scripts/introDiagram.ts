import type { Level } from "../data/levels";
import { renderDiagram } from "./diagram";

/**
 * A tiny network used only for the auto-playing preview above "How to play" —
 * not one of the real levels, so it carries no progress and never appears in
 * the level counter or nav.
 */
const teaserLevel: Level = {
  id: 0,
  title: "Sample network",
  description: "A client reaching a server through two possible paths.",
  source: "you",
  destinations: ["destination"],
  nodes: [
    { id: "you", type: "client", x: 8, y: 33 },
    { id: "path-a", type: "router", x: 45, y: 14 },
    { id: "path-b", type: "router", x: 45, y: 52 },
    { id: "destination", type: "server", x: 90, y: 33 },
  ],
  edges: [
    { id: "out-a", from: "you", to: "path-a", latency: 10 },
    { id: "a-dest", from: "path-a", to: "destination", latency: 10 },
    { id: "out-b", from: "you", to: "path-b", latency: 22 },
    { id: "b-dest", from: "path-b", to: "destination", latency: 22 },
  ],
};

/** How long the healthy and broken phases each stay on screen. */
const PHASE_MS = 4200;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

document.addEventListener("DOMContentLoaded", () => {
  const svg = document.querySelector<SVGSVGElement>("[data-intro-network]");
  if (!svg) return;

  function show(broken: Set<string>, changedLinkId: string | null): void {
    renderDiagram(svg!, teaserLevel, broken, null, changedLinkId);
    // Purely illustrative: nothing here responds to a click or a key, so
    // nothing in it should be able to catch keyboard focus either.
    for (const el of svg!.querySelectorAll<SVGElement>("[tabindex]")) {
      el.setAttribute("tabindex", "-1");
    }
  }

  if (prefersReducedMotion()) {
    // A still frame of the rerouted state, the same moment the full diagrams
    // freeze on: no cycling, since toggling link states is itself motion.
    show(new Set(["out-a"]), null);
    return;
  }

  let down = false;
  show(new Set(), null);
  setInterval(() => {
    down = !down;
    show(down ? new Set(["out-a"]) : new Set(), "out-a");
  }, PHASE_MS);
});
