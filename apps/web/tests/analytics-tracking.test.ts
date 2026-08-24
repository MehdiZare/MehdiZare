import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const {
  captureEvent,
  resolvePageType,
} = await import("../src/lib/analytics.ts");
const {
  initSessionAttributionIfNeeded,
  getSessionAttributionContext,
} = await import("../src/lib/analytics-context.ts");

class MemorySessionStorage {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key) ?? null : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

type CapturedEvent = {
  event: string;
  properties?: Record<string, unknown>;
};

function installBrowserMocks(url: string, referrer = ""): {
  restore: () => void;
  setLocation: (nextUrl: string) => void;
  capturedEvents: CapturedEvent[];
} {
  const globalAny = globalThis as {
    window?: unknown;
    document?: unknown;
  };

  const previousWindow = globalAny.window;
  const previousDocument = globalAny.document;

  const storage = new MemorySessionStorage();
  const capturedEvents: CapturedEvent[] = [];
  const windowMock: {
    location: URL;
    sessionStorage: MemorySessionStorage;
    posthog: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
    };
  } = {
    location: new URL(url),
    sessionStorage: storage,
    posthog: {
      capture: (event, properties) => {
        capturedEvents.push({ event, properties });
      },
    },
  };

  globalAny.window = windowMock;
  globalAny.document = { referrer };

  return {
    restore: () => {
      if (typeof previousWindow === "undefined") {
        delete globalAny.window;
      } else {
        globalAny.window = previousWindow;
      }

      if (typeof previousDocument === "undefined") {
        delete globalAny.document;
      } else {
        globalAny.document = previousDocument;
      }
    },
    setLocation: (nextUrl: string) => {
      windowMock.location = new URL(nextUrl);
    },
    capturedEvents,
  };
}

test("resolvePageType classifies core routes correctly", () => {
  assert.equal(resolvePageType("/"), "home");
  assert.equal(resolvePageType("/consulting"), "consulting");
  assert.equal(resolvePageType("/ai-engineer"), "ai_engineer");
  assert.equal(resolvePageType("/contact"), "contact");
  assert.equal(resolvePageType("/author/mehdi-zare"), "author");
  assert.equal(resolvePageType("/blog"), "blog");
  assert.equal(resolvePageType("/blog/"), "blog");
  assert.equal(resolvePageType("/blog/page/2"), "blog");
  assert.equal(resolvePageType("/blog/page/2/"), "blog");
  assert.equal(resolvePageType("/blog/category/ai-engineering"), "category");
  assert.equal(resolvePageType("/blog/tag/llms"), "tag");
  assert.equal(resolvePageType("/blog/building-production-rag"), "blog_post");
  assert.equal(resolvePageType("/something-else"), "other");
});

test("session attribution context preserves first touch values", () => {
  const browser = installBrowserMocks(
    "https://www.mehdi-zare.com/blog?utm_source=google&utm_medium=organic&utm_campaign=launch",
    "https://google.com/"
  );

  try {
    const firstTouch = initSessionAttributionIfNeeded();
    assert.ok(firstTouch);
    assert.equal(firstTouch?.landing_page, "/blog");
    assert.equal(firstTouch?.utm_source, "google");
    assert.equal(firstTouch?.utm_medium, "organic");
    assert.equal(firstTouch?.utm_campaign, "launch");

    browser.setLocation("https://www.mehdi-zare.com/consulting?utm_source=linkedin");
    const persisted = getSessionAttributionContext();
    assert.ok(persisted);
    assert.equal(persisted?.landing_page, "/blog");
    assert.equal(persisted?.utm_source, "google");
    assert.equal(persisted?.utm_medium, "organic");
    assert.equal(persisted?.utm_campaign, "launch");
  } finally {
    browser.restore();
  }
});

test("captureEvent enriches funnel events with attribution context", () => {
  const browser = installBrowserMocks(
    "https://www.mehdi-zare.com/blog?utm_source=google&utm_medium=organic",
    "https://google.com/"
  );

  try {
    initSessionAttributionIfNeeded();
    browser.setLocation("https://www.mehdi-zare.com/consulting");

    captureEvent("funnel_cta_click", {
      section: "hero_primary",
      cta_label: "Book a Call",
      destination: "/consulting#book",
      interaction_type: "link_click",
    });

    assert.equal(browser.capturedEvents.length, 1);
    const event = browser.capturedEvents[0];
    assert.equal(event.event, "funnel_cta_click");
    assert.equal(event.properties?.event_version, 1);
    assert.equal(event.properties?.pathname, "/consulting");
    assert.equal(event.properties?.page_type, "consulting");
    assert.equal(event.properties?.landing_page, "/blog");
    assert.equal(event.properties?.entry_pathname, "/blog");
    assert.equal(event.properties?.utm_source, "google");
    assert.equal(event.properties?.utm_medium, "organic");
    assert.equal(event.properties?.section, "hero_primary");
    assert.equal(event.properties?.cta_label, "Book a Call");
    assert.equal(event.properties?.destination, "/consulting#book");
    assert.equal(event.properties?.interaction_type, "link_click");
  } finally {
    browser.restore();
  }
});

test("legacy funnel event names are removed from source", () => {
  const sourceFiles = [
    "src/components/home/Hero.tsx",
    "src/components/home/ServicesGrid.tsx",
    "src/components/layout/Navbar.tsx",
    "src/components/scheduling/CalComTrigger.tsx",
    "src/components/consulting/TierCard.tsx",
  ];

  const legacyNames = [
    "cta_primary_clicked",
    "cta_secondary_clicked",
    "cta_work_with_me_clicked",
    "home_service_cta_clicked",
    "scheduler_opened",
  ];

  for (const relativePath of sourceFiles) {
    const source = readFileSync(resolve(__dirname, "..", relativePath), "utf8");
    for (const legacyName of legacyNames) {
      assert.doesNotMatch(source, new RegExp(legacyName));
    }
  }
});
