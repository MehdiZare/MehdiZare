import test from "node:test";
import assert from "node:assert/strict";

const { default: robots, AI_SEARCH_USER_AGENTS, AI_TRAINING_USER_AGENTS } = await import(
  "../src/app/robots.ts"
);

function rulesOf(result: ReturnType<typeof robots>) {
  return Array.isArray(result.rules) ? result.rules : [result.rules];
}

test("robots route exposes canonical host and sitemap", () => {
  const result = robots();

  assert.equal(result.host, "https://www.mehdi-zare.com");
  assert.equal(result.sitemap, "https://www.mehdi-zare.com/sitemap.xml");

  const primaryRule = rulesOf(result)[0];
  assert.ok(primaryRule);
  assert.equal(primaryRule.userAgent, "*");
  assert.equal(primaryRule.allow, "/");
  assert.deepEqual(primaryRule.disallow, ["/api/"]);
});

// GEO-09: the AI crawler policy is a recorded decision, not an accident of `*`.
test("named AI search, assistant and training crawlers each have an explicit allow group", () => {
  const expected = [
    "OAI-SearchBot",
    "ChatGPT-User",
    "Claude-SearchBot",
    "Claude-User",
    "PerplexityBot",
    "Perplexity-User",
    "GPTBot",
    "ClaudeBot",
    "Google-Extended",
    "Applebot-Extended",
    "CCBot",
  ];
  assert.deepEqual([...AI_SEARCH_USER_AGENTS, ...AI_TRAINING_USER_AGENTS].sort(), [...expected].sort());

  const rules = rulesOf(robots());
  for (const agent of expected) {
    const group = rules.find((rule) =>
      Array.isArray(rule.userAgent) ? rule.userAgent.includes(agent) : rule.userAgent === agent
    );
    assert.ok(group, `${agent} must have its own group`);
    assert.equal(group.allow, "/", `${agent} is deliberately allowed`);
    // A named group replaces `*` for that crawler, so it must repeat the
    // disallow rules or the crawler would be free to fetch /api/.
    assert.deepEqual(group.disallow, ["/api/"], `${agent} keeps the /api/ disallow`);
  }
});
