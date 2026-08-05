# Imported skill provenance

Where each skill under `.agents/skills/` came from, what licenses it, and whether the local copy
still matches the revision it was audited against.

**A `license:` line in a skill's YAML frontmatter is a claim, not a grant.** It is written by
whoever authored the file and is not a substitute for the upstream project's own license text.
Where an upstream project publishes a LICENSE file, it is retained under `licenses/` and named for
the project it governs. Where one does not exist, this file says so rather than treating the claim
as settled.

## Audited revisions

Each upstream was audited at the revision below, and every local file was compared against it
byte-for-byte. "Modified" means the local copy differs from that revision — either because it was
imported from an earlier one or because it carries local edits. The distinction is not recoverable
from the files themselves, so it is not claimed.

How far a file has diverged is deliberately not recorded here. It is method-dependent, it drifts,
and `check-provenance.mjs` reports it on demand from the files themselves. A number written down
here would only ever be a second opinion competing with the tool.

| Upstream | Revision audited against |
| --- | --- |
| [mattpocock/skills](https://github.com/mattpocock/skills) | `8b36d4fb2635b3c21998dcd8144439c9e5ba7302` |
| [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | `16f29800fd2681bdf24f3eb4ccffe38be3baec6b` |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | `7c180d9044c9ae2b442b567aad4e42a28dd5ed62` |
| [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines) | `d0a657bfe87e86dd3a4753d7ec28c7e7dd7a88fe` |
| Anthropic `frontend-design` | Vendored from the installed plugin distribution; carries its own `LICENSE.txt` |

## Inventory

| Skill | Upstream | License | Retained text | State against audited revision |
| --- | --- | --- | --- | --- |
| `code-review` | mattpocock/skills | MIT | [`licenses/mattpocock-skills-LICENSE.txt`](licenses/mattpocock-skills-LICENSE.txt) | Modified |
| `to-spec` | mattpocock/skills | MIT | same | Modified |
| `to-tickets` | mattpocock/skills | MIT | same | Identical |
| `triage` | mattpocock/skills | MIT | same | Modified |
| `wayfinder` | mattpocock/skills | MIT | same | Modified |
| `tdd` | mattpocock/skills | MIT | same | Modified |
| `prototype` | mattpocock/skills | MIT | same | Modified |
| `grilling` | mattpocock/skills | MIT | same | Modified |
| `implement` | mattpocock/skills | MIT | same | Identical |
| `research` | mattpocock/skills | MIT | same | Identical |
| `diagnosing-bugs` | mattpocock/skills | MIT | same | Identical |
| `domain-modeling` | mattpocock/skills | MIT | same | Identical |
| `codebase-design` | mattpocock/skills | MIT | same | Identical |
| `improve-codebase-architecture` | mattpocock/skills | MIT | same | Identical |
| `resolving-merge-conflicts` | mattpocock/skills | MIT | same | Identical |
| `grill-with-docs` | mattpocock/skills | MIT | same | Identical |
| `grill-me` | mattpocock/skills | MIT | same | Identical |
| `teach` | mattpocock/skills | MIT | same | Identical |
| `handoff` | mattpocock/skills | MIT | same | Identical |
| `ponytail` | DietrichGebert/ponytail | MIT | [`licenses/ponytail-LICENSE.txt`](licenses/ponytail-LICENSE.txt) | Modified |
| `frontend-design` | Anthropic | Apache-2.0 | [`frontend-design/LICENSE.txt`](frontend-design/LICENSE.txt) | Upstream text verbatim, plus a marked local overlay and the modification notice Apache-2.0 §4(b) requires |
| `web-design-guidelines` | vercel-labs/web-interface-guidelines | MIT | [`web-design-guidelines/LICENSE.txt`](web-design-guidelines/LICENSE.txt) | Pinned in the skill body; the pattern the others follow |
| `react-best-practices` | vercel-labs/agent-skills | **See below** | None available | Unresolved |
| `writing-great-skills` | **Unidentified** | Unknown | None | Unresolved |
| `ui-accessibility-audit`, `ui-design-tokens`, `ui-responsive-layout`, `ui-visual-composition` | This project | Project-owned | n/a | n/a |

## Unresolved

**`react-best-practices`** — `vercel-labs/agent-skills` has no LICENSE file. Verified directly:
the GitHub license endpoint returns 404, and the repository root contains no license file of any
name. What exists is the bare word "MIT" under a `## License` heading in its README, and a
`license: MIT` line in the skill's own frontmatter. Neither carries a copyright holder, a year, or
the license text, so there is nothing to retain and no grant document to point at. The skill is a
claim of MIT without a formal grant. Resolving this needs a decision — ask upstream, keep it with
this caveat recorded, or drop it — rather than a default.

**`writing-great-skills`** — present locally with no attribution and no match anywhere in
`mattpocock/skills` at the audited revision. Its origin is unestablished. It may be project-owned,
but nothing in the file says so, and absence of evidence is not authorship.

## Refreshing an import

1. Re-run the comparison to see what has diverged:
   `node .agents/skills/check-provenance.mjs`
   It reports each skill as identical to, or differing from, the revision recorded above. It reaches
   the network and is therefore a manual tool, not part of `npm test` — a suite that fails when
   GitHub is unreachable is testing the wrong thing.
2. Replace the upstream portion wholesale rather than merging into it. Where a skill has a local
   overlay, the overlay is below a marked heading precisely so everything above it can be replaced
   without review of the parts that did not change.
3. Update the audited revision in this file, and re-run the comparison so the recorded state is a
   measurement rather than an intention.
4. If the upstream license changed, replace the retained text under `licenses/` too.
