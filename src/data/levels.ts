export type NodeType =
  | "client"
  | "router"
  | "server"
  | "switch"
  | "load-balancer"
  | "cdn-edge"
  | "region-gateway"
  | "datacenter";

export type LevelNode = {
  id: string;
  type: NodeType;
  /** Position in a shared 0-100 x 0-60 viewBox space, hand-authored per level. */
  x: number;
  y: number;
};

export type LevelEdge = {
  id: string;
  from: string;
  to: string;
  latency: number;
};

export type Level = {
  id: number;
  title: string;
  source: string;
  destinations: string[];
  isTutorial?: boolean;
  nodes: LevelNode[];
  edges: LevelEdge[];
};

export const levels: Level[] = [
  {
    id: 1,
    title: "How the Internet Reroutes",
    source: "you",
    destinations: ["server"],
    isTutorial: true,
    nodes: [
      { id: "you", type: "client", x: 8, y: 30 },
      { id: "router-a", type: "router", x: 45, y: 12 },
      { id: "router-b", type: "router", x: 45, y: 48 },
      { id: "server", type: "server", x: 92, y: 30 },
    ],
    edges: [
      { id: "direct", from: "you", to: "server", latency: 5 },
      { id: "to-a", from: "you", to: "router-a", latency: 8 },
      { id: "a-server", from: "router-a", to: "server", latency: 12 },
      { id: "to-b", from: "you", to: "router-b", latency: 35 },
      { id: "b-server", from: "router-b", to: "server", latency: 45 },
    ],
  },
  {
    id: 2,
    title: "Bigger Office",
    source: "laptop",
    destinations: ["server"],
    nodes: [
      { id: "laptop", type: "client", x: 8, y: 30 },
      { id: "switch-1", type: "switch", x: 28, y: 30 },
      { id: "router-a", type: "router", x: 60, y: 12 },
      { id: "router-b", type: "router", x: 60, y: 48 },
      { id: "server", type: "server", x: 92, y: 30 },
    ],
    edges: [
      { id: "laptop-switch", from: "laptop", to: "switch-1", latency: 5 },
      { id: "switch-direct", from: "switch-1", to: "server", latency: 12 },
      { id: "switch-a", from: "switch-1", to: "router-a", latency: 8 },
      { id: "a-server", from: "router-a", to: "server", latency: 10 },
      { id: "switch-b", from: "switch-1", to: "router-b", latency: 20 },
      { id: "b-server", from: "router-b", to: "server", latency: 25 },
    ],
  },
  {
    id: 3,
    title: "Small ISP",
    source: "client",
    destinations: ["server-a", "server-b"],
    nodes: [
      { id: "client", type: "client", x: 8, y: 30 },
      { id: "switch-1", type: "switch", x: 25, y: 30 },
      { id: "router-a", type: "router", x: 48, y: 10 },
      { id: "router-b", type: "router", x: 48, y: 50 },
      { id: "lb-1", type: "load-balancer", x: 65, y: 30 },
      { id: "server-a", type: "server", x: 92, y: 18 },
      { id: "server-b", type: "server", x: 92, y: 42 },
    ],
    edges: [
      { id: "c-sw", from: "client", to: "switch-1", latency: 5 },
      { id: "sw-a", from: "switch-1", to: "router-a", latency: 8 },
      { id: "sw-b", from: "switch-1", to: "router-b", latency: 18 },
      { id: "a-lb", from: "router-a", to: "lb-1", latency: 4 },
      { id: "b-lb", from: "router-b", to: "lb-1", latency: 12 },
      { id: "lb-server-a", from: "lb-1", to: "server-a", latency: 9 },
      { id: "lb-server-b", from: "lb-1", to: "server-b", latency: 11 },
    ],
  },
  {
    id: 4,
    title: "Regional Mesh",
    source: "client",
    destinations: ["server-a", "server-b"],
    nodes: [
      { id: "client", type: "client", x: 8, y: 30 },
      { id: "cdn-a", type: "cdn-edge", x: 24, y: 15 },
      { id: "cdn-b", type: "cdn-edge", x: 24, y: 45 },
      { id: "router-a", type: "router", x: 50, y: 5 },
      { id: "router-b", type: "router", x: 50, y: 30 },
      { id: "router-c", type: "router", x: 50, y: 55 },
      { id: "server-a", type: "server", x: 92, y: 20 },
      { id: "server-b", type: "server", x: 92, y: 50 },
    ],
    edges: [
      { id: "client-cdn-a", from: "client", to: "cdn-a", latency: 5 },
      { id: "client-cdn-b", from: "client", to: "cdn-b", latency: 6 },
      { id: "cdn-a-router-a", from: "cdn-a", to: "router-a", latency: 8 },
      { id: "cdn-a-router-b", from: "cdn-a", to: "router-b", latency: 10 },
      { id: "cdn-b-router-b", from: "cdn-b", to: "router-b", latency: 9 },
      { id: "cdn-b-router-c", from: "cdn-b", to: "router-c", latency: 11 },
      { id: "router-a-server", from: "router-a", to: "server-a", latency: 10 },
      { id: "router-b-server", from: "router-b", to: "server-a", latency: 12 },
      { id: "router-c-server", from: "router-c", to: "server-b", latency: 13 },
      { id: "router-a-router-b", from: "router-a", to: "router-b", latency: 4 },
    ],
  },
  {
    id: 5,
    title: "The Global Backbone",
    source: "client",
    destinations: ["server-a", "server-b"],
    nodes: [
      { id: "client", type: "client", x: 5, y: 30 },
      { id: "gw-a", type: "region-gateway", x: 20, y: 12 },
      { id: "gw-b", type: "region-gateway", x: 20, y: 48 },
      { id: "dc-a1", type: "datacenter", x: 45, y: 5 },
      { id: "dc-a2", type: "datacenter", x: 45, y: 22 },
      { id: "dc-b1", type: "datacenter", x: 45, y: 38 },
      { id: "dc-b2", type: "datacenter", x: 45, y: 55 },
      { id: "server-a", type: "server", x: 92, y: 14 },
      { id: "server-b", type: "server", x: 92, y: 47 },
    ],
    edges: [
      { id: "client-gw-a", from: "client", to: "gw-a", latency: 4 },
      { id: "client-gw-b", from: "client", to: "gw-b", latency: 5 },
      { id: "gw-a-dc-a1", from: "gw-a", to: "dc-a1", latency: 6 },
      { id: "gw-a-dc-a2", from: "gw-a", to: "dc-a2", latency: 7 },
      { id: "gw-b-dc-a2", from: "gw-b", to: "dc-a2", latency: 8 },
      { id: "gw-b-dc-b1", from: "gw-b", to: "dc-b1", latency: 9 },
      { id: "gw-b-dc-b2", from: "gw-b", to: "dc-b2", latency: 10 },
      { id: "dc-a1-server", from: "dc-a1", to: "server-a", latency: 10 },
      { id: "dc-a2-server", from: "dc-a2", to: "server-a", latency: 11 },
      { id: "dc-b1-server", from: "dc-b1", to: "server-b", latency: 12 },
      { id: "dc-b2-server", from: "dc-b2", to: "server-b", latency: 13 },
    ],
  },
];
