# Persist plot sequences with character sheets

Store the bounded pending prologue or cinematic Sequence queue as an optional,
strictly validated part of the character sheet. Exceptionally long nemesis loops
use a compact replay cursor containing their next round and replay entropy, so
high Acts retain canonical narration without unbounded synchronous preparation or an
unbounded saved array. This keeps PQW, roster, and active
checkpoint resumes internally consistent; checkpoint-only storage would preserve
the current Task while silently discarding its continuation, and embedding the
continuation inside Task would hide the same serialization change behind recursive
state. Existing saves remain readable because absence means no queue, while older
strict builds cannot read newer saves captured mid-sequence; the unanimous #150
serialization vote accepted that limited one-way compatibility cost.
