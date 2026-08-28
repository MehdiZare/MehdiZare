import test from "node:test";
import assert from "node:assert/strict";

// Own process: serverEnv freezes REVALIDATE_SECRET at import. The configured
// webhook lives in revalidate-route-behavior.test.ts.

delete process.env.REVALIDATE_SECRET;
delete process.env.STRAPI_WEBHOOK_SECRET;
process.env.DISABLE_STRAPI_CMS = "true";

const { POST } = await import("../src/app/api/revalidate/route.ts");
const {
  revalidateTagCalls,
  resetRevalidateCalls,
}: {
  revalidateTagCalls: Array<{ tag: string; profile?: string }>;
  resetRevalidateCalls: () => void;
} = await import("./next-cache-stub.mjs");

test("500 when REVALIDATE_SECRET is not configured, even with a matching request secret", async () => {
  resetRevalidateCalls();
  const response = await POST(
    new Request("https://www.mehdi-zare.com/api/revalidate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-revalidate-secret": "anything",
      },
      body: "{}",
    })
  );

  assert.equal(response.status, 500);
  const json = (await response.json()) as { ok: boolean };
  assert.equal(json.ok, false);
  assert.equal(revalidateTagCalls.length, 0);
});
