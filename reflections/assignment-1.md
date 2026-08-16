# Reflection - Assignment 1

## The breakthrough

The breakthrough was realising that a diff that made the checks pass was not necessarily correct. I first encountered this with the one-way-edge bug (4aa5fed). routes() treated links as traversable only in the direction they were authored, so a path visible in the diagram could become unreachable in the simulation. The existing tests did not expose the problem because they shared the same assumption. I found it by opening the browser and tracing a route the topology showed should still exist.

The same lesson applied to the explanation. The response packet replayed the request path backwards, while some copy described simplified simulation behaviour as universal networking behaviour. Rather than making the smallest changes to make the output look right, I changed the model: roundTrip() computes the return route independently (5fa12bf). I then checked the remaining technical claims individually (3bb46ec).

## What this changed about me as a developer

I am much less willing to treat a green check as proof that work is correct. A passing test suite can encode the wrong assumption, and a working interface can still communicate something inaccurate. I now treat “this works” and “this is true” as separate claims needing separate verification.

I also want recurring mistakes to become constraints rather than memories. When I find a mistake, I want to turn the lesson into a test or another part of the harness that makes better behaviour easier to reproduce. The useful outcome of this prototype was therefore not just producing a routing simulation, but learning to make the system I work with more capable of catching its own recurring mistakes.
