import type { Level, LevelNode } from "../data/levels";
import type { FocusTarget } from "../lib/focus";

const NODE_RADIUS = 4;
const HOP_DURATION_MS = 900;

/**
 * Keyed per diagram: every level on the page renders into its own <svg>, and a
 * shared handle would mean each render cancelled the other diagrams' packets.
 */
const animationFrames = new WeakMap<SVGSVGElement, number>();

function nodePosition(level: Level, id: string): LevelNode {
  const node = level.nodes.find((n) => n.id === id);
  if (!node) {
    throw new Error(`unknown node "${id}"`);
  }
  return node;
}

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

const LINK_LABEL_OFFSET = 2.4;

function linkLabelPosition(from: LevelNode, to: LevelNode): [number, number] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return [
    (from.x + to.x) / 2 + (-dy / length) * LINK_LABEL_OFFSET,
    (from.y + to.y) / 2 + (dx / length) * LINK_LABEL_OFFSET,
  ];
}

function isTabbableLink(edgeId: string, focus: FocusTarget | null): boolean {
  return focus !== null && focus.kind === "link" && focus.id === edgeId;
}

function isTabbableNode(level: Level, nodeId: string, focus: FocusTarget | null): boolean {
  if (focus !== null) {
    return focus.kind === "node" && focus.id === nodeId;
  }
  return level.nodes[0]?.id === nodeId;
}

export function renderDiagram(
  svg: SVGSVGElement,
  level: Level,
  broken: Set<string>,
  cheapestPath: string[] | null,
  focus: FocusTarget | null,
): void {
  const pending = animationFrames.get(svg);
  if (pending !== undefined) {
    cancelAnimationFrame(pending);
    animationFrames.delete(svg);
  }
  svg.replaceChildren();

  for (const edge of level.edges) {
    const from = nodePosition(level, edge.from);
    const to = nodePosition(level, edge.to);
    const isBroken = broken.has(edge.id);

    const hit = svgEl("line");
    hit.setAttribute("class", "link-hit");
    hit.setAttribute("x1", String(from.x));
    hit.setAttribute("y1", String(from.y));
    hit.setAttribute("x2", String(to.x));
    hit.setAttribute("y2", String(to.y));

    const group = svgEl("g");
    group.setAttribute("class", `link ${isBroken ? "is-broken" : "is-active"}`);
    group.setAttribute("data-link-id", edge.id);
    group.setAttribute("tabindex", isTabbableLink(edge.id, focus) ? "0" : "-1");
    group.setAttribute("role", "button");
    group.setAttribute("aria-pressed", String(isBroken));
    group.setAttribute(
      "aria-label",
      `Link from ${edge.from} to ${edge.to}, ${edge.latency}ms, ${isBroken ? "broken" : "active"}`,
    );

    const line = svgEl("line");
    line.setAttribute("class", "link-visible");
    line.setAttribute("x1", String(from.x));
    line.setAttribute("y1", String(from.y));
    line.setAttribute("x2", String(to.x));
    line.setAttribute("y2", String(to.y));

    const label = svgEl("text");
    label.setAttribute("class", "link-label");
    const [labelX, labelY] = linkLabelPosition(from, to);
    label.setAttribute("x", String(labelX));
    label.setAttribute("y", String(labelY));
    label.textContent = `${edge.latency}ms`;

    group.append(hit, line, label);

    svg.append(group);
  }

  for (const node of level.nodes) {
    const group = svgEl("g");
    group.setAttribute("class", `node device-${node.type}`);
    group.setAttribute("data-node-id", node.id);
    group.setAttribute("tabindex", isTabbableNode(level, node.id, focus) ? "0" : "-1");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", `${node.type}: ${node.id}`);

    const circle = svgEl("circle");
    circle.setAttribute("cx", String(node.x));
    circle.setAttribute("cy", String(node.y));
    circle.setAttribute("r", String(NODE_RADIUS));

    const label = svgEl("text");
    label.setAttribute("x", String(node.x));
    label.setAttribute("y", String(node.y + NODE_RADIUS + 5));
    label.textContent = node.id;

    group.append(circle, label);
    svg.append(group);
  }

  if (cheapestPath && cheapestPath.length > 1) {
    const packet = svgEl("circle");
    packet.setAttribute("class", "packet");
    packet.setAttribute("r", "1.4");
    svg.append(packet);
    animatePacket(svg, packet, cheapestPath.map((id) => nodePosition(level, id)));
  }
}

function animatePacket(
  svg: SVGSVGElement,
  packet: SVGCircleElement,
  waypoints: LevelNode[],
): void {
  const totalDuration = HOP_DURATION_MS * (waypoints.length - 1);
  let start: number | null = null;

  function tick(now: number) {
    if (start === null) {
      start = now;
    }
    const elapsed = (now - start) % totalDuration;
    const hop = Math.floor(elapsed / HOP_DURATION_MS);
    const hopProgress = (elapsed % HOP_DURATION_MS) / HOP_DURATION_MS;
    const from = waypoints[hop];
    const to = waypoints[hop + 1] ?? from;
    packet.setAttribute("cx", String(from.x + (to.x - from.x) * hopProgress));
    packet.setAttribute("cy", String(from.y + (to.y - from.y) * hopProgress));
    animationFrames.set(svg, requestAnimationFrame(tick));
  }

  animationFrames.set(svg, requestAnimationFrame(tick));
}
