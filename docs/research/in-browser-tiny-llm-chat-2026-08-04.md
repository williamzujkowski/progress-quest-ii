# Tiny in-browser language model for simulated chat

Date: 2026-08-04  
Issue: #175  
Status: research only; deterministic chat in #153 remains the required implementation and fallback.

## Recommendation

After #153 and #159 are complete, run a throwaway, opt-in spike with a lazy-loaded
Transformers.js worker and SmolLM2-135M-Instruct. Do not place the runtime or model
in the default production bundle or service-worker precache.

Transformers.js is the best first runtime to measure because its documented
browser path supports CPU/WASM by default and optional WebGPU acceleration. The
SmolLM2-135M-Instruct ONNX repository publishes an Apache-2.0 model and a roughly
117 MB q4f16 weight. That is small only by language-model standards, so consent,
download progress, cancellation, removal, storage reporting, and a no-download
default are product requirements rather than polish.

The model card expressly warns that output can be inaccurate, inconsistent, or
biased. The model may therefore vary wording only after a typed deterministic
social intent is already valid. It gets no authority over events, state, saves,
RNG, speakers, channels, or mechanical facts. Any absence, timeout, invalid
output, resource pressure, cache eviction, or unsupported browser returns the
authored line byte-for-byte.

## Shortlist

| Option | Evidence-backed advantage | Material drawback | Verdict |
| --- | --- | --- | --- |
| Transformers.js + SmolLM2-135M-Instruct | One documented API can use WASM/CPU or WebGPU; Apache-2.0 runtime/model; first-party ONNX weights | About 117 MB for one q4f16 weight before tokenizer/config/runtime; modest model quality | Preferred spike |
| wllama + SmolLM2 GGUF | Worker-oriented WebGPU/WASM runtime and approximately 105 MB Q4_K_M model | Current documentation excludes Safari due to Memory64; multithreading needs COOP/COEP headers, awkward on static Pages | Measure only if the preferred spike fails |
| WebLLM | Polished worker and browser-cache support | WebGPU-only, so it cannot be the broad fallback path | Do not lead |
| Chrome Prompt API | Browser manages Gemini Nano | Chrome-specific and preview-oriented rather than a portable PWA contract | Optional future adapter only |

## Delivery and safety gates

- Require explicit opt-in before fetching model bytes. Show exact estimated
  download/storage, progress, cancel, readiness, and remove-model controls.
- Pin runtime version, immutable model revision, artifact size, SHA-256, and
  license. Keep the model cache versioned and separate from the PWA shell.
- Lazy-import the runtime and perform inference in a dedicated same-origin
  worker. Do not weaken CSP broadly to accommodate a runtime.
- Send only reviewed typed social intent, persona constraints, and authored
  fallback. Never send saves, DOM, Activity prose, arbitrary transcript history,
  or mutable state.
- Treat model output as hostile plain text: abortable timeout, token/code-point
  caps, control and bidirectional-character removal, and rejection of changed
  speaker, channel, source facts, mechanics, or truth disclosure.
- Keep chat aria-live off. Download status may be announced after a user action;
  streamed tokens must not steal focus or move a reader's scroll position.
- CI uses a deterministic fake adapter and never downloads a model.

## Ship/no-ship proof

The spike must compare the model blindly against expanded authored templates for
variety, persona consistency, event grounding, humor, repetition, unsafe text,
payload, peak memory, first-token time, sustained generation, thermal impact, and
mobile support. If it does not materially improve the experience after its
117+ MB cost and failure surface, do not ship it. A seeded phrase-bank expansion
is the default cheaper competitor.

## Primary sources

- [Transformers.js documentation](https://huggingface.co/docs/transformers.js/main/index)
- [Transformers.js WebGPU guide](https://huggingface.co/docs/transformers.js/guides/webgpu)
- [Transformers.js cache/environment API](https://huggingface.co/docs/transformers.js/api/env)
- [SmolLM2-135M-Instruct model card](https://huggingface.co/HuggingFaceTB/SmolLM2-135M)
- [SmolLM2-135M-Instruct first-party ONNX files and license](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct/tree/83212e1e2b3cfd6958f3707877bb878945dea8ee/onnx)
- [SmolLM2 q4f16 ONNX artifact](https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX/blob/main/onnx/model_q4f16.onnx)
- [wllama package and browser constraints](https://www.npmjs.com/package/@wllama/wllama)
- [WebLLM repository](https://github.com/mlc-ai/web-llm)
- [Chrome Prompt API documentation](https://developer.chrome.com/docs/ai/prompt-api)
- [ONNX Runtime Web deployment guidance](https://onnxruntime.ai/docs/tutorials/web/deploy.html)
