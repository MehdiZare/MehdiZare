import { ImageResponse } from "next/og";
import { DEFAULT_SITE_PROFILE } from "@/lib/site-profile-defaults";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";
export const alt =
  `${DEFAULT_SITE_PROFILE.siteName} - ${DEFAULT_SITE_PROFILE.authorRole} shipping production systems from prototype to production.`;

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
          background: "linear-gradient(135deg, #f8f6f1 0%, #e9e4d9 100%)",
          color: "#1f2937",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#8d6f3f",
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
          <div style={{ fontSize: 68, lineHeight: 1.05, fontWeight: 700 }}>
            {DEFAULT_SITE_PROFILE.positioningHeadline}
          </div>
          <div style={{ fontSize: 30, lineHeight: 1.25, color: "#374151" }}>
            {DEFAULT_SITE_PROFILE.siteDescription}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 24, color: "#6b7280" }}>
          mehdizare.com
        </div>
      </div>
    ),
    size
  );
}
