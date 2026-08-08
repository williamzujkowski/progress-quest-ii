# Browser LLM bake-off

Desk research, 2026-08-07. No model was downloaded and no inference was run.

Every byte count below is read from the Hugging Face API's `siblings[].size` field at a pinned
revision, not estimated. Every licence claim is from the licence text on the artifact repo itself,
not from the upstream architecture. Quality and latency are **not** verifiable this way and are
labelled where they appear.

This supersedes nothing in `in-browser-tiny-llm-chat-2026-08-04.md`; it extends it with current
figures and reaches the same conclusion by a wider route.

## The result, before the detail

The bake-off has a structural answer that arrives before any quality measurement:

- The cheapest credible artifact is **~120 MB**; the recommended one is **~258 MB**; the "1.7B
  ternary" option is **~480–515 MB**. Add 13–24 MB of ONNX Runtime WASM per browser.
- **Liquid AI's own card for LFM2.5-230M says the model "is not recommended for reasoning-heavy
  workloads such as advanced math, code generation, or creative writing."** That is the vendor
  disclaiming, in writing, the job being scoped here.
- **The Bonsai 1.7B ONNX artifact has no model card, no `LICENSE`, and no licence tag** — only
  `onnx` and `qwen3`. It is an undeclared third-party conversion.
- On a weighted scorecard the deterministic template path scores **4.65** against the best model's
  **3.35**, and wins on every criterion except raw novelty.

The recommendation is therefore **not** a model. It is: expand the phrase bank, and treat any model
as an opt-in curiosity that ships only if a blind comparison against that expanded bank shows a
margin a reader would call obvious.

## Candidates

Cold download assumes what Transformers.js actually fetches: `config.json`,
`generation_config.json`, `tokenizer.json`, `tokenizer_config.json`, `chat_template.jinja` where
present, the selected `model_<dtype>.onnx`, and its external-data files.

| Artifact @ dtype | Cold download | Params | Ctx | Licence on the bytes |
|---|---|---|---|---|
| `LiquidAI/LFM2.5-350M-ONNX` @ `q4f16` | **258.5 MB** | 350M | 32,768 | LFM Open License v1.0 |
| `LiquidAI/LFM2.5-230M-ONNX` @ `q4` | 216.0 MB | 230M | 32,768 | LFM Open License v1.0 |
| `onnx-community/Ternary-Bonsai-1.7B-ONNX` @ `q2f16` | 479.5 MB | 1.72B | 32,768 | **none declared** |
| `onnx-community/Qwen3-0.6B-ONNX` @ `q4f16` | 578.9 MB | 0.6B | 32,768+ | **no tag** |
| `onnx-community/gemma-3-270m-it-ONNX` @ `q4f16` | 293.3 MB | 270M | — | Gemma Terms of Use |
| `HuggingFaceTB/SmolLM2-135M-Instruct` @ `q4f16` | **119.8 MB** | 135M | 8,192 | **Apache-2.0, first-party** |
| ONNX Runtime WASM (added to all) | 23.6 MB / 13.0 MB Safari | — | — | MIT |

Pinned revisions: LFM2.5-350M-ONNX `d11593fd`, LFM2.5-230M-ONNX `c6f46e4e`, Ternary-Bonsai-ONNX
`8beb5ca7`, Qwen3-0.6B-ONNX `da145310`, gemma-3-270m-it-ONNX `2dbbfdb1`, SmolLM2-135M-Instruct
`12fd25f7`.

### Notes that changed the ranking

**The ternary advantage does not survive ONNX.** ONNX has no ternary weight storage, so Bonsai's
1.58-bit story lands at 479 MB of weights — 1.9× the LFM2.5-350M artifact and 4× SmolLM2-135M. The
compression that makes Bonsai interesting under llama.cpp is simply absent here. Its 151,669-token
vocabulary also puts `tokenizer.json` alone at 9.1 MB.

**Gemma 3 270M is larger than LFM2.5-350M despite fewer parameters**, because its 262k vocabulary
makes `tokenizer.json` 20.3 MB. `google/gemma-3-270m-it` is also `gated: manual`, so a browser
cannot fetch the first-party repo anonymously and the path depends on a mirror redistributing a
gated model.

**`onnx-community/LFM2.5-350M-ONNX` is a byte-identical mirror of the LiquidAI export that drops
the `LICENSE` file.** Use the `LiquidAI/` repo.

**The LFM2.5 ONNX exports are not tracking their base checkpoints.** Base repos updated
2026-08-04/05; exports date from 2026-03-31 and 2026-06-24, and the 350M export ships a 3,297,793 B
`tokenizer.json` against the base repo's 4,733,389 B. Whether that difference is material is
unverified.

## Licensing

### LFM2.5 — a revenue threshold

> **5. Commercial Use Limitation.** (a) The rights granted under this License for Commercial Use
> are conditioned upon You or Your Legal Entity not exceeding the Threshold. (b) Any Commercial Use
> of the Work or a Derivative Work by a Legal Entity that exceeds the Threshold is not licensed
> under this Agreement.

with `"Threshold"` defined as annual revenue of $10,000,000 or more. Redistribution is permitted
but conditioned (§4): licence copy to recipients, modified files marked, notices retained. §11
terminates automatically on breach.

This project is MIT and non-commercial, so §5 is satisfied today. But the point of a public repo is
that people fork it: shipping these bytes means the repo is MIT except for a 258 MB blob that is
not, and a fork run by any entity over the threshold is unlicensed for it. Survivable with a
separate `MODEL-LICENSE`, a `NOTICE`, and an explicit README statement — but a deliberate decision,
not a footnote.

### Bonsai 1.7B ONNX — the disqualifier

Upstream `prism-ml/Ternary-Bonsai-1.7B-gguf` is Apache-2.0 with a `NOTICE.txt`. The artifact the
browser downloads is a different repo, and it declares nothing: no `LICENSE`, no README,
`cardData` is `{}`, tags are `['onnx','qwen3','region:us']`. The chain from Prism ML's Apache-2.0
weights to these specific `.onnx_data` bytes is undocumented — no conversion script, no base-model
link, no commit message.

Calling this "Apache" because the upstream GGUF is Apache is precisely the error to avoid.
Redistributing 500 MB of undeclared third-party bytes from an MIT repo is not defensible.

### Gemma — field-of-use plus enforceable flow-down

> **3.1** …you must include the use restrictions referenced in Section 3.2 as an enforceable
> provision in any agreement governing the use and/or distribution of Gemma or Model Derivatives…

Plus a reserved right for Google to "restrict (remotely or otherwise) usage". Incompatible with an
MIT repo's posture without a prominent carve-out. Ruled out.

### SmolLM2-135M-Instruct — clean

Apache-2.0, with the ONNX weights published in the **same first-party repo as the licence**. No
threshold, no field-of-use clause, no provenance gap, no gating. The only candidate with an
uncomplicated licence story.

## Runtime

`@huggingface/transformers` 4.2.0 (Apache-2.0) against `onnxruntime-web` 1.27.0 (MIT).
Transformers.js pins a *dev* build of ORT Web — normal for the project, worth recording as a
supply-chain fact.

**Transformers.js wins.** Going direct to ORT Web costs the tokenizer, the Jinja chat template,
KV-cache plumbing, external-data assembly, progress reporting, and caching — all of which
Transformers.js already ships, and ORT Web does not. ORT Web direct is right only for an ONNX graph
Transformers.js cannot model, which is not this.

### The worker architecture is forced

ONNX Runtime's own documentation:

> The proxy worker cannot work with WebGPU EP. This is because a GPU buffer is not transferable.

> The proxy worker cannot work in a Content Security Policy (CSP) restricted environment. This is
> because the proxy worker uses `Blob` to create a Web Worker, and the CSP may block the creation
> of the Web Worker.

**Both limits bite here.** This project ships `worker-src 'self'`, which forbids `blob:` workers, so
the proxy worker is blocked even on the WASM path. The supported shape is a same-origin module
worker we create ourselves and load the runtime inside — which is what Transformers.js assumes
(`ONNX_ENV.wasm.proxy = false`, commented "not necessary when using WebGPU") and what Hugging Face's
own WebGPU demo Spaces do.

### Caching

Transformers.js caches to the **Cache API** (`caches.open(env.cacheKey)`, default
`'transformers-cache'`), and deliberately swallows a cache-open failure and continues — good
failure behaviour for us. ORT Web has **no native caching at all**; its docs recommend building one
over IndexedDB.

Our `activate` handler deletes only `progress-quest-ii-shell-*`, so a `transformers-cache` entry
survives deploys (no re-download per release) and is never collected by the app — meaning a
user-facing "remove model" control would be required, not optional.

## The service-worker hazard, verified locally

`scripts/generate-service-worker.mjs:40-42` walks all of `dist/` and filters only `sw.js`, `.map`,
and unrenderable font subsets. **Anything else placed in `dist/` is precached.** And
`public/sw.js:17-24` uses `cache.addAll`, which is all-or-nothing, inside a `try` that does
`await caches.delete(CACHE_NAME); throw error;`.

So a single failed model chunk would delete the entire shell cache and fail the install — turning a
model download failure into a total offline-startup failure. Self-hosting a model **requires** an
explicit exclusion in `generate-service-worker.mjs`, and exclusion from `contentBuildId` too.

Fetching cross-origin avoids this entirely: the `fetch` handler bails on
`url.origin !== SCOPE_URL.origin`, so a Hugging Face request never reaches the service worker.

## Network boundary and CSP

Current policy: `default-src 'none'; script-src 'self'; … connect-src 'self'; worker-src 'self'`.

**Weight files redirect off-origin.** `huggingface.co/…/resolve/<sha>/onnx/model_q4.onnx_data`
→ `302` → `https://us.aws.cdn.hf.co/xet-bridge-us/<hash>?…`. CORS works from GitHub Pages — no proxy
needed — but the CDN host set cannot be narrowly pinned. Hugging Face documents nine hostnames and
then says:

> These hostnames may change as our storage and CDN infrastructure evolves.

and notes that `*.xethub.hf.co` does not cover the EU hosts and `*.cdn.hf.co` does not cover the
two-label `us.aws.cdn.hf.co`. So the narrowest CDN policy is an enumeration the vendor expects to
break, failing as a CSP violation rather than a network error.

**A second origin is easy to miss.** Transformers.js `src/backends/onnx.js` defaults
`wasmPaths` to `https://cdn.jsdelivr.net/npm/onnxruntime-web@<version>/dist/` — so out of the box it
fetches a 23.6 MB WASM binary from jsDelivr, pinned to an unstable dev version string.

**Do this regardless of the model decision:** copy the four ORT `dist` files into `dist/` and set
`env.backends.onnx.wasm.wasmPaths` to a same-origin path. ORT Web is MIT, so there is no licence
friction; it removes `cdn.jsdelivr.net` from the policy and pins the exact bytes.

### Self-hosting the model

| Limit | Value |
|---|---|
| Git push hard block | 100 MiB per file |
| **Git LFS with Pages** | **cannot be used** |
| Published Pages site | ≤ 1 GB |
| Pages bandwidth | 100 GB/month **soft** limit |
| Pages deploy timeout | 10 minutes |

Committing the model is out — every candidate exceeds the hard block and LFS is unusable with
Pages. But `deploy.yml` already uses a custom workflow with `upload-pages-artifact` on `./dist`, so
a build step can fetch the model at build time, pinned by revision SHA and verified by hash, with
nothing large in git.

At 258 MB the bandwidth soft limit is roughly 386 first-loads per month, and the failure mode is
GitHub declining to serve **the whole site**. A GitHub Release asset is the documented escape hatch.

## Scorecard

Brief's weights, with one stated adjustment: **factual/mechanics safety is a property of the
harness, not the model.** Output is validated for word cap, speaker, channel, mechanics and control
characters, with deterministic fallback on any failure — so an unsafe generation degrades to a
template, not to a wrong game state. Only validator pass rate is model-dependent, and that is
unmeasured. The reader should know that 20% of this table carries almost no discriminating signal.

**Bold** = measured. *Italic* = inferred from measured facts. Plain = unverified placeholder.

| Criterion | Wt | LFM2.5-350M | SmolLM2-135M | Bonsai 1.7B | Qwen3-0.6B | Gemma3-270M | Templates |
|---|---|---|---|---|---|---|---|
| Output quality | 30% | 3 | 2 | 4 | 4 | 3 | *4* |
| Mechanics safety | 20% | *4* | *3* | *4* | *4* | *4* | **5** |
| Download size | 15% | **3** | **4** | **1** | **1** | **2** | **5** |
| Latency | 10% | 4 | 5 | 2 | 3 | 4 | **5** |
| Memory / device | 10% | *3* | *4* | *1* | *2* | *3* | **5** |
| Licence & provenance | 10% | **3** | **5** | **1** | **2** | **1** | **5** |
| Integration | 5% | **3** | **4** | **3** | **4** | **3** | **5** |
| **Total** | | **3.35** | **3.35** | **2.75** | **2.95** | **2.85** | **4.65** |

LFM2.5-350M and SmolLM2-135M tie by opposite routes — 350M buys quality with size and a licence
threshold; 135M buys size and a clean licence with quality. **The tie is decided entirely by the one
number that is unverified.**

**If a model ships: LFM2.5-350M-ONNX @ `q4f16`.** Chosen over the 230M because the 230M is
dominated — it saves 42 MB while being the model whose card disclaims creative writing, it is
distilled *from* the 350M, and it has no `q4f16` build. Chosen over Bonsai decisively: the ternary
advantage evaporates in ONNX, and the artifact has no licence.

**Runner-up: SmolLM2-135M-Instruct @ `q4f16`, and it lost on output quality alone** — the heaviest
axis at 30%. On every other criterion it beats the winner: 54% smaller, single-file weight with no
external-data plumbing, Apache-2.0 first-party with no threshold, 1.86M downloads of ecosystem
validation. It is a 2024-vintage 135M model against a 2026 350M trained on 28T tokens.

**Run SmolLM2 first, not second.** It is the cheaper experiment, and its success would let the
project skip the LFM licence question entirely.

## The case against any model

This is the strongest finding here, and the evidence points at it.

**The vendors say so.** LFM2.5-230M: "not recommended for … creative writing". LFM2.5-350M:
"We recommend using it for data extraction, structured outputs, and tool use." Both cards steer
toward structured extraction and away from generative prose.

**The price is extreme.** 258 MB of model plus 23.6 MB of WASM to emit one sentence of six to
sixteen words — roughly 20 MB per word of first output. An authored phrase bank with a seeded
combinatorial grammar costs single-digit kilobytes and yields effectively unbounded variety.

**The safety filter converges on being a grammar.** To make output shippable you must enforce a word
cap, persona voice, channel and speaker consistency, no leaked mechanics, no lore contradictions, no
control or bidi characters. A filter strict enough to *guarantee* those properties is structurally
close to a template grammar — at which point 258 MB has been paid to sample from a constrained space
already defined by hand.

**Every failure mode is asymmetric.** A template is deterministic and unit-testable, which is this
repo's whole disposition. A model adds a consent flow, download progress, cancellation, storage
reporting, a removal control, cache-eviction handling, a WebGPU-absent path (Firefox on Linux has
none; Firefox Android has none at all), a WASM slow path, a timeout, and an output validator — all
to sometimes produce a slightly fresher sentence.

**The measured baseline points the same way.** The chatter system has 87 line templates and
exhausts its distinct output in about six minutes of play. Expanding that bank is the cheap fix for
the problem actually observed.

## Unverified, and how to close each gap

| Gap | Why desk research cannot close it | How to close it |
|---|---|---|
| **Output quality for this exact task** (the 30% criterion) | No public benchmark measures "6–16 word in-character chat line from bounded facts". MMLU/GSM8K/IFEval are irrelevant. | Blind A/B: ~200 generations per candidate against an expanded phrase bank, scored by someone who does not know the source. This decides the bake-off. |
| Validator pass rate | Needs the real filter against real output. | Same spike; log accept/reject and reason. Below ~80% accept is a template with extra steps. |
| Latency (TTFT, tok/s at a 24-token cap) | Cannot run inference. Liquid's cited 213 tok/s figures are llama.cpp-class, not ORT-Web/WebGPU, and do not transfer. | Measure on desktop discrete GPU, desktop integrated, Safari 26, mid-range Android. Cold vs warm. |
| Loaded memory | Weight bytes are a floor; KV cache, ORT arena and WebGPU buffers are unmeasured. | `performance.measureUserAgentSpecificMemory()` during the spike. Watch 4 GB Android. |
| 2-bit `MatMulNBits` support in ORT Web's WebGPU EP | Inferred from the artifact's `"dtype": "q2"` default and HF's Space; never confirmed in ORT docs. | Moot while Bonsai is rejected on licence. |
| Bonsai ONNX provenance | No README, no `LICENSE`, no `base_model` link. | Open an issue on the conversion repo. Until answered, treat as unlicensed. |
| LFM2.5 export drift | Exports predate the base checkpoints and tokenizer sizes differ. | Diff tokenizer/config at the pinned SHAs; ask Liquid AI. Pin the export SHA regardless. |
| HF CDN host stability | Vendor documents the list and then warns it will change. | Do not rely on it — self-host, or add a CSP-violation reporter so a change surfaces as a signal. |
| Whether a ~280 MB Pages artifact survives the 10-minute deploy timeout | Depends on runner throughput. | Trial deploy with a dummy 260 MB file in `dist/`. |
| Real WebGPU availability across the player base | MDN gives the shape; population mix is unknown. Blog-sourced global percentages were found and **excluded as untrustworthy**. | Assume the WASM path must be viable and measure its latency. |

Deliberately excluded as inadequate evidence: all blog-sourced WebGPU support percentages, and all
leaderboard-derived quality claims.
