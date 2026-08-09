import type { Level, LevelNode } from "../data/levels";
import type { FocusTarget } from "../lib/focus";

const NODE_RADIUS = 4;
/** Per hop, in one direction — a full round trip is twice this per hop. */
const HOP_DURATION_MS = 700;

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
    const outbound = cheapestPath.map((id) => nodePosition(level, id));
    animatePackets(
      svg,
      [
        { el: appendPacket(svg, "packet-request"), waypoints: outbound, from: 0, to: 0.5 },
        // Nothing comes back until something has arrived, so the response only
        // sets off over the second half of the cycle — over the same links,
        // through the same devices in reverse. A physical link carries traffic
        // both ways; routing it any other way would invent a path the level
        // doesn't have.
        {
          el: appendPacket(svg, "packet-response"),
          waypoints: [...outbound].reverse(),
          from: 0.5,
          to: 1,
        },
      ],
      2 * HOP_DURATION_MS * (outbound.length - 1),
    );
  }
}

type Packet = {
  el: SVGCircleElement;
  waypoints: LevelNode[];
  /** The slice of the round trip this packet is in flight for, as 0-1 fractions. */
  from: number;
  to: number;
};

function appendPacket(svg: SVGSVGElement, modifier: string): SVGCircleElement {
  const packet = svgEl("circle");
  packet.setAttribute("class", `packet ${modifier}`);
  packet.setAttribute("r", "1.4");
  svg.append(packet);
  return packet;
}

function placePacket(packet: Packet, progress: number): void {
  const hops = packet.waypoints.length - 1;
  const position = progress * hops;
  const hop = Math.min(Math.floor(position), hops - 1);
  const withinHop = position - hop;
  const from = packet.waypoints[hop];
  const to = packet.waypoints[hop + 1];
  packet.el.setAttribute("cx", String(from.x + (to.x - from.x) * withinHop));
  packet.el.setAttribute("cy", String(from.y + (to.y - from.y) * withinHop));
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function animatePackets(svg: SVGSVGElement, packets: Packet[], duration: number): void {
  if (prefersReducedMotion()) {
    // A still frame of the same moment the animation makes: the request has
    // just about landed, and the answer is already on its way back.
    for (const packet of packets) {
      placePacket(packet, packet.from === 0 ? 0.9 : 0.4);
    }
    return;
  }

  let start: number | null = null;

  function tick(now: number) {
    if (start === null) {
      start = now;
    }
    const cycle = ((now - start) % duration) / duration;
    for (const packet of packets) {
      const inFlight = cycle >= packet.from && cycle < packet.to;
      packet.el.style.display = inFlight ? "" : "none";
      if (inFlight) {
        placePacket(packet, (cycle - packet.from) / (packet.to - packet.from));
      }
    }
    animationFrames.set(svg, requestAnimationFrame(tick));
  }

  animationFrames.set(svg, requestAnimationFrame(tick));
}
