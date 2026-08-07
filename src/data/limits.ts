// ponytail: engine transitions and persistence validation share one finite compatibility envelope.
export const MAX_PERSISTED_VALUE = 1_000_000_000;
export const MAX_PERSISTED_GOLD = 1_000_000_000_000;
export const MAX_PERSISTED_ITEMS = 5_000;
export const MAX_PERSISTED_DESCRIPTION_LENGTH = 1_000;
export const MAX_PENDING_TASKS = 100;
export const MAX_WORLD_NOTICES = 40;
// Three-line scenes divide evenly; whole-scene retention may use slightly less.
export const MAX_SOCIAL_ENTRIES = 48;
// ponytail: about 11.5 days is ample scheduler debt; saturation keeps checkpoints finite and catch-up work bounded.
export const MAX_PENDING_ELAPSED_MS = 1_000_000_000;

/**
 * The most any single stored payload may be before it is refused unparsed.
 *
 * Shared by every reader of local storage rather than owned by one of them. The cap exists to
 * bound work, not to describe a schema: JSON.parse on a hostile blob is the expensive step, and
 * it happens before any validation can reject the contents. Deliberately far above a legitimate
 * payload, since being generous costs nothing and being tight would reject a save the schema
 * would have accepted.
 */
export const MAX_STORED_PAYLOAD_LENGTH = 1_000_000;

/**
 * How long the checkpoint scheduler waits before flushing a dirty session to storage.
 *
 * Lives here rather than as a literal default argument because the end-to-end suite has to
 * outwait it to prove a checkpoint was *not* written. A test that hard-codes its own copy of
 * this number stops proving anything the moment the interval is raised: the wait finishes
 * before the flush would have happened, and the absence it asserts is its own impatience.
 */
export const DEFAULT_CHECKPOINT_INTERVAL_MS = 1_000;
