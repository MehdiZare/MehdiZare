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
