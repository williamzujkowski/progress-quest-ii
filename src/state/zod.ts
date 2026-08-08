import { z } from 'zod';

/**
 * The only Zod this application builds schemas with, configured before it can be used.
 *
 * Zod probes for `eval` support by calling `new Function('')` and catching the failure. Under
 * `script-src 'self'` the browser refuses it, which Zod handles correctly — it falls back to the
 * interpreted path and validation is unaffected. But the refusal is still a real
 * `securitypolicyviolation`, fired on every page load of the deployed site.
 *
 * That matters less for what it breaks than for what it invites. The first person to notice is a
 * developer opening the Issues panel in dev tools and being handed `'unsafe-eval'` as the apparent
 * fix — exactly the pressure the comment atop `scripts/production-csp.mjs` was written to resist.
 * Cheaper never to make the call. Zod's own source names this case: its probe is skipped under
 * `jitless` because strict policies report the caught `new Function` even though the throw is
 * swallowed.
 *
 * A module rather than a line in the entry point, because the configuration has to happen before
 * the first schema is *constructed*, and six modules here construct schemas at import time. Which
 * of them the bundler evaluates first is not something to depend on — setting the flag in
 * `schemas.ts` looked correct and left the violation in place, because a ledger schema had already
 * been built. Importing `z` from here makes the ordering a property of the import graph instead of
 * a thing to remember.
 */
z.config({ jitless: true });

export { z };
