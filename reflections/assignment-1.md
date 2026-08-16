# Reflection — Assignment 1

## The breakthrough

The breakthrough was realising that a diff that made the checks pass was not necessarily a diff that was correct. The first time I encountered this was the one-way-edge bug ([4aa5fed](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-marcuszorian/commit/4aa5fed2b722cd9e1d1f3a11f374c720ae617b0f)). `routes()` treated links as traversable only in the direction they had been authored, so a path that visibly existed in the diagram could become unreachable in the simulation. The existing tests did not expose the problem because they had been written around the same assumption. I found it by opening the browser and tracing a route that the topology itself showed should still exist.

The second part of the breakthrough was recognising the same problem at the level of explanation. The response packet had been hardcoded to replay the request path backwards, and some of the copy described simplified simulation behaviour as if it were universal networking behaviour. I could have made the smallest possible changes to make the output look right, but instead I changed the model: `roundTrip()` computes the return route independently ([5fa12bf](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-marcuszorian/commit/5fa12bf5316dab1c7bb10d25482a54fb87a6ed4a)), and I then checked the remaining technical claims individually rather than asking for another generic copy pass ([3bb46ec](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-marcuszorian/commit/3bb46ecfb88bac8e502d075c540dc551a79746db)).

## What this changed about me as a developer

I have become much less willing to treat a green check as proof that the work is correct. A passing test suite can encode the wrong assumption, and a working interface can still communicate something inaccurate. I now treat “this works” and “this is true” as separate claims that need separate verification.

The other change is how I respond when I find a recurring mistake. Instead of relying on myself or the agent to remember the correction, I want to turn the lesson into a constraint, such as a test, or another part of the harness that makes the better behaviour easier to reproduce. The useful outcome of this prototype was therefore not just in producing a routing simulation, but actually in learning to make the system I work with more capable of catching its own recurring mistakes.
