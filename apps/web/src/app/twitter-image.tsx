import OpenGraphImage from "./opengraph-image";
import { DEFAULT_SITE_PROFILE } from "@/lib/site-profile-defaults";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";
export const alt =
  `${DEFAULT_SITE_PROFILE.siteName} - ${DEFAULT_SITE_PROFILE.authorRole} shipping production systems from prototype to production.`;

export default OpenGraphImage;
