import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const strapiUrl = process.env.STRAPI_URL?.trim() || "http://localhost:1337";
  const { pathname, search } = request.nextUrl;
  const destination = new URL(`${pathname.replace("/cms-uploads", "/uploads")}${search}`, strapiUrl);
  return NextResponse.rewrite(destination);
}

export const config = {
  matcher: "/cms-uploads/:path*",
};
