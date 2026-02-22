import Script from "next/script";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com").replace(/\/$/, "");

export function PostHogScripts() {
  if (!POSTHOG_KEY) {
    return null;
  }

  return (
    <>
      <Script src={`${POSTHOG_HOST}/static/array.js`} strategy="afterInteractive" />
      <Script
        id="posthog-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.posthog = window.posthog || [];
            window.posthog.init('${POSTHOG_KEY}', {
              api_host: '${POSTHOG_HOST}',
              person_profiles: 'identified_only',
              capture_pageview: true
            });
          `,
        }}
      />
    </>
  );
}
