import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { extractCsp, findInlineScripts, parseCsp, verifyProductionCsp } from './production-csp.mjs';

const POLICY = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
  + "img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; "
  + "worker-src 'self'; form-action 'self'; object-src 'none'; base-uri 'none'";

const shell = (policy = POLICY, body = '<script src="./theme-boot.js"></script>') => `<!doctype html>
<html lang="en">
  <head>
    <meta
      http-equiv="Content-Security-Policy"
      content="${policy}"
    />
    ${body}
  </head>
  <body><div id="root"></div></body>
</html>`;

test('the policy shipped in the repository passes', () => {
  assert.doesNotThrow(() => verifyProductionCsp(shell()));
});

test('the real index.html passes', async () => {
  // The synthetic shell above is a convenience for mutating one thing at a time; it is not
  // evidence about the file that ships. Reading the source document means a hand-edit that breaks
  // the policy fails here even if nobody remembered to update the fixture to match.
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotThrow(() => verifyProductionCsp(html));
});

test('a missing meta tag fails', () => {
  assert.throws(() => verifyProductionCsp('<!doctype html><html><head></head></html>'), /carries no Content-Security-Policy/);
});

test('each fail-closed directive is required to be none', () => {
  for (const directive of ['default-src', 'object-src', 'base-uri']) {
    assert.throws(
      () => verifyProductionCsp(shell(POLICY.replace(`${directive} 'none'`, `${directive} 'self'`))),
      new RegExp(`sets ${directive} to "'self'"`),
      `expected ${directive} 'self' to be refused`,
    );
    assert.throws(
      () => verifyProductionCsp(shell(POLICY.replace(new RegExp(`;?\\s*${directive} 'none'`), ''))),
      new RegExp(`omits ${directive}`),
      `expected a missing ${directive} to be refused`,
    );
  }
});

test("script-src refuses unsafe-inline and unsafe-eval while style-src keeps unsafe-inline", () => {
  // The asymmetry is the point. style-src 'unsafe-inline' is load-bearing — React style={{…}}
  // attributes fall under style-src-attr — so this cannot be a blanket search for "unsafe".
  assert.throws(
    () => verifyProductionCsp(shell(POLICY.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'"))),
    /allows 'unsafe-inline' in script-src/,
  );
  assert.throws(
    () => verifyProductionCsp(shell(POLICY.replace("script-src 'self'", "script-src 'self' 'unsafe-eval'"))),
    /allows 'unsafe-eval' in script-src/,
  );
  assert.ok(POLICY.includes("style-src 'self' 'unsafe-inline'"));
  assert.doesNotThrow(() => verifyProductionCsp(shell()));
});

test("unsafe-eval is refused in any directive, not only script-src", () => {
  assert.throws(
    () => verifyProductionCsp(shell(POLICY.replace("worker-src 'self'", "worker-src 'self' 'unsafe-eval'"))),
    /allows 'unsafe-eval' in worker-src/,
  );
});

test('an inline script fails while a src-only script passes', () => {
  assert.throws(
    () => verifyProductionCsp(shell(POLICY, '<script>document.documentElement.dataset.theme = "dark"</script>')),
    /contains 1 inline <script> element/,
  );
  // The exact shape this project uses instead, which must keep passing.
  assert.doesNotThrow(() => verifyProductionCsp(shell(POLICY, '<script src="./theme-boot.js"></script>')));
  // Whitespace between the tags is formatting, not code.
  assert.doesNotThrow(() => verifyProductionCsp(shell(POLICY, '<script src="./theme-boot.js">\n  </script>')));
  // A module script with a body is still an inline script.
  assert.throws(
    () => verifyProductionCsp(shell(POLICY, '<script type="module">import "./x.js"</script>')),
    /contains 1 inline <script> element/,
  );
});

test('the meta tag is found regardless of attribute order or line breaks', () => {
  // Vite currently pretty-prints this tag across three lines. That is formatting the build is free
  // to change, so neither shape may be the only one this recognises - a parser that silently
  // stopped finding the tag would report success on a document it had not read.
  const minified = `<meta content="${POLICY}" http-equiv="Content-Security-Policy">`;
  assert.equal(extractCsp(minified), POLICY);
  assert.equal(extractCsp(shell()), POLICY);
  assert.equal(extractCsp('<html></html>'), null);
});

test('directive parsing keeps the first of a repeated directive', () => {
  // Browsers ignore later duplicates rather than merging them, so a policy that says 'none' and
  // then 'self' enforces 'none'. Reading it the other way round would let a duplicate directive
  // report a stricter policy than the one being served.
  const directives = parseCsp("default-src 'none'; default-src 'self'");
  assert.deepEqual(directives.get('default-src'), ["'none'"]);
});

test('directive names are matched case-insensitively', () => {
  assert.doesNotThrow(() => verifyProductionCsp(shell(POLICY.replace('base-uri', 'BASE-URI'))));
});

test('inline script detection reports every offending body', () => {
  const bodies = findInlineScripts('<script>a()</script><script src="x.js"></script><script>b()</script>');
  assert.deepEqual(bodies, ['a()', 'b()']);
});

test('an end tag with whitespace before its bracket still closes the element', () => {
  // The HTML tokenizer accepts `</script >`, so it closes the element — but a regex looking for
  // the literal `</script>` runs past it. The first version of this check matched exactly, and an
  // inline script closed that way was invisible to it: the gate against inline scripts could be
  // walked around with a space. CodeQL's js/bad-tag-filter caught it on the introducing PR.
  assert.deepEqual(findInlineScripts('<script>evil()</script >'), ['evil()']);
  assert.deepEqual(findInlineScripts('<script>evil()</script\n>'), ['evil()']);
  assert.deepEqual(findInlineScripts('<script>evil()</script\t>'), ['evil()']);
  assert.throws(
    () => verifyProductionCsp(shell(POLICY, '<script>evil()</script >')),
    /contains 1 inline <script> element/,
  );
  // The supported pattern keeps passing in the same spelling.
  assert.doesNotThrow(() => verifyProductionCsp(shell(POLICY, '<script src="./theme-boot.js"></script >')));
});
