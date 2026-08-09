import type { NodeType } from "./levels";

export const deviceHints: Record<NodeType, { title: string; description: string }> = {
  client: {
    title: "Client",
    description: "The device asking for something — a laptop, phone, or browser tab making a request.",
  },
  switch: {
    title: "Switch",
    description: "Connects nearby devices together, forwarding traffic between them without choosing a route.",
  },
  router: {
    title: "Router",
    description: "Picks which link to send traffic down next, out of whichever paths are still standing.",
  },
  server: {
    title: "Server",
    description: "The destination — where the request actually gets answered.",
  },
  "load-balancer": {
    title: "Load Balancer",
    description: "Spreads requests across several backend paths instead of sending them all down one.",
  },
  "cdn-edge": {
    title: "CDN Edge",
    description: "A point of presence close to the client that caches and forwards traffic toward origin servers.",
  },
  "region-gateway": {
    title: "Region Gateway",
    description: "The entry point into a whole geographic region's infrastructure, fanning out to its datacenters.",
  },
  datacenter: {
    title: "Datacenter",
    description: "A facility hosting the servers that actually answer requests for its region.",
  },
};
