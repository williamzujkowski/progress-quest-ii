# Progress Quest Domain

The canonical language for a deterministic zero-player RPG session and its progression.

## Language

**Session**:
An active character together with progression tracks, counters, pending work, pause state, and deterministic continuation.
_Avoid_: Save, character

**Transition**:
One application of elapsed time and RNG to a session; it may complete zero, one, or several tasks.
_Avoid_: Task completion

**Task**:
Timed work whose duration and current position are measured in milliseconds.
_Avoid_: Action, job

**Progress delta**:
A completed task's duration converted to seconds for progression tracks. Adventure elapsed separately records only whole seconds.

**Experience track**:
A bounded number of seconds toward the next character level.
_Avoid_: XP points

**Quest track**:
A bounded number of seconds toward completing the current quest.

**Plot track**:
A bounded number of seconds toward the next cinematic or Act.

**Encumbrance**:
Derived carried-item quantity, excluding Gold, measured in cubits.
_Avoid_: Persisted weight

**Task count**:
The number of completed tasks in a session.

**Adventure elapsed**:
Accumulated whole seconds from completed tasks.
_Avoid_: Wall-clock time

**Quest target**:
The current quest monster's identity and canonical table position.

**Pending queue**:
Ordered cinematic and plot tasks waiting to become active.

**RNG continuation**:
The exact live Alea state needed to resume deterministic progression.
_Avoid_: Seed

**Save-point RNG**:
The legacy mid-transition Alea snapshot, which may differ from RNG continuation.

**Event**:
An ordered domain fact whose activity text is presentation.
_Avoid_: Log message
