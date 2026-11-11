import { ImageResponse } from "next/og";
import { BRAND_COLORS, BRAND_DISPLAY_DOMAIN } from "@/lib/brand";
import { DEFAULT_SITE_PROFILE } from "@/lib/site-profile-defaults";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";
export const alt =
  `${DEFAULT_SITE_PROFILE.siteName} - ${DEFAULT_SITE_PROFILE.credentialLine}`;

export default function OpenGraphImage() {
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

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            maxWidth: "980px",
          }}
        >
          <div style={{ fontSize: 48, lineHeight: 1.15, fontWeight: 700 }}>
            {DEFAULT_SITE_PROFILE.positioningHeadline}
          </div>
          <div style={{ fontSize: 26, lineHeight: 1.3, color: BRAND_COLORS.midGray }}>
            {DEFAULT_SITE_PROFILE.siteDescription}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 24, color: BRAND_COLORS.midGray }}>
          {BRAND_DISPLAY_DOMAIN}
        </div>
      </div>
    ),
    size
  );
}
