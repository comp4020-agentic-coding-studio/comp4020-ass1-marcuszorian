import type { Level, LevelNode, NodeType } from "../data/levels";
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

function poly(points: [number, number][]): SVGPolygonElement {
  const el = svgEl("polygon");
  el.setAttribute("points", points.map(([x, y]) => `${x},${y}`).join(" "));
  return el;
}

function rect(x: number, y: number, w: number, h: number, rx = 0): SVGRectElement {
  const el = svgEl("rect");
  el.setAttribute("x", String(x));
  el.setAttribute("y", String(y));
  el.setAttribute("width", String(w));
  el.setAttribute("height", String(h));
  if (rx) el.setAttribute("rx", String(rx));
  return el;
}

function iconLine(x1: number, y1: number, x2: number, y2: number): SVGLineElement {
  const el = svgEl("line");
  el.setAttribute("x1", String(x1));
  el.setAttribute("y1", String(y1));
  el.setAttribute("x2", String(x2));
  el.setAttribute("y2", String(y2));
  return el;
}

/**
 * A small vector glyph per device type rather than a bare circle, so the
 * shape itself hints at the role (screen, rack, hub) alongside its colour.
 * Everything is built from plain SVG primitives centred on (cx, cy) within
 * roughly the same footprint the old r=4 circle had — no external assets, so
 * nothing to license.
 */
function buildNodeIcon(type: NodeType, cx: number, cy: number): SVGElement[] {
  switch (type) {
    case "client":
      return [
        rect(cx - 3.5, cy - 3, 7, 4.6, 0.6),
        rect(cx - 1, cy + 1.6, 2, 1),
        rect(cx - 2.4, cy + 2.6, 4.8, 0.8, 0.4),
      ];
    case "router":
      return [
        rect(cx - 3.6, cy - 1.8, 7.2, 3.2, 0.9),
        iconLine(cx - 1.6, cy - 1.8, cx - 2.8, cy - 3.4),
        iconLine(cx + 1.6, cy - 1.8, cx + 2.8, cy - 3.4),
      ];
    case "switch":
      return [
        rect(cx - 3.6, cy - 1.6, 7.2, 2.6, 0.4),
        ...[0, 1, 2, 3, 4].map((i) => rect(cx - 3 + i * 1.4, cy + 0.4, 0.7, 0.8)),
      ];
    case "server":
      return [0, 1, 2].map((i) => rect(cx - 3.5, cy - 3.3 + i * 2.1, 7, 1.7, 0.3));
    case "load-balancer":
      return [
        poly([
          [cx, cy - 4],
          [cx + 4, cy],
          [cx, cy + 4],
          [cx - 4, cy],
        ]),
        iconLine(cx, cy - 1.6, cx - 2, cy + 1.8),
        iconLine(cx, cy - 1.6, cx + 2, cy + 1.8),
      ];
    case "cdn-edge":
      return [
        poly([
          [cx - 2, cy - 3.6],
          [cx + 2, cy - 3.6],
          [cx + 4, cy],
          [cx + 2, cy + 3.6],
          [cx - 2, cy + 3.6],
          [cx - 4, cy],
        ]),
      ];
    case "region-gateway":
      return [
        poly([
          [cx, cy - 4],
          [cx + 4, cy - 1],
          [cx + 2.6, cy + 4],
          [cx - 2.6, cy + 4],
          [cx - 4, cy - 1],
        ]),
      ];
    case "datacenter":
      return [
        rect(cx - 3.6, cy - 3.6, 7.2, 7.2, 0.4),
        rect(cx - 2.6, cy - 2.4, 1.8, 1.8),
        rect(cx + 0.8, cy - 2.4, 1.8, 1.8),
        rect(cx - 2.6, cy + 0.6, 1.8, 1.8),
        rect(cx + 0.8, cy + 0.6, 1.8, 1.8),
      ];
  }
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

    for (const shape of buildNodeIcon(node.type, node.x, node.y)) {
      shape.setAttribute("class", shape.tagName === "line" ? "node-icon-line" : "node-icon-shape");
      group.append(shape);
    }

    const label = svgEl("text");
    label.setAttribute("x", String(node.x));
    label.setAttribute("y", String(node.y + NODE_RADIUS + 5));
    label.textContent = node.id;

    group.append(label);
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
        // through the same devices in reverse. The engine computes the return
        // leg independently (network.ts's roundTrip()), but with equal cost
        // either way across every link here, the lowest-cost way back is
        // always this path reversed.
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
