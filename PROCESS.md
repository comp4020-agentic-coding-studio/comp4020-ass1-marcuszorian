# Process overview
## What I built

A network-routing prototype: five levels move from a small client/router/server network to increasingly global infrastructure, and the player cuts links to see whether traffic can still find a route. The single mechanic carries the explanation: as links fail, hop count, latency, redundancy and eventual failure become visible rather than being explained only in prose.

## The moments that mattered

### One-way-edge routing bug - [4aa5fed](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-marcuszorian/commit/4aa5fed2b722cd9e1d1f3a11f374c720ae617b0f)

`routes()` originally walked an edge only from the `from` node to the `to` node, so the order in which a link was authored in `levels.ts` silently determined whether traffic could cross it. On the meshed levels this created dead ends that the diagram did not show: a physical path could exist in both directions while the routing walk could only traverse one. Rather than patching individual levels or rewriting their edge data, I changed the routing walk so a link is treated as a physical cable and is traversable in either direction. That matched the topology represented by the diagram and avoided encoding a false one-way property in the data.

### Independent return trip - [5fa12bf](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-marcuszorian/commit/5fa12bf5316dab1c7bb10d25482a54fb87a6ed4a)

The response animation originally replayed the request path in reverse. That was convenient, but it encoded an assumption of symmetric routing that the simulation did not need and real routing does not guarantee. Instead of swapping the path array, I added `roundTrip()` so the return leg is calculated independently as the lowest-cost route home from where the request actually landed. I verified the result against the diagrams rather than trusting the implementation: after breaking a suitable link, the return path could differ from the outbound path, which a reverse-replay implementation could never represent. At the same time I corrected explanatory copy that had presented simplified properties of routers, load balancers, CDNs and the internet as universal facts.

### Follow-up accuracy pass - [3bb46ec](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-marcuszorian/commit/3bb46ecfb88bac8e502d075c540dc551a79746db)

The first accuracy pass exposed a broader pattern rather than a single wording mistake. Some copy still treated properties of this simulation as general facts: for example, claims about a single route through a network, how slow pages behave, and how routers choose paths. Rather than asking the agent for another general “fix the copy” pass, I checked the claims individually against what the simulation actually models and rewrote them to state that scope explicitly. I also made the status line distinguish hops, one-way latency, RTT and surviving routes, so the interface itself no longer relied on an implied direction. I verified the revised wording against the values produced by `roundTrip()` and against the behaviour shown in the browser. This became a standing rule in `CLAUDE.md`: distinguish what is true of this simulation from what is generally true of real networks before accepting technical copy.
