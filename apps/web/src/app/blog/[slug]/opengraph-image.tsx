import { ImageResponse } from "next/og";
import { getArticleBySlug } from "@/lib/strapi";
import { BRAND_COLORS } from "@/lib/brand";
import { DEFAULT_SITE_PROFILE } from "@/lib/site-profile-defaults";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let title: string = DEFAULT_SITE_PROFILE.positioningHeadline;
  let category = "";
  let date = "";

  try {
    const res = await getArticleBySlug(slug);
    const article = res.data[0];
    if (article) {
      title = article.title;
      category = article.category?.name ?? "";
      const published = article.publishedDate ?? article.publishedAt;
      if (published) {
        date = new Date(published).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          // Date-only `publishedDate` parses as UTC midnight.
          timeZone: "UTC",
        });
      }
    }
  } catch {
    // Fall back to defaults when CMS is unavailable.
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: BRAND_COLORS.paper,
          color: BRAND_COLORS.ink,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: BRAND_COLORS.accentWarm,
            }}
          >
            {DEFAULT_SITE_PROFILE.siteName}
          </div>
          {category && (
            <div
              style={{
                display: "flex",
                fontSize: 18,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: BRAND_COLORS.accentWarm,
                border: `1px solid ${BRAND_COLORS.accentWarm}`,
                padding: "6px 16px",
              }}
            >
              {category}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            maxWidth: "1000px",
          }}
        >
          <div style={{ fontSize: 56, lineHeight: 1.1, fontWeight: 700 }}>
            {title}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 22, color: BRAND_COLORS.midGray }}>
            {DEFAULT_SITE_PROFILE.credentialLine}
          </div>
          {date && (
            <div style={{ display: "flex", fontSize: 20, color: BRAND_COLORS.midGray }}>
              {date}
            </div>
          )}
        </div>
      </div>
    ),
    size
  );
}
