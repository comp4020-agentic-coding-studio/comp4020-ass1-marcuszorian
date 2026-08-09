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
};
