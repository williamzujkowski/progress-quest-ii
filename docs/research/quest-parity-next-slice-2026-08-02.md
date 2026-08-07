# Quest parity next slice — 2026-08-02

## Recommendation

Add a deterministic, test-only quest-completion fixture for the existing legacy oracle before changing the production transition. The smallest useful vector is the current `quest-completion.json`: an active quest completes, the legacy reward is selected, quest history is checked/capped, the quest bar resets with `50 + Random(100)`, and the next quest is generated with exact RNG ordering.

## Evidence

- `pq-web-src/main.js:666-726` defines `CompleteQuest`: reset bar, log/check prior quests, choose one of four rewards, trim history before push to a maximum of 100 entries, clear the target, generate one of five quest kinds, append/log the new quest, and save.
- `src/__tests__/fixtures/goldens/quest-completion.json` records the canonical Exterminate vector: max `138`, next target `Swamp Elf|1|lilypad`, spell reward `Rabbit Punch I`, and final RNG state.
- Current `src/state/gameStore.ts` resets quest max with synthetic `floor(max * 1.2) + 1`, always grants a spell, and stores no quest history or target metadata.

## Scope decision

The first implementation should remain at the test seam. Production quest metadata, the remaining four quest kinds, equipment/stat/item rewards, act transitions, save-point RNG, and the pure transition seam remain separate follow-up slices under issue #39 / #42 / #43.

## Review outcome

Three Codex reviewers supported this bounded sequence. Nexus consensus reproduced the exhausted Claude adapter stop-sequence failure; the fallback decision is recorded in the task notes and the adapter failure remains tracked upstream in nexus-agents issue #4351.
