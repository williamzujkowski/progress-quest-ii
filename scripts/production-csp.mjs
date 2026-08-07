/**
 * The shipped Content Security Policy, asserted against the built HTML.
 *
 * GitHub Pages cannot set response headers, so the `<meta http-equiv>` tag in index.html is not a
 * defence-in-depth extra — it is the application's entire XSS boundary. Everything else in
 * verify-production-build.mjs is checked at build time; this was not, which meant the one control
 * that cannot be restored by configuration was also the one nothing was watching (#311).
 *
 * The failure this exists to catch is mundane rather than adversarial: someone adds a conventional
 * inline no-flash `<script>` block — a completely natural thing to reach for, and precisely why
 * this project generates `theme-boot.js` as a real file instead. The build succeeds, the policy
 * silently stops being satisfiable, and the repair that presents itself is adding `unsafe-inline`
 * to script-src. That turns a working guard into a decorative one in a single plausible commit.
 */

/**
 * Directives that must be present and exactly `'none'`.
 *
 * `default-src` is the fail-closed base every unlisted fetch falls back to. `object-src` closes
 * plugin embedding, which `default-src` covers today but would stop covering the moment someone
 * adds a directive that shadows it. `base-uri` is not covered by `default-src` at all: without it,
 * an injected `<base>` re-points every relative URL in the document, including the module script.
 */
const REQUIRED_NONE = ['default-src', 'object-src', 'base-uri'];

/**
 * Parses a policy into directive name -> source list.
 *
 * Directive names are case-insensitive per the CSP grammar and are lowercased here; source
 * expressions are not, because host and scheme sources can be case-sensitive in practice. A
 * repeated directive keeps its first occurrence, which is what browsers do — later duplicates are
 * ignored rather than merged, so reading them the same way keeps this honest about what ships.
 */
export function parseCsp(policy) {
  const directives = new Map();
  for (const segment of policy.split(';')) {
    const [name, ...sources] = segment.trim().split(/\s+/).filter(Boolean);
    if (!name) continue;
    const lowered = name.toLowerCase();
    if (!directives.has(lowered)) directives.set(lowered, sources);
  }
  return directives;
}

/**
 * Pulls the policy text out of the built HTML.
 *
 * Written as "find the meta tag, then read its content attribute" rather than one regex across
 * both, because the attribute order and the line breaks between attributes are formatting the
 * build is free to change. `[^>]` spans newlines, so this reads the pretty-printed output Vite
 * currently emits and a minified single-line tag identically.
 *
 * The delimiter is captured and back-referenced rather than matched as "either quote character".
 * A policy is *full* of single quotes — `'none'`, `'self'` — so reading the value as "anything
 * that is not a quote" truncates it at the first source expression. That parsed cleanly, produced
 * a `default-src` with no sources, and failed with a confusing message about the policy rather
 * than about the parser.
 */
export function extractCsp(html) {
  const tag = html.match(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i);
  if (!tag) return null;
  const content = tag[0].match(/\bcontent=(["'])([\s\S]*?)\1/i);
  return content ? content[2] : null;
}

/**
 * Finds `<script>` elements carrying their own body.
 *
 * The distinction that matters is the element's *content*, not its attributes: `<script
 * src="./theme-boot.js"></script>` is the supported pattern and must keep passing, while the same
 * tag with anything non-whitespace between it and its closing tag is exactly what `script-src
 * 'self'` refuses to run.
 *
 * Both tags are matched as "the name, a word boundary, then anything up to `>`", which took two
 * corrections to get right. CodeQL's js/bad-tag-filter rejected `</script>` first and then
 * `</script\s*>`, and both rejections were correct:
 *
 *   - The tokenizer allows whitespace before an end tag's `>`, so `</script >` closes the element.
 *   - It also parses attributes on an end tag and discards them, so `</script foo>` closes it too.
 *
 * A regex that stops short of either does not merely miss that tag; the lazy body match runs past
 * it to the next literal end tag or fails entirely, so the inline script becomes invisible. The
 * check written to catch inline scripts could be walked around with a space, which is a worse
 * position than not having written it, because it reports green.
 *
 * `\b` rather than `\s` is what makes `</scriptfoo>` correctly *not* an end tag: there is no word
 * boundary between `t` and `f`, so the name has to be exactly `script`.
 *
 * An attribute value containing a literal `>` would end the match early. That is the safe
 * direction here — the captured body gets shorter, never longer, so an inline script is still
 * reported — and this reads a build artifact rather than hostile input.
 */
export function findInlineScripts(html) {
  return [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\b[^>]*>/gi)]
    .map((match) => match[1])
    .filter((body) => body.trim().length > 0);
}

export function verifyProductionCsp(html) {
  const policy = extractCsp(html);
  if (policy === null) {
    throw new Error(
      'Production index.html carries no Content-Security-Policy meta tag. GitHub Pages cannot set '
      + 'headers, so removing it leaves the application with no policy at all.',
    );
  }

  const directives = parseCsp(policy);

  for (const directive of REQUIRED_NONE) {
    const sources = directives.get(directive);
    if (!sources) throw new Error(`Production Content-Security-Policy omits ${directive}.`);
    if (sources.length !== 1 || sources[0] !== "'none'") {
      throw new Error(
        `Production Content-Security-Policy sets ${directive} to "${sources.join(' ')}" rather than 'none'.`,
      );
    }
  }

  // Checked on script-src specifically rather than by searching the whole policy string, because
  // style-src legitimately carries 'unsafe-inline' — React's style={{…}} attributes fall under
  // style-src-attr and there is no attacker-controlled HTML sink in the app. A blanket search for
  // "unsafe" would fail on the policy that ships today, so it would have to be written as an
  // exception, and an exception phrased loosely enough to permit style-src would permit script-src.
  const scriptSrc = directives.get('script-src');
  if (!scriptSrc) throw new Error('Production Content-Security-Policy omits script-src.');
  for (const unsafe of ["'unsafe-inline'", "'unsafe-eval'"]) {
    if (scriptSrc.includes(unsafe)) {
      throw new Error(`Production Content-Security-Policy allows ${unsafe} in script-src.`);
    }
  }

  // 'unsafe-eval' is refused everywhere, unlike 'unsafe-inline'. No directive in this application
  // has a legitimate reason for it, and it is reachable through fallbacks such as worker-src.
  for (const [directive, sources] of directives) {
    if (sources.includes("'unsafe-eval'")) {
      throw new Error(`Production Content-Security-Policy allows 'unsafe-eval' in ${directive}.`);
    }
  }

  const inlineScripts = findInlineScripts(html);
  if (inlineScripts.length > 0) {
    throw new Error(
      `Production index.html contains ${inlineScripts.length} inline <script> element(s), which `
      + "script-src 'self' forbids. Emit a real file and reference it by src, the way "
      + 'scripts/generate-theme-boot.mjs does for the pre-paint theme.',
    );
  }
}
