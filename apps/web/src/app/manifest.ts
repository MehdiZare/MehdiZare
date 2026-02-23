import type { MetadataRoute } from "next";
import { DEFAULT_SITE_PROFILE } from "@/lib/site-profile-defaults";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${DEFAULT_SITE_PROFILE.siteName} — ${DEFAULT_SITE_PROFILE.authorRole}`,
    short_name: DEFAULT_SITE_PROFILE.siteName,
    description: DEFAULT_SITE_PROFILE.siteDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#f8f6f1",
    theme_color: "#0f0f0f",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
    ],
  };
}
