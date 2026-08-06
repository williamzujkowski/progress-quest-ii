# Revisit the name under the machine framing

**Status: proposed. This ADR does not decide anything. It exists so the choice can be made
from options rather than from one recommendation, and the owner picks.**

ADR 0002 chose *Progress Quest III: The Search for Progress Quest II* and rejected
*Progress Quest Infinity* as "safe but comedically inert". That reasoning was sound on the axis
it considered — a parody of live-service progression should not be named like the releases it
parodies — but it considered only that axis.

The project has since been described by its owner differently: not merely a zero-player game, but
"a meta job about computers making a game so computers can play it." That is a different joke from
the one ADR 0002 optimised for. *Progress Quest III* is a joke about sequels. It is a good one, and
it is aimed at a target this project no longer only has.

## What the name has to carry now

Three things are true of this project that were not central when 0002 was written:

1. **Nobody plays it, and nobody wrote it.** The masthead already says "Zero players. Zero
   developers." The name has an opportunity to complete that sentence rather than repeat it.
2. **It runs unattended and is watched rather than operated.** The closest existing vocabulary is
   not games; it is infrastructure — daemons, headless runners, scheduled jobs, uptime.
3. **The absent middle installment is still funny**, and abandoning it costs something real. Any
   replacement has to be at least as funny as the joke it displaces, not merely more accurate.

## Candidates

Prior art checked on 2026-08-06 for each: npm returns 404, GitHub has no repository of that name
and no full-text match. **Not checked for any candidate: trademark registries, domain
availability, itch.io, Steam, Google Play.** ADR 0002 exists partly because a previous rebrand
shipped on an incomplete check, so the limits of this one are stated rather than implied.

### Progress Quest III: The Search for Progress Quest II — the incumbent

The Spaceballs construction, and the only candidate that turns the prior-art collision itself into
the joke. Vacates the contested numeral rather than litigating it. Says nothing about machines.

### Progress Quest: Headless

A headless browser or headless runner executes without a display and without anyone watching. It
is precisely, technically, what this is — and it lands for exactly the audience that would enjoy
the rest of the project. Reads as a decapitation joke to everyone else, which is either a bonus or
a problem depending on taste.

### Progress Quest: Daemon

A daemon is a process that runs forever, unattended, doing its job whether or not anyone is
interested. That is a one-word summary of both the game and the premise. Slightly darker in
register than the project's warm bureaucratic voice.

### Progress Quest Infinity — the owner's suggestion, reconsidered

0002 rejected it for sitting in "heavily used suffix space" and for naming the project like the
live-service releases it parodies. Under the machine framing the second objection weakens: a game
that genuinely never ends, played by nobody, has a stronger claim to *Infinity* than any live
service does. The first objection stands — it is the least distinctive of the four.

## Recommendation, not a decision

**Progress Quest: Headless**, keeping *Progress Quest III* as the fallback if the decapitation
reading is unwelcome.

It is the only candidate that is simultaneously accurate, funny to the audience the project is
written for, and short enough for a masthead and a browser tab. It completes "zero players, zero
developers" with a third term drawn from the same infrastructure vocabulary the interface already
speaks — the world console, the filing rate, the tenor line.

Against it: it abandons the prior-art joke, which is genuinely good, and it is a technical pun
that a general audience will not get. Both are real costs and neither is disqualifying.

## Whatever is chosen

The implementation constraints in #140 are unchanged and non-negotiable: save compatibility,
storage keys, and `.pqw` terminology stay exactly as they are; the Pages URL move needs redirects
planned first; and visible identity, manifest, metadata, README, tests, and deployment validation
change atomically or not at all. A rename that costs someone their save is worse than any name.
