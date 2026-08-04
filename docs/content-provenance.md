# Content provenance and license boundaries

Last audited: 2026-08-04. This is a conservative engineering inventory, not legal advice.

## Practical boundary

The root MIT license applies only where William Zujkowski or another contributor has authority to grant it. It does not convert third-party material, inherited Progress Quest expression, fonts, dependencies, or the legacy submodule to MIT.

Do not import code, prose, data, screenshots, art, or assets from unofficial Progress Quest sequels. High-level ideas may be independently designed, but implementations must be grounded in this repository's specifications and the separately retained canonical baseline.

## Material inventory

| Material | Location | Origin/evidence | Status |
| --- | --- | --- | --- |
| Modern application implementation | `src/components/`, `src/state/`, modern portions of `src/engine/`, `src/App.*`, `src/index.css`, `src/main.tsx`, `src/pwa.ts`, scripts and configuration | Project commit history; authored for this repository | Root MIT applies only to contributor-owned original expression. |
| Alea deterministic PRNG | `src/engine/prng.ts` | TypeScript adaptation of Johannes Baagøe's Alea/Mash algorithm | MIT, copyright 2010 Johannes Baagøe; notice retained in source and the deployed notices file. |
| Project documentation and tests | `README.md`, `AGENTS.md`, `.agents/`, `docs/`, `e2e/`, `e2e-pwa/`, `src/__tests__/` | Project commit history and cited research sources | Project-owned original expression is MIT; quotations and linked third-party material retain source rights. |
| Classic game data, vocabulary, flavor text, and fidelity implementation | Primarily `src/data/traits.ts`, plus fidelity-sensitive strings and algorithms in `src/engine/` and tests | Ported or independently reimplemented against `pq-web-src/`; fidelity tests intentionally preserve the baseline | Progress Quest-derived expression and implementation. Do not assume the root MIT notice alone grants reuse rights. See “Progress Quest evidence” below. |
| Legacy web reference | `pq-web-src/` git submodule at commit `3e9431b38cb54647530197501a29b8cce6c9f4f4` from `https://bitbucket.org/grumdrig/pq-web.git` | Eric Fredricksen's JavaScript web port; `main.js` and `newguy.js` contain all-rights-reserved headers | Read-only test oracle, not part of the production bundle. Repository-level permission for the web port is not explicit; retain separately and do not copy its assets into the modern UI. |
| Original Progress Quest license evidence | Official `https://progressquest.com/dl.php` links `https://progressquest.com/license.txt` and says the agreement applies before downloading any version | MIT-style grant, copyright 2002–2004 Eric Fredricksen | Strong evidence of permissive terms for Progress Quest, but the project has not established whether it supersedes the later web-port headers. Owner confirmation or qualified legal review remains required before representing the ambiguity as resolved. |
| Runtime libraries and themes | Direct production dependencies in `package.json`; exact versions/integrity in `package-lock.json` | Upstream packages | MIT, ISC, and package-specific terms; see `public/THIRD_PARTY_NOTICES.txt`. The two iTerm-derived theme records lack individual author/license evidence and remain tracked by #180. |
| Bundled webfonts | Production WOFF2 files built from `@fontsource-variable/inter` and `@fontsource-variable/jetbrains-mono` | Fontsource packages 5.3.0; package metadata and license files | SIL Open Font License 1.1. Copyright and license text are retained in `public/THIRD_PARTY_NOTICES.txt`, which ships with the PWA shell. |
| Modern static assets | `public/favicon.svg`, `public/icons.svg`, `src/assets/hero.png` | Byte-identical Vite starter assets; Vite is MIT, copyright VoidZero Inc. and contributors. The PWA PNGs visibly derive from the same Vite mark but have no recorded generator. | Vite notice is retained, but it does not settle the social-service marks embedded in the unused sprite or trademark use of the Vite mark as app identity. Removal/replacement is tracked by #177. |
| Generated production files | `public/sw.js` template and ignored `dist/` outputs | Project-authored service-worker template; `scripts/generate-service-worker.mjs` materializes `dist/sw.js` from the production artifact set | Generated files inherit the applicable terms of their inputs. The tracked `public/sw.js` template is not itself generated or replaced. |
| Developer and test tooling | Direct dev dependencies in `package.json`, workflows, Nexus config, Playwright browsers downloaded outside Git | Upstream packages and project configuration | Not shipped as application runtime code. Direct license identifiers are inventoried below; transitive versions and declared licenses remain locked in `package-lock.json`. |
| Imported agent guidance | Selected files under `.agents/skills/` | Ponytail, Vercel, Anthropic, Matt Pocock, and other upstream or adapted guidance identified in skill metadata and AGENTS.md | Vercel web guidance includes its pinned source and MIT text. Complete revision/license records for the other imports are tracked by #179; the Anthropic frontend-design content refresh is also tracked by #128. |

The legacy submodule also contains separately attributed jQuery, JSON2, and V8
shell code plus binary art. Those inputs remain inside the development-only
submodule under their own headers or unresolved provenance; they are not
copied into the Pages bundle.

## Direct dependency inventory

Production dependencies at the audit commit:

| Package | Version | Declared license |
| --- | ---: | --- |
| `@fontsource-variable/inter` | 5.3.0 | OFL-1.1 |
| `@fontsource-variable/jetbrains-mono` | 5.3.0 | OFL-1.1 |
| `@williamzujkowski/oklch-terminal-themes` | 0.7.0 | MIT |
| `lucide-react` | 1.28.0 | ISC, with upstream Feather-derived icons under MIT |
| `react`, `react-dom` (and bundled `scheduler`) | 19.2.8 (scheduler 0.27.0) | MIT |
| `zod` | 4.4.3 | MIT |
| `zustand` | 5.0.14 | MIT |

Direct development dependencies declare MIT except: `@axe-core/playwright` (MPL-2.0), `@playwright/test` (Apache-2.0), `typescript` (Apache-2.0), and the runtime packages listed above when reused by tests. Exact versions and the declarations for every transitive package are recorded in `package-lock.json`; a package declaration is evidence to review, not a substitute for its license text.

The installed terminal-theme package also declares `apca-w3` and `culori` as
runtime dependencies. The audited production bundle contains no APCA or
`colorparsley` identifiers, consistent with tree-shaking from the `COLOR_KEYS`
import, but absence from one minified bundle is not a durable package boundary.
Upstream cleanup is tracked by
`williamzujkowski/oklch-terminal-themes#169`; downstream adoption and bundle
proof are tracked by #178.

The iTerm2-Color-Schemes collection license says each individual theme retains
its author's copyright and license. The imported Green Phosphor CRT and Keys
Ocean Sunset HC records do not identify those individual terms. #180 tracks
either establishing that evidence or replacing the schemes with native themes.

## Known non-import sources

- DragonII's Progress Quest 2 v1.02: no source license or reusable asset grant found. Do not copy its executable, resources, screenshots, prose, or data.
- `nbollom/pq2`: GPL-3.0 repository. No code or assets have been imported; importing covered code would be incompatible with representing the combined application as MIT-only.
- Games, comedy, MMO communities, and other projects cited under `docs/research/`: inspiration and factual research only. Do not copy distinctive prose, character names, lore, assets, layouts, or joke structures.

See `docs/research/progress-quest-2-lineage-features-licenses-2026-08-03.md` for the evidence review.

## Contribution rules

1. Record the origin and license of every new code, data, prose, font, image, audio, model, and generated-content source before merging it.
2. Prefer project-owned original expression and already-approved dependencies. A public URL or “free” download is not a reuse grant.
3. Keep externally derived mechanics at the level of independently implemented ideas; do not translate, paraphrase too closely, trace, or extract protected expression.
4. Preserve required notices and immutable source/version references. If evidence is missing or conflicting, fail closed and open an issue.
5. AI assistance does not establish provenance. Prompts, outputs, and reviews must not request living-creator imitation, protected characters/settings/catchphrases, donor code, or unlicensed assets.
6. Permission or legal-review records should identify the material, rightsholder, scope, date, and durable evidence location without publishing private contact information.

## Unresolved decision

Before #143 can be considered fully complete, obtain written owner confirmation or qualified legal review addressing whether the official Progress Quest license covers the JavaScript web port and the Progress Quest-derived tables, prose, and behavior retained here. Until then, this inventory describes the ambiguity; it does not waive it.
