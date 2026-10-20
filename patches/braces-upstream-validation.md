# Braces upstream validation

Prepared for [upstream PR #87](https://github.com/micromatch/braces/pull/87).
Posting on 2026-10-20 was rejected by GitHub because the upstream repository
restricts interactions to collaborators. This is retained for a maintainer
handoff; it has not been posted upstream.

Independently validated commit `d44b9b1ee12e7804d4232d5a47a4a0c61d2fbefe` on macOS / Node.js 24.12.0.

- Upstream suite: **908 passing** (unpatched baseline: 894 passing).
- **507 comparisons** of `compile`, `expand`, and `stringify` matched the unpatched baseline, comparing return values or exception names/messages. Cases covered sets, numeric and zero-padded ranges, nesting, escapes, bracket expressions, parentheses, quotes, dollar braces, malformed input, and empty components.
- Additional bounded-process checks passed with `--stack-size=512`: 3,000-level input, 12,000-level caller-supplied ASTs, cyclic child nodes and parent chains, mixed brace/parenthesis nesting, attempted `maxDepth` increases (10,000, Infinity, NaN), the 100-level boundary, lower caller limits, and quoted braces.

Sharing the extra regression probe below so these checks are reproducible and can be incorporated if useful. Save it outside the checkout as `check-braces-depth.cjs`, then run `node --stack-size=512 /path/to/check-braces-depth.cjs /absolute/path/to/braces`. I ran it with a five-second child-process timeout.

<details>
<summary>Additional regression probe</summary>

```js
// Run in a bounded child process, including against unpublished upstream fixes.
const assert = require('node:assert/strict');
const braces = require(process.argv[2]);
const guard = /^(Input|AST) depth \(\d+\), exceeds max depth \(\d+\)$/;
const deep = '{'.repeat(3000) + 'x' + '}'.repeat(3000);
for (const method of ['parse', 'compile', 'expand', 'stringify']) {
  for (const options of [undefined, { maxDepth: 10000 }, { maxDepth: Infinity }, { maxDepth: NaN }]) {
    assert.throws(() => braces[method](deep, options), error => guard.test(error.message));
  }
}
assert.throws(() => braces(deep), error => guard.test(error.message));
assert.throws(() => braces('('.repeat(3000) + 'x' + ')'.repeat(3000)), error => guard.test(error.message));
assert.throws(() => braces('{('.repeat(100) + 'x' + ')}'.repeat(100)), error => guard.test(error.message));
for (const method of ['compile', 'expand', 'stringify']) {
  let ast = { type: 'root', nodes: [] };
  let node = ast;
  for (let i = 0; i < 12000; i++) {
    const child = { type: 'paren', nodes: [], parent: node };
    node.nodes.push(child); node = child;
  }
  node.nodes.push({ type: 'text', value: 'x' });
  assert.throws(() => braces[method](ast), error => guard.test(error.message));
  const cyclic = { type: 'root', nodes: [] };
  cyclic.nodes.push(cyclic);
  assert.throws(() => braces[method](cyclic), error => guard.test(error.message));
}
const parentCycle = { type: 'root', nodes: [] };
const paren = { type: 'paren', nodes: [{ type: 'text', value: 'x' }] };
parentCycle.nodes.push(paren); paren.parent = paren;
assert.throws(() => braces.expand(parentCycle), /AST parent chain contains a cycle/);
assert.deepEqual(braces.expand('src/{a,b}/{1..3}.js'), [
  'src/a/1.js', 'src/a/2.js', 'src/a/3.js', 'src/b/1.js', 'src/b/2.js', 'src/b/3.js',
]);
const boundary = '{'.repeat(100) + 'x' + '}'.repeat(100);
assert.equal(braces.stringify(boundary), boundary);
assert.deepEqual(braces.expand(boundary), [boundary]);
assert.throws(() => braces('{{x}}', { maxDepth: 1 }), error => guard.test(error.message));
assert.equal(braces.stringify('"' + '{'.repeat(150) + '"'), '{'.repeat(150));
console.log('Braces depth, cycle, option-clamp, boundary and ordinary-input checks passed.');

```
</details>

These checks support the depth/cycle mitigation in this commit; they do not establish a general bound on regex or expansion complexity. Applications still need to handle validation errors. An upstream npm release and updated advisory metadata are still needed for downstream consumers to replace temporary source patches.
