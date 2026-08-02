# Absurdist item-writing research

## Useful patterns

- [Kingdom of Loathing's item documentation](https://www.kingdomofloathing.com/doc.php?topic=items) treats items as mechanically meaningful objects that may be equipped, consumed, combined, or gloriously useless. The useful lesson for ProgQuest is to pair a readable mechanical fact with a joke about the item's social or bureaucratic consequences.
- The [official Universal Paperclips site](https://www.decisionproblem.com/paperclips/) presents a deliberately tiny interface around an escalating premise. Its restraint is instructive: repeat a simple vocabulary, then let the implication become increasingly ridiculous instead of explaining the joke to death.
- [Zombo.com](https://www.zombo.com/) is an early-web absurdist reference built around an exaggerated promise and almost no practical payoff. The lesson is commitment to tone: a short, confident sentence can be funnier than a paragraph of lore.

## ProgQuest writing contract

Descriptions are deterministic: the same item name and context always produce the same text, so saves and screenshots do not randomly rewrite history. Each description is assembled from a small set of context-specific leads and closers selected by a stable name hash. This gives variety without runtime randomness, external services, or procedural prose that could contradict the game state.

The mechanics line remains separate and authoritative. Flavor may accuse an orb of tax fraud; it may not claim the orb deals 17 damage when the engine only knows that loot contributes to encumbrance.
