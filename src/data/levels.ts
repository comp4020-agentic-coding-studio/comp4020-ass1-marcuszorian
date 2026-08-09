export type NodeType = "client" | "router" | "server" | "switch";

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
  destination: string;
  isTutorial?: boolean;
  nodes: LevelNode[];
  edges: LevelEdge[];
};

export const levels: Level[] = [
  {
    id: 1,
    title: "How the Internet Reroutes",
    source: "you",
    destination: "server",
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
    destination: "server",
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
    destination: "server",
    nodes: [
      { id: "client", type: "client", x: 8, y: 30 },
      { id: "switch-1", type: "switch", x: 25, y: 30 },
      { id: "router-a", type: "router", x: 48, y: 10 },
      { id: "router-b", type: "router", x: 48, y: 50 },
      { id: "router-c", type: "router", x: 65, y: 30 },
      { id: "server", type: "server", x: 92, y: 30 },
    ],
    edges: [
      { id: "c-sw", from: "client", to: "switch-1", latency: 5 },
      { id: "sw-a", from: "switch-1", to: "router-a", latency: 8 },
      { id: "sw-b", from: "switch-1", to: "router-b", latency: 18 },
      { id: "sw-c", from: "switch-1", to: "router-c", latency: 10 },
      { id: "a-server", from: "router-a", to: "server", latency: 10 },
      { id: "b-server", from: "router-b", to: "server", latency: 22 },
      { id: "c-server", from: "router-c", to: "server", latency: 9 },
      { id: "a-c", from: "router-a", to: "router-c", latency: 4 },
    ],
  },
  {
    id: 4,
    title: "Regional Mesh",
    source: "client",
    destination: "server",
    nodes: [
      { id: "client", type: "client", x: 8, y: 30 },
      { id: "switch-a", type: "switch", x: 24, y: 15 },
      { id: "switch-b", type: "switch", x: 24, y: 45 },
      { id: "router-a", type: "router", x: 50, y: 5 },
      { id: "router-b", type: "router", x: 50, y: 30 },
      { id: "router-c", type: "router", x: 50, y: 55 },
      { id: "server", type: "server", x: 92, y: 30 },
    ],
    edges: [
      { id: "client-switch-a", from: "client", to: "switch-a", latency: 5 },
      { id: "client-switch-b", from: "client", to: "switch-b", latency: 6 },
      { id: "switch-a-router-a", from: "switch-a", to: "router-a", latency: 8 },
      { id: "switch-a-router-b", from: "switch-a", to: "router-b", latency: 10 },
      { id: "switch-b-router-b", from: "switch-b", to: "router-b", latency: 9 },
      { id: "switch-b-router-c", from: "switch-b", to: "router-c", latency: 11 },
      { id: "router-a-server", from: "router-a", to: "server", latency: 10 },
      { id: "router-b-server", from: "router-b", to: "server", latency: 12 },
      { id: "router-c-server", from: "router-c", to: "server", latency: 13 },
      { id: "router-a-router-b", from: "router-a", to: "router-b", latency: 4 },
    ],
  },
  {
    id: 5,
    title: "The Backbone",
    source: "client",
    destination: "server",
    nodes: [
      { id: "client", type: "client", x: 5, y: 30 },
      { id: "switch-a", type: "switch", x: 20, y: 12 },
      { id: "switch-b", type: "switch", x: 20, y: 48 },
      { id: "router-a", type: "router", x: 45, y: 5 },
      { id: "router-b", type: "router", x: 45, y: 22 },
      { id: "router-c", type: "router", x: 45, y: 38 },
      { id: "router-d", type: "router", x: 45, y: 55 },
      { id: "server", type: "server", x: 92, y: 30 },
    ],
    edges: [
      { id: "client-switch-a", from: "client", to: "switch-a", latency: 4 },
      { id: "client-switch-b", from: "client", to: "switch-b", latency: 5 },
      { id: "switch-a-router-a", from: "switch-a", to: "router-a", latency: 6 },
      { id: "switch-a-router-b", from: "switch-a", to: "router-b", latency: 7 },
      { id: "switch-b-router-b", from: "switch-b", to: "router-b", latency: 8 },
      { id: "switch-b-router-c", from: "switch-b", to: "router-c", latency: 9 },
      { id: "switch-b-router-d", from: "switch-b", to: "router-d", latency: 10 },
      { id: "router-a-server", from: "router-a", to: "server", latency: 10 },
      { id: "router-b-server", from: "router-b", to: "server", latency: 11 },
      { id: "router-c-server", from: "router-c", to: "server", latency: 12 },
      { id: "router-d-server", from: "router-d", to: "server", latency: 13 },
      { id: "router-a-router-c", from: "router-a", to: "router-c", latency: 5 },
    ],
  },
];
